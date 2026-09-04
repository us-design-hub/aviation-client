"use client";

import { useEffect, useRef, useState } from "react";
import { CheckCircle2, CreditCard } from "lucide-react";
import { billingAPI } from "@/lib/api";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
const formatDate = (value) => value ? new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short", timeZone: "America/New_York" }).format(new Date(value)) : "-";

function paymentDeviceId() {
  const key = "wings_payment_device_id";
  let id = window.localStorage.getItem(key);
  if (!id) {
    id = window.crypto?.randomUUID?.() || `web-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    window.localStorage.setItem(key, id);
  }
  return id;
}

let recaptchaLoader;
function loadRecaptcha() {
  if (typeof window === "undefined") return Promise.reject(new Error("Verification is unavailable."));
  if (window.grecaptcha) return Promise.resolve(window.grecaptcha);
  if (!recaptchaLoader) {
    recaptchaLoader = new Promise((resolve, reject) => {
      const existing = document.querySelector('script[data-wings-recaptcha]');
      const script = existing || document.createElement("script");
      if (!existing) {
        script.src = "https://www.google.com/recaptcha/api.js?render=explicit";
        script.async = true;
        script.defer = true;
        script.dataset.wingsRecaptcha = "true";
        document.head.appendChild(script);
      }
      script.addEventListener("load", () => resolve(window.grecaptcha), { once: true });
      script.addEventListener("error", () => reject(new Error("Verification could not load.")), { once: true });
    });
  }
  return recaptchaLoader;
}

export function PaymentDialog({ open, onOpenChange, purchase, selection, catalog, onSuccess }) {
  const captchaRef = useRef(null);
  const widgetRef = useRef(null);
  const [captchaToken, setCaptchaToken] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [receipt, setReceipt] = useState(null);
  const [card, setCard] = useState({ name: "", number: "", expMonth: "", expYear: "", cvc: "", streetAddress: "", city: "", region: "", postalCode: "" });

  useEffect(() => {
    if (!open || !catalog?.recaptchaSiteKey || !captchaRef.current || widgetRef.current !== null) return;
    let active = true;
    loadRecaptcha().then((grecaptcha) => grecaptcha.ready(() => {
      if (!active || !captchaRef.current || widgetRef.current !== null) return;
      widgetRef.current = grecaptcha.render(captchaRef.current, {
        sitekey: catalog.recaptchaSiteKey,
        callback: setCaptchaToken,
        "expired-callback": () => setCaptchaToken(""),
        "error-callback": () => setError("Verification could not load."),
      });
    })).catch((loadError) => setError(loadError.message));
    return () => { active = false; };
  }, [open, catalog?.recaptchaSiteKey]);

  useEffect(() => {
    if (open) return;
    setError("");
    setReceipt(null);
    setCaptchaToken("");
    if (window.grecaptcha && widgetRef.current !== null) window.grecaptcha.reset(widgetRef.current);
  }, [open]);

  const setField = (field, value) => setCard((current) => ({ ...current, [field]: value }));
  const amountCents = purchase?.amount_cents ?? selection?.amountCents ?? 0;
  const description = purchase?.package_name ?? selection?.name ?? "Package purchase";

  const submit = async () => {
    setSubmitting(true);
    setError("");
    try {
      let target = purchase;
      if (!target) {
        const created = await billingAPI.createPurchase({ packageId: selection.packageId, customHours: selection.customHours });
        target = created.data;
      }
      const response = await billingAPI.payPurchase(target.id, {
        recaptchaToken: captchaToken,
        deviceId: paymentDeviceId(),
        card: {
          name: card.name,
          number: card.number,
          expMonth: card.expMonth,
          expYear: card.expYear,
          cvc: card.cvc,
          address: { streetAddress: card.streetAddress, city: card.city, region: card.region, postalCode: card.postalCode },
        },
      });
      setReceipt(response.data.receipt);
      setCard({ name: "", number: "", expMonth: "", expYear: "", cvc: "", streetAddress: "", city: "", region: "", postalCode: "" });
      await onSuccess?.();
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Payment could not be processed.");
      setCaptchaToken("");
      if (window.grecaptcha && widgetRef.current !== null) window.grecaptcha.reset(widgetRef.current);
    } finally {
      setSubmitting(false);
    }
  };

  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
      <DialogHeader>
        <DialogTitle>{receipt ? "Payment Complete" : "Secure Payment"}</DialogTitle>
        <DialogDescription>{description} · {money.format(Number(amountCents) / 100)}</DialogDescription>
      </DialogHeader>
      {!receipt && <p className="text-xs text-muted-foreground">Payment services are provided by Intuit Payments Inc.</p>}
      {receipt ? <div className="space-y-4 py-4">
        <div className="flex items-center gap-3 text-green-700"><CheckCircle2 className="h-6 w-6" /><span className="font-semibold">Payment captured</span></div>
        <div className="space-y-2 border-y py-4 text-sm">
          <div className="flex justify-between gap-4"><span className="text-muted-foreground">Receipt</span><span className="font-medium">{receipt.receiptNumber}</span></div>
          <div className="flex justify-between gap-4"><span className="text-muted-foreground">Payment method</span><span className="font-medium">{receipt.paymentMethod}</span></div>
          <div className="flex justify-between gap-4"><span className="text-muted-foreground">Payment amount</span><span className="font-medium">{money.format(receipt.paymentAmountCents / 100)}</span></div>
          <div className="flex justify-between gap-4"><span className="text-muted-foreground">Fees</span><span>{money.format(receipt.feesCents / 100)}</span></div>
          <div className="flex justify-between gap-4"><span className="text-muted-foreground">Total amount</span><span className="font-medium">{money.format(receipt.totalAmountCents / 100)}</span></div>
          <div className="flex justify-between gap-4"><span className="text-muted-foreground">Date</span><span>{formatDate(receipt.transactionDate)}</span></div>
          <div className="flex justify-between gap-4"><span className="text-muted-foreground">Transaction</span><span className="break-all text-right font-mono text-xs">{receipt.transactionId}</span></div>
        </div>
        <p className="text-xs text-muted-foreground">{receipt.processorDisclosure}</p>
        <p className="text-sm text-muted-foreground">This receipt remains available from Billing under Transactions.</p>
      </div> : <div className="space-y-4">
        {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
        <div className="space-y-2"><Label htmlFor="card-name">Name on card</Label><Input id="card-name" autoComplete="cc-name" value={card.name} onChange={(event) => setField("name", event.target.value)} /></div>
        <div className="space-y-2"><Label htmlFor="card-number">Card number</Label><Input id="card-number" inputMode="numeric" autoComplete="cc-number" maxLength={23} value={card.number} onChange={(event) => setField("number", event.target.value)} /></div>
        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-2"><Label htmlFor="exp-month">Month</Label><Input id="exp-month" inputMode="numeric" autoComplete="cc-exp-month" maxLength={2} placeholder="MM" value={card.expMonth} onChange={(event) => setField("expMonth", event.target.value)} /></div>
          <div className="space-y-2"><Label htmlFor="exp-year">Year</Label><Input id="exp-year" inputMode="numeric" autoComplete="cc-exp-year" maxLength={4} placeholder="YYYY" value={card.expYear} onChange={(event) => setField("expYear", event.target.value)} /></div>
          <div className="space-y-2"><Label htmlFor="card-cvc">CVC</Label><Input id="card-cvc" type="password" inputMode="numeric" autoComplete="cc-csc" maxLength={4} value={card.cvc} onChange={(event) => setField("cvc", event.target.value)} /></div>
        </div>
        <div className="space-y-2"><Label htmlFor="card-address">Billing address</Label><Input id="card-address" autoComplete="billing street-address" value={card.streetAddress} onChange={(event) => setField("streetAddress", event.target.value)} /></div>
        <div className="grid gap-3 sm:grid-cols-[1fr_90px_120px]">
          <div className="space-y-2"><Label htmlFor="card-city">City</Label><Input id="card-city" autoComplete="billing address-level2" value={card.city} onChange={(event) => setField("city", event.target.value)} /></div>
          <div className="space-y-2"><Label htmlFor="card-state">State</Label><Input id="card-state" autoComplete="billing address-level1" maxLength={2} value={card.region} onChange={(event) => setField("region", event.target.value.toUpperCase())} /></div>
          <div className="space-y-2"><Label htmlFor="card-zip">ZIP code</Label><Input id="card-zip" autoComplete="billing postal-code" value={card.postalCode} onChange={(event) => setField("postalCode", event.target.value)} /></div>
        </div>
        <div ref={captchaRef} className="min-h-[78px]" />
        <p className="text-xs text-muted-foreground">Card details are sent for this transaction only and are not saved by Wings CRM.</p>
      </div>}
      <DialogFooter>
        {receipt ? <Button onClick={() => onOpenChange(false)}>Done</Button> : <Button onClick={submit} disabled={submitting || !captchaToken}><CreditCard className="h-4 w-4" />{submitting ? "Processing..." : `Pay ${money.format(Number(amountCents) / 100)}`}</Button>}
      </DialogFooter>
    </DialogContent>
  </Dialog>;
}
