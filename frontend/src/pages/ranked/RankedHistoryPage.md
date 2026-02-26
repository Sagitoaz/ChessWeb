# RankedHistoryPage — Tài liệu chi tiết

## Mục lục

1. [Tổng quan](#tổng-quan)
2. [Layout & Giao diện](#layout--giao-diện)
3. [Kiến trúc Component](#kiến-trúc-component)
4. [Luồng dữ liệu (Data Flow)](#luồng-dữ-liệu-data-flow)
5. [Chi tiết từng Component](#chi-tiết-từng-component)
6. [State Machine](#state-machine)
7. [API Integration](#api-integration)
8. [Tính năng Filter & Search](#tính-năng-filter--search)
9. [Pagination Logic](#pagination-logic)
10. [Demo & Kiểm thử](#demo--kiểm-thử)
11. [Tích hợp WebSocket (mở rộng)](#tích-hợp-websocket-mở-rộng)

---

## Tổng quan

`RankedHistoryPage` hiển thị **lịch sử trận đấu ranked** của người chơi dưới dạng danh sách phân trang, kèm thống kê tóm tắt, bộ lọc kết quả (Win/Loss/Draw), và tìm kiếm đối thủ.

**File:** `src/pages/ranked/RankedHistoryPage.jsx`  
**Dòng code:** ~502 dòng  
**Route:** `/ranked/history` (auth), `/demo/ranked/history` (demo)

---

## Layout & Giao diện

```
┌────────────────────────────────────────────────────┐
│ MainLayout (Header + Footer)                       │
│ ┌────────────────────────────────────────────────┐ │
│ │ ← Back   "Match History"          [User Card]  │ │
│ ├────────────────────────────────────────────────┤ │
│ │ ┌──────┐ ┌──────┐ ┌──────┐ ┌────────────────┐ │ │
│ │ │ Wins │ │ Loss │ │ Draw │ │  Net Rating    │ │ │
│ │ │  2   │ │  4   │ │  4   │ │    -45         │ │ │
│ │ └──────┘ └──────┘ └──────┘ └────────────────┘ │ │
│ ├────────────────────────────────────────────────┤ │
│ │ [All] [Wins] [Losses] [Draws]  🔍 Search...  📊│ │
│ ├────────────────────────────────────────────────┤ │
│ │ RESULT  OPPONENT      END REASON  DETAIL  RATE │ │
│ ├────────────────────────────────────────────────┤ │
│ │ ┌────────────────────────────────────────────┐ │ │
│ │ │ WIN  ⚪ 👤 opponent5  🏳️ Resign  41  +15  │ │ │
│ │ └────────────────────────────────────────────┘ │ │
│ │ ┌────────────────────────────────────────────┐ │ │
│ │ │ LOSS ⚫ 👤 opponent1  👑 Check   32  -15  │ │ │
│ │ └────────────────────────────────────────────┘ │ │
│ │           ... more rows ...                    │ │
│ ├────────────────────────────────────────────────┤ │
│ │       « 1 [2] 3 4 5 ... 10 »                  │ │
│ │     Showing page 2 of 10 · 10 per page        │ │
│ └────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────┘
```

---

## Kiến trúc Component

```
RankedHistoryPage
├── MainLayout (wrapper)
├── Header (back button + title + user card)
├── StatsStrip (wins/losses/draws/net rating grid)
├── Filter Bar
│   ├── Result filter tabs (all/win/loss/draw)
│   ├── Search input (opponent name)
│   └── Stats link → /demo/ranked/stats
├── Table Header (responsive - ẩn trên mobile)
├── Content Area
│   ├── Loading → Loader component
│   ├── Error → Error message + Retry button
│   ├── Empty → Empty state (no games / no matches)
│   └── Data → HistoryRow[] (danh sách match cards)
├── Pagination (page controls)
└── Footer info (current page / total)
```

---

## Luồng dữ liệu (Data Flow)

```
Mount → fetchHistory(page=1) → gameService.getRankedHistory()
              │
              ▼
      ┌─── API Response ───┐
      │ { matches: [...],  │
      │   pagination: {    │
      │     page, total,   │
      │     totalPages     │
      │   }                │
      │ }                  │
      └────────┬───────────┘
               │
      ┌────────▼─────────┐
      │  setMatches()     │
      │  setTotalPages()  │ 
      │  setCurrentPage() │
      └────────┬─────────┘
               │
      ┌────────▼──────────────────────────┐
      │  filteredMatches = useMemo(        │
      │    matches                         │
      │    → filter by resultFilter        │
      │    → filter by searchQuery (name)  │
      │  )                                 │
      └────────┬──────────────────────────┘
               │
      ┌────────▼─────────┐
      │  Render rows      │
      │  StatsStrip       │
      │  Pagination       │
      └──────────────────┘
```

---

## Chi tiết từng Component

### 1. `HistoryRow` — Card trận đấu

**Props:** `{ match }` — object chứa thông tin 1 trận

**Hiển thị (từ trái sang phải):**

| Phần tử | Mô tả |
|---------|-------|
| **Result Badge** | WIN (xanh), LOSS (đỏ), DRAW (xanh dương) — styling từ `RESULT_BADGE` constant |
| **Player Color** | ⚪ / ⚫ indicator — `match.playerColor` |
| **Opponent Info** | Avatar + Username + Rating + Rank name (màu theo rank) |
| **End Reason** | Icon + label — Crown (checkmate), Flag (resign), Timer (timeout), Handshake (draw) |
| **Detail** | Số nước đi + thời gian (format MM:SS) |
| **Rating Change** | `formatEloDelta()` với `eloDeltaColor()` — +15 xanh, -15 đỏ, ±0 xám |
| **Date** | `formatRelativeTime()` — "2 phút trước", "3 ngày trước" |
| **Replay Link** | Icon Eye, hiện khi hover (opacity group transition) |

**Responsive:** End Reason ẩn < sm, Detail ẩn < md, Date ẩn < lg

### 2. `StatsStrip` — Thanh thống kê tóm tắt

**Props:** `{ matches }` — mảng tất cả match của trang hiện tại

**Logic:** `useMemo` tính:
- `wins` = matches.filter(result === 'win').length
- `losses` = matches.filter(result === 'loss').length
- `draws` = matches.filter(result === 'draw').length
- `totalRatingChange` = sum(ratingChange)

**UI:** Grid 2x2 (mobile) → 4 cột (desktop), mỗi ô có border màu tương ứng

### 3. `Pagination` — Phân trang thông minh

**Props:** `{ page, totalPages, onPageChange }`

**Logic hiển thị trang:**
```
maxVisible = 5 trang liên tục
start = max(1, page - 2)
end = min(totalPages, start + 4)
Điều chỉnh start nếu end - start < 4

Kết quả ví dụ:
page=1:  [1] 2 3 4 5 ... 10
page=5:  1 ... 3 4 [5] 6 7 ... 10
page=10: 1 ... 6 7 8 9 [10]
```

**Features:**
- Nút Previous/Next (disabled ở đầu/cuối)
- Ellipsis "..." khi có gap giữa page range và first/last
- Page 1 và last page luôn hiển thị
- Active page highlight `bg-[#81b64c]`
- `scrollTo top` khi chuyển trang

---

## State Machine

```
┌────────────┐     fetchHistory()     ┌──────────┐
│            │ ──────────────────────► │          │
│   IDLE     │                        │ LOADING  │
│            │ ◄────────────────────── │          │
└────────────┘     success / error    └──────────┘
      │                                     │
      │                                     │
      ▼                                     ▼
  ┌────────┐                         ┌──────────┐
  │ DATA   │   (matches.length > 0)  │  ERROR   │
  │ LOADED │                         │  STATE   │
  └────────┘                         └──────────┘
      │                                     │
      │   filter / search                   │ Retry click
      ▼                                     │
  ┌────────────┐                            │
  │ FILTERED   │ ◄──────────────────────────┘
  │ (client)   │   (re-fetch)
  └────────────┘
```

**State variables:**
- `loading` (boolean) — hiển thị Loader
- `error` (string | null) — hiển thị error message
- `matches` (array) — raw data từ API
- `currentPage` (number) — trang hiện tại
- `totalPages` (number) — tổng số trang
- `resultFilter` ('all' | 'win' | 'loss' | 'draw') — client-side filter
- `searchQuery` (string) — client-side search

---

## API Integration

### `gameService.getRankedHistory(page, limit)`

**Request:** Page number + page size  
**Response format:**
```json
{
  "matches": [
    {
      "id": "match-1-0",
      "result": "win",
      "opponent": {
        "id": "opp-1",
        "username": "opponent1",
        "rating": 1526,
        "avatarUrl": "https://i.pravatar.cc/150?img=3"
      },
      "playerColor": "white",
      "endReason": "checkmate",
      "moves": 42,
      "duration": 1245,
      "ratingChange": 15,
      "playedAt": "2025-01-07T10:30:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 100,
    "totalPages": 10
  }
}
```

**Mock:** Khi `USE_MOCK = true`, `gameService` trả về data giả lập random gồm 100 trận, phân trang 10/page.

### Utilities sử dụng

| Hàm | Nguồn | Mô tả |
|-----|-------|-------|
| `formatEloDelta(n)` | `@utils/formatters` | "+15", "-10", "±0" |
| `eloDeltaColor(n)` | `@utils/formatters` | "text-green-400", "text-red-400", "text-gray-400" |
| `formatRelativeTime(date)` | `@utils/formatters` | "3 phút trước", "2 ngày trước" |
| `formatDate(date)` | `@utils/formatters` | "07/01/2025" |
| `getRankInfo(rating)` | Local helper | Trả về rank object từ RANKS constant |
| `fmtDuration(secs)` | Local helper | Seconds → "M:SS" format |

---

## Tính năng Filter & Search

### Client-side Filtering

**Quan trọng:** Filter và search thực hiện **client-side** trên data đã fetch (10 matches/page), KHÔNG gọi lại API.

```javascript
const filteredMatches = useMemo(() => {
  let result = matches
  
  // 1. Filter theo kết quả
  if (resultFilter !== 'all') {
    result = result.filter(m => m.result === resultFilter)
  }
  
  // 2. Filter theo tên đối thủ (case-insensitive)
  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase()
    result = result.filter(m =>
      m.opponent.username.toLowerCase().includes(q)
    )
  }
  
  return result
}, [matches, resultFilter, searchQuery])
```

### Filter Tabs

| Tab | Value | Hành vi |
|-----|-------|---------|
| All Results | `'all'` | Hiển thị tất cả match của trang |
| Wins | `'win'` | Chỉ hiển thị trận thắng |
| Losses | `'loss'` | Chỉ hiển thị trận thua |
| Draws | `'draw'` | Chỉ hiển thị trận hòa |

Active tab có style `bg-[#81b64c] text-white`, inactive có `text-gray-400 hover:text-white`.

---

## Pagination Logic

```
User clicks page N
       │
       ▼
handlePageChange(N)
       │
       ├── setCurrentPage(N)
       │
       └── scrollTo({ top: 0, behavior: 'smooth' })
              │
              ▼
       useEffect triggers (dependency: currentPage)
              │
              ▼
       fetchHistory(currentPage) → API call
              │
              ▼
       setMatches() + setTotalPages()
              │
              ▼
       Re-render with new data
```

**Page range algorithm:**
```
maxVisible = 5
start = max(1, currentPage - 2)
end = min(totalPages, start + 4)
if (end - start + 1 < 5): start = max(1, end - 4)
```

---

## Demo & Kiểm thử

### Truy cập

```
http://localhost:5173/demo/ranked/history
```

### Kiểm tra nên test

| STT | Test Case | Expected |
|-----|-----------|----------|
| 1 | Trang load | Loading spinner → Match list hiện ra |
| 2 | Stats strip | 4 ô: Wins, Losses, Draws, Net Rating |
| 3 | Filter "Wins" | Chỉ hiển thị trận WIN |
| 4 | Filter "Losses" | Chỉ hiển thị trận LOSS |
| 5 | Search "opponent3" | Chỉ hiển thị match với opponent3 |
| 6 | Search + Filter cùng lúc | Kết hợp cả 2 filter |
| 7 | Click page 2 | Data load, scroll to top |
| 8 | Click "Stats" | Navigate → /demo/ranked/stats |
| 9 | Hover match row | Eye icon hiện (replay link) |
| 10 | Rating change color | +15 xanh, -15 đỏ, ±0 xám |
| 11 | End reason icons | Crown (checkmate), Flag (resign), etc. |
| 12 | Responsive | End reason ẩn < 640px, detail ẩn < 768px |

### Navigation Flow

```
RankedHistoryPage
├── ← Back → /demo/ranked (Lobby)
├── 📊 Stats → /demo/ranked/stats
└── 👁 Replay → /replays/{matchId}
```

---

## Tích hợp WebSocket (mở rộng)

Hiện tại trang History chỉ sử dụng REST API (`gameService.getRankedHistory`). Khi tích hợp real backend:

1. **Thay mock data:** Xóa `USE_MOCK`, kết nối API thật qua `gameService`
2. **Real-time update:** Có thể subscribe WebSocket event `match:completed` để tự append trận mới vào đầu danh sách
3. **Server-side filter:** Chuyển `resultFilter` và `searchQuery` thành query params cho API
4. **Infinite scroll:** Thay thế pagination bằng infinite scroll nếu UX cần

---

## Constants

### `RESULT_BADGE`

```javascript
{
  win:  { label: 'WIN',  bg: 'bg-green-600/20', text: 'text-green-400', border: 'border-green-600/30' },
  loss: { label: 'LOSS', bg: 'bg-red-600/20',   text: 'text-red-400',   border: 'border-red-600/30' },
  draw: { label: 'DRAW', bg: 'bg-blue-600/20',  text: 'text-blue-400',  border: 'border-blue-600/30' },
}
```

### `END_REASON_ICONS`

```javascript
{
  checkmate:   { icon: Crown,     label: 'Checkmate',   color: 'text-yellow-400' },
  resignation: { icon: Flag,      label: 'Resignation', color: 'text-red-400' },
  timeout:     { icon: Timer,     label: 'Timeout',     color: 'text-orange-400' },
  draw:        { icon: Handshake, label: 'Draw',        color: 'text-blue-400' },
  stalemate:   { icon: Handshake, label: 'Stalemate',   color: 'text-gray-400' },
}
```

### `RESULT_FILTERS`

```javascript
[
  { value: 'all',  label: 'All Results' },
  { value: 'win',  label: 'Wins' },
  { value: 'loss', label: 'Losses' },
  { value: 'draw', label: 'Draws' },
]
```

---

*Tài liệu tạo bởi Team Member 2 — Module Ranked Match*
