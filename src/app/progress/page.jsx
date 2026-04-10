'use client'

import { ProgressClient } from '@/components/progress/progress-client';
import { MainLayout } from '@/components/layout/main-layout';
import { ProtectedRoute } from '@/components/protected-route';
import { RoleGate } from '@/components/rbac/role-gate';

export default function ProgressPage() {
  return (
    <ProtectedRoute>
      <MainLayout>
        <RoleGate allowedRoles={["STUDENT", "INSTRUCTOR", "ADMIN"]}>
          <ProgressClient />
        </RoleGate>
      </MainLayout>
    </ProtectedRoute>
  );
}
