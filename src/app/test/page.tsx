'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useCart } from '@/context/CartContext';
import { createClient } from '@/lib/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';
import {
  getTestBenchContext,
  dispatchSimulatedOrder,
  fetchActiveOrdersForBench,
  advanceOrderForBench,
  completeOrderForBench,
  reopenOrderForBench,
  TestBenchProduct,
} from '@/actions/test-bench';
import {
  Activity,
  ArrowRight,
  Copy,
  ExternalLink,
  Flame,
  LayoutGrid,
  Loader2,
  QrCode,
  Radio,
  RefreshCw,
  Send,
  ShieldAlert,
  ShieldCheck,
  Terminal,
  Trash2,
  Undo2,
  UtensilsCrossed,
  Wifi,
  WifiOff,
  Zap,
} from 'lucide-react';

interface LogEntry {
  id: string;
  timestamp: string;
  type: 'info' | 'success' | 'warn' | 'error' | 'realtime';
  message: string;
}

type RealtimeConnectionStatus = 'connected' | 'connecting' | 'disconnected';

export default function TestBenchPage() {
  const { selectedTableNumber, setSelectedTableNumber } = useCart();

  // Test bench state
  const [restaurantSlug, setRestaurantSlug] = useState('gulas');
  const [restaurantId, setRestaurantId] = useState(
    'e1a1a1a1-1111-4111-a111-111111111111'
  );
  const [isStaffAuthenticated, setIsStaffAuthenticated] = useState(false);
  const [staffEmail, setStaffEmail] = useState<string | undefined>(undefined);
  const [products, setProducts] = useState<TestBenchProduct[]>([]);

  // Operation loading flags
  const [activeAction, setActiveAction] = useState<string | null>(null);

  // Realtime & Heartbeat state
  const [realtimeStatus, setRealtimeStatus] =
    useState<RealtimeConnectionStatus>('connecting');
  const [heartbeatSeconds, setHeartbeatSeconds] = useState(0);
  const [eventCount, setEventCount] = useState(0);
  const [lastEventAt, setLastEventAt] = useState<string | null>(null);

  // Last completed order for undo bench test
  const [lastCompletedOrder, setLastCompletedOrder] = useState<{
    id: string;
    orderNumber: number;
    updatedAt: string;
  } | null>(null);

  // Logs state
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const consoleBottomRef = useRef<HTMLDivElement | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);

  const addLog = useCallback(
    (
      type: 'info' | 'success' | 'warn' | 'error' | 'realtime',
      message: string
    ) => {
      const now = new Date();
      const timestamp = now.toLocaleTimeString('pt-PT', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });

      setLogs((prev) => [
        ...prev.slice(-150),
        {
          id: `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          timestamp,
          type,
          message,
        },
      ]);
    },
    []
  );

  // Auto-scroll logs
  useEffect(() => {
    if (consoleBottomRef.current) {
      consoleBottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  // Load context on mount
  useEffect(() => {
    let mounted = true;

    async function initContext() {
      try {
        const ctx = await getTestBenchContext();
        if (!mounted) return;

        setRestaurantSlug(ctx.restaurantSlug);
        setRestaurantId(ctx.restaurantId);
        setIsStaffAuthenticated(ctx.isStaffAuthenticated);
        setStaffEmail(ctx.staffEmail);
        setProducts(ctx.products);

        addLog(
          'info',
          `Bancada de testes inicializada para /${ctx.restaurantSlug}. Staff autenticado: ${
            ctx.isStaffAuthenticated ? `Sim (${ctx.staffEmail})` : 'Não (modo anónimo)'
          }.`
        );
      } catch {
        if (!mounted) return;
        addLog('error', 'Falha ao carregar contexto inicial da bancada de testes.');
      }
    }

    void initContext();

    return () => {
      mounted = false;
    };
  }, [addLog]);

  // Heartbeat ticker
  useEffect(() => {
    const timer = setInterval(() => {
      setHeartbeatSeconds((sec) => sec + 1);
    }, 1000);

    return () => {
      clearInterval(timer);
    };
  }, []);

  // Realtime Supabase Channel Listener
  const connectRealtime = useCallback(() => {
    const supabase = createClient();
    if (!supabase || !restaurantId) {
      return;
    }

    if (channelRef.current) {
      void supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    const channelName = `kds-orders-${restaurantId}`;

    const channel = supabase
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
          const rec = payload.new as Record<string, unknown>;
          const orderNum = rec?.order_number ?? '?';
          const tableNum = rec?.table_number ?? '?';
          const total = rec?.total ?? '?';
          const time = new Date().toLocaleTimeString('pt-PT');

          setEventCount((c) => c + 1);
          setLastEventAt(time);
          addLog(
            'realtime',
            `⚡ WebSocket [INSERT]: Pedido #${orderNum} recebido na Mesa ${tableNum} (€${total}). O KDS deve apitar!`
          );
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
        (payload) => {
          const rec = payload.new as Record<string, unknown>;
          const orderNum = rec?.order_number ?? '?';
          const status = rec?.status ?? '?';
          const time = new Date().toLocaleTimeString('pt-PT');

          setEventCount((c) => c + 1);
          setLastEventAt(time);
          addLog(
            'realtime',
            `🔄 WebSocket [UPDATE]: Pedido #${orderNum} transitou para estado "${status}".`
          );

          if (rec?.id && rec?.status) {
            window.dispatchEvent(
              new CustomEvent('gulas_order_status_update', {
                detail: { orderId: rec.id, status: rec.status },
              })
            );
          }
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
          const time = new Date().toLocaleTimeString('pt-PT');
          setEventCount((c) => c + 1);
          setLastEventAt(time);
          addLog('realtime', '🗑️ WebSocket [DELETE]: Pedido removido.');
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setRealtimeStatus('connected');
          addLog('success', `Canal WebSocket ligado com sucesso (${channelName}).`);
        } else if (
          status === 'CLOSED' ||
          status === 'CHANNEL_ERROR' ||
          status === 'TIMED_OUT'
        ) {
          setRealtimeStatus('disconnected');
          addLog('warn', `Canal WebSocket desconectado ou em erro (${status}).`);
        }
      });

    channelRef.current = channel;
  }, [restaurantId, addLog]);

  useEffect(() => {
    connectRealtime();

    return () => {
      if (channelRef.current) {
        const supabase = createClient();
        if (supabase) {
          void supabase.removeChannel(channelRef.current);
        }
      }
    };
  }, [connectRealtime]);

  // Handlers: Bloco A - Disparo de Pedidos
  const syncSimulatedOrderToClientTracker = (orderData: {
    orderId: string;
    orderNumber: number;
    tableNumber: number;
    tableName?: string;
    subtotal: number;
    total: number;
    status: string;
    createdAt: string;
  }) => {
    try {
      let existingIds: string[] = [];
      try {
        const rawIds = localStorage.getItem('gulas_active_order_ids');
        if (rawIds) {
          const parsed = JSON.parse(rawIds);
          if (Array.isArray(parsed)) existingIds = parsed;
        }
      } catch {
        // ignore
      }
      if (!existingIds.includes(orderData.orderId)) {
        existingIds.push(orderData.orderId);
      }

      localStorage.setItem('gulas_active_order_ids', JSON.stringify(existingIds));
      localStorage.setItem('gulas_active_order_id', orderData.orderId);

      window.dispatchEvent(
        new CustomEvent('gulas_active_order_created', {
          detail: {
            orderId: orderData.orderId,
            order: orderData,
          },
        })
      );
    } catch {
      // ignore
    }
  };

  const handleDispatchNormalOrder = async () => {
    setActiveAction('dispatch-normal');
    addLog('info', 'A submeter Pedido Normal na Mesa 3 (2 artigos comuns)...');

    const foodItem = products[0] || {
      id: 'b1111111-0024-4000-8000-000000000024',
      name: 'Bolo do Caco com Manteiga d’ Alho',
      price: 3,
    };
    const drinkItem = products.find((p) => p.categorySlug === 'bebidas') ||
      products[1] || {
        id: 'b1111111-0121-4000-8000-000000000121',
        name: 'Coca-Cola 35cl',
        price: 2.1,
      };

    try {
      const result = await dispatchSimulatedOrder({
        restaurantSlug,
        tableNumber: 3,
        items: [
          { productId: foodItem.id, quantity: 1, notes: null },
          { productId: drinkItem.id, quantity: 1, notes: null },
        ],
      });

      if (!result.success) {
        addLog('error', `Falha ao criar pedido: ${result.error.message}`);
      } else {
        syncSimulatedOrderToClientTracker(result.data);
        addLog(
          'success',
          `✅ Pedido #${result.data.orderNumber} criado na Mesa 3! Total: €${result.data.total.toFixed(
            2
          )}. Verifique o som, vibração e crachá "NOVO" no tablet.`
        );
      }
    } catch {
      addLog('error', 'Ocorreu um erro inesperado ao submeter pedido normal.');
    } finally {
      setActiveAction(null);
    }
  };

  const handleDispatchSpecialNotesOrder = async () => {
    setActiveAction('dispatch-notes');
    addLog('info', 'A submeter Pedido Especial com Notas e Alérgenos na Mesa 7...');

    const foodItem = products[0] || {
      id: 'b1111111-0024-4000-8000-000000000024',
      name: 'Bolo do Caco com Manteiga d’ Alho',
      price: 3,
    };
    const drinkItem = products.find((p) => p.categorySlug === 'bebidas') ||
      products[1] || {
        id: 'b1111111-0121-4000-8000-000000000121',
        name: 'Coca-Cola 35cl',
        price: 2.1,
      };

    try {
      const result = await dispatchSimulatedOrder({
        restaurantSlug,
        tableNumber: 7,
        customerNotes: 'Sem cebola, carne bem passada, urgente!',
        items: [
          {
            productId: foodItem.id,
            quantity: 2,
            notes: 'Manteiga à parte por favor',
          },
          { productId: drinkItem.id, quantity: 1, notes: 'Com gelo e limão' },
        ],
      });

      if (!result.success) {
        addLog('error', `Falha ao criar pedido especial: ${result.error.message}`);
      } else {
        syncSimulatedOrderToClientTracker(result.data);
        addLog(
          'success',
          `✅ Pedido #${result.data.orderNumber} (Mesa 7) com notas especiais criado! Verifique o painel âmbar de nota de cliente no cartão do KDS.`
        );
      }
    } catch {
      addLog('error', 'Ocorreu um erro inesperado ao submeter pedido especial.');
    } finally {
      setActiveAction(null);
    }
  };

  const handleDispatchBurstOrders = async () => {
    setActiveAction('dispatch-burst');
    addLog('info', '🚀 A disparar rajada concorrente: 3 pedidos quase instantâneos (Mesas 1, 2 e 5)...');

    const itemA = products[0] || {
      id: 'b1111111-0024-4000-8000-000000000024',
      name: 'Bolo do Caco com Manteiga d’ Alho',
      price: 3,
    };
    const itemB = products.find((p) => p.categorySlug === 'bebidas') ||
      products[1] || {
        id: 'b1111111-0121-4000-8000-000000000121',
        name: 'Coca-Cola 35cl',
        price: 2.1,
      };

    try {
      const promises = [
        dispatchSimulatedOrder({
          restaurantSlug,
          tableNumber: 1,
          customerNotes: 'Rajada Teste #1',
          items: [
            { productId: itemA.id, quantity: 2 },
            { productId: itemB.id, quantity: 1 },
          ],
        }),
        dispatchSimulatedOrder({
          restaurantSlug,
          tableNumber: 2,
          customerNotes: 'Rajada Teste #2',
          items: [
            { productId: itemA.id, quantity: 1 },
            { productId: itemB.id, quantity: 2 },
          ],
        }),
        dispatchSimulatedOrder({
          restaurantSlug,
          tableNumber: 5,
          customerNotes: 'Rajada Teste #3',
          items: [{ productId: itemA.id, quantity: 3 }],
        }),
      ];

      const results = await Promise.allSettled(promises);
      let successCount = 0;

      results.forEach((res, idx) => {
        const table = idx === 0 ? 1 : idx === 1 ? 2 : 5;
        if (res.status === 'fulfilled' && res.value.success) {
          successCount++;
          addLog(
            'success',
            `  • Rajada Mesa ${table}: Pedido #${res.value.data.orderNumber} criado!`
          );
        } else {
          const err =
            res.status === 'fulfilled'
              ? (res.value as { error?: { message: string } }).error?.message
              : 'Falha de rede';
          addLog('error', `  • Rajada Mesa ${table}: Erro (${err})`);
        }
      });

      addLog(
        'info',
        `🏁 Rajada concluída: ${successCount}/3 pedidos registados. Observe a vista consolidada de artigos no topo do KDS (batching acumulado).`
      );
    } catch {
      addLog('error', 'Ocorreu um erro ao processar a rajada concorrente.');
    } finally {
      setActiveAction(null);
    }
  };

  // Handlers: Bloco B - Ciclo de Vida & Desfazer
  const handleAdvanceOldestOrder = async () => {
    setActiveAction('advance-order');
    addLog('info', 'A consultar pedidos ativos para avançar o mais antigo...');

    try {
      const activeRes = await fetchActiveOrdersForBench();
      if (!activeRes.success) {
        addLog(
          'warn',
          `Não foi possível carregar pedidos ativos: ${activeRes.error.message}. (Se não tiver sessão de staff, inicie em /admin/login).`
        );
        return;
      }

      if (activeRes.data.length === 0) {
        addLog('warn', 'Nenhum pedido ativo no momento. Dispare um pedido no Bloco A primeiro.');
        return;
      }

      // Oldest order is at the end or pending
      const candidate =
        activeRes.data.find((o) => o.status === 'pending') ||
        activeRes.data.find((o) => o.status === 'accepted') ||
        activeRes.data.find((o) => o.status === 'preparing') ||
        activeRes.data[activeRes.data.length - 1];

      if (!candidate) {
        addLog('warn', 'Nenhum pedido em estado elegível para avanço.');
        return;
      }

      addLog(
        'info',
        `Avançando Pedido #${candidate.orderNumber} (Mesa ${candidate.tableNumber}) atualmente em "${candidate.status}"...`
      );

      const advanceRes = await advanceOrderForBench({
        orderId: candidate.id,
        currentStatus: candidate.status,
        expectedUpdatedAt: candidate.updatedAt,
      });

      if (!advanceRes.success) {
        addLog('error', `Falha ao avançar pedido: ${advanceRes.error.message}`);
      } else {
        window.dispatchEvent(
          new CustomEvent('gulas_order_status_update', {
            detail: {
              orderId: advanceRes.data.id,
              status: advanceRes.data.status,
            },
          })
        );
        addLog(
          'success',
          `✅ Pedido #${advanceRes.data.orderNumber} avançou com sucesso para "${advanceRes.data.status}"!`
        );
      }
    } catch {
      addLog('error', 'Erro inesperado ao avançar pedido.');
    } finally {
      setActiveAction(null);
    }
  };

  const handleCompleteRecentOrder = async () => {
    setActiveAction('complete-order');
    addLog('info', 'A procurar pedido ativo para marcar como "concluído"...');

    try {
      const activeRes = await fetchActiveOrdersForBench();
      if (!activeRes.success) {
        addLog(
          'warn',
          `Não foi possível carregar pedidos: ${activeRes.error.message}. Faça login de staff se necessário.`
        );
        return;
      }

      if (activeRes.data.length === 0) {
        addLog('warn', 'Sem pedidos ativos para concluir. Dispare um pedido no Bloco A primeiro.');
        return;
      }

      // Pick the first order
      const target = activeRes.data[0];

      addLog(
        'info',
        `Concluindo Pedido #${target.orderNumber} (Mesa ${target.tableNumber})...`
      );

      const completeRes = await completeOrderForBench({
        orderId: target.id,
        expectedUpdatedAt: target.updatedAt,
      });

      if (!completeRes.success) {
        addLog('error', `Falha ao concluir pedido: ${completeRes.error.message}`);
      } else {
        window.dispatchEvent(
          new CustomEvent('gulas_order_status_update', {
            detail: {
              orderId: completeRes.data.id,
              status: completeRes.data.status,
            },
          })
        );
        setLastCompletedOrder({
          id: completeRes.data.id,
          orderNumber: completeRes.data.orderNumber,
          updatedAt: completeRes.data.updatedAt,
        });
        addLog(
          'success',
          `🎯 Pedido #${completeRes.data.orderNumber} marcado como CONCLUÍDO! Verifique no KDS se o banner [Desfazer] surge durante 6 segundos no tablet.`
        );
      }
    } catch {
      addLog('error', 'Erro inesperado ao concluir pedido.');
    } finally {
      setActiveAction(null);
    }
  };

  const handleReopenLastOrder = async () => {
    if (!lastCompletedOrder) {
      addLog('warn', 'Nenhum pedido foi concluído recentemente nesta sessão de teste.');
      return;
    }

    setActiveAction('reopen-order');
    addLog(
      'info',
      `A reabrir Pedido #${lastCompletedOrder.orderNumber} através da Server Action reopenCompletedOrder()...`
    );

    try {
      const result = await reopenOrderForBench({
        orderId: lastCompletedOrder.id,
        expectedUpdatedAt: lastCompletedOrder.updatedAt,
      });

      if (!result.success) {
        addLog('error', `Falha ao reabrir pedido: ${result.error.message}`);
      } else {
        addLog(
          'success',
          `↩️ Pedido #${result.data.orderNumber} reaberto com sucesso! O pedido retornou à lista de pedidos ativos em preparação.`
        );
        setLastCompletedOrder(null);
      }
    } catch {
      addLog('error', 'Erro inesperado ao reabrir pedido.');
    } finally {
      setActiveAction(null);
    }
  };

  // Handlers: Bloco C - Resiliência
  const handleForceReconciliation = async () => {
    setActiveAction('force-reconcile');
    addLog(
      'info',
      '🔄 A forçar reconciliação manual (simulação de retorno de foco / visibilitychange)...'
    );

    try {
      const result = await fetchActiveOrdersForBench();
      if (!result.success) {
        addLog(
          'warn',
          `Reconciliação executada: ${result.error.message}. (Canal WebSocket ativo).`
        );
      } else {
        addLog(
          'success',
          `✅ Reconciliação concluída! Encontrados ${result.data.length} pedidos ativos no Supabase.`
        );
      }

      // Re-verify channel
      if (channelRef.current && channelRef.current.state !== 'joined') {
        void channelRef.current.subscribe();
      }
    } catch {
      addLog('error', 'Erro durante a reconciliação manual.');
    } finally {
      setActiveAction(null);
    }
  };

  const handleToggleWebSocket = () => {
    const supabase = createClient();
    if (realtimeStatus === 'connected') {
      if (channelRef.current && supabase) {
        void supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      setRealtimeStatus('disconnected');
      addLog('warn', '⚠️ Canal WebSocket desconectado propositadamente para teste.');
    } else {
      addLog('info', 'A restabelecer ligação WebSocket...');
      connectRealtime();
    }
  };

  // Handlers: Bloco D - Mesa & CartContext
  const handleSetTable = (tableNum: number | null) => {
    setSelectedTableNumber(tableNum);
    addLog(
      'info',
      `Estado de selectedTableNumber no CartContext alterado para: ${
        tableNum === null ? 'null (sem mesa)' : `Mesa ${tableNum}`
      }`
    );
  };

  const handleTestSubmitWithoutTable = async () => {
    addLog('info', 'A testar validação de submissão sem mesa...');
    if (selectedTableNumber === null) {
      addLog(
        'success',
        '✅ Verificação aprovada: selectedTableNumber está a null. O cliente é forçado a escolher a mesa antes de submeter.'
      );
    } else {
      addLog(
        'warn',
        `Aviso: O carrinho tem a Mesa ${selectedTableNumber} definida. Limpe a mesa primeiro para testar o bloqueio.`
      );
    }
  };

  const handleClearLogs = () => {
    setLogs([]);
  };

  const handleCopyLogs = () => {
    const text = logs.map((l) => `[${l.timestamp}] [${l.type.toUpperCase()}] ${l.message}`).join('\n');
    void navigator.clipboard.writeText(text);
    addLog('info', 'Logs copiados para a área de transferência.');
  };

  return (
    <div className="min-h-screen bg-[#FAF8F5] pb-24 text-[#141619]">
      {/* Top Header */}
      <header className="border-b border-zinc-200 bg-white shadow-2xs">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-md bg-zinc-900 px-2 py-0.5 text-xs font-black uppercase tracking-wider text-white">
                DEV / QA
              </span>
              <h1 className="text-xl font-black tracking-tight text-[#141619] sm:text-2xl">
                Bancada de Testes E2E (KDS & Ecossistema)
              </h1>
            </div>
            <p className="mt-0.5 text-xs text-zinc-500">
              Painel de simulação em tempo real para testes físicos com Tablet e Telemóvel &bull; Café do Rio / Gulas
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/admin/orders"
              target="_blank"
              className="inline-flex items-center gap-1.5 rounded-xl bg-zinc-900 px-3.5 py-2 text-xs font-bold text-white shadow-xs transition-all hover:bg-black"
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              <span>Abrir KDS (Tablet)</span>
              <ExternalLink className="h-3 w-3 opacity-60" />
            </Link>

            <Link
              href={`/menu/${restaurantSlug}`}
              target="_blank"
              className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3.5 py-2 text-xs font-bold text-[#141619] shadow-xs transition-all hover:bg-zinc-50"
            >
              <UtensilsCrossed className="h-3.5 w-3.5 text-[#15803D]" />
              <span>Menu Cliente</span>
              <ExternalLink className="h-3 w-3 opacity-60" />
            </Link>
          </div>
        </div>
      </header>

      {/* Main Grid Content */}
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        {/* System Bar */}
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
          {/* WebSocket Status */}
          <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                Canal WebSocket
              </span>
              <span
                className={`h-2.5 w-2.5 rounded-full ${
                  realtimeStatus === 'connected'
                    ? 'animate-pulse bg-emerald-500'
                    : realtimeStatus === 'connecting'
                    ? 'animate-ping bg-amber-500'
                    : 'bg-rose-500'
                }`}
              />
            </div>
            <p className="mt-1 text-sm font-black text-zinc-900 sm:text-base">
              {realtimeStatus === 'connected'
                ? 'CONECTADO'
                : realtimeStatus === 'connecting'
                ? 'A CONECTAR...'
                : 'DESCONECTADO'}
            </p>
            <p className="text-[11px] text-zinc-500">
              kds-orders-{restaurantId.substring(0, 8)}...
            </p>
          </div>

          {/* Heartbeat Ticker */}
          <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                Batimento Cardíaco
              </span>
              <Activity className="h-4 w-4 text-emerald-600" />
            </div>
            <p className="mt-1 text-sm font-black text-zinc-900 sm:text-base">
              {heartbeatSeconds}s ativo
            </p>
            <p className="text-[11px] text-zinc-500">
              {eventCount} eventos captados
            </p>
          </div>

          {/* Table Verifier */}
          <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                Mesa no Carrinho
              </span>
              <QrCode className="h-4 w-4 text-zinc-600" />
            </div>
            <p className="mt-1 text-sm font-black text-zinc-900 sm:text-base">
              {selectedTableNumber === null ? (
                <span className="text-emerald-700">null (Correto)</span>
              ) : (
                <span className="text-amber-800">Mesa {selectedTableNumber}</span>
              )}
            </p>
            <p className="text-[11px] text-zinc-500">
              Bug da Mesa 4: {selectedTableNumber === 4 ? '⚠️ Ativo!' : '✅ Resolvido'}
            </p>
          </div>

          {/* Staff Auth Status */}
          <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                Sessão Staff
              </span>
              {isStaffAuthenticated ? (
                <ShieldCheck className="h-4 w-4 text-emerald-600" />
              ) : (
                <ShieldAlert className="h-4 w-4 text-amber-500" />
              )}
            </div>
            <p className="mt-1 text-sm font-black text-zinc-900 sm:text-base truncate">
              {isStaffAuthenticated ? 'Autenticado' : 'Anónimo'}
            </p>
            <p className="text-[11px] text-zinc-500 truncate">
              {staffEmail || 'Sem cookie de staff'}
            </p>
          </div>
        </div>

        {/* 4 Action Blocks Grid */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* BLOCO A: Disparo de Pedidos Simulados */}
          <section className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-xs sm:p-6">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                  <Send className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="text-base font-black text-zinc-900">
                    Bloco A: Disparo de Pedidos
                  </h2>
                  <p className="text-xs text-zinc-500">
                    Simula pedidos de clientes para testar o tablet/KDS em tempo real
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <button
                type="button"
                disabled={activeAction !== null}
                onClick={handleDispatchNormalOrder}
                className="w-full flex items-center justify-between rounded-2xl border border-zinc-200 bg-zinc-50/70 p-3.5 text-left transition-all hover:border-emerald-300 hover:bg-emerald-50/30 disabled:opacity-50 cursor-pointer"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-zinc-900">
                      Disparar Pedido Normal (Mesa 3)
                    </span>
                    <span className="rounded-md bg-zinc-200 px-1.5 py-0.5 text-[10px] font-bold text-zinc-700">
                      2 artigos
                    </span>
                  </div>
                  <p className="mt-0.5 text-[11px] text-zinc-500">
                    1x Bolo do Caco + 1x Coca-Cola 35cl. Testa alarme áudio, vibração e badge &quot;NOVO&quot;.
                  </p>
                </div>
                {activeAction === 'dispatch-normal' ? (
                  <Loader2 className="h-4 w-4 animate-spin text-emerald-600 shrink-0" />
                ) : (
                  <ArrowRight className="h-4 w-4 text-zinc-400 shrink-0" />
                )}
              </button>

              <button
                type="button"
                disabled={activeAction !== null}
                onClick={handleDispatchSpecialNotesOrder}
                className="w-full flex items-center justify-between rounded-2xl border border-amber-200 bg-amber-50/40 p-3.5 text-left transition-all hover:bg-amber-50 disabled:opacity-50 cursor-pointer"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-amber-950">
                      Disparar Pedido com Notas / Alérgenos (Mesa 7)
                    </span>
                    <span className="rounded-md bg-amber-200 px-1.5 py-0.5 text-[10px] font-black text-amber-900">
                      Urgente
                    </span>
                  </div>
                  <p className="mt-0.5 text-[11px] text-amber-900/70">
                    &quot;Sem cebola, carne bem passada, urgente!&quot;. Testa exibição de observações no KDS.
                  </p>
                </div>
                {activeAction === 'dispatch-notes' ? (
                  <Loader2 className="h-4 w-4 animate-spin text-amber-700 shrink-0" />
                ) : (
                  <ArrowRight className="h-4 w-4 text-amber-600 shrink-0" />
                )}
              </button>

              <button
                type="button"
                disabled={activeAction !== null}
                onClick={handleDispatchBurstOrders}
                className="w-full flex items-center justify-between rounded-2xl border border-zinc-900 bg-zinc-900 p-3.5 text-left text-white shadow-xs transition-all hover:bg-black disabled:opacity-50 cursor-pointer"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <Zap className="h-3.5 w-3.5 text-amber-400" />
                    <span className="text-xs font-bold">
                      Disparar Rajada Concorrente (Simular Pico)
                    </span>
                  </div>
                  <p className="mt-0.5 text-[11px] text-zinc-300">
                    Envia 3 pedidos quase em simultâneo (Mesas 1, 2 e 5). Testa batching e estabilidade do canal.
                  </p>
                </div>
                {activeAction === 'dispatch-burst' ? (
                  <Loader2 className="h-4 w-4 animate-spin text-amber-400 shrink-0" />
                ) : (
                  <ArrowRight className="h-4 w-4 text-zinc-400 shrink-0" />
                )}
              </button>
            </div>
          </section>

          {/* BLOCO B: Teste do Ciclo de Vida & Ação "Desfazer" */}
          <section className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-xs sm:p-6">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-orange-50 text-orange-600">
                  <Flame className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="text-base font-black text-zinc-900">
                    Bloco B: Ciclo de Vida &amp; Ação &quot;Desfazer&quot;
                  </h2>
                  <p className="text-xs text-zinc-500">
                    Avança estados de pedidos e testa o banner de Undo imediato
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <button
                type="button"
                disabled={activeAction !== null}
                onClick={handleAdvanceOldestOrder}
                className="w-full flex items-center justify-between rounded-2xl border border-zinc-200 bg-zinc-50/70 p-3.5 text-left transition-all hover:border-orange-300 hover:bg-orange-50/30 disabled:opacity-50 cursor-pointer"
              >
                <div>
                  <span className="text-xs font-bold text-zinc-900">
                    Avançar Último Pedido para Próximo Estado
                  </span>
                  <p className="mt-0.5 text-[11px] text-zinc-500">
                    Transita em cadeia: pending ➔ accepted ➔ preparing ➔ ready.
                  </p>
                </div>
                {activeAction === 'advance-order' ? (
                  <Loader2 className="h-4 w-4 animate-spin text-orange-600 shrink-0" />
                ) : (
                  <ArrowRight className="h-4 w-4 text-zinc-400 shrink-0" />
                )}
              </button>

              <button
                type="button"
                disabled={activeAction !== null}
                onClick={handleCompleteRecentOrder}
                className="w-full flex items-center justify-between rounded-2xl border border-zinc-200 bg-zinc-50/70 p-3.5 text-left transition-all hover:border-emerald-300 hover:bg-emerald-50/30 disabled:opacity-50 cursor-pointer"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-zinc-900">
                      Concluir Pedido Recente (Gera Toast de Undo)
                    </span>
                    <span className="rounded-md bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-800">
                      Toast 6s
                    </span>
                  </div>
                  <p className="mt-0.5 text-[11px] text-zinc-500">
                    Marca como completed e verifica se o botão flutuante [Desfazer] surge no KDS.
                  </p>
                </div>
                {activeAction === 'complete-order' ? (
                  <Loader2 className="h-4 w-4 animate-spin text-emerald-600 shrink-0" />
                ) : (
                  <ArrowRight className="h-4 w-4 text-zinc-400 shrink-0" />
                )}
              </button>

              <button
                type="button"
                disabled={activeAction !== null || !lastCompletedOrder}
                onClick={handleReopenLastOrder}
                className="w-full flex items-center justify-between rounded-2xl border border-zinc-800 bg-zinc-950 p-3.5 text-left text-white transition-all hover:bg-black disabled:opacity-40 cursor-pointer"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <Undo2 className="h-3.5 w-3.5 text-white" />
                    <span className="text-xs font-bold">
                      Reabrir Último Pedido Concluído (reopenCompletedOrder)
                    </span>
                  </div>
                  <p className="mt-0.5 text-[11px] text-zinc-400">
                    {lastCompletedOrder
                      ? `Reabre Pedido #${lastCompletedOrder.orderNumber} para "accepted".`
                      : 'Conclua um pedido acima primeiro para ativar este teste.'}
                  </p>
                </div>
                {activeAction === 'reopen-order' ? (
                  <Loader2 className="h-4 w-4 animate-spin text-white shrink-0" />
                ) : (
                  <ArrowRight className="h-4 w-4 text-zinc-400 shrink-0" />
                )}
              </button>
            </div>
          </section>

          {/* BLOCO C: Teste de Resiliência & Suspensão de Ecrã */}
          <section className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-xs sm:p-6">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                  <Radio className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="text-base font-black text-zinc-900">
                    Bloco C: Resiliência & Suspensão
                  </h2>
                  <p className="text-xs text-zinc-500">
                    Testa recuperação de suspensão de tablet e oscilação de Wi-Fi
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <button
                type="button"
                disabled={activeAction !== null}
                onClick={handleForceReconciliation}
                className="w-full flex items-center justify-between rounded-2xl border border-blue-200 bg-blue-50/40 p-3.5 text-left transition-all hover:bg-blue-50 disabled:opacity-50 cursor-pointer"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <RefreshCw className="h-3.5 w-3.5 text-blue-600" />
                    <span className="text-xs font-bold text-blue-950">
                      Forçar Reconciliação Manual (Simular Visibility / Online)
                    </span>
                  </div>
                  <p className="mt-0.5 text-[11px] text-blue-900/70">
                    Executa a mesma rotina que é disparada ao ligar o ecrã do tablet.
                  </p>
                </div>
                {activeAction === 'force-reconcile' ? (
                  <Loader2 className="h-4 w-4 animate-spin text-blue-700 shrink-0" />
                ) : (
                  <ArrowRight className="h-4 w-4 text-blue-600 shrink-0" />
                )}
              </button>

              <button
                type="button"
                onClick={handleToggleWebSocket}
                className={`w-full flex items-center justify-between rounded-2xl border p-3.5 text-left transition-all cursor-pointer ${
                  realtimeStatus === 'connected'
                    ? 'border-rose-200 bg-rose-50/40 text-rose-950 hover:bg-rose-50'
                    : 'border-emerald-200 bg-emerald-50/40 text-emerald-950 hover:bg-emerald-50'
                }`}
              >
                <div>
                  <div className="flex items-center gap-2">
                    {realtimeStatus === 'connected' ? (
                      <WifiOff className="h-3.5 w-3.5 text-rose-600" />
                    ) : (
                      <Wifi className="h-3.5 w-3.5 text-emerald-600" />
                    )}
                    <span className="text-xs font-bold">
                      {realtimeStatus === 'connected'
                        ? 'Simular Queda de Rede (Desconectar WebSocket)'
                        : 'Reconectar Canal WebSocket'}
                    </span>
                  </div>
                  <p className="mt-0.5 text-[11px] opacity-75">
                    Permite testar o comportamento do KDS quando o Wi-Fi falha na cozinha.
                  </p>
                </div>
                <ArrowRight className="h-4 w-4 opacity-50 shrink-0" />
              </button>

              <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-xs text-zinc-600">
                <span className="font-bold text-zinc-800">Telemetria ao Vivo:</span>{' '}
                Último evento às {lastEventAt || 'Nenhum ainda'} &bull; Heartbeat:{' '}
                {heartbeatSeconds}s
              </div>
            </div>
          </section>

          {/* BLOCO D: Teste do Bug da Mesa & Catálogo */}
          <section className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-xs sm:p-6">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
                  <QrCode className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="text-base font-black text-zinc-900">
                    Bloco D: Bug da Mesa & QR Codes
                  </h2>
                  <p className="text-xs text-zinc-500">
                    Valida o seletor de mesa e os atalhos de rotas do menu
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              {/* Mesa State Controller */}
              <div className="rounded-2xl border border-zinc-200 bg-zinc-50/70 p-3.5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-zinc-900">
                    Estado Atual de selectedTableNumber:
                  </span>
                  <span
                    className={`rounded-md px-2 py-0.5 text-xs font-black ${
                      selectedTableNumber === null
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {selectedTableNumber === null
                      ? 'null (OK)'
                      : `Mesa ${selectedTableNumber}`}
                  </span>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => handleSetTable(null)}
                    className="cursor-pointer rounded-lg border border-zinc-300 bg-white px-2.5 py-1 text-xs font-semibold text-zinc-700 hover:bg-zinc-100"
                  >
                    Definir como null
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSetTable(3)}
                    className="cursor-pointer rounded-lg border border-zinc-300 bg-white px-2.5 py-1 text-xs font-semibold text-zinc-700 hover:bg-zinc-100"
                  >
                    Definir Mesa 3
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSetTable(7)}
                    className="cursor-pointer rounded-lg border border-zinc-300 bg-white px-2.5 py-1 text-xs font-semibold text-zinc-700 hover:bg-zinc-100"
                  >
                    Definir Mesa 7
                  </button>
                  <button
                    type="button"
                    onClick={handleTestSubmitWithoutTable}
                    className="cursor-pointer rounded-lg bg-zinc-900 px-2.5 py-1 text-xs font-bold text-white hover:bg-black"
                  >
                    Testar Bloqueio sem Mesa
                  </button>
                </div>
              </div>

              {/* Quick Links to Virtual QR Routes */}
              <div className="space-y-2 pt-1">
                <span className="text-xs font-bold text-zinc-700">
                  Atalhos de Simulação QR Code (Abrir no Telemóvel):
                </span>

                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <Link
                    href={`/menu/${restaurantSlug}`}
                    target="_blank"
                    className="flex items-center justify-between rounded-xl border border-zinc-200 bg-white p-2.5 text-xs font-bold text-zinc-800 hover:border-zinc-300 hover:bg-zinc-50"
                  >
                    <span>/menu/{restaurantSlug} (Sem mesa)</span>
                    <ExternalLink className="h-3 w-3 text-zinc-400" />
                  </Link>

                  <Link
                    href={`/menu/${restaurantSlug}/table/3`}
                    target="_blank"
                    className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50/30 p-2.5 text-xs font-bold text-emerald-900 hover:bg-emerald-50"
                  >
                    <span>Mesa 3 Bloqueada (QR)</span>
                    <ExternalLink className="h-3 w-3 text-emerald-600" />
                  </Link>

                  <Link
                    href={`/menu/${restaurantSlug}/table/7`}
                    target="_blank"
                    className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50/30 p-2.5 text-xs font-bold text-emerald-900 hover:bg-emerald-50"
                  >
                    <span>Mesa 7 Bloqueada (QR)</span>
                    <ExternalLink className="h-3 w-3 text-emerald-600" />
                  </Link>

                  <Link
                    href="/admin/orders/history"
                    target="_blank"
                    className="flex items-center justify-between rounded-xl border border-zinc-200 bg-white p-2.5 text-xs font-bold text-zinc-800 hover:border-zinc-300 hover:bg-zinc-50"
                  >
                    <span>Histórico de Pedidos</span>
                    <ExternalLink className="h-3 w-3 text-zinc-400" />
                  </Link>
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* Live Console Logs Panel */}
        <section className="mt-6 rounded-3xl border border-zinc-900 bg-zinc-950 p-4 text-white shadow-xl sm:p-6">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800 pb-3">
            <div className="flex items-center gap-2">
              <Terminal className="h-4 w-4 text-emerald-400" />
              <h2 className="text-sm font-black tracking-tight text-white">
                Consola de Diagnóstico em Tempo Real
              </h2>
              <span className="rounded-md bg-zinc-800 px-2 py-0.5 font-mono text-[10px] text-zinc-400">
                {logs.length} linhas
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCopyLogs}
                disabled={logs.length === 0}
                className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-zinc-800 bg-zinc-900 px-2.5 py-1 text-xs font-semibold text-zinc-300 transition-colors hover:bg-zinc-800 hover:text-white disabled:opacity-40"
              >
                <Copy className="h-3 w-3" />
                <span>Copiar</span>
              </button>

              <button
                type="button"
                onClick={handleClearLogs}
                disabled={logs.length === 0}
                className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-zinc-800 bg-zinc-900 px-2.5 py-1 text-xs font-semibold text-zinc-300 transition-colors hover:bg-zinc-800 hover:text-rose-400 disabled:opacity-40"
              >
                <Trash2 className="h-3 w-3" />
                <span>Limpar</span>
              </button>
            </div>
          </div>

          {/* Log Window */}
          <div className="h-64 overflow-y-auto space-y-1 font-mono text-xs pr-2 scrollbar-thin scrollbar-thumb-zinc-800">
            {logs.length === 0 ? (
              <p className="text-zinc-600 italic py-8 text-center">
                A aguardar ações... Clique em qualquer botão dos blocos acima para começar o teste.
              </p>
            ) : (
              logs.map((log) => (
                <div
                  key={log.id}
                  className={`flex items-start gap-2 py-0.5 leading-relaxed ${
                    log.type === 'success'
                      ? 'text-emerald-400'
                      : log.type === 'warn'
                      ? 'text-amber-400'
                      : log.type === 'error'
                      ? 'text-rose-400'
                      : log.type === 'realtime'
                      ? 'text-cyan-300 font-bold'
                      : 'text-zinc-300'
                  }`}
                >
                  <span className="text-zinc-600 shrink-0">[{log.timestamp}]</span>
                  <span className="font-semibold shrink-0 uppercase text-[10px] px-1 py-0.2 rounded bg-white/5">
                    {log.type}
                  </span>
                  <span className="break-all">{log.message}</span>
                </div>
              ))
            )}
            <div ref={consoleBottomRef} />
          </div>
        </section>
      </main>
    </div>
  );
}
