'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

function getEmailFromToken(): string | null {
  try {
    const token = localStorage.getItem('token')
    if (!token) return null
    const payload = JSON.parse(atob(token.split('.')[1]))
    if (payload.exp && payload.exp < Date.now() / 1000) {
      localStorage.removeItem('token')
      return null
    }
    return payload.sub as string
  } catch {
    return null
  }
}

export function Navbar() {
  const pathname = usePathname()
  const router = useRouter()
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    setUserEmail(getEmailFromToken())
  }, [pathname])

  if (pathname.startsWith('/dashboard')) return null

  const username = userEmail ? userEmail.split('@')[0] : null

  function logout() {
    localStorage.removeItem('token')
    setUserEmail(null)
    router.push('/')
  }

  return (
    <header className="fixed top-0 z-50 w-full bg-transparent">
      <div className="flex h-16 items-center justify-end gap-3 px-8">
        {!mounted ? null : username ? (
          <>
            <span className="text-sm font-medium text-[#1a2e8a]">
              Bem-vindo,{' '}
              <span className="font-bold">{username}</span>
            </span>
            <Link
              href="/dashboard"
              className="inline-flex h-10 items-center justify-center rounded-full bg-[#1a2e8a] px-6 text-sm font-bold uppercase tracking-widest text-white transition-colors hover:opacity-80"
            >
              Dashboard
            </Link>
            <button
              onClick={logout}
              className="inline-flex h-10 items-center justify-center rounded-full border-2 border-[#1a2e8a] px-6 text-sm font-bold uppercase tracking-widest text-[#1a2e8a] transition-colors hover:bg-[#1a2e8a] hover:text-white"
            >
              Sair
            </button>
          </>
        ) : (
          <>
            <Link
              href="/cadastro"
              className="inline-flex h-10 items-center justify-center rounded-full bg-[#1a2e8a] px-6 text-sm font-bold uppercase tracking-widest text-white transition-colors hover:opacity-80"
            >
              Cadastro
            </Link>
            <Link
              href="/entrar"
              className="inline-flex h-10 items-center justify-center rounded-full border-2 border-[#1a2e8a] px-6 text-sm font-bold uppercase tracking-widest text-[#1a2e8a] transition-colors hover:bg-[#1a2e8a] hover:text-white"
            >
              Entrar
            </Link>
          </>
        )}
      </div>
    </header>
  )
}
