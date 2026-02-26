# 🏆 RankedLobbyPage — Tài liệu chi tiết

## 📍 File: `src/pages/ranked/RankedLobbyPage.jsx`
## 📍 Route: `/ranked`
## 📍 Branch: `feature/ranked`

---

## 1. Tổng quan

**RankedLobbyPage** là trang **Sảnh chờ xếp hạng** — nơi người chơi bắt đầu tìm trận ranked.  
Đây là "cổng vào" cho toàn bộ Ranked Match Module, trước khi người chơi được ghép cặp và chuyển sang `RankedGamePage`.

### Checklist tính năng

| # | Tính năng | Trạng thái |
|---|-----------|-----------|
| 1 | Button "Find Match" lớn ở giữa màn hình | ✅ |
| 2 | Hiển thị current rating và rank | ✅ |
| 3 | Matchmaking status (Searching, Found, Connecting) | ✅ |
| 4 | Timer: "Searching for... 00:15" | ✅ |
| 5 | Cancel search button | ✅ |
| 6 | Queue stats: "~50 players in queue" | ✅ |
| 7 | Rules section | ✅ |
| 8 | Recent ranked games | ✅ |
| 9 | WebSocket integration (emit + listen) | ✅ |
| 10 | Mock matchmaking simulation (không cần backend) | ✅ |
| 11 | Connection status indicator | ✅ |
| 12 | Quick nav đến History / Stats | ✅ |
| 13 | Ranking tiers + progress bar | ✅ |
| 14 | Elo system explanation | ✅ |
| 15 | Empty state khi chưa có game | ✅ |
| 16 | Guard chống double-navigation | ✅ |

---

## 2. Flow diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    User truy cập /ranked                     │
│              (PrivateRoute → cần đăng nhập)                  │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│              TRANG RANKED LOBBY (IDLE)                        │
│                                                              │
│  ┌──────────────────────┐  ┌──────────────────────────────┐ │
│  │  Player Rating Card   │  │  Quick Stats               │ │
│  │  • Avatar             │  │  • Rating / Rank            │ │
│  │  • Username           │  ├──────────────────────────────┤ │
│  │  • Rating: 1523       │  │  Ranked Rules               │ │
│  │  • Rank: Advanced     │  │  • 10 min / player          │ │
│  │  • Progress bar       │  │  • ±100 Elo matching        │ │
│  ├──────────────────────┤  │  • AFK > 120s = thua         │ │
│  │  ┌──────────────┐    │  │  • Disconnect > 30s = thua   │ │
│  │  │ FIND MATCH ✅│    │  ├──────────────────────────────┤ │
│  │  └──────┬───────┘    │  │  Elo System                 │ │
│  │         │             │  │  ΔR = K × (S - E), K = 32  │ │
│  │  [Connected/Offline]  │  ├──────────────────────────────┤ │
│  ├──────────────────────┤  │  Ranking Tiers               │ │
│  │  Recent Games         │  │  • Beginner  (0-800)        │ │
│  │  • WIN  +24 vs GM42   │  │  • Intermediate (800-1200)  │ │
│  │  • LOSS -18 vs Knight │  │  • ▶ Advanced (1200-1600)   │ │
│  │  • DRAW ±0 vs Queen   │  │  • Expert (1600-2000)       │ │
│  │  [View All →]         │  │  • ...                      │ │
│  └──────────────────────┘  └──────────────────────────────┘ │
└─────────────────┬───────────────────────────────────────────┘
                  │
         User click "Find Match"
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│              SEARCHING OVERLAY                               │
│                                                              │
│         ┌──────────────────────────┐                         │
│         │   🔍 (pulse animation)   │                         │
│         │                          │                         │
│         │ Searching for opponent.. │                         │
│         │ ±100 Elo of your rating  │                         │
│         │                          │                         │
│         │       00:07              │  ← Timer đếm lên        │
│         │    Search time           │                         │
│         │                          │                         │
│         │  👥 ~42 players in queue │  ← Cập nhật mỗi 3s     │
│         │                          │                         │
│         │   ● ● ●  (bouncing)      │                         │
│         │                          │                         │
│         │   [Cancel Search]        │                         │
│         └──────────────────────────┘                         │
│                                                              │
│  WebSocket: emit('ranked:joinQueue', {userId, rating})       │
│  Mock: Tự tìm match sau 5-15 giây                           │
└─────────────────┬───────────────────────────────────────────┘
                  │
         Sau 5-15s (mock) hoặc server trả về
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│              MATCH FOUND! (1.5 giây)                         │
│                                                              │
│         ┌──────────────────────────┐                         │
│         │   ⚔️ (bounce animation)  │                         │
│         │                          │                         │
│         │   Opponent Found!        │                         │
│         │   OpponentPlayer (1487)  │                         │
│         └──────────────────────────┘                         │
└─────────────────┬───────────────────────────────────────────┘
                  │
         Sau 1.5s
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│              CONNECTING... (1.5 giây)                         │
│                                                              │
│         ┌──────────────────────────┐                         │
│         │   📶 (pulse animation)   │                         │
│         │                          │                         │
│         │   Connecting to game...  │                         │
│         │   Setting up the board   │                         │
│         └──────────────────────────┘                         │
└─────────────────┬───────────────────────────────────────────┘
                  │
         Sau 1.5s nữa (tổng 3s kể từ found)
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│     navigate(`/ranked/game/${matchId}`)                      │
│     → Chuyển sang RankedGamePage                             │
└─────────────────────────────────────────────────────────────┘
```

### Flow Cancel

```
SEARCHING → User click "Cancel Search"
         → emit('ranked:leaveQueue')
         → Reset tất cả state
         → Quay về IDLE
