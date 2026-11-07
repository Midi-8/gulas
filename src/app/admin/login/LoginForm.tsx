'use client';

import React, { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { loginStaff } from '@/actions/auth';
import { Lock, Mail, AlertCircle, Loader2, ChefHat } from 'lucide-react';

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!email || !password) {
      setErrorMessage('Por favor preencha todos os campos.');
      return;
    }

    startTransition(async () => {
      try {
        const result = await loginStaff({ email, password });
        if (!result.success) {
          setErrorMessage(result.error || 'Erro ao iniciar sessão.');
        } else {
          router.push('/admin/orders');
          router.refresh();
        }
      } catch {
        setErrorMessage('Ocorreu um erro inesperado. Tente novamente.');
      }
    });
  };

  return (
    <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-zinc-200/80 p-8 sm:p-10">
      {/* Header */}
      <div className="flex flex-col items-center text-center mb-8">
        <div className="w-12 h-12 bg-zinc-900 rounded-xl flex items-center justify-center text-white mb-4">
          <ChefHat className="w-6 h-6" />
        </div>
        <h1 className="text-xl font-bold text-zinc-900 tracking-tight">
          Gulas Backoffice
        </h1>
        <p className="text-xs text-zinc-500 mt-1">
          Acesso reservado a funcionários e gerência
        </p>
      </div>

      {/* Error alert */}
      {errorMessage && (
        <div className="mb-6 p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-rose-700 text-xs">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-rose-600" />
          <p className="font-medium leading-relaxed">{errorMessage}</p>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="email"
            className="block text-[11px] font-semibold uppercase tracking-wider text-zinc-500 mb-1.5"
          >
            Email de Acesso
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-400">
              <Mail className="w-4 h-4" />
            </div>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              disabled={isPending}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="funcionario@gulas.pt"
              className="w-full pl-10 pr-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-900 text-sm focus:outline-none focus:bg-white focus:border-zinc-900 transition-all disabled:opacity-50"
            />
          </div>
        </div>

        <div>
          <label
            htmlFor="password"
            className="block text-[11px] font-semibold uppercase tracking-wider text-zinc-500 mb-1.5"
          >
            Palavra-passe
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-400">
              <Lock className="w-4 h-4" />
            </div>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              disabled={isPending}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full pl-10 pr-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-900 text-sm focus:outline-none focus:bg-white focus:border-zinc-900 transition-all disabled:opacity-50"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="w-full mt-2 py-3 px-4 bg-zinc-900 hover:bg-zinc-800 active:scale-[0.99] text-white font-semibold text-sm rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isPending ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>A verificar credenciais...</span>
            </>
          ) : (
            <span>Entrar no Painel</span>
          )}
        </button>
      </form>
    </div>
  );
}
