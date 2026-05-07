# MongoDB V2 Redesign - Backend Migration Guide

## 1. Tình trạng đã thực hiện

Database `chessweb_dev` trên MongoDB Atlas đã được reset sạch theo hướng v2.

Do Atlas user trong `backend/.env` không có quyền `dropDatabase`, reset được thực hiện bằng cách:

1. Kết nối Atlas bằng `MONGODB_URI` trong `backend/.env`.
2. Chọn database `chessweb_dev`.
3. Drop toàn bộ collection cũ trong database này.
4. Tạo lại collection v2.
5. Tạo lại index v2.
6. Seed lại dữ liệu tham chiếu `rank_tiers`.

Script đã dùng:

```powershell
$envFile = 'backend\.env'
Get-Content $envFile | ForEach-Object {
  $line = $_.Trim()
  if ($line -and -not $line.StartsWith('#') -and $line.Contains('=')) {
    $idx = $line.IndexOf('=')
    $key = $line.Substring(0, $idx).Trim()
    $value = $line.Substring($idx + 1).Trim().Trim('"').Trim("'")
    [Environment]::SetEnvironmentVariable($key, $value, 'Process')
  }
}

backend\mongodb\setup\v2\run-atlas-reset-v2.ps1 -Environment dev
```

Các file script v2 nằm ở:

- `backend/mongodb/setup/v2/00_reset_database_v2.mongosh.js`
- `backend/mongodb/setup/v2/01_create_collections_v2.mongosh.js`
- `backend/mongodb/setup/v2/02_create_indexes_v2.mongosh.js`
- `backend/mongodb/setup/v2/03_seed_reference_v2.mongosh.js`
- `backend/mongodb/setup/v2/99_full_reset_setup_v2.mongosh.js`
- `backend/mongodb/setup/v2/run-atlas-reset-v2.ps1`

## 2. Mục tiêu thiết kế v2

Vấn đề cũ của database là cùng một thông tin bị lưu ở nhiều collection hoặc nhiều field khác nhau:

- Rating nằm trong `user_ratings.rating`, `user_ratings.rankedElo`, `user_ratings.currentRating`, và có lúc còn được ghi vào `user_profiles.rating`.
- Thống kê game nằm trong `user_stats.gamesPlayed` và `user_stats.totalGames`.
- Nước đi vừa nằm trong `games.moves`, vừa sync sang `game_moves`.
- Bracket tournament vừa nằm trong `tournaments.rounds`, vừa sync sang `tournament_matches`.
- Auth token reset password và verify email dùng chung tên collection `email_verification_tokens`, gây lệch ý nghĩa.
- Ranked queue/match dùng tên riêng `ranked_queue`, `ranked_matches`, nhưng game/match/tournament lại có nhiều mode khác nhau.

Thiết kế v2 dùng nguyên tắc: mỗi loại dữ liệu chỉ có một collection làm nguồn sự thật.

## 3. Collection v2

### 3.1 `users`

Nguồn sự thật duy nhất cho thông tin định danh và hồ sơ người dùng.

Thay thế:

- `user_profiles`
- `user_settings`

Các field chính:

```ts
{
  _id: string,
  username: string,
  email: string | null,
  googleId: string | null,
  passwordHash: string | null,
  displayName: string | null,
  avatarUrl: string | null,
  avatarPublicId: string | null,
  role: 'USER' | 'MOD' | 'ADMIN',
  status: 'active' | 'disabled' | 'pending_verification',
  emailVerifiedAt: Date | null,
  settings: {
    theme: 'system' | 'light' | 'dark',
    soundEnabled: boolean,
    boardTheme: string
  },
  createdAt: Date,
  updatedAt: Date
}
```

Backend rule:

- Không lưu rating trong `users`.
- Không lưu game stats trong `users`.
- Không tạo collection `user_settings` nữa.
- `isActive` cũ đổi thành `status`.
- `isVerified` cũ đổi thành `emailVerifiedAt != null`.

