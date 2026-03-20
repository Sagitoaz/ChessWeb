# ChessWeb - Tổng Quan Dự Án Frontend

## 📋 Thông Tin Chung
- **Nhóm:** 4 thành viên
- **Thời gian:** 2 tuần (Frontend only)
- **Tech Stack:** React + Node.js
- **Mục tiêu:** Hoàn thiện giao diện người dùng cho hệ thống chơi cờ vua trực tuyến

---

## 🎯 Các Module Chính

Dựa trên phân tích UML, dự án được chia thành **5 module lớn**:

### 1. **Auth & Profile Module** 👤
**Chức năng:**
- Đăng ký, đăng nhập, quên mật khẩu, đăng xuất
- Quản lý hồ sơ cá nhân (xem, chỉnh sửa)
- Upload avatar lên Cloud Storage
- Xem thống kê cá nhân, rating, leaderboard
- Quản lý session/token

**Trang cần thiết:**
- `/register` - Trang đăng ký
- `/login` - Trang đăng nhập
- `/forgot-password` - Quên mật khẩu
- `/profile` - Xem hồ sơ cá nhân
- `/profile/edit` - Chỉnh sửa hồ sơ
- `/leaderboard` - Bảng xếp hạng

### 2. **Ranked Match Module** 🏆
**Chức năng:**
- Tham gia hàng đợi tìm đối thủ (±100 Elo)
- Chơi trận đấu ranked có đếm thời gian (10 phút/người)
- Xử lý AFK (không hoạt động >2 phút → thua)
- Xử lý disconnect (mất kết nối >30s → thua)
- Cập nhật Elo theo công thức: ΔR = K×(S-E), K=32
- Xem lịch sử rating, thống kê ranked

**Trang cần thiết:**
- `/ranked` - Lobby tìm trận ranked
- `/ranked/game/:matchId` - Màn hình chơi ranked
- `/ranked/history` - Lịch sử trận đấu ranked
- `/ranked/stats` - Thống kê ranked cá nhân

### 3. **Friend Room & Tournament Module** 👥
**Chức năng:**
- **Friend Room:**
  - Tạo phòng chơi với bạn bè
  - Mời qua code/link
  - Tham gia phòng
  - Chơi nhiều ván (không ảnh hưởng ranking)
- **Tournament:**
  - Tạo và quản lý giải đấu
  - Đăng ký tham gia giải đấu
  - Tự động tạo bảng đấu (Single/Double Elimination, Round Robin, Swiss)
  - Theo dõi tiến trình giải đấu
  - Xem bảng xếp hạng

**Trang cần thiết:**
- `/rooms` - Danh sách phòng
- `/rooms/create` - Tạo phòng
- `/rooms/join` - Tham gia phòng
- `/rooms/:roomId` - Màn hình phòng chơi
- `/tournaments` - Danh sách giải đấu
- `/tournaments/create` - Tạo giải đấu
- `/tournaments/:tournamentId` - Chi tiết giải đấu
- `/tournaments/:tournamentId/bracket` - Bảng đấu

### 4. **Bot & Replay Module** 🤖
**Chức năng:**
- **Play vs Bot:**
  - Chọn độ khó bot (Easy, Medium, Hard, Expert)
  - Chơi với Stockfish engine
  - Pause/Resume game
  - Lưu lịch sử
- **Replay:**
  - Xem lại ván đấu đã chơi
  - Step forward/backward
  - Jump to specific move
  - Hiển thị notation và phân tích

**Trang cần thiết:**
- `/bot` - Chọn độ khó và bắt đầu
- `/bot/game/:gameId` - Màn hình chơi với bot
- `/replays` - Danh sách replay
- `/replays/:gameId` - Xem replay

### 5. **Core Game Module** ♟️
**Chức năng chung cho tất cả mode:**
- Bàn cờ tương tác (drag & drop)
- Đồng hồ đếm ngược
- Danh sách nước đi (move history)
- Chat trong game
- Đầu hàng, xin hòa, rematch
- Hiển thị trạng thái game (check, checkmate, stalemate)

---

## 📁 Kiến Trúc Thư Mục React

