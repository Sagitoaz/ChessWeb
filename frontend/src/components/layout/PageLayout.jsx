/**
 * PageLayout Component
 * 
 * Component layout chuẩn cho tất cả pages trong app
 * Giúp thống nhất giao diện và dễ dàng thay đổi theme
 * 
 * Props:
 * - title: Tiêu đề trang (hiển thị ở đầu page)
 * - subtitle: Mô tả ngắn (optional)
 * - actions: Các button/controls ở header (optional)
 * - maxWidth: Độ rộng tối đa (default: 7xl)
 * - noPadding: Bỏ padding (default: false)
 * - className: Custom classes
 * - children: Nội dung trang
 */

import { THEME } from '@/styles/theme'

export default function PageLayout({
  title,
  subtitle,
  actions,
  maxWidth = '7xl',
  noPadding = false,
  className = '',
  children,
}) {
  const maxWidthClass = {
    '4xl': 'max-w-4xl',
    '5xl': 'max-w-5xl',
    '6xl': 'max-w-6xl',
    '7xl': 'max-w-7xl',
  }[maxWidth] || 'max-w-7xl'

  return (
    <div className={`min-h-screen ${THEME.background.page} ${className}`}>
      <div className={`${maxWidthClass} mx-auto ${noPadding ? '' : 'p-4 sm:p-6'}`}>
        {/* Page Header */}
        {(title || actions) && (
          <div className="mb-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                {title && (
                  <h1 className={`text-3xl font-bold ${THEME.text.primary}`}>
                    {title}
                  </h1>
                )}
                {subtitle && (
                  <p className={`mt-2 text-sm ${THEME.text.secondary}`}>
                    {subtitle}
                  </p>
                )}
              </div>
              {actions && <div className="flex items-center gap-2">{actions}</div>}
            </div>
          </div>
        )}

        {/* Page Content */}
        <div>{children}</div>
      </div>
    </div>
  )
}

/**
 * PageSection Component
 * 
 * Component cho các section trong page
 * Tự động có spacing và style chuẩn
 */
export function PageSection({ title, actions, children, className = '' }) {
  return (
    <div className={`mb-6 ${className}`}>
      {(title || actions) && (
        <div className="flex items-center justify-between mb-4">
          {title && (
            <h2 className={`text-xl font-semibold ${THEME.text.primary}`}>
              {title}
            </h2>
          )}
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}
      {children}
    </div>
  )
}

/**
 * PageCard Component
 * 
 * Card chuẩn với style thống nhất
 */
export function PageCard({ title, children, className = '', padding = true }) {
  return (
    <div
      className={`${THEME.background.card} ${THEME.rounded.lg} ${THEME.shadow.sm} border ${THEME.border.DEFAULT} ${padding ? 'p-6' : ''} ${className}`}
    >
      {title && (
        <h3 className={`text-lg font-semibold ${THEME.text.primary} mb-4`}>
          {title}
        </h3>
      )}
      {children}
    </div>
  )
}

/**
 * EmptyState Component
 * 
 * Hiển thị khi không có dữ liệu
 */
export function EmptyState({ icon, title, description, action }) {
  return (
    <div className={`text-center py-12 ${THEME.background.card} ${THEME.rounded.lg} border ${THEME.border.DEFAULT}`}>
      {icon && <div className={`text-5xl mb-4 ${THEME.text.muted}`}>{icon}</div>}
      <h3 className={`text-lg font-semibold ${THEME.text.primary} mb-2`}>
        {title}
      </h3>
      {description && (
        <p className={`${THEME.text.secondary} mb-4 max-w-md mx-auto`}>
          {description}
        </p>
      )}
      {action && <div className="mt-6">{action}</div>}
    </div>
  )
}

/**
 * LoadingState Component
 * 
 * Hiển thị khi đang loading
 */
export function LoadingState({ message = 'Đang tải...' }) {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
      <p className={THEME.text.secondary}>{message}</p>
    </div>
  )
}
