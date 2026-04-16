/**
 * storageService.js - Wrapper cho localStorage/sessionStorage
 * Tự động parse/stringify JSON, xử lý lỗi an toàn
 */

const storageService = {
  // ─────────────── LocalStorage ───────────────

  /**
   * Lưu giá trị vào localStorage
   * @param {string} key
   * @param {*} value - Bất kỳ giá trị nào (auto JSON.stringify)
   */
  set(key, value) {
    try {
      const serialized = JSON.stringify(value)
      localStorage.setItem(key, serialized)
    } catch (err) {
      console.error(`[storageService] set("${key}") failed:`, err)
    }
  },

  /**
   * Lấy giá trị từ localStorage
   * @param {string} key
   * @param {*} defaultValue - Trả về nếu không tìm thấy key
   * @returns {*}
   */
  get(key, defaultValue = null) {
    try {
      const item = localStorage.getItem(key)
      if (item === null) return defaultValue
      return JSON.parse(item)
    } catch (err) {
      console.error(`[storageService] get("${key}") failed:`, err)
      return defaultValue
    }
  },

  /**
   * Xóa một key khỏi localStorage
   * @param {string} key
   */
  remove(key) {
    try {
      localStorage.removeItem(key)
    } catch (err) {
      console.error(`[storageService] remove("${key}") failed:`, err)
    }
  },

  /**
   * Xóa toàn bộ localStorage
   */
  clear() {
    try {
      localStorage.clear()
    } catch (err) {
      console.error('[storageService] clear() failed:', err)
    }
  },

  // ─────────────── Auth helpers ───────────────

  /** Lưu token đăng nhập */
  setToken(token) {
    this.set('token', token)
  },

  /** Lấy token đăng nhập */
  getToken() {
    return this.get('token', null)
  },

  /** Xóa token (đăng xuất) */
  removeToken() {
    this.remove('token')
  },

  /** Lưu thông tin user */
  setUser(user) {
    this.set('user', user)
  },

  /** Lấy thông tin user */
  getUser() {
    return this.get('user', null)
  },

  /** Xóa thông tin user */
  removeUser() {
    this.remove('user')
  },

  /** Đăng xuất: xóa token và user */
  clearAuth() {
    this.removeToken()
    this.removeUser()
  },

  // ─────────────── SessionStorage ───────────────

  /**
   * Lưu vào sessionStorage (xóa khi đóng tab)
   */
  setSession(key, value) {
    try {
      sessionStorage.setItem(key, JSON.stringify(value))
    } catch (err) {
      console.error(`[storageService] setSession("${key}") failed:`, err)
    }
  },

  /**
   * Lấy từ sessionStorage
   */
  getSession(key, defaultValue = null) {
    try {
      const item = sessionStorage.getItem(key)
      if (item === null) return defaultValue
      return JSON.parse(item)
    } catch (err) {
      console.error(`[storageService] getSession("${key}") failed:`, err)
      return defaultValue
    }
  },

  /**
   * Xóa key khỏi sessionStorage
   */
  removeSession(key) {
    try {
      sessionStorage.removeItem(key)
    } catch (err) {
      console.error(`[storageService] removeSession("${key}") failed:`, err)
    }
  },
}

export default storageService
