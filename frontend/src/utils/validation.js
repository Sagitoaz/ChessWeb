/**
 * validation.js - Form validation helpers
 * Dùng để validate input trước khi gửi lên server
 */

// ─────────────── Primitive validators ───────────────

/**
 * Kiểm tra chuỗi không rỗng
 * @param {string} value
 * @returns {boolean}
 */
export const isRequired = (value) =>
  value !== null && value !== undefined && String(value).trim().length > 0

/**
 * Kiểm tra độ dài tối thiểu
 * @param {string} value
 * @param {number} min
 */
export const minLength = (value, min) => String(value).trim().length >= min

/**
 * Kiểm tra độ dài tối đa
 * @param {string} value
 * @param {number} max
 */
export const maxLength = (value, max) => String(value).trim().length <= max

/**
 * Kiểm tra email hợp lệ
 * @param {string} email
 */
export const isEmail = (email) => {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return regex.test(String(email).trim().toLowerCase())
}

/**
 * Kiểm tra format username: chỉ chứa chữ, số, dấu gạch dưới; 3-30 ký tự
 * @param {string} username
 */
export const isValidUsername = (username) => {
  const regex = /^[a-zA-Z0-9_]{3,30}$/
  return regex.test(username)
}

/**
 * Kiểm tra password đủ mạnh:
 * - Ít nhất 8 ký tự
 * - Có chữ hoa, chữ thường, số
 * @param {string} password
 */
export const isStrongPassword = (password) => {
  if (password.length < 8) return false
  const hasUpper = /[A-Z]/.test(password)
  const hasLower = /[a-z]/.test(password)
  const hasNumber = /[0-9]/.test(password)
  return hasUpper && hasLower && hasNumber
}

/**
 * Kiểm tra URL hợp lệ
 * @param {string} url
 */
export const isValidUrl = (url) => {
  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}

// ─────────────── Form validators (trả về message lỗi) ───────────────

/**
 * Validate form đăng nhập
 * @param {{ username: string, password: string }} values
 * @returns {{ username?: string, password?: string }}
 */
export const validateLoginForm = ({ username, password }) => {
  const errors = {}

  if (!isRequired(username)) {
    errors.username = 'Username là bắt buộc'
  }

  if (!isRequired(password)) {
    errors.password = 'Password là bắt buộc'
  } else if (!minLength(password, 6)) {
    errors.password = 'Password phải có ít nhất 6 ký tự'
  }

  return errors
}

/**
 * Validate form đăng ký
 * @param {{ username: string, email: string, password: string, confirmPassword: string }} values
 * @returns {Object}
 */
export const validateRegisterForm = ({ username, email, password, confirmPassword }) => {
  const errors = {}

  if (!isRequired(username)) {
    errors.username = 'Username là bắt buộc'
  } else if (!isValidUsername(username)) {
    errors.username = 'Username chỉ gồm chữ, số, dấu _ (3-30 ký tự)'
  }

  if (!isRequired(email)) {
    errors.email = 'Email là bắt buộc'
  } else if (!isEmail(email)) {
    errors.email = 'Email không hợp lệ'
  }

  if (!isRequired(password)) {
    errors.password = 'Password là bắt buộc'
  } else if (!isStrongPassword(password)) {
    errors.password = 'Password cần ít nhất 8 ký tự, gồm chữ hoa, chữ thường và số'
  }

  if (!isRequired(confirmPassword)) {
    errors.confirmPassword = 'Vui lòng xác nhận password'
  } else if (password !== confirmPassword) {
    errors.confirmPassword = 'Password không khớp'
  }

  return errors
}

/**
 * Validate form chỉnh sửa profile
 * @param {{ displayName?: string, bio?: string, email?: string }} values
 * @returns {Object}
 */
export const validateProfileForm = ({ displayName, bio, email }) => {
  const errors = {}

  if (displayName !== undefined && isRequired(displayName)) {
    if (!minLength(displayName, 2)) errors.displayName = 'Tên hiển thị cần ít nhất 2 ký tự'
    if (!maxLength(displayName, 50)) errors.displayName = 'Tên hiển thị tối đa 50 ký tự'
  }

  if (bio !== undefined && isRequired(bio)) {
    if (!maxLength(bio, 300)) errors.bio = 'Bio tối đa 300 ký tự'
  }

  if (email && !isEmail(email)) {
    errors.email = 'Email không hợp lệ'
  }

  return errors
}

/**
 * Kiểm tra object errors có lỗi không
 * @param {Object} errors
 * @returns {boolean}
 */
export const hasErrors = (errors) => Object.keys(errors).length > 0
