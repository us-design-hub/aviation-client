"use client";

import { MainLayout } from "@/components/layout/main-layout";
import { ProtectedRoute } from "@/components/protected-route";
import { RoleGate } from "@/components/rbac/role-gate";
import { DocumentsClient } from "@/components/rentals/documents-client";

export default function DocumentsPage() {
  return (
    <ProtectedRoute>
      <MainLayout>
        <RoleGate allowedRoles={["RENTER", "ADMIN"]}>
          <DocumentsClient />
        </RoleGate>
      </MainLayout>
    </ProtectedRoute>
  );
}
