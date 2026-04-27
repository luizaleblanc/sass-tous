'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { auth } from '@/lib/api'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

const PASSWORD_RULES = [
  { label: 'Mínimo 8 caracteres', test: (p: string) => p.length >= 8 },
  { label: 'Pelo menos uma letra', test: (p: string) => /[a-zA-Z]/.test(p) },
  { label: 'Pelo menos um número', test: (p: string) => /[0-9]/.test(p) },
]

function PasswordStrength({ password }: { password: string }) {
  if (!password) return null

  const results = PASSWORD_RULES.map((r) => ({ ...r, ok: r.test(password) }))
  const score = results.filter((r) => r.ok).length
  const barColor =
    score === 1 ? 'bg-red-400' : score === 2 ? 'bg-yellow-400' : 'bg-green-500'

  return (
    <div className="mt-2 flex flex-col gap-2">
      <div className="flex gap-1">
        {PASSWORD_RULES.map((_, i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-colors ${
              i < score ? barColor : 'bg-[#1a2e8a]/15'
            }`}
          />
        ))}
      </div>
      <div className="flex flex-col gap-0.5">
        {results.map(({ label, ok }) => (
          <div key={label} className="flex items-center gap-1.5 text-xs">
            <span className={ok ? 'text-green-500' : 'text-[#1a2e8a]/30'}>
              {ok ? '✓' : '○'}
            </span>
            <span className={ok ? 'text-green-600' : 'text-[#1a2e8a]/40'}>{label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function CadastroPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!EMAIL_REGEX.test(email)) {
      setError('Digite um e-mail válido (ex: nome@dominio.com).')
      return
    }
    for (const rule of PASSWORD_RULES) {
      if (!rule.test(password)) {
        setError(`Senha inválida: ${rule.label.toLowerCase()}.`)
        return
      }
    }
    if (password !== confirmPassword) {
      setError('As senhas digitadas não coincidem. Verifique os campos de senha.')
      return
    }

    setLoading(true)
    try {
      await auth.register(email, password)
      router.push('/entrar')
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : 'Erro inesperado ao criar conta. Tente novamente.',
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="flex min-h-screen bg-[#e8e8e8]">
      <div className="hidden w-1/2 overflow-hidden lg:flex lg:items-end lg:justify-center">
        <div className="relative h-[62vh] w-[68%]">
          <Image
            src="/images/quak-surpresa.png"
            alt="Quak mascote surpreso"
            fill
            className="object-contain object-bottom drop-shadow-xl"
            priority
          />
        </div>
      </div>

      <div className="flex w-full flex-col items-center justify-center px-8 lg:w-1/2">
        <div className="w-full max-w-md">
          <h1 className="font-display-condensed text-[#1a2e8a] text-[3.5rem] leading-none mb-2">
            CRIAR CONTA
          </h1>
          <p className="text-[#1a2e8a]/60 text-sm mb-10 font-medium">
            Já tem conta?{' '}
            <Link
              href="/entrar"
              className="text-[#1a2e8a] underline underline-offset-2 hover:opacity-70"
            >
              Entrar
            </Link>
          </p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-6">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold uppercase tracking-widest text-[#1a2e8a]/60">
                E-mail
              </label>
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
              <label className="text-xs font-bold uppercase tracking-widest text-[#1a2e8a]/60">
                Senha
              </label>
              <div className="flex items-center border-b-2 border-[#1a2e8a]/30 transition-colors focus-within:border-[#1a2e8a]">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="letras e números"
                  className="w-full bg-transparent py-3 text-[#1a2e8a] placeholder-[#1a2e8a]/30 outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="shrink-0 text-[#1a2e8a]/40 transition-colors hover:text-[#1a2e8a]"
                  aria-label={showPassword ? 'Ocultar senha' : 'Ver senha'}
                >
                  {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
              <PasswordStrength password={password} />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold uppercase tracking-widest text-[#1a2e8a]/60">
                Confirmar Senha
              </label>
              <div className="flex items-center border-b-2 border-[#1a2e8a]/30 transition-colors focus-within:border-[#1a2e8a]">
                <input
                  type={showConfirm ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="repita a senha"
                  className="w-full bg-transparent py-3 text-[#1a2e8a] placeholder-[#1a2e8a]/30 outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm((v) => !v)}
                  className="shrink-0 text-[#1a2e8a]/40 transition-colors hover:text-[#1a2e8a]"
                  aria-label={showConfirm ? 'Ocultar senha' : 'Ver senha'}
                >
                  {showConfirm ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </div>

            {error && (
              <p className="rounded-full border border-red-300 bg-red-50 px-4 py-2 text-sm text-red-600">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="mt-2 rounded-full bg-[#1a2e8a] py-4 text-sm font-bold uppercase tracking-widest text-white transition-opacity hover:opacity-80 disabled:opacity-50"
            >
              {loading ? 'Criando conta...' : 'Criar conta'}
            </button>
          </form>
        </div>
      </div>
    </main>
  )
}
