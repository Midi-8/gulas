'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export type WakeLockStatus =
  | 'idle'
  | 'unsupported'
  | 'active'
  | 'released'
  | 'error';

export interface UseScreenWakeLockReturn {
  isSupported: boolean;
  isActive: boolean;
  status: WakeLockStatus;
  errorMessage: string | null;
  requestWakeLock: () => Promise<boolean>;
  releaseWakeLock: () => Promise<void>;
}

export function useScreenWakeLock(
  autoRequest: boolean = true
): UseScreenWakeLockReturn {
  // 1. Estado inicial neutro e idêntico entre SSR (servidor) e primeiro render do cliente
  // Garante que não ocorrem divergências de hidratação (hydration mismatch)
  const [isSupported, setIsSupported] = useState<boolean>(false);
  const [isActive, setIsActive] = useState<boolean>(false);
  const [status, setStatus] = useState<WakeLockStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // 2. Referências de controlo de ciclo de vida e concorrência
  const sentinelRef = useRef<WakeLockSentinel | null>(null);
  const generationRef = useRef<number>(0);
  const enabledByUserRef = useRef<boolean>(autoRequest);
  const isMountedRef = useRef<boolean>(true);

  // 3. Libertar lock de ecrã existente de forma segura
  const releaseWakeLock = useCallback(async () => {
    // Ao desativar, qualquer pedido pendente anterior tem de ser invalidado
    const currentGen = ++generationRef.current;
    enabledByUserRef.current = false;

    const sentinel = sentinelRef.current;
    sentinelRef.current = null;

    if (sentinel && !sentinel.released) {
      try {
        await sentinel.release();
      } catch {
        // Ignorar erros caso o sentinel já tenha sido libertado pelo SO
      }
    }

    if (isMountedRef.current && generationRef.current === currentGen) {
      setIsActive(false);
      setStatus('released');
    }
  }, []);

  // 4. Solicitação assíncrona protegida contra stale promises e mudanças de ciclo
  const requestWakeLock = useCallback(async (): Promise<boolean> => {
    if (typeof window === 'undefined' || !('wakeLock' in navigator)) {
      if (isMountedRef.current) {
        setIsSupported(false);
        setStatus('unsupported');
      }
      return false;
    }

    // Se já tivermos um sentinel ativo e válido, manter
    if (sentinelRef.current && !sentinelRef.current.released) {
      if (isMountedRef.current) {
        setIsActive(true);
        setStatus('active');
      }
      return true;
    }

    // Só solicita se o documento estiver visível em primeiro plano
    if (document.visibilityState !== 'visible') {
      return false;
    }

    // Identificador de geração para esta tentativa
    const requestGen = ++generationRef.current;
    enabledByUserRef.current = true;

    try {
      const sentinel = await navigator.wakeLock.request('screen');

      // VALIDAÇÃO DE OBSOLESCÊNCIA:
      // Se o componente desmontou, o utilizador desativou manualmente,
      // ou um novo ciclo começou enquanto o browser processava o pedido:
      if (
        !isMountedRef.current ||
        !enabledByUserRef.current ||
        generationRef.current !== requestGen
      ) {
        // Liberta imediatamente o sentinel recém-obtido para não gerar locks órfãos
        await sentinel.release().catch(() => {});
        return false;
      }

      // Se existia um sentinel anterior diferente deste, libertar
      if (sentinelRef.current && sentinelRef.current !== sentinel) {
        await sentinelRef.current.release().catch(() => {});
      }

      sentinelRef.current = sentinel;

      // Anexar listener 'release' estritamente associado a este sentinel
      const handleRelease = () => {
        // Um sentinel antigo NÃO deve alterar o estado de um lock mais novo
        if (sentinelRef.current === sentinel) {
          sentinelRef.current = null;
          if (isMountedRef.current && generationRef.current === requestGen) {
            setIsActive(false);
            setStatus('released');
          }
        }
      };

      sentinel.addEventListener('release', handleRelease, { once: true });

      setIsActive(true);
      setStatus('active');
      setErrorMessage(null);
      return true;
    } catch (err: unknown) {
      if (!isMountedRef.current || generationRef.current !== requestGen) {
        return false;
      }

      const message =
        err instanceof Error ? err.message : 'Falha ao ativar Screen Wake Lock';
      setErrorMessage(message);
      setStatus('error');
      setIsActive(false);
      return false;
    }
  }, []);

  // 5. Inicialização pós-montagem e monitorização de visibilidade
  useEffect(() => {
    isMountedRef.current = true;

    // Detetar suporte após montagem evitando setState síncrono no primeiro render
    const hasSupport = typeof window !== 'undefined' && 'wakeLock' in navigator;

    let initTimer: ReturnType<typeof setTimeout> | null = null;

    initTimer = setTimeout(() => {
      if (!isMountedRef.current) return;
      setIsSupported(hasSupport);

      if (!hasSupport) {
        setStatus('unsupported');
        return;
      }

      if (autoRequest && enabledByUserRef.current) {
        void requestWakeLock();
      }
    }, 0);

    // Recuperação automática ao regressar à página/aba visível
    const handleVisibilityChange = () => {
      if (!isMountedRef.current) return;

      if (
        document.visibilityState === 'visible' &&
        enabledByUserRef.current &&
        (!sentinelRef.current || sentinelRef.current.released)
      ) {
        void requestWakeLock();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      isMountedRef.current = false;
      if (initTimer) {
        clearTimeout(initTimer);
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);

      const activeSentinel = sentinelRef.current;
      sentinelRef.current = null;
      if (activeSentinel && !activeSentinel.released) {
        void activeSentinel.release().catch(() => {});
      }
    };
  }, [autoRequest, requestWakeLock]);

  return {
    isSupported,
    isActive,
    status,
    errorMessage,
    requestWakeLock,
    releaseWakeLock,
  };
}