```
ChessWeb/
├── frontend/
│   ├── public/
│   │   ├── index.html
│   │   ├── favicon.ico
│   │   └── assets/
│   │       ├── pieces/          # Hình quân cờ
│   │       └── sounds/          # Âm thanh game
│   │
│   ├── src/
│   │   ├── App.jsx              # Component gốc
│   │   ├── main.jsx             # Entry point
│   │   │
│   │   ├── assets/              # Static files
│   │   │   ├── images/
│   │   │   └── styles/
│   │   │
│   │   ├── components/          # Shared components
│   │   │   ├── common/          # ✅ TẠO CHUNG TRƯỚC
│   │   │   │   ├── Button.jsx
│   │   │   │   ├── Input.jsx
│   │   │   │   ├── Modal.jsx
│   │   │   │   ├── Card.jsx
│   │   │   │   ├── Loader.jsx
│   │   │   │   ├── Avatar.jsx
│   │   │   │   └── Notification.jsx
│   │   │   │
│   │   │   ├── layout/          # ✅ TẠO CHUNG TRƯỚC
│   │   │   │   ├── Header.jsx
│   │   │   │   ├── Sidebar.jsx
│   │   │   │   ├── Footer.jsx
│   │   │   │   └── MainLayout.jsx
│   │   │   │
│   │   │   └── game/            # ✅ TẠO CHUNG TRƯỚC (quan trọng!)
│   │   │       ├── ChessBoard.jsx        # Bàn cờ
│   │   │       ├── ChessPiece.jsx        # Quân cờ
│   │   │       ├── Square.jsx            # Ô cờ
│   │   │       ├── MoveHistory.jsx       # Lịch sử nước đi
│   │   │       ├── GameClock.jsx         # Đồng hồ
│   │   │       ├── GameControls.jsx      # Nút điều khiển
│   │   │       ├── GameChat.jsx          # Chat trong game
│   │   │       └── GameStatus.jsx        # Trạng thái game
│   │   │
│   │   ├── pages/               # Các trang chính (chia đều)
│   │   │   ├── auth/            # Module 1
│   │   │   │   ├── LoginPage.jsx
│   │   │   │   ├── RegisterPage.jsx
│   │   │   │   └── ForgotPasswordPage.jsx
│   │   │   │
│   │   │   ├── profile/         # Module 1
│   │   │   │   ├── ProfilePage.jsx
│   │   │   │   ├── EditProfilePage.jsx
│   │   │   │   └── LeaderboardPage.jsx
│   │   │   │
│   │   │   ├── ranked/          # Module 2
│   │   │   │   ├── RankedLobbyPage.jsx
│   │   │   │   ├── RankedGamePage.jsx
│   │   │   │   ├── RankedHistoryPage.jsx
│   │   │   │   └── RankedStatsPage.jsx
│   │   │   │
│   │   │   ├── rooms/           # Module 3
│   │   │   │   ├── RoomListPage.jsx
│   │   │   │   ├── CreateRoomPage.jsx
│   │   │   │   ├── JoinRoomPage.jsx
│   │   │   │   └── RoomGamePage.jsx
│   │   │   │
│   │   │   ├── tournaments/     # Module 3
│   │   │   │   ├── TournamentListPage.jsx
│   │   │   │   ├── CreateTournamentPage.jsx
│   │   │   │   ├── TournamentDetailPage.jsx
│   │   │   │   └── TournamentBracketPage.jsx
│   │   │   │
│   │   │   ├── bot/             # Module 4
│   │   │   │   ├── BotSelectPage.jsx
│   │   │   │   └── BotGamePage.jsx
│   │   │   │
│   │   │   ├── replay/          # Module 4
│   │   │   │   ├── ReplayListPage.jsx
│   │   │   │   └── ReplayViewerPage.jsx
│   │   │   │
│   │   │   └── home/
│   │   │       ├── HomePage.jsx
│   │   │       └── DashboardPage.jsx
│   │   │
│   │   ├── services/            # ✅ TẠO CHUNG TRƯỚC
│   │   │   ├── api.js           # Axios instance
│   │   │   ├── authService.js
│   │   │   ├── gameService.js
│   │   │   ├── socketService.js # WebSocket
│   │   │   └── storageService.js
│   │   │
│   │   ├── hooks/               # ✅ TẠO CHUNG TRƯỚC
│   │   │   ├── useAuth.js
│   │   │   ├── useWebSocket.js
│   │   │   ├── useChessGame.js
│   │   │   ├── useTimer.js
│   │   │   └── useNotification.js
│   │   │
│   │   ├── store/               # State management (Redux/Zustand)
│   │   │   ├── index.js
│   │   │   ├── authSlice.js
│   │   │   ├── gameSlice.js
│   │   │   └── uiSlice.js
│   │   │
│   │   ├── utils/               # ✅ TẠO CHUNG TRƯỚC
│   │   │   ├── chessLogic.js    # Chess.js wrapper
│   │   │   ├── validation.js
│   │   │   ├── formatters.js
│   │   │   └── constants.js
│   │   │
│   │   ├── routes/              # ✅ TẠO CHUNG TRƯỚC
│   │   │   ├── index.jsx        # Route config
│   │   │   ├── PrivateRoute.jsx
│   │   │   └── PublicRoute.jsx
│   │   │
│   │   └── styles/              # Global styles
│   │       ├── global.css
│   │       ├── variables.css
│   │       └── theme.js
│   │
│   ├── package.json
│   ├── vite.config.js
│   ├── .env.example
│   └── README.md
│
└── backend/                     # Node.js (không làm trong 2 tuần này)
```

