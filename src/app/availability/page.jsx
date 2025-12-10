"use client";

import { MainLayout } from "@/components/layout/main-layout";
import { ProtectedRoute } from "@/components/protected-route";
import { AvailabilityClient } from "@/components/availability/availability-client";
import { RoleGate } from "@/components/rbac/role-gate";

export default function AvailabilityPage() {
  return (
    <ProtectedRoute>
      <MainLayout>
        <RoleGate allowedRoles={["STUDENT", "INSTRUCTOR", "ADMIN"]}>
          <AvailabilityClient />
        </RoleGate>
      </MainLayout>
    </ProtectedRoute>
  );
}
