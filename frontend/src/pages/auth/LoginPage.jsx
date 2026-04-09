import { useMemo, useCallback } from 'react'
import PropTypes from 'prop-types'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'

import { useAuth } from '@/hooks/useAuth'
import { useNotification, Card, Button, Input } from '@/components/common'

const loginSchema = z.object({
  identifier: z
    .string()
    .min(3, 'Tên đăng nhập hoặc email phải có ít nhất 3 ký tự')
    .max(100, 'Tên đăng nhập hoặc email không được vượt quá 100 ký tự'),
  password: z.string().min(6, 'Mật khẩu phải có ít nhất 6 ký tự'),
  remember: z.boolean().optional(),
})


const Divider = () => (
  <div className="relative py-2">
    <div className="absolute inset-0 flex items-center">
      <div className="w-full border-t border-gray-200" />
    </div>
    <div className="relative flex justify-center">
      <span className="bg-white px-3 text-xs text-gray-500">HOẶC</span>
    </div>
  </div>
)

const GoogleButton = ({ onClick, disabled }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    className="w-full flex items-center justify-center gap-3 rounded-lg border border-gray-200 bg-white py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 active:bg-gray-100 disabled:opacity-60 disabled:cursor-not-allowed"
  >
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path
        fill="#FFC107"
        d="M43.611 20.083H42V20H24v8h11.303C33.73 32.659 29.223 36 24 36c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.958 3.042l5.657-5.657C34.047 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.651-.389-3.917z"
      />
      <path
        fill="#FF3D00"
        d="M6.306 14.691l6.571 4.819C14.655 16.108 19.008 12 24 12c3.059 0 5.842 1.154 7.958 3.042l5.657-5.657C34.047 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.166 0 9.86-1.977 13.409-5.197l-6.19-5.238C29.182 35.091 26.715 36 24 36c-5.202 0-9.694-3.317-11.259-7.946l-6.523 5.025C9.505 39.556 16.227 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.611 20.083H42V20H24v8h11.303c-.746 2.062-2.231 3.809-4.094 4.995l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.651-.389-3.917z"
      />
    </svg>
    Đăng nhập với Google
  </button>
)

GoogleButton.propTypes = {
  onClick: PropTypes.func,
  disabled: PropTypes.bool,
}

const LoginPage = () => {
  const navigate = useNavigate()
  const { login, loading, error, clearError } = useAuth()
  const { showNotification } = useNotification()

  const defaultValues = useMemo(
    () => ({
      identifier: '',
      password: '',
      remember: false,
    }),
    []
  )

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues,
    mode: 'onTouched',
  })

  const busy = loading || isSubmitting

  const notifySuccess = useCallback(
    (title, message) =>
      showNotification({
        type: 'success',
        title,
        message,
        duration: 2500,
      }),
    [showNotification]
  )

  const notifyError = useCallback(
    (title, message) =>
      showNotification({
        type: 'error',
        title,
        message,
        duration: 4000,
      }),
    [showNotification]
  )

  const handleLogin = useCallback(
    async ({ username, password }) => {
      clearError?.()
      await login({ username, password })
      navigate('/', { replace: true })
    },
    [clearError, login, navigate]
  )

  const onSubmit = async (data) => {
    try {
      await handleLogin({
        username: data.identifier,
        password: data.password,
      })
      notifySuccess('Đăng nhập thành công', 'Chào mừng bạn quay lại!')
    } catch (err) {
      notifyError('Đăng nhập thất bại', err?.message || 'Vui lòng thử lại.')
    }
  }

  const onGoogleLogin = async () => {
    notifyError('Google login chưa hỗ trợ', 'Hệ thống hiện chỉ hỗ trợ đăng nhập bằng username/email và mật khẩu.')
  }

  return (
    <div className="min-h-screen bg-[#e1edff] flex items-center justify-center p-4">
      <div className="w-full max-w-5xl flex flex-col lg:flex-row items-center justify-between gap-12 lg:gap-8">
        {/* LEFT */}
        <div className="w-full lg:w-1/2 text-center lg:text-left">
          <div className="mb-4">
            <span className="text-6xl text-blue-600 leading-none select-none">♟</span>
          </div>
          <h1 className="text-5xl font-bold text-blue-600 tracking-tight mb-4">WebChess</h1>
          <p className="text-2xl font-medium text-gray-800 leading-tight max-w-md mx-auto lg:mx-0">
            Nền tảng cờ vua trực tuyến. Kết nối và thi đấu cùng các kỳ thủ toàn cầu.
          </p>
        </div>

        {/* RIGHT */}
        <div className="w-full lg:w-[400px]">
          <Card
            variant="elevated"
            padding="none"
            className="bg-white shadow-md border-none rounded-xl overflow-hidden"
          >
            <div className="p-8">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-blue-400">Đăng nhập</h2>
                <p className="text-sm text-gray-500 mt-1">Chào mừng bạn trở lại bàn cờ.</p>
              </div>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                {error && (
                  <div className="p-3 bg-red-50 border border-red-100 text-red-600 rounded-lg text-sm font-medium">
                    {error}
                  </div>
                )}

                <div className="space-y-4">
                  <Input
                    placeholder="Email hoặc tên đăng nhập"
                    fullWidth
                    {...register('identifier')}
                    error={errors.identifier?.message}
                    disabled={busy}
                    className="py-3 !bg-gray-800 !border-gray-600 !text-white placeholder:!text-gray-400 focus:!border-blue-400 focus:!ring-0 transition-none"
                  />

                  <Input
                    type="password"
                    placeholder="Mật khẩu"
                    fullWidth
                    {...register('password')}
                    error={errors.password?.message}
                    disabled={busy}
                    className="py-3 !bg-gray-800 !border-gray-600 !text-white placeholder:!text-gray-400 focus:!border-blue-400 focus:!ring-0 transition-none"
                  />
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  fullWidth
                  size="lg"
                  loading={busy}
                  className="py-3 text-lg font-bold bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm"
                >
                  Đăng nhập
                </Button>

                <Divider />

                <GoogleButton onClick={onGoogleLogin} disabled={busy} />

                <div className="flex items-center justify-between pt-2">
                  <label className="flex items-center gap-2 cursor-pointer group select-none">
                    <input
                      type="checkbox"
                      className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-0 cursor-pointer"
                      {...register('remember')}
                      disabled={busy}
                    />
                    <span className="text-sm text-gray-600 group-hover:text-blue-400 font-medium transition-colors">
                      Ghi nhớ đăng nhập
                    </span>
                  </label>

                  <Link
                    to="/forgot-password"
                    className="text-sm text-gray-600 hover:underline hover:text-blue-400 font-semibold"
                  >
                    Quên mật khẩu?
                  </Link>
                </div>

                <div className="pt-6 mt-4 border-t border-gray-100 text-center">
                  <p className="text-sm text-gray-600">
                    Chưa có tài khoản?{' '}
                    <Link to="/register" className="text-blue-400 font-bold hover:underline ml-1">
                      Đăng ký ngay
                    </Link>
                  </p>
                </div>
              </form>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}

export default LoginPage
