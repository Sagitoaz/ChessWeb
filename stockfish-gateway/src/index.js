const express = require('express');
const { spawn } = require('child_process');

const app = express();
app.use(express.json({ limit: '200kb' }));

const PORT = Number(process.env.PORT || 9000);
const STOCKFISH_BINARY = process.env.STOCKFISH_BINARY || 'stockfish';
const DEFAULT_MOVE_TIME_MS = Number(process.env.STOCKFISH_DEFAULT_MOVETIME_MS || 300);
const REQUEST_TIMEOUT_MS = Number(process.env.STOCKFISH_REQUEST_TIMEOUT_MS || 8000);
const API_KEY = process.env.STOCKFISH_GATEWAY_API_KEY || '';

function parseEvaluationFromInfoLine(line) {
  const cpMatch = line.match(/ score cp (-?\d+)/);
  if (cpMatch) {
    return Number(cpMatch[1]) / 100;
  }

  const mateMatch = line.match(/ score mate (-?\d+)/);
  if (mateMatch) {
    const mateValue = Number(mateMatch[1]);
    return mateValue > 0 ? 100 : -100;
  }

  return null;
}

function runStockfish(fen, moveTimeMs) {
  return new Promise((resolve, reject) => {
    const engine = spawn(STOCKFISH_BINARY, [], { stdio: 'pipe' });
    let finished = false;
    let lastEvaluation = null;

    const timeout = setTimeout(() => {
      if (finished) {
        return;
      }
      finished = true;
      engine.kill();
      reject(new Error('Stockfish request timed out'));
    }, REQUEST_TIMEOUT_MS);

    const cleanup = () => {
      clearTimeout(timeout);
      engine.stdout.removeAllListeners();
      engine.stderr.removeAllListeners();
      engine.removeAllListeners();
    };

    const fail = (error) => {
      if (finished) {
        return;
      }
      finished = true;
      cleanup();
      reject(error);
    };

    const succeed = (bestMoveUci) => {
      if (finished) {
        return;
      }
      finished = true;
      cleanup();
      resolve({
        bestMoveUci,
        evaluation: lastEvaluation,
      });
    };

    engine.on('error', (error) => {
      fail(new Error(`Cannot start Stockfish process: ${error.message}`));
    });

    engine.stderr.on('data', (chunk) => {
      const text = chunk.toString();
      if (text.trim()) {
        fail(new Error(`Stockfish stderr: ${text.trim()}`));
      }
    });

    engine.stdout.on('data', (chunk) => {
      const lines = chunk
        .toString()
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean);

      for (const line of lines) {
        if (line.startsWith('info')) {
          const score = parseEvaluationFromInfoLine(line);
          if (score !== null) {
            lastEvaluation = score;
          }
        }

        if (line.startsWith('bestmove')) {
          const parts = line.split(/\s+/);
          const bestMoveUci = parts[1];
          if (!bestMoveUci || bestMoveUci === '(none)') {
            fail(new Error('No bestmove returned by Stockfish'));
            return;
          }
          engine.kill();
          succeed(bestMoveUci);
          return;
        }
      }
    });

    const commands = [
      'uci',
      'isready',
      'ucinewgame',
      `position fen ${fen}`,
      `go movetime ${moveTimeMs}`,
    ];

    commands.forEach((cmd) => {
      engine.stdin.write(`${cmd}\n`);
    });
  });
}

function checkApiKey(req, res, next) {
  if (!API_KEY) {
    next();
    return;
  }

  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
  if (token !== API_KEY) {
    res.status(401).json({
      success: false,
      error: 'Unauthorized',
    });
    return;
  }

  next();
}

app.get('/health', (_req, res) => {
  res.json({
    success: true,
    service: 'stockfish-gateway',
  });
});

app.post('/api/stockfish/best-move', checkApiKey, async (req, res) => {
  const { fen, movetime } = req.body || {};
  if (typeof fen !== 'string' || !fen.trim()) {
    res.status(400).json({
      success: false,
      error: 'Invalid fen',
    });
    return;
  }

  const moveTimeMs =
    typeof movetime === 'number' && Number.isFinite(movetime) && movetime > 0
      ? Math.min(Math.floor(movetime), 5000)
      : DEFAULT_MOVE_TIME_MS;

  try {
    const result = await runStockfish(fen.trim(), moveTimeMs);
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

app.listen(PORT, () => {
  console.log(`[stockfish-gateway] listening on ${PORT}`);
});
