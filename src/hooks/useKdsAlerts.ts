'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export type AlertsState = 'idle' | 'active';

export interface UseKdsAlertsReturn {
  alertsState: AlertsState;
  activateAlerts: () => void;
  deactivateAlerts: () => void;
  triggerNewOrderAlert: () => void;
}

/**
 * Hook para alertas de pedido novo no KDS.
 *
 * - Som curto sintetizado via Web Audio API (nativo, sem ficheiros de áudio externos).
 * - Vibração via navigator.vibrate quando suportado.
 * - Áudio desbloqueado apenas após gesto explícito do utilizador ("Ativar alertas").
 * - Falhas de áudio/vibração são silenciosas e não quebram o KDS.
 * - Limpa todos os recursos no unmount.
 */
export function useKdsAlerts(): UseKdsAlertsReturn {
  const [alertsState, setAlertsState] = useState<AlertsState>('idle');
  const audioCtxRef = useRef<AudioContext | null>(null);
  const isActiveRef = useRef(false);

  // Keep isActiveRef in sync with state to use in callbacks without stale closure
  useEffect(() => {
    isActiveRef.current = alertsState === 'active';
  }, [alertsState]);

  // Clean up AudioContext on unmount
  useEffect(() => {
    return () => {
      if (audioCtxRef.current) {
        audioCtxRef.current.close().catch(() => {});
        audioCtxRef.current = null;
      }
    };
  }, []);

  /**
   * Creates or resumes an AudioContext (must be called from a user gesture).
   */
  const getOrCreateAudioContext = useCallback((): AudioContext | null => {
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new AudioContext();
      }
      if (audioCtxRef.current.state === 'suspended') {
        audioCtxRef.current.resume().catch(() => {});
      }
      return audioCtxRef.current;
    } catch {
      return null;
    }
  }, []);

  /**
   * Plays a short, pleasant two-tone notification chime.
   * Frequencies and timing are chosen to be discrete and non-aggressive.
   */
  const playChime = useCallback((ctx: AudioContext) => {
    try {
      const now = ctx.currentTime;

      const tones: Array<{ freq: number; start: number; duration: number }> = [
        { freq: 880, start: 0, duration: 0.12 },
        { freq: 1100, start: 0.13, duration: 0.18 },
      ];

      tones.forEach(({ freq, start, duration }) => {
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();

        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(freq, now + start);

        // Smooth envelope: quick attack, smooth decay
        gainNode.gain.setValueAtTime(0, now + start);
        gainNode.gain.linearRampToValueAtTime(0.28, now + start + 0.03);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + start + duration);

        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);

        oscillator.start(now + start);
        oscillator.stop(now + start + duration);
      });
    } catch {
      // Audio failure is non-fatal
    }
  }, []);

  /**
   * Called from the "Ativar alertas" button click — unlocks audio context.
   */
  const activateAlerts = useCallback(() => {
    getOrCreateAudioContext();
    setAlertsState('active');
  }, [getOrCreateAudioContext]);

  const deactivateAlerts = useCallback(() => {
    setAlertsState('idle');
  }, []);

  /**
   * Emits sound + vibration for a new order event.
   * Safe to call even if alerts are idle — it is a no-op in that case.
   */
  const triggerNewOrderAlert = useCallback(() => {
    if (!isActiveRef.current) return;

    // Sound via Web Audio API
    const ctx = audioCtxRef.current;
    if (ctx) {
      if (ctx.state === 'suspended') {
        ctx.resume().then(() => playChime(ctx)).catch(() => {});
      } else {
        playChime(ctx);
      }
    }

    // Vibration (only when supported)
    try {
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate([150, 80, 150]);
      }
    } catch {
      // Vibration failure is non-fatal
    }
  }, [playChime]);

  return {
    alertsState,
    activateAlerts,
    deactivateAlerts,
    triggerNewOrderAlert,
  };
}
