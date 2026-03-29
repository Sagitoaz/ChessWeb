# Giải Thích Toàn Bộ Code TV2 Day 1

## 1. Mục tiêu phần code đã triển khai
Trong Day 1, TV2 triển khai 4 API đầu tiên cho module profile:
1. POST /api/v1/auth/verify-email
2. POST /api/v1/auth/resend-verification
3. GET /api/v1/users/profile
4. PUT /api/v1/users/profile

Mục tiêu là tách code theo kiến trúc rõ ràng:
- Controller: nhận request, trả response
- Service: xử lý business logic
- Repository: thao tác dữ liệu MongoDB
- DTO: validate dữ liệu đầu vào

## 2. Danh sách file đã tạo và chỉnh sửa
### 2.1 File tạo mới
1. backend/src/modules/profile/dto/verify-email.dto.ts
2. backend/src/modules/profile/dto/resend-verification.dto.ts
3. backend/src/modules/profile/dto/update-profile.dto.ts
4. backend/src/modules/profile/profile.repository.port.ts
5. backend/src/modules/profile/profile.repository.ts
6. backend/src/modules/profile/profile.service.ts
7. backend/src/modules/profile/tests/day1-profile.service.unit-test.ts

### 2.2 File cập nhật
1. backend/src/modules/profile/profile.controller.ts
2. backend/src/modules/profile/profile.module.ts
3. backend/package.json

## 3. Giải thích chi tiết từng lớp
## 3.1 DTO layer
### verify-email.dto.ts
- Mô tả body cho API verify email.
- Có field token bắt buộc.
- Rule validate:
  1. IsString
  2. IsNotEmpty
  3. MaxLength(256)

### resend-verification.dto.ts
- Mô tả body cho API resend verification.
- Có field userId bắt buộc.
- Rule validate:
  1. IsString
  2. IsNotEmpty
  3. MaxLength(128)

### update-profile.dto.ts
- Mô tả body cho API update profile.
- Có field displayName tùy chọn.
- Rule validate khi field xuất hiện:
  1. IsString
  2. IsOptional
  3. MaxLength(50)
  4. IsNotEmpty

Ý nghĩa chung của DTO:
- Chặn dữ liệu sai ngay từ controller thông qua ValidationPipe global.
- Giảm nguy cơ dữ liệu bẩn đi vào service.

## 3.2 Contract layer repository (profile.repository.port.ts)
File này định nghĩa hợp đồng giữa service và repository, gồm:
1. Kiểu dữ liệu hồ sơ người dùng UserProfileDoc.
2. Kiểu dữ liệu token xác thực EmailVerificationTokenDoc.
3. Kết quả verify token VerifyTokenResult.
4. Interface ProfileRepositoryPort với 4 hàm:
   - findUserProfileById
   - updateUserProfileDisplayName
   - createEmailVerificationToken
   - verifyEmailByTokenHash

Ý nghĩa:
- Service chỉ phụ thuộc vào interface, không phụ thuộc trực tiếp Mongo.
- Dễ unit test bằng fake/in-memory repository.

## 3.3 Repository layer (profile.repository.ts)
Đây là tầng truy cập MongoDB thật qua MongoService.

Các hàm chính:
1. userProfiles()
- Lấy collection user_profiles.

2. emailVerificationTokens()
- Lấy collection email_verification_tokens.

3. findUserProfileById(userId)
- Tìm hồ sơ người dùng theo _id.

4. updateUserProfileDisplayName(userId, displayName)
- Cập nhật displayName và updatedAt.
- Trả về document sau cập nhật.

5. createEmailVerificationToken(token)
- Insert token hash vào email_verification_tokens.

6. verifyEmailByTokenHash(tokenHash, now)
- Tìm token hợp lệ theo tokenHash và purpose verify_email.
- Kiểm tra token chưa consumed.
- Kiểm tra token chưa hết hạn.
- Kiểm tra user tồn tại.
- Đánh dấu consumedAt cho token.
- Cập nhật user_profiles.isVerified = true.
- Trả về kết quả ok hoặc reason lỗi.

Ý nghĩa:
- Gom toàn bộ thao tác DB vào một nơi.
- Service không phải biết chi tiết câu lệnh Mongo.

## 3.4 Service layer (profile.service.ts)
Đây là tầng nghiệp vụ chính.

Các thành phần quan trọng:
1. PROFILE_REPOSITORY
- Token DI để inject repository theo interface.

2. ServiceResult<T>
- Chuẩn hóa kết quả thành công hoặc thất bại:
  - ok true + data
  - ok false + error

3. extractUserIdFromJwt(user)
- Trích user id từ các key thường gặp: sub, userId, id.