### 3.2 `auth_sessions`

Nguồn sự thật cho phiên đăng nhập.

Nên dùng để lưu:

```ts
{
  _id: ObjectId,
  userId: string,
  sessionId: string,
  status: 'active' | 'revoked' | 'expired',
  remember: boolean,
  createdAt: Date,
  updatedAt: Date,
  expiresAt: Date,
  revokedAt: Date | null
}
```

### 3.3 `auth_tokens`

Nguồn sự thật cho token ngắn hạn: refresh token hash, verify email token, reset password token.

Thay thế:

- `refresh_tokens`
- `email_verification_tokens`

Field khuyến nghị:

```ts
{
  _id: ObjectId,
  userId: string,
  sessionId: string | null,
  purpose: 'refresh' | 'verify_email' | 'reset_password',
  tokenHash: string,
  status: 'active' | 'consumed' | 'revoked' | 'expired',
  remember: boolean | null,
  expiresAt: Date,
  consumedAt: Date | null,
  revokedAt: Date | null,
  createdAt: Date,
  updatedAt: Date
}
```

Backend rule:

- Không tạo collection token riêng theo từng use case.
- Luôn query bằng `purpose`.
- Token hết hạn được dọn bằng TTL index trên `expiresAt`.

### 3.4 `player_ratings`

Nguồn sự thật duy nhất cho rating.

Thay thế:

- `user_ratings`
- `user_profiles.rating`
- `rankedElo`
- `currentRating`

Field chuẩn:

```ts
{
  _id: string,          // `${userId}:${mode}`
  userId: string,
  mode: 'ranked' | 'rapid' | 'blitz' | 'bullet' | 'bot' | 'tournament',
  rating: number,
  peakRating: number,
  gamesPlayed: number,
  createdAt: Date,
  updatedAt: Date
}
```

Backend rule:

- Muốn lấy Elo ranked thì query `{ userId, mode: 'ranked' }`.
- Không fallback sang `users.rating`.
- Không dùng field `rankedElo` hoặc `currentRating`.
- Khi user mới đăng ký, tạo sẵn row ranked rating `1200`.

### 3.5 `rating_events`

Lịch sử thay đổi rating.

Thay thế:

- `elo_history`

Field chuẩn:

```ts
{
  _id: ObjectId,
  userId: string,
  mode: 'ranked' | 'tournament',
  gameId: ObjectId,
  matchId: ObjectId | null,
  ratingBefore: number,
  ratingAfter: number,
  ratingDelta: number,
  opponentUserId: string,
  opponentRating: number,
  result: 'win' | 'loss' | 'draw',
  createdAt: Date
}
```

Backend rule:

- Mỗi game chỉ tạo tối đa một rating event cho mỗi user/mode.
- Index unique: `{ gameId, userId, mode }`.

### 3.6 `player_mode_stats`

Nguồn sự thật cho thống kê tổng hợp theo user và mode.

Thay thế:

- `user_stats`
- `gamesPlayed` và `totalGames` song song.

Field chuẩn:

```ts
{
  _id: string,          // `${userId}:${mode}`
  userId: string,
  mode: 'ranked' | 'room' | 'bot' | 'tournament',
  gamesPlayed: number,
  wins: number,
  losses: number,
  draws: number,
  totalPlayTimeSeconds: number,
  currentStreak: number,
  currentStreakType: 'win' | 'loss' | 'draw' | null,
  bestStreak: number,
  bestStreakType: 'win' | 'loss' | 'draw' | null,
  createdAt: Date,
  updatedAt: Date
}
```

Backend rule:

- Chỉ dùng `gamesPlayed`, bỏ hoàn toàn `totalGames`.
- Stats được update khi game kết thúc, không update khi game mới tạo.
- Nếu cần tổng tất cả mode, aggregate từ collection này.

### 3.7 `matchmaking_queue`

