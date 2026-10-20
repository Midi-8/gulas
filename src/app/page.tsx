import React from 'react';
import Link from 'next/link';
import {
  QrCode,
  Utensils,
  ChevronRight,
  ArrowRight,
} from 'lucide-react';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[#F5F4F1] text-[#35271F] flex flex-col selection:bg-[#5E4939] selection:text-[#F5F4F1]">
      {/* Navigation */}
      <header className="border-b border-[#E5DED6] bg-[#F5F4F1]/90 backdrop-blur-sm sticky top-0 z-30">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-baseline gap-2">
            <span className="font-black text-xl tracking-tight text-[#35271F] uppercase leading-none">
              GULAS
            </span>
            <span className="text-xs font-bold text-[#C09573] hidden sm:inline-block">
              Pizza · Burger · Coffee
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/menu/gulas"
              className="px-3.5 py-1.5 rounded-lg bg-[#5E4939] hover:bg-[#453426] text-[#F5F4F1] text-xs font-bold transition-all active:scale-95 flex items-center gap-1 cursor-pointer shadow-xs"
            >
              <span>Abrir Menu</span>
              <ChevronRight className="w-3.5 h-3.5 stroke-[2.5]" />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 max-w-4xl mx-auto px-4 py-10 sm:py-16 flex flex-col items-center text-center">
        {/* Release Pill */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EAE5DF] border border-[#E5DED6] text-[#5E4939] text-xs font-bold mb-6">
          <span>Vila das Aves, Portugal</span>
        </div>

        {/* Hero Title */}
        <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-[#35271F] max-w-2xl leading-[1.12]">
          Menu digital oficial do <span className="text-[#C09573]">Gulas</span>
        </h1>

        <p className="mt-3 text-xs sm:text-sm text-[#4C453F] max-w-md font-normal leading-relaxed">
          Gulas – Pizza, Burger & Coffee.
        </p>

        {/* Demo Action Cards */}
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-lg text-left">
          {/* Menu Normal */}
          <Link
            href="/menu/gulas"
            className="group p-4 rounded-2xl bg-[#FFFFFF] border border-[#E5DED6] hover:border-[#C09573]/60 transition-all duration-200 shadow-xs flex flex-col justify-between"
          >
            <div>
              <div className="w-9 h-9 rounded-xl bg-[#EAE5DF] text-[#5E4939] flex items-center justify-center mb-2.5 border border-[#E5DED6]">
                <Utensils className="w-4 h-4 text-[#C09573]" />
              </div>
              <h2 className="text-sm font-bold text-[#35271F] group-hover:text-[#5E4939] transition-colors">
                Menu Geral
              </h2>
              <p className="text-xs text-[#4C453F] mt-0.5">
                Consulta o menu e escolhe a tua mesa livremente.
              </p>
            </div>
            <div className="mt-3 pt-2.5 border-t border-[#E5DED6] flex items-center justify-between text-xs font-bold text-[#5E4939]">
              <span>Ver Menu</span>
              <ArrowRight className="w-3.5 h-3.5 transform group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          {/* QR Code Table Direct Access */}
          <Link
            href="/menu/gulas/table/4"
            className="group p-4 rounded-2xl bg-[#FFFFFF] border border-[#E5DED6] hover:border-[#C09573]/60 transition-all duration-200 shadow-xs flex flex-col justify-between"
          >
            <div>
              <div className="w-9 h-9 rounded-xl bg-[#5E4939] text-[#F5F4F1] flex items-center justify-center mb-2.5">
                <QrCode className="w-4 h-4 text-[#C09573]" />
              </div>
              <h2 className="text-sm font-bold text-[#35271F] group-hover:text-[#5E4939] transition-colors">
                Simular QR Code — Mesa 4
              </h2>
              <p className="text-xs text-[#4C453F] mt-0.5">
                Experiência de cliente com mesa bloqueada por leitura de QR.
              </p>
            </div>
            <div className="mt-3 pt-2.5 border-t border-[#E5DED6] flex items-center justify-between text-xs font-bold text-[#5E4939]">
              <span>Testar Mesa 4</span>
              <ArrowRight className="w-3.5 h-3.5 transform group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#E5DED6] py-4 text-center text-xs text-[#78716C] bg-[#FFFFFF]">
        <p>GULAS — Pizza, Burger & Coffee · Vila das Aves, Portugal</p>
      </footer>
    </div>
  );
}
