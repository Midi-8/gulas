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
  owner: 'bg-zinc-900 text-white border-zinc-900',
  manager: 'bg-zinc-100 text-zinc-900 border-zinc-200',
  staff: 'bg-zinc-50 text-zinc-700 border-zinc-200',
};

export function AdminHeader({ staff }: AdminHeaderProps) {
  const roleLabel = ROLE_LABELS[staff.profile.role] || staff.profile.role;
  const roleStyle =
    ROLE_STYLES[staff.profile.role] || 'bg-zinc-100 text-zinc-900 border-zinc-200';

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-zinc-200/80 px-4 sm:px-6 py-3">
      <div className="max-w-[1920px] mx-auto flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Left: Brand / Restaurant Info */}
        <div className="flex items-center justify-between md:justify-start gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-zinc-900 text-white rounded-xl flex items-center justify-center flex-shrink-0">
              <ChefHat className="w-4 h-4 text-zinc-200" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-base text-zinc-900 tracking-tight leading-none">
                  {staff.restaurant.name}
                </span>
                <span className="text-[11px] bg-zinc-100 text-zinc-600 px-2 py-0.5 rounded-md font-mono hidden sm:inline-block border border-zinc-200/80">
                  /{staff.restaurant.slug}
                </span>
              </div>
              <p className="text-[11px] text-zinc-500 mt-0.5 leading-none">
                Operação & Gestão
              </p>
            </div>
          </div>
        </div>

        {/* Center: Navigation between KDS, History and Analytics */}
        <div className="flex justify-center">
          <AdminNav />
        </div>

        {/* Right: User identity, role badge & logout */}
        <div className="flex items-center justify-end gap-2.5 sm:gap-3">
          <div className="hidden sm:flex flex-col items-end text-right">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-900 leading-none">
              <User className="w-3.5 h-3.5 text-zinc-400" />
              <span>{staff.profile.fullName || staff.email}</span>
            </div>
            <span className="text-[11px] text-zinc-400 mt-0.5 leading-none">
              {staff.email}
            </span>
          </div>

          <div
            className={`flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full border ${roleStyle}`}
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