Nguồn sự thật cho hàng chờ ghép cặp.

Thay thế:

- `ranked_queue`

Field chuẩn:

```ts
{
  _id: ObjectId,
  userId: string,
  mode: 'ranked',
  timeControl: string,
  preferredColor: 'white' | 'black' | 'random',
  ratingSnapshot: number,
  status: 'waiting' | 'matched' | 'cancelled' | 'expired',
  joinedAt: Date,
  matchedAt: Date | null,
  cancelledAt: Date | null,
  cancelReason: string | null,
  updatedAt: Date
}
```

Backend rule:

- Queue lưu `ratingSnapshot` để matchmaking ổn định trong lúc chờ.
- Rating hiện tại vẫn lấy từ `player_ratings`, không lấy từ queue.
- Unique waiting user theo `{ userId, mode, timeControl, status: 'waiting' }`.

### 3.8 `matches`

Nguồn sự thật cho match lifecycle.

Thay thế:

- `ranked_matches`

Field chuẩn:

```ts
{
  _id: ObjectId,
  mode: 'ranked' | 'room' | 'tournament' | 'bot',
  status: 'pending' | 'active' | 'completed' | 'cancelled',
  gameId: ObjectId | null,
  players: [
    {
      userId: string,
      color: 'white' | 'black',
      ratingBefore: number | null,
      ratingAfter: number | null
    }
  ],
  timeControl: string | null,
  result: '1-0' | '0-1' | '1/2-1/2' | null,
  endReason: string | null,
  createdAt: Date,
  updatedAt: Date,
  finishedAt: Date | null
}
```

Backend rule:

- Ranked, room, tournament đều có thể dùng chung `matches`.
- Không lưu `whitePlayerId` và `blackPlayerId` ở match nếu đã có `players[]`, trừ khi chỉ dùng làm response DTO sau khi map.

### 3.9 `games`

Nguồn sự thật cho ván cờ và trạng thái bàn cờ.

Field chuẩn:

```ts
{
  _id: ObjectId,
  mode: 'ranked' | 'room' | 'bot' | 'tournament',
  status: 'pending' | 'active' | 'completed' | 'cancelled',
  players: [
    { userId: string, color: 'white' | 'black' }
  ],
  initialFen: string,
  currentFen: string,
  pgn: string | null,
  result: '1-0' | '0-1' | '1/2-1/2' | null,
  winnerUserId: string | null,
  endReason: string | null,
  totalMoves: number,
  matchId: ObjectId | null,
  roomId: ObjectId | null,
  tournamentId: ObjectId | null,
  tournamentMatchId: ObjectId | null,
  createdAt: Date,
  updatedAt: Date,
  startedAt: Date | null,
  finishedAt: Date | null
}
```

Backend rule:

- Không lưu `moves` trong `games`.
- `games.totalMoves` là counter/cache để list nhanh.
- Toàn bộ move detail nằm trong `game_moves`.
- Không dùng `whitePlayerId` và `blackPlayerId` làm source of truth. Nếu API cũ cần thì map từ `players[]`.

### 3.10 `game_moves`

Nguồn sự thật duy nhất cho nước đi.

Field chuẩn:

```ts
{
  _id: ObjectId,
  gameId: ObjectId,
  ply: number,
  color: 'white' | 'black',
  san: string | null,
  uci: string | null,
  from: string | null,
  to: string | null,
  piece: string | null,
  captured: string | null,
  promotion: string | null,
  fenAfter: string | null,
  clockWhiteMs: number | null,
  clockBlackMs: number | null,
  createdAt: Date
}
```

Backend rule:

- Không delete rồi insert lại toàn bộ moves mỗi lần save.
- Khi thêm nước mới, insert `ply` tiếp theo.
- Nếu cần rebuild từ PGN thì làm bằng script riêng, không làm trong request thường.

### 3.11 `tournaments`

Nguồn sự thật cho metadata giải đấu.

