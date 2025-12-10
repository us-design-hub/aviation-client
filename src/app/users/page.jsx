"use client";

import { MainLayout } from "@/components/layout/main-layout";
import { ProtectedRoute } from "@/components/protected-route";
import { UsersClient } from "@/components/users/users-client";
import { RoleGate } from "@/components/rbac/role-gate";

export default function UsersPage() {
  return (
    <ProtectedRoute>
      <MainLayout>
        <RoleGate allowedRoles={["ADMIN"]}>
          <UsersClient />
        </RoleGate>
      </MainLayout>
    </ProtectedRoute>
  );
}
