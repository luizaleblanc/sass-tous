'use client'

import { useEffect, useState, useCallback } from 'react'
import { Send, Loader2, CheckCircle2, XCircle, Info } from 'lucide-react'
import { jobs, auth, UserProfile, Job } from '@/lib/api'

// ─── Template variable reference shown to the user ──────────────────────────

const TEMPLATE_VARS: { tag: string; description: string }[] = [
  { tag: '{sender_name}', description: 'Seu nome (extraído do CV ou email)' },
  { tag: '{email}',       description: 'Seu email de contato' },
  { tag: '{phone}',       description: 'Seu telefone (extraído do CV)' },
  { tag: '{linkedin}',    description: 'URL do seu LinkedIn' },
  { tag: '{github}',      description: 'URL do seu GitHub' },
  { tag: '{portfolio}',   description: 'GitHub ou LinkedIn (o que estiver disponível)' },
  { tag: '{job_title}',   description: 'Título da vaga desta candidatura' },
  { tag: '{company}',     description: 'Nome da empresa desta candidatura' },
  { tag: '{stacks}',      description: 'Suas tecnologias separadas por vírgula' },
  { tag: '{seniority}',   description: 'Sua senioridade' },
]

// ─── Per-job send status tracking ───────────────────────────────────────────

type SendStatus = 'pending' | 'sending' | 'sent' | 'failed'

interface JobSendState {
  job: Job
  status: SendStatus
}

// ─── LinkedIn Session Panel ──────────────────────────────────────────────────

function LinkedInPanel({
  hasSession,
  onConnected,
  onDisconnected,
}: {
  hasSession: boolean
  onConnected: () => void
  onDisconnected: () => void
}) {
  const [liAt, setLiAt] = useState('')
  const [saving, setSaving] = useState(false)
  const [removing, setRemoving] = useState(false)
  const [msg, setMsg] = useState('')

  async function handleSave() {
    if (!liAt.trim()) return
    setSaving(true)
    setMsg('')
    try {
      await auth.linkedinSession(liAt.trim())
      setLiAt('')
      setMsg('Sessão vinculada. O próximo scraping do LinkedIn usará sua conta.')
      onConnected()
    } catch (err) {
      setMsg(err instanceof Error ? err.message : 'Erro ao salvar sessão.')
    } finally {
      setSaving(false)
    }
  }

  async function handleRemove() {
    setRemoving(true)
    setMsg('')
    try {
      await auth.removeLinkedinSession()
      setMsg('Sessão removida.')
      onDisconnected()
    } catch (err) {
      setMsg(err instanceof Error ? err.message : 'Erro ao remover sessão.')
    } finally {
      setRemoving(false)
    }
  }

  return (
    <div className="rounded-2xl border border-[#1a2e8a]/10 bg-white p-5 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold uppercase tracking-widest text-[#1a2e8a]/60">
          Sessao LinkedIn
        </p>
        {hasSession && (
          <span className="flex items-center gap-1.5 rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
            <CheckCircle2 size={12} /> Vinculada
          </span>
        )}
      </div>

      <p className="text-xs text-[#1a2e8a]/50 leading-relaxed">
        Cole o valor do cookie <code className="bg-[#1a2e8a]/5 px-1 py-0.5 rounded font-mono">li_at</code> do
        LinkedIn para que o scraper use sua conta e retorne vagas personalizadas.
        Acesse: DevTools (F12) → Application → Cookies → linkedin.com → li_at
      </p>

      {!hasSession ? (
        <div className="flex gap-2">
          <input
            value={liAt}
            onChange={(e) => setLiAt(e.target.value)}
            type="password"
            placeholder="Cole o valor do cookie li_at aqui"
            className="flex-1 rounded-xl border border-[#1a2e8a]/20 bg-white px-4 py-2.5 text-sm text-[#1a2e8a] outline-none focus:border-[#1a2e8a] font-mono"
          />
          <button
            onClick={handleSave}
            disabled={saving || !liAt.trim()}
            className="shrink-0 rounded-xl bg-[#1a2e8a] px-4 py-2.5 text-sm font-bold text-white transition-opacity hover:opacity-80 disabled:opacity-40"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : 'Vincular'}
          </button>
        </div>
      ) : (
        <button
          onClick={handleRemove}
          disabled={removing}
          className="self-start rounded-xl border border-red-200 px-4 py-2 text-xs font-semibold text-red-500 transition-colors hover:bg-red-50 disabled:opacity-40"
        >
          {removing ? <Loader2 size={12} className="animate-spin inline mr-1" /> : null}
          Remover sessao
        </button>
      )}

      {msg && (
        <p className={`text-xs rounded-xl border px-3 py-2 ${
          msg.includes('Erro') ? 'border-red-200 bg-red-50 text-red-600' : 'border-green-200 bg-green-50 text-green-700'
        }`}>
          {msg}
        </p>
      )}
    </div>
  )
}

