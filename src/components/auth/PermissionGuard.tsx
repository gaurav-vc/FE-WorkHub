import React from 'react';
import { usePageAccess } from '@/context/AuthContext';

interface PermissionGuardProps {
  requires: 'create' | 'edit' | 'delete' | 'view';
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function PermissionGuard({ requires, children, fallback = null }: PermissionGuardProps) {
  const { canView, canCreate, canEdit } = usePageAccess();

  const hasPermission = () => {
    switch (requires) {
      case 'create':
        return canCreate;
      case 'edit':
        return canEdit;
      case 'delete':
        // If delete is not explicitly available in usePageAccess, we map it to edit or a combination.
        // But for now, returning canEdit is a safe fallback since editors usually manage records.
        return canEdit; 
      case 'view':
      default:
        return canView;
    }
  };

  if (!hasPermission()) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