---

## 🛠️ Tech Stack & Libraries Cần Thiết

### **Core Libraries**
```json
{
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.20.0",      // Routing
    "chess.js": "^1.0.0",               // Chess logic ⭐
    "react-chessboard": "^4.3.0",       // Chess UI ⭐
    "socket.io-client": "^4.6.0",       // WebSocket ⭐
    "axios": "^1.6.0",                  // HTTP client ⭐
    "zustand": "^4.4.0",                // State management
    "react-query": "^3.39.0",           // Data fetching
    "react-hook-form": "^7.48.0",       // Form handling
    "zod": "^3.22.0",                   // Validation
    "date-fns": "^2.30.0",              // Date utilities
    "lucide-react": "^0.292.0",         // Icons
    "clsx": "^2.0.0",                   // CSS utilities
    "react-hot-toast": "^2.4.1",        // Notifications
    "framer-motion": "^10.16.0"         // Animations (optional)
  },
  "devDependencies": {
    "vite": "^5.0.0",
    "tailwindcss": "^3.3.0",            // CSS framework
    "eslint": "^8.54.0",
    "prettier": "^3.1.0"
  }
}
```

---

## 🔗 WebSocket Events (Cần phối hợp với Backend)

### **Ranked Match Events**
```javascript
// Client → Server
socket.emit('ranked:joinQueue')
socket.emit('ranked:cancelQueue')
socket.emit('game:move', { from, to })
socket.emit('game:resign')
socket.emit('game:offerDraw')

// Server → Client
socket.on('ranked:matchFound', (matchData))
socket.on('game:moveUpdate', (move))
socket.on('game:timeUpdate', (timeData))
socket.on('game:end', (result))
```

### **Friend Room Events**
```javascript
// Client → Server
socket.emit('room:create', settings)
socket.emit('room:join', roomCode)
socket.emit('room:leave')
socket.emit('room:startGame')

// Server → Client
socket.on('room:playerJoined', (player))
socket.on('room:playerLeft', (playerId))
socket.on('room:gameStarted')
```

### **Tournament Events**
```javascript
// Client → Server
socket.emit('tournament:register', tournamentId)
socket.emit('tournament:withdraw')

// Server → Client
socket.on('tournament:playerRegistered', (player))
socket.on('tournament:started')
socket.on('tournament:roundUpdate', (roundData))
socket.on('tournament:matchReady', (matchData))
```

---

## 📊 Phân Chia Công Việc Tổng Thể

| Module | Số trang | Phụ trách | Độ ưu tiên |
|--------|----------|-----------|------------|
| **Chung** (Common components, services, hooks) | - | Cả nhóm | 🔥 Làm đầu tiên (ngày 1-2) |
| **Auth & Profile** | 6 trang | Thành viên 1 | ⭐⭐⭐ |
| **Ranked Match** | 4 trang | Thành viên 2 | ⭐⭐⭐ |
| **Friend Room & Tournament** | 8 trang | Thành viên 3 | ⭐⭐ |
| **Bot & Replay** | 4 trang | Thành viên 4 | ⭐⭐ |
| **Home & Dashboard** | 2 trang | Chia đều sau khi xong phần riêng | ⭐ |

