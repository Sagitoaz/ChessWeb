# ChessWeb - Phân Công Chi Tiết Công Việc

## 🎯 Nguyên Tắc Phân Chia

✅ **Mọi người code đều nhau** - Mỗi người ~6 pages + components riêng  
✅ **Làm common components trước** - Để tất cả sử dụng chung  
✅ **Độc lập nhất có thể** - Ít conflict khi merge code  
✅ **Review lẫn nhau** - Đảm bảo chất lượng code

---

## 📦 GIAI ĐOẠN 0: SETUP CHUNG (Cả nhóm - Ngày 1-2)

> ⚠️ **QUAN TRỌNG:** Giai đoạn này PHẢI hoàn thành 100% và merge vào `develop` trước khi bất kỳ ai bắt đầu code pages của mình!

### 🔧 Bước 1: Setup Dự Án (1 người - 3-4 giờ)
**Người phụ trách:** Thành viên 1 (hoặc người có kinh nghiệm nhất)

**Tasks:**
- [ ] Init Vite React project từ templates
- [ ] Setup Tailwind CSS
- [ ] Cấu hình ESLint + Prettier
- [ ] Install tất cả dependencies từ package.json
- [ ] Setup folder structure theo đúng kiến trúc
- [ ] Copy các files từ `frontend-templates/` vào project
- [ ] Setup React Router với routes cơ bản
- [ ] Tạo MainLayout component cơ bản
- [ ] Push lên Git, tạo `develop` branch
- [ ] Hướng dẫn các thành viên khác clone và chạy

**Estimated time:** 3-4 giờ

**✅ Checkpoint:** Tất cả thành viên có thể chạy `npm run dev` thành công

---

### 🎨 Bước 2: Common Components (4 người song song - 3-4 giờ mỗi người)

> 🔥 **MỖI NGƯỜI TẠO BRANCH RIÊNG CHO PHẦN CỦA MÌNH**

**Branch naming:**
- Thành viên 1: `feature/common-ui-basic`
- Thành viên 2: `feature/common-ui-advanced`
- Thành viên 3: `feature/common-layout`
- Thành viên 4: `feature/common-game`

**Quy trình:**
1. Pull code mới nhất từ `develop`
2. Tạo branch của mình
3. Code components được giao
4. Test components (tạo page demo nếu cần)
5. Commit và push lên branch
6. Tạo Pull Request vào `develop`
7. Đợi review từ 1 thành viên khác
8. Fix nếu có yêu cầu
9. Merge vào `develop`

---

### 🎨 Common Components - Chi tiết

#### **Thành viên 1:** Basic UI Components (3-4 giờ)
```javascript
src/components/common/
├── Button.jsx          // Primary, Secondary, Outline, Danger variants
├── Input.jsx           // Text, Password, Email với validation UI
├── Card.jsx            // Container component
└── Avatar.jsx          // User avatar với fallback
```

**Yêu cầu:**
- Support dark mode
- Có loading state
- Có disabled state
- PropTypes hoặc TypeScript
- Tailwind CSS

#### **Thành viên 2:** Advanced UI Components (3-4 giờ)
```javascript
src/components/common/
├── Modal.jsx           // Reusable modal với backdrop
├── Loader.jsx          // Spinner + Skeleton loader
├── Notification.jsx    // Toast notifications
└── Dropdown.jsx        // Select dropdown
```

#### **Thành viên 3:** Layout Components (3-4 giờ)
```javascript
src/components/layout/
├── Header.jsx          // Navbar với auth state
├── Sidebar.jsx         // Navigation menu
├── Footer.jsx          // Footer với links
└── MainLayout.jsx      // Wrapper layout
```

#### **Thành viên 4:** Game Core Components (4-5 giờ) ⭐ Quan trọng!
```javascript
src/components/game/
├── ChessBoard.jsx      // Wrapper cho react-chessboard
├── MoveHistory.jsx     // Hiển thị lịch sử nước đi
├── GameClock.jsx       // Đồng hồ đếm ngược
├── GameControls.jsx    // Resign, Draw, Pause buttons
├── GameChat.jsx        // Chat box trong game
└── GameStatus.jsx      // Hiển thị check, checkmate, turn...
```

**Yêu cầu đặc biệt:**
- Integrate `chess.js` và `react-chessboard`
- Support drag & drop
- Highlight valid moves
- Sound effects khi di chuyển
- Responsive trên desktop

---

### 🔌 Bước 3: Services & Hooks (4 người song song - 2-3 giờ mỗi người)

> 💡 **CÓ THỂ LÀM SONG SONG VỚI COMPONENTS** (cùng branch)

**Mỗi người làm services & hooks trong cùng branch với components của mình**

---

### 🔌 Services & Hooks - Chi tiết

#### **Thành viên 1:** Auth Services (2-3 giờ)
```javascript
src/services/
├── api.js              // Axios instance với interceptors
└── authService.js      // login, register, logout, refreshToken

src/hooks/
└── useAuth.js          // Custom hook để quản lý auth state
```

#### **Thành viên 2:** Game Services (2-3 giờ)
```javascript
src/services/
├── gameService.js      // API calls cho game
└── socketService.js    // WebSocket connection manager

src/hooks/
├── useWebSocket.js     // Custom hook cho WebSocket
└── useChessGame.js     // Custom hook cho chess logic
```