```

---

## 3. Giải thích code chi tiết

### 3.1 Imports & Dependencies

```jsx
// React hooks
import { useState, useEffect, useCallback, useRef } from 'react'

// Routing
import { useNavigate, Link } from 'react-router-dom'

// Icons (lucide-react — thư viện icon của team)
import { Swords, Trophy, Clock, Users, ... } from 'lucide-react'

// Common components đã được team tạo sẵn
import { Button, Avatar, Loader } from '@components/common'
import { MainLayout } from '@components/layout'

// Custom hooks cho WebSocket
import { useRankedSocket } from '@hooks/useWebSocket'

// Zustand store cho auth
import { useAuthStore } from '@store'

// API service với mock data
import gameService from '@services/gameService'

// Constants & Formatters
import { RANKS, INACTIVITY_TIMEOUT } from '@utils/constants'
import { formatEloDelta, eloDeltaColor, formatRelativeTime } from '@utils/formatters'
```

**Tất cả đều sử dụng path alias** (`@components`, `@hooks`, `@store`, ...) được cấu hình trong `vite.config.js`.

---

### 3.2 Helper Functions

```jsx
// Tìm thông tin rank (tên, màu sắc) dựa trên rating
const getRankInfo = (rating) => {
  const rank = RANKS.find((r) => rating >= r.min && rating < r.max)
  return rank || RANKS[0] // fallback Beginner
}

