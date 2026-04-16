# ♟️ ChessWeb - Online Chess Platform

> **Dự án BTL:** Hệ thống chơi cờ vua trực tuyến với đầy đủ tính năng  
> **Team:** 4 thành viên  
> **Timeline:** 2 tuần (Frontend only)  
> **Tech Stack:** React + Vite + Tailwind CSS + Socket.io

---

## 🚀 Quick Start

### Cho Thành Viên Mới:

```bash
# 1. Clone repository
git clone <repo-url>
cd ChessWeb

# 2. Setup frontend
cd frontend
npm install
cp .env.example .env.local
npm run dev

# ✅ Truy cập: http://localhost:5173
```

### 📖 Đọc Documentation:
- **[SETUP_COMPLETE.md](./SETUP_COMPLETE.md)** ← ĐỌC ĐẦU TIÊN! Setup đã hoàn tất
- **[frontend/README.md](./frontend/README.md)** ← Hướng dẫn code chi tiết
- **[docs/](./docs/)** ← Tổng quan dự án, phân công công việc

---

## 📁 Cấu Trúc Dự Án

```
ChessWeb/
├── 📂 frontend/              # React + Vite app (MAIN)
│   ├── src/                 # Source code
│   ├── public/              # Static assets
│   ├── package.json         # Dependencies
│   └── README.md            # Hướng dẫn code
│
├── 📂 docs/                 # Documentation
│   ├── PROJECT_OVERVIEW.md  # Tổng quan dự án
│   └── WORK_DISTRIBUTION.md # Phân công công việc
│
├── 📂 diagram/              # UML diagrams
├── 📂 frontend-templates/   # Template files (reference)
├── 📄 SETUP_COMPLETE.md     # 🔥 Setup hoàn tất, đọc đầu tiên!
└── 📄 README.md             # File này
```

---

## 🎯 Tính Năng Chính

- ✅ **Authentication & Profile** - Đăng ký, đăng nhập, quản lý hồ sơ
- ♟️ **Ranked Match** - Đấu xếp hạng với Elo rating
- 👥 **Friend Rooms** - Chơi với bạn bè qua code phòng
- 🏆 **Tournaments** - Tạo và tham gia giải đấu
- 🤖 **Play vs Bot** - Chơi với AI (Stockfish)
- 📹 **Replay System** - Xem lại ván đấu

---

## 👥 Phân Công Team

| Thành viên | Module | Pages | Components |
|------------|--------|-------|------------|
| **#1** | Auth & Profile | 6 pages | Button, Input, Card, Avatar |
| **#2** | Ranked Match | 4 pages | Modal, Loader, Badge, Tabs |
| **#3** | Friend Room & Tournament | 8 pages | Header, Sidebar, Footer, MainLayout |
| **#4** | Bot & Replay | 4 pages | ChessBoard, GameClock, MoveHistory, GameControls, GameChat, GameStatus |

**Chi tiết:** Xem [docs/WORK_DISTRIBUTION.md](./docs/WORK_DISTRIBUTION.md)

---

## 📅 Timeline

### **Tuần 1:** Setup + Development
- **Ngày 1-2:** Setup project + Common components ← **BẠN Ở ĐÂY**
- **Ngày 3-7:** Code pages theo phân công

### **Tuần 2:** Integration + Polish
- **Ngày 8-9:** Home & Dashboard pages
- **Ngày 10-12:** Integration, testing, bug fixes
- **Ngày 13-14:** UI polish, final testing, demo prep

---

## 🛠️ Tech Stack

### Frontend:
- **Framework:** React 18 + Vite 5
- **Styling:** Tailwind CSS
- **State:** Zustand + React Query
- **Chess:** Chess.js + React Chessboard
- **Real-time:** Socket.io
- **Forms:** React Hook Form + Zod

### Đã cài đặt: **28 packages**

---

## ⚠️ Lưu Ý Quan Trọng

### Phase 0 Checkpoint (Ngày 1-2):
1. ✅ **Setup hoàn tất** - Bạn đang ở đây
2. 🔄 **Code common components** - Làm tiếp theo
3. ✅ **Merge tất cả components** - Checkpoint
4. 🚀 **Bắt đầu code pages** - Sau checkpoint

### KHÔNG ĐƯỢC code pages trước khi common components merge!

---

## 📚 Documentation

| File | Mục đích |
|------|----------|
| **[SETUP_COMPLETE.md](./SETUP_COMPLETE.md)** | ✅ Setup đã hoàn tất, giải thích chi tiết |
| **[frontend/README.md](./frontend/README.md)** | Hướng dẫn code, conventions, examples |
| [docs/PROJECT_OVERVIEW.md](./docs/PROJECT_OVERVIEW.md) | Tổng quan dự án, architecture |
| [docs/WORK_DISTRIBUTION.md](./docs/WORK_DISTRIBUTION.md) | Phân công chi tiết 4 người |
| [docs/SETUP_GUIDE.md](./docs/SETUP_GUIDE.md) | Hướng dẫn setup ban đầu |
| [docs/TEMPLATES_GUIDE.md](./docs/TEMPLATES_GUIDE.md) | Cách dùng template utilities |

---

## 🔗 Git Workflow

### Branches:
```
main              # Production
└── develop       # Development ← ĐANG Ở ĐÂY
    ├── feature/common-ui-basic
    ├── feature/common-ui-advanced
    ├── feature/common-layout
    ├── feature/common-game
    ├── feature/auth-profile
    ├── feature/ranked
    ├── feature/rooms-tournaments
    └── feature/bot-replay
```

### Quy trình:
1. Pull từ `develop`
2. Tạo feature branch: `git checkout -b feature/common-ui-basic`
3. Code & test
4. Push: `git push origin feature/common-ui-basic`
5. Tạo Pull Request
6. Code review → Merge

---

## ✅ Checklist Cho Mỗi Thành Viên

### Ngay bây giờ:
- [ ] Pull code: `git pull origin develop`
- [ ] Vào frontend: `cd frontend`
- [ ] Install: `npm install`
- [ ] Copy env: `cp .env.example .env.local`
- [ ] Start: `npm run dev`
- [ ] Verify tại `http://localhost:5173`
- [ ] Đọc **[SETUP_COMPLETE.md](./SETUP_COMPLETE.md)**
- [ ] Đọc **[frontend/README.md](./frontend/README.md)**
- [ ] Tạo feature branch
- [ ] Bắt đầu code components!

---

## 📞 Support

- **Daily Standup:** Mỗi sáng 9:00 AM
- **Code Review:** Trong vòng 2 giờ
- **Questions:** Group chat team

---

## 🎉 Let's Build Something Great!

**Start here:** [SETUP_COMPLETE.md](./SETUP_COMPLETE.md)

Chúc team làm việc hiệu quả và hoàn thành dự án thành công! 💪