4. getProfile(authUser)
- Lấy userId từ JWT.
- Tìm profile theo userId.
- Chuẩn hóa dữ liệu trả về: userId, username, displayName, isVerified, isActive.

5. updateProfile(authUser, dto)
- Lấy userId từ JWT.
- Chuẩn hóa displayName (trim, null nếu rỗng).
- Cập nhật profile.
- Trả dữ liệu sau cập nhật.

6. resendVerification(dto)
- Kiểm tra user tồn tại.
- Nếu user đã verified thì trả lỗi validation.
- Sinh raw token random.
- Băm SHA-256 thành tokenHash.
- Lưu tokenHash với expiresAt 15 phút.
- Trả expiresAt và tokenPreview trong môi trường không phải production.

7. verifyEmail(dto)
- Băm token từ request thành tokenHash.
- Gọi repository verifyEmailByTokenHash.
- Map reason lỗi sang error code business.
- Trả userId + verifiedAt khi thành công.

Ý nghĩa:
- Tập trung business logic vào một lớp.
- Controller giữ mỏng, chỉ điều phối.

## 3.5 Controller layer (profile.controller.ts)
Controller nhận request HTTP và gọi service tương ứng.

Các endpoint Day 1 đã chạy logic thật:
1. POST auth/verify-email
- Body: VerifyEmailDto
- Gọi profileService.verifyEmail
- Trả successResponse hoặc errorResponse

2. POST auth/resend-verification
- Body: ResendVerificationDto
- Gọi profileService.resendVerification
- Trả successResponse hoặc errorResponse

3. GET users/profile
- Dùng JwtAuthGuard
- Lấy req.user từ guard
- Gọi profileService.getProfile

4. PUT users/profile
- Dùng JwtAuthGuard
- Body: UpdateProfileDto
- Gọi profileService.updateProfile

Các endpoint Day 2/Day 3 hiện vẫn not implemented:
- PUT users/password
- POST users/avatar
- GET users/stats
- GET users/leaderboard
- GET games

Ý nghĩa:
- Controller chỉ nhận dữ liệu, gọi service, đóng gói response.
- Không chứa logic DB.

## 3.6 Module wiring (profile.module.ts)
ProfileModule đã được cấu hình provider:
1. ProfileService
2. Provider token PROFILE_REPOSITORY dùng ProfileRepository

Ý nghĩa:
- NestJS DI sẽ inject ProfileRepository vào ProfileService qua token interface.

## 3.7 Unit test (day1-profile.service.unit-test.ts)
Bài test dùng InMemoryProfileRepository để kiểm tra service mà không cần DB thật.

Các case đang test:
1. getProfile thành công.
2. updateProfile thành công.
3. resendVerification tạo token mới.
4. getProfile với user không tồn tại trả lỗi.

Ý nghĩa:
- Test business logic nhanh, ổn định.
- Không phụ thuộc network hay Mongo real.

## 3.8 Script test (package.json)
Đã thêm script:
- test:tv2:day1

Lệnh chạy:
1. npm run test:tv2:day1

Ý nghĩa:
- Chuẩn hóa cách chạy unit test Day 1 cho TV2.

## 4. Luồng end-to-end theo kiến trúc
Luồng tổng quát cho các API Day 1:
1. Client gửi HTTP request.
2. Nest bind body vào DTO.
3. ValidationPipe kiểm tra rule DTO.
4. Controller gọi Service.
5. Service xử lý nghiệp vụ.
6. Service gọi Repository nếu cần truy cập DB.
7. Repository thao tác Mongo.
8. Service nhận kết quả và trả ServiceResult.
9. Controller map sang response chuẩn success/data/error/meta.

## 5. Điểm mạnh và lưu ý kỹ thuật
### Điểm mạnh
1. Tách lớp rõ ràng, dễ bảo trì.
2. Có interface repository giúp test tốt.
3. Có unit test cho nghiệp vụ chính Day 1.
4. Response format thống nhất với chuẩn backend hiện tại.

### Lưu ý hiện tại
1. verifyEmailByTokenHash đang update 2 collection theo tuần tự, chưa dùng transaction.
2. resendVerification chưa có rate-limit chống spam gửi lại token.
3. Unit test hiện tập trung service, chưa có test controller/e2e.

## 6. Định hướng tiếp theo cho Day 2 và Day 3
1. Day 2: triển khai users/password, users/avatar, users/stats.
2. Day 2: thêm unit test riêng cho các API mới.
3. Day 3: triển khai users/leaderboard, games và hardening response/error.
4. Mỗi ngày tiếp tục tạo báo cáo md trong backend/tv2 theo cùng format.
