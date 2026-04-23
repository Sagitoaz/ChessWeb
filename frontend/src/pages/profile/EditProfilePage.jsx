import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useAuthStore } from '@/store'
import { Avatar, Button, Input, useNotification } from '@/components/common'
import authService from '@/services/authService'

const profileSchema = z.object({
  displayName: z.string().min(2, 'Tên hiển thị tối thiểu 2 ký tự').max(50),
  avatarUrl: z
    .string()
    .trim()
    .max(512, 'URL avatar tối đa 512 ký tự')
    .optional()
    .or(z.literal(''))
    .refine((value) => !value || /^https?:\/\//i.test(value), {
      message: 'Avatar URL phải bắt đầu bằng http:// hoặc https://',
    }),
})

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(8, 'Nhập mật khẩu hiện tại (ít nhất 8 ký tự)'),
    newPassword: z.string().min(8, 'Mật khẩu mới tối thiểu 8 ký tự'),
    confirmPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: 'Mật khẩu xác nhận không khớp',
    path: ['confirmPassword'],
  })

const EditProfilePage = () => {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const token = useAuthStore((s) => s.token)
  const setAuthLogin = useAuthStore((s) => s.login)
  const { showNotification } = useNotification()

  // Profile form
  const {
    register,
    watch,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      displayName: user?.displayName ?? user?.username ?? 'TestUser',
      avatarUrl: user?.avatarUrl ?? '',
    },
    mode: 'onTouched',
  })
  const avatarPreview = watch('avatarUrl') || user?.avatarUrl || ''

  // Password form
  const {
    register: regPwd,
    handleSubmit: handlePwd,
    reset: resetPwd,
    formState: { errors: pwdErrors, isSubmitting: isPwdSubmitting },
  } = useForm({
    resolver: zodResolver(changePasswordSchema),
    mode: 'onTouched',
  })

  const onSaveProfile = async (data) => {
    try {
      const nextDisplayName = String(data.displayName || '').trim()
      const nextAvatarUrl = String(data.avatarUrl || '').trim()

      await authService.updateProfile({
        displayName: nextDisplayName,
      })

      if (nextAvatarUrl) {
        await authService.uploadAvatar({
          avatarUrl: nextAvatarUrl,
        })
      }

      const latestProfile = await authService.getCurrentUser()
      const normalizedUser = latestProfile?.user ?? latestProfile
      if (normalizedUser && token) {
        setAuthLogin(
          {
            ...user,
            ...normalizedUser,
            avatarUrl: normalizedUser.avatarUrl ?? null,
          },
          token
        )
      }

      if (nextAvatarUrl && normalizedUser?.avatarUrl !== nextAvatarUrl) {
        throw new Error('Ảnh đại diện chưa được lưu. Hãy kiểm tra lại link ảnh trực tiếp.')
      }

      showNotification({ type: 'success', title: 'Đã lưu', message: 'Hồ sơ cập nhật thành công.' })
      navigate('/profile')
    } catch (error) {
      showNotification({
        type: 'error',
        title: 'Lưu thất bại',
        message: error?.message || 'Không thể cập nhật hồ sơ.',
      })
    }
  }

  const onChangePassword = async (data) => {
    try {
      await authService.changePassword({
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
        confirmNewPassword: data.confirmPassword,
      })
      showNotification({
        type: 'success',
        title: 'Đã đổi mật khẩu',
        message: 'Mật khẩu đã được cập nhật.',
      })
      resetPwd()
    } catch (error) {
      showNotification({
        type: 'error',
        title: 'Đổi mật khẩu thất bại',
        message: error?.message || 'Không thể đổi mật khẩu.',
      })
    }
  }

  return (
    <div className="pb-12">
      <div className="max-w-2xl mx-auto px-4 pt-6">
        {/* Avatar */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 mb-4">
          <h2 className="text-base font-bold text-gray-900 mb-4">Ảnh đại diện</h2>
          <div className="flex items-center gap-5">
            <Avatar
              src={avatarPreview}
              name={watch('displayName') || user?.displayName || user?.username || 'Người chơi'}
              size="2xl"
              shape="rounded"
              className="border-2 border-gray-200"
            />
            <p className="text-sm text-gray-600">
              Dán `Avatar URL` bên dưới rồi bấm <strong>Lưu thay đổi</strong> để cập nhật ảnh.
            </p>
          </div>
        </div>

        {/* Profile Info */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 mb-4">
          <h2 className="text-base font-bold text-gray-700 mb-4">Thông tin cá nhân</h2>
          <form onSubmit={handleSubmit(onSaveProfile)} className="space-y-4">
            <Input
              label="Tên hiển thị"
              placeholder="Nhập tên hiển thị"
              fullWidth
              {...register('displayName')}
              error={errors.displayName?.message}
              disabled={isSubmitting}
            />
            <Input
              label="Avatar URL (tùy chọn)"
              placeholder="https://example.com/avatar.png"
              fullWidth
              {...register('avatarUrl')}
              error={errors.avatarUrl?.message}
              disabled={isSubmitting}
            />
            <div className="flex gap-3 pt-2">
              <Button type="submit" variant="primary" loading={isSubmitting}>
                Lưu thay đổi
              </Button>
              <Link to="/profile">
                <Button type="button" variant="outline">
                  Hủy
                </Button>
              </Link>
            </div>
          </form>
        </div>

        {/* Change Password */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
          <h2 className="text-base font-bold text-gray-900 mb-4">Đổi mật khẩu</h2>
          <form onSubmit={handlePwd(onChangePassword)} className="space-y-4">
            <Input
              label="Mật khẩu hiện tại"
              type="password"
              placeholder="••••••••"
              fullWidth
              {...regPwd('currentPassword')}
              error={pwdErrors.currentPassword?.message}
              disabled={isPwdSubmitting}
            />
            <Input
              label="Mật khẩu mới"
              type="password"
              placeholder="••••••••"
              fullWidth
              {...regPwd('newPassword')}
              error={pwdErrors.newPassword?.message}
              disabled={isPwdSubmitting}
            />
            <Input
              label="Xác nhận mật khẩu mới"
              type="password"
              placeholder="••••••••"
              fullWidth
              {...regPwd('confirmPassword')}
              error={pwdErrors.confirmPassword?.message}
              disabled={isPwdSubmitting}
            />
            <Button type="submit" variant="secondary" loading={isPwdSubmitting}>
              Đổi mật khẩu
            </Button>
          </form>
        </div>
        <Link to="/profile" className="text-sm text-blue-500 hover:underline">
          ← Quay lại hồ sơ
        </Link>
      </div>
    </div>
  )
}

export default EditProfilePage
