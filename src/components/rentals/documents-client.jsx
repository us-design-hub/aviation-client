"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { FileText, Plus, Upload } from "lucide-react";
import { rentalsAPI, usersAPI } from "@/lib/api";
import { useAuth } from "@/contexts/auth-context";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const documentTypes = [
  { value: "PILOT_LICENSE", label: "Pilot License" },
  { value: "MEDICAL_CERTIFICATE", label: "Medical Certificate" },
  { value: "RENTERS_INSURANCE", label: "Renters Insurance" },
];

const emptyForm = {
  documentType: "PILOT_LICENSE",
  expiresAt: "",
  notes: "",
  fileName: "",
  fileMime: "",
  fileData: "",
};

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function formatDate(value) {
  return value
    ? new Date(value).toLocaleDateString("en-US", { timeZone: "America/New_York" })
    : "No expiry set";
}

export function DocumentsClient() {
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";
  const [renters, setRenters] = useState([]);
  const [selectedRenterId, setSelectedRenterId] = useState(user?.id || "");
  const [compliance, setCompliance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingDocument, setEditingDocument] = useState(null);
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    if (user?.id) {
      setSelectedRenterId((current) => current || user.id);
    }
  }, [user?.id]);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      if (isAdmin) {
        const rentersRes = await usersAPI.getRenters();
        setRenters(asArray(rentersRes.data));
        if (!selectedRenterId && rentersRes.data?.[0]?.id) {
          setSelectedRenterId(rentersRes.data[0].id);
          return;
        }
        if (!selectedRenterId && !rentersRes.data?.[0]?.id) {
          setCompliance({ documents: [], missingTypes: [], expired: [], expiringSoon: [] });
          return;
        }
      }
      const documentsRes = await rentalsAPI.getDocuments(isAdmin ? selectedRenterId : undefined);
      setCompliance(documentsRes?.data && typeof documentsRes.data === "object" ? documentsRes.data : null);
    } catch (error) {
      console.error("Failed to load documents:", error);
      toast.error("Failed to load compliance documents");
    } finally {
      setLoading(false);
    }
  }, [isAdmin, selectedRenterId]);

  useEffect(() => {
    if (!user?.role) return;
    loadData();
  }, [loadData, user?.role, selectedRenterId]);

  async function handleFileChange(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setForm((current) => ({
        ...current,
        fileName: file.name,
        fileMime: file.type,
        fileData: String(reader.result || ""),
      }));
    };
    reader.readAsDataURL(file);
  }

  function openCreateDialog() {
    setEditingDocument(null);
    setForm(emptyForm);
    setDialogOpen(true);
  }

  function openEditDialog(document) {
    setEditingDocument(document);
    setForm({
      documentType: document.document_type,
      expiresAt: document.expires_at ? document.expires_at.slice(0, 10) : "",
      notes: document.notes || "",
      fileName: document.file_name || "",
      fileMime: document.file_mime || "",
      fileData: document.file_data || "",
    });
    setDialogOpen(true);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    try {
      setSaving(true);
      const payload = {
        documentType: form.documentType,
        expiresAt: form.expiresAt ? new Date(`${form.expiresAt}T00:00:00`).toISOString() : null,
        notes: form.notes,
        fileName: form.fileName || null,
        fileMime: form.fileMime || null,
        fileData: form.fileData || null,
      };
      if (editingDocument) {
        await rentalsAPI.updateDocument(editingDocument.id, payload);
        toast.success("Document updated");
      } else {
        await rentalsAPI.createDocument(isAdmin ? selectedRenterId : undefined, payload);
        toast.success("Document uploaded");
      }
      setDialogOpen(false);
      setEditingDocument(null);
      setForm(emptyForm);
      await loadData();
    } catch (error) {
      toast.error(error.response?.data?.error || "Could not save document");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(documentId) {
    try {
      await rentalsAPI.deleteDocument(documentId);
      toast.success("Document removed");
      await loadData();
    } catch (error) {
      toast.error(error.response?.data?.error || "Could not remove document");
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  const safeRenters = asArray(renters);
  const safeCompliance = {
    documents: asArray(compliance?.documents),
    missingTypes: asArray(compliance?.missingTypes),
    expired: asArray(compliance?.expired),
    expiringSoon: asArray(compliance?.expiringSoon),
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Compliance Documents</h1>
          <p className="text-muted-foreground">
            Track renter eligibility documents and upcoming renewals.
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          {isAdmin && (
            <Select value={selectedRenterId} onValueChange={setSelectedRenterId}>
              <SelectTrigger className="w-[280px]">
                <SelectValue placeholder="Select renter" />
              </SelectTrigger>
              <SelectContent>
                {safeRenters.map((renter) => (
                  <SelectItem key={renter.id} value={renter.id}>
                    {renter.name || renter.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Button onClick={openCreateDialog}>
            <Plus className="mr-2 h-4 w-4" />
            Add Document
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Missing</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-semibold">
              {safeCompliance.missingTypes.length ? safeCompliance.missingTypes.join(", ") : "None"}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Expired</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-semibold">
              {safeCompliance.expired.length ? safeCompliance.expired.map((doc) => doc.document_type).join(", ") : "None"}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Expiring Soon</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-semibold">
              {safeCompliance.expiringSoon.length ? safeCompliance.expiringSoon.map((doc) => doc.document_type).join(", ") : "None"}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Documents
          </CardTitle>
          <CardDescription>Current document set for the selected renter.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {safeCompliance.documents.length ? (
            safeCompliance.documents.map((document) => (
              <div key={document.id} className="rounded-lg border p-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">
                        {documentTypes.find((type) => type.value === document.document_type)?.label || document.document_type}
                      </span>
                      <Badge variant="outline">{document.status}</Badge>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      <div>Expires: {formatDate(document.expires_at)}</div>
                      <div>File: {document.file_name || "Not attached"}</div>
                    </div>
                    {document.notes && <p className="text-sm">{document.notes}</p>}
                    {document.file_data && (
                      <a
                        href={document.file_data}
                        download={document.file_name || "document"}
                        className="inline-flex text-sm text-blue-600 underline"
                      >
                        Download attachment
                      </a>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => openEditDialog(document)}>
                      Edit
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => handleDelete(document.id)}>
                      Remove
                    </Button>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">No documents uploaded yet.</p>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{editingDocument ? "Update Document" : "Upload Document"}</DialogTitle>
            <DialogDescription>
              Keep the renter record current so bookings can stay compliant.
            </DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="documentType">Document Type</Label>
              <Select
                value={form.documentType}
                onValueChange={(value) => setForm((current) => ({ ...current, documentType: value }))}
              >
                <SelectTrigger id="documentType">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {documentTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="expiresAt">Expiry Date</Label>
              <Input
                id="expiresAt"
                type="date"
                value={form.expiresAt}
                onChange={(event) => setForm((current) => ({ ...current, expiresAt: event.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="documentFile">Attachment</Label>
              <Input id="documentFile" type="file" onChange={handleFileChange} />
              {form.fileName && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Upload className="h-4 w-4" />
                  {form.fileName}
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="docNotes">Notes</Label>
              <Textarea
                id="docNotes"
                value={form.notes}
                onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
              />
            </div>
            <Button type="submit" disabled={saving}>
              {editingDocument ? "Save Changes" : "Upload Document"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
