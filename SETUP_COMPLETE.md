# ✅ BƯỚC 1 GIAI ĐOẠN 0 - SETUP HOÀN TẤT

> **Mục đích:** Chuẩn bị môi trường development hoàn chỉnh cho cả team  
> **Người thực hiện:** Member #1 (hoặc team lead)  
> **Thời gian:** ~30 phút  
> **Trạng thái:** ✅ **HOÀN THÀNH**

---

## 📋 Tổng Quan

Bước 1 của Giai đoạn 0 đã hoàn tất việc khởi tạo và cấu hình project React + Vite với tất cả:
- ✅ Cấu trúc thư mục hoàn chỉnh
- ✅ Dependencies cần thiết
- ✅ Configuration files (Vite, Tailwind, ESLint, Prettier)
- ✅ Template utilities (API, Socket, Chess logic, Custom hooks)
- ✅ Code structure với path aliases
- ✅ Mock data cho development
- ✅ Documentation đầy đủ

---

## 🎯 Những Gì Đã Được Setup

### 1. **Cấu Trúc Thư Mục** (`frontend/`)

```
frontend/
├── 📂 public/              # Static assets
│   └── chess-icon.svg      # App icon
│
├── 📂 src/
│   ├── 📂 components/      # UI Components
│   │   ├── common/         # Button, Input, Card, Modal, Loader, Avatar, Badge, Tabs
│   │   ├── layout/         # Header, Sidebar, Footer, MainLayout
│   │   └── game/           # ChessBoard, GameClock, MoveHistory, GameControls, GameChat, GameStatus
│   │
│   ├── 📂 pages/           # Page Components
│   │   ├── auth/           # Login, Register, ForgotPassword
│   │   ├── profile/        # Profile, EditProfile
│   │   ├── ranked/         # RankedQueue, RankedGame, Leaderboard, RankedHistory
│   │   ├── rooms/          # CreateRoom, JoinRoom, RoomLobby, RoomGame
│   │   ├── tournaments/    # TournamentList, CreateTournament, TournamentDetail, TournamentBracket
│   │   ├── bot/            # BotSelection, BotGame
│   │   ├── replay/         # ReplayList, ReplayViewer
│   │   └── home/           # HomePage, Dashboard
│   │
│   ├── 📂 services/        # External Services
│   │   ├── api.js          # Axios instance với mock API support
│   │   └── socketService.js # Socket.io manager singleton
│   │
│   ├── 📂 hooks/           # Custom React Hooks
│   │   └── index.js        # useWebSocket, useChessGame, useTimer, useLocalStorage, etc.
│   │
│   ├── 📂 utils/           # Utilities
│   │   ├── constants.js    # API_ENDPOINTS, SOCKET_EVENTS, GAME_MODES, VALIDATION_RULES
│   │   └── chessLogic.js   # ChessGame class wrapper cho chess.js
│   │
│   ├── 📂 store/           # State Management (Zustand)
│   │   └── index.js        # useAuthStore, useGameStore, useUIStore
│   │
│   ├── 📂 routes/          # React Router
│   │   └── index.jsx       # Route config với PrivateRoute, PublicRoute
│   │
│   ├── 📂 styles/          # Global Styles
│   │   └── global.css      # Tailwind + custom utilities
│   │
│   ├── 📂 mocks/           # Mock Data
│   │   └── users.json      # Sample data cho development
│   │
│   ├── App.jsx             # Root component
│   └── main.jsx            # Entry point
│
├── 📄 package.json         # Dependencies
├── 📄 vite.config.js       # Vite config với path aliases
├── 📄 tailwind.config.js   # Tailwind custom theme
├── 📄 .eslintrc.cjs        # Linting rules
├── 📄 .prettierrc          # Code formatting
├── 📄 .gitignore           # Git ignore patterns
├── 📄 .env.example         # Environment variables template
└── 📄 README.md            # 🔥 Hướng dẫn cho team
```

---

### 2. **Dependencies Đã Cài Đặt**

#### Core:
- ✅ `react` ^18.2.0 - UI library
- ✅ `react-dom` ^18.2.0 - React DOM renderer
- ✅ `react-router-dom` ^6.22.0 - Routing

#### Chess:
- ✅ `chess.js` ^1.0.0-beta.6 - Chess logic engine
- ✅ `react-chessboard` ^4.3.2 - Chess UI component

