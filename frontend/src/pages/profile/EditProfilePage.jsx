import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useAuthStore } from '@/store'
import { Button, Input, useNotification } from '@/components/common'

const profileSchema = z.object({
  displayName: z.string().min(2, 'Tên hiển thị tối thiểu 2 ký tự').max(50),
  bio: z.string().max(200, 'Bio tối đa 200 ký tự').optional(),
  country: z.string().optional(),
  language: z.enum(['vi', 'en']),
})

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(6, 'Nhập mật khẩu hiện tại'),
    newPassword: z.string().min(6, 'Mật khẩu mới tối thiểu 6 ký tự'),
    confirmPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: 'Mật khẩu xác nhận không khớp',
    path: ['confirmPassword'],
  })

const EditProfilePage = () => {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { showNotification } = useNotification()
  const [avatarPreview, setAvatarPreview] = useState(
    user?.avatarUrl ?? 'https://i.pravatar.cc/150?img=1'
  )

  // Profile form
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      displayName: user?.displayName ?? user?.username ?? 'TestUser',
      bio: user?.bio ?? '',
      country: user?.country ?? '',
      language: 'vi',
    },
    mode: 'onTouched',
  })

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
    // TODO: gọi authService.updateProfile(data)
    await new Promise((r) => setTimeout(r, 800))
    showNotification({ type: 'success', title: 'Đã lưu', message: 'Hồ sơ cập nhật thành công.' })
    navigate('/profile')
  }

  const onChangePassword = async (data) => {
    // TODO: gọi authService.changePassword(data)
    await new Promise((r) => setTimeout(r, 800))
    showNotification({
      type: 'success',
      title: 'Đã đổi mật khẩu',
      message: 'Mật khẩu đã được cập nhật.',
    })
    resetPwd()
  }

  const onAvatarChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    // TODO: crop + upload lên Cloudinary/S3
    const url = URL.createObjectURL(file)
    setAvatarPreview(url)
    showNotification({
      type: 'info',
      title: 'Avatar chọn xong',
      message: 'Upload API chưa làm — đang dùng preview local.',
    })
  }

  return (
    <div className="pb-12">
        <div className="max-w-2xl mx-auto px-4 pt-6">
          {/* Avatar */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 mb-4">
            <h2 className="text-base font-bold text-gray-900 mb-4">Ảnh đại diện</h2>
            <div className="flex items-center gap-5">
              <img
                src={avatarPreview}
                alt="avatar"
                className="w-20 h-20 rounded-2xl object-cover border-2 border-gray-200"
              />
              <div>
                <label className="cursor-pointer inline-block px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-600 text-sm font-semibold rounded-lg border border-blue-200 transition">
                  Chọn ảnh
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={onAvatarChange}
                  />
                </label>
                <p className="text-xs text-gray-400 mt-2">JPG, PNG, GIF — tối đa 5MB</p>
                <p className="text-xs text-yellow-600 mt-1">⚠️ Crop & upload API chưa implement</p>
              </div>
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
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Bio</label>
                <textarea
                  {...register('bio')}
                  placeholder="Giới thiệu ngắn về bản thân..."
                  rows={3}
                  disabled={isSubmitting}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 text-sm focus:outline-none focus:border-blue-500 resize-none disabled:opacity-50"
                />
                {errors.bio && <p className="text-xs text-red-600 mt-1">{errors.bio.message}</p>}
              </div>
              <Input
                label="Quốc gia"
                placeholder="VD: Việt Nam"
                fullWidth
                {...register('country')}
                disabled={isSubmitting}
              />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Ngôn ngữ</label>
                <select
                  {...register('language')}
                  disabled={isSubmitting}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 text-sm focus:outline-none focus:border-blue-500 bg-white"
                >
                  <option value="vi">Tiếng Việt</option>
                  <option value="en">English</option>
                </select>
              </div>
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