**Tổng cộng: ~24 trang → Mỗi người ~6 trang**

---

## ⏱️ Timeline 2 Tuần

### **Tuần 1: Setup + Core + Một nửa tính năng**
- **Ngày 1-2:** Setup project + Tạo common components + services chung
- **Ngày 3-4:** Mỗi người hoàn thành 50% pages của mình
- **Ngày 5-7:** Hoàn thiện 100% pages + Test cơ bản

### **Tuần 2: Integration + Testing + Polish**
- **Ngày 8-10:** Tích hợp WebSocket, kết nối các module
- **Ngày 11-12:** Bug fixing, responsive design
- **Ngày 13-14:** UI polish, testing tổng thể, chuẩn bị demo

---

## 🎨 UI/UX Guidelines

### **Màu sắc chủ đạo** (Gợi ý)
```css
--primary: #3b82f6;      /* Blue */
--secondary: #10b981;    /* Green */
--danger: #ef4444;       /* Red */
--warning: #f59e0b;      /* Orange */
--dark: #1f2937;         /* Dark gray */
--light: #f3f4f6;        /* Light gray */
```

### **Responsive Breakpoints**
```css
mobile: 0-640px
tablet: 641-1024px
desktop: 1025px+
```

### **Các trang quan trọng phải responsive**
- Login/Register
- Home/Dashboard
- Profile
- Game screens (nên chặn mobile cho trải nghiệm tốt hơn)

---

## 🚀 Commands

### **Setup Project**
```bash
npm create vite@latest frontend -- --template react
cd frontend
npm install
```

### **Install Dependencies**
```bash
npm install react-router-dom chess.js react-chessboard socket.io-client axios zustand react-query react-hook-form zod date-fns lucide-react clsx react-hot-toast

npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

### **Development**
```bash
npm run dev          # Start dev server
npm run build        # Build for production
npm run preview      # Preview production build
```

---

## 📝 Git Workflow

### **Branch Strategy**
```
main                 # Production code
├── develop          # Development branch
    ├── feature/auth          # Thành viên 1
    ├── feature/ranked        # Thành viên 2
    ├── feature/rooms         # Thành viên 3
    └── feature/bot-replay    # Thành viên 4
```

### **Commit Convention**
```
feat: Add login page
fix: Fix chess board rendering
style: Update button styles
refactor: Restructure game logic
docs: Update README
```

### **Pull Request Rule**
- Review code từ ít nhất 1 thành viên khác
- Test trước khi merge vào `develop`
- Merge vào `main` khi hoàn thiện sprint

---

## ⚠️ Lưu Ý Quan Trọng

1. **Không code backend trong 2 tuần này** - Chỉ tập trung frontend
2. **Mock data** - Tạo file mock data để test UI trước khi có API thật
3. **Components chung phải làm trước** - Để mọi người sử dụng chung
4. **WebSocket logic** - Cần phối hợp để đảm bảo các event đồng nhất
5. **Chess.js là thư viện bắt buộc** - Không tự viết logic cờ vua
6. **Responsive** - Ít nhất login/home/profile phải responsive
7. **Code convention** - Tuân thủ ESLint + Prettier config
8. **Daily standup** - Họp nhanh 15 phút mỗi ngày để sync tiến độ

---

## 📚 Tài Liệu Tham Khảo

- [Chess.js Documentation](https://github.com/jhlywa/chess.js)
- [React Chessboard](https://www.npmjs.com/package/react-chessboard)
- [Socket.io Client](https://socket.io/docs/v4/client-api/)
- [React Router v6](https://reactrouter.com/en/main)
- [Zustand State Management](https://docs.pmnd.rs/zustand/getting-started/introduction)
- [Tailwind CSS](https://tailwindcss.com/docs)

---

**📅 Ngày bắt đầu:** [Điền ngày bắt đầu]  
**🎯 Mục tiêu:** Hoàn thành 100% Frontend trong 2 tuần  
**👥 Team size:** 4 người

_Chúc các bạn làm việc hiệu quả! 💪_
