'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { ExternalLink, Trash2, Upload, Plus, X, ChevronRight, LogOut, Loader2, CheckCircle2 } from 'lucide-react'
import { auth, jobs, UserProfile, Job } from '@/lib/api'

type CVUploadState = 'idle' | 'reading' | 'processing' | 'done' | 'error'

const CV_STEP_LABELS: Record<CVUploadState, string> = {
  idle: 'Preencher com meu CV',
  reading: 'Lendo arquivo...',
  processing: 'Extraindo dados do CV...',
  done: 'CV processado!',
  error: '',
}

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
        <span className="truncate">
          {state === 'error'
            ? currentFilename
              ? `CV: ${currentFilename}`
              : 'Enviar CV (PDF/DOC)'
            : state === 'done' && currentFilename
            ? `CV: ${currentFilename}`
            : CV_STEP_LABELS[state]}
        </span>
      </button>
      {busy && (
        <p className="text-xs text-[#1a2e8a]/50 animate-pulse pl-1">
          {state === 'reading' ? 'Lendo arquivo...' : 'Extraindo tecnologias, contatos e dados do perfil...'}
        </p>
      )}
      {error && <p className="text-xs text-red-500 pl-1">{error}</p>}
    </div>
  )
}

// ─── Shared ────────────────────────────────────────────────────────────────

