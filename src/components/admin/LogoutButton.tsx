'use client';

import { useTransition } from 'react';
import { logoutStaff } from '@/actions/auth';

export function LogoutButton() {
  const [isPending, startTransition] = useTransition();

  const handleLogout = () => {
    startTransition(async () => {
      await logoutStaff();
    });
  };

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={isPending}
      className="px-5 py-2.5 text-xs font-semibold tracking-wide bg-white hover:bg-zinc-900 text-zinc-800 hover:text-white border border-zinc-200/90 hover:border-zinc-900 shadow-2xs transition-all active:scale-[0.98] disabled:opacity-50 rounded-xl cursor-pointer"
    >
      {isPending ? 'A terminar...' : 'Terminar Sessão'}
    </button>
  );
}
