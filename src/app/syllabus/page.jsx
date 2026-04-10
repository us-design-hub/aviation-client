'use client'

import { SyllabusClient } from '@/components/syllabus/syllabus-client';
import { MainLayout } from '@/components/layout/main-layout';
import { ProtectedRoute } from '@/components/protected-route';
import { RoleGate } from '@/components/rbac/role-gate';

export default function SyllabusPage() {
  return (
    <ProtectedRoute>
      <MainLayout>
        <RoleGate allowedRoles={["INSTRUCTOR", "ADMIN"]}>
          <SyllabusClient />
        </RoleGate>
      </MainLayout>
    </ProtectedRoute>
  );
}
