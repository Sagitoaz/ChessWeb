/**
 * formatters.js - Các hàm format dữ liệu hiển thị
 * Date, number, rating, time, chess notation...
 */

// ─────────────── Date & Time ───────────────

/**
 * Format ngày tháng theo locale vi-VN
 * @param {string|Date} date
 * @returns {string} Ví dụ: "19/02/2026"
 */
export const formatDate = (date) => {
  if (!date) return '—'
  return new Date(date).toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

/**
 * Format ngày + giờ
 * @param {string|Date} date
 * @returns {string} Ví dụ: "19/02/2026 14:30"
 */
export const formatDateTime = (date) => {
  if (!date) return '—'
  return new Date(date).toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/**
 * Format thời gian tương đối (e.g., "3 phút trước", "hôm qua")
 * @param {string|Date} date
 * @returns {string}
 */
export const formatRelativeTime = (date) => {
  if (!date) return '—'
  const now = Date.now()
  const diff = now - new Date(date).getTime() // ms

  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (seconds < 60) return 'vừa xong'
  if (minutes < 60) return `${minutes} phút trước`
  if (hours < 24) return `${hours} giờ trước`
  if (days === 1) return 'hôm qua'
  if (days < 7) return `${days} ngày trước`
  return formatDate(date)
}

// ─────────────── Chess Timer ───────────────

/**
 * Format seconds thành MM:SS để hiển thị đồng hồ game
 * @param {number} totalSeconds
 * @returns {string} Ví dụ: "09:45"
 */
export const formatChessClock = (totalSeconds) => {
  if (totalSeconds < 0) return '00:00'
  const m = Math.floor(totalSeconds / 60)
  const s = totalSeconds % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

/**
 * Format ms thành MM:SS:mm (cho replay chi tiết)
 * @param {number} ms
 * @returns {string}
 */
export const formatClockMs = (ms) => {
  const totalSeconds = Math.floor(ms / 1000)
  const millis = Math.floor((ms % 1000) / 10)
  const m = Math.floor(totalSeconds / 60)
  const s = totalSeconds % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(millis).padStart(2, '0')}`
}

// ─────────────── Elo / Rating ───────────────

/**
 * Format Elo rating, thêm dấu + nếu dương
 * @param {number} delta - Thay đổi elo (có thể âm)
 * @returns {string} Ví dụ: "+12", "-8"
 */
export const formatEloDelta = (delta) => {
  if (delta === 0) return '±0'
  return delta > 0 ? `+${delta}` : `${delta}`
}

/**
 * Lấy màu hiển thị theo elo delta
 * @param {number} delta
 * @returns {'text-green-400'|'text-red-400'|'text-gray-400'}
 */
export const eloDeltaColor = (delta) => {
  if (delta > 0) return 'text-green-400'
  if (delta < 0) return 'text-red-400'
  return 'text-gray-400'
}

/**
 * Lấy tên rank theo rating
 * @param {number} rating
 * @returns {string}
 */
export const getRankTitle = (rating) => {
  if (rating < 800) return 'Beginner'
  if (rating < 1000) return 'Novice'
  if (rating < 1200) return 'Intermediate'
  if (rating < 1400) return 'Advanced'
  if (rating < 1600) return 'Expert'
  if (rating < 1800) return 'Master'
  if (rating < 2000) return 'International Master'
  return 'Grandmaster'
}

// ─────────────── Game result ───────────────

/**
 * Format kết quả game thành text dễ đọc
 * @param {'win'|'lose'|'draw'} result
 * @returns {string}
 */
export const formatGameResult = (result) => {
  const map = { win: 'Thắng', lose: 'Thua', draw: 'Hòa' }
  return map[result] || result
}

/**
 * Màu hiển thị theo kết quả
 * @param {'win'|'lose'|'draw'} result
 * @returns {string} Tailwind class
 */
export const gameResultColor = (result) => {
  const map = {
    win: 'text-green-400',
    lose: 'text-red-400',
    draw: 'text-yellow-400',
  }
  return map[result] || 'text-gray-400'
}

// ─────────────── Number ───────────────

/**
 * Format số lớn với dấu phân cách
 * @param {number} num
 * @returns {string} Ví dụ: "1,234,567"
 */
export const formatNumber = (num) => {
  if (num === null || num === undefined) return '0'
  return Number(num).toLocaleString('en-US')
}

/**
 * Format phần trăm
 * @param {number} value - 0 đến 1 hoặc 0 đến 100
 * @param {boolean} isDecimal - true nếu value là 0-1
 * @returns {string} Ví dụ: "65.4%"
 */
export const formatPercent = (value, isDecimal = true) => {
  const percent = isDecimal ? value * 100 : value
  return `${percent.toFixed(1)}%`
}

// ─────────────── String ───────────────

/**
 * Truncate chuỗi dài
 * @param {string} str
 * @param {number} maxLen
 * @returns {string}
 */
export const truncate = (str, maxLen = 50) => {
  if (!str) return ''
  return str.length > maxLen ? str.slice(0, maxLen - 3) + '...' : str
}

/**
 * Capitalize chữ cái đầu
 * @param {string} str
 * @returns {string}
 */
export const capitalize = (str) => {
  if (!str) return ''
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase()
}
