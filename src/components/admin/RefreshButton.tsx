'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';

export function RefreshButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleRefresh = () => {
    window.dispatchEvent(new CustomEvent('gulas:admin-refresh'));
    startTransition(() => {
      router.refresh();
    });
  };

  return (
    <button
      type="button"
      onClick={handleRefresh}
      disabled={isPending}
      className="px-5 py-2.5 text-xs font-semibold tracking-wide bg-white hover:bg-zinc-900 text-zinc-800 hover:text-white border border-zinc-200/90 hover:border-zinc-900 shadow-2xs transition-all active:scale-[0.98] disabled:opacity-50 rounded-xl cursor-pointer"
    >
      {isPending ? 'A atualizar...' : 'Atualizar'}
    </button>
  );
}