#### **Thành viên 3:** Utility Services (2-3 giờ)
```javascript
src/services/
└── storageService.js   // LocalStorage wrapper

src/utils/
├── chessLogic.js       // Wrapper cho chess.js
├── validation.js       // Form validation helpers
├── formatters.js       // Date, number formatters
└── constants.js        // App constants
```

#### **Thành viên 4:** UI Hooks (2-3 giờ)
```javascript
src/hooks/
├── useTimer.js         // Countdown timer hook
├── useNotification.js  // Toast notification hook
└── useModal.js         // Modal control hook

src/storBước 4: Routes Setup (1 người - 1-2 giờ)
**Người phụ trách:** Thành viên 1
**Branch:** `feature/routes-setup` hoặc làm trong `feature/common-ui-basic`
├── authSlice.js
└── gameSlice.js
```

---

### 🗺️ Routes Setup (1 người - 1-2 giờ)
**Người phụ trách:** Thành viên 1

```javascript
src/routes/
├── index.jsx           // All route definitions
├── PrivateRoute.jsx    // Protected routes
└── PublicRoute.jsx     // Public routes
```

**Routes cần định nghĩa:**
```javascript
const routes = [
  // Public
  { path: '/login', element: <LoginPage /> },
  { path: '/register', element: <RegisterPage /> },
  
  // Private - Auth
  { path: '/profile', element: <ProfilePage /> },
  { path: '/profile/edit', element: <EditProfilePage /> },
  { path: '/leaderboard', element: <LeaderboardPage /> },
  
  // Private - Ranked
  { path: '/ranked', element: <RankedLobbyPage /> },
  { path: '/ranked/game/:matchId', element: <RankedGamePage /> },
  { path: '/ranked/history', element: <RankedHistoryPage /> },
  { path: '/ranked/stats', element: <RankedStatsPage /> },
  
  // Private - Rooms
  { path: '/rooms', element: <RoomListPage /> },
  { path: '/rooms/create', element: <CreateRoomPage /> },
  { path: '/rooms/join', element: <JoinRoomPage /> },
  { path: '/rooms/:roomId', element: <RoomGamePage /> },
  
  // Private - Tournaments
  { path: '/tournaments', element: <TournamentListPage /> },
  { path: '/tournaments/create', element: <CreateTournamentPage /> },
  { path: '/tournaments/:tournamentId', element: <TournamentDetailPage /> },
  { path: '/tournaments/:tournamentId/bracket', element: <TournamentBracketPage /> },
  
  // Private - Bot & Replay
  { path: '/bot', element: <BotSelectPage /> },
  { path: '/bot/game/:gameId', element: <BotGamePage /> },
  { path: '/replays', element: <ReplayListPage /> },
  { path: '/replays/:gameId', element: <ReplayViewerPage /> },
  
  // Home
  { path: '/', element: <HomePage /> },
  { path: '/dashboard', element: <DashboardPage /> },
]
```

---
# ✅ Bước 5: MERGE TẤT CẢ VÀO DEVELOP

**🚨 CHECKPOINT QUAN TRỌNG - PHẢI ĐẠT TRƯỚC KHI SANG GIAI ĐOẠN 1:**

```bash
# Sau khi tất cả PR được merge vào develop
git checkout develop
git pull origin develop
npm install
npm run dev
```

**Checklist bắt buộc:**
- [ ] Tất cả 4 PR common components đã được merge
- [ ] Tất cả services & hooks đã được merge
- [ ] Routes setup hoàn tất
- [ ] Không có conflict
- [ ] Code chạy không lỗi
- [ ] ESLint pass (npm run lint)
- [ ] Team họp nhanh review code chung

**📸 TEST COMPONENTS:**
Mỗi người test lại components/services của người khác:
```bash
git checkout develop
git pull
npm run dev
# Test từng component trong Storybook hoặc demo page
```

**⏱️ Timeline:** Kết thúc ngày 2, tối đa sáng ngày 3

> ⚠️ **KHÔNG AI ĐƯỢC BẮT ĐẦU CODE PAGES CHO ĐẾN KHI CHECKPOINT NÀY HOÀN THÀNH!**

---

## 🚀 GIAI ĐOẠN 1: PHÁT TRIỂN PAGES (Ngày 3-7)

> 💡 **Bây giờ mỗi người có đầy đủ components/services chung để sử dụng**
## 🚀 GIAI ĐOẠN 1: PHÁT TRIỂN PAGES (Ngày 3-7)

---

## 👤 THÀNH VIÊN 1: Auth & Profile Module (6 pages)

### **Branch:** `feature/auth-profile`

### 📋 Chi tiết công việc:

#### 1. **LoginPage** (`src/pages/auth/LoginPage.jsx`) - 3-4 giờ
**Chức năng:**
- Form đăng nhập với username/email + password
- Validation (sử dụng react-hook-form + zod)
- Remember me checkbox
- Link đến forgot password
- Link đến register
- Loading state khi submit
- Error handling

**API Mock:**
```javascript
// Tạm thời mock, sau này thay bằng API thật
const mockLogin = async (credentials) => {
  return {
    user: { id: 1, username: 'testuser', email: 'test@test.com' },
    token: 'fake-jwt-token',
    refreshToken: 'fake-refresh-token'
  }
}
```

**UI Components cần:**
- Input (email, password)
- Button (submit)
- Card (form container)
- Notification (toast)

---

#### 2. **RegisterPage** (`src/pages/auth/RegisterPage.jsx`) - 3-4 giờ
**Chức năng:**
- Form đăng ký với username, email, password, confirmPassword
- Real-time validation
- Check username/email availability (debounce)
- Password strength indicator
- Terms & Conditions checkbox
- Auto login sau khi register thành công

