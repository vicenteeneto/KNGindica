import React, { createContext, useContext, ReactNode } from 'react';
import { useAdminDashboardData } from './useAdminDashboardData';

/**
 * Estado compartilhado do painel administrativo.
 *
 * O tipo é inferido do hook — não há interface escrita à mão para manter,
 * e qualquer campo removido do hook vira erro de compilação nas abas que
 * ainda o usam.
 */
export type AdminDashboardValue = ReturnType<typeof useAdminDashboardData>;

const AdminDashboardContext = createContext<AdminDashboardValue | undefined>(undefined);

export function AdminDashboardProvider({
  value,
  children,
}: {
  value: AdminDashboardValue;
  children: ReactNode;
}) {
  return <AdminDashboardContext.Provider value={value}>{children}</AdminDashboardContext.Provider>;
}

export function useAdminDashboard(): AdminDashboardValue {
  const context = useContext(AdminDashboardContext);
  if (context === undefined) {
    throw new Error('useAdminDashboard precisa estar dentro de AdminDashboardProvider');
  }
  return context;
}
