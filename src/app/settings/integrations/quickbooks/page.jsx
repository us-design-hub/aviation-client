"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Activity, AlertCircle, ArrowLeft, CheckCircle2, CreditCard, Loader2, RefreshCw, Unplug } from "lucide-react";
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
  const [checking, setChecking] = useState(false);
  const [logs, setLogs] = useState([]);

  const loadStatus = useCallback(async () => {
    try {
      setLoading(true);
      const [statusResponse, logsResponse] = await Promise.all([
        quickBooksAPI.getStatus(),
        quickBooksAPI.getLogs(),
      ]);
      setStatus(statusResponse.data);
      setLogs(logsResponse.data);
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

  const runDiagnostics = async () => {
    try {
      setChecking(true);
      const response = await quickBooksAPI.runDiagnostics();
      const company = response.data.companyName ? ` for ${response.data.companyName}` : "";
      toast.success(`QuickBooks connection verified${company}`);
      await loadStatus();
    } catch (error) {
      toast.error(error.response?.data?.message || "QuickBooks diagnostics failed");
      await loadStatus();
    } finally {
      setChecking(false);
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
              <Badge variant={status.reconnectRequired ? "destructive" : status.connected ? "default" : "secondary"}>
                {status.reconnectRequired ? "Reconnect required" : status.connected ? "Connected" : "Not connected"}
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
              <div className={`flex gap-3 rounded-md border p-4 ${status.reconnectRequired ? "border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/30" : status.connected ? "border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950/30" : ""}`}>
                {status.connected
                  ? <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-green-600" />
                  : <AlertCircle className={`mt-0.5 h-5 w-5 shrink-0 ${status.reconnectRequired ? "text-red-600" : "text-amber-600"}`} />}
                <div className="min-w-0">
                  <p className="font-medium">
                    {status.reconnectRequired
                      ? "QuickBooks must be reconnected"
                      : status.connected ? "QuickBooks is connected" : "QuickBooks is not connected"}
                  </p>
                  {status.reconnectRequired && (
                    <p className="mt-1 text-sm text-red-700 dark:text-red-300">
                      {status.connectionError || "Authorization is no longer valid. Reconnect QuickBooks to continue."}
                    </p>
                  )}
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
                  {status.connected || status.reconnectRequired ? "Reconnect QuickBooks" : "Connect QuickBooks"}
                </Button>
                <Button
                  variant="outline"
                  onClick={runDiagnostics}
                  disabled={!status.connected || checking}
                >
                  {checking ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Activity className="mr-2 h-4 w-4" />}
                  Test connection
                </Button>
                {status.connected && (
                  <Button variant="outline" asChild>
                    <Link href="/settings/integrations/quickbooks/disconnect">
                      <Unplug className="mr-2 h-4 w-4" />Disconnect
                    </Link>
                  </Button>
                )}
              </div>

              <div className="border-t pt-5">
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4" />
                  <h2 className="font-semibold">Recent Intuit diagnostics</h2>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  Sanitized request results and Intuit troubleshooting IDs from the last 90 days.
                </p>
                {logs.length ? (
                  <div className="mt-4 overflow-x-auto rounded-md border">
                    <table className="w-full min-w-[640px] text-left text-sm">
                      <thead className="bg-muted/60 text-xs uppercase text-muted-foreground">
                        <tr>
                          <th className="px-3 py-2 font-medium">Time</th>
                          <th className="px-3 py-2 font-medium">Operation</th>
                          <th className="px-3 py-2 font-medium">Status</th>
                          <th className="px-3 py-2 font-medium">Intuit TID</th>
                          <th className="px-3 py-2 font-medium">Result</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {logs.map((log) => (
                          <tr key={log.id}>
                            <td className="whitespace-nowrap px-3 py-2 text-muted-foreground">
                              {new Date(`${log.created_at.replace(" ", "T")}Z`).toLocaleString()}
                            </td>
                            <td className="whitespace-nowrap px-3 py-2 font-medium">{log.operation}</td>
                            <td className="px-3 py-2">{log.status_code || "Network"}</td>
                            <td className="max-w-48 break-all px-3 py-2 font-mono text-xs">{log.intuit_tid || "-"}</td>
                            <td className="max-w-72 px-3 py-2 text-muted-foreground">
                              {log.error_message || "Successful"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="mt-4 text-sm text-muted-foreground">No Intuit requests have been recorded yet.</p>
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
