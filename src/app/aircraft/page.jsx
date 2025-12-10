"use client"

import { MainLayout } from '@/components/layout/main-layout';
import { ProtectedRoute } from '@/components/protected-route';
import { AircraftClient } from '@/components/aircraft/aircraft-client';

export default function AircraftPage() {
  return (
    <ProtectedRoute>
      <MainLayout>
        <AircraftClient />
      </MainLayout>
    </ProtectedRoute>
  );
}
