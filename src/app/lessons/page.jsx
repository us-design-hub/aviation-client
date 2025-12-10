"use client";

import { MainLayout } from "@/components/layout/main-layout";
import { ProtectedRoute } from "@/components/protected-route";
import { LessonsClient } from "@/components/lessons/lessons-client";
import { RoleGate } from "@/components/rbac/role-gate";

export default function LessonsPage() {
  return (
    <ProtectedRoute>
      <MainLayout>
        <RoleGate allowedRoles={["STUDENT", "INSTRUCTOR", "ADMIN"]}>
          <LessonsClient />
        </RoleGate>
      </MainLayout>
    </ProtectedRoute>
  );
}
