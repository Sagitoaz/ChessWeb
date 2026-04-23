import { useState, useCallback } from 'react'
import { useAuthStore } from '../store'
import authService from '../services/authService'
import socketService from '../services/socketService'

/**
 * Custom hook để quản lý authentication
 *
 * @example
 * const { user, login, logout, loading, error } = useAuth()
 *
 * @returns {Object} Auth state và methods
 */
export const useAuth = () => {
  const { user, token: authToken, isAuthenticated, login: setLogin, logout: setLogout } = useAuthStore()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const applyRememberPreference = useCallback((remember) => {
    const normalizedRemember = remember === false ? false : true
    localStorage.setItem('rememberMe', normalizedRemember ? 'true' : 'false')
    sessionStorage.setItem('authSession', '1')
    return normalizedRemember
  }, [])

  const normalizeAuthPayload = useCallback(async (response) => {
    const token = response?.token
    const effectiveToken =
      typeof token === 'string' && token.length > 0 && token !== 'undefined' && token !== 'null'
        ? token
        : null

    if (!effectiveToken) {
      throw new Error('Phiên đăng nhập không hợp lệ (thiếu access token).')
    }

    let resolvedUser = response?.user
    if (!resolvedUser || typeof resolvedUser !== 'object' || !resolvedUser.username) {
      const profileResponse = await authService.getCurrentUser()
      const profileUser = profileResponse?.user ?? profileResponse
      if (!profileUser || typeof profileUser !== 'object' || !profileUser.username) {
        throw new Error('Không lấy được thông tin hồ sơ người dùng.')
      }
      resolvedUser = profileUser
    }

    return {
      token: effectiveToken,
      user: resolvedUser,
    }
  }, [])

  /**
   * Đăng nhập
   * @param {Object} credentials - Username/email và password
   * @returns {Promise<Object>} User data
   */
  const login = useCallback(
    async (credentials, options = {}) => {
      try {
        setLoading(true)
        setError(null)

        const response = await authService.login({
          ...credentials,
          remember: options?.remember !== false,
        })
        const normalized = await normalizeAuthPayload(response)
        const remember = applyRememberPreference(options?.remember)
        setLogin(normalized.user, normalized.token, { remember })
        socketService.connect(normalized.token)

        return normalized.user
      } catch (err) {
        setError(err.message || 'Login failed')
        throw err
      } finally {
        setLoading(false)
      }
    },
    [applyRememberPreference, setLogin, normalizeAuthPayload]
  )

  /**
   * Đăng ký
   * @param {Object} userData - Thông tin đăng ký
   * @returns {Promise<Object>} User data
   */
  const register = useCallback(
    async (userData) => {
      try {
        setLoading(true)
        setError(null)

        const response = await authService.register(userData)
        const normalized = await normalizeAuthPayload(response)
        const remember = applyRememberPreference(true)
        setLogin(normalized.user, normalized.token, { remember })
        socketService.connect(normalized.token)

        return normalized.user
      } catch (err) {
        setError(err.message || 'Registration failed')
        throw err
      } finally {
        setLoading(false)
      }
    },
    [applyRememberPreference, setLogin, normalizeAuthPayload]
  )

  /**
   * Đăng nhập/đăng ký bằng Google.
   * @param {string} idToken
   */
  const googleAuth = useCallback(
    async (idToken) => {
      try {
        setLoading(true)
        setError(null)

        const response = await authService.googleAuth(idToken)
        const normalized = await normalizeAuthPayload(response)
        const remember = applyRememberPreference(true)
        setLogin(normalized.user, normalized.token, { remember })
        socketService.connect(normalized.token)

        return normalized.user
      } catch (err) {
        setError(err.message || 'Google authentication failed')
        throw err
      } finally {
        setLoading(false)
      }
    },
    [applyRememberPreference, normalizeAuthPayload, setLogin]
  )

  /**
   * Đăng xuất
   */
  const logout = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      await authService.logout()
      socketService.disconnect()
      setLogout()
    } catch (err) {
      setError(err.message || 'Logout failed')
      // Vẫn logout ở client dù API lỗi
      socketService.disconnect()
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

      const responseData = await authService.getCurrentUser()
      const userData = responseData?.user ?? responseData
      if (!userData || typeof userData !== 'object' || !userData.username) {
        throw new Error('Không lấy được hồ sơ người dùng hiện tại.')
      }
      if (!authToken) {
        throw new Error('Phiên truy cập hiện tại không còn access token.')
      }
      setLogin(userData, authToken)

      return userData
    } catch (err) {
      setError(err.message || 'Failed to refresh user data')
      throw err
    } finally {
      setLoading(false)
    }
  }, [authToken, setLogin])

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

  return {
    // State
    user,
    isAuthenticated,
    loading,
    error,

    // Methods
    login,
    register,
    googleAuth,
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
