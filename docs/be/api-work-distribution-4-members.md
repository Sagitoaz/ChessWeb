# Kế Hoạch Chia API + DB Cho 4 Thành Viên (Giảm Conflict Tối Đa)

## 1) Mục tiêu
- Chia API theo **nhóm nghiệp vụ rõ ràng**.
- Cân bằng theo **độ khó thực tế** (effort points), không chỉ đếm số endpoint.
- Trưởng nhóm setup DB một lần theo bộ SQL chuẩn để tránh xung đột schema.
- Tách vùng sở hữu file để 4 người làm song song, hạn chế đụng nhau.

## 2) Nguyên tắc chia việc
- Mỗi API chỉ có **1 owner chính**.
- Mỗi thành viên có workload khoảng **23-25 điểm**.
- Tách rõ: `controller/service/repository/test` theo module.
- File dùng chung chỉ sửa qua PR riêng (`shared/*`, contract API, SQL common).
- DB migration theo **thứ tự file cố định**, không tự tạo schema lẻ.

## 3) Bảng phân công cân bằng (API ownership)

## Thành viên 1 - Nhóm Identity Core (24 điểm)
- `POST /auth/login`
- `POST /auth/register`
- `POST /auth/logout`
- `POST /auth/refresh`
- `POST /auth/forgot-password`
- `POST /auth/reset-password`
- `POST /auth/check-username`
- `POST /auth/check-email`

**Deliverables bắt buộc**
- Auth controller/service/repository.
- JWT + refresh token flow.
- Validation request/response chuẩn.
- Unit test + integration test cho 8 endpoint.

## Thành viên 2 - Nhóm Profile + User Data (23 điểm)
- `POST /auth/verify-email`
- `GET /users/profile`
- `PUT /users/profile`
- `PUT /users/password`
- `POST /users/avatar`
- `GET /users/stats`
- `GET /users/leaderboard`
- `GET /games`
- `GET /games/:id`

**Deliverables bắt buộc**
- Profile/statistics service.
- Upload avatar pipeline (metadata + storage path).
- Pagination/filter cho leaderboard và games list.
- Unit test + integration test cho 9 endpoint.

## Thành viên 3 - Nhóm Ranked + Tournament Core (25 điểm)
- `POST /ranked/queue/join`
- `POST /ranked/queue/leave`
- `GET /ranked/matches/:id`
- `GET /ranked/history`
- `GET /ranked/stats`
- `GET /tournaments`
- `POST /tournaments`
- `GET /tournaments/:id`
- `POST /games` (save game)

**Deliverables bắt buộc**
- Matchmaking queue logic (API-side state).
- Ranked history/statistics query tối ưu index.
- Tournament CRUD lõi.
- Unit test + integration test cho 9 endpoint.

## Thành viên 4 - Nhóm Room + Tournament Participation + Bot (24 điểm)
- `POST /rooms`
- `POST /rooms/:code/join`
- `GET /rooms/:code`
- `POST /rooms/:code/leave`
- `POST /tournaments/:id/join`
- `POST /tournaments/:id/withdraw`
- `POST /bot/games`
- `POST /bot/move` (backend tích hợp Stockfish API)
- `POST /auth/resend-verification`

**Deliverables bắt buộc**
- Room lifecycle + membership checks.
- Tournament join/withdraw rules.
- Stockfish API client (timeout/retry/error mapping).
- Unit test + integration test cho 9 endpoint.

## 4) Phần chung bắt buộc làm trước (để giảm conflict)

## 4.1 Contract và chuẩn response (do trưởng nhóm tạo trước)
- Tạo chuẩn response JSON dùng chung:
  - `success`: `boolean`
  - `data`: `object | array | null`
  - `error`: `{ code, message, details? } | null`
  - `meta`: `{ requestId, timestamp, pagination? }`
- Chuẩn mã lỗi:
  - `AUTH_*`, `VALIDATION_*`, `ROOM_*`, `RANKED_*`, `TOURNAMENT_*`, `BOT_*`, `DB_*`.

## 4.2 Quy ước branch và thư mục
- Branch mỗi người:
  - `feature/api-member1-identity`
  - `feature/api-member2-profile`
  - `feature/api-member3-ranked-tournament`
  - `feature/api-member4-room-bot`
- Không sửa chéo module người khác nếu chưa có sync.
- Nếu bắt buộc sửa file chung: tạo PR riêng `chore/shared-*`.

## 4.3 File ownership (đề xuất)
- Member 1: `backend/src/modules/auth/**`
- Member 2: `backend/src/modules/users/**`, `backend/src/modules/replay/**`
- Member 3: `backend/src/modules/ranked/**`, `backend/src/modules/tournaments/core/**`
- Member 4: `backend/src/modules/rooms/**`, `backend/src/modules/tournaments/participation/**`, `backend/src/modules/bot/**`
- Shared-only (trưởng nhóm duyệt): `backend/src/shared/**`, `backend/supabase/sql/00_*`, `backend/supabase/sql/07_*`, `backend/supabase/sql/99_*`

## 5) DB setup full cho trưởng nhóm (tránh conflict schema)

Trưởng nhóm chạy SQL theo thứ tự sau:
1. `backend/supabase/sql/00_shared_common.sql`
2. `backend/supabase/sql/01_auth_profile.sql`
3. `backend/supabase/sql/02_ranked.sql`
4. `backend/supabase/sql/03_rooms.sql`
5. `backend/supabase/sql/04_tournaments.sql`
6. `backend/supabase/sql/05_games_replay.sql`
7. `backend/supabase/sql/06_bot_stockfish.sql`
8. `backend/supabase/sql/07_security_rls.sql`
9. `backend/supabase/sql/08_seed_reference.sql` (tuỳ môi trường dev)

Tùy công cụ:
- Chạy tuần tự từng file trong Supabase SQL Editor.
- Hoặc dùng `psql` với file tổng `backend/supabase/sql/99_full_setup.sql`.

## 6) Checklist thực thi theo sprint
- [ ] Trưởng nhóm apply DB full schema trước.
- [ ] Mỗi thành viên tạo branch riêng theo naming chuẩn.
- [ ] Freeze file chung (`shared/*`, SQL common) trong 48 giờ đầu.
- [ ] Mỗi ngày rebase từ nhánh tích hợp (`develop-api`) đúng 1 lần.
- [ ] Mỗi endpoint phải có test và collection request mẫu.
- [ ] PR chỉ merge khi pass lint + test + schema check.

## 7) Definition of Done cho từng thành viên
- Endpoint chạy đúng contract, có validation và error mapping.
- Có migration/schema tương ứng (nếu cần).
- Có unit test + integration test.
- Có ví dụ request/response.
- Không tạo thay đổi ngoài vùng sở hữu nếu không có đồng thuận.
