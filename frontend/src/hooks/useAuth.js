import { useState, useCallback, useEffect } from 'react'
import { useAuthStore } from '../store'
import authService from '../services/authService'

/**
 * Custom hook để quản lý authentication
 * 
 * @example
 * const { user, login, logout, loading, error } = useAuth()
 * 
 * @returns {Object} Auth state và methods
 */
export const useAuth = () => {
  const { user, isAuthenticated, login: setLogin, logout: setLogout, loadUser } = useAuthStore()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  /**
   * Đăng nhập
   * @param {Object} credentials - Username/email và password
   * @returns {Promise<Object>} User data
   */
  const login = useCallback(async (credentials) => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await authService.login(credentials)
      setLogin(response.user, response.token)
      
      return response.user
    } catch (err) {
      setError(err.message || 'Login failed')
      throw err
    } finally {
      setLoading(false)
    }
  }, [setLogin])

  /**
   * Đăng ký
   * @param {Object} userData - Thông tin đăng ký
   * @returns {Promise<Object>} User data
   */
  const register = useCallback(async (userData) => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await authService.register(userData)
      setLogin(response.user, response.token)
      
      return response.user
    } catch (err) {
      setError(err.message || 'Registration failed')
      throw err
    } finally {
      setLoading(false)
    }
  }, [setLogin])

  /**
   * Đăng xuất
   */
  const logout = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      
      await authService.logout()
      setLogout()
    } catch (err) {
      setError(err.message || 'Logout failed')
      // Vẫn logout ở client dù API lỗi
      setLogout()
    } finally {
      setLoading(false)
    }
  }, [setLogout])

  /**
   * Quên mật khẩu
   * @param {string} email - Email để reset password
   * @returns {Promise<Object>} Response message
   */
  const forgotPassword = useCallback(async (email) => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await authService.forgotPassword(email)
      return response
    } catch (err) {
      setError(err.message || 'Failed to send reset email')
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  /**
   * Reset mật khẩu
   * @param {string} token - Reset token
   * @param {string} newPassword - Mật khẩu mới
   * @returns {Promise<Object>} Response message
   */
  const resetPassword = useCallback(async (token, newPassword) => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await authService.resetPassword(token, newPassword)
      return response
    } catch (err) {
      setError(err.message || 'Failed to reset password')
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  /**
   * Đổi mật khẩu
   * @param {Object} passwords - Old và new password
   * @returns {Promise<Object>} Response message
   */
  const changePassword = useCallback(async (passwords) => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await authService.changePassword(passwords)
      return response
    } catch (err) {
      setError(err.message || 'Failed to change password')
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  /**
   * Refresh user data từ server
   * @returns {Promise<Object>} Updated user data
   */
  const refreshUser = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      
      const userData = await authService.getCurrentUser()
      const token = localStorage.getItem('token')
      setLogin(userData, token)
      
      return userData
    } catch (err) {
      setError(err.message || 'Failed to refresh user data')
      throw err
    } finally {
      setLoading(false)
    }
  }, [setLogin])

  /**
   * Kiểm tra username availability
   * @param {string} username - Username cần check
   * @returns {Promise<boolean>} True nếu available
   */
  const checkUsername = useCallback(async (username) => {
    try {
      const response = await authService.checkUsernameAvailability(username)
      return response.available
    } catch (err) {
      console.error('Failed to check username:', err)
      return false
    }
  }, [])

  /**
   * Kiểm tra email availability
   * @param {string} email - Email cần check
   * @returns {Promise<boolean>} True nếu available
   */
  const checkEmail = useCallback(async (email) => {
    try {
      const response = await authService.checkEmailAvailability(email)
      return response.available
    } catch (err) {
      console.error('Failed to check email:', err)
      return false
    }
  }, [])

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setError(null)
  }, [])

  // Load user từ localStorage khi component mount
  useEffect(() => {
    loadUser()
  }, [loadUser])

  return {
    // State
    user,
    isAuthenticated,
    loading,
    error,
    
    // Methods
    login,
    register,
    logout,
    forgotPassword,
    resetPassword,
    changePassword,
    refreshUser,
    checkUsername,
    checkEmail,
    clearError,
  }
}

export default useAuth
