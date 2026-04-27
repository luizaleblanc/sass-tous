'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { auth } from '@/lib/api'

export default function EntrarPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { access_token } = await auth.login(email, password)
      localStorage.setItem('token', access_token)
      router.push('/dashboard')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro inesperado ao entrar. Tente novamente.')
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
            alt="Quak mascote com café"
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
            Não tem conta?{' '}
            <Link href="/cadastro" className="text-[#1a2e8a] underline underline-offset-2 hover:opacity-70">
              Criar agora
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
              <div className="relative flex items-center border-b-2 border-[#1a2e8a]/30 transition-colors focus-within:border-[#1a2e8a]">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
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
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </form>
        </div>
      </div>
    </main>
  )
}
