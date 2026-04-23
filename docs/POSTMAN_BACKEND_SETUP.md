# ChessWeb Backend API Testing With Postman

Tài liệu này dùng để setup Postman và test gần như toàn bộ API của backend ChessWeb.

## 1. Thông tin nền

- Base prefix của API: `/api/v1`
- Port local mặc định: `8080`
- URL local mặc định:

```text
http://localhost:8080/api/v1
```

- URL production/Railway mẫu:

```text
https://your-railway-domain.up.railway.app/api/v1
```

- Health check:

```http
GET /api/v1/health
```

Kết luận:

- Nếu test backend local: dùng `http://localhost:8080/api/v1`
- Nếu test backend đã deploy trên Railway: dùng `https://<railway-domain>/api/v1`
- Không được trộn domain giữa login/refresh/logout. Cookie refresh chỉ đi đúng theo domain đã login.

## 2. Chuẩn response của backend

Hầu hết API trả về dạng:

```json
{
  "success": true,
  "data": {},
  "error": null,
  "meta": {
    "requestId": "optional",
    "timestamp": "2026-04-24T10:00:00.000Z"
  }
}
```

Khi test trong Postman, nên luôn kiểm tra:

- HTTP status code
- `success === true`
- `data` có đúng field cần dùng

Lưu ý quan trọng:

- Backend auth hiện đã trả đúng HTTP status.
- Ví dụ:
  - `200` => thành công
  - `400` => request/body sai
  - `401` => sai token / sai tài khoản mật khẩu
  - `403` => bị cấm / không đủ quyền
  - `404` => không tìm thấy
  - `409` => trùng dữ liệu
  - `500` => lỗi hệ thống

## 3. Setup Environment trong Postman

Nên tạo 2 environment riêng:

1. `ChessWeb Local`
2. `ChessWeb Railway`

### 3.1. ChessWeb Local

| Variable       | Initial Value                  | Current Value                  |
| -------------- | ------------------------------ | ------------------------------ |
| `baseUrl`      | `http://localhost:8080/api/v1` | `http://localhost:8080/api/v1` |
| `accessToken`  |                                |                                |
| `refreshToken` |                                |                                |
| `userId`       |                                |                                |
| `username`     |                                |                                |
| `email`        |                                |                                |
| `tournamentId` |                                |                                |
| `matchId`      |                                |                                |
| `roomCode`     |                                |                                |
| `gameId`       |                                |                                |
| `botGameId`    |                                |                                |
| `botSessionId` |                                |                                |

### 3.2. ChessWeb Railway

| Variable       | Initial Value                                       | Current Value                                       |
| -------------- | --------------------------------------------------- | --------------------------------------------------- |
| `baseUrl`      | `https://your-railway-domain.up.railway.app/api/v1` | `https://your-railway-domain.up.railway.app/api/v1` |
| `accessToken`  |                                                     |                                                     |
| `refreshToken` |                                                     |                                                     |
| `userId`       |                                                     |                                                     |
| `username`     |                                                     |                                                     |
| `email`        |                                                     |                                                     |
| `tournamentId` |                                                     |                                                     |
| `matchId`      |                                                     |                                                     |
| `roomCode`     |                                                     |                                                     |
| `gameId`       |                                                     |                                                     |
| `botGameId`    |                                                     |                                                     |
| `botSessionId` |                                                     |                                                     |

## 4. Setup Authorization trong Postman

Nên hiểu auth trong Postman theo 2 mode:

1. `Bearer-first`: dễ test nhất, phù hợp khi bạn muốn gọi API protected nhanh
2. `Cookie flow`: dùng để test đúng luồng refresh/logout production

### 4.0. Quy tắc dùng Bearer hay Cookie

Quy tắc thực tế cho dự án này:

- `Bearer` dùng để test gần như toàn bộ API nghiệp vụ
- `Cookie` chỉ nên dùng cho các API thuộc vòng đời session

Bảng phân loại:

