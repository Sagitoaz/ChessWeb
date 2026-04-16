# Backend Shared Setup (NestJS) - Giảm Conflict Tối Đa

## 1. Quyết định thiết kế đã chốt theo AIDLC
- Framework: `NestJS`.
- Auth: `JWT + Refresh Token`.
- Phân quyền: `RBAC` (role `user/mod/admin`).
- API versioning: áp dụng ngay từ đầu với prefix `/api/v1`.
- Validation: dùng `class-validator + class-transformer` (phù hợp hệ sinh thái NestJS, dễ maintain cho team).
- Logging: dùng logger chuẩn của NestJS giai đoạn đầu (đủ cho sprint hiện tại, mở rộng pino sau).
- Kiểm thử: manual test bằng `Postman`.
- Tổ chức phát triển: 4 thành viên code song song theo domain tách file.

## 2. Bộ thư viện backend chuẩn hóa
`backend/package.json`:
- `@nestjs/common`, `@nestjs/core`, `@nestjs/platform-express`
- `@nestjs/jwt`
- `mongodb`
- `class-validator`, `class-transformer`
- `dotenv`, `reflect-metadata`, `rxjs`

Dev:
- `typescript`, `ts-node`, `ts-node-dev`, `@types/node`

## 3. Lệnh chuẩn cho mọi thành viên
```bash
cd backend
npm install
npm run db:check
npm run dev
```

Endpoint health:
- `GET /api/v1/health`

## 4. Cấu trúc BE đã setup sẵn
- `src/main.ts`: bootstrap Nest app, global prefix `/api/v1`, global validation pipe.
- `src/app.module.ts`: đăng ký toàn bộ module.
- `src/shared/config/env.ts`: đọc env chuẩn.
- `src/shared/db/mongo.service.ts`: singleton connect MongoDB.
- `src/shared/auth/*`: JWT guard, roles guard, roles decorator.
- `src/shared/http/response.util.ts`: format response chuẩn.
- `src/modules/identity/*`: owner member 1.
- `src/modules/profile/*`: owner member 2.
- `src/modules/competition/*`: owner member 3.
- `src/modules/social-bot/*`: owner member 4.

## 5. Chuẩn response API dùng chung
Mọi endpoint trả theo schema:
- `success`
- `data`
- `error`
- `meta` (`requestId`, `timestamp`)

Contract tham chiếu:
- `backend/contracts/shared-response.schema.json`

## 6. Quy tắc tránh conflict khi 4 người code song song
1. Mỗi người chỉ sửa module/controller thuộc ownership của mình.
2. Không sửa chéo `shared/*` nếu không cần.
3. Nếu buộc phải sửa file shared, tách PR riêng `be/shared/*`.
4. Mỗi PR chỉ nên chứa 1 nhóm endpoint cùng owner.
5. Rebase nhánh trước khi mở PR.

## 7. Quy trình code cho từng API
1. Thay response `NOT_IMPLEMENTED` trong controller bằng service thật.
2. Viết DTO request/response ở module mình.
3. Validate bằng decorator `class-validator`.
4. Truy cập DB qua `MongoService`.
5. Test bằng Postman collection chung của team.

## 8. Checklist trước khi merge PR
- [ ] `npm run db:check` pass.
- [ ] Route chạy đúng prefix `/api/v1`.
- [ ] Guard JWT/RBAC áp đúng endpoint private.
- [ ] Response đúng schema chung.
- [ ] Không hard-code secret.
- [ ] Không phá ownership module người khác.
