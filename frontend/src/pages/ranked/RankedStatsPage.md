# RankedStatsPage — Tài liệu chi tiết

## Mục lục

1. [Tổng quan](#tổng-quan)
2. [Layout & Giao diện](#layout--giao-diện)
3. [Kiến trúc Component](#kiến-trúc-component)
4. [Luồng dữ liệu (Data Flow)](#luồng-dữ-liệu-data-flow)
5. [Chi tiết từng Sub-Component](#chi-tiết-từng-sub-component)
6. [SVG Charts — Giải thích kỹ thuật](#svg-charts--giải-thích-kỹ-thuật)
7. [Mock Data Generators](#mock-data-generators)
8. [API Integration](#api-integration)
9. [State Management](#state-management)
10. [Demo & Kiểm thử](#demo--kiểm-thử)
11. [Tích hợp Backend (mở rộng)](#tích-hợp-backend-mở-rộng)

---

## Tổng quan

`RankedStatsPage` là **dashboard thống kê chi tiết** cho module Ranked Match, hiển thị rating history, win rate, monthly performance, rank progression, và các chỉ số thống kê bằng **SVG charts tùy chỉnh** (không dùng thư viện chart bên ngoài).

**File:** `src/pages/ranked/RankedStatsPage.jsx`  
**Dòng code:** ~687 dòng  
**Route:** `/ranked/stats` (auth), `/demo/ranked/stats` (demo)  
**Dependencies đặc biệt:** Không có — toàn bộ charts viết bằng SVG thuần

---

## Layout & Giao diện

```
┌─────────────────────────────────────────────────────┐
│ MainLayout (Header + Footer)                        │
│ ┌─────────────────────────────────────────────────┐ │
│ │ ← Back    "Ranked Statistics"     [History btn] │ │
│ ├─────────────────────────────────────────────────┤ │
│ │ Player Profile Strip                            │ │
│ │  👤 ChessPlayer  1523 Advanced  Peak: 1687      │ │
│ │                         156 Games  78W  62L     │ │
│ ├─────────────────────────────────────────────────┤ │
│ │ Rank Progress Bar                               │ │
│ │  [Advanced ████████████████░░░░░ Expert (1600)] │ │
│ │   1200              1523              1600      │ │
│ ├─────────────────────────────────────────────────┤ │
│ │ Stats Grid (6 cards)                            │ │
│ │ ┌──────┐ ┌──────┐ ┌──────┐ ┌────┐ ┌────┐ ┌───┐│ │
│ │ │Games │ │ Wins │ │ Loss │ │ WR │ │Strk│ │Opp││ │
│ │ │ 156  │ │  78  │ │  62  │ │50% │ │ 3  │ │1512│ │
│ │ └──────┘ └──────┘ └──────┘ └────┘ └────┘ └───┘│ │
│ ├─────────────────────────────────────────────────┤ │
│ │ ┌─── Rating History (2/3) ──┐ ┌─ Win Donut ──┐ │ │
│ │ │   📈 SVG Line Chart       │ │  🎯 Donut    │ │ │
│ │ │   (last 30 games)         │ │  50% Win     │ │ │
│ │ │   with gradient fill      │ │  78W 62L 16D │ │ │
│ │ └───────────────────────────┘ └──────────────┘ │ │
│ ├─────────────────────────────────────────────────┤ │
│ │ Monthly Performance — Stacked Bar Chart         │ │
│ │   Oct  Nov  Dec  Jan  Feb  Mar                  │ │
│ │   ███  ███  ███  ██   ███  ████  ■W ■L ■D      │ │
│ ├─────────────────────────────────────────────────┤ │
│ │ Time Controls                                   │ │
│ │  ⚡ Blitz 89g 1545  ⏱ Rapid 52g 1498  ♟ 15g  │ │
│ ├─────────────────────────────────────────────────┤ │
│ │    [Play Ranked]  [Match History]               │ │
│ └─────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────┘
```

---

## Kiến trúc Component

```
RankedStatsPage
├── MainLayout (wrapper)
├── Header (back + title + history link)
├── Player Profile Strip (avatar + name + rating + rank + games)
├── RankProgressBar (progress bar from current to next rank)
├── Stats Grid (6 × StatCard)
│   ├── Games (Trophy icon, yellow)
│   ├── Wins (TrendingUp, green)
│   ├── Losses (TrendingDown, red)
│   ├── Win Rate (Percent, blue)
│   ├── Current Streak (Flame, orange)
│   └── Avg Opponent (Users, purple)
├── Charts Row (2-column layout)
│   ├── MiniRatingChart (2/3 width — SVG line chart)
│   └── WinRateDonut (1/3 width — SVG donut chart)
├── MonthlyPerfChart (stacked bar chart)
├── Time Controls (blitz/rapid/classical grid)
└── Bottom Actions (Play Ranked + Match History)
```

---

## Luồng dữ liệu (Data Flow)

```
Mount
  │
  ├── fetchStats() → gameService.getRankedStats()
  │         │
  │         ▼
  │   setStats(data) ──────────────────────────┐
  │                                             │
  ├── generateRatingHistory(user.rating) ─┐    │
  │       (useMemo, chạy 1 lần)           │    │
  │                                        │    │
  ├── generateMonthlyPerf() ──────────┐   │    │
  │       (useMemo, chạy 1 lần)       │   │    │
  │                                    │   │    │
  └────────────────────────────────────┘   │    │
           │                               │    │
           ▼                               ▼    ▼
     ┌───────────────────────────────────────────┐
     │              RENDER                       │
     │                                           │
     │  stats → Profile, StatCards, RankProgress,│
     │          WinRateDonut, TimeControls       │
     │                                           │
     │  ratingHistory → MiniRatingChart          │
     │  monthlyPerf → MonthlyPerfChart           │
     └───────────────────────────────────────────┘
```

**Lưu ý:** `ratingHistory` và `monthlyPerf` được tạo client-side bằng `useMemo` (mock), KHÔNG từ API. Khi tích hợp backend thật, chúng sẽ nằm trong response của `getRankedStats()`.

---

## Chi tiết từng Sub-Component

### 1. `StatCard` — Card thống kê tái sử dụng

```jsx
<StatCard
  icon={Trophy}          // lucide icon component
  label="Games"          // label text (uppercase display)
  value={156}            // main value
  subValue="Best: 8"    // optional sub text
  iconColor="text-yellow-400"
  valueColor="text-white"
/>
```

**Layout:** Icon + label ở trên, value lớn ở dưới, subValue nhỏ nhất.

### 2. `MiniRatingChart` — Biểu đồ rating SVG

**Props:** `{ data }` — mảng `[{ game: 1, rating: 1450 }, ...]`

**Kỹ thuật:**
- SVG viewBox `600 × 200` (responsive qua `w-full h-auto`)
- Padding: top=20, right=20, bottom=30, left=50
- Y-axis: auto-scale với min/max ± 20 buffer
- Line path: SVG `<path>` với `M/L` commands
- Area fill: gradient `<linearGradient>` từ green 30% → green 2%
- Data points: nhỏ (r=2.5), điểm cuối lớn (r=5) + viền trắng
- Y-axis ticks: 6 mốc chia đều
- Current rating label hiển thị trên data point cuối

### 3. `WinRateDonut` — Donut chart phân bố thắng/thua/hòa

**Props:** `{ wins, losses, draws, total }`

**Kỹ thuật:**
- SVG circle-based donut (stroke-dasharray/dashoffset)
- viewBox `160 × 160`, center (80, 80), radius 60
- Stroke width 14
- Circumference C = 2πr = ~377px
- 3 lớp circle chồng lên nhau: Draws (blue) → Losses (red) → Wins (green)
- Center text: `XX% Win Rate`
- Legend: colored dots + count labels

**Cách tính dasharray/offset:**
```
winLen = C × (wins / total)     → phần xanh
loseLen = C × (losses / total)  → phần đỏ
drawLen = C × (draws / total)   → phần xanh dương

winOffset = 0                   → bắt đầu từ 12 giờ
loseOffset = -winLen             → tiếp sau phần win
drawOffset = -(winLen + loseLen) → tiếp sau phần loss
```

### 4. `MonthlyPerfChart` — Stacked bar chart

**Props:** `{ data }` — mảng `[{ month: 'Jan', wins: 12, losses: 8, draws: 3 }, ...]`

**Kỹ thuật:**
- Flex container, mỗi bar là một cột
- `maxVal` = max(wins + losses + draws) trong tất cả tháng
- Mỗi phần (win/loss/draw) có height = `(count / maxVal) × 100%`
- Stack order (từ dưới lên): Wins (green) → Losses (red) → Draws (blue)
- Labels: month name + total count

### 5. `RankProgressBar` — Thanh tiến trình rank

**Props:** `{ rating }`

**Logic:**
```javascript
rank = getRankInfo(rating)           // ví dụ: Advanced (1200 - 1600)
nextRank = RANKS[indexOf(rank) + 1]  // ví dụ: Expert
prevMin = rank.min                    // 1200
nextMin = nextRank.min                // 1600
progress = (rating - prevMin) / (nextMin - prevMin) × 100
// (1523 - 1200) / (1600 - 1200) × 100 ≈ 80.75%
```

**UI:**
- Full-width bar, `bg-gray-800`
- Fill bar có `backgroundColor: rank.color` + box-shadow glow
- Labels: prevMin (trái), current rating (giữa, đậm), nextMin (phải)
- Header: rank name (colored) + next rank target

---

## SVG Charts — Giải thích kỹ thuật

### Tại sao SVG thuần thay vì recharts/chart.js?

1. **Zero dependencies** — không thêm bundle size (~200KB saved)
2. **Full control** — màu sắc Chess.com theme, animation, responsive
3. **SSR-friendly** — SVG render trên server không cần DOM
4. **Performance** — ít re-render hơn chart libraries

### Coordinate System

```
MiniRatingChart:
  viewBox = "0 0 600 200"
  
  ┌─────────────────────────────────────────┐
  │ pad.t=20                                │
  │ ┌───────────────────────────────────┐   │
  │ │                                   │   │
  │ │ pad.l=50    chartW=530      pad.r=20 │
  │ │            chartH=150            │   │
  │ │                                   │   │
  │ └───────────────────────────────────┘   │
  │ pad.b=30                                │
  └─────────────────────────────────────────┘

  x(i) = padL + (i / (N-1)) × chartW
  y(rating) = padT + ((maxR - rating) / (maxR - minR)) × chartH
```

### SVG Path Construction

```javascript
// Line path (series of M/L commands)
const line = data
  .map((d, i) => `${i === 0 ? 'M' : 'L'} ${x(i)} ${y(d.rating)}`)
  .join(' ')

// Area path (close the polygon under the line)
const area = `${line} L ${x(N-1)} ${padT + chartH} L ${padL} ${padT + chartH} Z`
```

### Donut Chart Math

```
Circumference C = 2π × radius = 2 × 3.14159 × 60 ≈ 376.99

stroke-dasharray: "arcLength remainingGap"
  → ví dụ: "188.5 188.5" = 50% filled

stroke-dashoffset: -offset
  → xoay vị trí bắt đầu

transform: rotate(-90 cx cy)
  → SVG bắt đầu từ 3 giờ, rotate -90° để bắt đầu từ 12 giờ
```

---

## Mock Data Generators

### `generateRatingHistory(currentRating)`

```javascript
// Tạo 30 data points rating
// Start = currentRating - 80 + random(0..39)
// Mỗi bước: delta = random(-12..+17) → bias tăng nhẹ
// Clamp: [800, 2400]
// Point cuối luôn = currentRating (ensure consistency)
```

**Output:** `[{ game: 1, rating: 1442 }, { game: 2, rating: 1455 }, ... { game: 30, rating: 1523 }]`

### `generateMonthlyPerf()`

```javascript
// 6 tháng gần nhất: Oct → Mar
// Mỗi tháng:
//   wins = random(5..19)
//   losses = random(3..14)
//   draws = random(0..5)
```

**Output:** `[{ month: 'Oct', wins: 12, losses: 8, draws: 3 }, ...]`

**Lưu ý:** Cả hai generator đều chạy trong `useMemo` → chỉ tạo 1 lần trừ khi dependency thay đổi.

---

## API Integration

### `gameService.getRankedStats()`

**Response format:**
```json
{
  "currentRating": 1523,
  "peakRating": 1687,
  "gamesPlayed": 156,
  "wins": 78,
  "losses": 62,
  "draws": 16,
  "winRate": 50.0,
  "currentStreak": 3,
  "bestStreak": 8,
  "avgOpponentRating": 1512,
  "timeControls": {
    "blitz": { "games": 89, "rating": 1545 },
    "rapid": { "games": 52, "rating": 1498 },
    "classical": { "games": 15, "rating": 1512 }
  }
}
```

### Helpers sử dụng

| Hàm | Nguồn | Mô tả |
|-----|-------|-------|
| `getRankInfo(rating)` | Local helper | Lookup rank từ `RANKS` constant |
| `RANKS` | `@utils/constants` | Array rank tiers: Beginner → Grandmaster |

---

## State Management

### State Variables

| State | Type | Mô tả |
|-------|------|-------|
| `stats` | object \| null | Data từ API |
| `loading` | boolean | Trạng thái loading |
| `error` | string \| null | Error message |
| `ratingHistory` | array | Mock rating points (useMemo) |
| `monthlyPerf` | array | Mock monthly data (useMemo) |

### User Resolution

```javascript
const user = useMemo(() =>
  storeUser
    ? {
        id: storeUser.id,
        username: storeUser.username,
        rating: storeUser.rating || MOCK_USER.rating,
        avatarUrl: storeUser.avatarUrl || MOCK_USER.avatarUrl,
      }
    : MOCK_USER,
  [storeUser]
)
```

Ưu tiên real user từ `useAuthStore`, fallback về `MOCK_USER` khi chưa đăng nhập (demo mode).

---

## Demo & Kiểm thử

### Truy cập

```
http://localhost:5173/demo/ranked/stats
```

### Test Cases

| STT | Test Case | Expected |
|-----|-----------|----------|
| 1 | Trang load | Loading spinner → Full dashboard |
| 2 | Profile strip | Avatar, username, rating, rank (colored), peak rating |
| 3 | Rank progress | Bar fill ~80.75% (1200→1523→1600), glow effect |
| 4 | Stats grid | 6 cards: Games, Wins, Losses, WinRate, Streak, AvgOpp |
| 5 | Rating chart | SVG line chart, 30 data points, gradient fill, current rating label |
| 6 | Win donut | Donut 50%, legend 78W 62L 16D |
| 7 | Monthly bars | 6 tháng, stacked bars, legend at bottom |
| 8 | Time controls | 3 cards: Blitz/Rapid/Classical with games + rating |
| 9 | History link | Navigate → /demo/ranked/history |
| 10 | Play Ranked | Navigate → /demo/ranked |
| 11 | Responsive | Grid adapts: 6→3→2 columns, profile stats hide <640px |
| 12 | Error state | Khi API fail → Error message + Retry button |

### Navigation Flow

```
RankedStatsPage
├── ← Back → /demo/ranked (Lobby)
├── 📋 History → /demo/ranked/history
└── ⚔️ Play Ranked → /demo/ranked
```

---

## Tích hợp Backend (mở rộng)

### Khi có real API:

1. **Rating history từ API:**
   ```javascript
   // Thay generateRatingHistory() bằng:
   const ratingHistory = stats.ratingHistory // từ API response
   ```

2. **Monthly performance từ API:**
   ```javascript
   // Thay generateMonthlyPerf() bằng:
   const monthlyPerf = stats.monthlyPerformance // từ API response
   ```

3. **Time controls breakdown:**
   - API trả về wins/losses/draws cho mỗi time control
   - Thêm mini donut chart cho mỗi mode

4. **Achievement system:**
   - Thêm section "Achievements" với badges
   - Data từ `stats.achievements` array

5. **Comparison feature:**
   - So sánh stats với bạn bè
   - So sánh với average player cùng rank

### API Response mở rộng (đề xuất):

```json
{
  "currentRating": 1523,
  "peakRating": 1687,
  "gamesPlayed": 156,
  "wins": 78,
  "losses": 62,
  "draws": 16,
  "winRate": 50.0,
  "currentStreak": 3,
  "bestStreak": 8,
  "avgOpponentRating": 1512,
  "ratingHistory": [
    { "game": 1, "rating": 1442, "date": "2025-01-01" },
    ...
  ],
  "monthlyPerformance": [
    { "month": "2025-01", "wins": 12, "losses": 8, "draws": 3 },
    ...
  ],
  "timeControls": {
    "blitz": { "games": 89, "rating": 1545, "wins": 45, "losses": 35, "draws": 9 },
    "rapid": { "games": 52, "rating": 1498, "wins": 25, "losses": 22, "draws": 5 },
    "classical": { "games": 15, "rating": 1512, "wins": 8, "losses": 5, "draws": 2 }
  },
  "achievements": [
    { "id": "first_win", "name": "First Blood", "unlockedAt": "2025-01-02" }
  ]
}
```

---

## Lucide Icons sử dụng

| Icon | Usage |
|------|-------|
| `BarChart3` | Page title, Monthly Performance header |
| `Trophy` | Games stat card |
| `TrendingUp` | Wins stat card |
| `TrendingDown` | Losses stat card |
| `Target` | Win Distribution section |
| `Flame` | Streak stat card |
| `Percent` | Win Rate stat card |
| `Users` | Avg Opponent stat card |
| `Zap` | Blitz mode icon |
| `Clock` | Rapid mode icon, Time Controls header |
| `Star` | Classical mode icon |
| `Activity` | Rating History header |
| `Award` | Rank progress bar |
| `ArrowLeft` | Back button |
| `History` | History link |
| `Swords` | Play Ranked button |

---

*Tài liệu tạo bởi Team Member 2 — Module Ranked Match*
