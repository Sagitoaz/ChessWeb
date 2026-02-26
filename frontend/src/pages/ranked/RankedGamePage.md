# RankedGamePage — Chi tiết thiết kế & giải thích code

## 1. Tổng quan

**RankedGamePage** là trang chơi cờ ranked — trang phức tạp nhất trong module Ranked Match.
Nó kết hợp bàn cờ tương tác, đồng hồ đếm ngược, lịch sử nước đi, chat, và các control (xin thua, cầu hoà).

| Thuộc tính        | Giá trị                                                    |
| ----------------- | ---------------------------------------------------------- |
| **File**          | `src/pages/ranked/RankedGamePage.jsx`                      |
| **Route chính**   | `/ranked/game/:matchId` (PrivateRoute)                     |
| **Route demo**    | `/demo/ranked/game` hoặc `/demo/ranked/game/:matchId`      |
| **Dòng code**     | ~1 230 dòng (bao gồm 6 sub-component)                     |
| **Thành viên**    | Thành viên 2 — Module Ranked Match                         |

---

## 2. Layout

```
┌──────────────────────────────────────────────────────────┐
│  Header Bar:  [← Back] 🏆 Ranked Game · ID · 10+0 · 🔊 │
├────────────────────────────┬─────────────────────────────┤
│  BOARD COLUMN              │  SIDE PANEL                 │
│  ┌──────────────────────┐  │  ┌─────────────────────────┐│
│  │ Opponent Bar          │  │  │ Status Strip            ││
│  │ [Av] Name Rating Clk │  │  │ (Your Turn / Check...)  ││
│  ├──────────────────────┤  │  ├─────────────────────────┤│
│  │                      │  │  │ Draw Offer Banner       ││
│  │    ♜ ♞ ♝ ♛ ♚ ♝ ♞ ♜ │  │  ├─────────────────────────┤│
│  │    ♟ ♟ ♟ ♟ ♟ ♟ ♟ ♟ │  │  │ Move List               ││
│  │                      │  │  │ 1. e4  e5               ││
│  │    ♙ ♙ ♙ ♙ ♙ ♙ ♙ ♙ │  │  │ 2. Nf3 Nc6             ││
│  │    ♖ ♘ ♗ ♕ ♔ ♗ ♘ ♖ │  │  │ ...                     ││
│  │                      │  │  ├─────────────────────────┤│
│  ├──────────────────────┤  │  │ Controls                ││
│  │ Player Bar            │  │  │ [Resign]   [Draw]       ││
│  │ [Av] Name Rating Clk │  │  ├─────────────────────────┤│
│  └──────────────────────┘  │  │ Chat                    ││
│                            │  │ Messages + Input         ││
│                            │  └─────────────────────────┘│
└────────────────────────────┴─────────────────────────────┘
```

**Responsive**: Desktop = flex-row, Mobile = flex-col (board trên, panel dưới)

---

## 3. State Machine

```
  ┌──────────┐   800ms    ┌──────────┐  checkmate/resign  ┌──────┐
  │ LOADING  │ ────────→  │ PLAYING  │ ────────────────→  │ENDED │
  └──────────┘            └──────────┘                    └──────┘
                               ↑                               │
                               └── End Game Modal ─────────────┘
```

| Phase       | Mô tả                                                       |
| ----------- | ----------------------------------------------------------- |
| `LOADING`   | Spinner + text "Connecting to match". Mô phỏng load data.  |
| `PLAYING`   | Board tương tác, clock chạy, AI đối thủ phản hồi nước đi.  |
| `ENDED`     | Clock dừng, board bị disable, modal kết quả hiện ra.       |

---

## 4. Kiến trúc Component

### 4.1 Sub-Components

| Component          | Chức năng                                                         |
| ------------------ | ----------------------------------------------------------------- |
| `CapturedPieces`   | Hiển thị quân cờ đã bắt (unicode) + chênh lệch material.        |
| `PlayerBar`        | Thanh info: avatar, tên, rating, quân bắt, đồng hồ.             |
| `EndGameModal`     | Modal kết quả: thắng/thua/hoà, rating change, nút hành động.    |
| `DrawOfferBanner`  | Banner cầu hoà từ đối thủ: Accept / Decline.                    |
| `MoveListPanel`    | Danh sách nước đi dạng cặp cột (white/black), auto-scroll.      |
| `InlineChat`       | Chat inline: hiển thị tin nhắn hệ thống + user + input.         |

