# Báo Cáo Ngày 1 - TV2 (Backend)

## 1) Mục tiêu Ngày 1
Hoàn thiện 4 API đầu tiên của TV2 để FE có thể dùng luồng profile cơ bản:
1. POST /api/v1/auth/verify-email
2. POST /api/v1/auth/resend-verification
3. GET /api/v1/users/profile
4. PUT /api/v1/users/profile

## 2) Những gì đã tạo
### 2.1 File code mới
1. backend/src/modules/profile/dto/verify-email.dto.ts
2. backend/src/modules/profile/dto/resend-verification.dto.ts
3. backend/src/modules/profile/dto/update-profile.dto.ts
4. backend/src/modules/profile/profile.repository.port.ts
5. backend/src/modules/profile/profile.repository.ts
6. backend/src/modules/profile/profile.service.ts
7. backend/src/modules/profile/tests/day1-profile.service.unit-test.ts

### 2.2 File code đã cập nhật
1. backend/src/modules/profile/profile.controller.ts
2. backend/src/modules/profile/profile.module.ts
3. backend/package.json

### 2.3 Tài liệu mới trong tv2
1. backend/tv2/checklist-tien-do-tv2.md
2. backend/tv2/bao-cao-ngay-1-tv2.md

## 3) Luồng hoạt động chi tiết
## 3.1 POST /api/v1/auth/resend-verification
1. Nhận userId từ request body (ResendVerificationDto).
2. Kiểm tra user có tồn tại trong collection user_profiles.
3. Nếu user đã verify thì trả lỗi VALIDATION_FAILED.
4. Nếu hợp lệ thì tạo raw token ngẫu nhiên.
5. Băm token bằng SHA-256.
6. Lưu tokenHash vào collection email_verification_tokens với purpose=verify_email, expiresAt=15 phút.
7. Trả về success và expiresAt (kèm tokenPreview ở môi trường không phải production để FE/dev test nhanh).

## 3.2 POST /api/v1/auth/verify-email
1. Nhận token từ request body (VerifyEmailDto).
2. Băm SHA-256 token nhận được.
3. Tìm tokenHash trong email_verification_tokens (chưa consumed).
4. Kiểm tra hết hạn token.
5. Đánh dấu consumedAt cho token.
6. Cập nhật user_profiles.isVerified=true.
7. Trả về success với userId và verifiedAt.

## 3.3 GET /api/v1/users/profile
1. JwtAuthGuard xác thực Bearer token và gắn payload vào request.user.
2. Service đọc userId từ một trong các field sub/userId/id.
3. Đọc user profile theo _id.
4. Trả dữ liệu profile chuẩn hóa cho FE: userId, username, displayName, isVerified, isActive.

## 3.4 PUT /api/v1/users/profile
1. JwtAuthGuard xác thực user.
2. Validate body bằng UpdateProfileDto.
3. Cập nhật displayName và updatedAt trong user_profiles.
4. Trả dữ liệu profile sau cập nhật để FE cập nhật state ngay.

## 4) Trích đoạn code chính
## 4.1 DTO validate
```ts
export class UpdateProfileDto {
  @IsString()
  @IsOptional()
  @MaxLength(50)
  @IsNotEmpty()
  displayName?: string
}
```

## 4.2 Tạo và băm verification token
```ts
const rawToken = randomBytes(24).toString('hex')
const tokenHash = createHash('sha256').update(rawToken).digest('hex')
```

## 4.3 Verify token và cập nhật profile
```ts
await this.emailVerificationTokens().updateOne(
  { tokenHash: token.tokenHash },
  { $set: { consumedAt: now } }
)

await this.userProfiles().updateOne(
  { _id: token.userId },
  { $set: { isVerified: true, updatedAt: now } }
)
```

## 5) Unit test và tự kiểm tra
## 5.1 Unit test đã tạo
- File: backend/src/modules/profile/tests/day1-profile.service.unit-test.ts
- Kiểm tra các case:
  1. getProfile thành công.
  2. updateProfile thành công.
  3. resendVerification tạo token mới.
  4. getProfile với user không tồn tại trả lỗi.

## 5.2 Lệnh chạy
1. npm run build
2. npm run test:tv2:day1

## 5.3 Kết quả
- Build: pass.
- Unit test Day 1: pass.

## 6) Self-review code
1. Luồng Day 1 đã tách rõ Controller -> Service -> Repository, dễ mở rộng cho Day 2/3.
2. Không sửa file shared ngoài phạm vi cần thiết.
3. Response theo format chung success/data/error/meta.
4. Điểm cần cải thiện ở Day 2:
   - Bổ sung test cho verify-email token hết hạn/invalid cụ thể.
   - Cân nhắc giới hạn resend theo thời gian để tránh spam token.