// Format số giây thành MM:SS cho search timer
const formatSearchTime = (seconds) => {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}
```

---

### 3.3 Mock Data

```jsx
const MOCK_USER = { id: 1, username: 'ChessPlayer', rating: 1523, ... }
const MOCK_RECENT_GAMES = [ ... ] // 5 trận gần đây (win/lose/draw)
```

**Tại sao cần mock?**
- Chưa có backend thật → cần dữ liệu để render UI
- `user = authUser || MOCK_USER` → nếu chưa login thật, dùng mock
- `gameService.getRankedHistory()` đã có mock API trả data giả

---

### 3.4 Queue Status State Machine

```jsx
const QUEUE_STATUS = {
  IDLE: 'idle',           // Chưa tìm trận
  SEARCHING: 'searching', // Đang tìm đối thủ
  FOUND: 'found',         // Tìm thấy đối thủ
  CONNECTING: 'connecting' // Đang kết nối vào game
}
```

Transition:
```
IDLE → click "Find Match" → SEARCHING
SEARCHING → server trả matchFound → FOUND (1.5s) → CONNECTING (1.5s) → navigate()
SEARCHING → click "Cancel" → IDLE
```

---

### 3.5 Component: SearchingOverlay

Overlay fullscreen hiển thị trạng thái matchmaking:

| State | Title | Icon | Timer | Cancel |
|-------|-------|------|-------|--------|
| `SEARCHING` | "Searching for opponent..." | 🔍 pulse | ✅ | ✅ |
| `FOUND` | "Opponent Found!" | ⚔️ bounce | ❌ | ❌ |
| `CONNECTING` | "Connecting to game..." | 📶 pulse | ❌ | ❌ |

**Key features:**
- `bg-black/80 backdrop-blur-sm` → dim background, blur
- `animate-fadeIn` / `animate-slideUp` → CSS animations đã có trong `global.css`
- 3 bouncing dots khi SEARCHING
- Queue count hiển thị "~42 players in queue"

---

### 3.6 Component: RecentGameCard

Mỗi game card hiển thị:
- **Result badge**: WIN (xanh) / LOSS (đỏ) / DRAW (vàng) với background tương ứng
- **Opponent info**: avatar + tên + rating
- **Rating change**: `+24`, `-18`, `±0` với màu tự động từ `eloDeltaColor()`
- **Duration & Time**: "14:02" + "2 giờ trước"

---

### 3.7 Main Component Logic

#### State Management
```jsx
const [queueStatus, setQueueStatus] = useState(QUEUE_STATUS.IDLE)
const [searchTime, setSearchTime] = useState(0)    // Giây đã tìm
const [queueCount, setQueueCount] = useState(0)     // Số người trong queue
const [matchData, setMatchData] = useState(null)     // Data đối thủ khi tìm thấy
const [recentGames, setRecentGames] = useState([])   // Game gần đây
const [loading, setLoading] = useState(true)          // Loading recent games
const matchFoundRef = useRef(false)                   // Guard chống double-navigate
```

#### useEffect #1: Load Recent Games
```jsx
useEffect(() => {
  const fetchRecentGames = async () => {
    const data = await gameService.getRankedHistory(1, 5)
    setRecentGames(data.matches || MOCK_RECENT_GAMES)
  }
  fetchRecentGames()
}, [])
```
Gọi API (mock) khi mount, fallback sang mock data nếu lỗi.

#### useEffect #2: Listen WebSocket Events
```jsx
onMatchFound(handleMatchFound)  // ranked:matchFound
onQueueUpdate(handleQueueUpdate) // ranked:queueUpdate
```
Khi server real trả về match → FOUND → CONNECTING → navigate.

#### useEffect #3: Search Timer
```jsx
if (queueStatus === QUEUE_STATUS.SEARCHING) {
  // setInterval mỗi 1s → setSearchTime(prev => prev + 1)
} else {
  // clearInterval
}
```

#### useEffect #4: Mock Matchmaking Simulation
```jsx
// Chỉ chạy khi SEARCHING
// setInterval mỗi 3s → random queue count
// setTimeout 5-15s → mock match found
// matchFoundRef.current guard → tránh double-navigate
```

**Tại sao cần Mock Simulation?**
Vì chưa có backend WebSocket, nên code tự giả lập:
1. Random queue count mỗi 3 giây
2. Sau 5-15 giây → tạo mock opponent → chuyển sang FOUND
3. Khi có backend thật, chỉ cần xóa `useEffect #4`, WebSocket `useEffect #2` sẽ tự hoạt động

#### Guard chống double-navigation
```jsx
const matchFoundRef = useRef(false)
```
- Reset về `false` mỗi khi click "Find Match"
- Set `true` khi match found (cả từ WS lẫn mock)
- Check `if (matchFoundRef.current) return` trước khi process
- **Tại sao?** Vì cả WS callback lẫn mock setTimeout cùng chạy song song, nếu không guard sẽ navigate 2 lần

---

### 3.8 Layout Structure

```
MainLayout (hideFooter)
└── max-w-6xl mx-auto
    ├── Page Header (title + nav links)
    └── Grid 3 columns
        ├── Left (col-span-2)
        │   ├── Player Rating Card
        │   ├── Find Match Section
        │   └── Recent Games
        └── Right (col-span-1)
            ├── Quick Stats
            ├── Ranked Rules
            ├── Elo System
            └── Ranking Tiers
```

---

### 3.9 Styling Conventions

| Pattern | Usage |
|---------|-------|
| `bg-gray-800/50` | Semi-transparent card background |
| `border border-gray-700` | Subtle border |
| `rounded-2xl` | Card border radius |
| `bg-[#81b64c]` | Chess.com green cho primary actions |
| `text-yellow-400` | Rating / rank colors |
| `animate-fadeIn`, `animate-slideUp` | Animations từ global.css |
| `hover:scale-[1.01]` | Subtle hover effect |
| `lucide-react` icons | Consistent icon library |

---

## 4. Dependency Map

