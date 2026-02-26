/**
 * Theme Configuration - Cấu hình màu sắc và style toàn dự án
 * 
 * Sử dụng: import { THEME } from '@/styles/theme'
 * 
 * Lưu ý: Để thay đổi theme toàn bộ app, chỉ cần sửa file này
 */

export const THEME = {
  // Màu nền chính
  background: {
    page: 'bg-gray-50',           // Nền trang
    card: 'bg-white',              // Nền card
    hover: 'bg-gray-100',          // Hover state
    active: 'bg-gray-200',         // Active state
  },

  // Màu chữ
  text: {
    primary: 'text-gray-900',      // Chữ chính
    secondary: 'text-gray-600',    // Chữ phụ
    muted: 'text-gray-400',        // Chữ mờ
    inverse: 'text-white',         // Chữ trên nền tối
  },

  // Màu chủ đạo (Primary - Xanh dương)
  primary: {
    DEFAULT: 'bg-blue-600',
    hover: 'hover:bg-blue-700',
    text: 'text-blue-600',
    textHover: 'hover:text-blue-700',
    border: 'border-blue-600',
    light: 'bg-blue-50',
    lightText: 'text-blue-700',
  },

  // Màu thành công (Success - Xanh lá)
  success: {
    DEFAULT: 'bg-green-600',
    hover: 'hover:bg-green-700',
    text: 'text-green-600',
    light: 'bg-green-50',
    lightText: 'text-green-700',
  },

  // Màu cảnh báo (Warning - Vàng)
  warning: {
    DEFAULT: 'bg-yellow-500',
    hover: 'hover:bg-yellow-600',
    text: 'text-yellow-600',
    light: 'bg-yellow-50',
    lightText: 'text-yellow-700',
  },

  // Màu lỗi (Error - Đỏ)
  error: {
    DEFAULT: 'bg-red-600',
    hover: 'hover:bg-red-700',
    text: 'text-red-600',
    light: 'bg-red-50',
    lightText: 'text-red-700',
  },

  // Viền và đường kẻ
  border: {
    DEFAULT: 'border-gray-200',
    hover: 'hover:border-gray-300',
    focus: 'focus:border-blue-500',
  },

  // Bo tròn
  rounded: {
    sm: 'rounded-md',
    DEFAULT: 'rounded-lg',
    lg: 'rounded-xl',
    full: 'rounded-full',
  },

  // Shadow
  shadow: {
    sm: 'shadow-sm',
    DEFAULT: 'shadow-md',
    lg: 'shadow-lg',
  },

  // Khoảng cách
  spacing: {
    section: 'space-y-6',  // Khoảng cách giữa các section
    card: 'p-6',           // Padding trong card
    page: 'p-4 sm:p-6',    // Padding trang
  },
}

/**
 * Component Classes - Các class thường dùng cho components
 */
export const COMPONENT_STYLES = {
  // Card chuẩn
  card: `${THEME.background.card} ${THEME.rounded.lg} ${THEME.shadow.sm} ${THEME.border.DEFAULT} border ${THEME.spacing.card}`,
  
  // Button primary
  buttonPrimary: `${THEME.primary.DEFAULT} ${THEME.primary.hover} ${THEME.text.inverse} font-semibold py-2 px-4 ${THEME.rounded.DEFAULT} transition-colors`,
  
  // Button secondary
  buttonSecondary: `${THEME.background.card} ${THEME.text.primary} ${THEME.border.DEFAULT} border font-semibold py-2 px-4 ${THEME.rounded.DEFAULT} ${THEME.background.hover} transition-colors`,
  
  // Input field
  input: `w-full px-4 py-2 ${THEME.rounded.DEFAULT} ${THEME.border.DEFAULT} border ${THEME.border.focus} focus:outline-none transition-colors`,
  
  // Page container
  pageContainer: `min-h-screen ${THEME.background.page} ${THEME.spacing.page}`,
  
  // Content wrapper (max-width container)
  contentWrapper: 'max-w-7xl mx-auto',
  
  // Section title
  sectionTitle: `text-2xl font-bold ${THEME.text.primary} mb-4`,
}

/**
 * Status Colors - Màu cho các trạng thái game
 */
export const STATUS_COLORS = {
  win: {
    bg: THEME.success.light,
    text: THEME.success.lightText,
    icon: THEME.success.text,
  },
  lose: {
    bg: THEME.error.light,
    text: THEME.error.lightText,
    icon: THEME.error.text,
  },
  draw: {
    bg: 'bg-gray-50',
    text: 'text-gray-700',
    icon: 'text-gray-500',
  },
  waiting: {
    bg: THEME.warning.light,
    text: THEME.warning.lightText,
    icon: THEME.warning.text,
  },
  playing: {
    bg: THEME.primary.light,
    text: THEME.primary.lightText,
    icon: THEME.primary.text,
  },
}

export default THEME
