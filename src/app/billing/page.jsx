"use client";

import { MainLayout } from "@/components/layout/main-layout";
import { ProtectedRoute } from "@/components/protected-route";
import { RoleGate } from "@/components/rbac/role-gate";
import { BillingClient } from "@/components/billing/billing-client";

export default function BillingPage() {
  return (
    <ProtectedRoute>
      <MainLayout>
        <RoleGate allowedRoles={["STUDENT", "INSTRUCTOR", "ADMIN", "RENTER"]}>
          <BillingClient />
        </RoleGate>
      </MainLayout>
    </ProtectedRoute>
  );
}
