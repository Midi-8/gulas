import React from 'react';
import Link from 'next/link';
import { UtensilsCrossed, ArrowLeft } from 'lucide-react';

export default function NotFoundPage() {
  return (
    <main className="flex-1 min-h-[70vh] bg-[#FAFAFA] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl border border-zinc-200/80 p-8 text-center space-y-5 shadow-xs">
        <div className="w-12 h-12 rounded-2xl bg-zinc-100 border border-zinc-200/70 text-zinc-700 flex items-center justify-center mx-auto">
          <UtensilsCrossed className="w-5 h-5" />
        </div>

        <div className="space-y-2">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 block">
            Erro 404
          </span>
          <h1 className="text-xl font-bold text-zinc-900 tracking-tight">
            Página ou Mesa não encontrada
          </h1>
          <p className="text-xs sm:text-sm text-zinc-500 leading-relaxed">
            O código QR ou endereço que procuraste não existe ou a mesa encontra-se temporariamente desativada.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
          <Link
            href="/menu/gulas"
            className="flex-1 py-2.5 px-4 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
          >
            <span>Abrir Menu Digital Gulas</span>
          </Link>
          <Link
            href="/"
            className="py-2.5 px-4 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-800 text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Início</span>
          </Link>
        </div>
      </div>
    </main>
  );
}
