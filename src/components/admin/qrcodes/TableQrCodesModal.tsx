'use client';

import React, { useState, useMemo } from 'react';
import {
  X,
  QrCode,
  Copy,
  Check,
  ExternalLink,
  Printer,
  ShoppingBag,
  Utensils,
} from 'lucide-react';

interface TableQrCodesModalProps {
  isOpen: boolean;
  onClose: () => void;
  restaurantName: string;
  restaurantSlug: string;
}

interface QrTarget {
  id: string;
  label: string;
  subtitle: string;
  path: string;
  isTakeAway?: boolean;
}

export function TableQrCodesModal({
  isOpen,
  onClose,
  restaurantName,
  restaurantSlug,
}: TableQrCodesModalProps) {
  const [tableCount, setTableCount] = useState<number>(10);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const origin =
    typeof window !== 'undefined'
      ? window.location.origin
      : 'https://gulas-iota.vercel.app';

  const targets: QrTarget[] = useMemo(() => {
    const list: QrTarget[] = [
      {
        id: 'takeaway',
        label: 'Take-Away / Balcão',
        subtitle: 'Menu Geral & Encomendas para Levar',
        path: `/menu/${restaurantSlug}`,
        isTakeAway: true,
      },
    ];

    for (let i = 1; i <= tableCount; i++) {
      list.push({
        id: `table-${i}`,
        label: `Mesa ${i}`,
        subtitle: `Pedido direto na Mesa ${i}`,
        path: `/menu/${restaurantSlug}/table/${i}`,
      });
    }

    return list;
  }, [restaurantSlug, tableCount]);

  if (!isOpen) return null;

  const getQrImageUrl = (fullUrl: string) =>
    `https://api.qrserver.com/v1/create-qr-code/?size=280x280&margin=10&format=svg&data=${encodeURIComponent(
      fullUrl
    )}`;

  const handleCopy = async (id: string, fullUrl: string) => {
    try {
      await navigator.clipboard.writeText(fullUrl);
      setCopiedId(id);
      setTimeout(() => {
        setCopiedId((prev) => (prev === id ? null : prev));
      }, 2000);
    } catch {
      // Fallback silent
    }
  };

  const handlePrintAll = () => {
    const printWindow = window.open('', '_blank', 'width=980,height=800');
    if (!printWindow) return;

    const cardsHtml = targets
      .map((t) => {
        const fullUrl = `${origin}${t.path}`;
        const qrUrl = getQrImageUrl(fullUrl);
        return `
          <div class="qr-card">
            <div class="brand">${restaurantName}</div>
            <div class="badge ${t.isTakeAway ? 'badge-takeaway' : ''}">${t.label}</div>
            <img src="${qrUrl}" alt="${t.label}" class="qr-img" />
            <div class="instruction">Aponte a câmara do telemóvel para ver o menu digital e fazer o pedido</div>
            <div class="url">${fullUrl}</div>
          </div>
        `;
      })
      .join('');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html lang="pt">
        <head>
          <meta charset="utf-8" />
          <title>QR Codes de Mesa — ${restaurantName}</title>
          <style>
            @page { size: A4 portrait; margin: 12mm; }
            * { box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
            body { margin: 0; padding: 0; color: #18181B; background: #fff; }
            .grid {
              display: grid;
              grid-template-columns: repeat(3, 1fr);
              gap: 12px;
            }
            .qr-card {
              border: 1.5px dashed #A1A1AA;
              border-radius: 16px;
              padding: 16px 12px;
              text-align: center;
              page-break-inside: avoid;
              break-inside: avoid;
              display: flex;
              flex-direction: column;
              align-items: center;
            }
            .brand {
              font-size: 11px;
              font-weight: 800;
              text-transform: uppercase;
              letter-spacing: 0.12em;
              color: #71717A;
              margin-bottom: 6px;
            }
            .badge {
              display: inline-block;
              background: #18181B;
              color: #FAFAFA;
              font-size: 16px;
              font-weight: 900;
              padding: 4px 14px;
              border-radius: 999px;
              margin-bottom: 10px;
            }
            .badge-takeaway {
              background: #065F46;
              color: #ECFDF5;
            }
            .qr-img {
              width: 155px;
              height: 155px;
              object-fit: contain;
              margin: 4px 0 10px;
            }
            .instruction {
              font-size: 11px;
              font-weight: 600;
              color: #52525B;
              line-height: 1.35;
              max-width: 190px;
              margin-bottom: 6px;
            }
            .url {
              font-size: 8.5px;
              font-family: monospace;
              color: #A1A1AA;
              word-break: break-all;
            }
          </style>
        </head>
        <body>
          <div class="grid">${cardsHtml}</div>
          <script>
            window.onload = function() {
              setTimeout(function() {
                window.print();
              }, 350);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-4xl bg-white rounded-2xl border border-zinc-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-6 py-4 bg-zinc-50 border-b border-zinc-200/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-zinc-900 text-white flex items-center justify-center shrink-0">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-zinc-900 tracking-tight">
                Centro de QR Codes — Mesas &amp; Take-Away
              </h2>
              <p className="text-xs text-zinc-500">
                Links diretos com pré-seleção automática de mesa para {restaurantName}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <label className="flex items-center gap-1.5 text-xs font-semibold text-zinc-600 bg-white border border-zinc-200 rounded-xl px-3 py-2">
              <span>N.º Mesas:</span>
              <select
                value={tableCount}
                onChange={(e) => setTableCount(Number(e.target.value))}
                className="font-bold text-zinc-900 bg-transparent focus:outline-none cursor-pointer"
              >
                {[6, 8, 10, 12, 15, 20].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </label>

            <button
              type="button"
              onClick={handlePrintAll}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-semibold transition-all cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Imprimir Folha A4</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 transition-colors cursor-pointer"
              aria-label="Fechar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body Grid */}
        <div className="p-6 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 bg-[#FAFAFA]">
          {targets.map((target) => {
            const fullUrl = `${origin}${target.path}`;
            const isCopied = copiedId === target.id;

            return (
              <div
                key={target.id}
                className="bg-white rounded-2xl border border-zinc-200/80 p-4 flex flex-col items-center text-center hover:border-zinc-400 transition-all"
              >
                <div className="flex items-center justify-between w-full mb-2">
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold ${
                      target.isTakeAway
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200/70'
                        : 'bg-zinc-100 text-zinc-900'
                    }`}
                  >
                    {target.isTakeAway ? (
                      <ShoppingBag className="w-3.5 h-3.5 text-emerald-700" />
                    ) : (
                      <Utensils className="w-3.5 h-3.5 text-zinc-600" />
                    )}
                    {target.label}
                  </span>

                  <a
                    href={target.path}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-zinc-500 hover:text-zinc-900 transition-colors"
                    title="Abrir link num novo separador"
                  >
                    <span>Testar</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>

                {/* QR SVG */}
                <div className="w-36 h-36 my-2 p-2 rounded-xl bg-white border border-zinc-200/70 flex items-center justify-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={getQrImageUrl(fullUrl)}
                    alt={`QR Code ${target.label}`}
                    className="w-full h-full object-contain"
                    loading="lazy"
                  />
                </div>

                <p className="text-[11px] text-zinc-500 mb-2">
                  {target.subtitle}
                </p>

                <code className="w-full text-[10px] font-mono text-zinc-600 bg-zinc-50 px-2 py-1 rounded-lg truncate mb-3 border border-zinc-200/60">
                  {target.path}
                </code>

                <button
                  type="button"
                  onClick={() => void handleCopy(target.id, fullUrl)}
                  className={`w-full inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    isCopied
                      ? 'bg-emerald-600 text-white'
                      : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-900'
                  }`}
                >
                  {isCopied ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Link Copiado!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-zinc-600" />
                      <span>Copiar URL Completo</span>
                    </>
                  )}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