| API/nhóm API          | Bearer    | Cookie    | Ghi chú                                |
| --------------------- | --------- | --------- | -------------------------------------- |
| `GET /health`         | Không cần | Không cần | Public                                 |
| `POST /auth/register` | Không     | Không     | Public                                 |
| `POST /auth/login`    | Không     | Không     | Sau login server sẽ set refresh cookie |
| `POST /auth/google`   | Không     | Không     | Sau login server sẽ set refresh cookie |
| `POST /auth/refresh`  | Không nên | Có        | Nên test bằng refresh cookie           |
| `POST /auth/logout`   | Có thể    | Nên có    | Cookie là chuẩn hơn để revoke session  |
| `GET /auth/me`        | Có        | Không     | Protected                              |
| `users/*`             | Có        | Không     | Protected                              |
| `ranked/*`            | Có        | Không     | Protected                              |
| `rooms/*`             | Có        | Không     | Protected                              |
| `tournaments/*`       | Có        | Không     | Protected                              |
| `bot/*`               | Có        | Không     | Protected                              |
| `GET /games`          | Có        | Không     | Protected                              |
| `GET /games/:id`      | Có        | Không     | Protected                              |

Kết luận ngắn:

- muốn test nghiệp vụ: dùng `Bearer`
- muốn test session/remember login/refresh/logout: dùng `Cookie`

### 4.1. Access token

Các API có `JwtAuthGuard` cần:

```http
Authorization: Bearer {{accessToken}}
```

Cách setup nhanh:

1. Tạo collection `ChessWeb Backend`.
2. Ở cấp collection, tab `Authorization`:
   - Type: `Bearer Token`
   - Token: `{{accessToken}}`

Nếu bạn muốn test theo kiểu Bearer là chính, thì đây là mode nên dùng mặc định.

Các API thường test bằng Bearer:

- `GET /auth/me`
- toàn bộ `users/*`
- toàn bộ `ranked/*`
- hầu hết `rooms/*`
- hầu hết `tournaments/*`
- `GET /games`
- `GET /games/:id`

### 4.2. Refresh cookie

Backend hiện dùng:

- access token trong response body
- refresh token trong `httpOnly cookie`

Refresh cookie path mặc định:

```text
/api/v1/auth
```

Trong Postman:

1. Gọi `POST /auth/login` hoặc `POST /auth/register`
2. Mở `Cookies` ở góc phải request
3. Xác nhận Postman đã lưu cookie refresh cho domain backend
4. Khi gọi `POST /auth/refresh`, Postman sẽ tự gửi cookie nếu cùng domain

Lưu ý:

- Không cần đọc `refreshToken` từ frontend flow.
- Nếu Postman không tự giữ cookie, kiểm tra đúng domain và không đổi giữa `localhost`, `127.0.0.1`, IP LAN, Railway domain.
- Cookie của local và Railway là 2 cookie khác nhau.

Nếu bạn không muốn test bằng cookie:

- vẫn test được gần như toàn bộ API protected bằng `Bearer {{accessToken}}`
- nhưng 2 API sau sẽ không còn phản ánh đúng production flow:
  - `POST /auth/refresh`
  - `POST /auth/logout`

Nói ngắn:

- muốn test chức năng nghiệp vụ => Bearer là đủ
- muốn test đúng vòng đời session => phải có cookie

### 4.3. Luồng setup chuẩn nhất trong Postman

#### Luồng A: test API nghiệp vụ bằng Bearer

1. Gọi `POST {{baseUrl}}/auth/login`
2. Postman lấy `data.token` và lưu vào `{{accessToken}}`
3. Collection tự gắn:

```http
Authorization: Bearer {{accessToken}}
```

4. Dùng token đó để test:
   - profile
   - ranked
   - rooms
   - tournaments
   - bot
   - replay/games

#### Luồng B: test session bằng Cookie

1. Gọi `POST {{baseUrl}}/auth/login`
2. Mở Postman Cookies
3. Kiểm tra domain hiện tại đã có refresh cookie
4. Gọi `POST {{baseUrl}}/auth/refresh` với body `{}` để Postman tự gửi cookie
5. Gọi `POST {{baseUrl}}/auth/logout` với body `{}` để revoke session bằng cookie

Không được login ở domain này rồi refresh ở domain khác.

## 5. Script Postman nên dùng

### 5.1. Test script cho Login/Register/Google

Dán vào tab `Tests` của request đăng nhập:

