const GOOGLE_GSI_SRC = 'https://accounts.google.com/gsi/client'
const DEFAULT_GOOGLE_CLIENT_ID =
  '81316592871-a9408j3kfpnearnnirb5uaj7dbceh38a.apps.googleusercontent.com'

let googleScriptPromise = null
let initializedClientId = null
let credentialListener = null

export const getGoogleClientId = () =>
  String(import.meta.env.VITE_GOOGLE_CLIENT_ID || DEFAULT_GOOGLE_CLIENT_ID).trim()

export const loadGoogleScript = () => {
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

export const initializeGoogleIdentity = async (callback) => {
  const clientId = getGoogleClientId()
  if (!clientId) {
    throw new Error('Thiếu VITE_GOOGLE_CLIENT_ID. Vui lòng cấu hình Google OAuth.')
  }

  const google = await loadGoogleScript()
  if (!google?.accounts?.id) {
    throw new Error('Google SDK chưa sẵn sàng.')
  }

  credentialListener = callback

  if (initializedClientId !== clientId) {
    google.accounts.id.initialize({
      client_id: clientId,
      auto_select: false,
      ux_mode: 'popup',
      context: 'signin',
      itp_support: true,
      callback: (response) => credentialListener?.(response),
    })
    initializedClientId = clientId
  }

  return google
}

export const renderGoogleButton = async (
  element,
  {
    theme = 'outline',
    size = 'large',
    text = 'continue_with',
    shape = 'rectangular',
    logoAlignment = 'left',
  } = {}
) => {
  if (!element) {
    throw new Error('Không tìm thấy vùng hiển thị nút Google.')
  }

  const google = await initializeGoogleIdentity(credentialListener)
  element.replaceChildren()

  const width = Math.max(220, Math.round(element.getBoundingClientRect().width || 320))
  google.accounts.id.renderButton(element, {
    theme,
    size,
    text,
    shape,
    width,
    logo_alignment: logoAlignment,
  })
}

export const requestGoogleCredential = async () => {
  return new Promise((resolve, reject) => {
    let done = false
    const timeout = setTimeout(() => {
      if (done) return
      done = true
      reject(new Error('Không nhận được phản hồi từ Google.'))
    }, 15000)

    initializeGoogleIdentity((response) => {
      if (done) return
      done = true
      clearTimeout(timeout)
      if (response?.credential) {
        resolve(response.credential)
        return
      }
      reject(new Error('Google không trả về credential hợp lệ.'))
    })
      .then((google) => {
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
                'Google One Tap không khả dụng trên trình duyệt này. Hãy dùng nút Google chuẩn bên dưới hoặc kiểm tra popup/cookie.'
              )
            )
          }
        })
      })
      .catch((error) => {
        if (done) return
        done = true
        clearTimeout(timeout)
        reject(error)
      })
  })
}
