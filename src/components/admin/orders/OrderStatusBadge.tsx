import React from 'react';
import { OrderStatus } from '@/types/restaurant';

interface OrderStatusBadgeProps {
  status: OrderStatus;
  size?: 'sm' | 'md';
}

interface StatusStyleConfig {
  label: string;
  className: string;
}

const STATUS_CONFIG: Record<OrderStatus, StatusStyleConfig> = {
  pending: {
    label: 'Aguardar',
    className: 'border-2 bg-amber-50 text-amber-900 border-amber-500',
  },
  accepted: {
    label: 'Aceite',
    className: 'border-2 bg-zinc-900 text-white border-zinc-900',
  },
  preparing: {
    label: 'Preparação',
    className: 'border-2 bg-orange-50 text-orange-900 border-orange-600',
  },
  ready: {
    label: 'Pronto (Pass)',
    className: 'border-2 bg-emerald-50 text-emerald-900 border-emerald-600',
  },
  completed: {
    label: 'Concluído',
    className: 'border-2 bg-zinc-100 text-zinc-700 border-zinc-400',
  },
  cancelled: {
    label: 'Cancelado',
    className: 'border-2 bg-rose-50 text-rose-900 border-rose-500',
  },
};

export function OrderStatusBadge({ status, size = 'md' }: OrderStatusBadgeProps) {
  const config = STATUS_CONFIG[status];
  const sizeClasses =
    size === 'sm' ? 'px-2.5 py-1 text-[11px]' : 'px-3 py-1.5 text-xs';

  return (
    <span
      className={`inline-flex items-center font-semibold tracking-tight rounded-full transition-all ${config.className} ${sizeClasses}`}
    >
      {config.label}
    </span>
  );
}