```javascript
const json = pm.response.json();

pm.test("Login/Register success", function () {
  pm.expect(pm.response.code).to.eql(200);
  pm.expect(json.success).to.eql(true);
  pm.expect(json.data.token).to.be.a("string");
});

if (json?.data?.token) {
  pm.environment.set("accessToken", json.data.token);
}

if (json?.data?.user?.id) {
  pm.environment.set("userId", json.data.user.id);
}

if (json?.data?.user?.username) {
  pm.environment.set("username", json.data.user.username);
}

if (json?.data?.user?.email) {
  pm.environment.set("email", json.data.user.email);
}
```

### 5.2. Test script xử lý lỗi auth rõ hơn

```javascript
const json = pm.response.json();

if (pm.response.code >= 400) {
  console.log("API error:", json);
}

pm.test("Response has request envelope", function () {
  pm.expect(json).to.have.property("meta");
});
```

### 5.3. Test script cho tạo giải / tạo room / tạo game

```javascript
const json = pm.response.json();

pm.test("Request success", function () {
  pm.expect(json.success).to.eql(true);
});

if (json?.data?.id) {
  pm.environment.set("tournamentId", json.data.id);
}

if (json?.data?.code) {
  pm.environment.set("roomCode", json.data.code);
}

if (json?.data?.roomCode) {
  pm.environment.set("roomCode", json.data.roomCode);
}

if (json?.data?.gameId) {
  pm.environment.set("gameId", json.data.gameId);
}
```

## 6. Thứ tự test khuyến nghị

Nên test theo thứ tự này:

1. `Health`
2. `Auth`
3. `Profile`
4. `Ranked`
5. `Rooms`
6. `Tournaments`
7. `Bot`
8. `Replay / Games`

## 6.1. Thứ tự test khuyến nghị chi tiết nhất

### Bước 1: test public endpoint trước

1. `GET {{baseUrl}}/health`
2. `POST {{baseUrl}}/auth/check-username`
3. `POST {{baseUrl}}/auth/check-email`

### Bước 2: test auth cơ bản

1. `POST {{baseUrl}}/auth/register`
2. `POST {{baseUrl}}/auth/login`
3. kiểm tra `{{accessToken}}` đã được set
4. kiểm tra Postman đã giữ refresh cookie
5. `GET {{baseUrl}}/auth/me` bằng Bearer

### Bước 3: test session flow

1. `POST {{baseUrl}}/auth/refresh` với body `{}`
2. `POST {{baseUrl}}/auth/logout` với body `{}`
3. gọi lại `POST {{baseUrl}}/auth/refresh`
4. kỳ vọng `401` vì session đã bị revoke

### Bước 4: test nghiệp vụ bằng Bearer

1. `users/*`
2. `ranked/*`
3. `rooms/*`
4. `tournaments/*`
5. `bot/*`
6. `games/*`

## 7. Danh sách endpoint theo module

---

## 8. Health

### 8.1. Health check

```http
GET {{baseUrl}}/health
```

Không cần auth.

---

## 9. Auth API

Base:

```text
{{baseUrl}}/auth
```

### 9.1. Register

```http
POST {{baseUrl}}/auth/register
Content-Type: application/json
```

Body:

```json
{
  "username": "testuser01",
  "email": "testuser01@example.com",
  "password": "Password123",
  "displayName": "Test User 01"
}
```

Auth mode:

- Không dùng Bearer
- Không cần cookie
- Sau khi thành công server sẽ set refresh cookie

### 9.2. Login

Có thể login bằng `identifier`, hoặc `username`, hoặc `email`.

```http
POST {{baseUrl}}/auth/login
Content-Type: application/json
```

Body mẫu 1:

```json
{
  "identifier": "testuser01",
  "password": "Password123",
  "remember": true
}
```

Body mẫu 2:

```json
{
  "email": "testuser01@example.com",
  "password": "Password123",
  "remember": true
}
```

Auth mode:

- Không dùng Bearer
- Không cần cookie
- Sau khi thành công server sẽ set refresh cookie

### 9.3. Google login

```http
POST {{baseUrl}}/auth/google
Content-Type: application/json
```

Body:

```json
{
  "idToken": "GOOGLE_ID_TOKEN"
}
```

Lưu ý rất quan trọng:

- `idToken` không phải `Google Client ID`
- `idToken` phải là token thật Google trả về sau khi người dùng đăng nhập thành công
- Nếu bạn gửi `client id` kiểu:

