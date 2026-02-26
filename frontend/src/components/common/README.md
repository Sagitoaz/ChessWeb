# Common Components Documentation

Bộ các component UI có thể tái sử dụng cho dự án ChessWeb.

## 📦 Components

### 1. **Loader Component** (`Loader.jsx`)

Component hiển thị trạng thái loading với 2 loại: Spinner và Skeleton.

#### ✨ Features:
- **Spinner**: Animation quay tròn với 3 size (sm, md, lg)
- **Skeleton**: Placeholder loading với nhiều variant
- Hỗ trợ dark mode
- Có thể hiển thị text loading

#### 📖 Usage:

```jsx
import { Loader, Spinner, Skeleton } from '@/components/common'

// Spinner
<Loader type="spinner" size="md" text="Loading..." />
// hoặc
<Spinner size="lg" text="Please wait..." />

// Skeleton
<Loader type="skeleton" variant="text" count={3} />
// hoặc
<Skeleton variant="title" width="60%" />
<Skeleton variant="avatar" />
<Skeleton variant="thumbnail" />
<Skeleton circle height="60px" />
```

#### 📝 Props:

**Loader:**
- `type`: `'spinner' | 'skeleton'` - Loại loader (default: 'spinner')

**Spinner:**
- `size`: `'sm' | 'md' | 'lg'` - Kích thước spinner
- `text`: `string` - Text hiển thị dưới spinner

**Skeleton:**
- `variant`: `'text' | 'title' | 'avatar' | 'thumbnail' | 'rectangular'`
- `width`: `string` - Chiều rộng (default: '100%')
- `height`: `string` - Chiều cao
- `count`: `number` - Số lượng skeleton (default: 1)
- `circle`: `boolean` - Hiển thị dạng circle
- `className`: `string` - Custom CSS classes

---

### 2. **Modal Component** (`Modal.jsx`)

Component modal overlay với backdrop và animations.

#### ✨ Features:
- Backdrop blur effect
- Click backdrop để đóng (có thể tắt)
- ESC key để đóng
- Multiple sizes: sm, md, lg, xl, 2xl, full
- Smooth animations (fade & slide)
- Auto scroll lock khi modal mở
- Custom header, body và footer
- Accessibility support (ARIA labels)

#### 📖 Usage:

```jsx
import { Modal } from '@/components/common'
import { useState } from 'react'

function MyComponent() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <button onClick={() => setIsOpen(true)}>Open Modal</button>
      
      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title="Confirm Action"
        size="md"
        footer={
          <>
            <button onClick={() => setIsOpen(false)}>Cancel</button>
            <button onClick={handleConfirm}>Confirm</button>
          </>
        }
      >
        <p>Are you sure you want to proceed?</p>
      </Modal>
    </>
  )
}
```

#### 📝 Props:

- `isOpen`: `boolean` **(required)** - Trạng thái mở/đóng
- `onClose`: `function` **(required)** - Callback khi đóng modal
- `title`: `string` - Tiêu đề modal
- `children`: `ReactNode` **(required)** - Nội dung modal
- `footer`: `ReactNode` - Custom footer (buttons, actions)
- `size`: `'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full'` - Kích thước modal
- `closeOnBackdropClick`: `boolean` - Đóng khi click backdrop (default: true)
- `closeOnEsc`: `boolean` - Đóng khi nhấn ESC (default: true)
- `showCloseButton`: `boolean` - Hiển thị nút đóng (default: true)
- `className`: `string` - Custom CSS classes

---

### 3. **Notification Component** (`Notification.jsx`)

Toast notification system với Context API.

#### ✨ Features:
- 4 loại: success, error, warning, info
- Auto close sau thời gian định sẵn
- 6 vị trí hiển thị: top/bottom + left/center/right
- Smooth animations (slide in/out)
- Manual close button
- Icon tự động theo type
- Dark mode support
- Multiple notifications queue

#### 📖 Usage:

**Bước 1: Wrap app với NotificationProvider**

```jsx
// main.jsx hoặc App.jsx
import { NotificationProvider } from '@/components/common'

function App() {
  return (
    <NotificationProvider position="top-right">
      {/* Your app components */}
    </NotificationProvider>
  )
}
```

**Bước 2: Sử dụng trong component**

```jsx
import { useNotification } from '@/components/common'

function MyComponent() {
  const { showNotification } = useNotification()

  const handleSuccess = () => {
    showNotification({
      type: 'success',
      title: 'Success!',
      message: 'Your action was completed successfully.',
      duration: 5000, // 5 seconds
    })
  }

  const handleError = () => {
    showNotification({
      type: 'error',
      title: 'Error!',
      message: 'Something went wrong.',
      duration: 0, // No auto-close
    })
  }

  return (
    <>
      <button onClick={handleSuccess}>Show Success</button>
      <button onClick={handleError}>Show Error</button>
    </>
  )
}
```

#### 📝 Props:

**NotificationProvider:**
- `position`: `'top-right' | 'top-left' | 'top-center' | 'bottom-right' | 'bottom-left' | 'bottom-center'`

**showNotification() params:**
- `type`: `'success' | 'error' | 'warning' | 'info'` - Loại notification
- `title`: `string` - Tiêu đề (optional)
- `message`: `string` - Nội dung thông báo
- `duration`: `number` - Thời gian tự đóng (ms), 0 = không tự đóng (default: 5000)

---

### 4. **Dropdown Component** (`Dropdown.jsx`)

Select dropdown với search functionality và keyboard navigation.

