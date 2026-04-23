import { apiCall } from './api'
import { API_ENDPOINTS } from '../utils/constants'

/**
 * Auth Service - Quản lý tất cả API calls liên quan đến authentication
 * 
 * @module authService
 */

const authService = {
  unwrapApiData(response) {
    if (response && typeof response === 'object' && 'success' in response) {
      if (response.success === false) {
        const err = new Error(response.error?.message || 'Yeu cau khong thanh cong')
        err.statusCode = response.error?.code || 400
        err.data = response
        throw err
      }
      if ('data' in response) {
        return response.data ?? response
      }
    }

    if (response && typeof response === 'object' && 'data' in response) {
      return response.data ?? response
    }
    return response
  },

  /**
   * Đăng nhập
   * @param {Object} credentials - Username/email và password
   * @param {string} credentials.username - Username hoặc email
   * @param {string} credentials.password - Password
   * @returns {Promise<{user: Object, token: string}>}
   */
  async login(credentials) {
    try {
      const response = await apiCall('POST', API_ENDPOINTS.LOGIN, credentials)
      return this.unwrapApiData(response)
    } catch (error) {
      throw this.handleError(error)
    }
  },

  /**
   * Đăng ký tài khoản mới
   * @param {Object} userData - Thông tin đăng ký
   * @param {string} userData.username - Username
   * @param {string} userData.email - Email
   * @param {string} userData.password - Password
   * @param {string} [userData.displayName] - Tên hiển thị (optional)
   * @returns {Promise<{user: Object, token: string}>}
   */
  async register(userData) {
    try {
      const response = await apiCall('POST', API_ENDPOINTS.REGISTER, userData)
      return this.unwrapApiData(response)
    } catch (error) {
      throw this.handleError(error)
    }
  },

  /**
   * Đăng xuất
   * @returns {Promise<void>}
   */
  async logout() {
    try {
      await apiCall('POST', API_ENDPOINTS.LOGOUT, {})
    } catch (error) {
      // Vẫn logout ở client dù API lỗi
      console.error('Logout API error:', error)
    }
  },

  /**
   * Khôi phục phiên từ refresh cookie httpOnly
   * @returns {Promise<{token: string, user: Object}>}
   */
  async restoreSession() {
    try {
      const response = await apiCall('POST', API_ENDPOINTS.REFRESH_TOKEN, {})
      const data = this.unwrapApiData(response)

      return data
    } catch (error) {
      throw this.handleError(error)
    }
  },

  /**
   * Quên mật khẩu - Gửi email reset
   * @param {string} email - Email để reset password
   * @returns {Promise<{message: string}>}
   */
  async forgotPassword(email) {
    try {
      const response = await apiCall('POST', API_ENDPOINTS.FORGOT_PASSWORD, { email })
      return this.unwrapApiData(response)
    } catch (error) {
      throw this.handleError(error)
    }
  },

  /**
   * Reset mật khẩu với token từ email
   * @param {string} token - Reset token từ email
   * @param {string} newPassword - Mật khẩu mới
   * @returns {Promise<{message: string}>}
   */
  async resetPassword(token, newPassword) {
    try {
      const response = await apiCall('POST', '/auth/reset-password', {
        token,
        password: newPassword,
      })
      return this.unwrapApiData(response)
    } catch (error) {
      throw this.handleError(error)
    }
  },

  /**
   * Đổi mật khẩu (khi đã đăng nhập)
   * @param {Object} passwords - Old và new password
   * @param {string} passwords.oldPassword - Mật khẩu cũ
   * @param {string} passwords.newPassword - Mật khẩu mới
   * @returns {Promise<{message: string}>}
   */
  async changePassword(passwords) {
    try {
      const response = await apiCall('PUT', API_ENDPOINTS.CHANGE_PASSWORD, passwords)
      return this.unwrapApiData(response)
    } catch (error) {
      throw this.handleError(error)
    }
  },

  /**
   * Lấy thông tin user hiện tại
   * @returns {Promise<Object>} User profile
   */
  async getCurrentUser() {
    try {
      const response = await apiCall('GET', API_ENDPOINTS.GET_PROFILE)
      return this.unwrapApiData(response)
    } catch (error) {
      throw this.handleError(error)
    }
  },

  /**
   * Update profile fields supported by backend.
   * @param {{displayName?: string}} payload
   */
  async updateProfile(payload) {
    try {
      const response = await apiCall('PUT', API_ENDPOINTS.UPDATE_PROFILE, payload)
      return this.unwrapApiData(response)
    } catch (error) {
      throw this.handleError(error)
    }
  },

  /**
   * Upload avatar via URL payload.
   * @param {{avatarUrl: string, avatarPublicId?: string, mimeType?: string, fileSize?: number}} payload
   */
  async uploadAvatar(payload) {
    try {
      const response = await apiCall('POST', API_ENDPOINTS.UPLOAD_AVATAR, payload)
      return this.unwrapApiData(response)
    } catch (error) {
      throw this.handleError(error)
    }
  },

  /**
   * Login/Register with Google ID token.
   * @param {string} idToken
   */
  async googleAuth(idToken) {
    try {
      const response = await apiCall('POST', '/auth/google', { idToken })
      return this.unwrapApiData(response)
    } catch (error) {
      throw this.handleError(error)
    }
  },

  /**
   * Kiểm tra username có available không
   * @param {string} username - Username cần check
   * @returns {Promise<{available: boolean}>}
   */
  async checkUsernameAvailability(username) {
    try {
      const response = await apiCall('POST', '/auth/check-username', { username })
      return this.unwrapApiData(response)
    } catch (error) {
      throw this.handleError(error)
    }
  },

  /**
   * Kiểm tra email có available không
   * @param {string} email - Email cần check
   * @returns {Promise<{available: boolean}>}
   */
  async checkEmailAvailability(email) {
    try {
      const response = await apiCall('POST', '/auth/check-email', { email })
      return this.unwrapApiData(response)
    } catch (error) {
      throw this.handleError(error)
    }
  },

  /**
   * Verify email với token
   * @param {string} token - Verification token từ email
   * @returns {Promise<{message: string}>}
   */
  async verifyEmail(token) {
    try {
      const response = await apiCall('POST', '/auth/verify-email', { token })
      return this.unwrapApiData(response)
    } catch (error) {
      throw this.handleError(error)
    }
  },

  /**
   * Gửi lại email verification
   * @returns {Promise<{message: string}>}
   */
  async resendVerificationEmail(userId) {
    try {
      const response = await apiCall('POST', '/auth/resend-verification', { userId })
      return this.unwrapApiData(response)
    } catch (error) {
      throw this.handleError(error)
    }
  },

  /**
   * Helper function để xử lý errors từ API
   * @private
   * @param {Error} error - Error object từ API
   * @returns {Error} Formatted error
   */
  handleError(error) {
    if (error.response) {
      // Server responded với error status
      const message =
        error.response.data?.message ||
        error.response.data?.error?.message ||
        error.response.data?.error ||
        'An error occurred'
      const statusCode = error.response.status
      
      // Tạo error object với thông tin chi tiết
      const err = new Error(message)
      err.statusCode = statusCode
      err.data = error.response.data
      
      return err
    } else if (error.request) {
      // Request được gửi nhưng không nhận response
      const err = new Error('No response from server. Please check your connection.')
      err.statusCode = 0
      return err
    } else {
      // Error trong quá trình setup request
      return error
    }
  },
}

export default authService