```text
81316592871-xxxx.apps.googleusercontent.com
```

thì request sẽ thất bại

- Nếu token sai, backend sẽ trả:
  - HTTP `401`
  - `error.code = AUTH_INVALID_CREDENTIALS`

Auth mode:

- Không dùng Bearer
- Không cần cookie trước đó
- Sau khi thành công server sẽ set refresh cookie

### 9.4. Refresh token

```http
POST {{baseUrl}}/auth/refresh
Content-Type: application/json
```

Body có thể để rỗng:

```json
{}
```

Request này chủ yếu dùng refresh cookie đã được Postman giữ.

Nếu muốn test bằng body thay vì cookie:

```json
{
  "refreshToken": "REFRESH_TOKEN"
}
```

Lưu ý:

- Trong flow hiện tại, login/register/google không trả `refreshToken` ra response body nữa
- nên nếu bạn test theo kiểu Bearer-only, thường bạn sẽ không có `refreshToken` để gọi tay `refresh`
- vì vậy:
  - test `refresh` đúng chuẩn => dùng cookie
  - test các API còn lại => dùng Bearer

Auth mode:

- Không cần Bearer
- Nên dùng cookie

Checklist test `refresh`:

1. login thành công
2. mở Postman Cookies, xác nhận cookie refresh tồn tại
3. gọi `POST {{baseUrl}}/auth/refresh`
4. kỳ vọng:
   - HTTP `200`
   - `success: true`
   - có `data.token`

### 9.5. Logout

```http
POST {{baseUrl}}/auth/logout
Content-Type: application/json
```

Body:

```json
{}
```

Lưu ý:

- Logout hiện không còn bắt buộc `Authorization: Bearer {{accessToken}}`
- Logout sẽ hoạt động nếu có một trong các thứ sau:
  1. refresh cookie
  2. `refreshToken` trong body
  3. access token bearer

Body mẫu nếu muốn revoke đúng refresh token:

```json
{
  "refreshToken": "{{refreshToken}}"
}
```

Nếu bạn đã login bằng Postman và Postman đang giữ refresh cookie, body `{}` là đủ.

Nếu bạn chỉ muốn test bằng Bearer:

- vẫn có thể gửi:

```http
Authorization: Bearer {{accessToken}}
```

- nhưng logout bằng Bearer chỉ giúp request đi qua được dễ hơn
- phần revoke refresh session đầy đủ vẫn tốt nhất khi có refresh cookie hoặc `refreshToken`

Auth mode:

- Có thể dùng Bearer
- Nên dùng cookie

Checklist test `logout` chuẩn:

1. login thành công
2. xác nhận Postman đang giữ refresh cookie
3. gọi `POST {{baseUrl}}/auth/logout` với body `{}`
4. gọi lại `POST {{baseUrl}}/auth/refresh`
5. kỳ vọng `401`

### 9.6. Forgot password

```http
POST {{baseUrl}}/auth/forgot-password
Content-Type: application/json
```

Body:

```json
{
  "email": "testuser01@example.com"
}
```

### 9.7. Reset password

```http
POST {{baseUrl}}/auth/reset-password
Content-Type: application/json
```

Body:

```json
{
  "token": "RESET_TOKEN",
  "password": "NewPassword123"
}
```

### 9.8. Check username

```http
POST {{baseUrl}}/auth/check-username
Content-Type: application/json
```

```json
{
  "username": "testuser01"
}
```

### 9.9. Check email

```http
POST {{baseUrl}}/auth/check-email
Content-Type: application/json
```

```json
{
  "email": "testuser01@example.com"
}
```

### 9.10. Current user

```http
GET {{baseUrl}}/auth/me
Authorization: Bearer {{accessToken}}
```

Nếu request này trả `401 Missing bearer token`, nghĩa là Postman chưa set `{{accessToken}}` hoặc bạn chưa login thành công.

Auth mode:

- Bắt buộc Bearer
- Cookie không thay thế được endpoint này

---

## 9.11. Khuyến nghị cách test auth trong Postman

### Cách 1: Test nhanh theo Bearer

Phù hợp khi mục tiêu là test API nghiệp vụ.

