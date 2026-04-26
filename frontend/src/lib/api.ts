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
  login: (email: string, password: string) =>
    request<{ access_token: string; token_type: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username: email, password }),
    }),

  register: (email: string, password: string) =>
    request<{ id: number; email: string }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  me: () => request<{ id: number; email: string; seniority: string | null; stacks: string[] }>('/auth/me'),

  updateProfile: (data: {
    seniority?: string
    stacks?: string[]
    work_modality?: string
  }) => request('/auth/profile', { method: 'PATCH', body: JSON.stringify(data) }),

  uploadCV: (file: File) => {
    const form = new FormData()
    form.append('file', file)
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
    return fetch(`${BASE}/auth/cv`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: form,
    }).then(r => r.json())
  },
}

// Jobs
export type Job = {
  id: number
  title: string
  company: string
  url: string
  platform: string
  seniority: string | null
  stacks: string[]
  location_type: string
  work_modality: string
  status: string
  application_type: string
  application_email: string | null
}

export type JobFilters = {
  platform?: string
  seniority?: string
  stacks?: string
  location_type?: string
  work_modality?: string
  status?: string
  page?: number
  page_size?: number
}

export const jobs = {
  list: (filters: JobFilters = {}) => {
    const params = new URLSearchParams()
    Object.entries(filters).forEach(([k, v]) => {
      if (v !== undefined && v !== '') params.set(k, String(v))
    })
    return request<Job[]>(`/automation/jobs?${params}`)
  },

  matches: (filters: { seniority?: string; work_modality?: string } = {}) => {
    const params = new URLSearchParams()
    if (filters.seniority) params.set('seniority', filters.seniority)
    if (filters.work_modality) params.set('work_modality', filters.work_modality)
    return request<Job[]>(`/automation/matches?${params}`)
  },

  run: (data: { keywords?: string[]; platforms?: string[]; target_urls?: string[] }) =>
    request('/automation/run', { method: 'POST', body: JSON.stringify(data) }),
}
