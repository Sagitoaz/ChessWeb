const GOOGLE_GSI_SRC = 'https://accounts.google.com/gsi/client'

let googleScriptPromise = null

const getGoogleClientId = () => String(import.meta.env.VITE_GOOGLE_CLIENT_ID || '').trim()

const loadGoogleScript = () => {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Google OAuth chỉ hỗ trợ trên trình duyệt.'))
  }

  if (window.google?.accounts?.id) {
    return Promise.resolve(window.google)
  }

  if (googleScriptPromise) return googleScriptPromise

  googleScriptPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${GOOGLE_GSI_SRC}"]`)
    if (existing) {
      existing.addEventListener('load', () => resolve(window.google))
      existing.addEventListener('error', () => reject(new Error('Không tải được Google SDK.')))
      return
    }

    const script = document.createElement('script')
    script.src = GOOGLE_GSI_SRC
    script.async = true
    script.defer = true
    script.onload = () => resolve(window.google)
    script.onerror = () => reject(new Error('Không tải được Google SDK.'))
    document.head.appendChild(script)
  })

  return googleScriptPromise
}

export const requestGoogleCredential = async () => {
  const clientId = getGoogleClientId()
  if (!clientId) {
    throw new Error('Thiếu VITE_GOOGLE_CLIENT_ID. Vui lòng cấu hình Google OAuth.')
  }

  const google = await loadGoogleScript()
  if (!google?.accounts?.id) {
    throw new Error('Google SDK chưa sẵn sàng.')
  }

  return new Promise((resolve, reject) => {
    let done = false
    const timeout = setTimeout(() => {
      if (done) return
      done = true
      reject(new Error('Không nhận được phản hồi từ Google.'))
    }, 15000)

    google.accounts.id.initialize({
      client_id: clientId,
      auto_select: false,
      callback: (response) => {
        if (done) return
        done = true
        clearTimeout(timeout)
        if (response?.credential) {
          resolve(response.credential)
          return
        }
        reject(new Error('Google không trả về credential hợp lệ.'))
      },
    })

    google.accounts.id.prompt((notification) => {
      if (done) return
      const notDisplayed =
        typeof notification?.isNotDisplayed === 'function' && notification.isNotDisplayed()
      const skipped =
        typeof notification?.isSkippedMoment === 'function' && notification.isSkippedMoment()
      const dismissed =
        typeof notification?.isDismissedMoment === 'function' && notification.isDismissedMoment()

      if (notDisplayed || skipped || dismissed) {
        done = true
        clearTimeout(timeout)
        reject(
          new Error(
            'Không thể mở Google One Tap. Hãy thử lại hoặc kiểm tra quyền cookie/trình duyệt.'
          )
        )
      }
    })
  })
}
