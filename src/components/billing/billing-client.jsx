"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle, AlertTriangle, Ban, BookOpen, Check, CheckCircle2, Clock3, CreditCard,
  DollarSign, FileText, GraduationCap, Package, Plane, ReceiptText, RefreshCw,
  RotateCcw, ShieldCheck, Sparkles, TrendingUp, Users, Wallet, WalletCards,
} from "lucide-react";
import { billingAPI } from "@/lib/api";
import { useAuth } from "@/contexts/auth-context";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useConfirmDialog } from "@/components/ui/confirm-dialog";
import { PackageManager } from "@/components/billing/package-manager";
import { PaymentDialog } from "@/components/billing/payment-dialog";
import {
  BillingSkeleton, Callout, EmptyRow, ListRow, MiniStat, SectionCard, StatCard, StatusPill,
  formatDate, formatHours, formatMoney,
} from "@/components/billing/billing-ui";
import { cn } from "@/lib/utils";

function paymentOutcome(purchase) {
  if (purchase?.latest_payment_status === "SUCCEEDED" && purchase.latest_payment_type === "REFUND") return "REFUNDED";
  if (purchase?.latest_payment_status === "SUCCEEDED" && purchase.latest_payment_type === "VOID") return "VOIDED";
  if (purchase?.status === "CANCELED") return "CANCELED";
  if (purchase?.status === "PAID") return "PAID";
  if (["DECLINED", "FAILED"].includes(purchase?.latest_payment_status)) return "PAYMENT_FAILED";
  return "PENDING";
}

const ratio = (part, whole) => (Number(whole) > 0 ? (Number(part) / Number(whole)) * 100 : 0);

/** Full-width segmented tab bar; on mobile the triggers wrap instead of overflowing. */
function SegmentedTabs({ children, className }) {
  return (
    <TabsList className={cn("h-auto w-full flex-wrap justify-start gap-1 p-1 sm:w-auto", className)}>
      {children}
    </TabsList>
  );
}

function Tab({ value, icon: Icon, children }) {
  return (
    <TabsTrigger value={value} className="gap-1.5 px-3 py-1.5">
      {Icon && <Icon className="size-4" />}
      {children}
    </TabsTrigger>
  );
}

/* ------------------------------------------------------------------ *
 * Student / renter
 * ------------------------------------------------------------------ */

function CustomerBalances({ isStudent, flight, credits, debt, pending, onPayPending }) {
  const debtTone = debt.status === "BLOCKED" ? "danger" : debt.status === "WARNING" ? "warning" : "success";
  const usedPct = ratio(flight.hoursFlown, flight.totalPurchased);

  return (
    <div className="space-y-5">
      {pending.length > 0 && (
        <Callout
          tone="info"
          icon={Clock3}
          title={`${pending.length} purchase${pending.length === 1 ? "" : "s"} awaiting payment`}
          action={onPayPending && (
            <Button size="sm" onClick={onPayPending}>Complete payment</Button>
          )}
        >
          Balances update as soon as payment is confirmed.
        </Callout>
      )}

      {debt.status === "WARNING" && (
        <Callout tone="warning" icon={AlertTriangle} title="Instructor balance is getting high">
          You have {formatHours(debt.outstandingHours)} unpaid instructor hours. Scheduling is blocked
          at {debt.blockThreshold} hours.
        </Callout>
      )}

      {debt.status === "BLOCKED" && (
        <Callout tone="danger" icon={Ban} title="Flight scheduling is paused">
          You have reached {debt.blockThreshold} unpaid instructor hours. Settle part of the balance
          with your school to resume booking.
        </Callout>
      )}

      <div className={cn("grid gap-4 sm:grid-cols-2", isStudent ? "xl:grid-cols-4" : "xl:grid-cols-3")}>
        <StatCard
          label="Available Aircraft Hours"
          value={formatHours(flight.hoursRemaining)}
          unit="hrs"
          icon={Plane}
          tone="gold"
          hint={`${formatHours(flight.totalPurchased)} hrs purchased to date`}
          progress={100 - usedPct}
          progressLabel={`${formatHours(flight.hoursFlown)} hrs flown`}
        />

        {isStudent ? (
          <>
            <StatCard
              label="Flight Instruction Credit"
              value={formatHours(credits.flight?.availableHours)}
              unit="hrs"
              icon={WalletCards}
              tone="info"
              hint={`${formatHours(credits.flight?.consumedHours)} of ${formatHours(credits.flight?.purchasedHours)} hrs used`}
              progress={100 - ratio(credits.flight?.consumedHours, credits.flight?.purchasedHours)}
            />
            <StatCard
              label="Ground Instruction Credit"
              value={formatHours(credits.ground?.availableHours)}
              unit="hrs"
              icon={BookOpen}
              tone="info"
              hint={`${formatHours(credits.ground?.consumedHours)} of ${formatHours(credits.ground?.purchasedHours)} hrs used`}
              progress={100 - ratio(credits.ground?.consumedHours, credits.ground?.purchasedHours)}
            />
            <StatCard
              label="Instruction Balance Due"
              value={formatMoney(debt.outstandingAmountCents)}
              icon={DollarSign}
              tone={debtTone}
              hint={debt.outstandingHours > 0
                ? `${formatHours(debt.outstandingHours)} hrs unpaid of ${debt.blockThreshold} hr limit`
                : "Nothing outstanding"}
              progress={ratio(debt.outstandingHours, debt.blockThreshold)}
            />
          </>
        ) : (
          <>
            <StatCard
              label="Hours Flown"
              value={formatHours(flight.hoursFlown)}
              unit="hrs"
              icon={TrendingUp}
              hint="Logged against your rental bookings"
            />
            <StatCard
              label="Total Purchased"
              value={formatHours(flight.totalPurchased)}
              unit="hrs"
              icon={Wallet}
              hint={flight.manualAdjustments
                ? `Includes ${formatHours(flight.manualAdjustments)} hrs of adjustments`
                : "Across all hour blocks"}
            />
          </>
        )}
      </div>

      {isStudent && (debt.outstandingHours > 0 || debt.totalPaid > 0) && (
        <SectionCard
          title="Instructor account"
          description="Instruction is invoiced by the hour and settled directly with the school."
          icon={GraduationCap}
        >
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <MiniStat label="Flight instruction due" value={`${formatHours(debt.flight?.outstandingHours)} hrs · ${formatMoney(debt.flight?.outstandingAmountCents)}`} tone={debt.flight?.outstandingHours > 0 ? "warning" : "neutral"} />
            <MiniStat label="Ground instruction due" value={`${formatHours(debt.ground?.outstandingHours)} hrs · ${formatMoney(debt.ground?.outstandingAmountCents)}`} tone={debt.ground?.outstandingHours > 0 ? "warning" : "neutral"} />
            <MiniStat label="Invoiced to date" value={formatMoney(debt.totalInvoicedCents)} />
            <MiniStat label="Paid to date" value={formatMoney(debt.totalPaidCents)} tone="success" />
          </div>
        </SectionCard>
      )}
    </div>
  );
}

