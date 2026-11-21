'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { AlertCircle, RotateCcw, Utensils } from 'lucide-react';

export default function GlobalErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[Gulas App Error]:', error);
  }, [error]);

  return (
    <main className="flex-1 min-h-[70vh] bg-[#FAFAFA] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl border border-zinc-200/80 p-8 text-center space-y-5 shadow-xs">
        <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-200/80 text-rose-600 flex items-center justify-center mx-auto">
          <AlertCircle className="w-5 h-5" />
        </div>

        <div className="space-y-2">
          <h1 className="text-xl font-bold text-zinc-900 tracking-tight">
            Ocorreu uma falha temporária
          </h1>
          <p className="text-xs sm:text-sm text-zinc-500 leading-relaxed">
            Não foi possível carregar esta vista neste momento. Tenta recarregar ou regressa ao menu digital.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
          <button
            type="button"
            onClick={() => reset()}
            className="flex-1 py-2.5 px-4 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Tentar Novamente</span>
          </button>
          <Link
            href="/menu/gulas"
            className="py-2.5 px-4 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-800 text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
          >
            <Utensils className="w-3.5 h-3.5" />
            <span>Abrir Menu Digital</span>
          </Link>
        </div>
      </div>
    </main>
  );
}
