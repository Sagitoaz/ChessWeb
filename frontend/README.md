# 🚀 ChessWeb Frontend - SETUP HOÀN TẤT!

## ✅ BƯỚC 1 GIAI ĐOẠN 0 ĐÃ HOÀN THÀNH

Thành viên 1 đã setup xong môi trường phát triển cho cả team! 🎉

---

## 📁 Cấu Trúc Thư Mục Đã Được Tạo

```
frontend/
├── 📄 Config Files (Root level)
│   ├── package.json          ✅ Dependencies đã config
│   ├── vite.config.js        ✅ Vite + Path aliases
│   ├── tailwind.config.js    ✅ Custom theme
│   ├── postcss.config.js     ✅ PostCSS
│   ├── .eslintrc.cjs         ✅ ESLint rules
│   ├── .prettierrc           ✅ Code formatting
│   ├── .gitignore            ✅ Git ignore
│   ├── .env.example          ✅ Environment template
│   └── index.html            ✅ Entry HTML
│
├── 📂 public/                ✅ Static assets
│   └── chess-icon.svg
│
└── 📂 src/
    ├── main.jsx              ✅ React entry point
    ├── App.jsx               ✅ Root component (React Query + Router)
    │
    ├── 📂 components/        ✅ Folders created
    │   ├── common/           → Thành viên 1, 2 sẽ tạo
    │   ├── layout/           → Thành viên 3 sẽ tạo
    │   └── game/             → Thành viên 4 sẽ tạo
    │
    ├── 📂 pages/             ✅ Folders created
    │   ├── auth/             → Thành viên 1
    │   ├── profile/          → Thành viên 1
    │   ├── ranked/           → Thành viên 2
    │   ├── rooms/            → Thành viên 3
    │   ├── tournaments/      → Thành viên 3
    │   ├── bot/              → Thành viên 4
    │   ├── replay/           → Thành viên 4
    │   └── home/             → Chia đều sau
    │
    ├── 📂 routes/            ✅ Route config
    │   └── index.jsx
    │
    ├── 📂 services/          ✅ Services sẵn sàng
    │   ├── api.js            ✅ Axios + Mock API
    │   └── socketService.js  ✅ WebSocket manager
    │
    ├── 📂 hooks/             ✅ Custom hooks
    │   └── index.js          ✅ useAuth, useTimer, useWebSocket...
    │
    ├── 📂 utils/             ✅ Utilities
    │   ├── constants.js      ✅ API endpoints, constants
    │   └── chessLogic.js     ✅ Chess.js wrapper
    │
    ├── 📂 store/             ✅ State management
    │   └── index.js          ✅ Zustand stores
    │
    ├── 📂 mocks/             ✅ Mock data
    │   └── users.json
    │
    └── 📂 styles/            ✅ Global styles
        └── global.css        ✅ Tailwind + custom CSS
```

---

## 🎯 BƯỚC TIẾP THEO CHO TEAM

### 📋 Checklist Cho Tất Cả Thành Viên

#### 1️⃣ Clone và Setup (5-10 phút)

```bash
# 1. Pull code mới nhất
git pull origin develop

# 2. Vào thư mục frontend
cd frontend

# 3. Cài đặt dependencies (có thể mất 2-3 phút)
npm install

# 4. Copy environment file
cp .env.example .env.local

# 5. Chạy dev server
npm run dev
```

**Kết quả mong đợi:**
- Terminal hiển thị: `VITE v5.1.0  ready in XXX ms`
- Browser tự động mở: `http://localhost:5173`
- Màn hình hiển thị: React app đang chạy (có thể là trang trắng hoặc error - OK!)

#### 2️⃣ Verify Setup (2-3 phút)

```bash
# Test ESLint
npm run lint

# Test build (optional)
npm run build
```

**✅ Setup thành công nếu:**
- `npm run dev` chạy không lỗi
- `npm run lint` không có error nghiêm trọng
- Browser mở được localhost:5173

---

## 🔥 BẮT ĐẦU BƯỚC 2: CODE COMMON COMPONENTS

> ⏰ **Timeline:** Bắt đầu ngay sau khi tất cả verify setup xong

### 🎨 Phân Công Lại Rõ Ràng:

#### **Thành viên 1:** Basic UI Components
📂 **Branch:** `feature/common-ui-basic`

**Tasks:**
1. Tạo branch từ develop:
   ```bash
   git checkout develop
   git pull
   git checkout -b feature/common-ui-basic
   ```

2. Tạo các files trong `src/components/common/`:
   - `Button.jsx` - Nút bấm (primary, secondary, outline, danger, ghost)
   - `Input.jsx` - Input field (text, password, email với validation)
   - `Card.jsx` - Container component
   - `Avatar.jsx` - User avatar với fallback

3. Test components:
   - Tạo file `src/pages/ComponentDemo.jsx` để demo
   - Import và test từng component

4. Push và tạo PR:
   ```bash
   git add .
   git commit -m "feat: add basic UI components (Button, Input, Card, Avatar)"
   git push origin feature/common-ui-basic
   ```
   
5. Tạo Pull Request vào `develop` trên GitHub

---

#### **Thành viên 2:** Advanced UI Components
📂 **Branch:** `feature/common-ui-advanced`