/** Wet-rate block. Highlights the cheapest per-hour option and the savings vs the standard rate. */
function WetRateCard({ item, baselineRateCents, isBestRate, disabled, busy, onCheckout }) {
  const savedPerHour = Math.max(0, Number(baselineRateCents || 0) - Number(item.rateCents || 0));

  return (
    <Card className={cn(
      "relative gap-0 overflow-hidden py-0 transition-all hover:-translate-y-0.5 hover:shadow-lg",
      isBestRate && "border-golden shadow-md",
    )}>
      {isBestRate && (
        <div className="bg-golden-gradient px-4 py-1.5 text-center text-xs font-semibold text-white">
          <Sparkles className="mr-1 inline size-3.5" />
          Best hourly rate
        </div>
      )}
      <CardContent className="flex h-full flex-col gap-4 p-5">
        <div>
          <p className="font-semibold">{item.name}</p>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {item.hours} {item.hours === 1 ? "hour" : "hours"} · fuel included
          </p>
        </div>

        <div>
          <p className="text-3xl font-bold tracking-tight tabular-nums">{formatMoney(item.amountCents)}</p>
          <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <span className="tabular-nums">{formatMoney(item.rateCents)}/hr wet</span>
            {savedPerHour > 0 && (
              <span className="rounded-full bg-emerald-500/12 px-2 py-0.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-400/15 dark:text-emerald-400">
                Save {formatMoney(savedPerHour)}/hr
              </span>
            )}
          </p>
        </div>

        <Button className="mt-auto w-full" disabled={disabled} onClick={onCheckout}>
          {busy ? "Starting..." : disabled ? "Checkout unavailable" : "Checkout"}
        </Button>
      </CardContent>
    </Card>
  );
}

function TrainingPackageCard({ item, disabled, busy, onCheckout }) {
  const lines = [
    item.aircraftHours > 0 && `${item.aircraftHours} aircraft hrs at ${formatMoney(item.aircraftRateCents)}/hr`,
    item.flightInstructionHours > 0 && `${item.flightInstructionHours} flight instruction hrs at ${formatMoney(item.flightInstructionRateCents)}/hr`,
    item.groundInstructionHours > 0 && `${item.groundInstructionHours} ground instruction hrs at ${formatMoney(item.groundInstructionRateCents)}/hr`,
    ...(item.includedFees || []).map((fee) => `${fee.label}: ${formatMoney(fee.amountCents)}`),
  ].filter(Boolean);

  return (
    <Card className="gap-0 py-0 transition-all hover:-translate-y-0.5 hover:shadow-lg">
      <CardContent className="flex h-full flex-col gap-4 p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-semibold">{item.name}</p>
            <p className="mt-0.5 text-sm text-muted-foreground">Complete training bundle</p>
          </div>
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-golden/12">
            <GraduationCap className="size-4.5 text-golden" />
          </span>
        </div>

        <p className="text-3xl font-bold tracking-tight tabular-nums">{formatMoney(item.amountCents)}</p>

        <ul className="space-y-2 border-t pt-4 text-sm text-muted-foreground">
          {lines.map((line) => (
            <li key={line} className="flex items-start gap-2">
              <Check className="mt-0.5 size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
              <span>{line}</span>
            </li>
          ))}
        </ul>

        <Button className="mt-auto w-full" disabled={disabled} onClick={onCheckout}>
          {busy ? "Starting..." : disabled ? "Checkout unavailable" : "Checkout"}
        </Button>
      </CardContent>
    </Card>
  );
}

