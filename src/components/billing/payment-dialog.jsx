"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { CheckCircle2, CreditCard } from "lucide-react";
import { billingAPI } from "@/lib/api";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
const formatDate = (value) => value ? new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short", timeZone: "America/New_York" }).format(new Date(value)) : "-";
const emptyCard = { name: "", number: "", expMonth: "", expYear: "", cvc: "", streetAddress: "", city: "", region: "", postalCode: "" };

const digitsOnly = (value, maxLength) => String(value || "").replace(/\D/g, "").slice(0, maxLength);

function cardBrand(number) {
  const digits = digitsOnly(number, 19);
  if (/^3[47]/.test(digits)) return "AMEX";
  if (/^4/.test(digits)) return "VISA";
  if (/^(5[1-5]|2(2[2-9]|[3-6]\d|7[01]|720))/.test(digits)) return "MASTERCARD";
  return "UNKNOWN";
}

function formatCardNumber(value) {
  const digits = digitsOnly(value, 19);
  if (cardBrand(digits) === "AMEX") {
    return [digits.slice(0, 4), digits.slice(4, 10), digits.slice(10, 15)].filter(Boolean).join(" ");
  }
  return digits.match(/.{1,4}/g)?.join(" ") || "";
}

function passesLuhn(value) {
  const digits = digitsOnly(value, 19);
  if (digits.length < 13) return false;
  let sum = 0;
  let doubleDigit = false;
  for (let index = digits.length - 1; index >= 0; index -= 1) {
    let digit = Number(digits[index]);
    if (doubleDigit) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    doubleDigit = !doubleDigit;
  }
  return sum % 10 === 0;
}

function validateCard(card) {
  const errors = {};
  const number = digitsOnly(card.number, 19);
  const brand = cardBrand(number);
  const validLength = brand === "AMEX"
    ? number.length === 15
    : brand === "VISA"
      ? [13, 16, 19].includes(number.length)
      : number.length === 16;
  const month = Number(card.expMonth);
  const year = Number(card.expYear);
  const now = new Date();

  if (card.name.trim().length < 2) errors.name = "Enter the name shown on the card.";
  if (brand === "UNKNOWN" || !validLength || !passesLuhn(number)) {
    errors.number = "Enter a valid Visa, Mastercard, or American Express card number.";
  }
  if (!/^(0?[1-9]|1[0-2])$/.test(card.expMonth)) errors.expMonth = "Enter a month from 01 to 12.";
  if (!/^\d{4}$/.test(card.expYear)) errors.expYear = "Enter the four-digit year.";
  if (!errors.expMonth && !errors.expYear && (year < now.getFullYear() || (year === now.getFullYear() && month < now.getMonth() + 1))) {
    errors.expYear = "This card has expired.";
  }
  const expectedCvcLength = brand === "AMEX" ? 4 : 3;
  if (digitsOnly(card.cvc, 4).length !== expectedCvcLength) {
    errors.cvc = brand === "AMEX" ? "Enter the four-digit security code." : "Enter the three-digit security code.";
  }
  if (card.streetAddress.trim().length < 5) errors.streetAddress = "Enter the card billing address.";
  if (card.city.trim().length < 2) errors.city = "Enter the billing city.";
  if (!/^[A-Z]{2}$/.test(card.region)) errors.region = "Use the two-letter state code.";
  if (!/^\d{5}(-\d{4})?$/.test(card.postalCode)) errors.postalCode = "Enter a valid US ZIP code.";
  return errors;
}

