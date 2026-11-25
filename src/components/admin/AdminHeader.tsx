import React from 'react';
import { AuthenticatedStaff } from '@/lib/auth/staff';
import { LogoutButton } from './LogoutButton';
import { RefreshButton } from './RefreshButton';
import { FullscreenButton } from './FullscreenButton';
import { AdminNav } from './AdminNav';

interface AdminHeaderProps {
  staff: AuthenticatedStaff;
}

export function AdminHeader({ staff }: AdminHeaderProps) {
  const isOwnerUser = staff.profile.role === 'owner';

  return (
    <header
      data-restaurant={staff.restaurant.slug}
      className="sticky top-0 z-30 bg-zinc-200/75 backdrop-blur-md border-b border-zinc-300/80 shadow-2xs px-4 sm:px-6 py-3"
    >
      <div className="max-w-[1920px] mx-auto grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] items-center gap-3 md:gap-4">
        <div className="flex items-center justify-between md:justify-start">
          <FullscreenButton />
        </div>

        <div className="flex justify-center">
          <AdminNav isOwner={isOwnerUser} />
        </div>

        <div className="flex items-center justify-end gap-2">
          <RefreshButton />
          <LogoutButton />
        </div>
      </div>
    </header>
  );
}
