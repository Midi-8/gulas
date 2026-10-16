import React from 'react';
import { AuthenticatedStaff } from '@/lib/auth/staff';
import { LogoutButton } from './LogoutButton';
import { AdminNav } from './AdminNav';
import { ChefHat, Shield, User } from 'lucide-react';

interface AdminHeaderProps {
  staff: AuthenticatedStaff;
}

const ROLE_LABELS: Record<AuthenticatedStaff['profile']['role'], string> = {
  owner: 'Proprietário',
  manager: 'Gerente',
  staff: 'Funcionário',
};

const ROLE_STYLES: Record<AuthenticatedStaff['profile']['role'], string> = {
  owner: 'bg-[#C09573]/15 text-[#5E4939] border-[#C09573]/30',
  manager: 'bg-[#EAE5DF] text-[#35271F] border-[#E5DED6]',
  staff: 'bg-[#F5F4F1] text-[#4C453F] border-[#E5DED6]',
};

export function AdminHeader({ staff }: AdminHeaderProps) {
  const roleLabel = ROLE_LABELS[staff.profile.role] || staff.profile.role;
  const roleStyle =
    ROLE_STYLES[staff.profile.role] || 'bg-[#EAE5DF] text-[#35271F] border-[#E5DED6]';

  return (
    <header className="sticky top-0 z-30 bg-[#F5F4F1]/90 backdrop-blur-sm border-b border-[#E5DED6] px-4 sm:px-6 py-3.5 shadow-2xs">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        {/* Left: Brand / Restaurant Info */}
        <div className="flex items-center justify-between md:justify-start gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#5E4939] text-[#F5F4F1] rounded-xl flex items-center justify-center shadow-xs flex-shrink-0">
              <ChefHat className="w-5 h-5 text-[#C09573]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-lg text-[#35271F] tracking-tight leading-none">
                  {staff.restaurant.name}
                </span>
                <span className="text-xs bg-[#EAE5DF] text-[#4C453F] px-2 py-0.5 rounded-md font-mono hidden sm:inline-block">
                  /{staff.restaurant.slug}
                </span>
              </div>
              <p className="text-xs text-[#4C453F] mt-0.5 leading-none">
                Painel de Gestão & Pedidos
              </p>
            </div>
          </div>
        </div>

        {/* Center: Navigation between KDS and History */}
        <div className="flex justify-center">
          <AdminNav />
        </div>

        {/* Right: User identity, role badge & logout */}
        <div className="flex items-center justify-end gap-3 sm:gap-4">
          <div className="hidden sm:flex flex-col items-end text-right">
            <div className="flex items-center gap-1.5 text-sm font-bold text-gulas-dark leading-none">
              <User className="w-3.5 h-3.5 text-gulas-gray-400" />
              <span>{staff.profile.fullName || staff.email}</span>
            </div>
            <span className="text-xs text-gulas-gray-400 mt-0.5 leading-none">
              {staff.email}
            </span>
          </div>

          <div
            className={`flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full border ${roleStyle}`}
          >
            <Shield className="w-3 h-3" />
            <span>{roleLabel}</span>
          </div>

          <LogoutButton />
        </div>
      </div>
    </header>
  );
}
