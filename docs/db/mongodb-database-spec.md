# Đặc Tả Chi Tiết MongoDB - ChessWeb

## 1. Tổng quan
Hệ thống dùng MongoDB Atlas (cluster dùng chung), tách môi trường bằng tên database:
- `chessweb_dev`
- `chessweb_staging`
- `chessweb_prod`

Mỗi môi trường dùng cùng cấu trúc collections và indexes để bảo đảm hành vi nhất quán.

## 2. Danh sách collections theo domain

## 2.1 Auth và Profile
- `user_profiles`: hồ sơ người dùng (username, displayName, trạng thái xác thực).
- `user_settings`: cài đặt cá nhân (theme, âm thanh, tùy chọn hiển thị).
- `refresh_tokens`: token refresh đã băm để đăng nhập lâu dài.
- `email_verification_tokens`: token xác thực email.
- `user_stats`: thống kê tổng (số trận, thắng/thua/hòa, thời gian chơi).
- `user_ratings`: điểm ELO theo mode.

## 2.2 Ranked
- `ranked_queue`: hàng chờ ghép trận.
- `ranked_matches`: phiên ghép trận đã tạo.

## 2.3 Room và Tournament
- `rooms`: thông tin phòng bạn bè.
- `room_members`: thành viên trong phòng.
- `tournaments`: thông tin giải đấu.
- `tournament_participants`: người tham gia giải.
- `tournament_rounds`: vòng đấu.
- `tournament_matches`: trận theo từng vòng.

## 2.4 Game, Replay, Bot
- `games`: metadata trận đấu.
- `game_moves`: lịch sử nước đi theo `ply`.
- `elo_history`: lịch sử biến động ELO.
- `replay_bookmarks`: mốc replay do người dùng đánh dấu.
- `bot_sessions`: phiên chơi với bot.
- `bot_move_requests`: log request/response tới Stockfish API.
- `rank_tiers`: bảng tham chiếu rank.

## 3. Lược đồ dữ liệu chính (key fields)

## 3.1 `user_profiles`
- `_id` (string, bắt buộc): user id từ auth.
- `username` (string, unique).
- `displayName` (string|null).
- `isActive` (boolean|null).
- `isVerified` (boolean|null).
- `createdAt` (date), `updatedAt` (date).

## 3.2 `ranked_queue`
- `_id` (ObjectId).
- `userId` (string).
- `status` (string: `waiting` | `matched` | `cancelled`).
- `joinedAt` (date).

## 3.3 `games`
- `_id` (ObjectId).
- `mode` (string: `ranked` | `room` | `bot` | `tournament`).
- `whitePlayerId`, `blackPlayerId` (string).
- `result` (string|null).
- `createdAt`, `finishedAt`.

## 3.4 `game_moves`
- `_id` (ObjectId).
- `gameId` (ObjectId/string theo chuẩn code thực tế).
- `ply` (number, thứ tự nước đi).
- `san` (string), `fen` (string).
- `createdAt` (date).

## 3.5 `bot_move_requests`
- `_id` (ObjectId).
- `sessionId` (ObjectId/string).
- `requestPayload` (object).
- `responsePayload` (object|null).
- `status` (string).
- `createdAt` (date).

## 4. Indexes đã setup
Theo `backend/mongodb/setup/01_create_indexes.mongosh.js`:
- `user_profiles.username`: unique.
- `refresh_tokens.tokenHash`: unique.
- `ranked_queue(userId,status)`: partial unique với `status='waiting'`.
- `rooms.roomCode`: unique.
- `room_members(roomId,userId)`: unique.
- `tournament_participants(tournamentId,userId)`: unique.
- `game_moves(gameId,ply)`: unique.
- `elo_history(userId,createdAt)`.
- `bot_sessions(userId,status,startedAt)`.

## 5. Quan hệ logic giữa collections
MongoDB không có foreign key cứng, nhưng quan hệ logic như sau:
- `user_profiles._id` -> dùng bởi `games.whitePlayerId`, `games.blackPlayerId`, `user_stats.userId`, `user_ratings._id`.
- `rooms._id` -> `room_members.roomId`.
- `tournaments._id` -> `tournament_participants.tournamentId`, `tournament_rounds.tournamentId`.
- `games._id` -> `game_moves.gameId`, `elo_history.gameId`, `replay_bookmarks.gameId`.
- `bot_sessions._id` -> `bot_move_requests.sessionId`.

## 6. Dữ liệu seed
Collection `rank_tiers` được seed bằng script `02_seed_reference.mongosh.js` gồm các tier:
- beginner
- intermediate
- advanced
- expert
- master
- grandmaster

Seed dùng `upsert` để chạy nhiều lần không tạo bản ghi trùng.

## 7. Quy tắc cập nhật schema
1. Không sửa trực tiếp trên Atlas UI.
2. Mọi thay đổi schema/index phải sửa file trong `backend/mongodb/setup/`.
3. Chạy lại setup theo đúng thứ tự:
   1. `00_create_collections`
   2. `01_create_indexes`
   3. `02_seed_reference`
4. Cập nhật tài liệu này khi thêm collection/index mới.

## 8. Transaction cho luồng quan trọng
Bắt buộc dùng Mongo session/transaction cho các nghiệp vụ ghi nhiều collection:
- Kết thúc trận ranked: `games` + `elo_history` + `user_ratings` + `user_stats`.
- Luồng tournament kết vòng: `tournament_matches` + `tournament_rounds` + `games`.

## 9. Checklist xác nhận DB đã sẵn sàng
- [ ] Tạo được kết nối từ backend (`npm run db:check`).
- [ ] Có đủ collections trong cả `dev/staging/prod`.
- [ ] Có đủ indexes quan trọng.
- [ ] Seed `rank_tiers` đầy đủ.
- [ ] Không còn dùng URI `mongodb+srv` nếu mạng đang lỗi `querySrv`.
