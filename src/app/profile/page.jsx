'use client';

import { MainLayout } from '@/components/layout/main-layout';
import { ProtectedRoute } from '@/components/protected-route';
import { ProfileClient } from '@/components/profile/profile-client';

export default function ProfilePage() {
  return (
    <ProtectedRoute>
      <MainLayout>
        <ProfileClient />
      </MainLayout>
    </ProtectedRoute>
  );
}
