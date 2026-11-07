const API_BASE = import.meta.env.VITE_API_URL || '/api'

export function getAuthToken() {
  return localStorage.getItem('marilou_pos_token')
}

export async function apiRequest(endpoint, options = {}) {
  const token = getAuthToken()
  const headers = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  }

  let response
  try {
    response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
    })
  } catch {
    const networkError = new Error(
      'Connection or service is unavailable. Your data is safe on screen; please retry when connected.'
    )
    networkError.isNetworkError = true
    throw networkError
  }

  let data = null
  const contentType = response.headers.get('content-type') || ''
  if (contentType.includes('application/json')) {
    data = await response.json()
  }

  if (!response.ok) {
    if (response.status === 401 && endpoint !== '/login') {
      localStorage.removeItem('marilou_pos_token')
      localStorage.removeItem('marilou_pos_user')
      window.dispatchEvent(new CustomEvent('pos:unauthorized'))
    }

    const firstFieldError =
      data?.errors && Object.values(data.errors).flat()[0]
    const message =
      firstFieldError ||
      data?.message ||
      (response.status === 403
        ? 'You do not have permission.'
        : 'Could not save. Try again.')

    const err = new Error(message)
    err.status = response.status
    err.errors = data?.errors || {}
    throw err
  }

  return data
}

export async function downloadDatabaseBackup() {
  const token = getAuthToken()
  const response = await fetch(`${API_BASE}/backup/export`, {
    method: 'GET',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  })

  if (!response.ok) {
    throw new Error('Could not export database backup. Please try again.')
  }

  const blob = await response.blob()
  const url = window.URL.createObjectURL(blob)
  const a = document.createElement('a')
  const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  a.href = url
  a.download = `marilou_pos_backup_${timestamp}.sql`
  document.body.appendChild(a)
  a.click()
  a.remove()
  window.URL.revokeObjectURL(url)
}