### 4.2 Main Component: `RankedGamePage`

Quản lý toàn bộ state và logic:

**State groups:**
- Game logic: `fen`, `moveHistory`, `lastMove`, `moveFrom`, `optionSquares`
- Phase: `gamePhase` (LOADING → PLAYING → ENDED)
- Clocks: `whiteTime`, `blackTime` (quản lý bằng interval)
- End game: `endResult`, `showEndModal`, `endedRef`
- Controls: `drawOffer`, `showResignConfirm`
- Chat: `chatMessages`
- UI: `soundEnabled`

---

## 5. Chi tiết Logic

### 5.1 Chess Engine (ChessGame wrapper)

```
gameRef = useRef(new ChessGame())  ← chess.js wrapper
```

- Tất cả logic cờ (nước đi, check, checkmate, stalemate, draw) đều qua `gameRef.current`
- `fen` state được sync sau mỗi nước đi → trigger re-render
- Sử dụng `Chessboard` từ `react-chessboard` trực tiếp (không qua ChessBoard wrapper)
  để kiểm soát hoàn toàn position updates cho opponent moves

### 5.2 Di chuyển quân cờ

**Drag & Drop:**
```
handlePieceDrop(src, dst)
  → gameRef.current.move({from, to, promotion: 'q'})
  → commitMove(move)  // update fen, history, check end
  → return true
```

**Click-to-Move:**
```
handleSquareClick(square)
  → Nếu đã chọn quân (moveFrom):
      → Thử move → thành công → commitMove()
      → Thất bại → Chọn quân khác cùng màu hoặc bỏ chọn
  → Nếu chưa chọn:
      → Chọn quân (showMoveOptions → hiển thị dots)
```

**isDraggablePiece:**
- Chỉ cho phép kéo quân của mình (kiểm tra `piece[0] === playerColor`)
- Disable khi không phải lượt, game kết thúc, hoặc loading

### 5.3 Đồng hồ (Clock Management)

```
useEffect (gamePhase === PLAYING):
  interval mỗi 100ms:
    delta = performance.now() - lastTick
    if turn === 'w' → setWhiteTime(prev - delta)
    if turn === 'b' → setBlackTime(prev - delta)

Timeout detection (separate useEffect):
  if whiteTime <= 0 → endGame('timeout', ...)
  if blackTime <= 0 → endGame('timeout', ...)
```

- Dùng `performance.now()` để tính delta chính xác (drift-resistant)
- Clock dừng ngay lập tức khi game kết thúc (`endedRef.current` guard)
- PlayerBar hiển thị: xanh lá khi active, vàng khi < 30s, đỏ nhấp nháy khi < 10s

### 5.4 Mock AI (Opponent Bot)

```
useEffect [fen, gamePhase]:
  if opponent's turn:
    setTimeout(1.2–3.5s):
      pickAIMove() → prefer captures 50%, else random
      gameRef.current.move(...)
      update fen, history
      checkGameEnd()
      12% chance: gửi chat message ngẫu nhiên
      4% chance (sau 20 nước): offer draw
```

- AI phản ứng tự động khi đến lượt opponent
- Delay ngẫu nhiên 1.2–3.5s để mô phỏng "suy nghĩ"
- Ưu tiên captures 50% để tạo trận đấu thú vị hơn
- Thi thoảng chat hoặc offer draw để test đầy đủ flow

### 5.5 End Game Detection

Sau mỗi nước đi (cả player và AI), gọi `checkGameEnd()`:

```
checkGameEnd():
  if isCheckmate()  → endGame('checkmate', win/lose)
  if isStalemate()  → endGame('stalemate', 'draw')
  if isDraw()       → endGame(reason, 'draw')
```

