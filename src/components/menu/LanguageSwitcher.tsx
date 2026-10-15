'use client';

import React, { useTransition } from 'react';
import { useRouter, usePathname } from '@/i18n/routing';
import { useLocale } from 'next-intl';
import { Globe } from 'lucide-react';
import { clsx } from 'clsx';

export default function LanguageSwitcher() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const pathname = usePathname();
  const locale = useLocale();

  const handleLanguageChange = (nextLocale: 'pt' | 'en') => {
    if (nextLocale === locale) return;
    startTransition(() => {
      // Passa a mesma rota atual, mas instrui o next-intl a trocar o locale
      router.replace(pathname || '/', { locale: nextLocale });
    });
  };

  return (
    <div
      role="group"
      aria-label="Seleção de idioma / Language selection"
      className={clsx(
        'inline-flex items-center rounded-xl bg-[#FFFFFF] border border-[#E5DED6] p-0.5 shadow-xs transition-opacity select-none',
        isPending && 'opacity-60'
      )}
    >
      <div className="pl-2 pr-1 text-[#C09573] flex items-center justify-center" aria-hidden="true">
        <Globe className="w-3.5 h-3.5 text-[#C09573]" />
      </div>
      <button
        type="button"
        disabled={isPending}
        onClick={() => handleLanguageChange('pt')}
        aria-pressed={locale === 'pt'}
        aria-label="Português"
        className={clsx(
          'px-2 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer',
          locale === 'pt'
            ? 'bg-[#5E4939] text-[#F5F4F1] shadow-2xs'
            : 'text-[#35271F] hover:text-[#C09573] hover:bg-[#EAE5DF]/60'
        )}
      >
        PT
      </button>
      <button
        type="button"
        disabled={isPending}
        onClick={() => handleLanguageChange('en')}
        aria-pressed={locale === 'en'}
        aria-label="English"
        className={clsx(
          'px-2 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer',
          locale === 'en'
            ? 'bg-[#5E4939] text-[#F5F4F1] shadow-2xs'
            : 'text-[#35271F] hover:text-[#C09573] hover:bg-[#EAE5DF]/60'
        )}
      >
        EN
      </button>
    </div>
  );
}

export { LanguageSwitcher };
