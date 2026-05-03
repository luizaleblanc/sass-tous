'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Eye, EyeOff, Loader2, Linkedin, ChevronDown, ChevronUp, ExternalLink, Briefcase } from 'lucide-react'
import { auth } from '@/lib/api'

type SessionStatus = 'idle' | 'ok' | 'fail'

// ─── Instrucoes de cookie ────────────────────────────────────────────────────

function CookieInstructions({ domain, cookieName }: { domain: string; cookieName: string }) {
  return (
    <div className="rounded-xl bg-[#1a2e8a]/5 px-4 py-3 text-xs text-[#1a2e8a]/70 flex flex-col gap-1">
      <p className="font-semibold text-[#1a2e8a]/80">Apos fazer login:</p>
      <p>1. Aperte <strong>F12</strong> → aba <strong>Application</strong> (ou Storage)</p>
      <p>2. Cookies → <code className="bg-[#1a2e8a]/10 px-1 rounded">{domain}</code></p>
      <p>3. Copie o valor de <code className="bg-[#1a2e8a]/10 px-1 rounded">{cookieName}</code></p>
    </div>
  )
}

// ─── Painel de plataforma ────────────────────────────────────────────────────

function PlatformPanel({
  icon, title, subtitle, expanded, onToggle, status, children,
}: {
  icon: React.ReactNode
  title: string
  subtitle: string
  expanded: boolean
  onToggle: () => void
  status: SessionStatus
  children: React.ReactNode
}) {
  const dot =
    status === 'ok' ? <span className="h-2 w-2 rounded-full bg-green-500" /> :
    status === 'fail' ? <span className="h-2 w-2 rounded-full bg-orange-400" /> :
    null

  return (
    <div className="rounded-2xl border border-[#1a2e8a]/15 bg-white overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between px-5 py-4 text-left"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#1a2e8a]">
            {icon}
          </div>
          <div>
            <p className="text-sm font-bold text-[#1a2e8a]">{title}</p>
            <p className="text-xs text-[#1a2e8a]/40">{subtitle}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {dot}
          {expanded ? <ChevronUp size={16} className="text-[#1a2e8a]/40" /> : <ChevronDown size={16} className="text-[#1a2e8a]/40" />}
        </div>
      </button>

      {expanded && (
        <div className="flex flex-col gap-4 px-5 pb-5 border-t border-[#1a2e8a]/10 pt-4">
          {children}
        </div>
      )}
    </div>
  )
}

// ─── Pagina principal ────────────────────────────────────────────────────────

