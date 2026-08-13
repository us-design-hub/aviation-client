"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertCircle, CheckCircle2, Clock3, CreditCard, DollarSign, Plane, ReceiptText, WalletCards } from "lucide-react";
import { billingAPI } from "@/lib/api";
import { useAuth } from "@/contexts/auth-context";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PackageManager } from "@/components/billing/package-manager";

const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
const formatMoney = (cents = 0) => money.format(Number(cents || 0) / 100);
const formatDate = (value) => value ? new Intl.DateTimeFormat("en-US", {
  month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit", timeZone: "America/New_York",
}).format(new Date(value)) : "-";

function SummaryCard({ label, value, icon: Icon, tone = "text-foreground" }) {
  return <Card><CardContent className="flex items-center justify-between p-5"><div><p className="text-sm text-muted-foreground">{label}</p><p className={`mt-1 text-2xl font-bold ${tone}`}>{value}</p></div><Icon className={`h-5 w-5 ${tone}`} /></CardContent></Card>;
}

function StatusBadge({ status }) {
  const colors = { PAID: "border-green-200 bg-green-50 text-green-700", PENDING: "border-amber-200 bg-amber-50 text-amber-700", CANCELED: "border-gray-200 bg-gray-50 text-gray-600", FAILED: "border-red-200 bg-red-50 text-red-700", BLOCKED: "border-red-200 bg-red-50 text-red-700", WARNING: "border-amber-200 bg-amber-50 text-amber-700" };
  return <Badge variant="outline" className={colors[status] || ""}>{status}</Badge>;
}