#### Styling:
- ✅ `tailwindcss` ^3.4.1 - Utility-first CSS
- ✅ `lucide-react` ^0.330.0 - Icons
- ✅ `framer-motion` ^11.0.3 - Animations

#### State & Data:
- ✅ `zustand` ^4.5.0 - State management
- ✅ `@tanstack/react-query` ^5.20.2 - Data fetching
- ✅ `axios` ^1.6.7 - HTTP client
- ✅ `socket.io-client` ^4.6.1 - WebSocket client

#### Forms:
- ✅ `react-hook-form` ^7.50.1 - Form management
- ✅ `zod` ^3.22.4 - Schema validation

#### UI Utils:
- ✅ `react-hot-toast` ^2.4.1 - Notifications
- ✅ `recharts` ^2.12.0 - Charts

#### Dev Tools:
- ✅ `vite` ^5.1.0 - Build tool
- ✅ `eslint` ^8.56.0 - Linting
- ✅ `prettier` ^3.2.5 - Code formatting

**Tổng: 28 packages**

---

### 3. **Configuration Files**

#### **vite.config.js** - Path Aliases & Proxy
```javascript
// 8 path aliases để import gọn:
import Button from '@/components/common/Button'  // thay vì '../../../components/common/Button'
import { api } from '@/services/api'
import { useChessGame } from '@/hooks'

// Aliases:
@ → src/
@components → src/components/
@pages → src/pages/
@services → src/services/
@hooks → src/hooks/
@utils → src/utils/
@store → src/store/
@assets → src/assets/
```

#### **tailwind.config.js** - Custom Theme
```javascript
// Custom colors:
primary: '#3b82f6'   // Blue
secondary: '#8b5cf6'  // Purple
danger: '#ef4444'     // Red
success: '#10b981'    // Green
warning: '#f59e0b'    // Orange

// Font: Inter (đẹp, hiện đại)
```

#### **.env.example** - Environment Variables
```bash
VITE_API_URL=http://localhost:3000/api
VITE_SOCKET_URL=http://localhost:3000
VITE_USE_MOCK=true           # Bật mock API (chưa có backend)
VITE_APP_NAME=ChessWeb
VITE_APP_VERSION=1.0.0
```

---

### 4. **Template Utilities Đã Tạo**

#### **services/api.js** - HTTP Client
```javascript
// Features:
✅ Axios instance với base URL
✅ Auto attach JWT token vào headers
✅ Auto refresh token khi 401
✅ Mock API mode (VITE_USE_MOCK=true)
✅ Interceptors cho error handling

// Usage:
import { api, authAPI, profileAPI, rankedAPI } from '@/services/api'
const user = await authAPI.login(email, password)
```

#### **services/socketService.js** - WebSocket Manager
```javascript
// Features:
✅ Singleton pattern (1 connection duy nhất)
✅ Auto reconnect
✅ Event listener management
✅ Type-safe event names
✅ Dev mode logging

// Usage:
import { socketService } from '@/services/socketService'
socketService.connect(token)
socketService.onRankedMatchFound((data) => { ... })
```

#### **utils/chessLogic.js** - Chess Wrapper
```javascript
// ChessGame class:
✅ Wrapper cho chess.js
✅ Material advantage calculator
✅ Opening detector
✅ FEN parser
✅ UCI/SAN converter
✅ Time formatter

// Usage:
import { ChessGame } from '@/utils/chessLogic'
const game = new ChessGame()
game.move({ from: 'e2', to: 'e4' })
```

#### **utils/constants.js** - Constants
```javascript
// Tất cả constants ở đây:
✅ API_ENDPOINTS (30+ endpoints)
✅ SOCKET_EVENTS (25+ events)
✅ GAME_MODES, BOT_DIFFICULTIES
✅ TOURNAMENT_FORMATS, TIME_CONTROLS
✅ VALIDATION_RULES
```

#### **hooks/index.js** - Custom Hooks
```javascript
// 7 hooks ready to use:
✅ useWebSocket - Socket connection
✅ useChessGame - Chess state management
✅ useTimer - Countdown timer
✅ useLocalStorage - Persistent state
✅ useDebounce - Debounce values
✅ useWindowSize - Responsive
✅ useClickOutside - Close on outside click
```

