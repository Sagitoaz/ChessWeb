/**
 * @fileoverview Validation script for Game Services
 * Run manual checks and validation for all created services and hooks
 */

// Color codes for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
}

const log = {
  success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
  warning: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  section: (msg) => console.log(`\n${colors.cyan}${msg}${colors.reset}\n`),
}

/**
 * Validation Results
 */
const results = {
  passed: 0,
  failed: 0,
  warnings: 0,
  errors: [],
}

/**
 * Add result
 */
function addResult(passed, message, errorDetails = null) {
  if (passed) {
    results.passed++
    log.success(message)
  } else {
    results.failed++
    log.error(message)
    if (errorDetails) {
      results.errors.push({ message, error: errorDetails })
    }
  }
}

/**
 * Check if file exists and is valid
 */
async function validateFile(filePath, checks = []) {
  log.section(`Validating: ${filePath}`)
  
  try {
    const module = await import(filePath)
    addResult(true, `File exists and can be imported`)
    
    // Run custom checks
    for (const check of checks) {
      try {
        const result = check.fn(module)
        addResult(result, check.description)
      } catch (error) {
        addResult(false, check.description, error.message)
      }
    }
  } catch (error) {
    addResult(false, `Failed to import file`, error.message)
  }
}

/**
 * Validate gameService
 */
async function validateGameService() {
  await validateFile('../services/gameService.js', [
    {
      description: 'Exports default service object',
      fn: (module) => module.default !== undefined,
    },
    {
      description: 'Has joinRankedQueue method',
      fn: (module) => typeof module.default.joinRankedQueue === 'function',
    },
    {
      description: 'Has leaveRankedQueue method',
      fn: (module) => typeof module.default.leaveRankedQueue === 'function',
    },
    {
      description: 'Has getMatch method',
      fn: (module) => typeof module.default.getMatch === 'function',
    },
    {
      description: 'Has getRankedHistory method',
      fn: (module) => typeof module.default.getRankedHistory === 'function',
    },
    {
      description: 'Has getRankedStats method',
      fn: (module) => typeof module.default.getRankedStats === 'function',
    },
    {
      description: 'Has makeMove method',
      fn: (module) => typeof module.default.makeMove === 'function',
    },
    {
      description: 'Has resignGame method',
      fn: (module) => typeof module.default.resignGame === 'function',
    },
    {
      description: 'Has createRoom method',
      fn: (module) => typeof module.default.createRoom === 'function',
    },
    {
      description: 'Has joinRoom method',
      fn: (module) => typeof module.default.joinRoom === 'function',
    },
    {
      description: 'Has getTournaments method',
      fn: (module) => typeof module.default.getTournaments === 'function',
    },
    {
      description: 'Has joinTournament method',
      fn: (module) => typeof module.default.joinTournament === 'function',
    },
  ])
}

/**
 * Validate useWebSocket
 */
async function validateUseWebSocket() {
  await validateFile('../hooks/useWebSocket.js', [
    {
      description: 'Exports useWebSocket hook',
      fn: (module) => typeof module.useWebSocket === 'function',
    },
    {
      description: 'Exports useGameSocket hook',
      fn: (module) => typeof module.useGameSocket === 'function',
    },
    {
      description: 'Exports useRankedSocket hook',
      fn: (module) => typeof module.useRankedSocket === 'function',
    },
    {
      description: 'Exports useRoomSocket hook',
      fn: (module) => typeof module.useRoomSocket === 'function',
    },
    {
      description: 'Exports useTournamentSocket hook',
      fn: (module) => typeof module.useTournamentSocket === 'function',
    },
  ])
}

/**
 * Validate useChessGame
 */
async function validateUseChessGame() {
  await validateFile('../hooks/useChessGame.js', [
    {
      description: 'Exports useChessGame hook',
      fn: (module) => typeof module.useChessGame === 'function',
    },
    {
      description: 'Exports useOnlineChessGame hook',
      fn: (module) => typeof module.useOnlineChessGame === 'function',
    },
  ])
}

/**
 * Validate API calls (mock mode)
 */
async function validateAPICalls() {
  log.section('Testing API Calls (Mock Mode)')
  
  try {
    const gameService = (await import('../services/gameService.js')).default
    
    // Test ranked queue
    const queueResult = await gameService.joinRankedQueue()
    addResult(
      queueResult.success === true,
      'joinRankedQueue returns success'
    )
    
    // Test match retrieval
    const match = await gameService.getMatch('test-123')
    addResult(
      match.id === 'test-123',
      'getMatch returns correct match'
    )
    
    // Test ranked stats
    const stats = await gameService.getRankedStats()
    addResult(
      stats.currentRating !== undefined,
      'getRankedStats returns rating'
    )
    
    // Test room creation
    const room = await gameService.createRoom({
      isPrivate: false,
      timeControl: { initial: 600, increment: 5 },
    })
    addResult(
      room.code !== undefined && room.code.startsWith('ROOM'),
      'createRoom returns room code'
    )
    
    // Test tournament list
    const tournaments = await gameService.getTournaments()
    addResult(
      Array.isArray(tournaments.tournaments),
      'getTournaments returns array'
    )
  } catch (error) {
    addResult(false, 'API call testing failed', error.message)
  }
}

/**
 * Check for common issues
 */
async function validateCommonIssues() {
  log.section('Checking for Common Issues')
  
  // Read source files and check for common mistakes
  const issues = []
  
  // This would require fs module in Node.js
  // For browser environment, we skip this
  log.warning('Source code analysis skipped (requires Node.js environment)')
  
  // Check for console.logs in production
  log.info('Remember to remove console.logs before production')
  
  // Check for proper error handling
  log.info('Verify error handling in all async functions')
  
  // Check for memory leaks
  log.info('Verify cleanup in useEffect hooks')
}

/**
 * Main validation
 */
async function runValidation() {
  console.log('\n' + '='.repeat(60))
  console.log(`${colors.magenta}Game Services Validation${colors.reset}`)
  console.log('='.repeat(60))
  
  try {
    await validateGameService()
    await validateUseWebSocket()
    await validateUseChessGame()
    await validateAPICalls()
    await validateCommonIssues()
  } catch (error) {
    log.error(`Validation failed: ${error.message}`)
  }
  
  // Print summary
  console.log('\n' + '='.repeat(60))
  console.log(`${colors.cyan}Validation Summary${colors.reset}`)
  console.log('='.repeat(60))
  console.log(`${colors.green}Passed:${colors.reset} ${results.passed}`)
  console.log(`${colors.red}Failed:${colors.reset} ${results.failed}`)
  console.log(`${colors.yellow}Warnings:${colors.reset} ${results.warnings}`)
  
  if (results.errors.length > 0) {
    console.log(`\n${colors.red}Errors:${colors.reset}`)
    results.errors.forEach((err, i) => {
      console.log(`  ${i + 1}. ${err.message}`)
      if (err.error) {
        console.log(`     ${colors.red}${err.error}${colors.reset}`)
      }
    })
  }
  
  console.log('\n' + '='.repeat(60) + '\n')
  
  const exitCode = results.failed > 0 ? 1 : 0
  if (typeof process !== 'undefined') {
    process.exit(exitCode)
  }
  
  return exitCode === 0
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runValidation()
}

export { runValidation, validateGameService, validateUseWebSocket, validateUseChessGame }
