"use client";

import { useState } from "react";
import Link from "next/link";
import { Loader2, Unplug } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { MainLayout } from "@/components/layout/main-layout";
import { ProtectedRoute } from "@/components/protected-route";
import { RoleGate } from "@/components/rbac/role-gate";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { quickBooksAPI } from "@/lib/api";

function DisconnectClient() {
  const router = useRouter();
  const [disconnecting, setDisconnecting] = useState(false);

  const disconnect = async () => {
    try {
      setDisconnecting(true);
      const response = await quickBooksAPI.disconnect();
      if (response.data.warning) toast.warning(response.data.warning);
      else toast.success("QuickBooks disconnected");
      router.replace("/settings/integrations/quickbooks");
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not disconnect QuickBooks");
      setDisconnecting(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-lg items-center">
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Unplug className="h-5 w-5" />Disconnect QuickBooks</CardTitle>
          <CardDescription>This removes the school&apos;s authorization and stored QuickBooks connection tokens.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Existing portal purchases and accounting records will not be deleted.</p>
        </CardContent>
        <CardFooter className="flex flex-wrap justify-end gap-3">
          <Button variant="outline" asChild disabled={disconnecting}>
            <Link href="/settings/integrations/quickbooks">Cancel</Link>
          </Button>
          <Button variant="destructive" onClick={disconnect} disabled={disconnecting}>
            {disconnecting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Disconnect
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}

export default function QuickBooksDisconnectPage() {
  return (
    <ProtectedRoute>
      <RoleGate allowedRoles={["ADMIN"]}>
        <MainLayout><DisconnectClient /></MainLayout>
      </RoleGate>
    </ProtectedRoute>
  );
}
