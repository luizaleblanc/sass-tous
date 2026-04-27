import Link from "next/link";

export function Navbar() {
  return (
    <header className="fixed top-0 z-50 w-full bg-transparent">
      <div className="flex h-16 items-center justify-end gap-3 px-8">
        <Link
          href="/cadastro"
          className="inline-flex h-10 items-center justify-center rounded-full bg-[#1a2e8a] px-6 text-sm font-bold uppercase tracking-widest text-white transition-colors hover:bg-[#1225a0]"
        >
          Cadastro
        </Link>
        <Link
          href="/entrar"
          className="inline-flex h-10 items-center justify-center rounded-full border-2 border-[#1a2e8a] px-6 text-sm font-bold uppercase tracking-widest text-[#1a2e8a] transition-colors hover:bg-[#1a2e8a] hover:text-white"
        >
          Entrar
        </Link>
      </div>
    </header>
  );
}