**Tasks:**
1. Tạo branch:
   ```bash
   git checkout develop
   git pull
   git checkout -b feature/common-ui-advanced
   ```

2. Tạo các files trong `src/components/common/`:
   - `Modal.jsx` - Modal dialog với backdrop
   - `Loader.jsx` - Spinner + Skeleton loader
   - `Badge.jsx` - Status badges
   - `Tabs.jsx` - Tab navigation

3. Test và push tương tự Thành viên 1

---

#### **Thành viên 3:** Layout Components
📂 **Branch:** `feature/common-layout`

**Tasks:**
1. Tạo branch:
   ```bash
   git checkout develop
   git pull
   git checkout -b feature/common-layout
   ```

2. Tạo các files trong `src/components/layout/`:
   - `Header.jsx` - Navbar với user menu
   - `Sidebar.jsx` - Side navigation (desktop)
   - `Footer.jsx` - Footer với links
   - `MainLayout.jsx` - Layout wrapper

3. Test và push

---

#### **Thành viên 4:** Game Core Components
📂 **Branch:** `feature/common-game`

**Tasks:**
1. Tạo branch:
   ```bash
   git checkout develop
   git pull
   git checkout -b feature/common-game
   ```

2. Tạo các files trong `src/components/game/`:
   - `ChessBoard.jsx` - Wrapper cho react-chessboard
   - `MoveHistory.jsx` - Hiển thị lịch sử nước đi
   - `GameClock.jsx` - Đồng hồ đếm ngược
   - `GameControls.jsx` - Resign, Draw, Pause buttons
   - `GameChat.jsx` - Chat box trong game
   - `GameStatus.jsx` - Hiển thị check, checkmate, turn

3. Test với chess.js và react-chessboard

---

## 📝 Code Guidelines

### Import Style (Dùng path aliases)
```javascript
// ✅ GOOD
import { Button, Input } from '@components/common'
import { apiCall } from '@services/api'
import { useAuth } from '@hooks'

// ❌ BAD
import Button from '../../components/common/Button'
```

### Component Template
```javascript
// src/components/common/Button.jsx
export default function Button({ 
  children, 
  variant = 'primary', 
  onClick,
  ...props 
}) {
  return (
    <button
      className={`btn btn-${variant}`}
      onClick={onClick}
      {...props}
    >
      {children}
    </button>
  )
}
```

### Test Component
```javascript
// src/pages/ComponentDemo.jsx (temporary)
import { Button, Input, Card } from '@components/common'

export default function ComponentDemo() {
  return (
    <div className="p-8 space-y-4">
      <h1>Component Demo</h1>
      
      <Card>
        <h2>Buttons</h2>
        <Button variant="primary">Primary</Button>
        <Button variant="secondary">Secondary</Button>
      </Card>
      
      <Card>
        <h2>Inputs</h2>
        <Input placeholder="Enter text" />
        <Input type="password" placeholder="Password" />
      </Card>
    </div>
  )
}
```

---

## ⚠️ LƯU Ý QUAN TRỌNG

### 1. Không Code Pages Trước Khi Components Merge!
- ❌ KHÔNG tạo LoginPage, RankedGamePage, etc. bây giờ
- ✅ CHỈ tạo common components

### 2. Code Review Workflow
```
1. Code xong component
2. Test locally: npm run dev
3. Push branch
4. Tạo PR vào develop
5. Tag 1 thành viên khác để review
6. Fix nếu có feedback
7. Đợi approve
8. Merge vào develop
```

### 3. Git Commands Cần Nhớ
```bash
# Xem branch hiện tại
git branch

# Chuyển về develop
git checkout develop

# Pull code mới
git pull origin develop

# Tạo branch mới
git checkout -b feature/your-branch-name

# Check status
git status

# Add files
git add .

# Commit
git commit -m "feat: add something"

# Push
git push origin feature/your-branch-name

# Xem diff
git diff
```

---

## 🆘 Troubleshooting

### Issue: `npm install` lỗi
```bash
# Xóa và install lại
rm -rf node_modules package-lock.json
npm install
```

### Issue: Port 5173 đã sử dụng
```bash
# Kill process hoặc đổi port trong vite.config.js
# Hoặc dùng:
npm run dev -- --port 5174
```

### Issue: Import path alias không work
```bash
# Restart VS Code
# Hoặc restart dev server
```

### Issue: ESLint warnings
```bash
# Auto fix
npm run lint:fix
```

---

## 📞 Liên Hệ

- **Daily Standup:** Mỗi sáng 9:00 AM
- **Code Review:** Trong vòng 2 giờ khi có PR
- **Hỏi đáp:** Group chat team

---

## ✅ Checklist Cho Thành Viên 1

- [x] Init Vite project
- [x] Setup Tailwind CSS
- [x] Config ESLint + Prettier
- [x] Install dependencies
- [x] Setup folder structure
- [x] Copy utility files
- [x] Setup routes
- [x] Create stores
- [x] Push to develop
- [ ] Hướng dẫn team pull và setup
- [ ] Verify tất cả thành viên có thể chạy
- [ ] Bắt đầu code components của mình

---

**🎉 SETUP HOÀN TẤT! Sẵn sàng code! 🚀**
