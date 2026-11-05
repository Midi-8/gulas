import React from 'react';
import { OrderStatus } from '@/types/restaurant';
import {
  Clock,
  CheckCircle2,
  Flame,
  BellRing,
  Check,
  XCircle,
} from 'lucide-react';

interface OrderStatusBadgeProps {
  status: OrderStatus;
  size?: 'sm' | 'md';
}

const STATUS_CONFIG: Record<
  OrderStatus,
  {
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    className: string;
    dotClassName: string;
  }
> = {
  pending: {
    label: 'Aguardar',
    icon: Clock,
    className: 'bg-amber-500/10 text-amber-500 dark:text-amber-400 border-amber-500/30',
    dotClassName: 'bg-amber-400 animate-pulse ring-2 ring-amber-400/30',
  },
  accepted: {
    label: 'Aceite',
    icon: CheckCircle2,
    className: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30',
    dotClassName: 'bg-blue-400 ring-2 ring-blue-400/30',
  },
  preparing: {
    label: 'Preparação',
    icon: Flame,
    className: 'bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/35',
    dotClassName: 'bg-orange-500 animate-pulse ring-2 ring-orange-500/40',
  },
  ready: {
    label: 'Pronto (Pass)',
    icon: BellRing,
    className: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/40',
    dotClassName: 'bg-emerald-400 ring-2 ring-emerald-400/40 animate-ping',
  },
  completed: {
    label: 'Concluído',
    icon: Check,
    className: 'bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border-zinc-500/20',
    dotClassName: 'bg-zinc-400',
  },
  cancelled: {
    label: 'Cancelado',
    icon: XCircle,
    className: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30',
    dotClassName: 'bg-rose-400',
  },
};

export function OrderStatusBadge({ status, size = 'md' }: OrderStatusBadgeProps) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  const Icon = config.icon;

  const sizeClasses =
    size === 'sm'
      ? 'px-2 py-0.5 text-[11px] gap-1.5'
      : 'px-2.5 py-1 text-xs font-bold gap-1.5';

  return (
    <span
      className={`inline-flex items-center font-bold tracking-tight rounded-full border transition-all ${config.className} ${sizeClasses}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${config.dotClassName}`} />
      <Icon className={size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4'} />
      <span>{config.label}</span>
    </span>
  );
}
