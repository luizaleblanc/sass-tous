const BASE = '/api'

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
  const res = await fetch(`${BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init?.headers,
    },
    ...init,
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body?.detail ?? `HTTP ${res.status}`)
  }
  return res.json() as Promise<T>
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
    request<{ id: string; email: string }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  me: () =>
    request<UserProfile>('/auth/me'),

  updateProfile: (data: { seniority?: string; area?: string; stacks?: string[]; work_modality?: string; location_type?: string }) =>
    request<UserProfile>('/auth/profile', { method: 'PUT', body: JSON.stringify(data) }),

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
  created_at: string
}

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
}
