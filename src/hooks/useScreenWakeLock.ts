'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export type WakeLockStatus = 'unsupported' | 'active' | 'released' | 'error';

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
  const [isSupported] = useState<boolean>(() => {
    return typeof window !== 'undefined' && 'wakeLock' in navigator;
  });

  const [isActive, setIsActive] = useState<boolean>(false);

  const [status, setStatus] = useState<WakeLockStatus>(() => {
    const supported = typeof window !== 'undefined' && 'wakeLock' in navigator;
    return supported ? 'released' : 'unsupported';
  });

  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const sentinelRef = useRef<WakeLockSentinel | null>(null);
  const isAcquiringRef = useRef<boolean>(false);
  const isMountedRef = useRef<boolean>(true);
  const enabledByUserRef = useRef<boolean>(autoRequest);

  const releaseInternal = useCallback(async () => {
    const sentinel = sentinelRef.current;
    sentinelRef.current = null;

    if (sentinel && !sentinel.released) {
      try {
        await sentinel.release();
      } catch {
        // Ignora erros ao libertar sentinel j\u00e1 libertado
      }
    }

    if (isMountedRef.current) {
      setIsActive(false);
      setStatus('released');
    }
  }, []);

  const requestWakeLock = useCallback(async (): Promise<boolean> => {
    if (typeof window === 'undefined' || !('wakeLock' in navigator)) {
      return false;
    }

    if (sentinelRef.current && !sentinelRef.current.released) {
      if (isMountedRef.current) {
        setIsActive(true);
        setStatus('active');
      }
      return true;
    }

    if (isAcquiringRef.current) {
      return false;
    }

    if (document.visibilityState !== 'visible') {
      return false;
    }

    isAcquiringRef.current = true;

    try {
      const sentinel = await navigator.wakeLock.request('screen');

      if (!isMountedRef.current) {
        await sentinel.release().catch(() => {});
        return false;
      }

      sentinelRef.current = sentinel;

      const handleRelease = () => {
        if (sentinelRef.current === sentinel) {
          sentinelRef.current = null;
        }
        if (isMountedRef.current) {
          setIsActive(false);
          setStatus('released');
        }
      };

      sentinel.addEventListener('release', handleRelease, { once: true });

      setIsActive(true);
      setStatus('active');
      setErrorMessage(null);
      enabledByUserRef.current = true;
      return true;
    } catch (err: unknown) {
      if (!isMountedRef.current) return false;

      const message =
        err instanceof Error ? err.message : 'Falha ao ativar Screen Wake Lock';
      setErrorMessage(message);
      setStatus('error');
      setIsActive(false);
      return false;
    } finally {
      isAcquiringRef.current = false;
    }
  }, []);

  const releaseWakeLock = useCallback(async () => {
    enabledByUserRef.current = false;
    await releaseInternal();
  }, [releaseInternal]);

  useEffect(() => {
    isMountedRef.current = true;

    if (!isSupported) {
      return;
    }

    let initialTimer: ReturnType<typeof setTimeout> | null = null;
    if (autoRequest) {
      enabledByUserRef.current = true;
      initialTimer = setTimeout(() => {
        void requestWakeLock();
      }, 0);
    }

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
      if (initialTimer) {
        clearTimeout(initialTimer);
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      void releaseInternal();
    };
  }, [autoRequest, isSupported, requestWakeLock, releaseInternal]);

  return {
    isSupported,
    isActive,
    status,
    errorMessage,
    requestWakeLock,
    releaseWakeLock,
  };
}