```
RankedLobbyPage.jsx
├── @components/common/Button      → Variant buttons
├── @components/common/Avatar      → User avatars
├── @components/common/Loader      → Loading spinner
├── @components/layout/MainLayout  → Page wrapper (Header + Sidebar)
├── @hooks/useWebSocket            → useRankedSocket (joinQueue, leaveQueue, onMatchFound, onQueueUpdate)
├── @store/index                   → useAuthStore (user state)
├── @services/gameService          → getRankedHistory (mock API)
├── @utils/constants               → RANKS, INACTIVITY_TIMEOUT
└── @utils/formatters              → formatEloDelta, eloDeltaColor, formatRelativeTime
```

---

## 5. Responsive Design

| Breakpoint | Behavior |
|------------|----------|
| Desktop (lg+) | 3-column grid: main area (2/3) + sidebar (1/3) |
| Tablet (md-lg) | Single column, sidebar dưới main area |
| Mobile (< md) | Single column, History/Stats nav ẩn, game card duration ẩn |

---

## 6. Hướng dẫn xem Demo

### Cách 1: Tạm bỏ PrivateRoute (nhanh nhất)

Vì `/ranked` được bọc trong `<PrivateRoute>`, bạn cần login hoặc bypass. Cách nhanh nhất:

**Mở file `src/routes/index.jsx`**, tìm đoạn:

```jsx
<Route path="/ranked" element={
  <PrivateRoute>
    <RankedLobbyPage />
  </PrivateRoute>
} />
```

Tạm sửa thành:

```jsx
<Route path="/ranked" element={<RankedLobbyPage />} />
```

Sau đó:

```bash
cd frontend
npm install    # nếu chưa install
npm run dev
```

Mở trình duyệt: **http://localhost:5173/ranked**

> ⚠️ Nhớ revert lại khi xong demo!

---

### Cách 2: Fake login vào localStorage (recommended)

Mở browser DevTools (F12) → Console, paste:

```javascript
localStorage.setItem('token', 'mock-jwt-token-demo')
localStorage.setItem('user', JSON.stringify({
  id: 1,
  username: 'DemoPlayer',
  rating: 1523,
  avatarUrl: 'https://i.pravatar.cc/150?img=1'
}))
location.reload()
```

Sau đó navigate đến: **http://localhost:5173/ranked**

Zustand store sẽ load user từ localStorage → PrivateRoute cho phép truy cập → page hiển thị với data thật.

---

### Cách 3: Qua trang Login (nếu Team Member 1 đã làm LoginPage)

1. Truy cập http://localhost:5173/login
2. Đăng nhập (mock API sẽ auto-accept)
3. Navigate tới /ranked

---

### Thao tác trên trang Demo

1. **Xem layout**: Page hiển thị player info, rating, rank badge, progress bar
2. **Click "Find Match"**: Overlay xuất hiện với timer đếm lên, queue count
3. **Đợi 5-15 giây**: Mock tự tìm match → "Opponent Found!" → "Connecting..." → Redirect
4. **Hoặc click "Cancel Search"**: Quay về trạng thái ban đầu
5. **Scroll xuống**: Xem Recent Games, Rules, Elo System, Ranking Tiers

---

## 7. Các lưu ý khi phát triển tiếp

### Kết nối Backend thật
Khi có WebSocket server hoạt động, chỉ cần:
1. **Xóa** `useEffect` mock simulation (#4 trong code — block có comment `Mock: Simulate match found`)
2. **Giữ nguyên** `useEffect` #2 (listen WebSocket events) — nó đã integrate đúng với `useRankedSocket()`
3. Đảm bảo server emit đúng events: `ranked:matchFound` và `ranked:queueUpdate`

### Data structure từ server cần tuân theo

**`ranked:matchFound`:**
```json
{
  "matchId": "abc123",
  "opponent": {
    "id": 2,
    "username": "PlayerName",
    "rating": 1487,
    "avatarUrl": "https://..."
  },
  "color": "white"
}
```

**`ranked:queueUpdate`:**
```json
{
  "playersInQueue": 42
}
```

**`GET /ranked/history` response:**
```json
{
  "matches": [
    {
      "id": "g1",
      "opponent": { "username": "...", "rating": 1580, "avatarUrl": "..." },
      "result": "win",
      "ratingChange": 24,
      "endReason": "checkmate",
      "duration": 842,
      "playedAt": "2026-02-26T10:00:00Z"
    }
  ],
  "pagination": { "page": 1, "limit": 5, "total": 100 }
}
```