function CustomerBilling({ catalog, summary, refresh }) {
  const { user } = useAuth();
  const [customHours, setCustomHours] = useState("");
  const [submitting, setSubmitting] = useState(null);
  const flight = summary?.flightHours || {};
  const credits = summary?.instructionCredits || {};
  const debt = summary?.instructionBilling || {};
  const pending = (summary?.purchases || []).filter((item) => item.status === "PENDING");

  const requestPurchase = async (packageId, hours) => {
    try {
      setSubmitting(packageId);
      await billingAPI.createPurchase({ packageId, customHours: hours });
      toast.success("Purchase request created");
      await refresh();
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not create purchase request");
    } finally {
      setSubmitting(null);
    }
  };
  const cancelPurchase = async (id) => {
    try { await billingAPI.cancelPurchase(id); toast.success("Pending purchase canceled"); await refresh(); }
    catch (error) { toast.error(error.response?.data?.message || "Could not cancel purchase"); }
  };

  return <Tabs defaultValue="balances" className="space-y-5">
    <TabsList><TabsTrigger value="balances">Balances</TabsTrigger><TabsTrigger value="purchase">Purchase Hours</TabsTrigger><TabsTrigger value="transactions">Transactions</TabsTrigger></TabsList>
    <TabsContent value="balances" className="space-y-5">
      {pending.length > 0 && <Alert><Clock3 className="h-4 w-4" /><AlertDescription>{pending.length} purchase {pending.length === 1 ? "is" : "are"} awaiting payment confirmation. Balances update after payment is confirmed.</AlertDescription></Alert>}
      {debt.status === "WARNING" && <Alert className="border-amber-300"><AlertCircle className="h-4 w-4" /><AlertDescription>You have {debt.outstandingHours?.toFixed?.(1)} unpaid instructor hours. The warning threshold is {debt.warningThreshold} hours.</AlertDescription></Alert>}
      {debt.status === "BLOCKED" && <Alert className="border-red-300"><AlertCircle className="h-4 w-4" /><AlertDescription>Flight scheduling is blocked at {debt.blockThreshold} unpaid instructor hours until your balance is reduced.</AlertDescription></Alert>}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <SummaryCard label="Available Aircraft Hours" value={`${flight.hoursRemaining?.toFixed?.(1) || "0.0"} hrs`} icon={Plane} />
        {user?.role === "STUDENT" && <SummaryCard label="Flight Instruction Credit" value={`${credits.flight?.availableHours?.toFixed?.(1) || "0.0"} hrs`} icon={WalletCards} />}
        {user?.role === "STUDENT" && <SummaryCard label="Ground Instruction Credit" value={`${credits.ground?.availableHours?.toFixed?.(1) || "0.0"} hrs`} icon={ReceiptText} />}
        {user?.role === "STUDENT" && <SummaryCard label="Flight Instruction Due" value={`${debt.flight?.outstandingHours?.toFixed?.(1) || "0.0"} hrs · ${formatMoney(debt.flight?.outstandingAmountCents)}`} icon={DollarSign} tone={debt.status === "BLOCKED" ? "text-red-600" : "text-foreground"} />}
        {user?.role === "STUDENT" && <SummaryCard label="Ground Instruction Due" value={`${debt.ground?.outstandingHours?.toFixed?.(1) || "0.0"} hrs · ${formatMoney(debt.ground?.outstandingAmountCents)}`} icon={DollarSign} tone={debt.status === "BLOCKED" ? "text-red-600" : "text-foreground"} />}
      </div>
    </TabsContent>
    <TabsContent value="purchase" className="space-y-8">
      {!catalog.paymentGatewayConfigured && <Alert><CreditCard className="h-4 w-4" /><AlertDescription>Online checkout will be enabled with QuickBooks. For now, submit a purchase request and staff can confirm payment.</AlertDescription></Alert>}
      <section className="space-y-3"><div><h2 className="text-lg font-semibold">Wet Aircraft Hours</h2><p className="text-sm text-muted-foreground">Fuel is included in every published rate.</p></div><div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">{(catalog.wetRates || []).map((item) => <Card key={item.id}><CardHeader className="pb-2"><CardTitle className="text-base">{item.name}</CardTitle></CardHeader><CardContent className="space-y-3"><div><p className="text-2xl font-bold">{formatMoney(item.amountCents)}</p><p className="text-sm text-muted-foreground">{formatMoney(item.rateCents)}/hr wet · {item.hours} {item.hours === 1 ? "hour" : "hours"}</p></div><Button className="w-full" onClick={() => requestPurchase(item.id)} disabled={Boolean(submitting)}>{submitting === item.id ? "Submitting..." : "Request Purchase"}</Button></CardContent></Card>)}</div>
        {catalog.customHoursEnabled && <div className="flex max-w-md items-end gap-3"><div className="flex-1 space-y-2"><Label htmlFor="custom-hours">Custom aircraft hours</Label><Input id="custom-hours" type="number" min="0.1" max="500" step="0.1" value={customHours} onChange={(event) => setCustomHours(event.target.value)} placeholder="Enter hours" /></div><Button variant="outline" onClick={() => requestPurchase("CUSTOM_HOURS", customHours)} disabled={!customHours || Boolean(submitting)}>Request</Button></div>}
      </section>
      {user?.role === "STUDENT" && <section className="space-y-3"><div><h2 className="text-lg font-semibold">Training Packages</h2><p className="text-sm text-muted-foreground">Aircraft, instruction, materials, tests, and checkride allocations.</p></div><div className="grid gap-4 lg:grid-cols-3">{(catalog.trainingPackages || []).map((item) => <Card key={item.id}><CardHeader className="pb-2"><CardTitle className="text-base">{item.name}</CardTitle></CardHeader><CardContent className="space-y-3"><p className="text-2xl font-bold">{formatMoney(item.amountCents)}</p><div className="space-y-1 text-sm text-muted-foreground"><p>{item.aircraftHours} aircraft hrs at {formatMoney(item.aircraftRateCents)}/hr</p><p>{item.flightInstructionHours} flight instruction hrs at {formatMoney(item.flightInstructionRateCents)}/hr</p><p>{item.groundInstructionHours} ground instruction hrs at {formatMoney(item.groundInstructionRateCents)}/hr</p>{(item.includedFees || []).map((fee) => <p key={fee.label}>{fee.label}: {formatMoney(fee.amountCents)}</p>)}</div><Button className="w-full" onClick={() => requestPurchase(item.id)} disabled={Boolean(submitting)}>{submitting === item.id ? "Submitting..." : "Request Package"}</Button></CardContent></Card>)}</div></section>}
    </TabsContent>
    <TabsContent value="transactions" className="space-y-8">
      <section><h2 className="text-lg font-semibold">Package Purchases</h2>{(summary?.purchases || []).length === 0 ? <p className="mt-2 text-sm text-muted-foreground">No package purchases yet.</p> : summary.purchases.map((item) => <div key={item.id} className="flex flex-col justify-between gap-3 border-b py-4 sm:flex-row sm:items-center"><div><p className="font-medium">{item.package_name}</p><p className="text-sm text-muted-foreground">{formatDate(item.created_at)} · {formatMoney(item.amount_cents)}</p></div><div className="flex items-center gap-2"><StatusBadge status={item.status} />{item.status === "PENDING" && <Button size="sm" variant="outline" onClick={() => cancelPurchase(item.id)}>Cancel</Button>}</div></div>)}</section>
      <section><h2 className="text-lg font-semibold">Aircraft Hour Ledger</h2>{(flight.transactions || []).length === 0 ? <p className="mt-2 text-sm text-muted-foreground">No aircraft-hour transactions yet.</p> : flight.transactions.map((entry) => <div key={entry.id} className="flex justify-between border-b py-3"><div><p className="font-medium">{entry.transaction_type.replaceAll("_", " ")}</p><p className="text-sm text-muted-foreground">{entry.note || "Aircraft hour balance"} · {formatDate(entry.created_at)}</p></div><p className="font-medium">{Number(entry.delta_hours) > 0 ? "+" : ""}{Number(entry.delta_hours).toFixed(1)} hrs</p></div>)}</section>
      {user?.role === "STUDENT" && <section><h2 className="text-lg font-semibold">Instruction Credit Ledger</h2>{(credits.entries || []).length === 0 ? <p className="mt-2 text-sm text-muted-foreground">No instruction-credit transactions yet.</p> : credits.entries.map((entry) => <div key={entry.id} className="flex justify-between border-b py-3"><div><p className="font-medium">{entry.instruction_type} · {entry.transaction_type.replaceAll("_", " ")}</p><p className="text-sm text-muted-foreground">{entry.note || "Instruction credit"} · {formatDate(entry.created_at)}</p></div><p className="font-medium">{Number(entry.delta_hours) > 0 ? "+" : ""}{Number(entry.delta_hours).toFixed(1)} hrs</p></div>)}</section>}
      {user?.role === "STUDENT" && <section><h2 className="text-lg font-semibold">Instructor Invoice Ledger</h2>{(debt.entries || []).length === 0 ? <p className="mt-2 text-sm text-muted-foreground">No instructor invoices or payments yet.</p> : debt.entries.map((entry) => <div key={entry.id} className="flex justify-between border-b py-3"><div><p className="font-medium">{entry.entry_type}{entry.instruction_type ? ` · ${entry.instruction_type}` : ""}</p><p className="text-sm text-muted-foreground">{entry.note || "Instructor account"} · {formatDate(entry.created_at)}</p></div><div className="text-right"><p className="font-medium">{formatMoney(entry.amount_cents)}</p><p className="text-xs text-muted-foreground">{Number(entry.delta_hours) > 0 ? "+" : ""}{Number(entry.delta_hours).toFixed(1)} hrs</p></div></div>)}</section>}
    </TabsContent>
  </Tabs>;
}

