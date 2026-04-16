import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useNotification } from '@/components/common/Notification'
import { Card, Button, Input } from '@/components/common'
import gameService from '@/services/gameService'
import { ArrowLeft, Trophy, Calendar, ChevronRight, ChevronLeft, Check, Info } from 'lucide-react'

// Tournament format options
const FORMATS = [
  {
    value: 'knockout',
    label: 'Knockout',
    description: 'Thua 1 trận là bị loại',
    icon: '🏆',
  },
]

const TIME_CONTROLS = [
  { value: '3+0', label: '3 min', type: 'Bullet' },
  { value: '3+2', label: '3+2', type: 'Bullet' },
  { value: '5+0', label: '5 min', type: 'Blitz' },
  { value: '10+0', label: '10 min', type: 'Rapid' },
  { value: '15+10', label: '15+10', type: 'Rapid' },
  { value: '30+0', label: '30 min', type: 'Classical' },
]

const PARTICIPANT_OPTIONS = [4, 8, 16, 32, 64]

export default function CreateTournamentPage() {
  const navigate = useNavigate()
  const { showNotification } = useNotification()
  const [currentStep, setCurrentStep] = useState(1)
  const [isCreating, setIsCreating] = useState(false)

  // Form data
  const [formData, setFormData] = useState({
    // Step 1: Basic Info
    name: '',
    description: '',
    prize: '',

    // Step 2: Settings
    format: 'knockout',
    maxParticipants: 8,
    timeControl: '10+0',

    // Step 3: Schedule
    startDate: '',
    startTime: '',
    registrationDeadline: '',
  })

  const [errors, setErrors] = useState({})

  const updateField = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    // Clear error when user types
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }))
    }
  }

  const validateStep = (step) => {
    const newErrors = {}

    if (step === 1) {
      if (!formData.name.trim()) {
        newErrors.name = 'Vui lòng nhập tên giải đấu'
      }
    }

    if (step === 3) {
      if (!formData.startDate) {
        newErrors.startDate = 'Vui lòng chọn ngày bắt đầu'
      }
      if (!formData.startTime) {
        newErrors.startTime = 'Vui lòng chọn giờ bắt đầu'
      }
      if (!formData.registrationDeadline) {
        newErrors.registrationDeadline = 'Vui lòng chọn hạn đăng ký'
      }

      // Validate dates
      if (formData.startDate && formData.registrationDeadline) {
        const startDateTime = new Date(`${formData.startDate}T${formData.startTime || '00:00'}`)
        const deadline = new Date(formData.registrationDeadline)

        if (deadline >= startDateTime) {
          newErrors.registrationDeadline = 'Hạn đăng ký phải trước thời gian bắt đầu'
        }

        if (startDateTime <= new Date()) {
          newErrors.startDate = 'Thời gian bắt đầu phải trong tương lai'
        }
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep((prev) => Math.min(4, prev + 1))
    }
  }

  const handleBack = () => {
    setCurrentStep((prev) => Math.max(1, prev - 1))
  }

  const handleCreate = async () => {
    if (!validateStep(currentStep)) return

    setIsCreating(true)

    try {
      const startAt = new Date(`${formData.startDate}T${formData.startTime}:00`)
      const endAt = new Date(startAt.getTime() + 4 * 60 * 60 * 1000)

      const payload = {
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        prize: formData.prize.trim() || undefined,
        format: 'knockout',
        maxParticipants: Number(formData.maxParticipants),
        timeControl: formData.timeControl,
        startAt: startAt.toISOString(),
        endAt: endAt.toISOString(),
      }

      const response = await gameService.createTournament(payload)
      const data = response?.data ?? response
      const createdId = data?.id || data?._id
      if (createdId) {
        navigate(`/tournaments/${createdId}`)
      } else {
        navigate('/tournaments')
      }
    } catch (_error) {
      showNotification({
        type: 'error',
        title: 'Lỗi tạo giải',
        message: 'Không thể tạo giải đấu, vui lòng thử lại.',
      })
    } finally {
      setIsCreating(false)
    }
  }

  const steps = [
    { number: 1, title: 'Thông tin cơ bản', icon: Info },
    { number: 2, title: 'Cài đặt', icon: Trophy },
    { number: 3, title: 'Lịch trình', icon: Calendar },
    { number: 4, title: 'Xem lại', icon: Check },
  ]

  return (
    <div className="min-h-screen bg-[#e1edff] p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-6">
          <Button variant="ghost" onClick={() => navigate('/tournaments')} className="mb-4">
            <ArrowLeft size={18} />
            Quay lại
          </Button>
          <h1 className="text-4xl font-bold text-blue-600 mb-2">Tạo giải đấu mới</h1>
          <p className="text-lg text-gray-800">Tổ chức giải đấu cờ vua của riêng bạn</p>
        </div>

        {/* Stepper */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => {
              const Icon = step.icon
              const isActive = currentStep === step.number
              const isCompleted = currentStep > step.number

              return (
                <React.Fragment key={step.number}>
                  <div className="flex flex-col items-center flex-1">
                    <div
                      className={`w-12 h-12 rounded-full flex items-center justify-center mb-2 ${
                        isCompleted
                          ? 'bg-green-500 text-white'
                          : isActive
                            ? 'bg-blue-600 text-white'
                            : 'bg-white text-gray-400 border-2 border-gray-300'
                      }`}
                    >
                      {isCompleted ? <Check size={24} /> : <Icon size={24} />}
                    </div>
                    <p
                      className={`text-sm font-medium text-center ${
                        isActive
                          ? 'text-blue-600'
                          : isCompleted
                            ? 'text-green-600'
                            : 'text-gray-500'
                      }`}
                    >
                      {step.title}
                    </p>
                  </div>
                  {index < steps.length - 1 && (
                    <div
                      className={`flex-1 h-1 mx-2 mt-[-20px] ${
                        currentStep > step.number ? 'bg-green-500' : 'bg-gray-300'
                      }`}
                    />
                  )}
                </React.Fragment>
              )
            })}
          </div>
        </div>

        <Card
          variant="elevated"
          padding="none"
          className="bg-white shadow-md border-none rounded-xl overflow-hidden"
        >
          <div className="p-8">
            {/* Step 1: Basic Info */}
            {currentStep === 1 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold text-blue-400 mb-2">Thông tin cơ bản</h2>
                  <p className="text-gray-600">Điền thông tin chung về giải đấu</p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Tên giải đấu <span className="text-red-500">*</span>
                  </label>
                  <Input
                    placeholder="Ví dụ: Giải Cờ Vua Mùa Xuân 2026"
                    value={formData.name}
                    onChange={(e) => updateField('name', e.target.value)}
                    fullWidth
                    error={errors.name}
                    maxLength={100}
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Mô tả (tùy chọn)
                  </label>
                  <textarea
                    placeholder="Mô tả chi tiết về giải đấu, quy định, luật lệ..."
                    value={formData.description}
                    onChange={(e) => updateField('description', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                    rows={4}
                    maxLength={500}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {formData.description.length}/500 ký tự
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Giải thưởng (tùy chọn)
                  </label>
                  <Input
                    placeholder="Ví dụ: 1,000,000 VND"
                    value={formData.prize}
                    onChange={(e) => updateField('prize', e.target.value)}
                    fullWidth
                    maxLength={50}
                  />
                </div>
              </div>
            )}

            {/* Step 2: Settings */}
            {currentStep === 2 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold text-blue-400 mb-2">Cài đặt giải đấu</h2>
                  <p className="text-gray-600">Chọn định dạng và cài đặt trận đấu</p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-3">
                    Định dạng giải đấu
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {FORMATS.map((format) => (
                      <button
                        key={format.value}
                        onClick={() => updateField('format', format.value)}
                        className={`p-4 rounded-lg border-2 transition-all text-left ${
                          formData.format === format.value
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300 bg-white'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <span className="text-2xl">{format.icon}</span>
                          <div>
                            <div className="font-semibold text-gray-900">{format.label}</div>
                            <div className="text-xs text-gray-600 mt-1">{format.description}</div>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-3">
                    Số người tối đa
                  </label>
                  <div className="grid grid-cols-5 gap-3">
                    {PARTICIPANT_OPTIONS.map((num) => (
                      <button
                        key={num}
                        onClick={() => updateField('maxParticipants', num)}
                        className={`p-3 rounded-lg border-2 transition-all font-semibold ${
                          formData.maxParticipants === num
                            ? 'border-blue-500 bg-blue-50 text-blue-600'
                            : 'border-gray-200 hover:border-gray-300 bg-white text-gray-900'
                        }`}
                      >
                        {num}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Giải knockout cần số người là lũy thừa của 2 (4, 8, 16, 32, 64).
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-3">
                    Thời gian mỗi ván
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {TIME_CONTROLS.map((time) => (
                      <button
                        key={time.value}
                        onClick={() => updateField('timeControl', time.value)}
                        className={`p-3 rounded-lg border-2 transition-all ${
                          formData.timeControl === time.value
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300 bg-white'
                        }`}
                      >
                        <div className="font-semibold text-gray-900">{time.label}</div>
                        <div className="text-xs text-gray-600">{time.type}</div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Schedule */}
            {currentStep === 3 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold text-blue-400 mb-2">Lịch trình</h2>
                  <p className="text-gray-600">Đặt thời gian bắt đầu và hạn đăng ký</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">
                      Ngày bắt đầu <span className="text-red-500">*</span>
                    </label>
                    <Input
                      type="date"
                      value={formData.startDate}
                      onChange={(e) => updateField('startDate', e.target.value)}
                      fullWidth
                      error={errors.startDate}
                      min={new Date().toISOString().split('T')[0]}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">
                      Giờ bắt đầu <span className="text-red-500">*</span>
                    </label>
                    <Input
                      type="time"
                      value={formData.startTime}
                      onChange={(e) => updateField('startTime', e.target.value)}
                      fullWidth
                      error={errors.startTime}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Hạn đăng ký <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="datetime-local"
                    value={formData.registrationDeadline}
                    onChange={(e) => updateField('registrationDeadline', e.target.value)}
                    fullWidth
                    error={errors.registrationDeadline}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Người chơi chỉ có thể đăng ký trước thời điểm này
                  </p>
                </div>
              </div>
            )}

            {/* Step 4: Review */}
            {currentStep === 4 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold text-blue-400 mb-2">Xem lại thông tin</h2>
                  <p className="text-gray-600">Kiểm tra lại thông tin trước khi tạo</p>
                </div>

                <div className="space-y-4">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="font-bold text-gray-900 mb-3">Thông tin cơ bản</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Tên giải:</span>
                        <span className="font-medium text-gray-900">{formData.name}</span>
                      </div>
                      {formData.description && (
                        <div>
                          <span className="text-gray-600">Mô tả:</span>
                          <p className="font-medium text-gray-900 mt-1">{formData.description}</p>
                        </div>
                      )}
                      {formData.prize && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Giải thưởng:</span>
                          <span className="font-medium text-gray-900">{formData.prize}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="font-bold text-gray-900 mb-3">Cài đặt</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Định dạng:</span>
                        <span className="font-medium text-gray-900">
                          {FORMATS.find((f) => f.value === formData.format)?.label}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Số người tối đa:</span>
                        <span className="font-medium text-gray-900">
                          {formData.maxParticipants}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Thời gian:</span>
                        <span className="font-medium text-gray-900">{formData.timeControl}</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="font-bold text-gray-900 mb-3">Lịch trình</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Bắt đầu:</span>
                        <span className="font-medium text-gray-900">
                          {new Date(`${formData.startDate}T${formData.startTime}`).toLocaleString(
                            'vi-VN'
                          )}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Hạn đăng ký:</span>
                        <span className="font-medium text-gray-900">
                          {new Date(formData.registrationDeadline).toLocaleString('vi-VN')}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {errors.submit && (
              <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {errors.submit}
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex gap-3 pt-6 border-t border-gray-100 mt-6">
              {currentStep > 1 && (
                <Button variant="outline" onClick={handleBack} fullWidth>
                  <ChevronLeft size={18} />
                  Quay lại
                </Button>
              )}

              {currentStep < 4 ? (
                <Button
                  variant="primary"
                  onClick={handleNext}
                  fullWidth
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  Tiếp theo
                  <ChevronRight size={18} />
                </Button>
              ) : (
                <Button
                  variant="primary"
                  onClick={handleCreate}
                  loading={isCreating}
                  fullWidth
                  size="lg"
                  className="bg-green-600 hover:bg-green-700"
                >
                  <Trophy size={18} />
                  Tạo giải đấu
                </Button>
              )}
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}
