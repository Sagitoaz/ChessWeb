import { useMemo } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Card, Button, Input, useNotification } from '@/components/common'
import { useAuth } from '@/hooks/useAuth'

const schema = z
  .object({
    token: z.string().trim().min(20, 'Token reset không hợp lệ'),
    password: z
      .string()
      .min(8, 'Mật khẩu phải có ít nhất 8 ký tự')
      .max(128, 'Mật khẩu không được vượt quá 128 ký tự')
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/,
        'Mật khẩu cần có chữ hoa, chữ thường và số'
      ),
    confirmPassword: z.string().min(1, 'Vui lòng xác nhận mật khẩu'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Mật khẩu xác nhận không khớp',
    path: ['confirmPassword'],
  })

const ResetPasswordPage = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { showNotification } = useNotification()
  const { resetPassword, loading, clearError } = useAuth()

  const tokenFromUrl = useMemo(() => {
    const token = String(searchParams.get('token') || '').trim()
    return token
  }, [searchParams])

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      token: tokenFromUrl,
      password: '',
      confirmPassword: '',
    },
    mode: 'onTouched',
  })

  const busy = loading || isSubmitting

  const onSubmit = async (data) => {
    const token = tokenFromUrl || String(data.token || '').trim()
    if (!token) {
      setError('token', { message: 'Thiếu token reset mật khẩu.' })
      return
    }

    try {
      clearError?.()
      await resetPassword(token, data.password)
      showNotification({
        type: 'success',
        title: 'Đặt lại mật khẩu thành công',
        message: 'Bạn có thể đăng nhập lại với mật khẩu mới.',
      })
      navigate('/login', { replace: true })
    } catch (error) {
      showNotification({
        type: 'error',
        title: 'Đặt lại mật khẩu thất bại',
        message: error?.message || 'Token có thể đã hết hạn. Vui lòng thử lại.',
      })
    }
  }

  return (
    <div className="min-h-screen bg-[#e1edff] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <span className="text-5xl text-blue-600 leading-none select-none">♟</span>
          <h1 className="text-3xl font-bold text-blue-600 mt-2">WebChess</h1>
        </div>

        <Card variant="elevated" padding="none" className="bg-white shadow-md rounded-xl">
          <div className="p-8">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-blue-400">Đặt lại mật khẩu</h2>
              <p className="text-sm text-gray-500 mt-1">Tạo mật khẩu mới cho tài khoản của bạn.</p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {!tokenFromUrl && (
                <Input
                  placeholder="Nhập reset token"
                  fullWidth
                  {...register('token')}
                  error={errors.token?.message}
                  disabled={busy}
                  className="py-3 !border-gray-600 !text-black placeholder:!text-gray-400 focus:!border-blue-400 focus:!ring-0"
                />
              )}

              <Input
                type="password"
                placeholder="Mật khẩu mới"
                fullWidth
                {...register('password')}
                error={errors.password?.message}
                disabled={busy}
                className="py-3 !border-gray-600 !text-black placeholder:!text-gray-400 focus:!border-blue-400 focus:!ring-0"
              />

              <Input
                type="password"
                placeholder="Xác nhận mật khẩu mới"
                fullWidth
                {...register('confirmPassword')}
                error={errors.confirmPassword?.message}
                disabled={busy}
                className="py-3 !border-gray-600 !text-black placeholder:!text-gray-400 focus:!border-blue-400 focus:!ring-0"
              />

              <Button
                type="submit"
                variant="primary"
                fullWidth
                size="lg"
                loading={busy}
                className="py-3 font-bold"
              >
                Cập nhật mật khẩu
              </Button>
            </form>

            <div className="pt-5 mt-5 border-t border-gray-100 text-center">
              <Link to="/login" className="text-sm text-blue-400 font-bold hover:underline">
                ← Quay lại đăng nhập
              </Link>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}

export default ResetPasswordPage
