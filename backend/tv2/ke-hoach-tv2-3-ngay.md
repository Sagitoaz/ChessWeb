# Kế Hoạch TV2 Trong 3 Ngày (Backend)

## 1) Phạm vi sở hữu của TV2
Theo tài liệu phân chia BE hiện tại, TV2 phụ trách 9 API sau:
1. POST /api/v1/auth/verify-email
2. POST /api/v1/auth/resend-verification
3. GET /api/v1/users/profile
4. PUT /api/v1/users/profile
5. PUT /api/v1/users/password
6. POST /api/v1/users/avatar
7. GET /api/v1/users/stats
8. GET /api/v1/users/leaderboard
9. GET /api/v1/games

## 2) Quy tắc vị trí file và ownership (bắt buộc)
### 2.1 File code chính TV2 được phép triển khai
- backend/src/modules/profile/profile.controller.ts
- backend/src/modules/profile/profile.module.ts

### 2.2 Vị trí mở rộng cho code liên quan Profile (nếu chưa có)
- backend/src/modules/profile/dto/**
- backend/src/modules/profile/services/**
- backend/src/modules/profile/repositories/**
- backend/src/modules/profile/entities/**

### 2.3 File chung hạn chế chỉnh sửa
- backend/src/main.ts
- backend/src/app.module.ts
- backend/src/shared/**
- backend/contracts/**

Nếu buộc phải chỉnh file chung:
1. Tách PR riêng.
2. Gắn label shared-foundation.
3. Team lead review bắt buộc.

## 3) Kế hoạch 3 ngày để hoàn thành
## Ngày 1: Ưu tiên API cần cho FE profile cơ bản
Mục tiêu: mở luồng xem/sửa hồ sơ và xác minh email.

API thực hiện:
1. POST /api/v1/auth/verify-email
2. POST /api/v1/auth/resend-verification
3. GET /api/v1/users/profile
4. PUT /api/v1/users/profile

Checklist kỹ thuật:
1. Tạo DTO validate đầy đủ bằng class-validator.
2. Áp dụng JWT guard cho route private.
3. Chuẩn hóa response theo schema chung của dự án.
4. Viết test Postman cho từng API: success, validation fail, unauthorized.

Đầu ra cuối ngày:
1. FE có thể lấy profile hiện tại và cập nhật profile.
2. Luồng verify/resend email dùng được cho FE Auth/Profile.

## Ngày 2: Security + Avatar + Stats
Mục tiêu: hoàn thiện chỉnh sửa thông tin nhạy cảm và dữ liệu người dùng mở rộng.

API thực hiện:
1. PUT /api/v1/users/password
2. POST /api/v1/users/avatar
3. GET /api/v1/users/stats

Checklist kỹ thuật:
1. Password API có validate password hiện tại và policy password mới.
2. Avatar API validate loại file, kích thước, và trả URL/avatar metadata rõ ràng.
3. Stats API tối ưu truy vấn, trả dữ liệu nhất quán cho FE hiển thị.
4. Bổ sung test Postman 3 case/API.

Đầu ra cuối ngày:
1. FE đổi mật khẩu hoạt động ổn định.
2. FE upload avatar và hiển thị thống kê cá nhân.

## Ngày 3: Leaderboard + Games list + hardening
Mục tiêu: hoàn tất toàn bộ API còn lại và chốt chất lượng.

API thực hiện:
1. GET /api/v1/users/leaderboard
2. GET /api/v1/games

Checklist kỹ thuật:
1. Hỗ trợ phân trang/sort/filter cơ bản cho leaderboard và games (nếu yêu cầu FE cần).
2. Rà soát response shape cho toàn bộ 9 API để FE dùng thống nhất.
3. Rà soát lỗi chuẩn theo error-codes của dự án.
4. Chạy lại toàn bộ test Postman và cập nhật ví dụ response.

Đầu ra cuối ngày:
1. Hoàn thành đủ 9/9 API của TV2.
2. Sẵn sàng bàn giao cho FE tích hợp toàn bộ flow.

## 4) Chuẩn branch và PR cho TV2
1. Branch: be/member2/<feature-name>
2. PR title: [BE-M2] <feature>
3. Reviewer: 1 thành viên backend khác; nếu đụng shared thì thêm team lead.

## 5) Definition of Done cho từng API
1. Có DTO validate input.
2. Guard JWT/RBAC đúng yêu cầu endpoint.
3. Response đúng schema chung.
4. Có test Postman: success, validation fail, unauthorized (nếu private).
5. Có ví dụ response để FE tích hợp nhanh.

## 6) Quy ước tài liệu cho TV2
1. Từ thời điểm này, mọi file md hướng dẫn của TV2 phải đặt trong backend/tv2.
2. Không đặt tài liệu hướng dẫn TV2 rải rác ở thư mục khác.