1. Gọi `POST /auth/login`
2. Lấy `json.data.token`
3. Postman tự set `{{accessToken}}`
4. Gọi các API protected bằng Bearer

Không cần quan tâm cookie nếu bạn không test refresh flow.

### Cách 2: Test đúng session flow

Phù hợp khi mục tiêu là test:

- refresh session
- logout session
- remember login
- cookie trên local/Railway

1. Gọi `POST /auth/login`
2. Kiểm tra Postman đã giữ refresh cookie
3. Gọi `POST /auth/refresh`
4. Gọi `POST /auth/logout`

Mode này mới phản ánh đúng flow frontend production.

---

## 10. Profile API

### 10.1. Verify email

```http
POST {{baseUrl}}/auth/verify-email
Content-Type: application/json
```

```json
{
  "token": "VERIFY_EMAIL_TOKEN"
}
```

### 10.2. Resend verification

```http
POST {{baseUrl}}/auth/resend-verification
Content-Type: application/json
```

```json
{
  "userId": "{{userId}}"
}
```

### 10.3. Get profile

```http
GET {{baseUrl}}/users/profile
Authorization: Bearer {{accessToken}}
```

Auth mode: Bearer

### 10.4. Update profile

```http
PUT {{baseUrl}}/users/profile
Authorization: Bearer {{accessToken}}
Content-Type: application/json
```

Auth mode: Bearer

```json
{
  "displayName": "Test User Updated"
}
```

### 10.5. Update password

```http
PUT {{baseUrl}}/users/password
Authorization: Bearer {{accessToken}}
Content-Type: application/json
```

Auth mode: Bearer

```json
{
  "currentPassword": "Password123",
  "newPassword": "NewPassword123",
  "confirmNewPassword": "NewPassword123"
}
```

### 10.6. Upload avatar

```http
POST {{baseUrl}}/users/avatar
Authorization: Bearer {{accessToken}}
Content-Type: application/json
```

Auth mode: Bearer

```json
{
  "avatarUrl": "https://example.com/avatar.png",
  "avatarPublicId": "avatar_001",
  "mimeType": "image/png",
  "fileSize": 102400
}
```

### 10.7. User stats

```http
GET {{baseUrl}}/users/stats
Authorization: Bearer {{accessToken}}
```

Auth mode: Bearer

### 10.8. Leaderboard

```http
GET {{baseUrl}}/users/leaderboard?page=1&pageSize=10&mode=ranked&sort=rating_desc
```

Không cần auth.

### 10.9. Game history

```http
GET {{baseUrl}}/games?page=1&pageSize=10&mode=ranked&result=win
Authorization: Bearer {{accessToken}}
```

Query có thể dùng:

- `page`
- `pageSize`
- `mode`: `ranked | room | bot | tournament`
- `result`: `win | lose | draw`
- `fromDate`
- `toDate`

Auth mode: Bearer

### 10.10. Stats by mode

```http
GET {{baseUrl}}/users/stats/by-mode?mode=bot
Authorization: Bearer {{accessToken}}
```

Auth mode: Bearer

---

## 11. Ranked API

### 11.1. Join ranked queue

```http
POST {{baseUrl}}/ranked/queue/join
Authorization: Bearer {{accessToken}}
Content-Type: application/json
```

```json
{
  "timeControl": "rapid",
  "preferredColor": "random"
}
```

Giá trị hợp lệ:

- `timeControl`: `blitz | rapid | classical`
- `preferredColor`: `white | black | random`

Auth mode: Bearer

### 11.2. Leave ranked queue

```http
POST {{baseUrl}}/ranked/queue/leave
Authorization: Bearer {{accessToken}}
```

Auth mode: Bearer

### 11.3. Get ranked match

```http
GET {{baseUrl}}/ranked/matches/{{gameId}}
Authorization: Bearer {{accessToken}}
```

Auth mode: Bearer

### 11.4. Complete ranked match

```http
POST {{baseUrl}}/ranked/matches/{{gameId}}/complete
Authorization: Bearer {{accessToken}}
Content-Type: application/json
```

```json
{
  "result": "WhiteWin",
  "reason": "checkmate",
  "moves": []
}
```

Giá trị `result`:

- `WhiteWin`
- `BlackWin`
- `Draw`

Auth mode: Bearer

### 11.5. Ranked history

