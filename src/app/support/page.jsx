"use client";

import { MainLayout } from "@/components/layout/main-layout";
import { ProtectedRoute } from "@/components/protected-route";
import { SupportClient } from "@/components/support/support-client";

export default function SupportPage() {
  return (
    <ProtectedRoute>
      <MainLayout>
        <SupportClient />
      </MainLayout>
    </ProtectedRoute>
  );
}
