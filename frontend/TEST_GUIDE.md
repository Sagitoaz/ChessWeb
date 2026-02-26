# 🧪 Test Guide - ChessWeb Frontend

## Cách Test UI của Từng Page

### 1. Khởi động Dev Server

```bash
cd frontend
npm run dev
```

**QUAN TRỌNG:** Sau khi sửa `vite.config.js`, bạn cần **restart dev server** để áp dụng thay đổi:
- Press `Ctrl+C` để dừng server
- Run `npm run dev` lại

### 2. Truy cập Test Hub

Có 2 cách để truy cập Test Hub:

#### Cách 1: Từ HomePage
1. Mở trình duyệt và truy cập: `http://localhost:5173`
2. Kéo xuống cuối trang
3. Click vào button **"🧪 Developer Test Hub"** (màu cam-đỏ)

#### Cách 2: Direct URL
- Truy cập trực tiếp: `http://localhost:5173/testlinks`

### 3. Test Pages Without Authentication

Tại trang Test Hub, bạn sẽ thấy tất cả các link test được chia theo modules:

#### 🏠 Quick Navigation
- Home, Login, Logout
- Ranked, Rooms, Tournaments, Bot, Replays

#### 🧪 Test Routes chia theo Member

**Member 1: Auth & Profile** (Blue)
- Login Page: `/login`
- Register Page: `/register`
- Profile Page: `/test/auth/profile`
- Edit Profile: `/test/auth/profile/edit`
- Leaderboard: `/leaderboard`
- **⚡ Dev Quick Login**: Click button này để fake login tức thì

**Member 2: Ranked Match** (Orange)
- Ranked Lobby: `/test/ranked`
- Ranked Game: `/test/ranked/game`
- Ranked History: `/test/ranked/history`
- Ranked Stats: `/test/ranked/stats`

**Member 3: Rooms & Tournaments** (Green/Purple)
- Rooms List: `/test/rooms`
- Create Room: `/test/rooms/create`
- Join Room: `/test/rooms/join`
- Room Game: `/test/rooms/game`
- Tournaments: `/test/tournaments`
- Create Tournament: `/test/tournaments/create`
- Tournament Detail: `/test/tournaments/detail`
- Tournament Bracket: `/test/tournaments/bracket`

**Member 4: Bot & Replay** (Purple)
- Bot Select: `/test/bot`
- Bot Game: `/test/bot/game`
- Replay List: `/test/replays`
- Replay Viewer: `/test/replays/viewer`

### 4. Dev Quick Login Feature

Để test các pages cần authentication, click button **"⚡ Dev Quick Login"**:

1. Tự động tạo fake user data trong localStorage
2. Redirect đến Profile page
3. Bạn đã "login" và có thể test các protected pages

**User data được fake:**
```json
{
  "id": 1,
  "username": "testuser",
  "displayName": "Test User",
  "email": "test@example.com",
  "avatarUrl": "https://i.pravatar.cc/150?img=1",
  "rating": 1500,
  "wins": 10,
  "losses": 5,
  "gamesPlayed": 18
}
```

### 5. Clear Fake Login

Click button **"🚪 Logout / Clear"** (màu đỏ) để:
- Xóa localStorage
- Clear fake authentication
- Reset về trạng thái not logged in

### 6. Test Routes vs Production Routes

| Test Route | Production Route | Khác biệt |
|------------|------------------|-----------|
| `/test/auth/profile` | `/profile` | Test route không cần login |
| `/test/ranked` | `/ranked` | Test route bỏ qua matchmaking socket |
| `/test/rooms` | `/rooms` | Test route dùng mock data |
| `/test/bot` | `/bot` | Test route không call API |

**Test routes** cho phép:
- ✅ Test UI mà không cần backend running
- ✅ Không cần authentication
- ✅ Sử dụng mock data có sẵn
- ✅ Bỏ qua các API calls thất bại

### 7. Theme Consistency Check

Tất cả pages đã được convert sang **Light Theme** thống nhất:

- ✅ Background: `bg-gray-50` (page), `bg-white` (cards)
- ✅ Text: `text-gray-900` (primary), `text-gray-600` (secondary)
- ✅ Borders: `border-gray-200`
- ✅ Shadows: `shadow-sm`, `shadow-md`

**Kiểm tra:**
1. Mở mỗi page
2. Verify background màu trắng/xám nhạt
3. Text phải đọc được rõ (dark text on light background)
4. Cards có borders và shadows nhẹ

### 8. Troubleshooting

#### Lỗi: "Failed to resolve import @/styles/theme"

**Nguyên nhân:** Vite config chưa được reload sau khi thêm alias.

**Giải pháp:**
```bash
# Stop dev server (Ctrl+C)
npm run dev  # Restart
```

#### Lỗi: "Cannot read property of undefined"

**Nguyên nhân:** Page đang cố gọi API hoặc access user data.

**Giải pháp:**
1. Dùng test routes thay vì production routes
2. Hoặc click "Dev Quick Login" để fake user data

#### Page không render đúng

**Kiểm tra:**
1. Browser console có error không?
2. Đã restart dev server chưa?
3. Đã clear browser cache chưa? (Ctrl+Shift+R)

### 9. Demo Routes

Ngoài test routes, còn có **demo routes** với sample data:

- `/demo` - Demo hub
- `/demo/ranked` - Demo Ranked với bot AI
- `/demo/ranked/game` - Demo game với timer

### 10. Tips for Testing

✅ Sử dụng browser DevTools:
- Press `F12` để mở DevTools
- Tab "Console" để xem errors
- Tab "Network" để xem API calls
- Tab "Application" > "Local Storage" để xem fake user data

✅ Test responsive:
- Press `Ctrl+Shift+M` để toggle device toolbar
- Test với các sizes: Mobile (375px), Tablet (768px), Desktop (1920px)

✅ Test dark mode:
- Hiện tại toàn bộ app đã chuyển sang **Light Theme**
- Nếu cần test dark mode, cần implement dark theme toggle

---

## Summary

Với Test Hub, bạn có thể:
1. ✅ Test tất cả pages **không cần backend**
2. ✅ Test tất cả pages **không cần login**
3. ✅ Fake login nhanh chóng bằng 1 click
4. ✅ Navigate giữa các pages dễ dàng
5. ✅ Verify theme consistency
6. ✅ Debug UI issues nhanh chóng

**Happy Testing!** 🎉