#### **store/index.js** - Zustand Stores
```javascript
// 3 stores:
✅ useAuthStore - user, token, login, logout
✅ useGameStore - currentGame, isPlaying
✅ useUIStore - sidebarOpen, theme

// Usage:
const { user, login } = useAuthStore()
const { currentGame } = useGameStore()
```

---

### 5. **Code Structure**

#### **App.jsx** - Root Component
```jsx
✅ React Query Provider (data fetching)
✅ React Router (routing)
✅ Toast notifications
✅ Theme support
```

#### **routes/index.jsx** - Routing
```jsx
✅ Lazy loading pages
✅ PrivateRoute (require auth)
✅ PublicRoute (redirect if logged in)
✅ 404 handler
```

#### **styles/global.css** - Global Styles
```css
✅ Tailwind base
✅ Custom button variants (.btn-primary, .btn-secondary, etc.)
✅ Card components (.card)
✅ Input styles (.input)
✅ Badge variants (.badge-success, .badge-danger, etc.)
✅ Chess board custom classes
✅ Scrollbar styling
```

---

### 6. **Mock Data**

#### **mocks/users.json**
```json
✅ Sample user data
✅ Leaderboard data
✅ Ready cho development không cần backend
```

---

## 🚀 Cách Sử Dụng Cho Team

### **Bước 1: Clone & Setup** (Mỗi người làm)

```bash
# 1. Clone repository
git clone <repo-url>
cd ChessWeb

# 2. Vào frontend folder
cd frontend

# 3. Install dependencies (MẤT ~2-3 phút)
npm install

# 4. Copy environment file
cp .env.example .env.local

# 5. Start dev server
npm run dev

# ✅ Nếu thấy:
# ➜ Local:   http://localhost:5173/
# ➜ THÀNH CÔNG!
```

---

### **Bước 2: Verify Setup**

Mở browser tại `http://localhost:5173` và check:

✅ Không có error trong console  
✅ Page load được (có thể trống, OK!)  
✅ Hot reload hoạt động (edit file → auto refresh)

---

### **Bước 3: Hiểu Cấu Trúc**

Đọc file: **[frontend/README.md](../frontend/README.md)**

File này có:
- ✅ Giải thích chi tiết từng folder
- ✅ Ví dụ code cho từng loại component
- ✅ Git workflow
- ✅ Coding conventions
- ✅ Troubleshooting

---

## 👥 Phân Công Tiếp Theo (Bước 2 - Giai đoạn 0)

### **QUAN TRỌNG:** Làm Common Components Trước!

Trước khi vào code pages, **TẤT CẢ** phải code common components xong và merge vào `develop`:

#### **Member #1** - Basic UI Components (2 ngày)
```
components/common/
├── Button.jsx        # Primary, secondary, danger, outline, ghost variants
├── Input.jsx         # Text input với validation styling
├── Card.jsx          # Container component
└── Avatar.jsx        # User avatar với fallback
```

#### **Member #2** - Advanced UI Components (2 ngày)
```
components/common/
├── Modal.jsx         # Popup modal với backdrop
├── Loader.jsx        # Loading spinner
├── Badge.jsx         # Status badges
└── Tabs.jsx          # Tab navigation
```

#### **Member #3** - Layout Components (2 ngày)
```
components/layout/
├── Header.jsx        # Top navigation bar
├── Sidebar.jsx       # Side menu
├── Footer.jsx        # Footer
└── MainLayout.jsx    # Main layout wrapper
```

#### **Member #4** - Game Components (2 ngày)
```
components/game/
├── ChessBoard.jsx    # Chess board rendering
├── GameClock.jsx     # Game timer
├── MoveHistory.jsx   # Move list
├── GameControls.jsx  # Game buttons (resign, draw, etc.)
├── GameChat.jsx      # In-game chat
└── GameStatus.jsx    # Game status display
```

---

### **Quy Trình:**

1. **Ngày 1-2:** Mỗi người code components của mình
   ```bash
   git checkout develop
   git pull origin develop
   git checkout -b feature/common-ui-basic  # hoặc branch khác
   
   # Code components...
   # Test components...
   
   git add .
   git commit -m "feat: add basic UI components"
   git push origin feature/common-ui-basic
   
   # Tạo Pull Request trên GitHub
   ```

2. **Cuối ngày 2:** Code review lẫn nhau
   - Mỗi PR phải có ít nhất 1 người review
   - Check code quality, styling, responsive
   - Approve và merge

