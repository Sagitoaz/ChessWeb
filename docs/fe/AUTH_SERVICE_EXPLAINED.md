# 📚 Auth Service - Giải Thích Chi Tiết

> **Tài liệu này giải thích từng dòng code trong hệ thống Authentication của ChessWeb**

---

## 📑 Mục Lục

1. [Axios là gì?](#axios-là-gì)
2. [File api.js - Axios Setup](#file-apijs---axios-setup)
3. [File authService.js - Auth API Calls](#file-authservicejs---auth-api-calls)
4. [File useAuth.js - React Hook](#file-useauthjs---react-hook)
5. [Luồng hoạt động tổng thể](#luồng-hoạt-động-tổng-thể)
6. [Ví dụ sử dụng thực tế](#ví-dụ-sử-dụng-thực-tế)

---

## 🔍 Axios là gì?

### Định nghĩa

**Axios** là một thư viện JavaScript để thực hiện HTTP requests (gọi API) từ trình duyệt hoặc Node.js.

### Tại sao dùng Axios thay vì Fetch API?

| Feature | Axios | Fetch API |
|---------|-------|-----------|
| **JSON parsing** | Tự động | Phải `.then(res => res.json())` |
| **Request/Response interceptors** | ✅ Có | ❌ Không |
| **Timeout** | ✅ Có | ❌ Không (phải tự implement) |
| **Error handling** | ✅ Tốt hơn | ⚠️ Phải check `response.ok` |
| **Cancel requests** | ✅ Có | ❌ Khó khăn |
| **Browser support** | ✅ IE11+ | ⚠️ Cần polyfill |

### Cài đặt Axios

```bash
npm install axios
```

### Ví dụ cơ bản

```javascript
import axios from 'axios'

// GET request
const response = await axios.get('https://api.example.com/users')
console.log(response.data) // Tự động parse JSON

// POST request
const newUser = await axios.post('https://api.example.com/users', {
  name: 'John',
  email: 'john@example.com'
})

// With headers
const data = await axios.get('https://api.example.com/profile', {
  headers: {
    'Authorization': 'Bearer token123'
  }
})
```

### So sánh Axios vs Fetch

**Fetch API:**
```javascript
// Phải làm nhiều bước
fetch('https://api.example.com/users', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ name: 'John' })
})
  .then(response => {
    if (!response.ok) {
      throw new Error('Network error')
    }
    return response.json()
  })
  .then(data => console.log(data))
  .catch(error => console.error(error))
```

**Axios:**
```javascript
// Ngắn gọn hơn nhiều
try {
  const { data } = await axios.post('https://api.example.com/users', {
    name: 'John'
  })
  console.log(data)
} catch (error) {
  console.error(error)
}
```

---

## 📄 File api.js - Axios Setup

### Mục đích

File này tạo một **axios instance** được cấu hình sẵn để sử dụng trong toàn bộ ứng dụng.

### Code chi tiết

#### 1. Import và tạo instance

```javascript
import axios from 'axios'
import { API_URL, USE_MOCK } from '../utils/constants'

// Create axios instance
const api = axios.create({
  baseURL: API_URL,           // URL gốc của API (VD: http://localhost:3000/api)
  timeout: 10000,             // Timeout sau 10 giây
  headers: {
    'Content-Type': 'application/json',  // Mặc định gửi JSON
  },
})
```

**Giải thích:**
- `axios.create()` - Tạo một instance mới với config riêng
- `baseURL` - URL cơ sở, khi gọi `/users` thực tế sẽ gọi `http://localhost:3000/api/users`
- `timeout` - Nếu request > 10s thì tự động fail
- `headers` - Header mặc định cho mọi request

#### 2. Request Interceptor - Thêm Token

```javascript
api.interceptors.request.use(
  (config) => {
    // Lấy token từ localStorage
    const token = localStorage.getItem('token')
    
    // Nếu có token, thêm vào Authorization header
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    
    return config  // Trả về config đã modify
  },
  (error) => {
    // Nếu có lỗi trước khi gửi request
    return Promise.reject(error)
  }
)
```

**Interceptor là gì?**
- Là một hàm chạy **trước** mỗi request/response
- Giống như middleware trong Express

**Luồng hoạt động:**
```
1. Component gọi axios.get('/users')
2. Request Interceptor chạy
3. Kiểm tra localStorage có token không
4. Nếu có → Thêm header: "Authorization: Bearer abc123..."
5. Gửi request đến server
```

**Tại sao cần?**
- Tự động thêm token vào **MỌI** request
- Không phải viết lại `headers: { Authorization }` ở mọi nơi

#### 3. Response Interceptor - Xử lý lỗi & Refresh Token

```javascript
api.interceptors.response.use(
  (response) => response.data,  // Nếu thành công, trả về chỉ phần data
  async (error) => {
    const originalRequest = error.config  // Lưu lại request gốc

    // Nếu lỗi 401 (Unauthorized) và chưa retry
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true  // Đánh dấu đã retry

      try {
        // Lấy refresh token
        const refreshToken = localStorage.getItem('refreshToken')
        
        // Gọi API refresh token
        const response = await axios.post(`${API_URL}/auth/refresh`, {
          refreshToken,
        })

        const { token } = response.data
        
        // Lưu token mới
        localStorage.setItem('token', token)

        // Thêm token mới vào request gốc
        originalRequest.headers.Authorization = `Bearer ${token}`
        
        // Retry request gốc với token mới
        return api(originalRequest)
        
      } catch (refreshError) {
        // Refresh token cũng fail → Logout user
        localStorage.removeItem('token')
        localStorage.removeItem('refreshToken')
        window.location.href = '/login'
        return Promise.reject(refreshError)
      }
    }

    // Lỗi khác thì reject bình thường
    return Promise.reject(error)
  }
)
```

**Giải thích chi tiết:**

**Bước 1: Response thành công**
```javascript
(response) => response.data
```
- Thay vì trả về `{ data: {...}, status: 200, headers: {...} }`
- Chỉ trả về `{...}` (phần data)
- → Code gọn hơn, không phải `.data` mỗi lần

**Bước 2: Response lỗi 401**
```
Kịch bản:
1. User đăng nhập → Có token (expired sau 1 giờ)
2. Sau 1 giờ, token hết hạn
3. User click nút → Gọi API → Server trả 401
4. Interceptor bắt lỗi 401
5. Tự động gọi /auth/refresh để lấy token mới
6. Retry request ban đầu với token mới
7. User không biết gì, vẫn thấy data
```

**Bước 3: Refresh token fail**
```
Kịch bản:
1. Refresh token cũng hết hạn hoặc invalid
2. Không thể lấy token mới
3. Xóa tất cả tokens
4. Redirect về /login
5. User phải đăng nhập lại
```

**originalRequest._retry là gì?**
- Đánh dấu request đã được retry chưa
- Tránh **infinite loop**: 401 → refresh → 401 → refresh → ...

#### 4. Mock API - Development Mode

```javascript
const mockAPI = {
  async login(credentials) {
    // Giả lập network delay
    await new Promise((resolve) => setTimeout(resolve, 1000))
    
    return {
      user: {
        id: 1,
        username: credentials.username,
        email: 'test@example.com',
        displayName: 'Test User',
        avatarUrl: 'https://i.pravatar.cc/150?img=1',
      },
      token: 'mock-jwt-token-' + Date.now(),
      refreshToken: 'mock-refresh-token-' + Date.now(),
    }
  },

  async register(userData) {
    await new Promise((resolve) => setTimeout(resolve, 1000))
    return {
      user: {
        id: 2,
        username: userData.username,
        email: userData.email,
        displayName: userData.username,
        avatarUrl: 'https://i.pravatar.cc/150?img=2',
      },
      token: 'mock-jwt-token-' + Date.now(),
      refreshToken: 'mock-refresh-token-' + Date.now(),
    }
  },
  
  // ... các mock khác
}
```

**Tại sao cần Mock API?**
- Backend chưa sẵn sàng → Frontend vẫn code được
- Testing không cần server thật
- Demo nhanh chóng

#### 5. API Call Wrapper

```javascript
export const apiCall = async (method, endpoint, data = null) => {
  // Nếu bật chế độ mock
  if (USE_MOCK) {
    console.log(`[MOCK API] ${method.toUpperCase()} ${endpoint}`, data)
    
    // Route đến mock function phù hợp
    if (endpoint.includes('/auth/login')) return mockAPI.login(data)
    if (endpoint.includes('/auth/register')) return mockAPI.register(data)
    // ... các route khác
    
    return { message: 'Mock API response', data }
  }

  // Nếu dùng API thật
  switch (method.toLowerCase()) {
    case 'get':
      return api.get(endpoint, { params: data })
    case 'post':
      return api.post(endpoint, data)
    case 'put':
      return api.put(endpoint, data)
    case 'patch':
      return api.patch(endpoint, data)
    case 'delete':
      return api.delete(endpoint, { data })
    default:
      throw new Error(`Unsupported method: ${method}`)
  }
}
```

**Giải thích:**
- Một function để gọi API theo nhiều method khác nhau
- Tự động chuyển giữa mock và real API
- Syntax đơn giản: `apiCall('POST', '/auth/login', { username, password })`

---

## 📄 File authService.js - Auth API Calls

### Mục đích

Tập trung **TẤT CẢ** logic liên quan đến authentication API ở một chỗ.

### Code chi tiết

#### 1. Login Method

```javascript
async login(credentials) {
  try {
    // Gọi API login
    const response = await apiCall('POST', API_ENDPOINTS.LOGIN, credentials)
    
    // Lưu tokens vào localStorage
    if (response.token) {
      localStorage.setItem('token', response.token)
    }
    if (response.refreshToken) {
      localStorage.setItem('refreshToken', response.refreshToken)
    }
    
    return response
  } catch (error) {
    throw this.handleError(error)
  }
}
```

**Input:**
```javascript
{
  username: 'john_doe',    // hoặc email
  password: 'password123'
}
```

**Output (thành công):**
```javascript
{
  user: {
    id: 1,
    username: 'john_doe',
    email: 'john@example.com',
    displayName: 'John Doe',
    avatarUrl: 'https://...'
  },
  token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  refreshToken: 'refresh-token-string...'
}
```

**Luồng hoạt động:**
```
1. User submit form login
2. Component gọi authService.login({ username, password })
3. authService gọi apiCall('POST', '/auth/login', ...)
4. apiCall gọi api.post('/auth/login', ...)
5. Request Interceptor thêm token (nếu có)
6. Server xử lý và trả về user + tokens
7. Response Interceptor trả về chỉ phần .data
8. authService lưu tokens vào localStorage
9. Return user data về component
10. Component redirect đến dashboard
```

**Tại sao lưu vào localStorage?**
- Khi user refresh page, không mất session
- Token được tự động thêm vào mọi request tiếp theo

#### 2. Register Method

```javascript
async register(userData) {
  try {
    const response = await apiCall('POST', API_ENDPOINTS.REGISTER, userData)
    
    // Auto login sau khi register
    if (response.token) {
      localStorage.setItem('token', response.token)
    }
    if (response.refreshToken) {
      localStorage.setItem('refreshToken', response.refreshToken)
    }
    
    return response
  } catch (error) {
    throw this.handleError(error)
  }
}
```

**Input:**
```javascript
{
  username: 'john_doe',
  email: 'john@example.com',
  password: 'Password123!',
  displayName: 'John Doe'  // optional
}
```

**Flow:**
```
Register → Server tạo user + tạo tokens → Lưu tokens → Auto login
```

#### 3. Logout Method

```javascript
async logout() {
  try {
    // Gọi API logout để invalidate token trên server
    await apiCall('POST', API_ENDPOINTS.LOGOUT)
  } catch (error) {
    // Vẫn logout ở client dù API lỗi
    console.error('Logout API error:', error)
  } finally {
    // Clear tokens từ localStorage
    localStorage.removeItem('token')
    localStorage.removeItem('refreshToken')
    localStorage.removeItem('user')
  }
}
```

**Tại sao có `finally`?**
- Dù API logout fail, vẫn phải xóa token ở client
- Không để user "застрял" (stuck) khi server lỗi

**Best practice:**
```javascript
try {
  // Logout trên server
} catch {
  // Không quan trọng lắm
} finally {
  // QUAN TRỌNG: Phải xóa ở client
}
```

#### 4. Refresh Token Method

```javascript
async refreshToken(refreshToken) {
  try {
    const response = await apiCall('POST', API_ENDPOINTS.REFRESH_TOKEN, {
      refreshToken,
    })
    
    // Cập nhật token mới
    if (response.token) {
      localStorage.setItem('token', response.token)
    }
    if (response.refreshToken) {
      localStorage.setItem('refreshToken', response.refreshToken)
    }
    
    return response
  } catch (error) {
    // Token refresh failed - force logout
    localStorage.removeItem('token')
    localStorage.removeItem('refreshToken')
    localStorage.removeItem('user')
    throw this.handleError(error)
  }
}
```

**Access Token vs Refresh Token:**

| | Access Token | Refresh Token |
|---|--------------|---------------|
| **Thời gian sống** | Ngắn (15 phút - 1 giờ) | Dài (7-30 ngày) |
| **Dùng để** | Gọi API | Lấy access token mới |
| **Gửi kèm** | Mọi request | Chỉ khi refresh |
| **Nếu bị đánh cắp** | Chỉ dùng được 15 phút | Nguy hiểm hơn |

**Tại sao cần 2 loại token?**
- **Bảo mật**: Access token ngắn hạn, nếu lộ thì damage nhỏ
- **UX tốt**: User không phải login lại mỗi 15 phút
- **Cân bằng**: Bảo mật + Tiện lợi

**Flow:**
```
1. Login → Có cả 2 tokens
2. Sau 15 phút → Access token hết hạn
3. Gọi API → 401 Unauthorized
4. Response Interceptor tự động:
   - Gọi /auth/refresh với refresh token
   - Lấy access token mới
   - Retry request ban đầu
5. User không biết gì cả
```

#### 5. Forgot Password Method

```javascript
async forgotPassword(email) {
  try {
    const response = await apiCall('POST', API_ENDPOINTS.FORGOT_PASSWORD, { email })
    return response
  } catch (error) {
    throw this.handleError(error)
  }
}
```

**Flow:**
```
1. User nhập email
2. Server gửi email với reset link
   → Link chứa token: https://chessweb.com/reset-password?token=abc123
3. User click link
4. Frontend hiển thị form nhập password mới
5. Gọi resetPassword(token, newPassword)
```

#### 6. Change Password Method

```javascript
async changePassword(passwords) {
  try {
    const response = await apiCall('PUT', API_ENDPOINTS.CHANGE_PASSWORD, passwords)
    return response
  } catch (error) {
    throw this.handleError(error)
  }
}
```

**Input:**
```javascript
{
  oldPassword: 'OldPass123',
  newPassword: 'NewPass456'
}
```

**Khác với resetPassword:**
- `resetPassword` - Khi **quên** mật khẩu (có token từ email)
- `changePassword` - Khi **đã đăng nhập** (cần password cũ)

#### 7. Check Username/Email Availability

```javascript
async checkUsernameAvailability(username) {
  try {
    const response = await apiCall('POST', '/auth/check-username', { username })
    return response
  } catch (error) {
    throw this.handleError(error)
  }
}
```

**Tại sao cần?**
- Real-time validation khi user đang typing
- UX tốt hơn: "Username đã tồn tại" ngay khi blur khỏi input

**Sử dụng với debounce:**
```javascript
import { useDebounce } from '../hooks'

const [username, setUsername] = useState('')
const debouncedUsername = useDebounce(username, 500)  // Đợi 500ms

useEffect(() => {
  if (debouncedUsername.length >= 3) {
    checkUsernameAvailable(debouncedUsername)
  }
}, [debouncedUsername])
```

**Tại sao debounce?**
```
Không debounce:
User gõ "j" → API call
User gõ "o" → API call
User gõ "h" → API call
User gõ "n" → API call
→ 4 API calls!

Có debounce (500ms):
User gõ "john" nhanh → Đợi 500ms → 1 API call
→ Chỉ 1 API call!
```

#### 8. Error Handler

```javascript
handleError(error) {
  if (error.response) {
    // Server responded với error status (400, 401, 500...)
    const message = error.response.data?.message 
                 || error.response.data?.error 
                 || 'An error occurred'
    const statusCode = error.response.status
    
    const err = new Error(message)
    err.statusCode = statusCode
    err.data = error.response.data
    
    return err
  } else if (error.request) {
    // Request được gửi nhưng không nhận response
    const err = new Error('No response from server. Please check your connection.')
    err.statusCode = 0
    return err
  } else {
    // Error trong quá trình setup request
    return error
  }
}
```

**3 loại lỗi:**

**1. error.response - Server trả lỗi**
```javascript
// Server trả 401 với message
{
  status: 401,
  data: {
    message: 'Invalid credentials',
    error: 'INVALID_CREDENTIALS'
  }
}
→ throw new Error('Invalid credentials')
```

**2. error.request - Không nhận được response**
```javascript
// Network offline, server down
→ throw new Error('No response from server. Please check your connection.')
```

**3. Lỗi khác**
```javascript
// Syntax error, config sai...
→ throw error (nguyên bản)
```

---

## 📄 File useAuth.js - React Hook

### Mục đích

Tạo một **React Hook** để dễ dàng sử dụng auth trong components.

### Code chi tiết

#### 1. Setup Hook

```javascript
import { useState, useCallback, useEffect } from 'react'
import { useAuthStore } from '../store'
import authService from '../services/authService'

export const useAuth = () => {
  // Lấy state từ Zustand store
  const { 
    user,           // User object
    isAuthenticated,// Boolean
    login: setLogin,     // Function để update store
    logout: setLogout,   // Function để clear store
    loadUser       // Function để load từ localStorage
  } = useAuthStore()
  
  // Local state cho loading và error
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  
  // ... methods
}
```

**Giải thích:**

**Zustand Store:**
```javascript
// Trong store/index.js
export const useAuthStore = create((set) => ({
  user: null,
  isAuthenticated: false,
  
  login: (user, token) => {
    localStorage.setItem('token', token)
    localStorage.setItem('user', JSON.stringify(user))
    set({ user, token, isAuthenticated: true })
  },
  
  logout: () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    set({ user: null, isAuthenticated: false })
  },
}))
```

**Tại sao dùng Zustand?**
- Global state - Share giữa components
- Đơn giản hơn Redux
- Không cần Context Provider

**Local state vs Store:**
- `loading`, `error` → Local (chỉ component này quan tâm)
- `user`, `isAuthenticated` → Store (nhiều components cần)

#### 2. Login Method

```javascript
const login = useCallback(async (credentials) => {
  try {
    setLoading(true)
    setError(null)
    
    // Gọi authService
    const response = await authService.login(credentials)
    
    // Update Zustand store
    setLogin(response.user, response.token)
    
    return response.user
  } catch (err) {
    setError(err.message || 'Login failed')
    throw err  // Re-throw để component biết có lỗi
  } finally {
    setLoading(false)  // Luôn luôn set loading = false
  }
}, [setLogin])
```

**useCallback là gì?**
```javascript
// Không có useCallback
const login = async () => { ... }
// Mỗi lần component re-render → Tạo function mới

// Có useCallback
const login = useCallback(async () => { ... }, [deps])
// Chỉ tạo lại khi deps thay đổi
```

**Tại sao cần?**
- Performance optimization
- Tránh re-render không cần thiết
- Dependency trong useEffect ổn định hơn

**Try-Catch-Finally pattern:**
```javascript
try {
  // Code chính
  setLoading(true)
  await doSomething()
} catch (err) {
  // Xử lý lỗi
  setError(err.message)
  throw err  // Re-throw để caller biết
} finally {
  // Luôn chạy dù thành công hay lỗi
  setLoading(false)
}
```

**Flow trong component:**
```javascript
const handleLogin = async () => {
  try {
    await login({ username, password })
    // Thành công → Redirect
    navigate('/dashboard')
  } catch (err) {
    // Lỗi → Hiển thị message
    // Error đã được set trong hook rồi
  }
}
```

#### 3. Register Method

```javascript
const register = useCallback(async (userData) => {
  try {
    setLoading(true)
    setError(null)
    
    const response = await authService.register(userData)
    setLogin(response.user, response.token)  // Auto login
    
    return response.user
  } catch (err) {
    setError(err.message || 'Registration failed')
    throw err
  } finally {
    setLoading(false)
  }
}, [setLogin])
```

**Auto login sau register:**
- UX tốt hơn: Không phải login lại
- authService.register đã trả về tokens
- Gọi `setLogin()` giống như login bình thường

#### 4. Logout Method

```javascript
const logout = useCallback(async () => {
  try {
    setLoading(true)
    setError(null)
    
    await authService.logout()  // API call
    setLogout()                 // Clear store
  } catch (err) {
    setError(err.message || 'Logout failed')
    setLogout()  // Vẫn logout dù API lỗi
  } finally {
    setLoading(false)
  }
}, [setLogout])
```

**Tại sao vẫn logout dù API lỗi?**
- Server down → User vẫn phải logout được
- Tokens đã bị xóa ở client → Server không verify được nữa
- UX: Không "trap" user

#### 5. Load User on Mount

```javascript
useEffect(() => {
  loadUser()
}, [loadUser])
```

**Chạy khi?**
- Component mount lần đầu
- Hook được sử dụng lần đầu

**Làm gì?**
```javascript
// Trong store
loadUser: () => {
  const token = localStorage.getItem('token')
  const userStr = localStorage.getItem('user')
  
  if (token && userStr) {
    const user = JSON.parse(userStr)
    set({ user, token, isAuthenticated: true })
  }
}
```

**Tại sao cần?**
- User đã login trước đó
- Refresh page
- → Phải restore auth state từ localStorage

**Flow:**
```
1. User mở app
2. useAuth hook được gọi
3. useEffect chạy → loadUser()
4. Check localStorage
5. Có token + user → Restore state
6. Không có → Vẫn ở trạng thái not authenticated
```

#### 6. Return Object

```javascript
return {
  // State
  user,              // Current user object
  isAuthenticated,   // Boolean
  loading,           // Boolean
  error,             // String | null
  
  // Methods
  login,
  register,
  logout,
  forgotPassword,
  resetPassword,
  changePassword,
  refreshUser,
  checkUsername,
  checkEmail,
  clearError,
}
```

**Destructuring trong component:**
```javascript
// Chỉ lấy những gì cần
const { user, login, loading } = useAuth()

// Không cần những thứ không dùng
// → Cleaner code
```

---

## 🔄 Luồng hoạt động tổng thể

### Scenario 1: User Login

```
┌─────────────────┐
│  LoginPage      │
│  Component      │
└────────┬────────┘
         │ 1. User submit form
         ↓
┌─────────────────┐
│  useAuth Hook   │
│  login()        │
└────────┬────────┘
         │ 2. Call authService.login()
         ↓
┌─────────────────┐
│  authService    │
│  login()        │
└────────┬────────┘
         │ 3. Call apiCall('POST', '/auth/login', data)
         ↓
┌─────────────────┐
│  api.js         │
│  Request        │
│  Interceptor    │
└────────┬────────┘
         │ 4. Thêm Authorization header (nếu có token cũ)
         ↓
┌─────────────────┐
│  Axios          │
│  POST Request   │
└────────┬────────┘
         │ 5. Gửi HTTP request
         ↓
┌─────────────────┐
│  Backend API    │
│  /auth/login    │
└────────┬────────┘
         │ 6. Validate credentials
         │ 7. Generate tokens
         │ 8. Return { user, token, refreshToken }
         ↓
┌─────────────────┐
│  api.js         │
│  Response       │
│  Interceptor    │
└────────┬────────┘
         │ 9. Return response.data
         ↓
┌─────────────────┐
│  authService    │
│  login()        │
└────────┬────────┘
         │ 10. Lưu tokens vào localStorage
         │ 11. Return response
         ↓
┌─────────────────┐
│  useAuth Hook   │
│  login()        │
└────────┬────────┘
         │ 12. setLogin(user, token) → Update Zustand store
         │ 13. Return user
         ↓
┌─────────────────┐
│  LoginPage      │
│  Component      │
└────────┬────────┘
         │ 14. Redirect to /dashboard
         ↓
     Success!
```

### Scenario 2: Token Expired - Auto Refresh

```
┌─────────────────┐
│  ProfilePage    │
│  Component      │
└────────┬────────┘
         │ 1. Load profile data
         │    axios.get('/users/profile')
         ↓
┌─────────────────┐
│  Request        │
│  Interceptor    │
└────────┬────────┘
         │ 2. Thêm token (đã hết hạn)
         ↓
┌─────────────────┐
│  Backend        │
└────────┬────────┘
         │ 3. Verify token → Expired!
         │ 4. Return 401 Unauthorized
         ↓
┌─────────────────┐
│  Response       │
│  Interceptor    │
└────────┬────────┘
         │ 5. Detect 401
         │ 6. Get refreshToken from localStorage
         │ 7. Call /auth/refresh
         ↓
┌─────────────────┐
│  Backend        │
│  /auth/refresh  │
└────────┬────────┘
         │ 8. Validate refreshToken
         │ 9. Generate new token
         │ 10. Return { token, refreshToken }
         ↓
┌─────────────────┐
│  Response       │
│  Interceptor    │
└────────┬────────┘
         │ 11. Save new token to localStorage
         │ 12. Retry original request with new token
         ↓
┌─────────────────┐
│  Backend        │
│  /users/profile │
└────────┬────────┘
         │ 13. Return profile data
         ↓
┌─────────────────┐
│  ProfilePage    │
│  Component      │
└────────┬────────┘
         │ 14. Display data
         ↓
  User không biết gì!
  Cứ tưởng request thành công ngay lần đầu
```

### Scenario 3: Check Username Availability (với Debounce)

```
┌─────────────────┐
│  RegisterPage   │
└────────┬────────┘
         │ User gõ "j"
         ↓
┌─────────────────┐
│  Input onChange │
│  setUsername("j")│
└────────┬────────┘
         │ 
         ↓
┌─────────────────┐
│  useDebounce    │
│  (đợi 500ms)    │
└────────┬────────┘
         │ User gõ tiếp "ohn" → Reset timer
         ↓
┌─────────────────┐
│  useDebounce    │
│  (đợi 500ms)    │
└────────┬────────┘
         │ User ngừng gõ
         │ → 500ms trôi qua
         ↓
┌─────────────────┐
│  useEffect      │
│  debouncedValue │
│  changed        │
└────────┬────────┘
         │ Call checkUsername("john")
         ↓
┌─────────────────┐
│  useAuth        │
│  checkUsername()│
└────────┬────────┘
         │ authService.checkUsernameAvailability()
         ↓
┌─────────────────┐
│  Backend API    │
└────────┬────────┘
         │ Check database
         │ Return { available: false }
         ↓
┌─────────────────┐
│  RegisterPage   │
└────────┬────────┘
         │ Show error: "Username đã tồn tại"
         ↓
    User nhìn thấy
```

---

## 💡 Ví dụ sử dụng thực tế

### 1. Login Page

```jsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks'
import { Button, Input, Card } from '../components/common'

function LoginPage() {
  const navigate = useNavigate()
  const { login, loading, error, clearError } = useAuth()
  
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    rememberMe: false
  })

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
    
    // Clear error khi user bắt đầu sửa
    if (error) clearError()
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    try {
      // Gọi login từ useAuth hook
      await login({
        username: formData.username,
        password: formData.password
      })
      
      // Thành công → Redirect
      navigate('/dashboard')
      
    } catch (err) {
      // Lỗi đã được set trong hook
      // Error message sẽ hiển thị tự động
      console.error('Login failed:', err)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <Card className="w-full max-w-md">
        <h1 className="text-2xl font-bold mb-6">Đăng nhập</h1>
        
        <form onSubmit={handleSubmit}>
          <Input
            label="Username hoặc Email"
            name="username"
            value={formData.username}
            onChange={handleChange}
            required
            fullWidth
            error={error && !formData.username ? 'Vui lòng nhập username' : ''}
          />
          
          <Input
            type="password"
            label="Mật khẩu"
            name="password"
            value={formData.password}
            onChange={handleChange}
            required
            fullWidth
            className="mt-4"
            error={error}
          />
          
          <label className="flex items-center mt-4">
            <input
              type="checkbox"
              name="rememberMe"
              checked={formData.rememberMe}
              onChange={handleChange}
              className="mr-2"
            />
            <span>Ghi nhớ đăng nhập</span>
          </label>
          
          <Button
            type="submit"
            variant="primary"
            fullWidth
            loading={loading}
            className="mt-6"
          >
            {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
          </Button>
          
          <p className="mt-4 text-center text-sm">
            Chưa có tài khoản?{' '}
            <a href="/register" className="text-blue-600 hover:underline">
              Đăng ký ngay
            </a>
          </p>
          
          <p className="mt-2 text-center text-sm">
            <a href="/forgot-password" className="text-blue-600 hover:underline">
              Quên mật khẩu?
            </a>
          </p>
        </form>
      </Card>
    </div>
  )
}

export default LoginPage
```

### 2. Register Page với Username Check

```jsx
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth, useDebounce } from '../hooks'
import { Button, Input, Card } from '../components/common'

function RegisterPage() {
  const navigate = useNavigate()
  const { register, checkUsername, checkEmail, loading, error, clearError } = useAuth()
  
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: ''
  })
  
  const [validationErrors, setValidationErrors] = useState({})
  const [usernameAvailable, setUsernameAvailable] = useState(null)
  const [emailAvailable, setEmailAvailable] = useState(null)
  
  // Debounce username và email
  const debouncedUsername = useDebounce(formData.username, 500)
  const debouncedEmail = useDebounce(formData.email, 500)

  // Check username availability
  useEffect(() => {
    if (debouncedUsername.length >= 3) {
      checkUsername(debouncedUsername).then(available => {
        setUsernameAvailable(available)
        if (!available) {
          setValidationErrors(prev => ({
            ...prev,
            username: 'Username đã tồn tại'
          }))
        } else {
          setValidationErrors(prev => {
            const { username, ...rest } = prev
            return rest
          })
        }
      })
    }
  }, [debouncedUsername, checkUsername])

  // Check email availability
  useEffect(() => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (emailRegex.test(debouncedEmail)) {
      checkEmail(debouncedEmail).then(available => {
        setEmailAvailable(available)
        if (!available) {
          setValidationErrors(prev => ({
            ...prev,
            email: 'Email đã được sử dụng'
          }))
        } else {
          setValidationErrors(prev => {
            const { email, ...rest } = prev
            return rest
          })
        }
      })
    }
  }, [debouncedEmail, checkEmail])

  const validateForm = () => {
    const errors = {}
    
    // Username
    if (formData.username.length < 3) {
      errors.username = 'Username phải có ít nhất 3 ký tự'
    }
    
    // Email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(formData.email)) {
      errors.email = 'Email không hợp lệ'
    }
    
    // Password
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/
    if (!passwordRegex.test(formData.password)) {
      errors.password = 'Mật khẩu phải có ít nhất 8 ký tự, bao gồm chữ hoa, chữ thường và số'
    }
    
    // Confirm Password
    if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = 'Mật khẩu không khớp'
    }
    
    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!validateForm()) return
    if (!usernameAvailable || !emailAvailable) return
    
    try {
      await register({
        username: formData.username,
        email: formData.email,
        password: formData.password
      })
      
      // Auto login sau register → Redirect
      navigate('/dashboard')
      
    } catch (err) {
      console.error('Registration failed:', err)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <Card className="w-full max-w-md">
        <h1 className="text-2xl font-bold mb-6">Đăng ký tài khoản</h1>
        
        <form onSubmit={handleSubmit}>
          <Input
            label="Username"
            name="username"
            value={formData.username}
            onChange={(e) => {
              setFormData({ ...formData, username: e.target.value })
              clearError()
            }}
            required
            fullWidth
            error={validationErrors.username}
            helperText={
              usernameAvailable === true 
                ? '✓ Username khả dụng' 
                : usernameAvailable === false 
                ? '' 
                : 'Ít nhất 3 ký tự'
            }
          />
          
          <Input
            type="email"
            label="Email"
            name="email"
            value={formData.email}
            onChange={(e) => {
              setFormData({ ...formData, email: e.target.value })
              clearError()
            }}
            required
            fullWidth
            className="mt-4"
            error={validationErrors.email}
            helperText={
              emailAvailable === true 
                ? '✓ Email khả dụng' 
                : ''
            }
          />
          
          <Input
            type="password"
            label="Mật khẩu"
            name="password"
            value={formData.password}
            onChange={(e) => {
              setFormData({ ...formData, password: e.target.value })
              clearError()
            }}
            required
            fullWidth
            className="mt-4"
            error={validationErrors.password}
            helperText="Ít nhất 8 ký tự, bao gồm chữ hoa, chữ thường và số"
          />
          
          <Input
            type="password"
            label="Xác nhận mật khẩu"
            name="confirmPassword"
            value={formData.confirmPassword}
            onChange={(e) => {
              setFormData({ ...formData, confirmPassword: e.target.value })
              clearError()
            }}
            required
            fullWidth
            className="mt-4"
            error={validationErrors.confirmPassword}
          />
          
          {error && (
            <p className="mt-4 text-red-600 text-sm">{error}</p>
          )}
          
          <Button
            type="submit"
            variant="primary"
            fullWidth
            loading={loading}
            className="mt-6"
            disabled={!usernameAvailable || !emailAvailable}
          >
            {loading ? 'Đang đăng ký...' : 'Đăng ký'}
          </Button>
          
          <p className="mt-4 text-center text-sm">
            Đã có tài khoản?{' '}
            <a href="/login" className="text-blue-600 hover:underline">
              Đăng nhập ngay
            </a>
          </p>
        </form>
      </Card>
    </div>
  )
}

export default RegisterPage
```

### 3. Protected Route

```jsx
import { Navigate } from 'react-router-dom'
import { useAuth } from '../hooks'
import { Loader } from '../components/common'

function PrivateRoute({ children }) {
  const { isAuthenticated, loading } = useAuth()
  
  // Đang load user từ localStorage
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader />
      </div>
    )
  }
  
  // Chưa đăng nhập → Redirect về login
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }
  
  // Đã đăng nhập → Render children
  return children
}

export default PrivateRoute
```

**Sử dụng:**
```jsx
// routes/index.jsx
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import PrivateRoute from './PrivateRoute'

<Routes>
  <Route path="/login" element={<LoginPage />} />
  <Route path="/register" element={<RegisterPage />} />
  
  <Route 
    path="/dashboard" 
    element={
      <PrivateRoute>
        <DashboardPage />
      </PrivateRoute>
    } 
  />
  
  <Route 
    path="/profile" 
    element={
      <PrivateRoute>
        <ProfilePage />
      </PrivateRoute>
    } 
  />
</Routes>
```

### 4. Header Component với Logout

```jsx
import { useAuth } from '../hooks'
import { Button, Avatar } from '../components/common'
import { useNavigate } from 'react-router-dom'

function Header() {
  const { user, isAuthenticated, logout } = useAuth()
  const navigate = useNavigate()
  
  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }
  
  if (!isAuthenticated) {
    return (
      <header className="bg-white shadow">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-xl font-bold">ChessWeb</h1>
          <div className="space-x-4">
            <Button variant="ghost" onClick={() => navigate('/login')}>
              Đăng nhập
            </Button>
            <Button variant="primary" onClick={() => navigate('/register')}>
              Đăng ký
            </Button>
          </div>
        </div>
      </header>
    )
  }
  
  return (
    <header className="bg-white shadow">
      <div className="container mx-auto px-4 py-4 flex justify-between items-center">
        <h1 className="text-xl font-bold">ChessWeb</h1>
        
        <div className="flex items-center space-x-4">
          <span className="text-gray-700">Xin chào, {user.displayName}</span>
          
          <Avatar
            src={user.avatarUrl}
            name={user.displayName}
            size="md"
            status="online"
            onClick={() => navigate('/profile')}
            className="cursor-pointer"
          />
          
          <Button variant="outline" onClick={handleLogout}>
            Đăng xuất
          </Button>
        </div>
      </div>
    </header>
  )
}

export default Header
```

---

## 🎯 Tổng kết

### Flow tổng quát

```
Component 
   ↓ (sử dụng)
useAuth Hook
   ↓ (gọi)
authService
   ↓ (gọi)
apiCall wrapper
   ↓ (gọi)
Axios instance
   ↓ (qua)
Request Interceptor (thêm token)
   ↓ (gửi)
Backend API
   ↓ (trả về)
Response Interceptor (handle error, refresh token)
   ↓ (return)
authService
   ↓ (lưu token, return data)
useAuth Hook
   ↓ (update store, return)
Component (hiển thị UI)
```

### Key Concepts

1. **Axios** - HTTP client với interceptors
2. **Interceptors** - Middleware cho requests/responses
3. **Tokens** - Access token (ngắn hạn) + Refresh token (dài hạn)
4. **Auto Refresh** - Tự động renew token khi hết hạn
5. **Mock API** - Development không cần backend
6. **useAuth Hook** - Centralized auth logic
7. **Zustand Store** - Global state management
8. **Debounce** - Optimize API calls khi typing

### Best Practices

✅ Centralize auth logic trong authService  
✅ Use interceptors để tự động handle tokens  
✅ Implement auto token refresh  
✅ Use custom hooks cho cleaner components  
✅ Debounce availability checks  
✅ Clear error state khi user sửa input  
✅ Always use try-catch-finally  
✅ Re-throw errors để component biết  
✅ Logout ở client dù API fail  
✅ Load user từ localStorage on mount  

---

**📝 Tài liệu này giải thích chi tiết cách Auth System hoạt động trong ChessWeb.**

Nếu còn thắc mắc về bất kỳ phần nào, hãy hỏi nhé! 🚀