```http
GET {{baseUrl}}/ranked/history?page=1&pageSize=10
Authorization: Bearer {{accessToken}}
```

Auth mode: Bearer

### 11.6. Ranked stats

```http
GET {{baseUrl}}/ranked/stats
Authorization: Bearer {{accessToken}}
```

Auth mode: Bearer

---

## 12. Room API

### 12.1. Create room

```http
POST {{baseUrl}}/rooms
Authorization: Bearer {{accessToken}}
Content-Type: application/json
```

```json
{
  "name": "Friendly Room 01",
  "timeControl": "rapid",
  "isPrivate": false,
  "initialTimeSeconds": 600
}
```

`timeControl` hợp lệ:

- `blitz`
- `rapid`
- `classical`

Auth mode: Bearer

### 12.2. Join room by code

```http
POST {{baseUrl}}/rooms/{{roomCode}}/join
Authorization: Bearer {{accessToken}}
```

Auth mode: Bearer

### 12.3. List public rooms

```http
GET {{baseUrl}}/rooms?visibility=public&status=open&limit=20
Authorization: Bearer {{accessToken}}
```

Auth mode: Bearer

### 12.4. Get room detail

```http
GET {{baseUrl}}/rooms/{{roomCode}}
Authorization: Bearer {{accessToken}}
```

Auth mode: Bearer

### 12.5. Leave room

```http
POST {{baseUrl}}/rooms/{{roomCode}}/leave
Authorization: Bearer {{accessToken}}
```

Auth mode: Bearer

### 12.6. Start room game

```http
POST {{baseUrl}}/rooms/{{roomCode}}/start
Authorization: Bearer {{accessToken}}
```

Auth mode: Bearer

---

## 13. Tournament API

Tournament hiện nằm ở 2 nhóm:

- CRUD/list cơ bản ở `competition`
- thao tác join/start/match/check-in ở `social-bot`

### 13.1. List tournaments

```http
GET {{baseUrl}}/tournaments?page=1&pageSize=10&status=registration&search=goat
Authorization: Bearer {{accessToken}}
```

`status` hợp lệ:

- `draft`
- `open`
- `registration`
- `full`
- `ongoing`
- `completed`
- `cancelled`

Auth mode: Bearer

### 13.2. Create tournament

```http
POST {{baseUrl}}/tournaments
Authorization: Bearer {{accessToken}}
Content-Type: application/json
```

```json
{
  "name": "Giải Mùa Hè 2026",
  "description": "Giải test bằng Postman",
  "prize": "1.000.000 VND",
  "format": "knockout",
  "timeControl": "10+0",
  "startAt": "2026-05-01T12:00:00.000Z",
  "endAt": "2026-05-01T16:00:00.000Z",
  "registrationDeadline": "2026-05-01T11:00:00.000Z",
  "maxParticipants": 8
}
```

Script gợi ý sau request:

```javascript
const json = pm.response.json();
if (json?.data?.id) {
  pm.environment.set("tournamentId", json.data.id);
}
```

Auth mode: Bearer

### 13.3. Get tournament detail

```http
GET {{baseUrl}}/tournaments/{{tournamentId}}
Authorization: Bearer {{accessToken}}
```

Auth mode: Bearer

### 13.4. Join tournament

```http
POST {{baseUrl}}/tournaments/{{tournamentId}}/join
Authorization: Bearer {{accessToken}}
```

Auth mode: Bearer

### 13.5. Withdraw tournament

```http
POST {{baseUrl}}/tournaments/{{tournamentId}}/withdraw
Authorization: Bearer {{accessToken}}
```

Auth mode: Bearer

### 13.6. Start tournament

```http
POST {{baseUrl}}/tournaments/{{tournamentId}}/start
Authorization: Bearer {{accessToken}}
```

Auth mode: Bearer

### 13.7. Cancel tournament

```http
POST {{baseUrl}}/tournaments/{{tournamentId}}/cancel
Authorization: Bearer {{accessToken}}
```

Auth mode: Bearer

### 13.8. Set manual seeding

```http
POST {{baseUrl}}/tournaments/{{tournamentId}}/seeding
Authorization: Bearer {{accessToken}}
Content-Type: application/json
```

