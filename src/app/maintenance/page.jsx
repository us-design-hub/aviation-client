"use client"

import { MaintenanceClient } from "@/components/maintenance/maintenance-client";
import { ProtectedRoute } from "@/components/protected-route";
import { MainLayout } from "@/components/layout/main-layout";
import { RoleGate } from "@/components/rbac/role-gate";

export default function MaintenancePage() {
  return (
    <ProtectedRoute>
      <MainLayout>
        <RoleGate allowedRoles={["ADMIN", "MAINT"]}>
          <MaintenanceClient />
        </RoleGate>
      </MainLayout>
    </ProtectedRoute>
  );
}