function InstructorPayables({ payables }) {
  const own = payables?.instructors?.[0];
  if (own?.flight && own?.ground) {
    return <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <SummaryCard label="Flight Instruction Owed" value={`${own.flight.outstandingHours.toFixed(1)} hrs · ${formatMoney(own.flight.outstandingAmountCents)}`} icon={Plane} />
        <SummaryCard label="Ground Instruction Owed" value={`${own.ground.outstandingHours.toFixed(1)} hrs · ${formatMoney(own.ground.outstandingAmountCents)}`} icon={ReceiptText} />
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <SummaryCard label="Total Earned" value={formatMoney(own.earnedAmountCents)} icon={ReceiptText} />
        <SummaryCard label="Payments Received" value={formatMoney(own.paidAmountCents)} icon={CheckCircle2} />
        <SummaryCard label="Total Owed" value={formatMoney(own.outstandingAmountCents)} icon={DollarSign} />
      </div>
      <section><h2 className="mb-3 text-lg font-semibold">Earnings and Payments</h2>{(payables?.entries || []).length === 0 ? <p className="text-sm text-muted-foreground">No instructor earnings recorded yet.</p> : payables.entries.map((entry) => <div key={entry.id} className="flex justify-between border-b py-3"><div><p className="font-medium">{entry.entry_type === "EARNING" ? `${entry.instruction_type} instruction` : `${entry.entry_type}${entry.instruction_type ? ` · ${entry.instruction_type}` : ""}`}</p><p className="text-sm text-muted-foreground">{entry.student_name || entry.note || "Instructor account"} · {formatDate(entry.created_at)}</p></div><p className={entry.delta_amount_cents < 0 ? "text-green-700" : ""}>{formatMoney(entry.delta_amount_cents)}</p></div>)}</section>
    </div>;
  }
  return <div className="space-y-5"><div className="grid gap-4 sm:grid-cols-3"><SummaryCard label="Instruction Earned" value={formatMoney(own?.earnedAmountCents)} icon={ReceiptText} /><SummaryCard label="Payments Received" value={formatMoney(own?.paidAmountCents)} icon={CheckCircle2} /><SummaryCard label="Amount Owed" value={formatMoney(own?.outstandingAmountCents)} icon={DollarSign} /></div><section><h2 className="mb-3 text-lg font-semibold">Earnings and Payments</h2>{(payables?.entries || []).length === 0 ? <p className="text-sm text-muted-foreground">No instructor earnings recorded yet.</p> : payables.entries.map((entry) => <div key={entry.id} className="flex justify-between border-b py-3"><div><p className="font-medium">{entry.entry_type === "EARNING" ? `${entry.instruction_type} instruction` : entry.entry_type}</p><p className="text-sm text-muted-foreground">{entry.student_name || entry.note || "Instructor account"} · {formatDate(entry.created_at)}</p></div><p className={entry.delta_amount_cents < 0 ? "text-green-700" : ""}>{formatMoney(entry.delta_amount_cents)}</p></div>)}</section></div>;
}

