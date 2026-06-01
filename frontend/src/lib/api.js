import { auth } from './firebase'

const API_BASE = import.meta.env.VITE_API_URL || ''

export class ApiError extends Error {
  constructor(message, status) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

export async function apiFetch(path, options = {}) {
  const user = auth.currentUser
  if (!user) throw new ApiError('Not authenticated', 401)

  const token = await user.getIdToken()

  let res
  try {
    res = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        ...options.headers,
      },
    })
  } catch {
    throw new ApiError(
      'Cannot reach the API. From the project root folder (mini-hcm), run: npm run dev',
      0
    )
  }

  let data = {}
  try {
    data = await res.json()
  } catch {
    /* empty body (e.g. Vite proxy when backend is down) */
  }

  if (!res.ok) {
    const fallback =
      res.status >= 500
        ? 'API server error. Make sure the backend is running (npm run dev from project root, not frontend/).'
        : res.statusText
    throw new ApiError(data.error || fallback, res.status)
  }

  return data
}