**Validation rules:**
```javascript
const registerSchema = z.object({
  username: z.string().min(3).max(20),
  email: z.string().email(),
  password: z.string().min(8).regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/),
  confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
})
```

---

#### 3. **ForgotPasswordPage** (`src/pages/auth/ForgotPasswordPage.jsx`) - 2-3 giờ
**Chức năng:**
- Form nhập email
- Gửi email reset password
- Thông báo thành công
- Countdown để resend email

---

#### 4. **ProfilePage** (`src/pages/profile/ProfilePage.jsx`) - 4-5 giờ
**Chức năng:**
- Hiển thị avatar, username, email, bio
- Hiển thị stats: Total games, Win rate, Streaks
- Hiển thị ratings: Ranked, Bot, Tournament
- Hiển thị rank badges
- Recent games section
- Button "Edit Profile"

**Layout:**
```
┌─────────────────────────────────────┐
│  Avatar  │  Username                │
│          │  @username                │
│          │  Bio text here...         │
├──────────┴───────────────────────────┤
│  Stats                               │
│  [Games] [Win Rate] [Streak]        │
├──────────────────────────────────────┤
│  Ratings                             │
│  Ranked: 1500  Bot: 1200  Tour: 1400│
├──────────────────────────────────────┤
│  Recent Games                        │
│  [Game 1] [Game 2] [Game 3]         │
└──────────────────────────────────────┘
```

---

#### 5. **EditProfilePage** (`src/pages/profile/EditProfilePage.jsx`) - 4-5 giờ
**Chức năng:**
- Form chỉnh sửa: displayName, bio, country, language
- Upload avatar với preview
- Crop image trước khi upload (sử dụng `react-image-crop`)
- Change password section (riêng biệt)
- Save changes button
- Cancel button

**Avatar Upload Flow:**
```javascript
1. User chọn file → Preview
2. User crop ảnh
3. Upload lên Cloudinary/AWS S3 (mock API)
4. Lưu URL vào database
5. Update UI
```

**Libraries cần thêm:**
```bash
npm install react-image-crop
```

---

#### 6. **LeaderboardPage** (`src/pages/profile/LeaderboardPage.jsx`) - 3-4 giờ
**Chức năng:**
- Bảng xếp hạng theo rating
- Filter theo mode: Ranked, Bot, Tournament
- Pagination
- Highlight user hiện tại
- Search user
- Top 3 có design đặc biệt (podium)

**Table columns:**
- Rank, Avatar, Username, Rating, Games, Win Rate

---

### ✅ Checklist cho Thành viên 1:
- [ ] Hoàn thành 6 pages
- [ ] Integrate với authService và useAuth hook
- [ ] Mock data cho testing
- [ ] Responsive mobile
- [ ] Form validation hoàn chỉnh
- [ ] Error handling
- [ ] Loading states
- [ ] Write basic tests (optional)
- [ ] Code review từ 1 thành viên khác

---

## 🏆 THÀNH VIÊN 2: Ranked Match Module (4 pages)

### **Branch:** `feature/ranked`

### 📋 Chi tiết công việc:

#### 1. **RankedLobbyPage** (`src/pages/ranked/RankedLobbyPage.jsx`) - 4-5 giờ
**Chức năng:**
- Button "Find Match" lớn ở giữa màn hình
- Hiển thị current rating và rank
- Matchmaking status (Searching, Found, Connecting)
- Timer: "Searching for... 00:15"
- Cancel search button
- Queue stats: "~50 players in queue"
- Rules section
- Recent ranked games

**Matchmaking Flow:**
```javascript
1. User click "Find Match"
   → socket.emit('ranked:joinQueue', { userId, rating })
2. Show "Searching..." với spinner
3. Server tìm đối thủ ±100 Elo
4. socket.on('ranked:matchFound', (matchData))
   → Redirect to /ranked/game/:matchId
```

**WebSocket integration:**
```javascript
const handleFindMatch = () => {
  socket.emit('ranked:joinQueue', {
    userId: user.id,
    rating: user.rating
  })
  
  socket.on('ranked:matchFound', (data) => {
    // data: { matchId, opponent, color }
    navigate(`/ranked/game/${data.matchId}`)
  })
}
```

---

#### 2. **RankedGamePage** (`src/pages/ranked/RankedGamePage.jsx`) - 6-8 giờ ⭐ **Phức tạp nhất!**
**Chức năng:**
- Chess board với real-time moves
- Game clocks cho 2 người (10 phút mỗi người)
- Opponent info (avatar, username, rating)
- Move history panel
- Game controls: Resign, Offer Draw
- Chat box
- Inactivity timer warning (>1.5 phút)
- Disconnect handling
- End game modal với kết quả + Elo change

**Layout:**
```
┌─────────────────────────────────────────┐
│ Opponent Info    Rating: 1520  [Clock] │
├─────────────────┬───────────────────────┤
│                 │  Move History         │
│   Chess Board   │  1. e4 e5             │
│                 │  2. Nf3 Nc6           │
│                 │  ...                  │
│                 ├───────────────────────┤
│                 │  Chat                 │
│                 │  [Messages]           │
├─────────────────┴───────────────────────┤
│ Your Info       Rating: 1500   [Clock]  │
│ [Resign] [Draw] [Message...]            │
└─────────────────────────────────────────┘
```

