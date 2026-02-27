import { Outlet, Navigate } from 'react-router-dom'
import { useAuthStore } from '@/store'
import MainLayout from './MainLayout'

/**
 * AppLayout - Layout route tự động thêm Sidebar + Header + Footer cho tất cả trang con
 *
 * -----------------------------------------------------------------------
 * CÁCH HOẠT ĐỘNG:
 *   1. Kiểm tra đăng nhập → redirect về /login nếu chưa đăng nhập
 *   2. Render MainLayout (Header + Sidebar + Footer)
 *   3. React Router đặt trang con vào <Outlet /> bên trong
 *
 * -----------------------------------------------------------------------
 * CÁCH THÊM TRANG MỚI CÓ SIDEBAR/HEADER (dành cho người mới):
 *   Trong file routes/index.jsx, tìm block <Route element={<AppLayout />}>
 *   rồi thêm route của bạn vào trong đó:
 *
 *     <Route element={<AppLayout />}>
 *       <Route path="/trang-moi" element={<TrangMoiPage />} />  ← thêm ở đây
 *     </Route>
 *
 *   Trang mới sẽ tự động có Sidebar + Header mà khỏi cần import thêm gì.
 * -----------------------------------------------------------------------
 */

// Trong môi trường dev (npm run dev), bỏ qua kiểm tra login để test dễ hơn
const IS_DEV = import.meta.env.DEV || import.meta.env.VITE_USE_MOCK === 'true'

const AppLayout = () => {
  const { isAuthenticated } = useAuthStore()

  // Nếu KHÔNG phải dev mode VÀ người dùng chưa đăng nhập → đưa về trang login
  if (!IS_DEV && !isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  // Render layout bình thường — trang con sẽ hiển thị qua <Outlet />
  return (
    <MainLayout>
      <Outlet />
    </MainLayout>
  )
}

export default AppLayout