export default function EntrarPage() {
  const router = useRouter()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // LinkedIn
  const [liExpanded, setLiExpanded] = useState(false)
  const [liAt, setLiAt] = useState('')
  const [showLiAt, setShowLiAt] = useState(false)
  const [liStatus, setLiStatus] = useState<SessionStatus>('idle')

  // Gupy
  const [gupyExpanded, setGupyExpanded] = useState(false)
  const [gupyToken, setGupyToken] = useState('')
  const [showGupyToken, setShowGupyToken] = useState(false)
  const [gupyStatus, setGupyStatus] = useState<SessionStatus>('idle')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const { access_token } = await auth.login(email, password)
      localStorage.setItem('token', access_token)

      if (liExpanded && liAt.trim()) {
        try {
          await auth.linkedinSession(liAt.trim())
          setLiStatus('ok')
        } catch {
          setLiStatus('fail')
        }
      }

      if (gupyExpanded && gupyToken.trim()) {
        try {
          await auth.storeGupySession(gupyToken.trim())
          setGupyStatus('ok')
        } catch {
          setGupyStatus('fail')
        }
      }

      router.push('/dashboard')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro inesperado. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="flex min-h-screen bg-[#e8e8e8]">
      <div className="hidden w-1/2 overflow-hidden lg:flex lg:items-end lg:justify-center">
        <div className="relative h-[62vh] w-[68%]">
          <Image
            src="/images/quak-cafe.png"
            alt="Quak mascote com cafe"
            fill
            className="object-contain object-bottom drop-shadow-xl"
            priority
          />
        </div>
      </div>

      <div className="flex w-full flex-col items-center justify-center px-8 lg:w-1/2">
        <div className="w-full max-w-md">
          <h1 className="font-display-condensed text-[#1a2e8a] text-[3.5rem] leading-none mb-2">
            ENTRAR
          </h1>
          <p className="text-[#1a2e8a]/60 text-sm mb-10 font-medium">
            Nao tem conta?{' '}
            <Link href="/cadastro" className="text-[#1a2e8a] underline underline-offset-2 hover:opacity-70">
              Criar agora
            </Link>
          </p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-6">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold uppercase tracking-widest text-[#1a2e8a]/60">E-mail</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                className="border-b-2 border-[#1a2e8a]/30 bg-transparent py-3 text-[#1a2e8a] placeholder-[#1a2e8a]/30 outline-none transition-colors focus:border-[#1a2e8a]"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold uppercase tracking-widest text-[#1a2e8a]/60">Senha</label>
              <div className="relative flex items-center border-b-2 border-[#1a2e8a]/30 transition-colors focus-within:border-[#1a2e8a]">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-transparent py-3 text-[#1a2e8a] placeholder-[#1a2e8a]/30 outline-none"
                />
                <button type="button" onClick={() => setShowPassword(v => !v)} className="shrink-0 text-[#1a2e8a]/40 hover:text-[#1a2e8a]">
                  {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </div>

            {/* LinkedIn */}
            <PlatformPanel
              icon={<Linkedin size={14} className="text-white" />}
              title="Conectar LinkedIn"
              subtitle="Opcional — habilita auto-candidatura"
              expanded={liExpanded}
              onToggle={() => setLiExpanded(v => !v)}
              status={liStatus}
            >
              <button
                type="button"
                onClick={() => window.open('https://www.linkedin.com/login', '_blank')}
                className="flex items-center justify-center gap-2 rounded-xl border border-[#0077b5]/40 py-2.5 text-sm font-semibold text-[#0077b5] transition-colors hover:bg-[#0077b5]/5"
              >
                <ExternalLink size={14} /> Abrir LinkedIn para login
              </button>

              <CookieInstructions domain="https://www.linkedin.com" cookieName="li_at" />

              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold uppercase tracking-widest text-[#1a2e8a]/60">Cookie li_at</label>
                <div className="relative">
                  <input
                    type={showLiAt ? 'text' : 'password'}
                    value={liAt}
                    onChange={(e) => setLiAt(e.target.value)}
                    placeholder="AQEDATi..."
                    className="w-full rounded-xl border border-[#1a2e8a]/20 bg-[#f8f8f8] px-4 py-2.5 pr-10 text-sm text-[#1a2e8a] font-mono outline-none focus:border-[#1a2e8a]"
                  />
                  <button type="button" onClick={() => setShowLiAt(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#1a2e8a]/30 hover:text-[#1a2e8a]">
                    {showLiAt ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>

              {liStatus === 'ok' && <p className="text-xs font-semibold text-green-600">LinkedIn conectado!</p>}
              {liStatus === 'fail' && <p className="text-xs font-semibold text-orange-500">Nao foi possivel salvar a sessao LinkedIn.</p>}
            </PlatformPanel>

            {/* Gupy */}
            <PlatformPanel
              icon={<Briefcase size={14} className="text-white" />}
              title="Conectar Gupy"
              subtitle="Opcional — auto-candidatura em vagas Gupy"
              expanded={gupyExpanded}
              onToggle={() => setGupyExpanded(v => !v)}
              status={gupyStatus}
            >
              <button
                type="button"
                onClick={() => window.open('https://portal.gupy.io/auth/sign-in', '_blank')}
                className="flex items-center justify-center gap-2 rounded-xl border border-[#1a2e8a]/30 py-2.5 text-sm font-semibold text-[#1a2e8a] transition-colors hover:bg-[#1a2e8a]/5"
              >
                <ExternalLink size={14} /> Abrir Gupy para login
              </button>

              <CookieInstructions domain="https://portal.gupy.io" cookieName="access_token" />

              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold uppercase tracking-widest text-[#1a2e8a]/60">Token de sessao</label>
                <div className="relative">
                  <input
                    type={showGupyToken ? 'text' : 'password'}
                    value={gupyToken}
                    onChange={(e) => setGupyToken(e.target.value)}
                    placeholder="eyJhbGci..."
                    className="w-full rounded-xl border border-[#1a2e8a]/20 bg-[#f8f8f8] px-4 py-2.5 pr-10 text-sm text-[#1a2e8a] font-mono outline-none focus:border-[#1a2e8a]"
                  />
                  <button type="button" onClick={() => setShowGupyToken(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#1a2e8a]/30 hover:text-[#1a2e8a]">
                    {showGupyToken ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>

              {gupyStatus === 'ok' && <p className="text-xs font-semibold text-green-600">Gupy conectado!</p>}
              {gupyStatus === 'fail' && <p className="text-xs font-semibold text-orange-500">Nao foi possivel salvar a sessao Gupy.</p>}
            </PlatformPanel>

            {error && (
              <p className="rounded-full border border-red-300 bg-red-50 px-4 py-2 text-sm text-red-600">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="mt-2 flex items-center justify-center gap-2 rounded-full bg-[#1a2e8a] py-4 text-sm font-bold uppercase tracking-widest text-white transition-opacity hover:opacity-80 disabled:opacity-50"
            >
              {loading && <Loader2 size={15} className="animate-spin" />}
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </form>
        </div>
      </div>
    </main>
  )
}
