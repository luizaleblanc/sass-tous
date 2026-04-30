'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { ExternalLink, Trash2, Upload, Plus, X, ChevronRight, LogOut, Loader2, CheckCircle2, Mail, Send, Zap, Key, Eye, EyeOff } from 'lucide-react'
import { auth, jobs, UserProfile, Job } from '@/lib/api'

// ─── CV Upload Button ───────────────────────────────────────────────────────

type CVUploadState = 'idle' | 'reading' | 'processing' | 'done' | 'error'

function CVUploadButton({
  onUpload,
  currentFilename,
  variant = 'outline',
}: {
  onUpload: (file: File) => Promise<void>
  currentFilename?: string | null
  variant?: 'outline' | 'dashed'
}) {
  const [state, setState] = useState<CVUploadState>('idle')
  const [error, setError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  async function handleFile(file: File) {
    setState('reading')
    setError('')
    await new Promise((r) => setTimeout(r, 300))
    setState('processing')
    try {
      await onUpload(file)
      setState('done')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao processar CV.')
      setState('error')
    }
  }

  const busy = state === 'reading' || state === 'processing'

  const baseClass =
    variant === 'dashed'
      ? 'flex items-center justify-center gap-2 rounded-2xl border-2 border-dashed py-6 text-sm font-bold uppercase tracking-widest transition-colors disabled:opacity-50 w-full'
      : 'flex items-center gap-2 rounded-xl border-2 border-dashed px-4 py-3 text-sm font-medium transition-colors disabled:opacity-50 w-full'

  const colorClass =
    state === 'done'
      ? 'border-green-400 bg-green-50 text-green-600'
      : state === 'error'
      ? 'border-red-300 bg-red-50 text-red-500'
      : 'border-[#1a2e8a]/20 bg-white text-[#1a2e8a]/60 hover:border-[#1a2e8a]/40 hover:text-[#1a2e8a]'

  const label =
    state === 'done' && currentFilename
      ? `CV: ${currentFilename}`
      : state === 'done'
      ? 'CV processado!'
      : state === 'error'
      ? currentFilename ? `CV: ${currentFilename}` : 'Enviar CV (PDF/DOC)'
      : state === 'processing'
      ? 'Extraindo dados do CV...'
      : state === 'reading'
      ? 'Lendo arquivo...'
      : currentFilename
      ? `CV: ${currentFilename}`
      : 'Preencher com meu CV'

  return (
    <div className="flex flex-col gap-1.5">
      <input
        ref={fileRef}
        type="file"
        accept=".pdf,.doc,.docx"
        className="hidden"
        onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
      />
      <button
        onClick={() => { setState('idle'); setError(''); fileRef.current?.click() }}
        disabled={busy}
        className={`${baseClass} ${colorClass}`}
      >
        {busy ? (
          <Loader2 size={16} className="animate-spin shrink-0" />
        ) : state === 'done' ? (
          <CheckCircle2 size={16} className="shrink-0" />
        ) : (
          <Upload size={16} className="shrink-0" />
        )}
        <span className="truncate">{label}</span>
      </button>
      {busy && (
        <p className="text-xs text-[#1a2e8a]/50 animate-pulse pl-1">
          {state === 'processing'
            ? 'Extraindo tecnologias, contatos e dados do perfil...'
            : 'Lendo arquivo...'}
        </p>
      )}
      {error && <p className="text-xs text-red-500 pl-1">{error}</p>}
    </div>
  )
}

// ─── Constants ──────────────────────────────────────────────────────────────

const AREAS = [
  { value: 'backend', label: 'Dev Backend' },
  { value: 'frontend', label: 'Dev Frontend' },
  { value: 'fullstack', label: 'Full Stack' },
  { value: 'mobile', label: 'Mobile' },
  { value: 'qa', label: 'QA / Testes' },
  { value: 'ux_ui', label: 'UX / UI' },
  { value: 'devops', label: 'DevOps / SRE' },
  { value: 'data', label: 'Data / ML' },
  { value: 'seguranca', label: 'Segurança' },
  { value: 'produto', label: 'Produto / PM' },
]

const SENIORITIES = ['Estágio', 'Trainee', 'Junior', 'Pleno', 'Senior']

const MODALITIES = [
  { value: 'remoto', label: 'Remoto' },
  { value: 'presencial', label: 'Presencial' },
  { value: 'hibrido', label: 'Híbrido' },
]

const LOCATION_TYPES = [
  { value: 'nacional', label: 'Nacional' },
  { value: 'internacional', label: 'Internacional' },
  { value: 'ambos', label: 'Ambos' },
]

const STACKS = [
  'React', 'Vue', 'Angular', 'Next.js', 'TypeScript', 'JavaScript',
  'Node.js', 'Python', 'Java', 'Go', 'Rust', 'C#', 'PHP', 'Ruby',
  'Django', 'FastAPI', 'Spring', 'Laravel', 'Docker', 'Kubernetes',
  'AWS', 'GCP', 'Azure', 'PostgreSQL', 'MySQL', 'MongoDB', 'Redis',
  'GraphQL', 'REST', 'Git', 'Linux', 'Figma', 'Flutter', 'React Native',
  'Selenium', 'Cypress', 'Jest', 'Pytest', 'Playwright', 'JUnit',
  'TensorFlow', 'PyTorch', 'Pandas', 'Machine Learning',
  'Terraform', 'Ansible', 'Kafka', 'Datadog',
  'Adobe XD', 'Sketch', 'Wireframe',
]

const PLATFORMS = [
  { key: 'linkedin', label: 'LinkedIn' },
  { key: 'indeed', label: 'Indeed' },
  { key: 'gupy', label: 'Gupy' },
  { key: 'infojobs', label: 'InfoJobs' },
  { key: 'programathor', label: 'Programathor' },
  { key: 'remoteok', label: 'RemoteOK' },
  { key: 'solides', label: 'Sólides' },
  { key: 'glassdoor', label: 'Glassdoor' },
  { key: 'catho', label: 'Catho' },
  { key: 'meupadrinho', label: 'Meu Padrinho' },
]

const AUTO_APPLY_PLATFORMS = new Set(['linkedin', 'gupy', 'remoteok', 'infojobs'])

// ─── Shared Components ──────────────────────────────────────────────────────

function NavButtons({ active, onChange }: { active: string; onChange: (tab: string) => void }) {
  const tabs = [
    { id: 'automacao', label: 'Automação' },
    { id: 'vagas', label: 'Minhas Vagas' },
    { id: 'email', label: 'Email' },
    { id: 'candidaturas', label: 'Candidaturas' },
    { id: 'perfil', label: 'Perfil' },
  ]
  return (
    <nav className="flex flex-col gap-1">
      {tabs.map((t) => (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          className={`text-left px-4 py-3 rounded-xl text-sm font-bold uppercase tracking-widest transition-colors ${
            active === t.id
              ? 'bg-white text-[#1a2e8a]'
              : 'text-white/70 hover:text-white hover:bg-white/10'
          }`}
        >
          {t.label}
        </button>
      ))}
    </nav>
  )
}

type AutoApplyState = 'idle' | 'loading' | 'done' | 'error'

function JobCard({
  job,
  onDelete,
  onApplyEmail,
  onApplyAuto,
  autoApplyState = 'idle',
}: {
  job: Job
  onDelete?: (id: string) => void
  onApplyEmail?: () => void
  onApplyAuto?: () => void
  autoApplyState?: AutoApplyState
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-2xl bg-white border border-[#1a2e8a]/10 px-5 py-4 shadow-sm">
      <div className="flex flex-col gap-1 min-w-0">
        <span className="font-bold text-[#1a2e8a] truncate">{job.title}</span>
        <span className="text-sm text-[#1a2e8a]/60 truncate">
          {job.company ?? 'Empresa não informada'} · {job.platform ?? '—'}
        </span>
        <div className="flex flex-wrap gap-1 mt-1">
          {job.seniority && (
            <span className="rounded-full bg-[#1a2e8a]/10 px-2 py-0.5 text-xs font-semibold text-[#1a2e8a]">
              {job.seniority}
            </span>
          )}
          {job.work_modality && (
            <span className="rounded-full bg-[#1a2e8a]/10 px-2 py-0.5 text-xs font-semibold text-[#1a2e8a]">
              {job.work_modality}
            </span>
          )}
          {job.application_type === 'email' && (
            <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-500">
              candidatura por email
            </span>
          )}
          {job.stacks?.slice(0, 3).map((s) => (
            <span key={s} className="rounded-full bg-[#1a2e8a]/5 px-2 py-0.5 text-xs text-[#1a2e8a]/70">
              {s}
            </span>
          ))}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {onApplyEmail && job.application_type === 'email' ? (
          <button
            onClick={onApplyEmail}
            title="Candidatar por email"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-[#1a2e8a]/10 text-[#1a2e8a] transition-colors hover:bg-[#1a2e8a] hover:text-white"
          >
            <Mail size={14} />
          </button>
        ) : (
          <a
            href={job.url}
            target="_blank"
            rel="noopener noreferrer"
            title="Ver vaga"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-[#1a2e8a]/10 text-[#1a2e8a] transition-colors hover:bg-[#1a2e8a] hover:text-white"
          >
            <ExternalLink size={14} />
          </a>
        )}
        {onApplyAuto && AUTO_APPLY_PLATFORMS.has(job.platform ?? '') && (
          <button
            onClick={onApplyAuto}
            disabled={autoApplyState === 'loading' || autoApplyState === 'done'}
            title={autoApplyState === 'done' ? 'Candidatura enviada' : 'Auto-candidatar'}
            className={`flex h-8 w-8 items-center justify-center rounded-full transition-colors ${
              autoApplyState === 'done'
                ? 'bg-green-100 text-green-500 cursor-default'
                : autoApplyState === 'error'
                ? 'bg-red-50 text-red-400 hover:bg-red-100 hover:text-red-600'
                : 'bg-[#1a2e8a]/10 text-[#1a2e8a] hover:bg-[#1a2e8a] hover:text-white'
            }`}
          >
            {autoApplyState === 'loading' ? (
              <Loader2 size={14} className="animate-spin" />
            ) : autoApplyState === 'done' ? (
              <CheckCircle2 size={14} />
            ) : (
              <Zap size={14} />
            )}
          </button>
        )}
        {onDelete && (
          <button
            onClick={() => onDelete(job.id)}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-red-50 text-red-400 transition-colors hover:bg-red-100 hover:text-red-600"
          >
            <Trash2 size={14} />
          </button>
        )}
      </div>
    </div>
  )
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-20 text-[#1a2e8a]/30">
      <span className="text-5xl">🦆</span>
      <p className="text-sm font-medium">{message}</p>
    </div>
  )
}

function EmailModal({
  job,
  profile,
  onClose,
  onSent,
}: {
  job: Job
  profile: UserProfile
  onClose: () => void
  onSent: () => void
}) {
  const username = profile.email.split('@')[0]
  const stacksList = profile.stacks?.join(', ') ?? ''

  const [subject, setSubject] = useState(`Candidatura — ${job.title}`)
  const [body, setBody] = useState(
    `Olá,\n\nMeu nome é ${username} e estou me candidatando à vaga de ${job.title}${job.company ? ` na ${job.company}` : ''}.\n\nTenho experiência com as seguintes tecnologias: ${stacksList}.\n\nFico à disposição para conversar sobre a oportunidade e enviar informações adicionais.\n\nAtenciosamente,\n${profile.email}`
  )
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')

  async function handleSend() {
    setSending(true)
    setError('')
    try {
      await jobs.applyEmail({ job_ids: [job.id], subject, body })
      onSent()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao enviar candidatura.')
      setSending(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-lg rounded-3xl bg-white shadow-2xl p-8 flex flex-col gap-5 max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-display-condensed text-[#1a2e8a] text-2xl leading-none">
              CANDIDATURA POR EMAIL
            </h2>
            <p className="text-xs text-[#1a2e8a]/50 mt-1">
              Para: <span className="font-semibold">{job.application_email}</span>
            </p>
          </div>
          <button onClick={onClose} className="shrink-0 text-[#1a2e8a]/30 transition-colors hover:text-[#1a2e8a]">
            <X size={20} />
          </button>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-bold uppercase tracking-widest text-[#1a2e8a]/60">Assunto</label>
          <input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="rounded-xl border border-[#1a2e8a]/20 bg-white px-4 py-2.5 text-sm text-[#1a2e8a] outline-none focus:border-[#1a2e8a]"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-bold uppercase tracking-widest text-[#1a2e8a]/60">Mensagem</label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={9}
            className="rounded-xl border border-[#1a2e8a]/20 bg-white px-4 py-2.5 text-sm text-[#1a2e8a] outline-none focus:border-[#1a2e8a] resize-none leading-relaxed"
          />
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}

        <button
          onClick={handleSend}
          disabled={sending || !subject.trim() || !body.trim()}
          className="flex items-center justify-center gap-2 rounded-full bg-[#1a2e8a] py-3.5 text-sm font-bold uppercase tracking-widest text-white transition-opacity hover:opacity-80 disabled:opacity-50"
        >
          {sending ? (
            <><Loader2 size={15} className="animate-spin" /> Enviando...</>
          ) : (
            <><Send size={15} /> Enviar candidatura</>
          )}
        </button>
      </div>
    </div>
  )
}

// ─── Tabs ──────────────────────────────────────────────────────────────────

function AutomacaoTab({ profile, onNavigateToVagas }: { profile: UserProfile; onNavigateToVagas: () => void }) {
  const [keyword, setKeyword] = useState('')
  const [keywords, setKeywords] = useState<string[]>(profile.stacks ?? [])
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(PLATFORMS.map((p) => p.key))
  const [targetUrl, setTargetUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [started, setStarted] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  function addKeyword() {
    const k = keyword.trim()
    if (k && !keywords.includes(k)) setKeywords((prev) => [...prev, k])
    setKeyword('')
  }

  function togglePlatform(key: string) {
    setSelectedPlatforms((prev) =>
      prev.includes(key) ? prev.filter((x) => x !== key) : [...prev, key]
    )
  }

  async function handleStart() {
    if (keywords.length === 0 && !targetUrl) {
      setErrorMsg('Adicione ao menos uma palavra-chave para iniciar a busca.')
      return
    }
    setLoading(true)
    setErrorMsg('')
    try {
      const platformsToUse = selectedPlatforms.length ? selectedPlatforms : PLATFORMS.map((p) => p.key)
      const res = await jobs.start({
        keywords: keywords.length ? keywords : undefined,
        platforms: platformsToUse,
        target_urls: targetUrl ? [targetUrl] : undefined,
      })
      void res
      setStarted(true)
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Erro ao iniciar automação.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {started && (
        <div className="flex items-start gap-3 rounded-2xl border border-green-200 bg-green-50 px-5 py-4">
          <div className="relative shrink-0 mt-0.5">
            <CheckCircle2 size={18} className="text-green-500" />
            <Loader2 size={18} className="absolute inset-0 animate-spin text-green-400 opacity-50" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-green-700">Automação disparada e em andamento.</p>
            <p className="text-xs text-green-600/80 mt-0.5">
              As vagas compatíveis aparecerão em <button onClick={onNavigateToVagas} className="underline underline-offset-2 hover:opacity-70">Minhas Vagas</button> assim que o scraping terminar.
              Apenas um disparo por vez para não sobrecarregar o sistema.
            </p>
          </div>
          <button
            onClick={() => setStarted(false)}
            className="shrink-0 text-green-400 hover:text-green-600"
          >
            <X size={15} />
          </button>
        </div>
      )}

      {profile.stacks?.length ? (
        <p className="text-xs text-[#1a2e8a]/50 bg-[#1a2e8a]/5 rounded-xl px-4 py-2.5">
          Suas tecnologias do perfil foram adicionadas como palavras-chave. Ajuste se necessário.
        </p>
      ) : null}

      <div className="flex flex-col gap-2">
        <label className="text-xs font-bold uppercase tracking-widest text-[#1a2e8a]/60">
          Palavras-chave
        </label>
        <div className="flex gap-2">
          <input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addKeyword())}
            placeholder="ex: React, Node.js..."
            className="flex-1 rounded-xl border border-[#1a2e8a]/20 bg-white px-4 py-2.5 text-sm text-[#1a2e8a] outline-none focus:border-[#1a2e8a]"
          />
          <button
            onClick={addKeyword}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#1a2e8a] text-white transition-opacity hover:opacity-80"
          >
            <Plus size={16} />
          </button>
        </div>
        {keywords.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-1">
            {keywords.map((k) => (
              <span
                key={k}
                className="flex items-center gap-1 rounded-full bg-[#1a2e8a] px-3 py-1 text-xs font-bold text-white"
              >
                {k}
                <button onClick={() => setKeywords((prev) => prev.filter((x) => x !== k))}>
                  <X size={11} />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-xs font-bold uppercase tracking-widest text-[#1a2e8a]/60">
          Plataformas
          <span className="ml-2 normal-case font-normal text-[#1a2e8a]/30">
            ({selectedPlatforms.length} selecionada{selectedPlatforms.length !== 1 ? 's' : ''})
          </span>
        </label>
        <div className="flex flex-wrap gap-2">
          {PLATFORMS.map((p) => (
            <button
              key={p.key}
              onClick={() => togglePlatform(p.key)}
              className={`rounded-full px-4 py-1.5 text-xs font-bold uppercase tracking-wide transition-colors ${
                selectedPlatforms.includes(p.key)
                  ? 'bg-[#1a2e8a] text-white'
                  : 'bg-[#1a2e8a]/10 text-[#1a2e8a] hover:bg-[#1a2e8a]/20'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-xs font-bold uppercase tracking-widest text-[#1a2e8a]/60">
          URL específica (opcional)
        </label>
        <input
          value={targetUrl}
          onChange={(e) => setTargetUrl(e.target.value)}
          placeholder="https://..."
          className="rounded-xl border border-[#1a2e8a]/20 bg-white px-4 py-2.5 text-sm text-[#1a2e8a] outline-none focus:border-[#1a2e8a]"
        />
      </div>

      {errorMsg && (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          {errorMsg}
        </p>
      )}

      <button
        onClick={handleStart}
        disabled={loading}
        className="flex items-center justify-center gap-2 rounded-full bg-[#1a2e8a] py-3.5 text-sm font-bold uppercase tracking-widest text-white transition-opacity hover:opacity-80 disabled:opacity-50"
      >
        {loading ? <><Loader2 size={15} className="animate-spin" /> Enfileirando...</> : 'Iniciar automação'}
      </button>
    </div>
  )
}

const POLL_INTERVAL_MS = 5_000
const POLL_MAX_ATTEMPTS = 36

function VagasTab({ profile }: { profile: UserProfile }) {
  const [list, setList] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [polling, setPolling] = useState(false)
  const [pollAttempt, setPollAttempt] = useState(0)
  const [emailJob, setEmailJob] = useState<Job | null>(null)
  const [autoApplyStates, setAutoApplyStates] = useState<Record<string, AutoApplyState>>({})
  const pollRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  async function load(silent = false) {
    if (!silent) setLoading(true)
    try {
      const data = await jobs.matches()
      setList(data)
      return data.length
    } catch {
      setList([])
      return 0
    } finally {
      if (!silent) setLoading(false)
    }
  }

  function stopPolling() {
    if (pollRef.current) clearTimeout(pollRef.current)
    setPolling(false)
  }

  function scheduleNextPoll(attempt: number) {
    if (attempt >= POLL_MAX_ATTEMPTS) { stopPolling(); return }
    pollRef.current = setTimeout(async () => {
      setPollAttempt(attempt + 1)
      const count = await load(true)
      if (count > 0) { stopPolling(); return }
      scheduleNextPoll(attempt + 1)
    }, POLL_INTERVAL_MS)
  }

  useEffect(() => {
    load().then((count) => {
      if (count === 0) {
        setPolling(true)
        setPollAttempt(0)
        scheduleNextPoll(0)
      }
    })
    return () => { if (pollRef.current) clearTimeout(pollRef.current) }
  }, [])

  async function handleManualRefresh() {
    stopPolling()
    const count = await load()
    if (count === 0) {
      setPolling(true)
      setPollAttempt(0)
      scheduleNextPoll(0)
    }
  }

  async function handleDelete(id: string) {
    await jobs.delete(id).catch(() => null)
    setList((prev) => prev.filter((j) => j.id !== id))
  }

  async function handleAutoApply(jobId: string) {
    setAutoApplyStates((prev) => ({ ...prev, [jobId]: 'loading' }))
    try {
      await jobs.applyAuto([jobId])
      setAutoApplyStates((prev) => ({ ...prev, [jobId]: 'done' }))
      setList((prev) => prev.map((j) => j.id === jobId ? { ...j, status: 'Aplicada' } : j))
    } catch {
      setAutoApplyStates((prev) => ({ ...prev, [jobId]: 'error' }))
    }
  }

  if (loading) return <p className="text-sm text-[#1a2e8a]/50 py-10 text-center">Carregando vagas...</p>

  return (
    <>
      {emailJob && (
        <EmailModal
          job={emailJob}
          profile={profile}
          onClose={() => setEmailJob(null)}
          onSent={() => {
            setList((prev) => prev.map((j) => j.id === emailJob.id ? { ...j, status: 'Aplicada' } : j))
            setEmailJob(null)
          }}
        />
      )}

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs text-[#1a2e8a]/50 font-semibold uppercase tracking-widest">
            {list.length} vaga{list.length !== 1 ? 's' : ''} compatíveis
          </p>
          <button
            onClick={handleManualRefresh}
            className="flex items-center gap-1.5 text-xs font-semibold text-[#1a2e8a]/50 transition-colors hover:text-[#1a2e8a]"
          >
            <Loader2 size={13} className={polling ? 'animate-spin' : ''} />
            {polling ? 'Buscando...' : 'Atualizar'}
          </button>
        </div>

        {polling && list.length === 0 && (
          <div className="flex items-center gap-3 rounded-2xl border border-[#1a2e8a]/10 bg-[#1a2e8a]/5 px-5 py-4">
            <Loader2 size={18} className="shrink-0 animate-spin text-[#1a2e8a]/50" />
            <div>
              <p className="text-sm font-semibold text-[#1a2e8a]">Scraping em andamento...</p>
              <p className="text-xs text-[#1a2e8a]/50">
                Verificando automaticamente a cada {POLL_INTERVAL_MS / 1000} segundos.
              </p>
            </div>
          </div>
        )}

        {!polling && list.length === 0 && (
          <EmptyState message="Nenhuma vaga compatível ainda. Rode a automação primeiro." />
        )}

        {list.map((j) => (
          <JobCard
            key={j.id}
            job={j}
            onDelete={handleDelete}
            onApplyEmail={j.application_type === 'email' ? () => setEmailJob(j) : undefined}
            onApplyAuto={() => handleAutoApply(j.id)}
            autoApplyState={autoApplyStates[j.id] ?? 'idle'}
          />
        ))}
      </div>
    </>
  )
}

function EmailTab({ profile }: { profile: UserProfile }) {
  const [list, setList] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [sending, setSending] = useState(false)
  const [msg, setMsg] = useState('')

  useEffect(() => {
    const username = profile.email.split('@')[0]
    const stacksList = profile.stacks?.join(', ') ?? ''
    setSubject('Candidatura — [Vaga]')
    setBody(
      `Olá,\n\nMeu nome é ${username} e tenho interesse em oportunidades na área de desenvolvimento.\n\nTenho experiência com: ${stacksList}.\n\nFico à disposição para conversar sobre possíveis oportunidades.\n\nAtenciosamente,\n${profile.email}`
    )
    jobs.list({ application_type: 'email' })
      .then(setList)
      .catch(() => setList([]))
      .finally(() => setLoading(false))
  }, [profile])

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function toggleAll() {
    setSelected((prev) =>
      prev.size === list.length ? new Set() : new Set(list.map((j) => j.id))
    )
  }

  async function handleSend() {
    if (selected.size === 0) return
    setSending(true)
    setMsg('')
    try {
      await jobs.applyEmail({ job_ids: [...selected], subject, body })
      setList((prev) => prev.map((j) => selected.has(j.id) ? { ...j, status: 'Aplicada' } : j))
      setSelected(new Set())
      setMsg(`${selected.size} email(s) enviados com sucesso!`)
    } catch (err) {
      setMsg(err instanceof Error ? err.message : 'Erro ao enviar emails.')
    } finally {
      setSending(false)
    }
  }

  if (loading) return <p className="text-sm text-[#1a2e8a]/50 py-10 text-center">Carregando...</p>

  return (
    <div className="flex flex-col gap-6">
      {list.length === 0 ? (
        <EmptyState message="Nenhuma vaga com candidatura por email encontrada. Rode a automação primeiro." />
      ) : (
        <>
          <div className="rounded-2xl border border-[#1a2e8a]/10 bg-white p-5 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold uppercase tracking-widest text-[#1a2e8a]/60">
                {list.length} vaga{list.length !== 1 ? 's' : ''} com email · {selected.size} selecionada{selected.size !== 1 ? 's' : ''}
              </p>
              <button
                onClick={toggleAll}
                className="text-xs font-semibold text-[#1a2e8a] underline underline-offset-2 hover:opacity-70"
              >
                {selected.size === list.length ? 'Desmarcar todas' : 'Selecionar todas'}
              </button>
            </div>

            <div className="flex flex-col gap-2 max-h-48 overflow-y-auto pr-1">
              {list.map((j) => (
                <label
                  key={j.id}
                  className={`flex items-center gap-3 rounded-xl border px-4 py-3 cursor-pointer transition-colors ${
                    selected.has(j.id) ? 'border-[#1a2e8a] bg-[#1a2e8a]/5' : 'border-[#1a2e8a]/10 hover:bg-[#1a2e8a]/5'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selected.has(j.id)}
                    onChange={() => toggleSelect(j.id)}
                    className="accent-[#1a2e8a]"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-[#1a2e8a] text-sm truncate">{j.title}</p>
                    <p className="text-xs text-[#1a2e8a]/50 truncate">
                      {j.company ?? '—'} · <span className="font-medium">{j.application_email}</span>
                    </p>
                  </div>
                  {j.status === 'Aplicada' && (
                    <span className="shrink-0 rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-600">
                      Enviado
                    </span>
                  )}
                </label>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold uppercase tracking-widest text-[#1a2e8a]/60">Assunto</label>
              <input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="rounded-xl border border-[#1a2e8a]/20 bg-white px-4 py-2.5 text-sm text-[#1a2e8a] outline-none focus:border-[#1a2e8a]"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-widest text-[#1a2e8a]/60">Mensagem</label>
                <span className="text-xs text-[#1a2e8a]/30">clique para inserir variável</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {[
                  ['{sender_name}', 'nome'],
                  ['{email}', 'email'],
                  ['{phone}', 'telefone'],
                  ['{linkedin}', 'linkedin'],
                  ['{portfolio}', 'portfolio'],
                  ['{seniority}', 'senioridade'],
                  ['{stacks}', 'tecnologias'],
                  ['{job_title}', 'vaga'],
                  ['{company}', 'empresa'],
                ].map(([tag, label]) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => setBody((b) => b + tag)}
                    className="rounded-full bg-[#1a2e8a]/5 px-2.5 py-1 text-xs font-mono text-[#1a2e8a]/70 transition-colors hover:bg-[#1a2e8a]/15 hover:text-[#1a2e8a]"
                  >
                    {label}
                  </button>
                ))}
              </div>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={8}
                className="rounded-xl border border-[#1a2e8a]/20 bg-white px-4 py-2.5 text-sm text-[#1a2e8a] outline-none focus:border-[#1a2e8a] resize-none leading-relaxed"
              />
            </div>

            {msg && (
              <p className={`rounded-xl border px-4 py-3 text-sm ${
                msg.includes('sucesso') ? 'border-green-200 bg-green-50 text-green-700' : 'border-red-200 bg-red-50 text-red-600'
              }`}>
                {msg}
              </p>
            )}

            <button
              onClick={handleSend}
              disabled={sending || selected.size === 0 || !subject.trim() || !body.trim()}
              className="flex items-center justify-center gap-2 rounded-full bg-[#1a2e8a] py-3.5 text-sm font-bold uppercase tracking-widest text-white transition-opacity hover:opacity-80 disabled:opacity-40"
            >
              {sending ? (
                <><Loader2 size={15} className="animate-spin" /> Enviando {selected.size} email(s)...</>
              ) : (
                <><Send size={15} /> Enviar para {selected.size} vaga{selected.size !== 1 ? 's' : ''}</>
              )}
            </button>
          </div>
        </>
      )}
    </div>
  )
}

function CandidaturasTab() {
  const [list, setList] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    jobs.list({ status: 'Aplicada' })
      .then(setList)
      .catch(() => setList([]))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <p className="text-sm text-[#1a2e8a]/50 py-10 text-center">Carregando...</p>

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-[#1a2e8a]/50 font-semibold uppercase tracking-widest mb-2">
        {list.length} candidatura{list.length !== 1 ? 's' : ''}
      </p>
      {list.length === 0 ? (
        <EmptyState message="Nenhuma candidatura registrada ainda." />
      ) : (
        list.map((j) => <JobCard key={j.id} job={j} />)
      )}
    </div>
  )
}

function PerfilTab({ profile, onUpdate }: { profile: UserProfile; onUpdate: (p: UserProfile) => void }) {
  const [seniority, setSeniority] = useState(profile.seniority ?? '')
  const [area, setArea] = useState(profile.area ?? '')
  const [selectedStacks, setSelectedStacks] = useState<string[]>(profile.stacks ?? [])
  const [customStack, setCustomStack] = useState('')
  const [modality, setModality] = useState(profile.work_modality ?? '')
  const [locationType, setLocationType] = useState(profile.location_type ?? '')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const [liAt, setLiAt] = useState('')
  const [liAtVisible, setLiAtVisible] = useState(false)
  const [liSaving, setLiSaving] = useState(false)
  const [liMsg, setLiMsg] = useState('')

  function toggleStack(s: string) {
    setSelectedStacks((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]))
  }

  function addCustom() {
    const s = customStack.trim()
    if (s && !selectedStacks.includes(s)) setSelectedStacks((prev) => [...prev, s])
    setCustomStack('')
  }

  async function handleSave() {
    setSaving(true)
    setMsg('')
    try {
      const updated = await auth.updateProfile({
        seniority: seniority || undefined,
        area: area || undefined,
        stacks: selectedStacks.length ? selectedStacks : undefined,
        work_modality: modality || undefined,
        location_type: locationType || undefined,
      })
      onUpdate(updated)
      setMsg('Perfil salvo com sucesso!')
    } catch (err) {
      setMsg(err instanceof Error ? err.message : 'Erro ao salvar perfil.')
    } finally {
      setSaving(false)
    }
  }

  async function handleCVUpload(file: File) {
    setMsg('')
    const updated = await auth.uploadCV(file)
    onUpdate(updated)
    setMsg('CV processado! Suas tecnologias foram atualizadas.')
  }

  async function handleSaveLiAt() {
    setLiSaving(true)
    setLiMsg('')
    try {
      await auth.linkedinSession(liAt.trim())
      setLiMsg('Sessão LinkedIn salva com sucesso!')
      setLiAt('')
    } catch (err) {
      setLiMsg(err instanceof Error ? err.message : 'Erro ao salvar sessão.')
    } finally {
      setLiSaving(false)
    }
  }

  async function handleRemoveLiAt() {
    setLiSaving(true)
    setLiMsg('')
    try {
      await auth.removeLinkedinSession()
      setLiMsg('Sessão LinkedIn removida.')
    } catch (err) {
      setLiMsg(err instanceof Error ? err.message : 'Erro ao remover sessão.')
    } finally {
      setLiSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <label className="text-xs font-bold uppercase tracking-widest text-[#1a2e8a]/60">CV</label>
        <CVUploadButton onUpload={handleCVUpload} currentFilename={profile.cv_filename} />
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-xs font-bold uppercase tracking-widest text-[#1a2e8a]/60">
          Sessão LinkedIn{' '}
          <span className="normal-case font-normal text-[#1a2e8a]/30">(para auto-candidatura)</span>
        </label>
        <p className="text-xs text-[#1a2e8a]/40">
          Cole seu cookie <code className="font-mono bg-[#1a2e8a]/5 px-1 rounded">li_at</code> para habilitar auto-candidatura no LinkedIn. Obtenha-o nas DevTools do navegador após fazer login.
        </p>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <input
              type={liAtVisible ? 'text' : 'password'}
              value={liAt}
              onChange={(e) => setLiAt(e.target.value)}
              placeholder="AQEDATi..."
              className="w-full rounded-xl border border-[#1a2e8a]/20 bg-white px-4 py-2.5 pr-10 text-sm text-[#1a2e8a] font-mono outline-none focus:border-[#1a2e8a]"
            />
            <button
              type="button"
              onClick={() => setLiAtVisible((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#1a2e8a]/30 hover:text-[#1a2e8a]"
            >
              {liAtVisible ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
          <button
            onClick={handleSaveLiAt}
            disabled={liSaving || !liAt.trim()}
            className="flex items-center gap-1.5 rounded-xl bg-[#1a2e8a] px-4 py-2.5 text-xs font-bold uppercase tracking-wide text-white transition-opacity hover:opacity-80 disabled:opacity-40"
          >
            {liSaving ? <Loader2 size={13} className="animate-spin" /> : <Key size={13} />}
            Salvar
          </button>
        </div>
        <button
          onClick={handleRemoveLiAt}
          disabled={liSaving}
          className="self-start text-xs font-semibold text-red-400 transition-colors hover:text-red-600 disabled:opacity-40"
        >
          Remover sessão
        </button>
        {liMsg && (
          <p className={`rounded-xl border px-4 py-3 text-sm ${
            liMsg.includes('sucesso') || liMsg.includes('removida')
              ? 'border-green-200 bg-green-50 text-green-700'
              : 'border-red-200 bg-red-50 text-red-600'
          }`}>
            {liMsg}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-xs font-bold uppercase tracking-widest text-[#1a2e8a]/60">Área de atuação</label>
        <div className="flex flex-wrap gap-2">
          {AREAS.map((a) => (
            <button
              key={a.value}
              onClick={() => setArea(a.value)}
              className={`rounded-full px-4 py-1.5 text-xs font-bold uppercase tracking-wide transition-colors ${
                area === a.value ? 'bg-[#1a2e8a] text-white' : 'bg-[#1a2e8a]/10 text-[#1a2e8a] hover:bg-[#1a2e8a]/20'
              }`}
            >
              {a.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-xs font-bold uppercase tracking-widest text-[#1a2e8a]/60">Senioridade</label>
        <div className="flex flex-wrap gap-2">
          {SENIORITIES.map((s) => (
            <button
              key={s}
              onClick={() => setSeniority(s)}
              className={`rounded-full px-4 py-1.5 text-xs font-bold uppercase tracking-wide transition-colors ${
                seniority === s ? 'bg-[#1a2e8a] text-white' : 'bg-[#1a2e8a]/10 text-[#1a2e8a] hover:bg-[#1a2e8a]/20'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-xs font-bold uppercase tracking-widest text-[#1a2e8a]/60">Tecnologias</label>
        <div className="flex flex-wrap gap-2">
          {STACKS.map((s) => (
            <button
              key={s}
              onClick={() => toggleStack(s)}
              className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                selectedStacks.includes(s) ? 'bg-[#1a2e8a] text-white' : 'bg-[#1a2e8a]/10 text-[#1a2e8a] hover:bg-[#1a2e8a]/20'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
        <div className="flex gap-2 mt-1">
          <input
            value={customStack}
            onChange={(e) => setCustomStack(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addCustom())}
            placeholder="Outra tecnologia..."
            className="flex-1 rounded-xl border border-[#1a2e8a]/20 bg-white px-4 py-2 text-sm text-[#1a2e8a] outline-none focus:border-[#1a2e8a]"
          />
          <button onClick={addCustom} className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#1a2e8a] text-white transition-opacity hover:opacity-80">
            <Plus size={15} />
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-xs font-bold uppercase tracking-widest text-[#1a2e8a]/60">Modalidade</label>
        <div className="flex flex-wrap gap-2">
          {MODALITIES.map((m) => (
            <button
              key={m.value}
              onClick={() => setModality(m.value)}
              className={`rounded-full px-4 py-1.5 text-xs font-bold uppercase tracking-wide transition-colors ${
                modality === m.value ? 'bg-[#1a2e8a] text-white' : 'bg-[#1a2e8a]/10 text-[#1a2e8a] hover:bg-[#1a2e8a]/20'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-xs font-bold uppercase tracking-widest text-[#1a2e8a]/60">Localização das vagas</label>
        <div className="flex flex-wrap gap-2">
          {LOCATION_TYPES.map((l) => (
            <button
              key={l.value}
              onClick={() => setLocationType(l.value)}
              className={`rounded-full px-4 py-1.5 text-xs font-bold uppercase tracking-wide transition-colors ${
                locationType === l.value ? 'bg-[#1a2e8a] text-white' : 'bg-[#1a2e8a]/10 text-[#1a2e8a] hover:bg-[#1a2e8a]/20'
              }`}
            >
              {l.label}
            </button>
          ))}
        </div>
      </div>

      {msg && (
        <p className="rounded-xl border border-[#1a2e8a]/20 bg-[#1a2e8a]/5 px-4 py-3 text-sm text-[#1a2e8a]">
          {msg}
        </p>
      )}

      <button
        onClick={handleSave}
        disabled={saving}
        className="rounded-full bg-[#1a2e8a] py-3.5 text-sm font-bold uppercase tracking-widest text-white transition-opacity hover:opacity-80 disabled:opacity-50"
      >
        {saving ? 'Salvando...' : 'Salvar perfil'}
      </button>
    </div>
  )
}

// ─── Onboarding (apenas para usuários novos) ────────────────────────────────

function Onboarding({ onComplete }: { onComplete: (p: UserProfile) => void }) {
  const [step, setStep] = useState(0)
  const [area, setArea] = useState('')
  const [seniority, setSeniority] = useState('')
  const [selectedStacks, setSelectedStacks] = useState<string[]>([])
  const [customStack, setCustomStack] = useState('')
  const [locationType, setLocationType] = useState('')
  const [modality, setModality] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function toggleStack(s: string) {
    setSelectedStacks((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]))
  }

  function addCustom() {
    const s = customStack.trim()
    if (s && !selectedStacks.includes(s)) setSelectedStacks((prev) => [...prev, s])
    setCustomStack('')
  }

  async function handleCVUpload(file: File) {
    setError('')
    const updated = await auth.uploadCV(file)
    onComplete(updated)
  }

  async function handleFinish() {
    setSaving(true)
    setError('')
    try {
      const updated = await auth.updateProfile({
        area: area || undefined,
        seniority: seniority || undefined,
        stacks: selectedStacks.length ? selectedStacks : undefined,
        location_type: locationType || undefined,
        work_modality: modality || undefined,
      })
      onComplete(updated)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar perfil.')
      setSaving(false)
    }
  }

  // Steps: 0=welcome, 1=area, 2=seniority, 3=stacks, 4=location+modality
  const TOTAL = 5

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#e8e8e8] px-4">
      <div className="w-full max-w-lg rounded-3xl bg-white shadow-xl p-8">
        <div className="flex gap-1 mb-8">
          {Array.from({ length: TOTAL }).map((_, i) => (
            <div
              key={i}
              className={`h-1 flex-1 rounded-full transition-colors duration-300 ${
                i <= step ? 'bg-[#1a2e8a]' : 'bg-[#1a2e8a]/15'
              }`}
            />
          ))}
        </div>

        {step === 0 && (
          <div className="flex flex-col gap-6">
            <div>
              <h2 className="font-display-condensed text-[#1a2e8a] text-4xl leading-none mb-2">
                BEM-VINDO AO QUAK!
              </h2>
              <p className="text-[#1a2e8a]/60 text-sm">
                Vamos personalizar sua busca. Você pode enviar seu CV e deixar o Quak preencher tudo automaticamente, ou responder as perguntas manualmente.
              </p>
            </div>
            <CVUploadButton onUpload={handleCVUpload} variant="dashed" />
            <div className="flex items-center gap-3 text-[#1a2e8a]/30 text-xs">
              <div className="flex-1 h-px bg-[#1a2e8a]/15" />
              <span>ou preencher manualmente</span>
              <div className="flex-1 h-px bg-[#1a2e8a]/15" />
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
            <button
              onClick={() => setStep(1)}
              className="flex items-center justify-center gap-2 rounded-full bg-[#1a2e8a] py-3.5 text-sm font-bold uppercase tracking-widest text-white transition-opacity hover:opacity-80"
            >
              Preencher manualmente <ChevronRight size={16} />
            </button>
          </div>
        )}

        {step === 1 && (
          <div className="flex flex-col gap-6">
            <div>
              <h2 className="font-display-condensed text-[#1a2e8a] text-4xl leading-none mb-2">
                SUA ÁREA
              </h2>
              <p className="text-[#1a2e8a]/60 text-sm">Qual é sua área de atuação principal?</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {AREAS.map((a) => (
                <button
                  key={a.value}
                  onClick={() => setArea(a.value)}
                  className={`rounded-full px-5 py-2 text-sm font-bold uppercase tracking-wide transition-colors ${
                    area === a.value ? 'bg-[#1a2e8a] text-white' : 'bg-[#1a2e8a]/10 text-[#1a2e8a] hover:bg-[#1a2e8a]/20'
                  }`}
                >
                  {a.label}
                </button>
              ))}
            </div>
            <button
              onClick={() => area && setStep(2)}
              disabled={!area}
              className="rounded-full bg-[#1a2e8a] py-3.5 text-sm font-bold uppercase tracking-widest text-white transition-opacity hover:opacity-80 disabled:opacity-30"
            >
              Continuar
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="flex flex-col gap-6">
            <div>
              <h2 className="font-display-condensed text-[#1a2e8a] text-4xl leading-none mb-2">
                SUA SENIORIDADE
              </h2>
              <p className="text-[#1a2e8a]/60 text-sm">Qual é o seu nível de experiência atual?</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {SENIORITIES.map((s) => (
                <button
                  key={s}
                  onClick={() => setSeniority(s)}
                  className={`rounded-full px-5 py-2 text-sm font-bold uppercase tracking-wide transition-colors ${
                    seniority === s ? 'bg-[#1a2e8a] text-white' : 'bg-[#1a2e8a]/10 text-[#1a2e8a] hover:bg-[#1a2e8a]/20'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
            <button
              onClick={() => seniority && setStep(3)}
              disabled={!seniority}
              className="rounded-full bg-[#1a2e8a] py-3.5 text-sm font-bold uppercase tracking-widest text-white transition-opacity hover:opacity-80 disabled:opacity-30"
            >
              Continuar
            </button>
          </div>
        )}

        {step === 3 && (
          <div className="flex flex-col gap-6">
            <div>
              <h2 className="font-display-condensed text-[#1a2e8a] text-4xl leading-none mb-2">
                SUAS TECNOLOGIAS
              </h2>
              <p className="text-[#1a2e8a]/60 text-sm">Selecione as tecnologias com que você trabalha.</p>
            </div>
            <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto pr-1">
              {STACKS.map((s) => (
                <button
                  key={s}
                  onClick={() => toggleStack(s)}
                  className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                    selectedStacks.includes(s) ? 'bg-[#1a2e8a] text-white' : 'bg-[#1a2e8a]/10 text-[#1a2e8a] hover:bg-[#1a2e8a]/20'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                value={customStack}
                onChange={(e) => setCustomStack(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addCustom())}
                placeholder="Outra tecnologia..."
                className="flex-1 rounded-xl border border-[#1a2e8a]/20 bg-white px-4 py-2 text-sm text-[#1a2e8a] outline-none focus:border-[#1a2e8a]"
              />
              <button onClick={addCustom} className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#1a2e8a] text-white">
                <Plus size={15} />
              </button>
            </div>
            <button
              onClick={() => selectedStacks.length > 0 && setStep(4)}
              disabled={selectedStacks.length === 0}
              className="rounded-full bg-[#1a2e8a] py-3.5 text-sm font-bold uppercase tracking-widest text-white transition-opacity hover:opacity-80 disabled:opacity-30"
            >
              Continuar
            </button>
          </div>
        )}

        {step === 4 && (
          <div className="flex flex-col gap-6">
            <div>
              <h2 className="font-display-condensed text-[#1a2e8a] text-4xl leading-none mb-2">
                PREFERÊNCIAS DE VAGA
              </h2>
              <p className="text-[#1a2e8a]/60 text-sm">Como e onde você quer trabalhar?</p>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold uppercase tracking-widest text-[#1a2e8a]/50">Localização</label>
              <div className="flex flex-wrap gap-2">
                {LOCATION_TYPES.map((l) => (
                  <button
                    key={l.value}
                    onClick={() => setLocationType(l.value)}
                    className={`rounded-full px-5 py-2 text-sm font-bold uppercase tracking-wide transition-colors ${
                      locationType === l.value ? 'bg-[#1a2e8a] text-white' : 'bg-[#1a2e8a]/10 text-[#1a2e8a] hover:bg-[#1a2e8a]/20'
                    }`}
                  >
                    {l.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold uppercase tracking-widest text-[#1a2e8a]/50">Modalidade</label>
              <div className="flex flex-wrap gap-2">
                {MODALITIES.map((m) => (
                  <button
                    key={m.value}
                    onClick={() => setModality(m.value)}
                    className={`rounded-full px-5 py-2 text-sm font-bold uppercase tracking-wide transition-colors ${
                      modality === m.value ? 'bg-[#1a2e8a] text-white' : 'bg-[#1a2e8a]/10 text-[#1a2e8a] hover:bg-[#1a2e8a]/20'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            {error && <p className="text-sm text-red-500">{error}</p>}

            <button
              onClick={() => locationType && modality && handleFinish()}
              disabled={!locationType || !modality || saving}
              className="rounded-full bg-[#1a2e8a] py-3.5 text-sm font-bold uppercase tracking-widest text-white transition-opacity hover:opacity-80 disabled:opacity-30"
            >
              {saving ? 'Salvando...' : 'Concluir e buscar vagas'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Main ──────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const router = useRouter()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [tab, setTab] = useState('automacao')
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) { router.push('/entrar'); return }
    auth.me()
      .then(setProfile)
      .catch(() => { localStorage.removeItem('token'); router.push('/entrar') })
      .finally(() => setReady(true))
  }, [router])

  function handleLogout() {
    localStorage.removeItem('token')
    router.push('/')
  }

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#e8e8e8]">
        <span className="text-[#1a2e8a]/40 text-sm">Carregando...</span>
      </div>
    )
  }

  if (!profile) return null

  const needsOnboarding =
    !profile.cv_filename &&
    (!profile.seniority || !profile.stacks?.length || !profile.work_modality || !profile.area)

  if (needsOnboarding) {
    return <Onboarding onComplete={(p) => { setProfile(p); setTab('automacao') }} />
  }

  const username = profile.email.split('@')[0]

  return (
    <div className="flex min-h-screen bg-[#e8e8e8]">
      <aside className="flex w-64 shrink-0 flex-col bg-[#1a2e8a] px-5 py-8">
        <div className="mb-8">
          <span className="font-display-condensed text-white/60 text-xs uppercase tracking-widest">Bem-vindo,</span>
          <p className="text-white font-bold text-base truncate mt-0.5">{username}</p>
        </div>

        <NavButtons active={tab} onChange={setTab} />

        <div className="mt-auto">
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 text-white/50 text-xs font-semibold uppercase tracking-widest transition-colors hover:text-white"
          >
            <LogOut size={14} /> Sair
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto px-8 py-10">
        <div className="max-w-2xl mx-auto">
          <h1 className="font-display-condensed text-[#1a2e8a] text-4xl leading-none mb-6">
            {tab === 'automacao' && 'AUTOMAÇÃO'}
            {tab === 'vagas' && 'MINHAS VAGAS'}
            {tab === 'email' && 'CANDIDATURA POR EMAIL'}
            {tab === 'candidaturas' && 'CANDIDATURAS'}
            {tab === 'perfil' && 'PERFIL'}
          </h1>

          {tab === 'automacao' && <AutomacaoTab profile={profile} onNavigateToVagas={() => setTab('vagas')} />}
          {tab === 'vagas' && <VagasTab profile={profile} />}
          {tab === 'email' && <EmailTab profile={profile} />}
          {tab === 'candidaturas' && <CandidaturasTab />}
          {tab === 'perfil' && <PerfilTab profile={profile} onUpdate={setProfile} />}
        </div>
      </main>
    </div>
  )
}