3. **Checkpoint:** Tất cả components merged vào `develop`
   ```bash
   git checkout develop
   git pull origin develop
   npm run dev
   
   # ✅ Verify: Tất cả components hoạt động
   # ✅ Không có conflict
   # ✅ ESLint pass
   ```

4. **Sau khi checkpoint pass:** Bắt đầu code pages (Giai đoạn 1)

---

## ⚠️ Lưu Ý Quan Trọng

### **PHẢI LÀM:**
- ✅ Test components trước khi push
- ✅ Follow coding style trong `frontend/README.md`
- ✅ Commit message clear: `feat: add Button component`
- ✅ Pull `develop` trước khi tạo branch mới
- ✅ Code review nghiêm túc

### **KHÔNG ĐƯỢC:**
- ❌ Code pages trước khi common components merge
- ❌ Commit trực tiếp vào `develop` hoặc `main`
- ❌ Push code chưa test
- ❌ Ignore ESLint warnings
- ❌ Hardcode values (dùng constants)

---

## 📖 Documentation References

| File | Mô tả |
|------|-------|
| [frontend/README.md](../frontend/README.md) | **ĐỌC ĐẦU TIÊN!** Hướng dẫn chi tiết cho team |
| [docs/PROJECT_OVERVIEW.md](../docs/PROJECT_OVERVIEW.md) | Tổng quan dự án, architecture |
| [docs/WORK_DISTRIBUTION.md](../docs/WORK_DISTRIBUTION.md) | Phân công chi tiết 4 người |
| [docs/SETUP_GUIDE.md](../docs/SETUP_GUIDE.md) | Hướng dẫn setup ban đầu |
| [docs/TEMPLATES_GUIDE.md](../docs/TEMPLATES_GUIDE.md) | Cách dùng template utilities |

---

## 🎯 Checklist Cho Mỗi Thành Viên

### Ngay bây giờ:
- [ ] Pull code mới nhất: `git pull origin develop`
- [ ] Vào folder frontend: `cd frontend`
- [ ] Install dependencies: `npm install`
- [ ] Copy env file: `cp .env.example .env.local`
- [ ] Start dev server: `npm run dev`
- [ ] Verify chạy OK tại `http://localhost:5173`
- [ ] Đọc `frontend/README.md` kỹ
- [ ] Hiểu rõ phần components mình phải code
- [ ] Tạo feature branch cho mình
- [ ] Bắt đầu code!

---

## 💡 Tips

### **Path Aliases:**
```javascript
// ❌ Không dùng:
import Button from '../../../components/common/Button'

// ✅ Dùng:
import Button from '@/components/common/Button'
```

### **Environment Variables:**
```javascript
// ❌ Không dùng:
const API_URL = 'http://localhost:3000/api'

// ✅ Dùng:
const API_URL = import.meta.env.VITE_API_URL
```

### **Mock API:**
```javascript
// Trong .env.local:
VITE_USE_MOCK=true  // Dùng mock data (không cần backend)
// Sau khi có backend:
VITE_USE_MOCK=false // Dùng real API
```

---

## 🆘 Troubleshooting

### **npm install bị lỗi?**
```bash
# Xóa node_modules và package-lock.json
rm -rf node_modules package-lock.json
npm install
```

### **Port 5173 đang được dùng?**
```bash
# Vite sẽ tự chọn port khác (5174, 5175,...)
# Hoặc kill process đang dùng port 5173
```

### **Hot reload không hoạt động?**
```bash
# Restart dev server
# Ctrl+C rồi npm run dev lại
```

### **Import path không work?**
```bash
# Check vite.config.js đã có aliases chưa
# Restart VS Code để TypeScript nhận aliases
```

---

## 🎉 Kết Luận

✅ **Setup hoàn tất!** Project đã sẵn sàng để toàn team bắt đầu code.

**Next Steps:**
1. Mỗi người clone và verify setup OK
2. Đọc documentation kỹ
3. Tạo feature branch
4. Code common components (2 ngày)
5. Code review và merge
6. **Checkpoint:** Verify tất cả components work
7. Bắt đầu code pages

**Let's build something great! 🚀**

---

**📅 Setup completed:** [Hôm nay]  
**👥 Ready for:** 4 team members  
**⏱️ Time to first code:** ~5 phút (sau khi npm install xong)