Field chuẩn:

```ts
{
  _id: ObjectId,
  name: string,
  description: string | null,
  prize: string | null,
  format: 'single_elimination' | 'swiss' | 'round_robin',
  timeControl: string,
  status: 'registration' | 'ongoing' | 'completed' | 'cancelled',
  organizerUserId: string,
  maxParticipants: number,
  startAt: Date,
  endAt: Date,
  registrationDeadline: Date,
  createdAt: Date,
  updatedAt: Date
}
```

Backend rule:

- Không lưu `organizerName` làm source of truth.
- Không lưu `participants` count nếu backend có thể count từ `tournament_participants`. Nếu cần cache thì đặt tên rõ `participantCountCache`.
- Không lưu `rounds` nhúng trong tournament nữa.

### 3.12 `tournament_matches`

Nguồn sự thật duy nhất cho bracket/match trong tournament.

Field chuẩn:

```ts
{
  _id: ObjectId,
  tournamentId: ObjectId,
  roundNumber: number,
  matchNumber: number,
  status: 'pending' | 'ready' | 'active' | 'completed' | 'cancelled',
  gameId: ObjectId | null,
  playerSlots: [
    {
      slot: 1 | 2,
      userId: string | null,
      seed: number | null,
      score: number | null,
      checkedInAt: Date | null
    }
  ],
  winnerUserId: string | null,
  nextTournamentMatchId: ObjectId | null,
  nextSlot: 1 | 2 | null,
  createdAt: Date,
  updatedAt: Date,
  completedAt: Date | null
}
```

Backend rule:

- Không sync từ `tournaments.rounds`.
- Khi mở round, insert/update trực tiếp `tournament_matches`.
- Khi lấy chi tiết tournament, aggregate `tournaments` + `tournament_participants` + `tournament_matches` + `users`.

### 3.13 `tournament_participants`

Nguồn sự thật cho người tham gia giải.

Field chuẩn:

```ts
{
  _id: ObjectId,
  tournamentId: ObjectId,
  userId: string,
  seed: number | null,
  ratingSnapshot: number,
  status: 'pending' | 'approved' | 'rejected' | 'withdrawn' | 'active',
  joinedAt: Date,
  updatedAt: Date
}
```

Backend rule:

- Không lưu username/displayName ở participant.
- Dùng `ratingSnapshot` để giữ seed ổn định tại thời điểm tham gia.

### 3.14 `rooms` và `room_members`

`rooms` giữ metadata phòng.

`room_members` giữ membership.

Backend rule:

- Không nhúng danh sách member đầy đủ vào `rooms`.
- `rooms.hostUserId` trỏ sang `users._id`.
- Khi trả response phòng, join `room_members` + `users`.

### 3.15 Bot collections

Giữ:

- `bot_sessions`
- `bot_move_requests`

Backend rule:

- Bot session trỏ sang `gameId`.
- Bot move request chỉ lưu request/response AI engine, không là source of truth cho moves.
- Nước đi vẫn nằm ở `game_moves`.

### 3.16 `database_audit_events`

Collection mới cho audit các thay đổi quan trọng.

Field khuyến nghị:

```ts
{
  _id: ObjectId,
  actorUserId: string | null,
  action: string,
  entityType: string,
  entityId: string,
  before: object | null,
  after: object | null,
  requestId: string | null,
  createdAt: Date
}
```

Nên ghi audit cho:

- Admin đổi role/status user.
- Kết thúc game và cập nhật rating.
- Tournament result manual override.
- Reset/cancel tournament.

## 4. Mapping collection cũ sang mới

