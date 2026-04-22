"use client";

import { MainLayout } from "@/components/layout/main-layout";
import { ProtectedRoute } from "@/components/protected-route";
import { RoleGate } from "@/components/rbac/role-gate";
import { RentalsClient } from "@/components/rentals/rentals-client";

export default function RentalsPage() {
  return (
    <ProtectedRoute>
      <MainLayout>
        <RoleGate allowedRoles={["RENTER", "ADMIN"]}>
          <RentalsClient />
        </RoleGate>
      </MainLayout>
    </ProtectedRoute>
  );
}