function NavButtons({
  active,
  onChange,
}: {
  active: string
  onChange: (tab: string) => void
}) {
  const tabs = [
    { id: 'vagas', label: 'Minhas Vagas' },
    { id: 'automacao', label: 'Automação' },
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

function JobCard({
  job,
  onDelete,
}: {
  job: Job
  onDelete?: (id: string) => void
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
          {job.stacks?.slice(0, 3).map((s) => (
            <span
              key={s}
              className="rounded-full bg-[#1a2e8a]/5 px-2 py-0.5 text-xs text-[#1a2e8a]/70"
            >
              {s}
            </span>
          ))}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <a
          href={job.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex h-8 w-8 items-center justify-center rounded-full bg-[#1a2e8a]/10 text-[#1a2e8a] transition-colors hover:bg-[#1a2e8a] hover:text-white"
        >
          <ExternalLink size={14} />
        </a>
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

// ─── Tabs ──────────────────────────────────────────────────────────────────

function VagasTab() {
  const [list, setList] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)

  async function load() {
    try {
      const data = await jobs.matches()
      setList(data)
    } catch {
      setList([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  async function handleDelete(id: string) {
    await jobs.delete(id).catch(() => null)
    setList((prev) => prev.filter((j) => j.id !== id))
  }

  if (loading) {
    return <p className="text-sm text-[#1a2e8a]/50 py-10 text-center">Carregando vagas...</p>
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-[#1a2e8a]/50 font-semibold uppercase tracking-widest mb-2">
        {list.length} vaga{list.length !== 1 ? 's' : ''} compatível{list.length !== 1 ? 'eis' : ''}
      </p>
      {list.length === 0 ? (
        <EmptyState message="Nenhuma vaga compatível ainda. Rode a automação primeiro." />
      ) : (
        list.map((j) => <JobCard key={j.id} job={j} onDelete={handleDelete} />)
      )}
    </div>
  )
}

const PLATFORMS = ['LinkedIn', 'Indeed', 'Gupy', 'Catho', 'InfoJobs', 'Trampos', 'Vagas.com', 'Glassdoor']

function AutomacaoTab() {
  const [keyword, setKeyword] = useState('')
  const [keywords, setKeywords] = useState<string[]>([])
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([])
  const [targetUrl, setTargetUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('')

  function addKeyword() {
    const k = keyword.trim()
    if (k && !keywords.includes(k)) setKeywords((prev) => [...prev, k])
    setKeyword('')
  }

  function togglePlatform(p: string) {
    setSelectedPlatforms((prev) =>
      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]
    )
  }

  async function handleStart() {
    if (keywords.length === 0 && selectedPlatforms.length === 0 && !targetUrl) {
      setMsg('Adicione ao menos uma palavra-chave ou plataforma.')
      return
    }
    setLoading(true)
    setMsg('')
    try {
      const res = await jobs.start({
        keywords: keywords.length ? keywords : undefined,
        platforms: selectedPlatforms.length ? selectedPlatforms : undefined,
        target_urls: targetUrl ? [targetUrl] : undefined,
      })
      setMsg(res.message ?? 'Automação iniciada com sucesso!')
    } catch (err) {
      setMsg(err instanceof Error ? err.message : 'Erro ao iniciar automação.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
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
        </label>
        <div className="flex flex-wrap gap-2">
          {PLATFORMS.map((p) => (
            <button
              key={p}
              onClick={() => togglePlatform(p)}
              className={`rounded-full px-4 py-1.5 text-xs font-bold uppercase tracking-wide transition-colors ${
                selectedPlatforms.includes(p)
                  ? 'bg-[#1a2e8a] text-white'
                  : 'bg-[#1a2e8a]/10 text-[#1a2e8a] hover:bg-[#1a2e8a]/20'
              }`}
            >
              {p}
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

      {msg && (
        <p className="rounded-xl border border-[#1a2e8a]/20 bg-[#1a2e8a]/5 px-4 py-3 text-sm text-[#1a2e8a]">
          {msg}
        </p>
      )}

      <button
        onClick={handleStart}
        disabled={loading}
        className="rounded-full bg-[#1a2e8a] py-3.5 text-sm font-bold uppercase tracking-widest text-white transition-opacity hover:opacity-80 disabled:opacity-50"
      >
        {loading ? 'Iniciando...' : 'Iniciar automação'}
      </button>
    </div>
  )
}

function CandidaturasTab() {
  const [list, setList] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    jobs
      .list({ status: 'Aplicada' })
      .then(setList)
      .catch(() => setList([]))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return <p className="text-sm text-[#1a2e8a]/50 py-10 text-center">Carregando...</p>
  }

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

const STACKS = [
  'React', 'Vue', 'Angular', 'Next.js', 'TypeScript', 'JavaScript',
  'Node.js', 'Python', 'Java', 'Go', 'Rust', 'C#', 'PHP', 'Ruby',
  'Django', 'FastAPI', 'Spring', 'Laravel', 'Docker', 'Kubernetes',
  'AWS', 'GCP', 'Azure', 'PostgreSQL', 'MySQL', 'MongoDB', 'Redis',
  'GraphQL', 'REST', 'Git', 'Linux', 'Figma', 'Flutter', 'React Native',
]

const SENIORITIES = ['Estágio', 'Trainee', 'Junior', 'Pleno', 'Senior']
const MODALITIES = [
  { value: 'remoto', label: 'Remoto' },
  { value: 'presencial', label: 'Presencial' },
  { value: 'hibrido', label: 'Híbrido' },
]

function PerfilTab({
  profile,
  onUpdate,
}: {
  profile: UserProfile
  onUpdate: (p: UserProfile) => void
}) {
  const [seniority, setSeniority] = useState(profile.seniority ?? '')
  const [selectedStacks, setSelectedStacks] = useState<string[]>(profile.stacks ?? [])
  const [customStack, setCustomStack] = useState('')
  const [modality, setModality] = useState(profile.work_modality ?? '')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

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
        stacks: selectedStacks.length ? selectedStacks : undefined,
        work_modality: modality || undefined,
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

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <label className="text-xs font-bold uppercase tracking-widest text-[#1a2e8a]/60">CV</label>
        <CVUploadButton
          onUpload={handleCVUpload}
          currentFilename={profile.cv_filename}
        />
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-xs font-bold uppercase tracking-widest text-[#1a2e8a]/60">
          Senioridade
        </label>
        <div className="flex flex-wrap gap-2">
          {SENIORITIES.map((s) => (
            <button
              key={s}
              onClick={() => setSeniority(s)}
              className={`rounded-full px-4 py-1.5 text-xs font-bold uppercase tracking-wide transition-colors ${
                seniority === s
                  ? 'bg-[#1a2e8a] text-white'
                  : 'bg-[#1a2e8a]/10 text-[#1a2e8a] hover:bg-[#1a2e8a]/20'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-xs font-bold uppercase tracking-widest text-[#1a2e8a]/60">
          Tecnologias
        </label>
        <div className="flex flex-wrap gap-2">
          {STACKS.map((s) => (
            <button
              key={s}
              onClick={() => toggleStack(s)}
              className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                selectedStacks.includes(s)
                  ? 'bg-[#1a2e8a] text-white'
                  : 'bg-[#1a2e8a]/10 text-[#1a2e8a] hover:bg-[#1a2e8a]/20'
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
          <button
            onClick={addCustom}
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#1a2e8a] text-white transition-opacity hover:opacity-80"
          >
            <Plus size={15} />
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-xs font-bold uppercase tracking-widest text-[#1a2e8a]/60">
          Modalidade
        </label>
        <div className="flex flex-wrap gap-2">
          {MODALITIES.map((m) => (
            <button
              key={m.value}
              onClick={() => setModality(m.value)}
              className={`rounded-full px-4 py-1.5 text-xs font-bold uppercase tracking-wide transition-colors ${
                modality === m.value
                  ? 'bg-[#1a2e8a] text-white'
                  : 'bg-[#1a2e8a]/10 text-[#1a2e8a] hover:bg-[#1a2e8a]/20'
              }`}
            >
              {m.label}
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

// ─── Onboarding ────────────────────────────────────────────────────────────

function Onboarding({ onComplete }: { onComplete: (p: UserProfile) => void }) {
  const [step, setStep] = useState(0)
  const [seniority, setSeniority] = useState('')
  const [selectedStacks, setSelectedStacks] = useState<string[]>([])
  const [customStack, setCustomStack] = useState('')
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
        seniority: seniority || undefined,
        stacks: selectedStacks.length ? selectedStacks : undefined,
        work_modality: modality || undefined,
      })
      onComplete(updated)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar perfil.')
      setSaving(false)
    }
  }

  const TOTAL = 4

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
                Vamos personalizar sua experiência. Você pode preencher seu perfil manualmente ou
                enviar seu CV e deixar o Quak fazer o resto.
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
                    seniority === s
                      ? 'bg-[#1a2e8a] text-white'
                      : 'bg-[#1a2e8a]/10 text-[#1a2e8a] hover:bg-[#1a2e8a]/20'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
            <button
              onClick={() => seniority && setStep(2)}
              disabled={!seniority}
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
                SUAS TECNOLOGIAS
              </h2>
              <p className="text-[#1a2e8a]/60 text-sm">
                Selecione as tecnologias com que você trabalha.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto">
              {STACKS.map((s) => (
                <button
                  key={s}
                  onClick={() => toggleStack(s)}
                  className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                    selectedStacks.includes(s)
                      ? 'bg-[#1a2e8a] text-white'
                      : 'bg-[#1a2e8a]/10 text-[#1a2e8a] hover:bg-[#1a2e8a]/20'
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
              <button
                onClick={addCustom}
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#1a2e8a] text-white"
              >
                <Plus size={15} />
              </button>
            </div>
            <button
              onClick={() => selectedStacks.length > 0 && setStep(3)}
              disabled={selectedStacks.length === 0}
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
                MODALIDADE
              </h2>
              <p className="text-[#1a2e8a]/60 text-sm">Como você prefere trabalhar?</p>
            </div>
            <div className="flex flex-wrap gap-3">
              {MODALITIES.map((m) => (
                <button
                  key={m.value}
                  onClick={() => setModality(m.value)}
                  className={`rounded-full px-6 py-2.5 text-sm font-bold uppercase tracking-wide transition-colors ${
                    modality === m.value
                      ? 'bg-[#1a2e8a] text-white'
                      : 'bg-[#1a2e8a]/10 text-[#1a2e8a] hover:bg-[#1a2e8a]/20'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
            <button
              onClick={() => modality && handleFinish()}
              disabled={!modality || saving}
              className="rounded-full bg-[#1a2e8a] py-3.5 text-sm font-bold uppercase tracking-widest text-white transition-opacity hover:opacity-80 disabled:opacity-30"
            >
              {saving ? 'Salvando...' : 'Concluir perfil'}
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
  const [tab, setTab] = useState('vagas')
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) {
      router.push('/entrar')
      return
    }
    auth
      .me()
      .then(setProfile)
      .catch(() => {
        localStorage.removeItem('token')
        router.push('/entrar')
      })
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
    !profile.seniority || !profile.stacks?.length || !profile.work_modality

  if (needsOnboarding) {
    return <Onboarding onComplete={setProfile} />
  }

  const username = profile.email.split('@')[0]

  return (
    <div className="flex min-h-screen bg-[#e8e8e8]">
      <aside className="flex w-64 shrink-0 flex-col bg-[#1a2e8a] px-5 py-8">
        <div className="mb-8">
          <span className="font-display-condensed text-white text-2xl tracking-widest">QUAK</span>
          <p className="text-white/50 text-xs mt-1 truncate">{username}</p>
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
            {tab === 'vagas' && 'MINHAS VAGAS'}
            {tab === 'automacao' && 'AUTOMAÇÃO'}
            {tab === 'candidaturas' && 'CANDIDATURAS'}
            {tab === 'perfil' && 'PERFIL'}
          </h1>

          {tab === 'vagas' && <VagasTab />}
          {tab === 'automacao' && <AutomacaoTab />}
          {tab === 'candidaturas' && <CandidaturasTab />}
          {tab === 'perfil' && <PerfilTab profile={profile} onUpdate={setProfile} />}
        </div>
      </main>
    </div>
  )
}