**WebSocket Events:**
```javascript
// Nhận nước đi từ đối thủ
socket.on('game:moveUpdate', (move) => {
  game.move(move)
  updateBoard()
})

// Gửi nước đi
const handleMove = (from, to) => {
  const move = game.move({ from, to })
  if (move) {
    socket.emit('game:move', { matchId, move })
  }
}

// Cập nhật thời gian
socket.on('game:timeUpdate', ({ whiteTime, blackTime }) => {
  updateClocks({ whiteTime, blackTime })
})

// Kết thúc game
socket.on('game:end', ({ result, reason, eloChange }) => {
  showEndGameModal({ result, reason, eloChange })
})

// Đối thủ disconnect
socket.on('game:opponentDisconnected', () => {
  showWarning('Opponent disconnected. Waiting...')
})

// Đối thủ AFK
socket.on('game:afkWarning', () => {
  showNotification('Opponent is inactive')
})
```

**Inactivity Timer:**
```javascript
const useInactivityTimer = (matchId, isMyTurn) => {
  const [inactivityTime, setInactivityTime] = useState(0)
  
  useEffect(() => {
    if (!isMyTurn) return
    
    const interval = setInterval(() => {
      setInactivityTime(prev => prev + 1)
      
      // Warning at 90s (còn 30s)
      if (prev === 90) {
        showWarning('Make a move or you will lose!')
      }
      
      // Auto resign at 120s
      if (prev >= 120) {
        socket.emit('game:afkTimeout', { matchId })
      }
    }, 1000)
    
    return () => clearInterval(interval)
  }, [isMyTurn])
  
  // Reset khi đi nước
  const resetTimer = () => setInactivityTime(0)
  
  return { inactivityTime, resetTimer }
}
```

**End Game Modal:**
```javascript
<EndGameModal
  isOpen={gameEnded}
  result="win" // win, lose, draw
  reason="checkmate" // checkmate, timeout, resignation, disconnect, afk
  eloChange={+24}
  opponent={opponentData}
  onClose={() => navigate('/ranked')}
  onRematch={() => handleFindMatch()} // Tìm trận mới
/>
```

---

#### 3. **RankedHistoryPage** (`src/pages/ranked/RankedHistoryPage.jsx`) - 3-4 giờ
**Chức năng:**
- Danh sách các trận đấu ranked đã chơi
- Filter: All, Win, Lose, Draw
- Sort: Recent, Rating change
- Mỗi game card hiển thị:
  - Opponent avatar, username, rating
  - Result (Win/Lose/Draw)
  - Elo change (+24, -16)
  - Date & time
  - Duration
  - Button "View Replay"
- Pagination
- Empty state nếu chưa có game

**Game Card Component:**
```javascript
<GameCard
  opponent={{ username: 'Player123', rating: 1520 }}
  result="win"
  eloChange={+24}
  date="2026-01-27"
  duration="15:30"
  onViewReplay={() => navigate(`/replays/${gameId}`)}
/>
```

---

#### 4. **RankedStatsPage** (`src/pages/ranked/RankedStatsPage.jsx`) - 4-5 giờ
**Chức năng:**
- Rating chart (line chart) theo thời gian
- Win/Loss/Draw pie chart
- Stats cards:
  - Current Rating
  - Peak Rating
  - Total Games
  - Win Rate
  - Current Streak
  - Longest Streak
- Opening statistics (top 5 openings used)
- Time distribution (average game duration)

**Chart Libraries:**
```bash
npm install recharts
# hoặc
npm install chart.js react-chartjs-2
```

**Example Chart:**
```javascript
import { LineChart, Line, XAxis, YAxis, Tooltip } from 'recharts'

<LineChart data={ratingHistory}>
  <XAxis dataKey="date" />
  <YAxis domain={[1000, 2000]} />
  <Tooltip />
  <Line type="monotone" dataKey="rating" stroke="#3b82f6" />
</LineChart>
```

---

### ✅ Checklist cho Thành viên 2:
- [ ] Hoàn thành 4 pages
- [ ] Integrate WebSocket cho real-time game
- [ ] Integrate chess.js và react-chessboard
- [ ] Xử lý inactivity timer
- [ ] Xử lý disconnect/reconnect
- [ ] Mock matchmaking flow
- [ ] Sound effects (move, capture, check)
- [ ] Responsive trên desktop (mobile optional)
- [ ] Error handling
- [ ] Code review

---

## 👥 THÀNH VIÊN 3: Friend Room & Tournament Module (8 pages)

### **Branch:** `feature/rooms-tournaments`

### 📋 Chi tiết công việc:

#### **FRIEND ROOMS (4 pages)**

#### 1. **RoomListPage** (`src/pages/rooms/RoomListPage.jsx`) - 3-4 giờ
**Chức năng:**
- Button "Create Room"
- Button "Join Room"
- Danh sách public rooms (nếu có)
- Recent rooms joined
- Room code input để join nhanh

**Layout:**
```
┌────────────────────────────────────┐
│ Friend Rooms                       │
│ [Create Room] [Join Room]         │
├────────────────────────────────────┤
│ Join by Code: [______] [Join]    │
├────────────────────────────────────┤
│ Recent Rooms                       │
│ • Room ABC123 - Host: Player1     │
│ • Room XYZ789 - Host: Player2     │
└────────────────────────────────────┘
```

---

#### 2. **CreateRoomPage** (`src/pages/rooms/CreateRoomPage.jsx`) - 3-4 giờ
**Chức năng:**
- Form tạo phòng:
  - Room name (optional)
  - Time control (5, 10, 15, 30 min)
  - Increment per move (0, 5, 10 sec)
  - Private/Public toggle