| Cũ | Mới | Ghi chú |
|---|---|---|
| `user_profiles` | `users` | Bỏ `rating`; settings nhúng vào `users.settings`. |
| `user_settings` | `users.settings` | Không còn collection riêng. |
| `refresh_tokens` | `auth_tokens` + `auth_sessions` | Token hash ở `auth_tokens`, session lifecycle ở `auth_sessions`. |
| `email_verification_tokens` | `auth_tokens` | Dùng `purpose = verify_email/reset_password`. |
| `user_ratings` | `player_ratings` | Một row mỗi `{ userId, mode }`. |
| `elo_history` | `rating_events` | Dùng tên tổng quát hơn Elo. |
| `user_stats` | `player_mode_stats` | Bỏ `totalGames`, chỉ dùng `gamesPlayed`. |
| `ranked_queue` | `matchmaking_queue` | Có `mode` và `ratingSnapshot`. |
| `ranked_matches` | `matches` | Dùng chung cho ranked/room/tournament/bot. |
| `games` | `games` | Đổi shape: `players[]`, không có `moves`. |
| `game_moves` | `game_moves` | Đổi `gameId` sang `ObjectId`. |
| `tournaments` | `tournaments` | Chỉ metadata, không nhúng `rounds`. |
| `tournament_matches` | `tournament_matches` | Source of truth cho bracket. |
| `rooms` | `rooms` | Metadata phòng. |
| `room_members` | `room_members` | Membership phòng. |
| `bot_sessions` | `bot_sessions` | Giữ, nhưng trỏ rõ `gameId`. |
| `bot_move_requests` | `bot_move_requests` | Giữ, không lưu source move. |

## 5. Những file backend cần sửa

### 5.1 `backend/src/modules/identity/identity.service.ts`

Cần đổi:

- `user_profiles` -> `users`
- `refresh_tokens` -> `auth_tokens`
- `email_verification_tokens` -> `auth_tokens`
- `seedUserDocuments()` không tạo `user_settings`, `user_stats`, `user_ratings` nữa.

Flow register mới:

1. Insert `users`.
2. Insert default `player_ratings` cho `{ userId, mode: 'ranked' }`.
3. Insert default `player_mode_stats` cho các mode cần hiển thị ban đầu, hoặc tạo lazy khi game kết thúc.
4. Insert `auth_sessions`.
5. Insert refresh token vào `auth_tokens` với `purpose: 'refresh'`.

Response mapping:

- `isActive = user.status === 'active'`
- `isVerified = user.emailVerifiedAt != null`

### 5.2 `backend/src/modules/profile/profile.repository.ts`

Cần đổi:

- `user_profiles()` -> `users()`
- `userStats()` -> `playerModeStats()`
- `userRatings()` -> `playerRatings()`
- Leaderboard query từ `player_ratings`, join sang `users`.
- Game list query dùng `games.players.userId` thay vì `$or: whitePlayerId/blackPlayerId`.
- `totalMoves` lấy trực tiếp từ `games.totalMoves`, không fallback sang `games.moves.length`.

Query game list mới:

```ts
const match = {
  'players.userId': userId,
  finishedAt: { $ne: null },
  status: 'completed'
}
```

Map side:

```ts
const selfPlayer = game.players.find((p) => p.userId === userId)
const opponent = game.players.find((p) => p.userId !== userId)
```

### 5.3 `backend/src/modules/competition/competition.service.ts`

Cần đổi mạnh nhất.

Collection helper mới:

```ts
private queueCollection() {
  return this.mongoService.getDb().collection('matchmaking_queue')
}

private matchesCollection() {
  return this.mongoService.getDb().collection('matches')
}

private ratingsCollection() {
  return this.mongoService.getDb().collection('player_ratings')
}

private statsCollection() {
  return this.mongoService.getDb().collection('player_mode_stats')
}

private usersCollection() {
  return this.mongoService.getDb().collection('users')
}
```

Rating:

- `getUserRating(userId)` chỉ query `player_ratings.findOne({ userId, mode: 'ranked' })`.
- Xóa fallback sang `user_profiles.rating`.
- `updateUserRatingAfterMatch()` chỉ update `player_ratings`, không update `users`.
- Ghi lịch sử vào `rating_events`.

