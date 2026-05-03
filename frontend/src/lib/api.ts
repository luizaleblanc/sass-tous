const BASE = '/api'
const REQUEST_TIMEOUT_MS = 30_000

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
  try {
    const res = await fetch(`${BASE}${path}`, {
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...init?.headers,
      },
      ...init,
      signal: controller.signal,
    })
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      if (res.status === 401 && typeof window !== 'undefined') {
        localStorage.removeItem('token')
        if (!window.location.pathname.startsWith('/entrar') && !window.location.pathname.startsWith('/cadastro')) {
          window.location.href = '/entrar'
        }
      }
      throw new Error(body?.detail ?? `HTTP ${res.status}`)
    }
    return res.json() as Promise<T>
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error('O servidor demorou demais para responder. Verifique sua conexão e tente novamente.')
    }
    throw err
  } finally {
    clearTimeout(timer)
  }
}

export const auth = {
  login: (email: string, password: string) => {
    const body = new URLSearchParams()
    body.set('username', email)
    body.set('password', password)
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
    return fetch(`${BASE}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body.toString(),
    }).then(async (r) => {
      if (!r.ok) {
        const err = await r.json().catch(() => ({}))
        throw new Error(err?.detail ?? `HTTP ${r.status}`)
      }
      return r.json() as Promise<{ access_token: string; token_type: string }>
    })
  },

  register: (email: string, password: string) =>
    request<{ id: string; email: string; requires_verification: boolean }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  verifyEmail: (email: string, code: string) =>
    request<{ message: string }>('/auth/verify-email', {
      method: 'POST',
      body: JSON.stringify({ email, code }),
    }),

  resendVerification: (email: string) =>
    request<{ message: string }>('/auth/resend-verification', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),

  me: () =>
    request<UserProfile>('/auth/me'),

  updateProfile: (data: { seniority?: string; area?: string; stacks?: string[]; work_modality?: string; location_type?: string }) =>
    request<UserProfile>('/auth/profile', { method: 'PUT', body: JSON.stringify(data) }),

  linkedinSession: (liAt: string, jsessionid?: string) =>
    request<{ message: string; cookies_stored: number }>('/auth/linkedin/session', {
      method: 'POST',
      body: JSON.stringify({ li_at: liAt, jsessionid }),
    }),

  removeLinkedinSession: () =>
    request<{ message: string }>('/auth/linkedin/session', { method: 'DELETE' }),

  connectLinkedIn: (email: string, password: string) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 90_000)
    return fetch(`${BASE}/auth/linkedin/connect`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ email, password }),
      signal: controller.signal,
    }).then(async (r) => {
      clearTimeout(timer)
      if (!r.ok) {
        const err = await r.json().catch(() => ({}))
        throw new Error(err?.detail ?? `HTTP ${r.status}`)
      }
      return r.json() as Promise<LinkedInConnectResult>
    }).catch((err) => {
      clearTimeout(timer)
      if (err.name === 'AbortError') throw new Error('Conexão com LinkedIn demorou muito. Tente o método manual.')
      throw err
    })
  },

  verifyLinkedIn2FA: (challenge_id: string, code: string) =>
    request<{ status: string; message: string; cookies_stored: number }>('/auth/linkedin/2fa', {
      method: 'POST',
      body: JSON.stringify({ challenge_id, code }),
    }),

  connectGupy: (email: string, password: string) =>
    request<{ message: string; cookies_stored: number }>('/auth/gupy/connect', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  storeGupySession: (token: string) =>
    request<{ message: string; cookies_stored: number }>('/auth/gupy/session', {
      method: 'POST',
      body: JSON.stringify({ token }),
    }),

  removeGupySession: () =>
    request<{ message: string }>('/auth/gupy/session', { method: 'DELETE' }),

  uploadCV: (file: File, timeoutMs = 60_000) => {
    const form = new FormData()
    form.append('file', file)
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)
    return fetch(`${BASE}/auth/cv`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: form,
      signal: controller.signal,
    })
      .then(async (r) => {
        clearTimeout(timer)
        if (!r.ok) {
          const err = await r.json().catch(() => ({}))
          throw new Error(err?.detail ?? `HTTP ${r.status}`)
        }
        return r.json() as Promise<UserProfile>
      })
      .catch((err) => {
        clearTimeout(timer)
        if (err.name === 'AbortError') {
          throw new Error('O processamento do CV demorou muito. Tente um arquivo menor ou preencha manualmente.')
        }
        throw err
      })
  },
}

export type UserProfile = {
  id: string
  email: string
  seniority: string | null
  area: string | null
  stacks: string[] | null
  work_modality: string | null
  location_type: string | null
  cv_filename: string | null
  cv_parsed: Record<string, unknown> | null
  has_linkedin_session: boolean
  has_gupy_session: boolean
  created_at: string
}

export type LinkedInConnectResult =
  | { status: 'success'; message: string; cookies_stored: number }
  | { status: '2fa_required'; challenge_id: string }

export type Job = {
  id: string
  title: string
  company: string | null
  url: string
  platform: string | null
  seniority: string | null
  stacks: string[] | null
  location_type: string | null
  work_modality: string | null
  status: string
  application_type: string
  application_email: string | null
  created_at: string
}

export type JobFilters = {
  platform?: string
  seniority?: string
  stack?: string
  location_type?: string
  work_modality?: string
  status?: string
  application_type?: string
}

export const jobs = {
  list: (filters: JobFilters = {}) => {
    const params = new URLSearchParams()
    Object.entries(filters).forEach(([k, v]) => {
      if (v !== undefined && v !== '') params.set(k, String(v))
    })
    return request<Job[]>(`/automation/jobs?${params}`)
  },

  matches: () =>
    request<Job[]>('/automation/jobs/matches'),

  start: (data: { keywords?: string[]; platforms?: string[]; target_urls?: string[] }) =>
    request<{ message: string; job_id: string }>('/automation/start', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  delete: (jobId: string) =>
    request<void>(`/automation/jobs/${jobId}`, { method: 'DELETE' }),

  applyPlatform: (jobIds: string[]) =>
    request('/automation/apply/platform', {
      method: 'POST',
      body: JSON.stringify({ job_ids: jobIds }),
    }),

  applyEmail: (payload: { job_ids: string[]; subject: string; body: string }) =>
    request('/automation/apply/email', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  applyAuto: (jobIds: string[]) =>
    request<{ message: string; job_id: string; targets: { job_id: string; title: string; platform: string }[] }>('/automation/apply/auto', {
      method: 'POST',
      body: JSON.stringify({ job_ids: jobIds }),
    }),
}