Các cách kết thúc game:
| Reason              | Trigger                        |
| ------------------- | ------------------------------ |
| `checkmate`         | Tự động (chess.js detect)      |
| `stalemate`         | Tự động (chess.js detect)      |
| `timeout`           | Clock về 0                     |
| `resignation`       | Click Resign 2 lần (confirm)   |
| `draw_agreement`    | Offer → Accept                 |
| `insufficient_material` | Tự động (chess.js detect)  |
| `threefold_repetition`  | Tự động (chess.js detect)  |

### 5.6 Rating Change

```javascript
calcMockRatingDelta(result, playerRating, opponentRating)
  E = 1 / (1 + 10^((opp - player) / 400))
  S = win ? 1 : draw ? 0.5 : 0
  ΔR = round(32 × (S - E))
```

- Dùng công thức Elo chuẩn với K=32
- Hiển thị trong EndGameModal: "1523 → 1547 (+24)"

---

## 6. Sub-Components Chi tiết

### 6.1 PlayerBar

```
┌─────────────────────────────────────────────────────┐
│ [Avatar●] Name  1523  ♛♜♟♟         │   9:42   │
│            captured pieces + adv    │  CLOCK   │
└─────────────────────────────────────────────────────┘
```

Props: `player, timeMs, isActive, capturedPieces, capturedColor, materialAdv, isTop`

**Clock styling:**
- `bg-[#81b64c]/20 text-white` — Active, time bình thường
- `bg-yellow-600/20 text-yellow-400` — Active, < 30s
- `bg-red-600/30 text-red-400 animate-pulse` — Active, < 10s
- `bg-gray-800/50 text-gray-400` — Inactive

### 6.2 CapturedPieces

Hiển thị quân cờ đã bắt bằng Unicode chess symbols:
- Sắp xếp theo giá trị: ♛ > ♜ > ♝ > ♞ > ♟
- Hiển thị material advantage: "+5" nếu lợi thế

### 6.3 EndGameModal

Full-screen overlay với hiệu ứng `animate-fadeIn` + `animate-slideUp`:
- Victory: icon Crown vàng, gradient green/yellow
- Defeat: icon Flag đỏ, gradient red
- Draw: icon Handshake xanh, gradient blue
- Rating change visualization: `old → new (±delta)`
- Actions: "Back to Lobby" + "View History"

### 6.4 MoveListPanel

Compact move list dạng cặp:
```
1. e4    e5
2. Nf3   Nc6
3. Bb5   a6
```

- Auto-scroll xuống nước đi mới nhất
- Highlight nước đi cuối (yellow-800/30)
- Empty state: "Game started — make your move!"

### 6.5 InlineChat

Chat nhỏ gọn nằm dưới cùng panel:
- System messages: vàng, chữ nghiêng, căn giữa
- My messages: màu xanh dương
- Opponent messages: màu xám
- Input disabled khi game kết thúc
- Bot thi thoảng tự reply khi nhận chat

---

## 7. Tích hợp WebSocket (Online)

Code đã sẵn sàng cho chế độ online thông qua `useGameSocket(matchId)`:

```javascript
// Gửi nước đi
if (gameSocket?.isConnected) {
  gameSocket.sendMove({ from, to, promotion, san })
}

// Nhận events (chưa implement listener trong mock)
// gameSocket.onMoveUpdate(callback)
// gameSocket.onGameEnd(callback)
// gameSocket.onDrawOffer(callback)
// gameSocket.onOpponentDisconnected(callback)
```

Khi backend sẵn sàng, chỉ cần:
1. Bỏ mock AI logic (AI useEffect)
2. Thêm listener cho `onMoveUpdate` → `gameRef.current.move(data.move)`
3. Thêm listener cho `onGameEnd` → `endGame(data.reason, data.result)`
4. Thêm listener cho `onDrawOffer` → `setDrawOffer('received')`
5. Thêm listener cho `onOpponentDisconnected/Reconnected`

---

## 8. Dependencies

