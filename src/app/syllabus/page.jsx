'use client'

import { SyllabusClient } from '@/components/syllabus/syllabus-client';
import { MainLayout } from '@/components/layout/main-layout';

export default function SyllabusPage() {
  return (
    <MainLayout>
      <SyllabusClient />
    </MainLayout>
  );
}
