import { useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'

import { useAuth } from '@/hooks/useAuth'
import { useNotification } from '@/components/common'
import { Card, Button, Input } from '@/components/common'

const loginSchema = z.object({
  identifier: z
    .string()
    .min(3, 'Tên đăng nhập hoặc email phải có ít nhất 3 ký tự')
    .max(100, 'Tên đăng nhập hoặc email không được vượt quá 100 ký tự'),
  password: z.string().min(6, 'Mật khẩu phải có ít nhất 6 ký tự'),
  remember: z.boolean().optional(),
})

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

  const onSubmit = async (data) => {
    try {
      clearError?.()
      await login(data)
      showNotification({
        type: 'success',
        title: 'Đăng nhập thành công',
        message: `Chào mừng! Bạn đã đăng nhập thành công.`,
      })
      navigate('/', { replace: true })
    } catch (err) {
      showNotification({
        type: 'error',
        title: 'Đăng nhập thất bại',
        message: err.message || 'Có lỗi xảy ra khi đăng nhập. Vui lòng thử lại.',
      })
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center">
      <div className="mx-auto w-full max-w-5xl px-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          {/* LEFT SIDE */}
          <div className="text-center md:text-left">
            <h1 className="text-4xl md:text-5xl font-bold text-blue-600">WebChess</h1>
            <p className="mt-4 text-gray-600 text-lg">
              WebChess giúp bạn kết nối và chơi cờ với mọi người trên khắp thế giới.
            </p>
          </div>

          {/* RIGHT SIDE */}
          <div className="flex justify-center md:justify-end">
            <Card variant="default" padding="lg" className="w-full max-w-sm">
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div>
                  <Input
                    type="text"
                    placeholder="Email hoặc Username"
                    {...register('identifier')}
                    disabled={busy}
                  />
                  {errors.identifier && (
                    <p className="text-xs text-red-600 mt-1">{errors.identifier.message}</p>
                  )}
                </div>

                <div>
                  <Input
                    type="password"
                    placeholder="Mật khẩu"
                    {...register('password')}
                    disabled={busy}
                  />
                  {errors.password && (
                    <p className="text-xs text-red-600 mt-1">{errors.password.message}</p>
                  )}
                </div>

                <Button type="submit" disabled={busy} className="w-full">
                  {busy ? 'Đang đăng nhập...' : 'Đăng nhập'}
                </Button>

                <div className="text-center text-sm text-gray-600">
                  <Link to="/forgot-password" className="hover:underline">
                    Quên mật khẩu?
                  </Link>
                </div>

                <div className="border-t pt-4 text-center text-sm">
                  Chưa có tài khoản?{' '}
                  <Link to="/register" className="text-blue-600 hover:underline">
                    Đăng ký
                  </Link>
                </div>
              </form>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}

export default LoginPage
