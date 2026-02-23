import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Mail, Lock, LogIn } from 'lucide-react'

// Import components
import Button from '../../components/common/button'
import Input from '../../components/common/input'
import Card from '../../components/common/card'
import { useNotification } from '../../components/common/Notification'

// Import hooks và services
import { useAuth } from '../../hooks/useAuth'

/**
 * ===========================
 * VALIDATION SCHEMA với Zod
 * ===========================
 * Định nghĩa rules validate cho form login
 */
const loginSchema = z.object({
  // Username hoặc Email - cho phép cả 2 định dạng
  username: z
    .string()
    .min(1, 'Vui lòng nhập username hoặc email')
    .min(3, 'Username phải có ít nhất 3 ký tự'),
  
  // Password - tối thiểu 6 ký tự
  password: z
    .string()
    .min(1, 'Vui lòng nhập mật khẩu')
    .min(6, 'Mật khẩu phải có ít nhất 6 ký tự'),
  
  // Remember me - boolean, mặc định false
  rememberMe: z.boolean().optional().default(false),
})

/**
 * ===========================
 * LOGIN PAGE COMPONENT
 * ===========================
 */
const LoginPage = () => {
  // ============ STATE MANAGEMENT ============
  const navigate = useNavigate()
  const { login } = useAuth()
  const { showNotification } = useNotification()
  const [isSubmitting, setIsSubmitting] = useState(false)

  // ============ REACT HOOK FORM SETUP ============
  const {
    register,
    handleSubmit,
    formState: { errors },
    setError, // Để set custom error từ API
  } = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: '',
      password: '',
      rememberMe: false,
    },
  })

  // ============ SUBMIT HANDLER ============
  /**
   * Xử lý khi user submit form
   * @param {Object} data - Dữ liệu từ form đã được validate
   */
  const onSubmit = async (data) => {
    try {
      setIsSubmitting(true)

      // Gọi API login thông qua useAuth hook
      await login({
        username: data.username,
        password: data.password,
        rememberMe: data.rememberMe,
      })

      // Hiển thị thông báo thành công
      showNotification({
        type: 'success',
        title: 'Đăng nhập thành công!',
        message: 'Chào mừng bạn quay trở lại',
        duration: 3000,
      })

      // Redirect về trang dashboard sau khi login thành công
      navigate('/dashboard')

    } catch (error) {
      // Xử lý các loại lỗi khác nhau
      console.error('Login error:', error)

      // Nếu lỗi từ server có thông tin cụ thể
      if (error.response?.data?.field) {
        // Set lỗi cho field cụ thể (username hoặc password)
        setError(error.response.data.field, {
          type: 'manual',
          message: error.response.data.message,
        })
      } else {
        // Lỗi chung - hiển thị toast notification
        showNotification({
          type: 'error',
          title: 'Đăng nhập thất bại',
          message: error.message || 'Sai tên đăng nhập hoặc mật khẩu',
          duration: 4000,
        })
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  // ============ MOCK LOGIN DEMO ============
  /**
   * Hàm demo để test UI (sẽ xóa khi có API thật)
   */
  const handleDemoLogin = () => {
    document.querySelector('input[name="username"]').value = 'demo@chessweb.com'
    document.querySelector('input[name="password"]').value = 'demo123'
  }

  /**
   * Clear localStorage (xóa cache remember me)
   */
  const handleClearCache = () => {
    localStorage.clear()
    showNotification({
      type: 'success',
      title: 'Đã xóa cache',
      message: 'Tất cả dữ liệu đã lưu đã được xóa',
      duration: 2000,
    })
  }

  // ============ RENDER UI ============
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-500 via-rose-600 to-pink-600 dark:from-red-900 dark:via-rose-900 dark:to-pink-900 px-4 py-12">
      {/* Container giới hạn width */}
      <div className="w-full max-w-md">
        
        {/* ===== HEADER SECTION ===== */}
        <div className="text-center mb-8">
          {/* Logo/Icon */}
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl mb-4 shadow-lg border border-white/30">
            <span className="text-3xl text-white">♔</span>
          </div>
          
          {/* Title */}
          <h1 className="text-3xl font-bold text-white mb-2">
            Đăng Nhập
          </h1>
          
          {/* Subtitle */}
          <p className="text-white/90">
            Chào mừng trở lại! Đăng nhập để tiếp tục chơi chess
          </p>
        </div>

        {/* ===== FORM CARD ===== */}
        <Card variant="elevated" padding="lg">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            
            {/* ===== USERNAME/EMAIL INPUT ===== */}
            <Input
              {...register('username')}
              type="text"
              label="Username hoặc Email"
              placeholder="Nhập username hoặc email"
              error={errors.username?.message}
              disabled={isSubmitting}
              fullWidth
              leftIcon={<Mail size={18} />}
              autoComplete="username"
              className="focus:!border-red-500 focus:!ring-red-500"
            />

            {/* ===== PASSWORD INPUT ===== */}
            <Input
              {...register('password')}
              type="password"
              label="Mật khẩu"
              placeholder="Nhập mật khẩu"
              error={errors.password?.message}
              disabled={isSubmitting}
              fullWidth
              leftIcon={<Lock size={18} />}
              autoComplete="current-password"
              className="focus:!border-red-500 focus:!ring-red-500"
            />

            {/* ===== REMEMBER ME & FORGOT PASSWORD ROW ===== */}
            <div className="flex items-center justify-between">
              {/* Remember Me Checkbox */}
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  {...register('rememberMe')}
                  type="checkbox"
                  className="w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500 dark:border-gray-600 dark:bg-gray-700 cursor-pointer"
                  disabled={isSubmitting}
                />
                <span className="text-sm text-gray-700 dark:text-gray-300 select-none">
                  Ghi nhớ đăng nhập
                </span>
              </label>

              {/* Forgot Password Link */}
              <Link
                to="/forgot-password"
                className="text-sm font-medium text-white/90 hover:text-white transition-colors underline"
              >
                Quên mật khẩu?
              </Link>
            </div>

            {/* ===== SUBMIT BUTTON ===== */}
            <Button
              type="submit"
              variant="danger"
              size="lg"
              fullWidth
              loading={isSubmitting}
              disabled={isSubmitting}
            >
              <LogIn size={20} />
              {isSubmitting ? 'Đang đăng nhập...' : 'Đăng nhập'}
            </Button>

            {/* ===== DEVELOPMENT & UTILITY BUTTONS ===== */}
            <div className="flex gap-2">
              {/* Clear Cache - Luôn hiển thị để dễ logout */}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                fullWidth
                onClick={handleClearCache}
              >
                🗑️ Clear Cache
              </Button>
              
              {/* Fill Demo - Chỉ dev mode */}
              {import.meta.env.DEV && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  fullWidth
                  onClick={handleDemoLogin}
                >
                  ⚡ Fill Demo
                </Button>
              )}
            </div>
          </form>
        </Card>

        {/* ===== REGISTER LINK ===== */}
        <div className="mt-6 text-center">
          <p className="text-white/90">
            Chưa có tài khoản?{' '}
            <Link
              to="/register"
              className="font-semibold text-white hover:text-white/80 transition-colors underline"
            >
              Đăng ký ngay
            </Link>
          </p>
        </div>

        {/* ===== FOOTER INFO ===== */}
        <div className="mt-8 text-center">
          <p className="text-xs text-white/70">
            Bằng việc đăng nhập, bạn đồng ý với{' '}
            <Link to="/terms" className="underline hover:text-white/90">
              Điều khoản sử dụng
            </Link>
            {' '}và{' '}
            <Link to="/privacy" className="underline hover:text-white/90">
              Chính sách bảo mật
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

export default LoginPage