Stats:

- `updateUserStatsAfterMatch()` update `player_mode_stats`.
- Bỏ `totalGames`.

Game:

- Tạo `games.players` thay vì `whitePlayerId/blackPlayerId`.
- Không lưu `moves` trong `games`.
- Khi save move, insert vào `game_moves` từng ply.
- Cập nhật `games.currentFen`, `games.totalMoves`, `games.updatedAt`.

Tournament:

- `createTournament()` không lưu `organizerName`, `organizer`, `participants`, `rounds`.
- `getTournamentById()` aggregate từ `tournament_matches`.
- Không đọc `tournament.rounds`.

### 5.4 `backend/src/modules/social-bot/social-bot.repository.ts`

Cần đổi:

- `findUserProfilesByIds()` đọc `users`, không đọc `user_profiles`.
- Bỏ `syncGameMovesFromUpdate()` kiểu đọc `update.moves` rồi replace toàn bộ.
- Bỏ `syncTournamentMatchesFromUpdate()` kiểu đọc `update.rounds`.
- `updateUserStatsByOutcome()` đổi sang `player_mode_stats`.

Bot game:

- `createGame()` tạo `games.players`.
- Moves từ bot lưu vào `game_moves`.
- Bot response chỉ là log ở `bot_move_requests`.

## 6. DTO/API compatibility

Frontend có thể vẫn đang cần format cũ. Backend có thể giữ response cũ trong một thời gian bằng mapper, nhưng database không được lưu theo format cũ.

Ví dụ response cũ cần `whitePlayerId`:

```ts
function toLegacyGameResponse(game) {
  const white = game.players.find((p) => p.color === 'white')
  const black = game.players.find((p) => p.color === 'black')

  return {
    ...game,
    whitePlayerId: white?.userId ?? null,
    blackPlayerId: black?.userId ?? null
  }
}
```

Quy tắc:

- Legacy shape chỉ tồn tại ở response mapper.
- Không insert/update legacy field vào MongoDB.

## 7. Transaction bắt buộc

Các flow sau cần MongoDB transaction:

### 7.1 Register

Ghi cùng lúc:

- `users`
- `player_ratings`
- `player_mode_stats` nếu seed stats ngay
- `auth_sessions`
- `auth_tokens`

### 7.2 Matchmaking matched

Ghi cùng lúc:

- Update hai row `matchmaking_queue` sang `matched`.
- Insert `matches`.
- Insert `games`.

### 7.3 Complete ranked game

Ghi cùng lúc:

- Update `games`.
- Update `matches`.
- Update 2 row `player_ratings`.
- Insert 2 row `rating_events`.
- Update 2 row `player_mode_stats`.

### 7.4 Tournament result

Ghi cùng lúc:

- Update `games`.
- Update `matches`.
- Update `tournament_matches`.
- Update `player_mode_stats`.
- Insert audit event nếu result được nhập thủ công.

## 8. Cách chạy reset v2

### Dev

```powershell
$env:MONGODB_URI="<URI trong backend/.env>"
backend\mongodb\setup\v2\run-atlas-reset-v2.ps1 -Environment dev
```

### Staging

```powershell
$env:MONGODB_URI="<URI trong backend/.env>"
backend\mongodb\setup\v2\run-atlas-reset-v2.ps1 -Environment staging
```

### Prod

Không khuyến nghị cho BTL/demo nếu chưa backup. Nếu vẫn muốn:

```powershell
$env:MONGODB_URI="<URI prod>"
backend\mongodb\setup\v2\run-atlas-reset-v2.ps1 -Environment prod -AllowProdReset
```

## 9. Kiểm tra sau reset

Chạy trong `mongosh`:

```js
const appDb = db.getSiblingDB('chessweb_dev')
appDb.getCollectionNames().sort()
```

Kỳ vọng có các collection:

```text
auth_sessions
auth_tokens
bot_move_requests
bot_sessions
database_audit_events
game_moves
games
matchmaking_queue
matches
player_mode_stats
player_ratings
rank_tiers
rating_events
replay_bookmarks
room_members
rooms
tournament_matches
tournament_participants
tournaments
users
```

Kiểm tra seed:

```js
db.getSiblingDB('chessweb_dev').rank_tiers.find().sort({ minRating: 1 })
```

## 10. Việc backend team cần làm ngay

Ưu tiên làm theo thứ tự:

1. Tạo file constants cho collection names, ví dụ `backend/src/shared/db/collections.ts`.
2. Sửa Identity module sang `users`, `auth_sessions`, `auth_tokens`, `player_ratings`.
3. Sửa Profile module để leaderboard đọc `player_ratings` và join `users`.
4. Sửa Competition module vì đây là nơi ghi rating/stats/game/match nhiều nhất.
5. Sửa SocialBot module để bỏ sync duplicate `moves` và `rounds`.
6. Sửa test/integration seed theo schema v2.
7. Chạy lại register -> login -> join queue -> complete match -> profile leaderboard.

## 11. Checklist chống tái diễn duplicate source of truth

- [ ] Không collection nào ngoài `player_ratings` được lưu rating hiện tại.
- [ ] Không collection nào ngoài `player_mode_stats` được lưu win/loss/draw aggregate.
- [ ] Không collection nào ngoài `game_moves` được lưu danh sách nước đi.
- [ ] Không collection nào ngoài `tournament_matches` được lưu bracket match.
- [ ] `users` chỉ lưu identity/profile/settings.
- [ ] Token auth chỉ nằm ở `auth_tokens`.
- [ ] Mọi write đa collection quan trọng dùng transaction.
- [ ] Mọi response legacy được build bằng mapper, không lưu legacy field vào DB.

## 12. Security notes

- Không commit `MONGODB_URI`, password, JWT secret hoặc API key.
- Atlas phải dùng `mongodb+srv://` hoặc URI TLS.
- User DB nên có quyền tối thiểu `readWrite` trên đúng DB.
- Script reset không dùng `dropDatabase` để phù hợp quyền `readWrite`; nó drop từng collection.
- Script prod có guard riêng `-AllowProdReset`.
- Các thao tác quan trọng sau này nên ghi vào `database_audit_events`.

## 13. Final verification ngày 2026-05-07

Đã kiểm tra trực tiếp trên MongoDB Atlas database `chessweb_dev`.

Kết quả collection:

```text
auth_sessions
auth_tokens
bot_move_requests
bot_sessions
database_audit_events
game_moves
games
matches
matchmaking_queue
player_mode_stats
player_ratings
rank_tiers
rating_events
replay_bookmarks
room_members
rooms
tournament_matches
tournament_participants
tournaments
users
```

Các collection cũ đã xác nhận không còn:

```text
user_profiles
user_settings
user_stats
user_ratings
ranked_queue
ranked_matches
refresh_tokens
email_verification_tokens
elo_history
tournament_rounds
```

Kết quả kiểm tra:

- `oldStillPresent = []`
- Tổng collection v2: `20`
- `rank_tiers` có `6` bản ghi seed.
- `rank_tiers.code` có unique index `uq_rank_tiers_code`.
- `player_ratings.rating`, `player_ratings.peakRating`, `player_ratings.gamesPlayed` đã cho phép các BSON numeric types: `int`, `long`, `double`, `decimal`. Điều này tránh lỗi backend Node.js ghi số dạng double nhưng validator chỉ nhận int.

Kết luận cuối:

- Database hiện đã đúng hướng v2.
- Không còn collection gây duplicate source of truth theo thiết kế cũ.
- Rủi ro đồng bộ sau này nằm ở backend code nếu tiếp tục ghi legacy field hoặc legacy collection.
- Backend team phải sửa code theo Section 5 và checklist Section 11 trước khi chạy app thật.