```json
{
  "pairs": [
    { "player1UserId": "USER_ID_1", "player2UserId": "USER_ID_2" },
    { "player1UserId": "USER_ID_3", "player2UserId": "USER_ID_4" }
  ]
}
```

Auth mode: Bearer

### 13.9. Open round / create match rooms

```http
POST {{baseUrl}}/tournaments/{{tournamentId}}/rounds/open
Authorization: Bearer {{accessToken}}
Content-Type: application/json
```

```json
{
  "roundIndex": 1,
  "checkInMinutes": 3
}
```

Auth mode: Bearer

### 13.10. Check-in tournament match

```http
POST {{baseUrl}}/tournaments/{{tournamentId}}/matches/{{matchId}}/check-in
Authorization: Bearer {{accessToken}}
```

Auth mode: Bearer

### 13.11. Start tournament match

```http
POST {{baseUrl}}/tournaments/{{tournamentId}}/matches/{{matchId}}/start
Authorization: Bearer {{accessToken}}
```

Auth mode: Bearer

### 13.12. Resign tournament match

```http
POST {{baseUrl}}/tournaments/{{tournamentId}}/matches/{{matchId}}/resign
Authorization: Bearer {{accessToken}}
```

Auth mode: Bearer

### 13.13. Record tournament match result

```http
POST {{baseUrl}}/tournaments/{{tournamentId}}/matches/{{matchId}}/result
Authorization: Bearer {{accessToken}}
Content-Type: application/json
```

```json
{
  "winnerSlot": "player1",
  "overwrite": true
}
```

`winnerSlot` hợp lệ:

- `player1`
- `player2`

Auth mode: Bearer

### 13.14. Approve participant

```http
POST {{baseUrl}}/tournaments/{{tournamentId}}/participants/{{userId}}/approve
Authorization: Bearer {{accessToken}}
```

Auth mode: Bearer

### 13.15. Reject participant

```http
POST {{baseUrl}}/tournaments/{{tournamentId}}/participants/{{userId}}/reject
Authorization: Bearer {{accessToken}}
```

Auth mode: Bearer

---

## 14. Bot API

### 14.1. Create bot game

```http
POST {{baseUrl}}/bot/games
Authorization: Bearer {{accessToken}}
Content-Type: application/json
```

```json
{
  "difficulty": "normal",
  "preferredColor": "white",
  "maxThinkSeconds": 5
}
```

`difficulty` hợp lệ:

- `easy`
- `normal`
- `hard`
- `super_hard`
- `beginner`
- `intermediate`
- `advanced`
- `expert`

Script gợi ý:

```javascript
const json = pm.response.json();
if (json?.data?.gameId) pm.environment.set("botGameId", json.data.gameId);
if (json?.data?.sessionId)
  pm.environment.set("botSessionId", json.data.sessionId);
```

Auth mode: Bearer

### 14.2. Ask bot to move

```http
POST {{baseUrl}}/bot/move
Authorization: Bearer {{accessToken}}
Content-Type: application/json
```

```json
{
  "sessionId": "{{botSessionId}}",
  "fen": "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
}
```

Auth mode: Bearer

### 14.3. Tactical hint

```http
POST {{baseUrl}}/bot/tactical-hint
Authorization: Bearer {{accessToken}}
Content-Type: application/json
```

```json
{
  "pgn": "1. e4 e5 2. Nf3 Nc6 3. Bb5 a6",
  "detailLevel": "detailed",
  "playerColor": "white",
  "playerSide": "white"
}
```

Auth mode: Bearer

### 14.4. Save bot game

```http
POST {{baseUrl}}/games/{{botGameId}}/save
Authorization: Bearer {{accessToken}}
Content-Type: application/json
```

```json
{
  "result": "WhiteWin",
  "state": "Finished",
  "mode": "bot",
  "endReason": "checkmate",
  "initialFEN": "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
  "moves": [],
  "whitePlayer": {
    "id": "USER_ID"
  },
  "blackPlayer": {
    "id": "BOT_ID"
  },
  "metadata": {
    "difficulty": "normal"
  }
}
```

`result` hợp lệ:

- `WhiteWin`
- `BlackWin`
- `Draw`

Auth mode: Bearer

---

## 15. Game / Replay API

### 15.1. Get game detail / replay

