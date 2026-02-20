import { apiCall } from './api'
import { API_ENDPOINTS } from '../utils/constants'

/**
 * Auth Service - Quản lý tất cả API calls liên quan đến authentication
 * 
 * @module authService
 */

const authService = {
  /**
   * Đăng nhập
   * @param {Object} credentials - Username/email và password
   * @param {string} credentials.username - Username hoặc email
   * @param {string} credentials.password - Password
   * @returns {Promise<{user: Object, token: string, refreshToken: string}>}
   */
  async login(credentials) {
    try {
      const response = await apiCall('POST', API_ENDPOINTS.LOGIN, credentials)
      
      // Lưu tokens vào localStorage
      if (response.token) {
        localStorage.setItem('token', response.token)
      }
      if (response.refreshToken) {
        localStorage.setItem('refreshToken', response.refreshToken)
      }
      
      return response
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
   * @returns {Promise<{user: Object, token: string, refreshToken: string}>}
   */
  async register(userData) {
    try {
      const response = await apiCall('POST', API_ENDPOINTS.REGISTER, userData)
      
      // Lưu tokens vào localStorage (auto login sau khi đăng ký)
      if (response.token) {
        localStorage.setItem('token', response.token)
      }
      if (response.refreshToken) {
        localStorage.setItem('refreshToken', response.refreshToken)
      }
      
      return response
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
      // Gọi API logout để invalidate token trên server
      await apiCall('POST', API_ENDPOINTS.LOGOUT)
    } catch (error) {
      // Vẫn logout ở client dù API lỗi
      console.error('Logout API error:', error)
    } finally {
      // Clear tokens từ localStorage
      localStorage.removeItem('token')
      localStorage.removeItem('refreshToken')
      localStorage.removeItem('user')
    }
  },

  /**
   * Refresh token khi hết hạn
   * @param {string} refreshToken - Refresh token
   * @returns {Promise<{token: string, refreshToken: string}>}
   */
  async refreshToken(refreshToken) {
    try {
      const response = await apiCall('POST', API_ENDPOINTS.REFRESH_TOKEN, {
        refreshToken,
      })
      
      // Cập nhật token mới
      if (response.token) {
        localStorage.setItem('token', response.token)
      }
      if (response.refreshToken) {
        localStorage.setItem('refreshToken', response.refreshToken)
      }
      
      return response
    } catch (error) {
      // Token refresh failed - force logout
      localStorage.removeItem('token')
      localStorage.removeItem('refreshToken')
      localStorage.removeItem('user')
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
      return response
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
      return response
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
      return response
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
      return response
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
      return response
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
      return response
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
      return response
    } catch (error) {
      throw this.handleError(error)
    }
  },

  /**
   * Gửi lại email verification
   * @returns {Promise<{message: string}>}
   */
  async resendVerificationEmail() {
    try {
      const response = await apiCall('POST', '/auth/resend-verification')
      return response
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
      const message = error.response.data?.message || error.response.data?.error || 'An error occurred'
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
