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
    'inline-flex items-center gap-1 font-semibold rounded-md tracking-tight transition-colors';

  const sizeStyles = {
    sm: 'text-[10px] px-1.5 py-0.5 leading-none',
    md: 'text-xs px-2 py-0.5 leading-tight',
  };

  const variantStyles: Record<string, string> = {
    novidade:
      'bg-[#5E4939] text-[#F5F4F1] font-bold tracking-wide uppercase',
    picante:
      'bg-red-50 text-red-700 border border-red-200/80',
    vegetariano:
      'bg-emerald-50 text-emerald-800 border border-emerald-200/80',
    vegan:
      'bg-teal-50 text-teal-800 border border-teal-200/80',
    especialidade:
      'bg-[#C09573]/15 text-[#5E4939] border border-[#C09573]/40 font-bold',
    house_special:
      'bg-[#C09573]/15 text-[#5E4939] border border-[#C09573]/40 font-bold',
    popular:
      'bg-[#EAE5DF] text-[#35271F] border border-[#E5DED6] font-medium',
    promocao:
      'bg-[#5E4939] text-[#F5F4F1] font-bold tracking-wide uppercase',
    extra:
      'bg-[#EAE5DF] text-[#35271F] border border-[#E5DED6] font-medium',
    acompanhamento:
      'bg-[#EAE5DF] text-[#35271F] border border-[#E5DED6] font-medium',
    primary:
      'bg-[#C09573]/15 text-[#5E4939] border border-[#C09573]/30',
    secondary:
      'bg-[#EAE5DF] text-[#35271F] border border-[#E5DED6]',
    muted:
      'bg-[#EAE5DF] text-[#4C453F]',
  };

  const renderDefaultIcon = () => {
    switch (effectiveVariant) {
      case 'picante':
        return <Flame className="w-2.5 h-2.5 text-red-600" />;
      case 'vegetariano':
        return <Leaf className="w-2.5 h-2.5 text-emerald-700" />;
      case 'vegan':
        return <Leaf className="w-2.5 h-2.5 text-teal-700" />;
      case 'especialidade':
      case 'house_special':
        return <Sparkles className="w-2.5 h-2.5 text-[#C09573]" />;
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
