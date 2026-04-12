require("dotenv").config({ path: ".env" });
const { MongoClient } = require("mongodb");
const jwt = require("jsonwebtoken");

const baseUrl = "http://localhost:8080/api/v1";
const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB_NAME;
const jwtSecret = process.env.JWT_ACCESS_SECRET || "change-me-access-secret";

if (!uri || !dbName) {
  console.error("Missing required env values for smoke test");
  process.exit(1);
}

const users = [
  { id: "approval-user-a", username: "approvalA", rating: 1520 },
  { id: "approval-user-b", username: "approvalB", rating: 1495 },
  { id: "approval-user-c", username: "approvalC", rating: 1475 },
];

const tokenFor = (userId) =>
  jwt.sign({ sub: userId, userId, roles: ["user"] }, jwtSecret, {
    expiresIn: "1h",
  });

async function api(method, path, token, body) {
  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text };
  }
  if (!res.ok || json?.success === false) {
    throw new Error(
      `${method} ${path} failed: ${res.status} ${JSON.stringify(json)}`,
    );
  }
  return json?.data ?? json;
}

(async () => {
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db(dbName);

  await db.collection("user_profiles").bulkWrite(
    users.map((u) => ({
      updateOne: {
        filter: { _id: u.id },
        update: {
          $set: {
            _id: u.id,
            username: u.username,
            rating: u.rating,
            updatedAt: new Date(),
          },
          $setOnInsert: { createdAt: new Date() },
        },
        upsert: true,
      },
    })),
  );

  await db
    .collection("tournaments")
    .deleteMany({ name: /^APPROVAL TOURNAMENT / });

  const tokenA = tokenFor(users[0].id);
  const tokenB = tokenFor(users[1].id);
  const tokenC = tokenFor(users[2].id);
  const startAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
  const endAt = new Date(Date.now() + 5 * 60 * 60 * 1000).toISOString();

  const created = await api("POST", "/tournaments", tokenA, {
    name: `APPROVAL TOURNAMENT ${new Date().toISOString()}`,
    description: "Approval verification tournament",
    prize: "100,000 VND",
    format: "knockout",
    maxParticipants: 4,
    timeControl: "3+0",
    startAt,
    endAt,
  });

  const tournamentId = created.id || created._id;
  await api("POST", `/tournaments/${tournamentId}/join`, tokenA, {});
  await api("POST", `/tournaments/${tournamentId}/join`, tokenB, {});
  await api("POST", `/tournaments/${tournamentId}/join`, tokenC, {});

  await api(
    "POST",
    `/tournaments/${tournamentId}/participants/${users[2].id}/reject`,
    tokenA,
    {},
  );
  await api(
    "POST",
    `/tournaments/${tournamentId}/participants/${users[0].id}/approve`,
    tokenA,
    {},
  );
  await api(
    "POST",
    `/tournaments/${tournamentId}/participants/${users[1].id}/approve`,
    tokenA,
    {},
  );
  await api("POST", `/tournaments/${tournamentId}/start`, tokenA, {});

  const beforeResult = await api("GET", `/tournaments/${tournamentId}`, tokenA);
  const firstMatch = beforeResult.rounds?.[0]?.matches?.[0];
  await api(
    "POST",
    `/tournaments/${tournamentId}/matches/${firstMatch.id}/result`,
    tokenA,
    {
      winnerSlot: "player1",
    },
  );
  const afterResult = await api("GET", `/tournaments/${tournamentId}`, tokenA);

  console.log(
    JSON.stringify(
      {
        participants: afterResult.participants.map((p) => ({
          username: p.username,
          status: p.status,
        })),
        rejectedRemoved: !afterResult.participants.some(
          (p) => p.userId === users[2].id,
        ),
        firstMatchResult: afterResult.rounds?.[0]?.matches?.[0]?.result,
        tournamentStatus: afterResult.status,
        winner: afterResult.winner,
      },
      null,
      2,
    ),
  );

  await client.close();
})();
