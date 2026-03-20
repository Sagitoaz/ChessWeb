# Phân Chia Công Việc Backend Cho 4 Thành Viên (NestJS, Chia Đều API)

## 1. Nguyên tắc chia việc
- Tổng 36 API, chia đều 4 người: mỗi người 9 API.
- Chia theo domain + module để cả 4 người code song song.
- Endpoint ownership chính thức nằm ở `backend/contracts/api-ownership.json`.
- Tất cả route chạy dưới prefix `/api/v1`.

## 2. Danh sách API theo thành viên

## Thành viên 1 - Identity Core (9 API)
- POST `/api/v1/auth/login`
- POST `/api/v1/auth/register`
- POST `/api/v1/auth/logout`
- POST `/api/v1/auth/refresh`
- POST `/api/v1/auth/forgot-password`
- POST `/api/v1/auth/reset-password`
- POST `/api/v1/auth/check-username`
- POST `/api/v1/auth/check-email`
- GET `/api/v1/auth/me`

File sở hữu:
- `backend/src/modules/identity/identity.controller.ts`
- `backend/src/modules/identity/identity.module.ts`

## Thành viên 2 - Profile và User Data (9 API)
- POST `/api/v1/auth/verify-email`
- POST `/api/v1/auth/resend-verification`
- GET `/api/v1/users/profile`
- PUT `/api/v1/users/profile`
- PUT `/api/v1/users/password`
- POST `/api/v1/users/avatar`
- GET `/api/v1/users/stats`
- GET `/api/v1/users/leaderboard`
- GET `/api/v1/games`

File sở hữu:
- `backend/src/modules/profile/profile.controller.ts`
- `backend/src/modules/profile/profile.module.ts`

## Thành viên 3 - Ranked và Tournament Core (9 API)
- POST `/api/v1/ranked/queue/join`
- POST `/api/v1/ranked/queue/leave`
- GET `/api/v1/ranked/matches/:id`
- GET `/api/v1/ranked/history`
- GET `/api/v1/ranked/stats`
- GET `/api/v1/tournaments`
- POST `/api/v1/tournaments`
- GET `/api/v1/tournaments/:id`
- POST `/api/v1/games`

File sở hữu:
- `backend/src/modules/competition/competition.controller.ts`
- `backend/src/modules/competition/competition.module.ts`

## Thành viên 4 - Room, Tournament Participation, Bot (9 API)
- POST `/api/v1/rooms`
- POST `/api/v1/rooms/:code/join`
- GET `/api/v1/rooms/:code`
- POST `/api/v1/rooms/:code/leave`
- POST `/api/v1/tournaments/:id/join`
- POST `/api/v1/tournaments/:id/withdraw`
- POST `/api/v1/bot/games`
- POST `/api/v1/bot/move`
- GET `/api/v1/games/:id`

File sở hữu:
- `backend/src/modules/social-bot/social-bot.controller.ts`
- `backend/src/modules/social-bot/social-bot.module.ts`

## 3. File chung (hạn chế đụng vào)
- `backend/src/main.ts`
- `backend/src/app.module.ts`
- `backend/src/shared/**`
- `backend/contracts/**`

Quy định:
1. Không sửa file chung trong PR feature thường.
2. Nếu cần sửa file chung, tạo PR riêng với label `shared-foundation`.
3. Team lead review bắt buộc cho PR có sửa `shared/*`.

## 4. Chuẩn branch và PR
- Branch: `be/member{n}/{feature-name}`
- PR title: `[BE-M{n}] <feature>`
- Reviewer: 1 người cùng team + team lead nếu ảnh hưởng shared.

## 5. Chuẩn test bằng Postman
- Mỗi thành viên tự tạo folder theo module trong collection chung.
- Tối thiểu mỗi API có:
  - 1 case success
  - 1 case validation fail
  - 1 case unauthorized (nếu route private)

## 6. DoD cho mỗi API
- Có DTO validate input (class-validator).
- Có guard JWT/RBAC đúng yêu cầu endpoint.
- Có response đúng schema chung.
- Có test case Postman và lưu ví dụ response.
