"use client";

import { MainLayout } from "@/components/layout/main-layout";
import { ProtectedRoute } from "@/components/protected-route";
import { DashboardClient } from "@/components/dashboard/dashboard-client";

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <MainLayout>
        <DashboardClient />
      </MainLayout>
    </ProtectedRoute>
  );
}
