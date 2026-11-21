'use client';

import { useEffect, useState } from 'react';
import { Maximize, Minimize } from 'lucide-react';

export function FullscreenButton() {
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const syncFullscreen = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };

    syncFullscreen();
    document.addEventListener('fullscreenchange', syncFullscreen);
    return () => {
      document.removeEventListener('fullscreenchange', syncFullscreen);
    };
  }, []);

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch {
      // Ignorar se o browser bloquear ou não suportar fullscreen
    }
  };

  return (
    <button
      type="button"
      onClick={() => void toggleFullscreen()}
      title={isFullscreen ? 'Sair de Ecrã Inteiro' : 'Ecrã Inteiro'}
      aria-label={isFullscreen ? 'Sair de Ecrã Inteiro' : 'Ecrã Inteiro'}
      className={`inline-flex items-center justify-center h-9 w-9 sm:h-10 sm:w-10 border shadow-2xs transition-all active:scale-[0.98] rounded-xl cursor-pointer ${
        isFullscreen
          ? 'bg-zinc-900 border-zinc-900 text-white hover:bg-zinc-800'
          : 'bg-white hover:bg-zinc-900 text-zinc-800 hover:text-white border-zinc-200/90 hover:border-zinc-900'
      }`}
    >
      {isFullscreen ? (
        <Minimize className="h-4 w-4" />
      ) : (
        <Maximize className="h-4 w-4" />
      )}
    </button>
  );
}