```http
GET {{baseUrl}}/games/{{gameId}}
Authorization: Bearer {{accessToken}}
```

Auth mode: Bearer

Có thể thêm query để lấy AI analysis:

```http
GET {{baseUrl}}/games/{{gameId}}?analyzeFen=FEN_STRING&userMove=Nf6&score=35&refreshAi=true&playerColor=white
Authorization: Bearer {{accessToken}}
```

---

## 16. Gợi ý cấu trúc collection trong Postman

Nên tạo collection như sau:

1. `00 Health`
2. `01 Auth`
3. `02 Profile`
4. `03 Ranked`
5. `04 Rooms`
6. `05 Tournaments`
7. `06 Bot`
8. `07 Games & Replay`

## 17. Request headers khuyến nghị

Ngoài `Authorization`, có thể thêm:

```http
Content-Type: application/json
x-request-id: postman-manual-test-001
```

`x-request-id` không bắt buộc nhưng hữu ích khi đọc log backend.

## 18. Pre-request script khuyến nghị cho collection

Nếu muốn tự gắn bearer token cho request cần auth:

```javascript
const token = pm.environment.get("accessToken");
if (token) {
  pm.request.headers.upsert({
    key: "Authorization",
    value: `Bearer ${token}`,
  });
}
```

## 19. Các điểm cần lưu ý khi test

### 19.1. API websocket không test đủ bằng Postman

Các luồng realtime như:

- matchmaking ranked realtime
- socket room/tournament updates
- chat realtime

không thể xác nhận đầy đủ chỉ bằng Postman. Với các luồng đó, Postman chỉ test được phần REST hỗ trợ.

### 19.2. Cookie refresh

Nếu `POST /auth/refresh` không hoạt động:

1. kiểm tra Postman có giữ cookie không
2. kiểm tra gọi đúng cùng domain
3. kiểm tra backend đang chạy đúng `baseUrl`

### 19.3. Tournament flow chuẩn để test

Flow nên test:

1. tạo tournament
2. lấy detail tournament
3. user khác join
4. organizer approve participant nếu flow yêu cầu
5. organizer start tournament
6. organizer open round
7. player check-in
8. organizer start match
9. record result

Tất cả bước trong flow này dùng Bearer.

### 19.4. Bot flow chuẩn để test

Flow nên test:

1. create bot game
2. ask bot move
3. tactical hint
4. save game
5. get game detail

Tất cả bước trong flow này dùng Bearer.

## 19.5. Auth flow chuẩn để test

### Auth flow bằng Bearer

1. `POST /auth/login`
2. lấy `accessToken`
3. `GET /auth/me`
4. test các API protected

### Auth flow bằng Cookie

1. `POST /auth/login`
2. xác nhận refresh cookie đã được set
3. `POST /auth/refresh`
4. `POST /auth/logout`
5. `POST /auth/refresh` lần nữa để xác nhận session đã hết

## 20. File tham chiếu route

Các route trong tài liệu này được tổng hợp từ:

- [identity.controller.ts](/home/hiubeo/Documents/code/ChessWeb/backend/src/modules/identity/identity.controller.ts)
- [profile.controller.ts](/home/hiubeo/Documents/code/ChessWeb/backend/src/modules/profile/profile.controller.ts)
- [competition.controller.ts](/home/hiubeo/Documents/code/ChessWeb/backend/src/modules/competition/competition.controller.ts)
- [social-bot.controller.ts](/home/hiubeo/Documents/code/ChessWeb/backend/src/modules/social-bot/social-bot.controller.ts)
- [main.ts](/home/hiubeo/Documents/code/ChessWeb/backend/src/main.ts)
- [env.ts](/home/hiubeo/Documents/code/ChessWeb/backend/src/shared/config/env.ts)

## 21. Khuyến nghị tiếp theo

Nếu muốn test nhanh hơn nữa, bước hợp lý tiếp theo là tạo thêm:

1. file Postman Collection JSON mẫu
2. file Postman Environment JSON mẫu
3. script auto-chain để:
   - register/login
   - set token
   - create tournament
   - save ids tự động
     logout rồi mà vẫn lấy được profile nè nó có phải lỗi hay k , test logoput lần 2 thì tôi muốn là phải báo là bạn chưa đang nhập ý ,