function PurchaseTab({ isStudent, catalog, submitting, customHours, setCustomHours, onCheckout }) {
  const wetRates = useMemo(() => catalog.wetRates || [], [catalog.wetRates]);
  const gatewayOff = !catalog.paymentGatewayConfigured;
  const baselineRateCents = useMemo(
    () => wetRates.reduce((max, item) => Math.max(max, Number(item.rateCents || 0)), 0),
    [wetRates],
  );
  const bestRateId = useMemo(() => {
    const cheapest = wetRates.reduce(
      (best, item) => (best === null || Number(item.rateCents) < Number(best.rateCents) ? item : best),
      null,
    );
    return wetRates.length > 1 ? cheapest?.id : null;
  }, [wetRates]);

  return (
    <div className="space-y-8">
      {gatewayOff && (
        <Callout tone="danger" icon={CreditCard} title="Online checkout is temporarily unavailable">
          Please contact the school to purchase hours.
        </Callout>
      )}

      <section className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold">Wet Aircraft Hours</h2>
            <p className="text-sm text-muted-foreground">Fuel is included in every published rate.</p>
          </div>
          {wetRates.length > 1 && (
            <p className="text-sm text-muted-foreground">Larger blocks lower your hourly rate.</p>
          )}
        </div>

        {wetRates.length === 0 ? (
          <Card className="py-0">
            <EmptyRow icon={Plane} title="No hour blocks published" description="Ask the school to publish wet rate blocks." />
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {wetRates.map((item) => (
              <WetRateCard
                key={item.id}
                item={item}
                baselineRateCents={baselineRateCents}
                isBestRate={item.id === bestRateId}
                disabled={Boolean(submitting) || gatewayOff}
                busy={submitting === item.id}
                onCheckout={() => onCheckout(item.id)}
              />
            ))}
          </div>
        )}

        {catalog.customHoursEnabled && (
          <SectionCard
            title="Custom hour amount"
            description="Buy a specific number of hours instead of a published block."
            icon={Wallet}
          >
            <div className="flex flex-wrap items-end gap-3">
              <div className="w-full max-w-56 space-y-2">
                <Label htmlFor="custom-hours">Aircraft hours</Label>
                <Input
                  id="custom-hours"
                  type="number"
                  min="0.1"
                  max="500"
                  step="0.1"
                  value={customHours}
                  onChange={(event) => setCustomHours(event.target.value)}
                  placeholder="e.g. 7.5"
                />
              </div>
              <Button
                variant="outline"
                onClick={() => onCheckout("CUSTOM_HOURS", customHours)}
                disabled={!customHours || Boolean(submitting) || gatewayOff}
              >
                {submitting === "CUSTOM_HOURS" ? "Starting..." : "Continue to checkout"}
              </Button>
            </div>
          </SectionCard>
        )}
      </section>

      {isStudent && (catalog.trainingPackages || []).length > 0 && (
        <section className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold">Training Packages</h2>
            <p className="text-sm text-muted-foreground">
              Aircraft, instruction, materials, tests, and checkride allocations in one purchase.
            </p>
          </div>
          <div className="grid gap-4 lg:grid-cols-3">
            {catalog.trainingPackages.map((item) => (
              <TrainingPackageCard
                key={item.id}
                item={item}
                disabled={Boolean(submitting) || gatewayOff}
                busy={submitting === item.id}
                onCheckout={() => onCheckout(item.id)}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

const signedHours = (value) => `${Number(value) > 0 ? "+" : ""}${Number(value || 0).toFixed(1)} hrs`;

const deltaTone = (value) => (Number(value) > 0
  ? "text-emerald-700 dark:text-emerald-400"
  : Number(value) < 0 ? "text-foreground" : "text-muted-foreground");

function TransactionsTab({ isStudent, summary, flight, credits, debt, catalog, onPay, onCancel, onReceipts }) {
  const purchases = summary?.purchases || [];

  return (
    <div className="space-y-5">
      <SectionCard
        title="Package Purchases"
        description="Every hour block and training package on your account."
        icon={Package}
      >
        {purchases.length === 0 ? (
          <EmptyRow icon={Package} title="No purchases yet" description="Buy hours from the Purchase Hours tab to get started." />
        ) : purchases.map((item) => (
          <ListRow
            key={item.id}
            title={item.package_name}
            badge={<StatusPill status={paymentOutcome(item)} />}
            meta={`${formatDate(item.latest_payment_at || item.created_at)} · ${formatMoney(item.amount_cents)}`}
            note={paymentOutcome(item) === "PAYMENT_FAILED" ? item.latest_payment_error : null}
            actions={(
              <>
                {item.gateway === "QUICKBOOKS_PAYMENTS" && ["PAID", "REFUNDED", "VOIDED"].includes(paymentOutcome(item)) && (
                  <Button size="sm" variant="outline" onClick={() => onReceipts(item.id)}>
                    <ReceiptText className="size-4" />
                    Receipts
                  </Button>
                )}
                {item.status === "PENDING" && catalog.paymentGatewayConfigured && (
                  <Button size="sm" onClick={() => onPay(item)}>
                    {paymentOutcome(item) === "PAYMENT_FAILED" ? "Retry payment" : "Pay now"}
                  </Button>
                )}
                {item.status === "PENDING" && (
                  <Button size="sm" variant="ghost" onClick={() => onCancel(item.id)}>Cancel</Button>
                )}
              </>
            )}
          />
        ))}
      </SectionCard>

      <SectionCard
        title="Aircraft Hour Ledger"
        description="Allocations, adjustments, and hours debited by flights."
        icon={Plane}
      >
        {(flight.transactions || []).length === 0 ? (
          <EmptyRow icon={Plane} title="No aircraft-hour activity" description="Purchases and flown hours will appear here." />
        ) : flight.transactions.map((entry) => (
          <ListRow
            key={entry.id}
            title={entry.transaction_type.replaceAll("_", " ")}
            meta={`${entry.note || "Aircraft hour balance"} · ${formatDate(entry.created_at)}`}
            amount={signedHours(entry.delta_hours)}
            amountTone={deltaTone(entry.delta_hours)}
          />
        ))}
      </SectionCard>

      {isStudent && (
        <SectionCard
          title="Instruction Credit Ledger"
          description="Prepaid instruction hours purchased and consumed."
          icon={WalletCards}
        >
          {(credits.entries || []).length === 0 ? (
            <EmptyRow icon={WalletCards} title="No instruction credits yet" description="Training packages add instruction credit here." />
          ) : credits.entries.map((entry) => (
            <ListRow
              key={entry.id}
              title={`${entry.instruction_type} · ${entry.transaction_type.replaceAll("_", " ")}`}
              meta={`${entry.note || "Instruction credit"} · ${formatDate(entry.created_at)}`}
              amount={signedHours(entry.delta_hours)}
              amountTone={deltaTone(entry.delta_hours)}
            />
          ))}
        </SectionCard>
      )}

      {isStudent && (
        <SectionCard
          title="Instructor Invoice Ledger"
          description="Hourly instruction invoiced to you and payments recorded by the school."
          icon={FileText}
        >
          {(debt.entries || []).length === 0 ? (
            <EmptyRow icon={FileText} title="No instructor invoices yet" description="Completed lessons with instruction will show up here." />
          ) : debt.entries.map((entry) => (
            <ListRow
              key={entry.id}
              title={`${entry.entry_type}${entry.instruction_type ? ` · ${entry.instruction_type}` : ""}`}
              meta={`${entry.note || "Instructor account"} · ${formatDate(entry.created_at)}`}
              amount={formatMoney(entry.amount_cents)}
              amountTone={entry.entry_type === "PAYMENT" ? "text-emerald-700 dark:text-emerald-400" : undefined}
              sub={signedHours(entry.delta_hours)}
            />
          ))}
        </SectionCard>
      )}
    </div>
  );
}

function ReceiptsDialog({ receipts, onClose }) {
  return (
    <Dialog open={receipts.length > 0} onOpenChange={(value) => !value && onClose()}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Payment Receipts</DialogTitle>
          <DialogDescription>Charge, void, and refund transaction records</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {receipts.map((receipt) => (
            <section key={receipt.transactionId} className="rounded-xl border p-4 text-sm">
              <div className="flex items-start justify-between gap-3 border-b pb-3">
                <div>
                  <h3 className="font-semibold">{receipt.receiptLabel || "Payment Receipt"}</h3>
                  <p className="text-xs text-muted-foreground">{receipt.receiptNumber}</p>
                </div>
                <p className="text-lg font-bold tabular-nums">{formatMoney(receipt.totalAmountCents)}</p>
              </div>
              <dl className="space-y-2 py-3">
                {[
                  ["Description", receipt.description],
                  ["Payment method", receipt.paymentMethod || "Not available"],
                  ["Payment amount", formatMoney(receipt.paymentAmountCents)],
                  ["Fees", formatMoney(receipt.feesCents)],
                  ["Date", formatDate(receipt.transactionDate)],
                ].map(([label, value]) => (
                  <div key={label} className="flex justify-between gap-4">
                    <dt className="text-muted-foreground">{label}</dt>
                    <dd className="text-right font-medium">{value}</dd>
                  </div>
                ))}
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Transaction ID</dt>
                  <dd className="text-right font-mono text-xs break-all">{receipt.transactionId}</dd>
                </div>
              </dl>
              <p className="border-t pt-3 text-xs leading-relaxed text-muted-foreground">
                {receipt.processorDisclosure}
              </p>
            </section>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function CustomerBilling({ catalog, summary, refresh }) {
  const { user } = useAuth();
  const isStudent = user?.role === "STUDENT";
  const [customHours, setCustomHours] = useState("");
  const [submitting, setSubmitting] = useState(null);
  const [checkout, setCheckout] = useState(null);
  const [receipts, setReceipts] = useState([]);
  const [tab, setTab] = useState("balances");

  const flight = summary?.flightHours || {};
  const credits = summary?.instructionCredits || {};
  const debt = summary?.instructionBilling || {};
  const pending = (summary?.purchases || []).filter((item) => item.status === "PENDING");

  const cancelPurchase = async (id) => {
    try {
      await billingAPI.cancelPurchase(id);
      toast.success("Pending purchase canceled");
      await refresh();
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not cancel purchase");
    }
  };

  const startPurchase = async (packageId, hours) => {
    if (!catalog.paymentGatewayConfigured) {
      toast.error("Online checkout is temporarily unavailable. Please contact the school.");
      return;
    }
    try {
      setSubmitting(packageId);
      const response = await billingAPI.quotePurchase({ packageId, customHours: hours });
      setCheckout({ selection: { ...response.data, packageId, customHours: hours } });
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not start checkout");
    } finally {
      setSubmitting(null);
    }
  };

  const viewReceipts = async (id) => {
    try {
      const response = await billingAPI.getReceipts(id);
      const availableReceipts = response.data || [];
      setReceipts(availableReceipts);
      if (availableReceipts.length === 0) toast.info("No receipts are available for this purchase.");
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not load receipts");
    }
  };

  return (
    <Tabs value={tab} onValueChange={setTab} className="space-y-5">
      <SegmentedTabs>
        <Tab value="balances" icon={Wallet}>Balances</Tab>
        <Tab value="purchase" icon={CreditCard}>Purchase Hours</Tab>
        <Tab value="transactions" icon={ReceiptText}>Transactions</Tab>
      </SegmentedTabs>

      <TabsContent value="balances">
        <CustomerBalances
          isStudent={isStudent}
          flight={flight}
          credits={credits}
          debt={debt}
          pending={pending}
          onPayPending={catalog.paymentGatewayConfigured && pending.length > 0
            ? () => setCheckout({ purchase: pending[0] })
            : null}
        />
      </TabsContent>

      <TabsContent value="purchase">
        <PurchaseTab
          isStudent={isStudent}
          catalog={catalog}
          submitting={submitting}
          customHours={customHours}
          setCustomHours={setCustomHours}
          onCheckout={startPurchase}
        />
      </TabsContent>

      <TabsContent value="transactions">
        <TransactionsTab
          isStudent={isStudent}
          summary={summary}
          flight={flight}
          credits={credits}
          debt={debt}
          catalog={catalog}
          onPay={(item) => setCheckout({ purchase: item })}
          onCancel={cancelPurchase}
          onReceipts={viewReceipts}
        />
      </TabsContent>

      <PaymentDialog
        open={Boolean(checkout)}
        onOpenChange={(value) => { if (!value) { setCheckout(null); refresh(); } }}
        purchase={checkout?.purchase}
        selection={checkout?.selection}
        catalog={catalog}
        onSuccess={refresh}
      />
      <ReceiptsDialog receipts={receipts} onClose={() => setReceipts([])} />
    </Tabs>
  );
}

/* ------------------------------------------------------------------ *
 * Instructor
 * ------------------------------------------------------------------ */

function InstructorPayables({ payables }) {
  const own = payables?.instructors?.[0];
  const entries = payables?.entries || [];
  const hasSplit = Boolean(own?.flight && own?.ground);
  const paidPct = ratio(own?.paidAmountCents, own?.earnedAmountCents);

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Total Earned"
          value={formatMoney(own?.earnedAmountCents)}
          icon={TrendingUp}
          tone="gold"
          hint={own?.earnedHours ? `${formatHours(own.earnedHours)} hrs taught` : "No instruction logged yet"}
        />
        <StatCard
          label="Payments Received"
          value={formatMoney(own?.paidAmountCents)}
          icon={CheckCircle2}
          tone="success"
          progress={paidPct}
          progressLabel={`${Math.round(paidPct)}% of earnings paid out`}
        />
        <StatCard
          label="Currently Owed"
          value={formatMoney(own?.outstandingAmountCents)}
          icon={DollarSign}
          tone={own?.outstandingAmountCents > 0 ? "warning" : "neutral"}
          hint={own?.outstandingAmountCents > 0 ? "Awaiting payout from the school" : "You are fully paid up"}
        />
      </div>

      {hasSplit && (
        <SectionCard title="Outstanding by instruction type" icon={Wallet}>
          <div className="grid gap-3 sm:grid-cols-2">
            <MiniStat
              label="Flight instruction"
              value={`${formatHours(own.flight.outstandingHours)} hrs · ${formatMoney(own.flight.outstandingAmountCents)}`}
              tone={own.flight.outstandingAmountCents > 0 ? "warning" : "neutral"}
            />
            <MiniStat
              label="Ground instruction"
              value={`${formatHours(own.ground.outstandingHours)} hrs · ${formatMoney(own.ground.outstandingAmountCents)}`}
              tone={own.ground.outstandingAmountCents > 0 ? "warning" : "neutral"}
            />
          </div>
        </SectionCard>
      )}

      <SectionCard
        title="Earnings and Payments"
        description="Instruction credited to you, and payouts recorded by the school."
        icon={ReceiptText}
      >
        {entries.length === 0 ? (
          <EmptyRow icon={ReceiptText} title="No earnings recorded yet" description="Completed lessons with instruction will appear here." />
        ) : entries.map((entry) => (
          <ListRow
            key={entry.id}
            title={entry.entry_type === "EARNING"
              ? `${entry.instruction_type} instruction`
              : `${entry.entry_type}${entry.instruction_type ? ` · ${entry.instruction_type}` : ""}`}
            meta={`${entry.student_name || entry.note || "Instructor account"} · ${formatDate(entry.created_at)}`}
            amount={formatMoney(entry.delta_amount_cents)}
            amountTone={entry.delta_amount_cents < 0 ? "text-emerald-700 dark:text-emerald-400" : undefined}
          />
        ))}
      </SectionCard>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Admin
 * ------------------------------------------------------------------ */

/** Row of inputs used by both the instructor payout and student debt forms. */
function RecordPaymentForm({ typeValue, onTypeChange, options, amountField, noteField, submit }) {
  return (
    <div className="grid gap-3 rounded-lg bg-muted/40 p-3 md:grid-cols-[minmax(150px,180px)_minmax(140px,170px)_1fr_auto]">
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">Instruction type</Label>
        <Select value={typeValue} onValueChange={onTypeChange}>
          <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
          <SelectContent>
            {options.map((option) => (
              <SelectItem key={option.value} value={option.value} disabled={option.disabled}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">{amountField.label}</Label>
        {amountField.input}
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">Reference</Label>
        {noteField}
      </div>
      <div className="flex items-end">{submit}</div>
    </div>
  );
}

function InstructorPayoutCard({ item, form, setForm, saving, onSubmit }) {
  const defaultType = item.flight?.outstandingAmountCents > 0 ? "FLIGHT" : "GROUND";
  const selectedType = form?.instructionType || defaultType;
  const selectedBalance = selectedType === "GROUND" ? item.ground : item.flight;
  const update = (patch) => setForm({ ...form, instructionType: selectedType, ...patch });

  return (
    <div className="rounded-xl border p-4">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-semibold">{item.instructorName}</p>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {formatHours(item.earnedHours)} hrs taught · {formatMoney(item.paidAmountCents)} paid
          </p>
          <div className="mt-2 flex flex-wrap gap-2 text-xs">
            <span className="rounded-full bg-muted px-2.5 py-1 tabular-nums">
              Flight {formatHours(item.flight.outstandingHours)} hrs · {formatMoney(item.flight.outstandingAmountCents)}
            </span>
            <span className="rounded-full bg-muted px-2.5 py-1 tabular-nums">
              Ground {formatHours(item.ground.outstandingHours)} hrs · {formatMoney(item.ground.outstandingAmountCents)}
            </span>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground">Owed</p>
          <p className={cn(
            "text-2xl font-bold tabular-nums",
            item.outstandingAmountCents > 0 ? "text-amber-700 dark:text-amber-400" : "text-emerald-700 dark:text-emerald-400",
          )}>
            {formatMoney(item.outstandingAmountCents)}
          </p>
        </div>
      </div>

      {item.outstandingAmountCents > 0 && (
        <RecordPaymentForm
          typeValue={selectedType}
          onTypeChange={(value) => setForm({ ...form, instructionType: value, amount: "" })}
          options={[
            { value: "FLIGHT", label: "Flight ($45/hr)", disabled: !item.flight?.outstandingAmountCents },
            { value: "GROUND", label: "Ground ($30/hr)", disabled: !item.ground?.outstandingAmountCents },
          ]}
          amountField={{
            label: "Payment amount",
            input: (
              <Input
                type="number"
                min="0.01"
                max={(selectedBalance?.outstandingAmountCents || 0) / 100}
                step="0.01"
                placeholder="0.00"
                value={form?.amount || ""}
                onChange={(event) => update({ amount: event.target.value })}
              />
            ),
          }}
          noteField={(
            <Textarea
              rows={1}
              className="min-h-9 resize-none"
              placeholder="Payment period or reference"
              value={form?.note || ""}
              onChange={(event) => update({ note: event.target.value })}
            />
          )}
          submit={(
            <Button onClick={onSubmit} disabled={!form?.amount || saving}>
              {saving ? "Saving..." : "Record payment"}
            </Button>
          )}
        />
      )}
    </div>
  );
}

function StudentDebtCard({ item, form, setForm, saving, onSubmit }) {
  const billing = item.instructionBilling;
  const selectedType = form?.instructionType || "FLIGHT";
  const selectedBalance = selectedType === "GROUND" ? billing.ground : billing.flight;
  const update = (patch) => setForm({ ...form, instructionType: selectedType, ...patch });

  return (
    <div className="rounded-xl border p-4">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-semibold">{item.name}</p>
          <p className="mt-0.5 text-sm text-muted-foreground">{item.email}</p>
          <div className="mt-2 flex flex-wrap gap-2 text-xs">
            <span className="rounded-full bg-muted px-2.5 py-1 tabular-nums">
              Flight {formatHours(billing.flight.outstandingHours)} hrs · {formatMoney(billing.flight.outstandingAmountCents)}
            </span>
            <span className="rounded-full bg-muted px-2.5 py-1 tabular-nums">
              Ground {formatHours(billing.ground.outstandingHours)} hrs · {formatMoney(billing.ground.outstandingAmountCents)}
            </span>
          </div>
        </div>
        <div className="text-right">
          <StatusPill status={billing.status} />
          <p className="mt-1.5 text-2xl font-bold tabular-nums">{formatMoney(billing.outstandingAmountCents)}</p>
          <p className="text-xs text-muted-foreground tabular-nums">{formatHours(billing.outstandingHours)} hrs unpaid</p>
        </div>
      </div>

      <RecordPaymentForm
        typeValue={selectedType}
        onTypeChange={(value) => setForm({ ...form, instructionType: value, hours: "" })}
        options={[
          { value: "FLIGHT", label: "Flight ($45/hr)" },
          { value: "GROUND", label: "Ground ($30/hr)" },
        ]}
        amountField={{
          label: "Hours paid",
          input: (
            <Input
              type="number"
              min="0.1"
              max={selectedBalance.outstandingHours}
              step="0.1"
              placeholder="0.0"
              value={form?.hours || ""}
              onChange={(event) => update({ hours: event.target.value })}
            />
          ),
        }}
        noteField={(
          <Textarea
            rows={1}
            className="min-h-9 resize-none"
            placeholder="Payment reference or note"
            value={form?.note || ""}
            onChange={(event) => update({ note: event.target.value })}
          />
        )}
        submit={(
          <Button onClick={onSubmit} disabled={!form?.hours || saving}>
            {saving ? "Recording..." : "Record payment"}
          </Button>
        )}
      />
    </div>
  );
}

function AdminBilling({ overview, catalog, refresh }) {
  const [payments, setPayments] = useState({});
  const [studentPayments, setStudentPayments] = useState({});
  const [saving, setSaving] = useState(null);
  const { showConfirm, ConfirmDialog } = useConfirmDialog();

  const pendingPurchases = useMemo(
    () => (overview?.purchases || []).filter((item) => item.status === "PENDING" && item.gateway !== "QUICKBOOKS_PAYMENTS"),
    [overview],
  );
  const onlinePurchases = useMemo(() => (overview?.purchases || []).filter((item) => (
    item.gateway === "QUICKBOOKS_PAYMENTS"
    && paymentOutcome(item) !== "CANCELED"
    && !(item.status === "PENDING" && !item.latest_payment_status)
  )), [overview]);
  const debtStudents = useMemo(
    () => (overview?.customers || []).filter((item) => item.instructionBilling?.outstandingHours > 0),
    [overview],
  );
  const studentDebtCents = useMemo(
    () => debtStudents.reduce((total, item) => total + Number(item.instructionBilling?.outstandingAmountCents || 0), 0),
    [debtStudents],
  );

  const updateCustomHours = async (enabled) => {
    try {
      await billingAPI.updateConfig({ customHoursEnabled: enabled });
      toast.success(`Custom hour purchases ${enabled ? "enabled" : "disabled"}`);
      await refresh();
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not update purchase settings");
    }
  };

  const confirmPurchase = async (id) => {
    try {
      setSaving(id);
      await billingAPI.confirmPurchase(id, { gateway: "MANUAL" });
      toast.success("Payment confirmed and balances allocated");
      await refresh();
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not confirm payment");
    } finally {
      setSaving(null);
    }
  };

  const reversePayment = (id, action) => {
    const isVoid = action === "void";
    showConfirm({
      title: isVoid ? "Void this payment?" : "Refund this payment?",
      description: `This reverses the charge and removes all package credits allocated by it. This cannot be undone.`,
      confirmText: isVoid ? "Void payment" : "Refund payment",
      type: "warning",
      destructive: true,
      onConfirm: async () => {
        try {
          setSaving(`${action}-${id}`);
          await (isVoid ? billingAPI.voidPurchase(id) : billingAPI.refundPurchase(id));
          toast.success(isVoid ? "Payment voided and balances reversed" : "Payment refunded and balances reversed");
          await refresh();
        } catch (error) {
          toast.error(error.response?.data?.message || `Could not ${action} payment`);
        } finally {
          setSaving(null);
        }
      },
    });
  };

  const payInstructor = async (instructorId) => {
    const form = payments[instructorId] || {};
    try {
      setSaving(instructorId);
      await billingAPI.recordInstructorPayment(instructorId, {
        amount: form.amount, instructionType: form.instructionType, note: form.note,
      });
      toast.success("Instructor payment recorded");
      setPayments((current) => ({ ...current, [instructorId]: { ...current[instructorId], amount: "", note: "" } }));
      await refresh();
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not record payment");
    } finally {
      setSaving(null);
    }
  };

  const recordStudentPayment = async (userId) => {
    const form = studentPayments[userId] || {};
    try {
      setSaving(`student-${userId}`);
      await billingAPI.recordStudentInstructionPayment(userId, {
        hours: form.hours, instructionType: form.instructionType || "FLIGHT", note: form.note,
      });
      toast.success("Student instructor payment recorded");
      setStudentPayments((current) => ({ ...current, [userId]: { ...current[userId], hours: "", note: "" } }));
      await refresh();
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not record student payment");
    } finally {
      setSaving(null);
    }
  };

  return (
    <div className="space-y-5">
      {!catalog?.paymentGatewayConfigured && (
        <Callout tone="danger" icon={AlertCircle} title="Online checkout is disabled">
          Missing backend configuration: {(catalog?.paymentConfigurationMissing || []).join(", ") || "unknown"}.
        </Callout>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Instructor Earnings"
          value={formatMoney(overview?.payables?.totalEarnedCents)}
          icon={TrendingUp}
          tone="gold"
          hint="Instruction credited across all instructors"
        />
        <StatCard
          label="Paid to Instructors"
          value={formatMoney(overview?.payables?.totalPaidCents)}
          icon={CheckCircle2}
          tone="success"
          progress={ratio(overview?.payables?.totalPaidCents, overview?.payables?.totalEarnedCents)}
          progressLabel="Share of earnings paid out"
        />
        <StatCard
          label="Owed to Instructors"
          value={formatMoney(overview?.payables?.totalOutstandingCents)}
          icon={DollarSign}
          tone={overview?.payables?.totalOutstandingCents > 0 ? "warning" : "neutral"}
          hint={overview?.payables?.totalOutstandingCents > 0 ? "Pending payout" : "All instructors settled"}
        />
        <StatCard
          label="Student Balances Due"
          value={formatMoney(studentDebtCents)}
          icon={Users}
          tone={debtStudents.length > 0 ? "info" : "neutral"}
          hint={debtStudents.length > 0
            ? `${debtStudents.length} student${debtStudents.length === 1 ? "" : "s"} with an open balance`
            : "No outstanding student balances"}
        />
      </div>

      <SectionCard title="Purchase settings" icon={Wallet}>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="font-medium">Custom hour purchases</p>
            <p className="text-sm text-muted-foreground">
              Allow students and renters to buy quantities outside the published blocks.
            </p>
          </div>
          <Switch checked={Boolean(catalog?.customHoursEnabled)} onCheckedChange={updateCustomHours} />
        </div>
      </SectionCard>

      <Tabs defaultValue="payables" className="space-y-5">
        <SegmentedTabs>
          <Tab value="payables" icon={Wallet}>Instructor Payables</Tab>
          <Tab value="purchases" icon={Clock3}>
            Pending
            {pendingPurchases.length > 0 && (
              <span className="ml-1 rounded-full bg-amber-500/15 px-1.5 text-xs font-semibold text-amber-700 tabular-nums dark:text-amber-400">
                {pendingPurchases.length}
              </span>
            )}
          </Tab>
          <Tab value="payments" icon={CreditCard}>Online Payments</Tab>
          <Tab value="debt" icon={Users}>Student Debt</Tab>
          <Tab value="packages" icon={Package}>Packages</Tab>
        </SegmentedTabs>

        <TabsContent value="payables">
          <SectionCard
            title="Instructor payouts"
            description="Record payments against the hours each instructor has taught."
            icon={Wallet}
            bodyClassName="space-y-3 px-5 py-4"
          >
            {(overview?.payables?.instructors || []).length === 0 ? (
              <EmptyRow icon={Wallet} title="No instructor earnings yet" description="Instruction from completed lessons will appear here." />
            ) : overview.payables.instructors.map((item) => (
              <InstructorPayoutCard
                key={item.instructorId}
                item={item}
                form={payments[item.instructorId]}
                setForm={(next) => setPayments((current) => ({ ...current, [item.instructorId]: next }))}
                saving={saving === item.instructorId}
                onSubmit={() => payInstructor(item.instructorId)}
              />
            ))}
          </SectionCard>
        </TabsContent>

        <TabsContent value="purchases">
          <SectionCard
            title="Awaiting payment confirmation"
            description="Purchases paid outside the online gateway. Confirming allocates the balances."
            icon={Clock3}
          >
            {pendingPurchases.length === 0 ? (
              <EmptyRow icon={CheckCircle2} title="Nothing awaiting confirmation" description="Manual purchases needing review will show up here." />
            ) : pendingPurchases.map((item) => (
              <ListRow
                key={item.id}
                title={`${item.user_name} · ${item.package_name}`}
                meta={`${formatDate(item.created_at)} · ${formatMoney(item.amount_cents)}`}
                actions={(
                  <Button onClick={() => confirmPurchase(item.id)} disabled={saving === item.id}>
                    {saving === item.id ? "Confirming..." : "Confirm paid"}
                  </Button>
                )}
              />
            ))}
          </SectionCard>
        </TabsContent>

        <TabsContent value="payments">
          <SectionCard
            title="Online payments"
            description="Charges processed through the payment gateway."
            icon={CreditCard}
          >
            {onlinePurchases.length === 0 ? (
              <EmptyRow icon={CreditCard} title="No online payments yet" description="Paid, refunded, voided, and failed payments appear here." />
            ) : onlinePurchases.map((item) => (
              <ListRow
                key={item.id}
                title={`${item.user_name} · ${item.package_name}`}
                badge={<StatusPill status={paymentOutcome(item)} />}
                meta={(
                  <>
                    {formatDate(item.latest_payment_at || item.paid_at || item.created_at)} · {formatMoney(item.amount_cents)}
                    {item.gateway_reference && (
                      <span className="mt-1 block font-mono text-xs">{item.gateway_reference}</span>
                    )}
                  </>
                )}
                note={paymentOutcome(item) === "PAYMENT_FAILED" ? item.latest_payment_error : null}
                actions={item.status === "PAID" && (
                  <>
                    <Button size="sm" variant="outline" onClick={() => reversePayment(item.id, "void")} disabled={Boolean(saving)}>
                      <Ban className="size-4" />
                      Void
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => reversePayment(item.id, "refund")} disabled={Boolean(saving)}>
                      <RotateCcw className="size-4" />
                      Refund
                    </Button>
                  </>
                )}
              />
            ))}
          </SectionCard>
        </TabsContent>

        <TabsContent value="debt">
          <SectionCard
            title="Student instructor balances"
            description="Record instruction payments students have made to the school."
            icon={Users}
            bodyClassName="space-y-3 px-5 py-4"
          >
            {debtStudents.length === 0 ? (
              <EmptyRow icon={CheckCircle2} title="No outstanding student balances" description="Students with unpaid instruction hours will appear here." />
            ) : debtStudents.map((item) => (
              <StudentDebtCard
                key={item.id}
                item={item}
                form={studentPayments[item.id]}
                setForm={(next) => setStudentPayments((current) => ({ ...current, [item.id]: next }))}
                saving={saving === `student-${item.id}`}
                onSubmit={() => recordStudentPayment(item.id)}
              />
            ))}
          </SectionCard>
        </TabsContent>

        <TabsContent value="packages">
          <PackageManager packages={catalog?.packages || []} refresh={refresh} />
        </TabsContent>
      </Tabs>

      {ConfirmDialog}
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Shell
 * ------------------------------------------------------------------ */

const SUBTITLE = {
  ADMIN: "Instructor payouts, student balances, payments, and package pricing.",
  INSTRUCTOR: "Your instruction earnings and the payouts recorded against them.",
  STUDENT: "Your flight hours, instruction credits, purchases, and balance due.",
  RENTER: "Your aircraft hour balance, purchases, and rental activity.",
};

function GatewayPill({ configured }) {
  return (
    <span className={cn(
      "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
      configured
        ? "bg-emerald-500/12 text-emerald-700 dark:bg-emerald-400/15 dark:text-emerald-400"
        : "bg-amber-500/12 text-amber-700 dark:bg-amber-400/15 dark:text-amber-400",
    )}>
      <span className={cn("size-1.5 rounded-full", configured ? "bg-emerald-500" : "bg-amber-500")} />
      {configured ? "Online payments active" : "Checkout offline"}
    </span>
  );
}

export function BillingClient() {
  const { user } = useAuth();
  const [catalog, setCatalog] = useState({});
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (showLoading = true) => {
    if (!user?.role) return;
    try {
      if (showLoading) setLoading(true);
      const dataPromise = user.role === "ADMIN"
        ? billingAPI.getAdminOverview()
        : user.role === "INSTRUCTOR"
          ? billingAPI.getPayables()
          : billingAPI.getSummary();
      const [catalogResponse, dataResponse] = await Promise.all([billingAPI.getCatalog(), dataPromise]);
      setCatalog(catalogResponse.data);
      setData(dataResponse.data);
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not load billing data");
    } finally {
      if (showLoading) setLoading(false);
    }
  }, [user?.role]);

  const refresh = useCallback(() => load(false), [load]);

  const manualRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await load(false);
    } finally {
      setRefreshing(false);
    }
  }, [load]);

  useEffect(() => { load(true); }, [load]);

  if (loading) return <BillingSkeleton />;

  const isInstructor = user?.role === "INSTRUCTOR";

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 p-4 sm:p-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Billing</h1>
          <p className="mt-1 text-muted-foreground">{SUBTITLE[user?.role] || SUBTITLE.STUDENT}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {!isInstructor && <GatewayPill configured={Boolean(catalog?.paymentGatewayConfigured)} />}
          <Button variant="outline" size="sm" onClick={manualRefresh} disabled={refreshing}>
            <RefreshCw className={cn("size-4", refreshing && "animate-spin")} />
            Refresh
          </Button>
        </div>
      </header>

      {user?.role === "ADMIN" ? (
        <AdminBilling overview={data} catalog={catalog} refresh={refresh} />
      ) : isInstructor ? (
        <InstructorPayables payables={data} />
      ) : (
        <CustomerBilling catalog={catalog} summary={data} refresh={refresh} />
      )}

      {!isInstructor && (
        <p className="flex items-center gap-1.5 border-t pt-4 text-xs text-muted-foreground">
          <ShieldCheck className="size-3.5" />
          Payment services are provided by Intuit Payments Inc. Card details are never stored by the portal.
        </p>
      )}
    </div>
  );
}
