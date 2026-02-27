import { useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Card, Button, Input, useNotification } from '@/components/common'

const schema = z.object({
  email: z.string().email('Email không hợp lệ'),
})

const ForgotPasswordPage = () => {
  const [sent, setSent] = useState(false)
  const [countdown, setCountdown] = useState(0)
  const { showNotification } = useNotification()

  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(schema),
    mode: 'onTouched',
  })

  const startCountdown = useCallback(() => {
    setCountdown(60)
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }, [])

  const onSubmit = async (data) => {
    // TODO: gọi authService.forgotPassword(data.email)
    await new Promise((r) => setTimeout(r, 1000)) // mock delay
    setSent(true)
    startCountdown()
    showNotification({
      type: 'success',
      title: 'Email đã gửi',
      message: `Kiểm tra hộp thư ${data.email}`,
    })
  }

  const onResend = async () => {
    if (countdown > 0) return
    await new Promise((r) => setTimeout(r, 800))
    startCountdown()
    showNotification({ type: 'info', title: 'Đã gửi lại', message: 'Vui lòng kiểm tra email.' })
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
              {!sent ? (
                <>
                  <div className="mb-6">
                    <h2 className="text-2xl font-bold text-blue-400">Quên mật khẩu?</h2>
                    <p className="text-sm text-gray-500 mt-1">
                      Nhập email — chúng tôi sẽ gửi link reset.
                    </p>
                  </div>

                  <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    <Input
                      type="email"
                      placeholder="Email của bạn"
                      fullWidth
                      {...register('email')}
                      error={errors.email?.message}
                      disabled={isSubmitting}
                      className="py-3 !bg-gray-800 !border-gray-600 !text-white placeholder:!text-gray-400 focus:!border-blue-400 focus:!ring-0"
                    />
                    <Button
                      type="submit"
                      variant="primary"
                      fullWidth
                      size="lg"
                      loading={isSubmitting}
                      className="py-3 font-bold"
                    >
                      Gửi link reset
                    </Button>
                  </form>
                </>
              ) : (
                <div className="text-center py-4">
                  <div className="text-5xl mb-4">📬</div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Kiểm tra email!</h3>
                  <p className="text-sm text-gray-500 mb-6">
                    Đã gửi link reset đến <strong>{getValues('email')}</strong>
                  </p>
                  <button
                    onClick={onResend}
                    disabled={countdown > 0}
                    className="text-sm text-blue-600 hover:underline disabled:text-gray-400 disabled:cursor-not-allowed font-medium"
                  >
                    {countdown > 0 ? `Gửi lại sau ${countdown}s` : 'Gửi lại email'}
                  </button>
                </div>
              )}

              <div className="pt-5 mt-5 border-t border-gray-100 text-center">
                <Link to="/login" className="text-sm text-blue-400 font-bold hover:underline">
                  ← Quay lại đăng nhập
                </Link>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}

export default ForgotPasswordPage
