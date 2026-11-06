'use client';

import React from 'react';
import { ManagedOrder } from '@/actions/order-management';

interface ThermalReceiptProps {
  order: ManagedOrder | null;
  restaurantName?: string;
}

export function ThermalReceipt({
  order,
  restaurantName = 'GULAS — Vila das Aves',
}: ThermalReceiptProps) {
  if (!order) return null;

  const formatDateTime = (iso: string) => {
    try {
      return new Intl.DateTimeFormat('pt-PT', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(new Date(iso));
    } catch {
      return iso;
    }
  };

  return (
    <div
      id="gulas-thermal-receipt"
      aria-hidden="true"
      className="hidden print:block text-black bg-white font-mono text-xs leading-snug"
    >
      <div className="border-b-2 border-dashed border-black pb-2 mb-2 text-center">
        <p className="font-black text-sm uppercase tracking-wider">
          {restaurantName}
        </p>
        <p className="text-[11px]">Talão de Cozinha / Copa</p>
        <p className="text-[10px] mt-0.5">{formatDateTime(order.createdAt)}</p>
      </div>

      <div className="border-b-2 border-dashed border-black pb-2 mb-2 flex items-center justify-between">
        <div>
          <p className="text-[10px] uppercase">Pedido</p>
          <p className="text-xl font-black">#{order.orderNumber}</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] uppercase">Destino</p>
          <p className="text-base font-black uppercase">
            {order.tableNumber === 0 ? 'TAKE-AWAY' : `MESA ${order.tableNumber}`}
          </p>
        </div>
      </div>

      {order.customerNotes && (
        <div className="border-b border-dashed border-black pb-2 mb-2">
          <p className="font-bold uppercase text-[10px]">Observações / Cliente:</p>
          <p className="whitespace-pre-wrap font-semibold text-xs">
            {order.customerNotes}
          </p>
        </div>
      )}

      <div className="border-b-2 border-dashed border-black pb-2 mb-2 space-y-1.5">
        <div className="flex justify-between text-[10px] font-bold uppercase border-b border-black/40 pb-1">
          <span>Qtd / Artigo</span>
          <span>Subtotal</span>
        </div>
        {order.items.map((item) => (
          <div key={item.id} className="space-y-0.5">
            <div className="flex justify-between items-start gap-2 font-bold text-xs">
              <span>
                {item.quantity}x {item.productName}
              </span>
              <span className="shrink-0">
                {(item.unitPrice * item.quantity).toFixed(2)}€
              </span>
            </div>
            {item.notes && (
              <p className="pl-3 text-[11px] italic">
                * Obs: {item.notes}
              </p>
            )}
          </div>
        ))}
      </div>

      <div className="space-y-1 pt-0.5">
        <div className="flex justify-between text-sm font-black">
          <span>TOTAL</span>
          <span>{order.total.toFixed(2)}€</span>
        </div>
        <p className="text-[9px] text-center pt-3">
          Documento interno de controlo de pedido
        </p>
      </div>
    </div>
  );
}
