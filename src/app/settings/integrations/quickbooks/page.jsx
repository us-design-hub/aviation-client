"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AlertCircle, ArrowLeft, CheckCircle2, CreditCard, Loader2, RefreshCw, Unplug } from "lucide-react";
import { toast } from "sonner";
import { MainLayout } from "@/components/layout/main-layout";
import { ProtectedRoute } from "@/components/protected-route";
import { RoleGate } from "@/components/rbac/role-gate";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { quickBooksAPI } from "@/lib/api";

function QuickBooksIntegrationClient() {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);

  const loadStatus = useCallback(async () => {
    try {
      setLoading(true);
      const response = await quickBooksAPI.getStatus();
      setStatus(response.data);
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not load QuickBooks status");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const result = params.get("status");
    if (result === "connected") toast.success("QuickBooks connected successfully");
    if (result === "error") toast.error(params.get("message") || "QuickBooks connection failed");
    if (result) window.history.replaceState({}, "", window.location.pathname);
    loadStatus();
  }, [loadStatus]);

  const connect = async () => {
    try {
      setConnecting(true);
      const response = await quickBooksAPI.connect();
      window.location.assign(response.data.url);
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not start QuickBooks connection");
      setConnecting(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Button variant="ghost" asChild className="-ml-3">
        <Link href="/settings"><ArrowLeft className="mr-2 h-4 w-4" />Settings</Link>
      </Button>

      <div>
        <h1 className="text-3xl font-bold">QuickBooks Integration</h1>
        <p className="mt-1 text-muted-foreground">Manage the school&apos;s QuickBooks Payments connection.</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />QuickBooks Payments
              </CardTitle>
              <CardDescription>Secure authorization for payment processing and accounting sync.</CardDescription>
            </div>
            {!loading && status && (
              <Badge variant={status.connected ? "default" : "secondary"}>
                {status.connected ? "Connected" : "Not connected"}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          {loading ? (
            <div className="flex min-h-32 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : status ? (
            <>
              <div className={`flex gap-3 rounded-md border p-4 ${status.connected ? "border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950/30" : ""}`}>
                {status.connected
                  ? <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-green-600" />
                  : <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />}
                <div className="min-w-0">
                  <p className="font-medium">{status.connected ? "QuickBooks is connected" : "QuickBooks is not connected"}</p>
                  <p className="mt-1 break-words text-sm text-muted-foreground">
                    Environment: {status.environment}
                    {status.realmId ? ` | Company ID: ${status.realmId}` : ""}
                  </p>
                  {status.connectedAt && (
                    <p className="mt-1 text-sm text-muted-foreground">Connected {new Date(status.connectedAt).toLocaleString()}</p>
                  )}
                </div>
              </div>

              {!status.configured && (
                <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100">
                  <p className="font-medium">Backend configuration required</p>
                  <p className="mt-1 break-words">Missing Railway variables: {status.missing.join(", ")}</p>
                </div>
              )}

              {status.redirectUri && (
                <div>
                  <p className="text-sm font-medium">OAuth redirect URI</p>
                  <code className="mt-2 block break-all rounded-md bg-muted p-3 text-xs">{status.redirectUri}</code>
                </div>
              )}

              <div className="flex flex-wrap gap-3">
                <Button onClick={connect} disabled={!status.configured || connecting}>
                  {connecting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                  {status.connected ? "Reconnect QuickBooks" : "Connect QuickBooks"}
                </Button>
                {status.connected && (
                  <Button variant="outline" asChild>
                    <Link href="/settings/integrations/quickbooks/disconnect">
                      <Unplug className="mr-2 h-4 w-4" />Disconnect
                    </Link>
                  </Button>
                )}
              </div>
            </>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}

export default function QuickBooksIntegrationPage() {
  return (
    <ProtectedRoute>
      <RoleGate allowedRoles={["ADMIN"]}>
        <MainLayout><QuickBooksIntegrationClient /></MainLayout>
      </RoleGate>
    </ProtectedRoute>
  );
}
