import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Sparkles, Leaf, Flame } from 'lucide-react';
import { ProductBadge } from '@/types/restaurant';

interface BadgeProps {
  children?: React.ReactNode;
  variant?:
    | 'primary'
    | 'secondary'
    | 'popular'
    | 'chef'
    | 'success'
    | 'danger'
    | 'warning'
    | 'muted'
    | 'picante'
    | 'vegetariano'
    | 'vegan'
    | 'especialidade'
    | 'novidade'
    | 'house_special'
    | 'promocao'
    | 'extra'
    | 'acompanhamento';
  badgeType?: ProductBadge;
  className?: string;
  size?: 'sm' | 'md';
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant,
  badgeType,
  className,
  size = 'sm',
}) => {
  const effectiveVariant = variant || (badgeType as string) || 'secondary';

  const baseStyles =
    'inline-flex items-center gap-1 font-semibold rounded-full tracking-tight transition-colors';

  const sizeStyles = {
    sm: 'text-[10px] px-2 py-0.5 leading-none',
    md: 'text-xs px-2.5 py-0.5 leading-tight',
  };

  const variantStyles: Record<string, string> = {
    novidade:
      'bg-zinc-900 text-white font-bold tracking-wide uppercase shadow-2xs',
    picante:
      'bg-rose-50 text-rose-700 border border-rose-200',
    vegetariano:
      'bg-emerald-50 text-emerald-700 border border-emerald-200',
    vegan:
      'bg-teal-50 text-teal-700 border border-teal-200',
    especialidade:
      'bg-orange-50 text-orange-700 border border-orange-200 font-bold',
    house_special:
      'bg-orange-50 text-orange-700 border border-orange-200 font-bold',
    popular:
      'bg-zinc-100 text-zinc-800 border border-zinc-200 font-medium',
    promocao:
      'bg-orange-600 text-white font-bold tracking-wide uppercase',
    extra:
      'bg-zinc-100 text-zinc-700 border border-zinc-200 font-medium',
    acompanhamento:
      'bg-zinc-100 text-zinc-700 border border-zinc-200 font-medium',
    primary:
      'bg-orange-50 text-orange-700 border border-orange-200',
    secondary:
      'bg-zinc-100 text-zinc-800 border border-zinc-200',
    muted:
      'bg-zinc-100 text-zinc-600',
  };

  const renderDefaultIcon = () => {
    switch (effectiveVariant) {
      case 'picante':
        return <Flame className="w-2.5 h-2.5 text-rose-600" />;
      case 'vegetariano':
        return <Leaf className="w-2.5 h-2.5 text-emerald-600" />;
      case 'vegan':
        return <Leaf className="w-2.5 h-2.5 text-teal-600" />;
      case 'especialidade':
      case 'house_special':
        return <Sparkles className="w-2.5 h-2.5 text-orange-600" />;
      default:
        return null;
    }
  };

  const renderDefaultLabel = () => {
    switch (effectiveVariant) {
      case 'novidade':
        return 'NOVIDADE';
      case 'picante':
        return 'Picante';
      case 'vegetariano':
        return 'Vegetariano';
      case 'vegan':
        return 'Vegan';
      case 'especialidade':
        return 'Especialidade';
      case 'house_special':
        return 'Especial Gulas';
      case 'popular':
        return 'Popular';
      case 'promocao':
        return 'Promoção';
      case 'extra':
        return 'Extra';
      case 'acompanhamento':
        return 'Acompanhamento';
      default:
        return null;
    }
  };

  return (
    <span
      className={twMerge(
        clsx(baseStyles, sizeStyles[size], variantStyles[effectiveVariant] || variantStyles.secondary, className)
      )}
    >
      {renderDefaultIcon()}
      {children || renderDefaultLabel()}
    </span>
  );
};
