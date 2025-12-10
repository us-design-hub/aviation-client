"use client"

import { SquawksClient } from "@/components/squawks/squawks-client";
import { ProtectedRoute } from "@/components/protected-route";
import { MainLayout } from "@/components/layout/main-layout";
import { RoleGate } from "@/components/rbac/role-gate";

export default function SquawksPage() {
  return (
    <ProtectedRoute>
      <MainLayout>
        <RoleGate allowedRoles={["INSTRUCTOR", "ADMIN", "MAINT"]}>
          <SquawksClient />
        </RoleGate>
      </MainLayout>
    </ProtectedRoute>
  );
}