function AdminBilling({ overview, catalog, refresh }) {
  const [payments, setPayments] = useState({});
  const [studentPayments, setStudentPayments] = useState({});
  const [saving, setSaving] = useState(null);
  const pendingPurchases = useMemo(() => (overview?.purchases || []).filter((item) => item.status === "PENDING"), [overview]);
  const debtStudents = useMemo(() => (overview?.customers || []).filter((item) => item.instructionBilling?.outstandingHours > 0), [overview]);
  const updateCustomHours = async (enabled) => { try { await billingAPI.updateConfig({ customHoursEnabled: enabled }); toast.success(`Custom hour purchases ${enabled ? "enabled" : "disabled"}`); await refresh(); } catch (error) { toast.error(error.response?.data?.message || "Could not update purchase settings"); } };
  const confirmPurchase = async (id) => { try { setSaving(id); await billingAPI.confirmPurchase(id, { gateway: "MANUAL" }); toast.success("Payment confirmed and balances allocated"); await refresh(); } catch (error) { toast.error(error.response?.data?.message || "Could not confirm payment"); } finally { setSaving(null); } };
  const payInstructor = async (instructorId) => { const form = payments[instructorId] || {}; try { setSaving(instructorId); await billingAPI.recordInstructorPayment(instructorId, { amount: form.amount, instructionType: form.instructionType, note: form.note }); toast.success("Instructor payment recorded"); setPayments((current) => ({ ...current, [instructorId]: { ...current[instructorId], amount: "", note: "" } })); await refresh(); } catch (error) { toast.error(error.response?.data?.message || "Could not record payment"); } finally { setSaving(null); } };
  const recordStudentPayment = async (userId) => { const form = studentPayments[userId] || {}; try { setSaving(`student-${userId}`); await billingAPI.recordStudentInstructionPayment(userId, { hours: form.hours, instructionType: form.instructionType || "FLIGHT", note: form.note }); toast.success("Student instructor payment recorded"); setStudentPayments((current) => ({ ...current, [userId]: { ...current[userId], hours: "", note: "" } })); await refresh(); } catch (error) { toast.error(error.response?.data?.message || "Could not record student payment"); } finally { setSaving(null); } };
  return <div className="space-y-5"><div className="flex items-center justify-between border-b pb-4"><div><p className="font-medium">Custom hour purchases</p><p className="text-sm text-muted-foreground">Allow students and renters to request quantities outside the published blocks.</p></div><Switch checked={Boolean(catalog?.customHoursEnabled)} onCheckedChange={updateCustomHours} /></div><Tabs defaultValue="payables" className="space-y-5"><TabsList className="h-auto flex-wrap justify-start"><TabsTrigger value="payables">Instructor Payables</TabsTrigger><TabsTrigger value="purchases">Pending Purchases</TabsTrigger><TabsTrigger value="debt">Student Debt</TabsTrigger><TabsTrigger value="packages">Packages</TabsTrigger></TabsList>
    <TabsContent value="payables" className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-3">
        <SummaryCard label="Instructor Earnings" value={formatMoney(overview?.payables?.totalEarnedCents)} icon={ReceiptText} />
        <SummaryCard label="Paid to Instructors" value={formatMoney(overview?.payables?.totalPaidCents)} icon={CheckCircle2} />
        <SummaryCard label="Currently Owed" value={formatMoney(overview?.payables?.totalOutstandingCents)} icon={DollarSign} />
      </div>
      {(overview?.payables?.instructors || []).map((item) => {
        const defaultType = item.flight?.outstandingAmountCents > 0 ? "FLIGHT" : "GROUND";
        const selectedType = payments[item.instructorId]?.instructionType || defaultType;
        const selectedBalance = selectedType === "GROUND" ? item.ground : item.flight;
        return <div key={item.instructorId} className="border-b py-5">
          <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="font-semibold">{item.instructorName}</p>
              <p className="text-sm text-muted-foreground">{item.earnedHours.toFixed(1)} hrs taught · {formatMoney(item.paidAmountCents)} paid</p>
              <p className="mt-1 text-sm text-muted-foreground">Flight: {item.flight.outstandingHours.toFixed(1)} hrs / {formatMoney(item.flight.outstandingAmountCents)} · Ground: {item.ground.outstandingHours.toFixed(1)} hrs / {formatMoney(item.ground.outstandingAmountCents)}</p>
            </div>
            <p className="text-lg font-bold">{formatMoney(item.outstandingAmountCents)} owed</p>
          </div>
          {item.outstandingAmountCents > 0 && <div className="grid gap-3 md:grid-cols-[170px_160px_1fr_auto]">
            <Select value={selectedType} onValueChange={(value) => setPayments((current) => ({ ...current, [item.instructorId]: { ...current[item.instructorId], instructionType: value, amount: "" } }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="FLIGHT" disabled={!item.flight?.outstandingAmountCents}>Flight ($45/hr)</SelectItem>
                <SelectItem value="GROUND" disabled={!item.ground?.outstandingAmountCents}>Ground ($30/hr)</SelectItem>
              </SelectContent>
            </Select>
            <Input type="number" min="0.01" max={(selectedBalance?.outstandingAmountCents || 0) / 100} step="0.01" placeholder="Payment amount" value={payments[item.instructorId]?.amount || ""} onChange={(event) => setPayments((current) => ({ ...current, [item.instructorId]: { ...current[item.instructorId], instructionType: selectedType, amount: event.target.value } }))} />
            <Textarea rows={1} placeholder="Payment period or reference" value={payments[item.instructorId]?.note || ""} onChange={(event) => setPayments((current) => ({ ...current, [item.instructorId]: { ...current[item.instructorId], instructionType: selectedType, note: event.target.value } }))} />
            <Button onClick={() => payInstructor(item.instructorId)} disabled={!payments[item.instructorId]?.amount || saving === item.instructorId}>Record Payment</Button>
          </div>}
        </div>;
      })}
    </TabsContent>
    <TabsContent value="purchases">{pendingPurchases.length === 0 ? <p className="text-sm text-muted-foreground">No purchases are awaiting payment.</p> : pendingPurchases.map((item) => <div key={item.id} className="flex flex-col justify-between gap-3 border-b py-4 sm:flex-row sm:items-center"><div><p className="font-medium">{item.user_name} · {item.package_name}</p><p className="text-sm text-muted-foreground">{formatDate(item.created_at)} · {formatMoney(item.amount_cents)}</p></div><Button onClick={() => confirmPurchase(item.id)} disabled={saving === item.id}>{saving === item.id ? "Confirming..." : "Confirm Paid"}</Button></div>)}</TabsContent>
    <TabsContent value="debt">{debtStudents.length === 0 ? <p className="text-sm text-muted-foreground">No students currently have instructor debt.</p> : debtStudents.map((item) => { const selectedType = studentPayments[item.id]?.instructionType || "FLIGHT"; const selectedBalance = selectedType === "GROUND" ? item.instructionBilling.ground : item.instructionBilling.flight; return <div key={item.id} className="border-b py-5"><div className="mb-3 flex flex-wrap items-start justify-between gap-3"><div><p className="font-medium">{item.name}</p><p className="text-sm text-muted-foreground">{item.email}</p></div><div className="text-right"><div className="flex items-center gap-2"><StatusBadge status={item.instructionBilling.status} /><span className="font-semibold">{item.instructionBilling.outstandingHours.toFixed(1)} hrs · {formatMoney(item.instructionBilling.outstandingAmountCents)}</span></div><p className="mt-1 text-sm text-muted-foreground">Flight: {item.instructionBilling.flight.outstandingHours.toFixed(1)} hrs / {formatMoney(item.instructionBilling.flight.outstandingAmountCents)} · Ground: {item.instructionBilling.ground.outstandingHours.toFixed(1)} hrs / {formatMoney(item.instructionBilling.ground.outstandingAmountCents)}</p></div></div><div className="grid gap-3 md:grid-cols-[170px_160px_1fr_auto]"><Select value={selectedType} onValueChange={(value) => setStudentPayments((current) => ({ ...current, [item.id]: { ...current[item.id], instructionType: value, hours: "" } }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="FLIGHT">Flight ($45/hr)</SelectItem><SelectItem value="GROUND">Ground ($30/hr)</SelectItem></SelectContent></Select><Input type="number" min="0.1" max={selectedBalance.outstandingHours} step="0.1" placeholder="Hours paid" value={studentPayments[item.id]?.hours || ""} onChange={(event) => setStudentPayments((current) => ({ ...current, [item.id]: { ...current[item.id], instructionType: selectedType, hours: event.target.value } }))} /><Textarea rows={1} placeholder="Payment reference or note" value={studentPayments[item.id]?.note || ""} onChange={(event) => setStudentPayments((current) => ({ ...current, [item.id]: { ...current[item.id], instructionType: selectedType, note: event.target.value } }))} /><Button onClick={() => recordStudentPayment(item.id)} disabled={!studentPayments[item.id]?.hours || saving === `student-${item.id}`}>{saving === `student-${item.id}` ? "Recording..." : "Record Payment"}</Button></div></div>; })}</TabsContent>
    <TabsContent value="packages"><PackageManager packages={catalog?.packages || []} refresh={refresh} /></TabsContent>
  </Tabs></div>;
}

export function BillingClient() {
  const { user } = useAuth();
  const [catalog, setCatalog] = useState({});
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    if (!user?.role) return;
    try {
      setLoading(true);
      const dataPromise = user.role === "ADMIN" ? billingAPI.getAdminOverview() : user.role === "INSTRUCTOR" ? billingAPI.getPayables() : billingAPI.getSummary();
      const [catalogResponse, dataResponse] = await Promise.all([billingAPI.getCatalog(), dataPromise]);
      setCatalog(catalogResponse.data);
      setData(dataResponse.data);
    } catch (error) { toast.error(error.response?.data?.message || "Could not load billing data"); }
    finally { setLoading(false); }
  }, [user?.role]);
  useEffect(() => { load(); }, [load]);
  if (loading) return <div className="p-6 text-sm text-muted-foreground">Loading billing...</div>;
  return <div className="mx-auto space-y-6 p-6"><div><h1 className="text-3xl font-bold">Billing</h1><p className="mt-1 text-muted-foreground">Flight hours, instructor balances, purchases, and payouts.</p></div>{user?.role === "ADMIN" ? <AdminBilling overview={data} catalog={catalog} refresh={load} /> : user?.role === "INSTRUCTOR" ? <InstructorPayables payables={data} /> : <CustomerBilling catalog={catalog} summary={data} refresh={load} />}</div>;
}