- Generate room code
- Share options: Copy link, Copy code
- Waiting for opponent screen

**Flow:**
```javascript
1. User điền form → Submit
2. socket.emit('room:create', settings)
3. Server trả về roomCode
4. Hiển thị code + link
5. socket.on('room:playerJoined', (player))
   → Show "Player joined!"
6. Host click "Start Game"
   → Redirect to /rooms/:roomId
```

---

#### 3. **JoinRoomPage** (`src/pages/rooms/JoinRoomPage.jsx`) - 2-3 giờ
**Chức năng:**
- Input room code
- Validate code
- Show room info: Host name, Settings
- Join button
- Error handling: Invalid code, Room full

**Flow:**
```javascript
1. User nhập code → Submit
2. socket.emit('room:validateCode', code)
3. socket.on('room:valid', (roomInfo))
   → Hiển thị room info
4. User click "Join"
   → socket.emit('room:join', code)
5. Redirect to /rooms/:roomId
```

---

#### 4. **RoomGamePage** (`src/pages/rooms/RoomGamePage.jsx`) - 5-6 giờ
**Chức năng:**
- Giống RankedGamePage nhưng đơn giản hơn
- Không có Elo
- Không có strict inactivity timer
- Có thể rematch dễ dàng
- Host có thể kick player (optional)
- Save game to history

**Difference from RankedGamePage:**
- Không cần xử lý queue
- Không cần tính Elo
- Có thể pause game
- Chat thân thiện hơn
- Có thể chơi nhiều ván liên tiếp

**Rematch Flow:**
```javascript
// Host offer rematch
socket.emit('room:offerRematch')

// Guest accept
socket.on('room:rematchOffered', () => {
  showModal('Host wants to play again. Accept?')
})

socket.emit('room:acceptRematch')

// Reset board
socket.on('room:rematchStarted', () => {
  resetGame()
})
```

---

#### **TOURNAMENTS (4 pages)**

#### 5. **TournamentListPage** (`src/pages/tournaments/TournamentListPage.jsx`) - 3-4 giờ
**Chức năng:**
- Button "Create Tournament"
- Tabs: Upcoming, Ongoing, Completed
- Tournament cards:
  - Tournament name
  - Organizer
  - Start date/time
  - Participants count
  - Status badge
  - Format badge (Single Elim, Round Robin, etc.)
  - Button "Join" hoặc "View"
- Search & filter

---

#### 6. **CreateTournamentPage** (`src/pages/tournaments/CreateTournamentPage.jsx`) - 4-5 giờ
**Chức năng:**
- Multi-step form:
  - **Step 1:** Basic info (name, description)
  - **Step 2:** Settings (format, max participants, time control)
  - **Step 3:** Schedule (start date/time, registration deadline)
  - **Step 4:** Review & Create
- Format options:
  - Single Elimination
  - Double Elimination
  - Round Robin
  - Swiss
- Preview bracket based on format
- Publish or Save as Draft

**Validation:**
```javascript
- Max participants phải là 2^n (4, 8, 16, 32...) cho Elimination
- Start time phải trong tương lai
- Registration deadline < Start time
```

---

#### 7. **TournamentDetailPage** (`src/pages/tournaments/TournamentDetailPage.jsx`) - 4-5 giờ
**Chức năng:**
- Tournament info header
- Tabs:
  - **Overview:** Description, Rules, Schedule
  - **Participants:** List of registered players
  - **Matches:** Current round matches
  - **Standings:** Current standings/bracket
- Registration button (if open)
- Withdraw button (if registered)
- Organizer controls (if you are organizer):
  - Start Tournament
  - Cancel Tournament
  - Advance Round

**Participant List:**
```javascript
<ParticipantList
  participants={participants}
  showStatus={true} // Active, Eliminated, Withdrawn
  showSeed={true}
  onViewProfile={(userId) => {}}
/>
```

---

#### 8. **TournamentBracketPage** (`src/pages/tournaments/TournamentBracketPage.jsx`) - 5-6 giờ ⭐ **Phức tạp!**
**Chức năng:**
- Hiển thị bracket dựa theo format
- Interactive: Click vào match để xem details
- Highlight current match
- Show round names (Round 1, Quarter Finals, Semi Finals, Finals)
- Auto-scroll to current round
- Update real-time khi có kết quả

**Bracket Library:**
```bash
npm install react-tournament-bracket
# hoặc tự viết component
```

**Single Elimination Example:**
```
Round 1       Quarter      Semi        Final
Player1 ──┐
          ├── P1 ──┐
Player2 ──┘        │
                   ├── P1 ──┐
Player3 ──┐        │        │
          ├── P3 ──┘        │
Player4 ──┘                 ├── Winner
                            │
Player5 ──┐                 │
          ├── P5 ──┐        │
Player6 ──┘        │        │
                   ├── P7 ──┘
Player7 ──┐        │
          ├── P7 ──┘
Player8 ──┘
```

**Match Card Component:**
```javascript
<MatchCard
  player1={{ username: 'Player1', score: 1 }}
  player2={{ username: 'Player2', score: 0 }}
  status="completed"
  onViewGame={() => navigate(`/replays/${gameId}`)}
/>
```

---

### ✅ Checklist cho Thành viên 3:
- [ ] Hoàn thành 8 pages
- [ ] WebSocket cho rooms và tournaments
- [ ] Validation cho tournament settings
- [ ] Bracket visualization
- [ ] Mock tournament data
- [ ] Room code generation
- [ ] Error handling
- [ ] Code review