#### ✨ Features:
- Search/filter options
- Keyboard navigation (Arrow keys, Enter, ESC)
- Click outside to close
- Multiple sizes: sm, md, lg
- Disabled state
- Error state
- Option descriptions
- Disabled individual options
- Selected indicator (checkmark)
- Dark mode support

#### 📖 Usage:

```jsx
import { Dropdown } from '@/components/common'
import { useState } from 'react'

function MyComponent() {
  const [value, setValue] = useState('')

  const options = [
    { 
      value: '1', 
      label: 'Option 1', 
      description: 'This is the first option' 
    },
    { 
      value: '2', 
      label: 'Option 2' 
    },
    { 
      value: '3', 
      label: 'Option 3', 
      disabled: true 
    },
  ]

  return (
    <Dropdown
      label="Select an option"
      options={options}
      value={value}
      onChange={setValue}
      searchable
      placeholder="Choose..."
      size="md"
    />
  )
}
```

#### 📝 Props:

- `options`: `Array<{value, label, description?, disabled?}>` **(required)**
  ```typescript
  {
    value: string | number,      // Unique value
    label: string,                // Display text
    description?: string,         // Optional description
    disabled?: boolean           // Disable this option
  }
  ```
- `value`: `string | number` - Selected value
- `onChange`: `function` - Callback khi chọn option: `(value) => void`
- `placeholder`: `string` - Placeholder text (default: 'Select an option')
- `label`: `string` - Label hiển thị trên dropdown
- `error`: `string` - Error message (nếu có)
- `disabled`: `boolean` - Disable toàn bộ dropdown
- `searchable`: `boolean` - Enable search/filter (default: false)
- `className`: `string` - Custom CSS classes
- `size`: `'sm' | 'md' | 'lg'` - Kích thước dropdown

---

## 🎨 Styling & Theming

Tất cả components đều:
- Hỗ trợ **Dark Mode** tự động
- Sử dụng **Tailwind CSS**
- Có **animations** mượt mà
- **Responsive** trên mọi màn hình
- **Accessible** với ARIA labels

### Custom Animations

Các animations được định nghĩa trong `styles/global.css`:

- `fadeIn` - Fade in effect
- `slideUp` - Slide up from bottom
- `slideDown` - Slide down from top
- `slideInRight` - Slide in from right
- `slideOutRight` - Slide out to right

---

## 🔧 Installation & Setup

### 1. Import Components

```jsx
import {
  Loader,
  Spinner,
  Skeleton,
  Modal,
  Dropdown,
  NotificationProvider,
  useNotification,
} from '@/components/common'
```

### 2. Setup NotificationProvider (nếu sử dụng notifications)

Trong `main.jsx`:

```jsx
import { NotificationProvider } from '@/components/common'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <NotificationProvider position="top-right">
      <App />
    </NotificationProvider>
  </React.StrictMode>
)
```

### 3. Ensure Tailwind Config

Đảm bảo `tailwind.config.js` có:

```js
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class', // hoặc 'media'
  // ...
}
```

---

## 📚 Example Demo

Xem file demo đầy đủ tại:
```
src/pages/demo/CommonComponentsDemo.jsx
```

Để chạy demo:

1. Import vào routes:
```jsx
import CommonComponentsDemo from '@/pages/demo/CommonComponentsDemo'
```

2. Thêm route:
```jsx
<Route path="/demo/components" element={<CommonComponentsDemo />} />
```

3. Truy cập: `http://localhost:5173/demo/components`

---

## 🎯 Best Practices

### Loader
```jsx
// ✅ Good: Sử dụng skeleton cho loading content
<Skeleton variant="text" count={5} />

// ❌ Bad: Không dùng spinner cho loading content
<Spinner /> // User không biết đang load gì
```

### Modal
```jsx
// ✅ Good: Có footer với actions
<Modal
  isOpen={isOpen}
  onClose={handleClose}
  footer={<button>OK</button>}
>
  Content
</Modal>

// ⚠️ OK: Nhưng nên có cách đóng modal
<Modal isOpen={isOpen}>
  Content
</Modal>
```

### Notification
```jsx
// ✅ Good: Clear và concise message
showNotification({
  type: 'success',
  title: 'Profile Updated',
  message: 'Your profile has been saved.',
})

// ❌ Bad: Message quá dài
showNotification({
  message: 'Lorem ipsum dolor sit amet...[500 words]',
})
```

### Dropdown
```jsx
// ✅ Good: Options có label rõ ràng
const options = [
  { value: 'beginner', label: 'Beginner (< 1200 ELO)' },
  { value: 'intermediate', label: 'Intermediate (1200-1800)' },
]

// ❌ Bad: Value không semantic
const options = [
  { value: '1', label: 'Beginner' },
  { value: '2', label: 'Intermediate' },
]
```

---

## 🐛 Common Issues

### Notification không hiển thị?
➡️ Đảm bảo đã wrap app với `<NotificationProvider>`

### Modal không đóng khi click ESC?
➡️ Kiểm tra prop `closeOnEsc={true}` (default là true)

### Dropdown options bị truncate?
➡️ Thêm width cho container hoặc dùng size="lg"

### Dark mode không hoạt động?
➡️ Kiểm tra `tailwind.config.js` có `darkMode: 'class'`

---

## 📝 TODO / Future Enhancements

- [ ] Button component với variants
- [ ] Input component với validation
- [ ] Card component
- [ ] Avatar component
- [ ] Badge component
- [ ] Tabs component
- [ ] Tooltip component
- [ ] Popover component

---

## 🤝 Contributing

Nếu thêm component mới:
1. Tạo file trong `src/components/common/`
2. Export trong `src/components/common/index.js`
3. Thêm vào demo page
4. Update README này

---

## 📄 License

MIT License - ChessWeb Project
