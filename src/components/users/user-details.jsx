"use client";

import { useState, useEffect } from "react";
import { 
  User, 
  Mail, 
  Shield, 
  UserCheck, 
  Key, 
  Edit, 
  KeyRound, 
  Users2,
  Calendar,
  Activity,
  Trash2,
  Wallet
} from "lucide-react";
import { formatET } from "@/lib/format-tz";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { lessonsAPI, rentalsAPI, usersAPI } from "@/lib/api";
import { LessonHistory } from "@/components/users/lesson-history";
import { cn } from "@/lib/utils";

const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
const formatMoney = (cents = 0) => money.format(Number(cents || 0) / 100);

export function UserDetails({ user, onEdit, onResetPassword, onDeleteUser, onManageAssignments }) {
  const [userStats, setUserStats] = useState({
    totalLessons: 0,
    completedLessons: 0,
    scheduledLessons: 0,
    lessons: [],
  });
  const [hourSummary, setHourSummary] = useState(null);
  const [hourForm, setHourForm] = useState({
    hours: "",
    transactionType: "ALLOCATION",
    note: "",
  });
  const [instructionBilling, setInstructionBilling] = useState(null);
  const [instructionBillingForm, setInstructionBillingForm] = useState({
    hours: "",
    entryType: "PAYMENT",
    instructionType: "FLIGHT",
    note: "",
  });
  const [savingHours, setSavingHours] = useState(false);
  const [savingInstructionBilling, setSavingInstructionBilling] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.id) {
      fetchUserStats();
    }
  }, [user?.id]);

  const fetchUserStats = async () => {
    try {
      setLoading(true);
      setHourSummary(null);
      
      // Fetch lessons based on user role
      const params = {};
      if (user.role === "STUDENT") {
        params.studentId = user.id;
      } else if (user.role === "INSTRUCTOR") {
        params.instructorId = user.id;
      } else if (user.role === "RENTER") {
        const hoursResponse = await rentalsAPI.getHours(user.id);
        setHourSummary(hoursResponse.data);
        setUserStats({
          totalLessons: 0,
          completedLessons: 0,
          scheduledLessons: 0,
          lessons: [],
        });
        setLoading(false);
        return;
      }
      
      const requests = [lessonsAPI.getAll(params)];
      if (user.role === "STUDENT") {
        requests.push(rentalsAPI.getHours(user.id));
      }

      const [lessonsResponse, hoursResponse] = await Promise.all(requests);
      if (hoursResponse?.data) {
        setHourSummary(hoursResponse.data);
      }
      if (user.role === "STUDENT") {
        const instructionBillingResponse = await usersAPI.getInstructionBilling(user.id);
        setInstructionBilling(instructionBillingResponse.data);
      } else {
        setInstructionBilling(null);
      }

      const response = lessonsResponse;
      const lessons = response.data || [];
      
      setUserStats({
        totalLessons: lessons.length,
        completedLessons: lessons.filter(l => l.status === "COMPLETED").length,
        scheduledLessons: lessons.filter(l => l.status === "SCHEDULED").length,
        lessons,
      });
    } catch (error) {
      console.error("Error fetching user stats:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleHoursSubmit = async (event) => {
    event.preventDefault();
    const value = Number(hourForm.hours);
    if (!Number.isFinite(value) || value === 0) return;

    try {
      setSavingHours(true);
      const response = await rentalsAPI.allocateHours(user.id, {
        hours: value,
        transactionType: hourForm.transactionType,
        note: hourForm.note,
      });
      setHourSummary(response.data?.summary || null);
      setHourForm({ hours: "", transactionType: "ALLOCATION", note: "" });
    } catch (error) {
      console.error("Error saving flight hours:", error);
    } finally {
      setSavingHours(false);
    }
  };

  const handleInstructionBillingSubmit = async (event) => {
    event.preventDefault();
    try {
      setSavingInstructionBilling(true);
      const response = await usersAPI.saveInstructionBilling(user.id, {
        hours: Number(instructionBillingForm.hours),
        entryType: instructionBillingForm.entryType,
        instructionType: instructionBillingForm.instructionType,
        note: instructionBillingForm.note,
      });
      setInstructionBilling(response.data);
      setInstructionBillingForm((current) => ({ ...current, hours: "", note: "" }));
    } catch (error) {
      console.error("Error saving instructor billing:", error);
    } finally {
      setSavingInstructionBilling(false);
    }
  };

  const getRoleIcon = (role) => {
    switch (role) {
      case "STUDENT":
        return <User className="h-5 w-5 text-blue-600" />;
      case "INSTRUCTOR":
        return <UserCheck className="h-5 w-5 text-purple-600" />;
      case "RENTER":
        return <User className="h-5 w-5 text-amber-600" />;
      case "ADMIN":
        return <Shield className="h-5 w-5 text-green-600" />;
      case "MAINT":
        return <Key className="h-5 w-5 text-orange-600" />;
      default:
        return <User className="h-5 w-5" />;
    }
  };

  const getRoleName = (role) => {
    switch (role) {
      case "STUDENT":
        return "Student";
      case "INSTRUCTOR":
        return "Instructor";
      case "RENTER":
        return "Renter";
      case "ADMIN":
        return "Administrator";
      case "MAINT":
        return "Maintenance";
      default:
        return role;
    }
  };

  const formatDateTime = (dateTime) => {
    return formatET(dateTime, "MMM dd, yyyy 'at' h:mm a");
  };

  return (
    <div className="space-y-6 pb-6">
      <SheetHeader className="sticky top-0 bg-background pb-4 border-b z-10">
        <SheetTitle className="flex items-center gap-2">
          {getRoleIcon(user.role)}
          {user.name || user.email}
        </SheetTitle>
        <SheetDescription>
          {getRoleName(user.role)} • {user.is_active ? "Active" : "Inactive"}
        </SheetDescription>
      </SheetHeader>

      {/* Actions */}
      <div className="flex items-center gap-2 flex-wrap">
        <Button variant="outline" size="sm" onClick={onEdit}>
          <Edit className="h-4 w-4 mr-2" />
          Edit User
        </Button>
        
        <Button variant="outline" size="sm" onClick={onResetPassword}>
          <KeyRound className="h-4 w-4 mr-2" />
          Reset Password
        </Button>
        
        {(user.role === "INSTRUCTOR" || user.role === "STUDENT") && (
          <Button variant="outline" size="sm" onClick={onManageAssignments}>
            <Users2 className="h-4 w-4 mr-2" />
            Manage Assignments
          </Button>
        )}
        
        <Button variant="destructive" size="sm" onClick={onDeleteUser}>
          <Trash2 className="h-4 w-4 mr-2" />
          Delete User
        </Button>
      </div>

      {/* Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Basic Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <User className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Full Name</p>
                  <p className="text-sm text-muted-foreground">{user.name || "Not provided"}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Email</p>
                  <p className="text-sm text-muted-foreground">{user.email}</p>
                </div>
              </div>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Shield className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Role</p>
                  <div className="flex items-center gap-2">
                    <Badge className={cn(
                      "text-xs",
                      user.role === "STUDENT" && "bg-blue-50 text-blue-700 border-blue-200",
                      user.role === "RENTER" && "bg-amber-50 text-amber-700 border-amber-200",
                      user.role === "INSTRUCTOR" && "bg-purple-50 text-purple-700 border-purple-200",
                      user.role === "ADMIN" && "bg-green-50 text-green-700 border-green-200",
                      user.role === "MAINT" && "bg-orange-50 text-orange-700 border-orange-200"
                    )}>
                      {getRoleName(user.role)}
                    </Badge>
                    {user.is_lead_instructor && (
                      <Badge variant="outline" className="text-xs">
                        Lead Instructor
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <Activity className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Status</p>
                  <Badge 
                    variant={user.is_active ? "secondary" : "outline"}
                    className={user.is_active 
                      ? "bg-green-50 text-green-700 border-green-200" 
                      : "bg-red-50 text-red-700 border-red-200"
                    }
                  >
                    {user.is_active ? "Active" : "Inactive"}
                  </Badge>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lesson Statistics */}
      {(user.role === "STUDENT" || user.role === "INSTRUCTOR") && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Lesson Statistics
            </CardTitle>
            <CardDescription>
              {user.role === "STUDENT" ? "Student's lesson progress" : "Instructor's teaching activity"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
                <p className="text-sm text-muted-foreground mt-2">Loading statistics...</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <p className="text-2xl font-bold text-primary">{userStats.totalLessons}</p>
                  <p className="text-sm text-muted-foreground">Total Lessons</p>
                </div>
                
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <p className="text-2xl font-bold text-green-600">{userStats.completedLessons}</p>
                  <p className="text-sm text-muted-foreground">Completed</p>
                </div>
                
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <p className="text-2xl font-bold text-blue-600">{userStats.scheduledLessons}</p>
                  <p className="text-sm text-muted-foreground">Scheduled</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Flight Hours */}
      {(user.role === "STUDENT" || user.role === "RENTER") && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Wallet className="h-4 w-4" />
              Flight Hours
            </CardTitle>
            <CardDescription>
              Purchased, flown, and remaining account hours
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <p className="text-2xl font-bold text-primary">{hourSummary?.totalPurchased?.toFixed?.(1) ?? "0.0"}</p>
                <p className="text-sm text-muted-foreground">Hours Purchased</p>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <p className="text-2xl font-bold text-green-600">{hourSummary?.hoursFlown?.toFixed?.(1) ?? "0.0"}</p>
                <p className="text-sm text-muted-foreground">Hours Flown</p>
              </div>
              <div className="text-center p-4 bg-amber-50 rounded-lg">
                <p className="text-2xl font-bold text-amber-700">
                  {(hourSummary?.manualAdjustments ?? 0) > 0 ? "+" : ""}
                  {hourSummary?.manualAdjustments?.toFixed?.(1) ?? "0.0"}
                </p>
                <p className="text-sm text-muted-foreground">Manual Adjustments</p>
              </div>
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <p className="text-2xl font-bold text-blue-600">{hourSummary?.hoursRemaining?.toFixed?.(1) ?? "0.0"}</p>
                <p className="text-sm text-muted-foreground">Hours Remaining</p>
              </div>
            </div>

            <form onSubmit={handleHoursSubmit} className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <label className="text-sm font-medium" htmlFor="hours-entry">Hours</label>
                  <Input
                    id="hours-entry"
                    type="number"
                    step="0.1"
                    value={hourForm.hours}
                    onChange={(event) => setHourForm((prev) => ({ ...prev, hours: event.target.value }))}
                    placeholder="e.g. 10 or -1.5"
                  />
                  <p className="text-xs text-muted-foreground">
                    Enter decimal hours. Example: 1.5 = 1 hour 30 minutes, 0.5 = 30 minutes.
                  </p>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium" htmlFor="hours-type">Entry Type</label>
                  <Select
                    value={hourForm.transactionType}
                    onValueChange={(value) => setHourForm((prev) => ({ ...prev, transactionType: value }))}
                  >
                    <SelectTrigger id="hours-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALLOCATION">Purchased Hours</SelectItem>
                      <SelectItem value="ADJUSTMENT">Adjustment</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="hours-note">Note</label>
                <Textarea
                  id="hours-note"
                  value={hourForm.note}
                  onChange={(event) => setHourForm((prev) => ({ ...prev, note: event.target.value }))}
                  placeholder="Optional note for this hour entry"
                  rows={3}
                />
              </div>
              <Button type="submit" size="sm" disabled={savingHours || !hourForm.hours}>
                {savingHours ? "Saving..." : "Save Hours Entry"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {user.role === "STUDENT" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Wallet className="h-4 w-4" />
              Instructor Billing
            </CardTitle>
            <CardDescription>
              Instructor time invoices, payments, and scheduling thresholds
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="overflow-x-auto border-y">
              <div className="grid min-w-[620px] grid-cols-[1.2fr_repeat(4,1fr)] gap-3 border-b px-2 py-2 text-xs font-medium text-muted-foreground">
                <span>Instruction</span><span>Invoiced</span><span>Paid</span><span>Outstanding</span><span>Amount Due</span>
              </div>
              {[["Flight", instructionBilling?.flight], ["Ground", instructionBilling?.ground]].map(([label, summary]) => (
                <div key={label} className="grid min-w-[620px] grid-cols-[1.2fr_repeat(4,1fr)] items-center gap-3 px-2 py-3 text-sm">
                  <div><p className="font-semibold">{label}</p><p className="text-xs text-muted-foreground">{formatMoney(summary?.rateCents)}/hr</p></div>
                  <span>{summary?.totalInvoiced?.toFixed?.(1) ?? "0.0"} hrs</span>
                  <span>{summary?.totalPaid?.toFixed?.(1) ?? "0.0"} hrs</span>
                  <span className="font-semibold">{summary?.outstandingHours?.toFixed?.(1) ?? "0.0"} hrs</span>
                  <span className="font-semibold">{formatMoney(summary?.outstandingAmountCents)}</span>
                </div>
              ))}
              <div className="flex items-center justify-between border-t px-2 py-3 text-sm font-semibold">
                <span>Combined outstanding</span>
                <span>{instructionBilling?.outstandingHours?.toFixed?.(1) ?? "0.0"} hrs · {formatMoney(instructionBilling?.outstandingAmountCents)}</span>
              </div>
            </div>

            {instructionBilling?.status === "WARNING" && (
              <Badge className="bg-amber-50 text-amber-700 border-amber-200">Warning threshold reached</Badge>
            )}
            {instructionBilling?.status === "BLOCKED" && (
              <Badge className="bg-red-50 text-red-700 border-red-200">Scheduling blocked</Badge>
            )}

            <form onSubmit={handleInstructionBillingSubmit} className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="space-y-2">
                  <label className="text-sm font-medium" htmlFor="instruction-hours-entry">Hours</label>
                  <Input
                    id="instruction-hours-entry"
                    type="number"
                    step="0.1"
                    value={instructionBillingForm.hours}
                    onChange={(event) => setInstructionBillingForm((prev) => ({ ...prev, hours: event.target.value }))}
                    placeholder="e.g. 2.0"
                  />
                  <p className="text-xs text-muted-foreground">
                    Payments reduce the balance. Adjustments can add or remove hours.
                  </p>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium" htmlFor="instruction-billing-type">Instruction</label>
                  <Select value={instructionBillingForm.instructionType} onValueChange={(value) => setInstructionBillingForm((prev) => ({ ...prev, instructionType: value }))}>
                    <SelectTrigger id="instruction-billing-type"><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="FLIGHT">Flight ($45/hr)</SelectItem><SelectItem value="GROUND">Ground ($30/hr)</SelectItem></SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium" htmlFor="instruction-entry-type">Entry Type</label>
                  <Select
                    value={instructionBillingForm.entryType}
                    onValueChange={(value) => setInstructionBillingForm((prev) => ({ ...prev, entryType: value }))}
                  >
                    <SelectTrigger id="instruction-entry-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PAYMENT">Payment</SelectItem>
                      <SelectItem value="ADJUSTMENT">Adjustment</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="instruction-note">Note</label>
                <Textarea
                  id="instruction-note"
                  value={instructionBillingForm.note}
                  onChange={(event) => setInstructionBillingForm((prev) => ({ ...prev, note: event.target.value }))}
                  placeholder="Optional note for this payment or adjustment"
                  rows={3}
                />
              </div>
              <Button type="submit" size="sm" disabled={savingInstructionBilling || !instructionBillingForm.hours}>
                {savingInstructionBilling ? "Saving..." : "Save Billing Entry"}
              </Button>
            </form>

            <div className="space-y-3">
              {(instructionBilling?.entries || []).slice(0, 8).map((entry) => (
                <div key={entry.id} className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <p className="text-sm font-medium">{entry.entry_type} · {entry.instruction_type || "Legacy payment"}</p>
                    <p className="text-xs text-muted-foreground">{formatDateTime(entry.created_at)}</p>
                    {entry.note && <p className="mt-1 text-sm text-muted-foreground">{entry.note}</p>}
                  </div>
                  <Badge variant="outline">
                    {Number(entry.delta_hours) > 0 ? "+" : ""}
                    {Number(entry.delta_hours).toFixed(1)} hrs
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {(user.role === "STUDENT" || user.role === "INSTRUCTOR") && (
        <LessonHistory lessons={userStats.lessons} subjectRole={user.role} />
      )}

      {/* System Information */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">System Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="font-medium">User ID</p>
              <p className="text-muted-foreground font-mono text-xs">{user.id}</p>
            </div>
            
            <div>
              <p className="font-medium">Account Type</p>
              <p className="text-muted-foreground">{getRoleName(user.role)}</p>
            </div>
            
            {user.role === "INSTRUCTOR" && (
              <div>
                <p className="font-medium">Instructor Level</p>
                <p className="text-muted-foreground">
                  {user.is_lead_instructor ? "Lead Instructor" : "Standard Instructor"}
                </p>
              </div>
            )}
            
            <div>
              <p className="font-medium">Account Status</p>
              <p className="text-muted-foreground">
                {user.is_active ? "Active and can log in" : "Inactive - cannot log in"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
