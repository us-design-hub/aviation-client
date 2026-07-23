"use client";

import { useMemo, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { billingAPI } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
const formatMoney = (cents = 0) => money.format(Number(cents || 0) / 100);
const dollars = (cents = 0) => (Number(cents || 0) / 100).toFixed(2);

const emptyPackage = {
  packageType: "WET",
  name: "",
  aircraftHours: "",
  aircraftRate: "",
  flightInstructionHours: "0",
  flightInstructionRate: "45.00",
  groundInstructionHours: "0",
  groundInstructionRate: "30.00",
  includedFees: [],
  sortOrder: "0",
  isActive: true,
};

function packageToForm(pkg) {
  if (!pkg) return { ...emptyPackage, includedFees: [] };
  return {
    packageType: pkg.packageType,
    name: pkg.name,
    aircraftHours: String(pkg.aircraftHours),
    aircraftRate: dollars(pkg.aircraftRateCents),
    flightInstructionHours: String(pkg.flightInstructionHours),
    flightInstructionRate: dollars(pkg.flightInstructionRateCents),
    groundInstructionHours: String(pkg.groundInstructionHours),
    groundInstructionRate: dollars(pkg.groundInstructionRateCents),
    includedFees: (pkg.includedFees || []).map((fee) => ({ label: fee.label, amount: dollars(fee.amountCents) })),
    sortOrder: String(pkg.sortOrder || 0),
    isActive: Boolean(pkg.isActive),
  };
}

function toCents(value) {
  return Math.round(Number(value || 0) * 100);
}

function packagePayload(form) {
  return {
    packageType: form.packageType,
    name: form.name.trim(),
    aircraftHours: Number(form.aircraftHours || 0),
    aircraftRateCents: toCents(form.aircraftRate),
    flightInstructionHours: form.packageType === "TRAINING" ? Number(form.flightInstructionHours || 0) : 0,
    flightInstructionRateCents: form.packageType === "TRAINING" ? toCents(form.flightInstructionRate) : 0,
    groundInstructionHours: form.packageType === "TRAINING" ? Number(form.groundInstructionHours || 0) : 0,
    groundInstructionRateCents: form.packageType === "TRAINING" ? toCents(form.groundInstructionRate) : 0,
    includedFees: form.packageType === "TRAINING"
      ? form.includedFees.map((fee) => ({ label: fee.label.trim(), amountCents: toCents(fee.amount) }))
      : [],
    sortOrder: Number(form.sortOrder || 0),
    isActive: form.isActive,
  };
}

function PackageDialog({ open, onOpenChange, pkg, onSaved }) {
  const [form, setForm] = useState(() => packageToForm(pkg));
  const [saving, setSaving] = useState(false);
  const totalCents = useMemo(() => {
    const payload = packagePayload(form);
    return Math.round(
      payload.aircraftHours * payload.aircraftRateCents
      + payload.flightInstructionHours * payload.flightInstructionRateCents
      + payload.groundInstructionHours * payload.groundInstructionRateCents
      + payload.includedFees.reduce((sum, fee) => sum + fee.amountCents, 0),
    );
  }, [form]);

  const setField = (field, value) => setForm((current) => ({ ...current, [field]: value }));
  const save = async () => {
    try {
      setSaving(true);
      const payload = packagePayload(form);
      if (pkg) await billingAPI.updatePackage(pkg.id, payload);
      else await billingAPI.createPackage(payload);
      toast.success(pkg ? "Package updated" : "Package created");
      onOpenChange(false);
      await onSaved();
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not save package");
    } finally {
      setSaving(false);
    }
  };

  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="max-h-[90vh] sm:max-w-3xl">
      <DialogHeader>
        <DialogTitle>{pkg ? "Edit Package" : "Create Package"}</DialogTitle>
        <DialogDescription>Package totals are calculated from the included hours, rates, and fees.</DialogDescription>
      </DialogHeader>
      <ScrollArea className="max-h-[68vh] pr-3">
        <div className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2"><Label>Package type</Label><Select value={form.packageType} onValueChange={(value) => setField("packageType", value)}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="WET">Wet aircraft hours</SelectItem><SelectItem value="TRAINING">Training package</SelectItem></SelectContent></Select></div>
            <div className="space-y-2"><Label htmlFor="package-name">Name</Label><Input id="package-name" value={form.name} onChange={(event) => setField("name", event.target.value)} /></div>
            <div className="space-y-2"><Label htmlFor="aircraft-hours">Aircraft hours</Label><Input id="aircraft-hours" type="number" min="0" step="0.1" value={form.aircraftHours} onChange={(event) => setField("aircraftHours", event.target.value)} /></div>
            <div className="space-y-2"><Label htmlFor="aircraft-rate">Aircraft rate per hour</Label><Input id="aircraft-rate" type="number" min="0" step="0.01" value={form.aircraftRate} onChange={(event) => setField("aircraftRate", event.target.value)} /></div>
          </div>
          {form.packageType === "TRAINING" && <>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2"><Label htmlFor="flight-hours">Flight instruction hours</Label><Input id="flight-hours" type="number" min="0" step="0.1" value={form.flightInstructionHours} onChange={(event) => setField("flightInstructionHours", event.target.value)} /></div>
              <div className="space-y-2"><Label htmlFor="flight-rate">Flight instruction rate</Label><Input id="flight-rate" type="number" min="0" step="0.01" value={form.flightInstructionRate} onChange={(event) => setField("flightInstructionRate", event.target.value)} /></div>
              <div className="space-y-2"><Label htmlFor="ground-hours">Ground instruction hours</Label><Input id="ground-hours" type="number" min="0" step="0.1" value={form.groundInstructionHours} onChange={(event) => setField("groundInstructionHours", event.target.value)} /></div>
              <div className="space-y-2"><Label htmlFor="ground-rate">Ground instruction rate</Label><Input id="ground-rate" type="number" min="0" step="0.01" value={form.groundInstructionRate} onChange={(event) => setField("groundInstructionRate", event.target.value)} /></div>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between"><Label>Included fees</Label><Button type="button" variant="outline" size="sm" onClick={() => setField("includedFees", [...form.includedFees, { label: "", amount: "" }])}><Plus className="h-4 w-4" /> Add Fee</Button></div>
              {form.includedFees.map((fee, index) => <div key={index} className="grid grid-cols-[1fr_150px_36px] gap-2"><Input aria-label="Fee name" placeholder="Fee name" value={fee.label} onChange={(event) => setField("includedFees", form.includedFees.map((item, itemIndex) => itemIndex === index ? { ...item, label: event.target.value } : item))} /><Input aria-label="Fee amount" type="number" min="0" step="0.01" placeholder="Amount" value={fee.amount} onChange={(event) => setField("includedFees", form.includedFees.map((item, itemIndex) => itemIndex === index ? { ...item, amount: event.target.value } : item))} /><Button type="button" variant="ghost" size="icon" title="Remove fee" onClick={() => setField("includedFees", form.includedFees.filter((_, itemIndex) => itemIndex !== index))}><Trash2 className="h-4 w-4" /></Button></div>)}
            </div>
          </>}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2"><Label htmlFor="sort-order">Display order</Label><Input id="sort-order" type="number" min="0" step="1" value={form.sortOrder} onChange={(event) => setField("sortOrder", event.target.value)} /></div>
            <div className="flex items-center justify-between border-b py-2"><Label htmlFor="package-active">Active</Label><Switch id="package-active" checked={form.isActive} onCheckedChange={(value) => setField("isActive", value)} /></div>
          </div>
          <div className="flex items-center justify-between border-t pt-4"><span className="font-medium">Package total</span><span className="text-xl font-bold">{formatMoney(totalCents)}</span></div>
        </div>
      </ScrollArea>
      <DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button><Button onClick={save} disabled={saving || !form.name.trim()}>{saving ? "Saving..." : "Save Package"}</Button></DialogFooter>
    </DialogContent>
  </Dialog>;
}

export function PackageManager({ packages = [], refresh }) {
  const [dialog, setDialog] = useState({ open: false, pkg: null });
  const openCreate = () => setDialog({ open: true, pkg: null });
  const openEdit = (pkg) => setDialog({ open: true, pkg });
  const groups = [
    { type: "WET", label: "Wet Aircraft Hours" },
    { type: "TRAINING", label: "Training Packages" },
  ];

  return <div className="space-y-6">
    <div className="flex justify-end"><Button onClick={openCreate}><Plus className="h-4 w-4" /> Add Package</Button></div>
    {groups.map((group) => <section key={group.type} className="space-y-2">
      <h3 className="font-semibold">{group.label}</h3>
      {packages.filter((pkg) => pkg.packageType === group.type).map((pkg) => <div key={pkg.id} className="flex flex-wrap items-center justify-between gap-3 border-b py-4">
        <div><div className="flex items-center gap-2"><p className="font-medium">{pkg.name}</p><Badge variant={pkg.isActive ? "outline" : "secondary"}>{pkg.isActive ? "Active" : "Inactive"}</Badge></div><p className="mt-1 text-sm text-muted-foreground">{pkg.aircraftHours} aircraft hrs at {formatMoney(pkg.aircraftRateCents)}/hr{pkg.packageType === "TRAINING" ? ` · ${pkg.flightInstructionHours} flight · ${pkg.groundInstructionHours} ground` : ""}</p></div>
        <div className="flex items-center gap-3"><span className="font-semibold">{formatMoney(pkg.amountCents)}</span><Button variant="outline" size="icon" title={`Edit ${pkg.name}`} onClick={() => openEdit(pkg)}><Pencil className="h-4 w-4" /></Button></div>
      </div>)}
    </section>)}
    {dialog.open && <PackageDialog key={dialog.pkg?.id || "new"} open={dialog.open} onOpenChange={(open) => setDialog((current) => ({ ...current, open }))} pkg={dialog.pkg} onSaved={refresh} />}
  </div>;
}