function FieldError({ id, message }) {
  if (!message) return null;
  return <p id={id} className="text-xs text-destructive">{message}</p>;
}

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
let recaptchaLoaderKey;
function loadRecaptcha(siteKey, version) {
  if (typeof window === "undefined") return Promise.reject(new Error("Verification is unavailable."));
  if (window.grecaptcha) return Promise.resolve(window.grecaptcha);
  const loaderKey = `${version}:${siteKey}`;
  if (!recaptchaLoader || recaptchaLoaderKey !== loaderKey) {
    recaptchaLoaderKey = loaderKey;
    recaptchaLoader = new Promise((resolve, reject) => {
      const existing = document.querySelector('script[data-wings-recaptcha]');
      const script = existing || document.createElement("script");
      if (!existing) {
        script.src = version === "v3"
          ? `https://www.google.com/recaptcha/api.js?render=${encodeURIComponent(siteKey)}`
          : "https://www.google.com/recaptcha/api.js?render=explicit";
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
  const pendingPurchaseRef = useRef(null);
  const busyRef = useRef(false);
  const [canceling, setCanceling] = useState(false);
  const [captchaToken, setCaptchaToken] = useState("");
  const [captchaStatus, setCaptchaStatus] = useState("idle");
  const [captchaError, setCaptchaError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [receipt, setReceipt] = useState(null);
  const [card, setCard] = useState(emptyCard);
  const [touched, setTouched] = useState({});
  const [attempted, setAttempted] = useState(false);
  const recaptchaVersion = catalog?.recaptchaVersion === "v3" ? "v3" : "v2";
  const usesRecaptchaV3 = recaptchaVersion === "v3";

  useEffect(() => {
    if (!open || !captchaRef.current || (!usesRecaptchaV3 && widgetRef.current !== null)) return;
    if (!catalog?.recaptchaSiteKey) {
      setCaptchaStatus("error");
      setCaptchaError("Payment verification is not configured.");
      return;
    }
    let active = true;
    setCaptchaStatus("loading");
    setCaptchaError("");
    loadRecaptcha(catalog.recaptchaSiteKey, recaptchaVersion).then((grecaptcha) => grecaptcha.ready(() => {
      if (!active || !captchaRef.current) return;
      if (usesRecaptchaV3) {
        setCaptchaStatus("ready");
        return;
      }
      if (widgetRef.current !== null) return;
      try {
        widgetRef.current = grecaptcha.render(captchaRef.current, {
          sitekey: catalog.recaptchaSiteKey,
          callback: (token) => {
            setCaptchaToken(token);
            setCaptchaStatus("verified");
            setCaptchaError("");
          },
          "expired-callback": () => {
            setCaptchaToken("");
            setCaptchaStatus("ready");
          },
          "error-callback": () => {
            setCaptchaToken("");
            setCaptchaStatus("error");
            setCaptchaError("Payment verification could not load. Refresh the page and try again.");
          },
        });
        setCaptchaStatus("ready");
      } catch (renderError) {
        setCaptchaStatus("error");
        setCaptchaError(renderError?.message || "Payment verification could not load.");
      }
    })).catch((loadError) => {
      setCaptchaStatus("error");
      setCaptchaError(loadError.message);
    });
    return () => { active = false; };
  }, [open, catalog?.recaptchaSiteKey, recaptchaVersion, usesRecaptchaV3]);

  useEffect(() => {
    if (open) {
      pendingPurchaseRef.current = purchase || null;
      return;
    }
    pendingPurchaseRef.current = null;
    setError("");
    setReceipt(null);
    setCaptchaToken("");
    setCaptchaStatus("idle");
    setCaptchaError("");
    setTouched({});
    setAttempted(false);
    if (!usesRecaptchaV3 && window.grecaptcha && widgetRef.current !== null) {
      try { window.grecaptcha.reset(widgetRef.current); } catch {}
    }
    widgetRef.current = null;
  }, [open, purchase, usesRecaptchaV3]);

  const setField = (field, value) => {
    setCard((current) => ({ ...current, [field]: value }));
    setError("");
  };
  const markTouched = (field) => setTouched((current) => ({ ...current, [field]: true }));
  const cardErrors = validateCard(card);
  const visibleError = (field) => (attempted || touched[field]) ? cardErrors[field] : "";
  const amountCents = purchase?.amount_cents ?? selection?.amountCents ?? 0;
  const description = purchase?.package_name ?? selection?.name ?? "Package purchase";
  const isInstructionPayment = (purchase?.payment_kind || selection?.paymentKind) === "INSTRUCTION_DEBT";

  const submit = async () => {
    if (busyRef.current) return;
    setAttempted(true);
    if (Object.keys(cardErrors).length) {
      setError("Review the highlighted payment fields and try again.");
      return;
    }
    if (!usesRecaptchaV3 && !captchaToken) {
      setCaptchaError("Complete the payment verification before submitting.");
      captchaRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    busyRef.current = true;
    setSubmitting(true);
    setError("");
    try {
      let verificationToken = captchaToken;
      if (usesRecaptchaV3) {
        setCaptchaStatus("loading");
        const grecaptcha = await loadRecaptcha(catalog.recaptchaSiteKey, recaptchaVersion);
        verificationToken = await new Promise((resolve, reject) => {
          grecaptcha.ready(() => {
            grecaptcha.execute(catalog.recaptchaSiteKey, { action: "payment" }).then(resolve).catch(reject);
          });
        });
        if (!verificationToken) throw new Error("Payment verification did not return a token.");
        setCaptchaStatus("verified");
        setCaptchaError("");
      }
      let target = purchase || pendingPurchaseRef.current;
      if (!target) {
        const created = isInstructionPayment
          ? await billingAPI.createInstructionPayment({ instructionType: selection.instructionType, hours: selection.hours })
          : await billingAPI.createPurchase({ packageId: selection.packageId, customHours: selection.customHours, checkout: true });
        target = created.data;
        pendingPurchaseRef.current = target;
      }
      const paymentData = {
        recaptchaToken: verificationToken,
        deviceId: paymentDeviceId(),
        card: {
          name: card.name,
          number: card.number,
          expMonth: card.expMonth,
          expYear: card.expYear,
          cvc: card.cvc,
          address: { streetAddress: card.streetAddress, city: card.city, region: card.region, postalCode: card.postalCode },
        },
      };
      const response = isInstructionPayment
        ? await billingAPI.payInstructionPayment(target.id, paymentData)
        : await billingAPI.payPurchase(target.id, paymentData);
      setReceipt(response.data.receipt);
      setCard(emptyCard);
      setTouched({});
      setAttempted(false);
      await onSuccess?.();
    } catch (requestError) {
      setError(requestError.response?.data?.message || requestError.message || "Payment could not be processed.");
      setCaptchaToken("");
      setCaptchaStatus("ready");
      if (!usesRecaptchaV3 && window.grecaptcha && widgetRef.current !== null) {
        try { window.grecaptcha.reset(widgetRef.current); } catch {}
      }
    } finally {
      busyRef.current = false;
      setSubmitting(false);
    }
  };

  const cancelCheckout = async () => {
    if (busyRef.current) return;
    busyRef.current = true;
    setCanceling(true);
    setError("");
    try {
      const target = purchase || pendingPurchaseRef.current;
      if (target) {
        if (isInstructionPayment) await billingAPI.cancelInstructionPayment(target.id);
        else await billingAPI.cancelPurchase(target.id);
      }
      pendingPurchaseRef.current = null;
      setCard(emptyCard);
      setTouched({});
      setAttempted(false);
      onOpenChange(false);
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Could not cancel purchase. Please try again.");
    } finally {
      busyRef.current = false;
      setCanceling(false);
    }
  };

  return <Dialog open={open} onOpenChange={(value) => { if (!busyRef.current) onOpenChange(value); }}>
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
        <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Accepted payment cards">
          <Image src="/payments/visa.svg" alt="Visa" width={48} height={32} className="h-8 w-12 object-contain" />
          <Image src="/payments/mastercard.svg" alt="Mastercard" width={48} height={32} className="h-8 w-12 object-contain" />
          <Image src="/payments/american-express.svg" alt="American Express" width={48} height={32} className="h-8 w-12 object-contain" />
        </div>
        {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
        <div className="space-y-2">
          <Label htmlFor="card-name">Name on card</Label>
          <Input id="card-name" autoComplete="cc-name" aria-invalid={Boolean(visibleError("name"))} aria-describedby="card-name-error" value={card.name} onBlur={() => markTouched("name")} onChange={(event) => setField("name", event.target.value)} />
          <FieldError id="card-name-error" message={visibleError("name")} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="card-number">Card number</Label>
          <Input id="card-number" inputMode="numeric" autoComplete="cc-number" maxLength={23} placeholder="0000 0000 0000 0000" aria-invalid={Boolean(visibleError("number"))} aria-describedby="card-number-error" value={card.number} onBlur={() => markTouched("number")} onChange={(event) => setField("number", formatCardNumber(event.target.value))} />
          <FieldError id="card-number-error" message={visibleError("number")} />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-2"><Label htmlFor="exp-month">Month</Label><Input id="exp-month" inputMode="numeric" autoComplete="cc-exp-month" maxLength={2} placeholder="MM" aria-invalid={Boolean(visibleError("expMonth"))} aria-describedby="exp-month-error" value={card.expMonth} onBlur={() => markTouched("expMonth")} onChange={(event) => setField("expMonth", digitsOnly(event.target.value, 2))} /><FieldError id="exp-month-error" message={visibleError("expMonth")} /></div>
          <div className="space-y-2"><Label htmlFor="exp-year">Year</Label><Input id="exp-year" inputMode="numeric" autoComplete="cc-exp-year" maxLength={4} placeholder="YYYY" aria-invalid={Boolean(visibleError("expYear"))} aria-describedby="exp-year-error" value={card.expYear} onBlur={() => markTouched("expYear")} onChange={(event) => setField("expYear", digitsOnly(event.target.value, 4))} /><FieldError id="exp-year-error" message={visibleError("expYear")} /></div>
          <div className="space-y-2"><Label htmlFor="card-cvc">CVC</Label><Input id="card-cvc" type="password" inputMode="numeric" autoComplete="cc-csc" maxLength={4} placeholder={cardBrand(card.number) === "AMEX" ? "0000" : "000"} aria-invalid={Boolean(visibleError("cvc"))} aria-describedby="card-cvc-error" value={card.cvc} onBlur={() => markTouched("cvc")} onChange={(event) => setField("cvc", digitsOnly(event.target.value, 4))} /><FieldError id="card-cvc-error" message={visibleError("cvc")} /></div>
        </div>
        <div className="space-y-2"><Label htmlFor="card-address">Billing address</Label><Input id="card-address" autoComplete="billing street-address" aria-invalid={Boolean(visibleError("streetAddress"))} aria-describedby="card-address-error" value={card.streetAddress} onBlur={() => markTouched("streetAddress")} onChange={(event) => setField("streetAddress", event.target.value)} /><FieldError id="card-address-error" message={visibleError("streetAddress")} /></div>
        <div className="grid gap-3 sm:grid-cols-[1fr_90px_120px]">
          <div className="space-y-2"><Label htmlFor="card-city">City</Label><Input id="card-city" autoComplete="billing address-level2" aria-invalid={Boolean(visibleError("city"))} aria-describedby="card-city-error" value={card.city} onBlur={() => markTouched("city")} onChange={(event) => setField("city", event.target.value)} /><FieldError id="card-city-error" message={visibleError("city")} /></div>
          <div className="space-y-2"><Label htmlFor="card-state">State</Label><Input id="card-state" autoComplete="billing address-level1" maxLength={2} placeholder="FL" aria-invalid={Boolean(visibleError("region"))} aria-describedby="card-state-error" value={card.region} onBlur={() => markTouched("region")} onChange={(event) => setField("region", event.target.value.replace(/[^a-z]/gi, "").slice(0, 2).toUpperCase())} /><FieldError id="card-state-error" message={visibleError("region")} /></div>
          <div className="space-y-2"><Label htmlFor="card-zip">ZIP code</Label><Input id="card-zip" inputMode="numeric" autoComplete="billing postal-code" maxLength={10} placeholder="00000" aria-invalid={Boolean(visibleError("postalCode"))} aria-describedby="card-zip-error" value={card.postalCode} onBlur={() => markTouched("postalCode")} onChange={(event) => setField("postalCode", event.target.value.replace(/[^\d-]/g, "").slice(0, 10))} /><FieldError id="card-zip-error" message={visibleError("postalCode")} /></div>
        </div>
        <div className="space-y-2">
          <div ref={captchaRef} className={usesRecaptchaV3 ? "hidden" : "min-h-[78px]"} />
          {!usesRecaptchaV3 && captchaStatus === "loading" && <p className="text-sm text-muted-foreground">Loading secure payment verification...</p>}
          {!usesRecaptchaV3 && captchaStatus === "ready" && !captchaToken && <p className="text-sm text-muted-foreground">Complete the verification above to enable payment.</p>}
          {captchaError && <Alert variant="destructive"><AlertDescription>{captchaError}</AlertDescription></Alert>}
        </div>
        <p className="text-xs text-muted-foreground">Card details are sent for this transaction only and are not saved by Wings CRM.</p>
      </div>}
      <DialogFooter>
        {!receipt && <Button variant="outline" onClick={cancelCheckout} disabled={submitting || canceling}>{canceling ? "Canceling..." : isInstructionPayment ? "Cancel payment" : "Cancel purchase"}</Button>}
        {receipt ? <Button onClick={() => onOpenChange(false)}>Done</Button> : <Button onClick={submit} disabled={submitting || canceling}><CreditCard className="h-4 w-4" />{submitting ? "Processing..." : `Pay ${money.format(Number(amountCents) / 100)}`}</Button>}
      </DialogFooter>
    </DialogContent>
  </Dialog>;
}