| Dependency         | Vai trò                                      |
| ------------------ | -------------------------------------------- |
| `react-chessboard` | Render bàn cờ với drag-drop, click-to-move   |
| `chess.js`         | Luật cờ, validate nước đi, detect kết thúc   |
| `lucide-react`     | Icons (Flag, Crown, Handshake, Trophy...)     |
| `react-router-dom` | useParams, useNavigate, routing               |
| `zustand`          | useAuthStore cho user data                   |

---

## 9. Cách Demo

### Cách 1: Direct URL (Nhanh nhất)
```
http://localhost:5176/demo/ranked/game
```
→ Game load ngay, không cần matchId, không cần login

### Cách 2: Từ RankedLobbyPage
```
http://localhost:5176/demo/ranked
→ Click "Find Match"
→ Chờ 5-15 giây (tìm đối thủ)
→ "Opponent Found!" → tự động chuyển sang game page
```

### Cách 3: Với matchId cụ thể
```
http://localhost:5176/demo/ranked/game/abc123
```
→ Header hiển thị "abc123" thay vì "demo-game"

### Thao tác trong Demo:
1. **Di chuyển quân**: Kéo thả hoặc click chọn → click đích
2. **Chờ AI**: Sau mỗi nước đi, đối thủ bot phản hồi 1-3 giây
3. **Resign**: Click "Resign" → Click "Confirm?" → Game kết thúc
4. **Draw**: Click "Draw" → Đối thủ sẽ respond (30% accept, 70% decline)
5. **Chat**: Gõ tin nhắn → Bot thi thoảng reply
6. **Timeout**: Để đồng hồ chạy hết → auto lose

---

## 10. Routes đã đăng ký

| Route                             | Guard        | Mô tả             |
| --------------------------------- | ------------ | ------------------ |
| `/ranked/game/:matchId`           | PrivateRoute | Route chính        |
| `/demo/ranked/game`               | None         | Demo (no auth)     |
| `/demo/ranked/game/:matchId`      | None         | Demo with matchId  |

---

## 11. Flow Diagram

```
User navigates to game page
        │
        ▼
  ┌─────────────┐
  │  LOADING     │  (800ms)
  │  Spinner     │
  └──────┬──────┘
         │
         ▼
  ┌─────────────┐
  │  PLAYING     │◄──────────────────────┐
  │              │                       │
  │  Player      │     AI responds       │
  │  makes move ─┼─→ (1-3s delay) ──────┘
  │              │
  │  Clock       │
  │  ticking     │
  └──────┬──────┘
         │ (checkmate / timeout / resign / draw / stalemate)
         ▼
  ┌─────────────┐
  │  ENDED       │
  │  Clock stop  │
  │  Board lock  │
  │              │
  │  (600ms)     │
  │      ↓       │
  │  EndGameModal│
  │  Rating Δ    │
  │  [Lobby]     │
  │  [History]   │
  └─────────────┘
```

---

## 12. Ghi chú kỹ thuật

### Position Updates
`Chessboard` component nhận `position={fen}` trực tiếp.
Mỗi khi `fen` state thay đổi (sau player hoặc AI move), board re-render
với position mới. Đây là lý do dùng `Chessboard` trực tiếp thay vì
ChessBoard wrapper (wrapper có issue với useMemo cache position từ gameState ref).

### Clock Precision
Dùng `performance.now()` thay vì `Date.now()`:
- Không bị ảnh hưởng bởi system clock changes
- Precision tốt hơn (~μs vs ~ms)
- Delta-based timing tránh drift tích luỹ

### endedRef Guard Pattern
```javascript
const endedRef = useRef(false)
const endGame = (reason, result) => {
  if (endedRef.current) return  // ← chặn gọi lần 2
  endedRef.current = true
  // ... end game logic
}
```
Tránh double-ending khi nhiều triggers cùng lúc
(vd: checkmate + timeout chạy race condition).

### React 18 Batching
Trong `commitMove()`, nhiều `setState` gọi liên tiếp:
```javascript
setFen(...)
setMoveHistory(...)
setLastMove(...)
setMoveFrom(null)
setOptionSquares({})
setDrawOffer(null)
```
React 18 batch tất cả thành 1 re-render duy nhất.
