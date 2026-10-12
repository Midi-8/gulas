import { useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';

interface UseOrdersRealtimeOptions {
  restaurantId: string;
  onOrdersChange: () => void | Promise<void>;
  onNewOrder?: (orderId: string) => void;
  debounceMs?: number;
}

export function useOrdersRealtime({
  restaurantId,
  onOrdersChange,
  onNewOrder,
  debounceMs = 300,
}: UseOrdersRealtimeOptions) {
  const [isConnected, setIsConnected] = useState(false);
  const callbackRef = useRef(onOrdersChange);
  const onNewOrderRef = useRef(onNewOrder);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    callbackRef.current = onOrdersChange;
  }, [onOrdersChange]);

  useEffect(() => {
    onNewOrderRef.current = onNewOrder;
  }, [onNewOrder]);

  useEffect(() => {
    if (!restaurantId) {
      setIsConnected(false);
      return;
    }

    const supabase = createClient();

    if (!supabase) {
      setIsConnected(false);
      return;
    }

    let isMounted = true;
    let channel: RealtimeChannel | null = null;

    const triggerDebouncedUpdate = (eventName: string) => {
      if (process.env.NODE_ENV !== 'production') {
        console.log(
          `[Realtime KDS] Evento ${eventName} recebido para restaurant_id=${restaurantId}.`
        );
      }

      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      debounceTimerRef.current = setTimeout(() => {
        void callbackRef.current();
      }, debounceMs);
    };

    const setupSubscription = async () => {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session) {
        if (isMounted) {
          setIsConnected(false);
        }
        return;
      }

      if (session.access_token) {
        await supabase.realtime.setAuth(session.access_token);
      }

      if (!isMounted) {
        return;
      }

      const channelName = `kds-orders-${restaurantId}`;

      channel = supabase
        .channel(channelName)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'orders',
            filter: `restaurant_id=eq.${restaurantId}`,
          },
          (payload) => {
            if (onNewOrderRef.current && payload.new && typeof payload.new === 'object') {
              const record = payload.new as Record<string, unknown>;
              const orderId = typeof record.id === 'string' ? record.id : null;

              if (orderId) {
                onNewOrderRef.current(orderId);
              }
            }

            triggerDebouncedUpdate('INSERT');
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'orders',
            filter: `restaurant_id=eq.${restaurantId}`,
          },
          () => {
            triggerDebouncedUpdate('UPDATE');
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'DELETE',
            schema: 'public',
            table: 'orders',
            filter: `restaurant_id=eq.${restaurantId}`,
          },
          () => {
            triggerDebouncedUpdate('DELETE');
          }
        )
        .subscribe((status) => {
          if (!isMounted) {
            return;
          }

          if (status === 'SUBSCRIBED') {
            setIsConnected(true);
            return;
          }

          if (
            status === 'CLOSED' ||
            status === 'CHANNEL_ERROR' ||
            status === 'TIMED_OUT'
          ) {
            setIsConnected(false);
          }
        });
    };

    void setupSubscription();

    const {
      data: { subscription: authListener },
    } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      if (newSession?.access_token) {
        await supabase.realtime.setAuth(newSession.access_token);
        return;
      }

      if (event === 'SIGNED_OUT') {
        if (channel) {
          void supabase.removeChannel(channel);
          channel = null;
        }

        if (isMounted) {
          setIsConnected(false);
        }
      }
    });

    return () => {
      isMounted = false;

      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      authListener.unsubscribe();

      if (channel) {
        void supabase.removeChannel(channel);
      }
    };
  }, [restaurantId, debounceMs]);

  return { isConnected };
}