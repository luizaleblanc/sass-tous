import Image from "next/image";
import Link from "next/link";

export default function HomePage() {
  return (
    <main className="bg-[#e8e8e8]">

      <section className="relative min-h-screen overflow-hidden">
        <div className="relative z-10 flex min-h-screen flex-col items-center justify-center gap-12 pt-16 pr-[44vw] pl-8">
          <h1 className="text-center font-display-condensed text-[#1a2e8a] text-[7.5rem] leading-none">
            <span
              className="block animate-hero-line"
              style={{ animationDelay: "0ms" }}
            >
              NUNCA FOI
            </span>
            <span
              className="block italic animate-hero-line"
              style={{ animationDelay: "130ms" }}
            >
              TÃO FÁCIL
            </span>
            <span
              className="block animate-hero-line"
              style={{ animationDelay: "260ms" }}
            >
              ACHAR O
            </span>
            <span
              className="block animate-hero-line"
              style={{ animationDelay: "390ms" }}
            >
              EMPREGO IDEAL
            </span>
          </h1>

          <Link
            href="/cadastro"
            className="animate-hero-line rounded-full border-2 border-[#1a2e8a] px-10 py-3 text-sm font-bold uppercase tracking-widest text-[#1a2e8a] transition-colors hover:bg-[#1a2e8a] hover:text-white"
            style={{ animationDelay: "560ms" }}
          >
            Meu Emprego Ideal
          </Link>
        </div>

        <div className="absolute bottom-0 right-0 z-20 h-[88vh] w-[42vw]">
          <Image
            src="/images/quak-fone.png"
            alt="Quak mascote com fone"
            fill
            className="object-contain object-right-bottom drop-shadow-2xl"
            priority
          />
        </div>
      </section>

      <section className="relative min-h-screen overflow-hidden">
        <div className="absolute bottom-0 left-0 z-20 h-[88vh] w-[42vw]">
          <Image
            src="/images/quak-cafe.png"
            alt="Quak mascote com café"
            fill
            className="object-contain object-left-bottom drop-shadow-2xl"
          />
        </div>

        <div className="relative z-10 flex min-h-screen flex-col items-end justify-center px-16">
          <div className="max-w-xl">
            <h2 className="font-display-condensed text-[#1a2e8a] text-[6rem] leading-none mb-10">
              O QUAK FAZ POR
              <br />
              VOCÊ.
            </h2>
            <div className="space-y-2 text-[#1a2e8a] text-xl font-medium leading-relaxed">
              <p>
                Cadastre-se e deixe o Quak mapear vagas que combinam exatamente
                com o seu perfil e momento como desenvolvedor.
              </p>
              <p>Nacional ou internacional.</p>
              <p>Presencial, remoto ou híbrido.</p>
              <p>É de dev pra dev.</p>
              <p>O Quak faz por você.</p>
            </div>
          </div>
        </div>
      </section>

    </main>
  );
}
