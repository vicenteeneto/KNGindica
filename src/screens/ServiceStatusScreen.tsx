import React from 'react';
import { NavigationProps } from '../types';
import { ServiceDashboardDetail } from '../components/ServiceDashboardDetail';

export default function ServiceStatusScreen({ onNavigate, params }: NavigationProps) {
  if (!params?.requestId) {
    return (
      <div className="flex items-center justify-center min-h-screen netflix-main-bg text-white italic">
        Solicitação não encontrada.
      </div>
    );
  }

  return (
    <ServiceDashboardDetail 
      requestId={params.requestId} 
      onNavigate={onNavigate} 
      isEmbedded={false} 
    />
  );
}
