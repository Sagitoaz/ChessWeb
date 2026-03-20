# 🎨 Hướng Dẫn Theme & Style Guide

## 📋 Tổng Quan

Dự án ChessWeb sử dụng **theme thống nhất** để đảm bảo giao diện nhất quán, dễ bảo trì và dễ thay đổi.

### 🎯 Mục Tiêu
- ✅ Thống nhất màu sắc và style giữa các pages
- ✅ Dễ dàng thay đổi theme toàn bộ app
- ✅ Code clean, dễ đọc, dễ hiểu
- ✅ Dễ giải thích và demo với giảng viên

---

## 🎨 Theme Configuration

### File chính: `src/styles/theme.js`

```javascript
import { THEME } from '@/styles/theme'
```

### Cấu trúc Theme

#### 1. **Màu Nền (`background`)**
```javascript
THEME.background.page     // bg-gray-50 - Nền trang
THEME.background.card     // bg-white - Nền card
THEME.background.hover    // bg-gray-100 - Hover state
THEME.background.active   // bg-gray-200 - Active state
```

#### 2. **Màu Chữ (`text`)**
```javascript
THEME.text.primary        // text-gray-900 - Chữ chính
THEME.text.secondary      // text-gray-600 - Chữ phụ
THEME.text.muted          // text-gray-400 - Chữ mờ
THEME.text.inverse        // text-white - Chữ trên nền tối
```

#### 3. **Màu Chủ Đạo (`primary` - Xanh Dương)**
```javascript
THEME.primary.DEFAULT     // bg-blue-600
THEME.primary.hover       // hover:bg-blue-700
THEME.primary.text        // text-blue-600
THEME.primary.border      // border-blue-600
THEME.primary.light       // bg-blue-50
```

#### 4. **Màu Trạng Thái**
- **Success** (Xanh lá): Thắng, Thành công
- **Error** (Đỏ): Thua, Lỗi
- **Warning** (Vàng): Cảnh báo, Chờ
- **Primary** (Xanh dương): Đang chơi, Chính

#### 5. **Bo Tròn & Shadow**
```javascript
THEME.rounded.DEFAULT     // rounded-lg
THEME.rounded.lg          // rounded-xl
THEME.shadow.DEFAULT      // shadow-md
```

---

## 🏗️ Components Chuẩn

### File chính: `src/components/layout/PageLayout.jsx`

### 1. **PageLayout** - Layout chuẩn cho tất cả pages
```jsx
import PageLayout from '@/components/layout/PageLayout'

<PageLayout
  title="Tên Trang"
  subtitle="Mô tả trang"
  maxWidth="7xl"
>
  {/* Nội dung */}
</PageLayout>
```

**Props:**
- `title`: Tiêu đề trang
- `subtitle`: Mô tả (optional)
- `actions`: Button/controls ở header (optional)
- `maxWidth`: '4xl' | '5xl' | '6xl' | '7xl'
- `noPadding`: Bỏ padding (default: false)

### 2. **PageSection** - Section trong page
```jsx
import { PageSection } from '@/components/layout/PageLayout'

<PageSection
  title="Section Title"
  actions={<Button>Action</Button>}
>
  {/* Nội dung section */}
</PageSection>
```

### 3. **PageCard** - Card chuẩn
```jsx
import { PageCard } from '@/components/layout/PageLayout'

<PageCard title="Card Title">
  {/* Nội dung card */}
</PageCard>
```

### 4. **EmptyState** - Hiển thị khi không có data
```jsx
import { EmptyState } from '@/components/layout/PageLayout'

<EmptyState
  icon="📭"
  title="Không có dữ liệu"
  description="Chưa có giải đấu nào"
  action={<Button>Tạo mới</Button>}
/>
```

### 5. **LoadingState** - Hiển thị khi loading
```jsx
import { LoadingState } from '@/components/layout/PageLayout'

<LoadingState message="Đang tải..." />
```

---

## 📝 Code Style Guide

### ✅ Cấu Trúc File Chuẩn