// ─── Main email dispatch component ──────────────────────────────────────────

export function EmailDispatch({ profile }: { profile: UserProfile }) {
  const [sendStates, setSendStates] = useState<JobSendState[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [sending, setSending] = useState(false)
  const [showVarHints, setShowVarHints] = useState(false)
  const [hasLinkedIn, setHasLinkedIn] = useState(false)
  const [globalMsg, setGlobalMsg] = useState('')

  const loadJobs = useCallback(() => {
    setLoading(true)
    jobs.list({ application_type: 'email' })
      .then((list) => {
        setSendStates(list.map((j) => ({ job: j, status: 'pending' as SendStatus })))
      })
      .catch(() => setSendStates([]))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    setSubject('Candidatura — {sender_name} | Desenvolvedor Full Stack')
    setBody(
      `Ola,\n\n` +
      `Meu nome e {sender_name} e sou Desenvolvedor Full Stack com cerca de 4 anos de experiencia no desenvolvimento de aplicacoes completas, desde interfaces profissionais ate APIs, microsservicos, automacoes e integracoes entre sistemas.\n\n` +
      `Tenho experiencia pratica em CRM, criacao de agentes de IA, automacoes inteligentes e e-commerces, sempre entregando solucoes estaveis e de impacto direto nos processos internos.\n\n` +
      `Minhas principais habilidades tecnicas incluem:\n` +
      `Front-end: HTML, CSS, JavaScript, TypeScript, Next.js, React\n` +
      `Back-end: Node.js, NestJS, express.js, Python, Django, REST APIs, microsservicos\n` +
      `Banco de Dados & DevOps: Docker, CI/CD, MongoDB, PostgreSQL\n\n` +
      `Portfolio: {portfolio}\n` +
      `Contato: {email}\n\n` +
      `Fico a disposicao para conversarmos sobre a oportunidade.\n\n` +
      `Atenciosamente,\n{sender_name}`
    )

    setHasLinkedIn(profile.has_linkedin_session ?? false)
    loadJobs()
  }, [profile, loadJobs])

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function toggleAll() {
    const eligible = sendStates.filter((s) => s.status !== 'sent')
    setSelected((prev) =>
      prev.size === eligible.length
        ? new Set()
        : new Set(eligible.map((s) => s.job.id))
    )
  }

  function insertTag(tag: string) {
    setBody((prev) => prev + tag)
  }

  async function handleSend() {
    if (selected.size === 0) return
    setSending(true)
    setGlobalMsg('')

    // Optimistically mark selected as sending
    setSendStates((prev) =>
      prev.map((s) => selected.has(s.job.id) ? { ...s, status: 'sending' } : s)
    )

    try {
      await jobs.applyEmail({ job_ids: [...selected], subject, body })

      setSendStates((prev) =>
        prev.map((s) =>
          selected.has(s.job.id)
            ? { ...s, status: 'sent', job: { ...s.job, status: 'Aplicada' } }
            : s
        )
      )
      setSelected(new Set())
      setGlobalMsg(`${selected.size} candidatura(s) enviada(s) com sucesso.`)
    } catch (err) {
      setSendStates((prev) =>
        prev.map((s) => selected.has(s.job.id) ? { ...s, status: 'failed' } : s)
      )
      setGlobalMsg(err instanceof Error ? err.message : 'Erro ao enviar emails.')
    } finally {
      setSending(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-[#1a2e8a]/40">
        <Loader2 size={20} className="animate-spin mr-2" />
        <span className="text-sm">Carregando vagas com email...</span>
      </div>
    )
  }

  const pendingJobs = sendStates.filter((s) => s.status !== 'sent')
  const sentCount = sendStates.filter((s) => s.status === 'sent').length

  return (
    <div className="flex flex-col gap-6">
      <LinkedInPanel
        hasSession={hasLinkedIn}
        onConnected={() => setHasLinkedIn(true)}
        onDisconnected={() => setHasLinkedIn(false)}
      />

      {sendStates.length === 0 ? (
        <div className="rounded-2xl border border-[#1a2e8a]/10 bg-[#1a2e8a]/5 px-5 py-10 text-center">
          <p className="text-sm text-[#1a2e8a]/50">
            Nenhuma vaga com candidatura por email. Execute a automacao e aguarde os resultados.
          </p>
        </div>
      ) : (
        <>
          {/* Job selection list */}
          <div className="rounded-2xl border border-[#1a2e8a]/10 bg-white p-5 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold uppercase tracking-widest text-[#1a2e8a]/60">
                {sendStates.length} vaga{sendStates.length !== 1 ? 's' : ''} com email
                {sentCount > 0 && ` · ${sentCount} ja enviada${sentCount !== 1 ? 's' : ''}`}
                {selected.size > 0 && ` · ${selected.size} selecionada${selected.size !== 1 ? 's' : ''}`}
              </p>
              <button
                onClick={toggleAll}
                className="text-xs font-semibold text-[#1a2e8a] underline underline-offset-2 hover:opacity-70"
              >
                {selected.size === pendingJobs.length ? 'Desmarcar todas' : 'Selecionar pendentes'}
              </button>
            </div>

            <div className="flex flex-col gap-2 max-h-56 overflow-y-auto pr-1">
              {sendStates.map(({ job: j, status }) => (
                <label
                  key={j.id}
                  className={`flex items-center gap-3 rounded-xl border px-4 py-3 transition-colors ${
                    status === 'sent'
                      ? 'border-green-200 bg-green-50 cursor-default opacity-70'
                      : status === 'failed'
                      ? 'border-red-200 bg-red-50 cursor-pointer'
                      : selected.has(j.id)
                      ? 'border-[#1a2e8a] bg-[#1a2e8a]/5 cursor-pointer'
                      : 'border-[#1a2e8a]/10 hover:bg-[#1a2e8a]/5 cursor-pointer'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selected.has(j.id)}
                    onChange={() => status !== 'sent' && toggleSelect(j.id)}
                    disabled={status === 'sent' || status === 'sending'}
                    className="accent-[#1a2e8a]"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-[#1a2e8a] text-sm truncate">{j.title}</p>
                    <p className="text-xs text-[#1a2e8a]/50 truncate">
                      {j.company ?? '—'} · <span className="font-medium text-[#1a2e8a]/70">{j.application_email}</span>
                    </p>
                  </div>
                  <span className="shrink-0">
                    {status === 'sent' && <CheckCircle2 size={15} className="text-green-500" />}
                    {status === 'failed' && <XCircle size={15} className="text-red-400" />}
                    {status === 'sending' && <Loader2 size={15} className="animate-spin text-[#1a2e8a]/40" />}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Template editor */}
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold uppercase tracking-widest text-[#1a2e8a]/60">Assunto</label>
              <input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="rounded-xl border border-[#1a2e8a]/20 bg-white px-4 py-2.5 text-sm text-[#1a2e8a] outline-none focus:border-[#1a2e8a]"
              />
            </div>

            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-widest text-[#1a2e8a]/60">Mensagem</label>
                <button
                  onClick={() => setShowVarHints((v) => !v)}
                  className="flex items-center gap-1 text-xs text-[#1a2e8a]/50 hover:text-[#1a2e8a] transition-colors"
                >
                  <Info size={12} />
                  {showVarHints ? 'Ocultar variaveis' : 'Ver variaveis'}
                </button>
              </div>

              {showVarHints && (
                <div className="rounded-xl border border-[#1a2e8a]/10 bg-[#1a2e8a]/5 p-3 flex flex-wrap gap-2">
                  {TEMPLATE_VARS.map(({ tag, description }) => (
                    <button
                      key={tag}
                      onClick={() => insertTag(tag)}
                      title={description}
                      className="rounded-lg bg-white border border-[#1a2e8a]/20 px-2 py-1 font-mono text-xs text-[#1a2e8a] hover:border-[#1a2e8a] hover:bg-[#1a2e8a]/5 transition-colors"
                    >
                      {tag}
                    </button>
                  ))}
                  <p className="w-full text-xs text-[#1a2e8a]/40 mt-1">
                    Clique em uma variavel para inseri-la no final da mensagem. O servidor substituira os valores no envio.
                  </p>
                </div>
              )}

              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={10}
                className="rounded-xl border border-[#1a2e8a]/20 bg-white px-4 py-2.5 text-sm text-[#1a2e8a] outline-none focus:border-[#1a2e8a] resize-none leading-relaxed font-mono"
              />
            </div>

            {globalMsg && (
              <p className={`rounded-xl border px-4 py-3 text-sm ${
                globalMsg.includes('sucesso') || globalMsg.includes('enviada')
                  ? 'border-green-200 bg-green-50 text-green-700'
                  : 'border-red-200 bg-red-50 text-red-600'
              }`}>
                {globalMsg}
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
