'use client';

import React from 'react';
import { useCart } from '@/context/CartContext';
import { mockTables } from '@/data/mockRestaurant';
import { UtensilsCrossed, X, Check } from 'lucide-react';

interface TableSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TableSelectorModal: React.FC<TableSelectorModalProps> = ({ isOpen, onClose }) => {
  const { selectedTableNumber, setSelectedTableNumber, isTableLocked } = useCart();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#35271F]/40 animate-in fade-in duration-200">
      <div
        className="w-full max-w-sm bg-[#FFFFFF] border border-[#E5DED6] rounded-2xl p-5 shadow-xl animate-in zoom-in-95 duration-200 text-[#35271F]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4 pb-2 border-b border-[#E5DED6]">
          <div className="flex items-center gap-2">
            <UtensilsCrossed className="w-4 h-4 text-[#C09573]" />
            <h3 className="text-sm font-bold text-[#35271F]">Selecionar Mesa</h3>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-[#EAE5DF] text-[#4C453F] hover:bg-[#E5DED6] flex items-center justify-center cursor-pointer transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {isTableLocked ? (
          <p className="text-xs text-[#5E4939] bg-[#EAE5DF] p-3 rounded-xl border border-[#E5DED6] mb-3 font-medium">
            A mesa foi definida automaticamente pelo QR Code que leu na mesa.
          </p>
        ) : (
          <p className="text-xs text-[#4C453F] mb-3">
            Escolha a mesa onde está sentado para a nossa equipa lhe entregar o pedido:
          </p>
        )}

        <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto pr-1">
          {mockTables.map((t) => {
            const isSelected = selectedTableNumber === t.number;
            return (
              <button
                key={t.id}
                disabled={isTableLocked}
                onClick={() => {
                  setSelectedTableNumber(t.number);
                  onClose();
                }}
                className={`p-3 rounded-xl text-left border transition-all text-xs font-medium flex items-center justify-between cursor-pointer ${
                  isSelected
                    ? 'bg-[#5E4939] border-[#5E4939] text-[#F5F4F1] font-bold shadow-xs'
                    : 'bg-[#F5F4F1] border-[#E5DED6] text-[#35271F] hover:bg-[#EAE5DF]'
                }`}
              >
                <span>{t.name}</span>
                {isSelected && <Check className="w-3.5 h-3.5 text-[#C09573]" />}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