---

## 🤖 THÀNH VIÊN 4: Bot & Replay Module (4 pages)

### **Branch:** `feature/bot-replay`

### 📋 Chi tiết công việc:

#### **BOT MODULE (2 pages)**

#### 1. **BotSelectPage** (`src/pages/bot/BotSelectPage.jsx`) - 3-4 giờ
**Chức năng:**
- Chọn độ khó bot:
  - **Easy** (500-800 Elo) - Beginner
  - **Medium** (800-1200 Elo) - Intermediate
  - **Hard** (1200-1800 Elo) - Advanced
  - **Expert** (1800-2500 Elo) - Master
- Mỗi level hiển thị:
  - Icon/Avatar
  - Description
  - Estimated Elo range
  - Win rate statistics
- Button "Start Game"
- Bot statistics: Total games, Win rate

**Layout:**
```
┌────────────────────────────────────┐
│ Play vs Computer                   │
├────────────────────────────────────┤
│ ┌──────────┐  ┌──────────┐        │
│ │  🟢 Easy │  │ 🟡 Medium│        │
│ │ 500-800  │  │ 800-1200 │        │
│ └──────────┘  └──────────┘        │
│ ┌──────────┐  ┌──────────┐        │
│ │  🟠 Hard │  │ 🔴 Expert│        │
│ │1200-1800 │  │1800-2500 │        │
│ └──────────┘  └──────────┘        │
├────────────────────────────────────┤
│ Your Bot Stats                     │
│ Games: 50  Win Rate: 60%          │
└────────────────────────────────────┘
```

---

#### 2. **BotGamePage** (`src/pages/bot/BotGamePage.jsx`) - 6-7 giờ ⭐
**Chức năng:**
- Chess board với bot engine
- Bot move computation (mock Stockfish)
- Pause/Resume game
- Undo move (optional, only vs bot)
- Hint button (show best move)
- Analysis mode sau game
- Save game to history

**Bot Integration (Mock):**
```javascript
// Tạm mock bot move, sau này integrate Stockfish
const getBotMove = async (fen, difficulty) => {
  // Mock delay
  await new Promise(resolve => setTimeout(resolve, 1000))
  
  // Get random legal move (Easy)
  if (difficulty === 'easy') {
    const moves = game.moves()
    return moves[Math.floor(Math.random() * moves.length)]
  }
  
  // Sau này sẽ call API Stockfish
  // return await stockfishAPI.getBestMove(fen, depth)
}

// Usage
const handlePlayerMove = async (move) => {
  game.move(move)
  setIsWaitingBot(true)
  
  const botMove = await getBotMove(game.fen(), difficulty)
  game.move(botMove)
  
  setIsWaitingBot(false)
}
```

**Pause/Resume:**
```javascript
const [isPaused, setIsPaused] = useState(false)

const handlePause = () => {
  setIsPaused(true)
  showModal('Game Paused')
}

const handleResume = () => {
  setIsPaused(false)
}
```

**End Game:**
```javascript
<EndGameModal
  isOpen={gameEnded}
  result="win"
  difficulty="medium"
  onSaveGame={handleSave}
  onRematch={() => startNewGame(difficulty)}
  onBack={() => navigate('/bot')}
/>
```

---

#### **REPLAY MODULE (2 pages)**

#### 3. **ReplayListPage** (`src/pages/replay/ReplayListPage.jsx`) - 3-4 giờ
**Chức năng:**
- Danh sách tất cả games đã chơi (ranked, bot, room, tournament)
- Filter by:
  - Game mode (All, Ranked, Bot, Room, Tournament)
  - Result (All, Win, Lose, Draw)
  - Date range
- Sort: Recent, Rating, Duration
- Game card hiển thị:
  - Mode badge
  - Opponent/Bot name
  - Result
  - Date & Duration
  - Opening name (nếu có)
  - Button "View Replay"
- Pagination
- Search by opponent name

**Game Card:**
```javascript
<GameCard
  mode="ranked"
  opponent="Player123"
  result="win"
  date="2026-01-27"
  duration="15:30"
  opening="Sicilian Defense"
  thumbnail={<MiniBoard fen={finalFen} />}
  onClick={() => navigate(`/replays/${gameId}`)}
/>
```

---

#### 4. **ReplayViewerPage** (`src/pages/replay/ReplayViewerPage.jsx`) - 6-7 giờ ⭐
**Chức năng:**
- Chess board (read-only)
- Move navigation controls:
  - First move |◀
  - Previous ◀
  - Play/Pause ▶/⏸
  - Next ▶
  - Last move ▶|
- Move list với highlight current move
- Progress slider
- Speed control (0.5x, 1x, 2x)
- Analysis panel (optional):
  - Show evaluation (nếu có)
  - Show best move
  - Show mistakes/blunders
- Game info header:
  - Players, Rating, Result, Date
  - Opening name
  - Total moves
- Share replay button
- Download PGN button

**Layout:**
```
┌─────────────────────────────────────────┐
│ Replay: Player1 (1520) vs Player2 (1500)│
│ Date: 2026-01-27  Result: 1-0  Ranked   │
├─────────────────┬───────────────────────┤
│                 │  Move History         │
│   Chess Board   │  1. e4    e5   ←      │
│   (read-only)   │  2. Nf3   Nc6         │
│                 │  3. Bb5   a6          │
│                 │  ...                  │
├─────────────────┴───────────────────────┤
│ [|◀] [◀] [▶/⏸] [▶] [▶|]  Speed: 1x   │
│ ━━━━●━━━━━━━━━━━━  Move 5/40          │
└─────────────────────────────────────────┘
```

