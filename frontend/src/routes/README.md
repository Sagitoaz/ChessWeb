# Routes Setup - ChessWeb

## ✅ Hoàn thành Bước 4 - Giai đoạn 0

Routes đã được setup đầy đủ theo phân công trong WORK_DISTRIBUTION.md

---

## 📁 Files

### `index.jsx`
Main route configuration với đầy đủ 23 routes:
- **Public routes** (2): Login, Register  
- **Private routes** (19): Profile, Ranked, Rooms, Tournaments, Bot, Replay
- **Home routes** (2): Home, Dashboard

### `PrivateRoute.jsx`
Protected route wrapper - yêu cầu authentication
- Redirect về `/login` nếu chưa đăng nhập
- Sử dụng `useAuthStore` để check auth state

### `PublicRoute.jsx`
Public route wrapper - chỉ cho phép khi chưa đăng nhập
- Redirect về `/dashboard` nếu đã đăng nhập

---

## 🎯 Cách Sử dụng

### Khi implement pages mới:

1. **Uncomment lazy import** trong `routes/index.jsx`:
   ```javascript
   // Bỏ comment dòng này:
   // const LoginPage = lazy(() => import('@pages/auth/LoginPage'))
   
   // Thành:
   const LoginPage = lazy(() => import('@pages/auth/LoginPage'))
   ```

2. **Thay PlaceholderPage bằng component thật**:
   ```javascript
   // Từ:
   <Route path="/login" element={
     <PublicRoute>
       <PlaceholderPage title="Login Page" ... />
     </PublicRoute>
   } />
   
   // Thành:
   <Route path="/login" element={
     <PublicRoute>
       <LoginPage />
     </PublicRoute>
   } />
   ```

---

## 📋 Danh sách Routes theo Team Member

### Team Member 1 - Auth & Profile (6 routes)
- `/login` - PublicRoute
- `/register` - PublicRoute  
- `/profile` - PrivateRoute
- `/profile/edit` - PrivateRoute
- `/leaderboard` - Public (ai cũng xem được)

### Team Member 2 - Ranked Match (4 routes)
- `/ranked` - PrivateRoute
- `/ranked/game/:matchId` - PrivateRoute
- `/ranked/history` - PrivateRoute
- `/ranked/stats` - PrivateRoute

### Team Member 3 - Rooms & Tournaments (8 routes)
**Rooms:**
- `/rooms` - PrivateRoute
- `/rooms/create` - PrivateRoute
- `/rooms/join` - PrivateRoute
- `/rooms/:roomId` - PrivateRoute

**Tournaments:**
- `/tournaments` - PrivateRoute
- `/tournaments/create` - PrivateRoute
- `/tournaments/:tournamentId` - PrivateRoute
- `/tournaments/:tournamentId/bracket` - PrivateRoute

### Team Member 4 - Bot & Replay (4 routes)
**Bot:**
- `/bot` - PrivateRoute
- `/bot/game/:gameId` - PrivateRoute

**Replay:**
- `/replays` - PrivateRoute
- `/replays/:gameId` - PrivateRoute

---

## 🧪 Testing Routes

### Test hiện tại (với placeholder pages):
```bash
npm run dev

# Sau đó truy cập các routes:
http://localhost:5173/          # Home page
http://localhost:5173/login     # Login placeholder (public)
http://localhost:5173/ranked    # Ranked placeholder (redirect to /login nếu chưa auth)
http://localhost:5173/demo      # Component demo
```

### Mock authentication để test PrivateRoute:
Mở browser console và chạy:
```javascript
// Mock login
localStorage.setItem('token', 'fake-token')
localStorage.setItem('user', JSON.stringify({id: 1, username: 'test'}))

// Reload page
location.reload()

// Giờ có thể access private routes
```

---

## 🚀 Next Steps

Sau khi tất cả Common Components được merge vào develop:

1. **Mỗi team member** tạo branch riêng
2. **Tạo pages được giao** trong thư mục tương ứng
3. **Uncomment import và route** trong `routes/index.jsx`
4. **Test pages** với routes
5. **Tạo PR** merge vào develop

---

## ⚠️ Lưu ý

- **KHÔNG XÓA** PlaceholderPage component cho đến khi tất cả pages đã được implement
- **KHÔNG THAY ĐỔI** cấu trúc routes nếu không thảo luận với team
- **SỬ DỤNG** PrivateRoute/PublicRoute đúng cách theo design
- **TEST KỸ** trước khi tạo PR

---

## ✅ Checklist Giai đoạn 0 - Routes Setup

- [x] Tạo `PrivateRoute.jsx` với auth protection
- [x] Tạo `PublicRoute.jsx` để redirect khi đã login
- [x] Setup tất cả 23 routes trong `index.jsx`
- [x] Tạo PlaceholderPage component tạm thời
- [x] Test routes không có lỗi compile
- [x] Document cách sử dụng cho team

**Routes setup hoàn tất! Team có thể bắt đầu implement pages.**
