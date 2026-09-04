"use client";

import { ExternalLink, LifeBuoy, Mail, Phone } from "lucide-react";
import { MainLayout } from "@/components/layout/main-layout";
import { ProtectedRoute } from "@/components/protected-route";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

function SupportClient() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="flex items-center gap-3 text-3xl font-bold">
          <LifeBuoy className="h-7 w-7" />
          Support
        </h1>
        <p className="mt-1 text-muted-foreground">Contact Wings of Angel Aviation for portal and account assistance.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Get in touch</CardTitle>
          <CardDescription>Reach the aviation team directly using any of the options below.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div>
            <p className="text-sm font-medium">Email</p>
            <a
              href="mailto:info@wingsofanangelaviation.com"
              className="mt-1 block break-all text-sm text-primary hover:underline"
            >
              info@wingsofanangelaviation.com
            </a>
          </div>
          <div>
            <p className="text-sm font-medium">Phone</p>
            <a href="tel:+18137743666" className="mt-1 block text-sm text-primary hover:underline">
              (813) 774-3666
            </a>
          </div>
          <div className="flex flex-wrap gap-3 border-t pt-5">
            <Button asChild>
              <a href="mailto:info@wingsofanangelaviation.com">
                <Mail className="mr-2 h-4 w-4" />Email support
              </a>
            </Button>
            <Button variant="outline" asChild>
              <a href="tel:+18137743666">
                <Phone className="mr-2 h-4 w-4" />Call support
              </a>
            </Button>
            <Button variant="outline" asChild>
              <a href="https://wingsofanangelaviation.com/contact/" target="_blank" rel="noopener noreferrer">
                <ExternalLink className="mr-2 h-4 w-4" />Contact form
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function SupportPage() {
  return (
    <ProtectedRoute>
      <MainLayout><SupportClient /></MainLayout>
    </ProtectedRoute>
  );
}