```jsx
/**
 * ComponentName - Mô tả ngắn gọn
 * 
 * Chức năng chính:
 * - Feature 1
 * - Feature 2
 * 
 * Member X - Module Name
 */

import { useState } from 'react'
import { THEME } from '@/styles/theme'
import { Button, Card } from '@/components/common'

// ==================== CONSTANTS ====================
const MY_CONSTANT = 'value'

// ==================== SUB-COMPONENTS ====================

/**
 * SubComponent - Mô tả
 */
const SubComponent = ({ prop1, prop2 }) => {
  return <div>...</div>
}

// ==================== MAIN COMPONENT ====================

/**
 * MainComponent - Mô tả chi tiết
 */
export default function MainComponent() {
  // ===== STATE =====
  const [state, setState] = useState(initialValue)

  // ===== HANDLERS =====
  const handleAction = () => {
    // Logic
  }

  // ===== RENDER =====
  return (
    <div className={THEME.background.page}>
      {/* Content */}
    </div>
  )
}
```

### ✅ Naming Conventions

1. **Components**: PascalCase (`ProfilePage`, `UserCard`)
2. **Functions**: camelCase (`handleClick`, `fetchData`)
3. **Constants**: UPPER_SNAKE_CASE (`MAX_PLAYERS`, `TIME_CONTROLS`)
4. **Files**: PascalCase for components (`ProfilePage.jsx`)

### ✅ Comments

```jsx
// ===== Section comment (3-5 words) =====

/**
 * Function/Component description
 * Giải thích chi tiết hơn nếu cần
 */

// Inline comment cho dòng phức tạp
```

---

## 🎯 Ví Dụ Thực Tế

### Page Profile (Refactored)

**Trước khi refactor:**
```jsx
<div className="min-h-screen bg-gray-100 pt-10 pb-12">
  <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
    <h2 className="text-base font-bold text-gray-900 mb-4">Stats</h2>
  </div>
</div>
```

**Sau khi refactor:**
```jsx
<div className={`min-h-screen ${THEME.background.page} py-6`}>
  <div className={`${THEME.background.card} ${THEME.rounded.lg} ${THEME.shadow.sm} border ${THEME.border.DEFAULT} p-6`}>
    <h2 className={`text-base font-bold ${THEME.text.primary} mb-4`}>Thống kê</h2>
  </div>
</div>
```

### Lợi Ích

✅ **Trước**: Phải sửa nhiều file nếu muốn đổi màu  
✅ **Sau**: Chỉ sửa `theme.js` là thay đổi toàn bộ app

---

## 🔧 Cách Thay Đổi Theme

### Ví dụ: Đổi màu chủ đạo từ xanh dương sang xanh lá

**File: `src/styles/theme.js`**

```javascript
// TRƯỚC
primary: {
  DEFAULT: 'bg-blue-600',
  text: 'text-blue-600',
  // ...
}

// SAU
primary: {
  DEFAULT: 'bg-green-600',
  text: 'text-green-600',
  // ...
}
```

Tất cả components sử dụng `THEME.primary` sẽ tự động cập nhật! 🎉

---

## 📊 Pages Đã Refactored

- ✅ **ProfilePage** - Hoàn chỉnh theme mới
- ✅ **RoomListPage** - Đã có theme chuẩn
- ✅ **CreateTournamentPage** - Một phần (còn tiếp tục)
- 🟡 **LoginPage** - Đã chuẩn từ đầu
- 🟡 **RegisterPage** - Đã chuẩn từ đầu

### Pages Cần Refactor (Nếu Có Thời Gian)
- TournamentListPage
- RankedLobbyPage
- RankedGamePage
- BotSelectPage
- ReplayListPage

---

## 💡 Tips Cho Vấn Đáp

### Khi Giảng Viên Hỏi Về Theme:

**Q: "Tại sao phải tạo theme system?"**  
**A:** 
- Giúp code dễ maintain và scale
- Thay đổi theme toàn app chỉ bằng 1 file
- Team work hiệu quả hơn - mọi người dùng chung style

**Q: "Làm sao biết dùng màu gì?"**  
**A:** 
- Có file `theme.js` với comments đầy đủ
- Có STATUS_COLORS cho các trạng thái game
- Có component libraries sẵn (PageLayout, PageCard)

**Q: "Code có dễ maintain không?"**  
**A:** 
- Comments rõ ràng từng phần
- Cấu trúc file thống nhất
- Tách nhỏ thành sub-components
- Constants được extract ra ngoài

---

## 🚀 Next Steps

1. ✅ Theme system setup hoàn chỉnh
2. ✅ ProfilePage refactored
3. 🔄 Tiếp tục refactor các pages còn lại
4. 📝 Update documentation khi có thay đổi

---

## 📞 Support

Mọi thắc mắc về theme, liên hệ Member Team để được hỗ trợ!