**Replay Controls:**
```javascript
const useReplayControls = (moves) => {
  const [currentMove, setCurrentMove] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [speed, setSpeed] = useState(1) // 1x
  
  const goToFirst = () => setCurrentMove(0)
  const goToPrevious = () => setCurrentMove(Math.max(0, currentMove - 1))
  const goToNext = () => setCurrentMove(Math.min(moves.length, currentMove + 1))
  const goToLast = () => setCurrentMove(moves.length)
  const goToMove = (index) => setCurrentMove(index)
  
  const togglePlay = () => setIsPlaying(!isPlaying)
  
  useEffect(() => {
    if (!isPlaying) return
    
    const interval = setInterval(() => {
      setCurrentMove(prev => {
        if (prev >= moves.length) {
          setIsPlaying(false)
          return prev
        }
        return prev + 1
      })
    }, 1000 / speed)
    
    return () => clearInterval(interval)
  }, [isPlaying, speed])
  
  return {
    currentMove,
    isPlaying,
    speed,
    goToFirst,
    goToPrevious,
    goToNext,
    goToLast,
    goToMove,
    togglePlay,
    setSpeed
  }
}
```

**Download PGN:**
---

## ✅ GIAI ĐOẠN 1.5: MERGE & REVIEW PAGES

**Timeline:** Kết thúc ngày 7

**Quy trình:**
1. Mỗi người tạo PR từ feature branch → `develop`
2. Code review từ ít nhất 1 thành viên khác
3. Fix issues nếu có
4. Merge vào `develop`

**Checklist:**
- [ ] Tất cả pages đã merge
- [ ] Test routing giữa các pages
- [ ] Không có duplicate code
- [ ] Consistent naming conventions

---

