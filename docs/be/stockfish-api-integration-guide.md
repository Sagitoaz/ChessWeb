# Huong Dan Tich Hop Stockfish API Cho Backend ChessWeb

Tai lieu nay mo ta cach cai dat, chay va ket noi Stockfish vao backend de endpoint `POST /api/v1/bot/move` tra ve nuoc di that (khong con mock).

## 0. Tra Loi Nhanh: Co bat buoc chay local khong?

Khong bat buoc.

- Local chi nen dung cho dev/test.
- Khi web chay thuc te, nen deploy Stockfish gateway thanh service rieng (server, VM, hoac container) roi cho backend goi qua HTTP noi bo/VPN.
- Backend chi can URL cua gateway qua `STOCKFISH_API_URL`, khong phu thuoc viec gateway dang chay local hay remote.

Muc tieu production: backend + gateway deu chay tren ha tang server, khong can mo app desktop local.

## 1. Tong Quan Kien Truc

Luong hien tai trong backend:

1. Frontend gui FEN len `POST /api/v1/bot/move`.
2. Backend (`SocialBotService`) goi `StockfishService`.
3. `StockfishService` goi HTTP den Stockfish API gateway (service rieng).
4. Backend ghi log vao `bot_move_requests` va tra nuoc di UCI ve frontend.

Ghi chu:
- Stockfish la engine UCI local binary, khong co HTTP API san.
- Ban can mot service trung gian (gateway) de expose endpoint HTTP cho backend.

## 2. Bien Moi Truong Can Thiet (Backend)

Them vao file `.env` cua backend:

```env
# Bat/tat goi Stockfish API
STOCKFISH_ENABLED=true

# URL gateway Stockfish (vd local)
STOCKFISH_API_URL=http://localhost:9000/api/stockfish/best-move

# Neu gateway co auth bearer
STOCKFISH_API_KEY=

# Timeout goi API (ms)
STOCKFISH_TIMEOUT_MS=5000
```

Neu `STOCKFISH_ENABLED=false` hoac `STOCKFISH_API_URL` rong, backend se tu dong fallback move mock de tranh gay downtime.

## 3. Cach Chay Stockfish Gateway Nhanh Nhat (Node.js)

### 3.1 Cai binary Stockfish

Windows:
1. Tai Stockfish tu trang chinh thuc: https://stockfishchess.org/download/
2. Giai nen, vi du dat binary tai: `C:\tools\stockfish\stockfish-windows-x86-64-avx2.exe`

Kiem tra:

```powershell
C:\tools\stockfish\stockfish-windows-x86-64-avx2.exe
```

Neu mo duoc shell UCI (nhap `uci` thay response), binary hoat dong.

### 3.2 Tao service gateway HTTP (tham khao)

Co the tao 1 service Node rieng (`stockfish-gateway`) de giao tiep UCI:

`POST /api/stockfish/best-move`
Request:

```json
{
  "fen": "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
  "movetime": 300
}
```

Response:

```json
{
  "bestMoveUci": "e2e4",
  "evaluation": 0.24
}
```

Logic toi thieu gateway can co:
1. Spawn process Stockfish.
2. Gui lenh UCI: `uci`, `isready`, `position fen ...`, `go movetime ...`.
3. Parse dong `bestmove` de lay nuoc di.
4. Parse dong `info ... score cp|mate ...` de lay danh gia.

## 4. Chay Backend Va Test Tich Hop

### 4.1 Cach nhanh nhat: 1 lenh bang Docker Compose

Tu root project (`ChessWeb/`):

```powershell
docker compose up --build
```

Sau khi lenh chay xong:

- Backend: `http://localhost:8080`
- Stockfish gateway: `http://localhost:9000/health`
- MongoDB: `mongodb://localhost:27017`

Tat he thong:

```powershell
docker compose down
```

Xoa ca volume MongoDB (neu can reset data):

```powershell
docker compose down -v
```

Trong `backend/`:

```powershell
npm install
npm run build
npm run dev
```

Test endpoint:

```http
POST /api/v1/bot/move
Authorization: Bearer <jwt>
Content-Type: application/json

{
  "sessionId": "abc123-session",
  "fen": "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
}
```

Ky vong response:

```json
{
  "success": true,
  "data": {
    "sessionId": "abc123-session",
    "move": {
      "bestMoveUci": "e2e4",
      "evaluation": 0.24
    }
  },
  "error": null,
  "meta": {
    "requestId": null,
    "timestamp": "..."
  }
}
```

## 5. Checklist Van Hanh

- [ ] Gateway co healthcheck endpoint (vd `/health`).
- [ ] Dat timeout va retry hop ly (khong block request qua lau).
- [ ] Khong log toan bo token/API key.
- [ ] Gioi han tan suat goi bot move (rate limit) de tranh abuse.
- [ ] Theo doi metric: so request, do tre, ty le fallback/mock.

## 5.1 Checklist Truoc Khi Push Nhanh Len Remote

- [ ] Khong commit file `.env` that (chi commit `.env.example`).
- [ ] Chay `npm run build` trong `backend/` va khong co loi.
- [ ] Chay `docker compose config` tai root va config hop le.
- [ ] Kiem tra gateway health: `GET http://localhost:9000/health`.
- [ ] Kiem tra endpoint bot move tra ve `bestMoveUci`.

Lenh goi nhanh test bot move (sau khi `docker compose up --build`):

```powershell
curl -Method POST "http://localhost:8080/api/v1/bot/move" `
  -Headers @{"Content-Type"="application/json";"Authorization"="Bearer <jwt>"} `
  -Body '{"sessionId":"abc123-session","fen":"rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"}'
```

## 6. Loi Thuong Gap

1. `Failed to call Stockfish API`:
- Kiem tra `STOCKFISH_API_URL`.
- Kiem tra gateway co dang chay va mo cong.

2. Gateway treo khi nhan command:
- Kiem tra luong doc stdout/stderr cua process Stockfish.
- Dam bao gui `isready` va doi `readyok` dung quy trinh.

3. Move tra ve rong:
- Kiem tra FEN hop le.
- Kiem tra parser lay dung dong `bestmove`.

## 7. De Xuat Trien Khai Production

- Chay Stockfish gateway thanh service rieng (container/VM), khong nhung truc tiep vao Nest app.
- Dat gateway sau reverse proxy va bat auth (Bearer hoac mTLS).
- Scale theo worker process neu traffic cao.
- Luu cache ket qua theo `fen + difficulty` trong thoi gian ngan de giam tai.

### 7.1 Cac kieu deploy phu hop web thuc te

1. Cung 1 server (nho, nhanh):
- `backend` va `stockfish-gateway` chay cung host.
- `STOCKFISH_API_URL=http://127.0.0.1:9000/api/stockfish/best-move`

2. Tach 2 service (khuyen nghi):
- `backend` service tach rieng, `stockfish-gateway` tach rieng.
- Goi qua private network: `http://stockfish-gateway.internal:9000/...`

3. Container/Kubernetes:
- Deploy gateway thanh deployment rieng, auto-scale theo CPU.
- Backend goi qua service DNS noi bo.

### 7.2 Luu y nang luc may chu

- Stockfish dung CPU manh, nen uu tien host co nhieu core.
- Neu traffic cao, can queue hoac pool worker de tranh nghen process.
- Dat timeout bao ve backend (da co `STOCKFISH_TIMEOUT_MS`).

---

Neu can, co the bo sung tiep 1 tai lieu Day 2 gom:
- sample code gateway Node day du,
- docker-compose cho backend + stockfish-gateway,
- script benchmark latency theo do sau tim kiem.