## 🏠 GIAI ĐOẠN 2:vascript
const downloadPGN = (game) => {
  const pgn = `
[Event "Ranked Game"]
[White "${game.whitePlayer}"]
[Black "${game.blackPlayer}"]
[Result "${game.result}"]
[Date "${game.date}"]

${game.moves.map((m, i) => 
  i % 2 === 0 ? `${i/2 + 1}. ${m}` : m
).join(' ')}
  `
  
  const blob = new Blob([pgn], { type: 'text/plain' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `game-${game.id}.pgn`
  a.click()
}
```

---

### ✅ Checklist cho Thành viên 4:
- [ ] Hoàn thành 4 pages
- [ ] Mock bot engine
- [ ] Replay controls hoàn chỉnh
- [ ] PGN export
- [ ] Pause/Resume for bot game
- [ ] Speed control for replay
- [ ] Move list navigation
- [ ] Error handling
- [ ] Code review

---

## 🏠 HOME PAGES (Chia đều - Ngày 8-9)

### **HomePage** (`src/pages/home/HomePage.jsx`) - 4-5 giờ
**Người làm:** Thành viên 1 + Thành viên 2

**Chức năng:**
- Hero section với CTA "Play Now"
- Features grid:
  - Play Ranked
  - Play with Friends
  - Play vs Bot
  - Join Tournament
- Quick stats (total users, games played today)
- Leaderboard preview (top 5)
- Recent games carousel
- Footer với links
3
---

### **DashboardPage** (`src/pages/home/DashboardPage.jsx`) - 4-5 giờ
**Người làm:** Thành viên 3 + Thành viên 4

**Chức năng (sau khi login):**
- Welcome banner với username
- Quick actions cards:
  - Find Ranked Match
  - Create Room
  - Play vs Bot
  - Browse Tournaments
- Your stats summary
- Recent games
- Active tournaments
- Friends online (if implemented)

---

## 🧪 GIAI ĐOẠN 2: TESTING & INTEGRATION (Ngày 10-14)

### **Ngày 10-11: Integration**
**Cả nhóm:**
- [ ] Merge tất cả feature branches vào develop
- [ ] Resolve conflicts
- [ ] Test routing giữa các pages
- [ ] Integrate WebSocket events
- [ ] Test real-time features
- [ ] Fix integration bugs

### **Ngày 12-13: Polish & Responsive**
**Chia theo module của mình:**
- [ ] Mobile responsive cho pages quan trọng
- [ ] Loading states
- [ ] Error boundaries
- [ ] Empty states
- [ ] 404 page
- [ ] Toast notifications consistent
- [ ] Dark mode (optional)

### **Ngày 14: Final Testing & Demo Prep**
**Cả nhóm:**
- [ ] End-to-end testing
- [ ] Performance optimization
- [ ] Build production
- [ ] Deploy (Vercel/Netlify)
- [ ] Prepare demo
- [ ] Write documentation

---

## 📊 Tổng Kết Workload

| Thành viên | Module | Pages | Estimated Hours |
|------------|--------|-------|-----------------|
| **1** | Auth & Profile | 6 | ~24-28h |
| **2** | Ranked Match | 4 | ~24-28h |
| **3** | Friend Room & Tournament | 8 | ~26-30h |
| **4** | Bot & Replay | 4 | ~22-26h |
| **All** | Common Components + Setup | - | ~8-10h mỗi người |
| **All** | Home & Dashboard | 2 | ~4-5h mỗi người |
| **All** | Integration & Testing | - | ~12-15h mỗi người |

**Total mỗi người:** ~50-60 giờ trong 2 tuần

---

## 📝 Code Review Checklist

Trước khi tạo Pull Request, check:
- [ ] Code chạy được không lỗi
- [ ] Responsive trên desktop
- [ ] Form validation hoàn chỉnh
- [ ] Loading states
- [ ] Error handling
- [ ] PropTypes/TypeScript
- [ ] No console.log trong production
- [ ] Comments cho code phức tạp
- [ ] Follow naming conventions
- [ ] No hardcoded values
- [ ] Use constants/config file

---

## 🚨 Những Điều QUAN TRỌNG

### 1. **Quy trình làm việc CHẶT CHẼ:**

```
GIAI ĐOẠN 0 (Ngày 1-2):
┌─────────────────────────────────────┐
│ Setup Project (Thành viên 1)       │
│ ↓ (Push to develop)                │
└─────────────────────────────────────┘
           ↓
┌─────────────────────────────────────┐
│ 4 người pull develop                │
│ → Tạo branch riêng                  │
│ → Code components/services          │
│ → Push & tạo PR                     │
└─────────────────────────────────────┘
           ↓
┌─────────────────────────────────────┐
│ Code review lẫn nhau                │
│ → Merge tất cả PR vào develop       │
└─────────────────────────────────────┘
           ↓
┌─────────────────────────────────────┐
│ ✅ CHECKPOINT: Test chung           │
│ Develop branch hoàn chỉnh           │
└─────────────────────────────────────┘
           ↓
GIAI ĐOẠN 1 (Ngày 3-7):
┌─────────────────────────────────────┐
│ 4 người pull develop mới nhất       │
│ → Tạ**Day 1 (Sáng):** Thành viên 1 setup project → Push develop
- [ ] **Day 1 (Chiều):** 4 người pull, tạo branch, bắt đầu code components
- [ ] **Day 2 (Cả ngày):** Hoàn thành components/services → Tạo PR
- [ ] **Day 2 (Tối):** Review & merge tất cả PR → ✅ **CHECKPOINT 1**
- [ ] **Day 3-5:** Code pages của mỗi người (50% → 80% → 100%)
- [ ] **Day 6-7:** Hoàn thiện pages, refactor, test
- [ ] **Day 7 (Tối):** Merge pages vào develop → ✅ **CHECKPOINT 2**

### Week 2:
- [ ] **Day 8-9:** Code HomePage + Dashboard
- [ ] **Day 10:** Integration testing, fix conflicts
- [ ] **Day 11-12:** Bug fixes + Responsive design
- [ ] **Day 13:** Polish UI/UX, performance optimization
- [ ] **Day 14:** Final testing + Demo preparation + Documentation

---

## 📊 Timeline Chi Tiết

```
Ngày 1:
├─ Sáng:   Setup project (TV1) - 3h
├─ Chiều:  4 người pull & tạo branch - 1h
└─ Tối:    Bắt đầu code components - 2-3h

Ngày 2:
├─ Sáng:   Tiếp tục code components - 3-4h
├─ Chiều:  Hoàn thiện, test, tạo PR - 2-3h
└─ Tối:    Review & merge (cả team) - 1-2h
           ✅ CHECKPOINT: Develop ready

Ngày 3-7:
└─ Mỗi người code 6 pages của mình
   Day 3-4: 50% done
   Day 5-6: 80% done
   Day 7:   100% done + PR
   ✅ CHECKPOINT: Pages ready

Ngày 8-14:
└─ Integration, testing, polish
```
   - Hôm nay làm gì?
   - Có vướng mắc gì?
   - Có cần pair programming không?

### 3. **Git Discipline:**
   - ✅ Pull từ `develop` trước khi tạo branch
   - ✅ Commit thường xuyên với message rõ ràng
   - ✅ Push branch của mình, tạo PR vào `develop`
   - ✅ PR phải có ít nhất 1 reviewer approve
   - ❌ **KHÔNG BAO GIỜ** commit trực tiếp vào `develop`
   - ❌ **KHÔNG** merge PR của mình khi chưa có review

### 4. **Code Review Guidelines:**
   - Review code trong vòng 2 giờ
   - Comment constructive, không chỉ trích
   - Test code trước khi approve
   - Check: naming, logic, performance, security

### 5. **Communication:**
   - Hỏi ngay khi gặp vấn đề (đừng ngồi block 1 mình)
   - Share kiến thức/code hay trong group chat
   - Pair programming cho tasks khó
   - Update tiến độ hàng ngày

### 6. **Common Components First:**
   - ⚠️ **KHÔNG được** bắt đầu pages trước khi common components merge
   - ⚠️ **PHẢI** test common components trước khi dùng
   - ⚠️ **PHẢI** document cách dùng component (props, examples)

### 7. **Mock Data:**
   - Tạo file `src/mocks/*.json` cho từng module
   - Consistent data structure giữa các modules
   - Mock API phải giống format API thật sẽ trả về

---

## 🎉 Checklist Tổng Thể

### Week 1:
- [ ] Day 1-2: Setup + Common components done
- [ ] Day 3-4: 50% pages hoàn thành
- [ ] Day 5-7: 100% pages hoàn thành

### Week 2:
- [ ] Day 8-10: Integration + WebSocket
- [ ] Day 11-12: Bug fixes + Responsive
- [ ] Day 13-14: Final polish + Demo

---

**Good luck team! 🚀 Let's build an awesome Chess Web app!**
