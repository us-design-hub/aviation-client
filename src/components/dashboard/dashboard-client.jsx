"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle, BookOpen, Calendar, CheckCircle, ClipboardList, Clock, FileText,
  GraduationCap, Plane, ShieldCheck, TrendingUp, Users, Wallet, Wrench,
} from "lucide-react";
import { aircraftAPI, lessonsAPI, maintenanceAPI, squawksAPI, usersAPI, rentalsAPI } from "@/lib/api";
import { dateKeyET } from "@/lib/format-tz";
import { useAuth } from "@/contexts/auth-context";
import {
  DashboardSkeleton, EmptyRow, ListItem, Pill, QuickAction, SectionCard, StatTile,
  firstNameOf, greetingFor,
} from "@/components/dashboard/dashboard-ui";

const RENTER_DOCUMENT_LABELS = {
  PILOT_LICENSE: "Pilot License",
  MEDICAL_CERTIFICATE: "Medical Certificate",
  RENTERS_INSURANCE: "Renters Insurance",
};

const documentLabel = (type) => RENTER_DOCUMENT_LABELS[type] || type;

const ROLE_LABEL = {
  ADMIN: "Administrator",
  INSTRUCTOR: "Instructor",
  STUDENT: "Student Pilot",
  MAINT: "Maintenance",
  RENTER: "Renter",
};

/**
 * Which datasets each role is allowed to read. Anything not listed here is never
 * fetched, and must never be rendered as a zero - a role that cannot see lessons
 * has "no data", not "zero lessons".
 */
const ACCESS = {
  ADMIN: { lessons: true, maintenance: true, users: true },
  INSTRUCTOR: { lessons: true, maintenance: true, users: false },
  STUDENT: { lessons: true, maintenance: false, users: false },
  MAINT: { lessons: false, maintenance: true, users: false },
  RENTER: { lessons: false, maintenance: false, users: false },
};

const asList = (result) => {
  if (result?.status !== "fulfilled") return [];
  const raw = result.value;
  if (Array.isArray(raw)) return raw;
  return Array.isArray(raw?.data) ? raw.data : [];
};

const toFixed1 = (value) => Number(value || 0).toFixed(1);

const ratio = (part, whole) => (Number(whole) > 0 ? (Number(part) / Number(whole)) * 100 : 0);

const formatDateTime = (value) => new Date(value).toLocaleString("en-US", {
  dateStyle: "medium", timeStyle: "short", timeZone: "America/New_York",
});

const formatDay = (value) => new Date(value).toLocaleDateString("en-US", {
  month: "short", day: "numeric", year: "numeric", timeZone: "America/New_York",
});

function useDashboardData(user) {
  const [stats, setStats] = useState(null);
  const [studentData, setStudentData] = useState(null);
  const [renterData, setRenterData] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const role = user?.role;
    if (!role) return;
    const access = ACCESS[role] || ACCESS.RENTER;

    try {
      if (role === "STUDENT") {
        try {
          setStudentData((await usersAPI.getStudentDashboard(user.id)).data);
        } catch (error) {
          console.error("Error fetching student dashboard:", error);
        }
      }
      if (role === "RENTER") {
        try {
          setRenterData((await rentalsAPI.getDashboard()).data);
        } catch (error) {
          console.error("Error fetching renter dashboard:", error);
        }
      }

      // Keyed rather than index-mapped so adding a call cannot silently shift results.
      const requests = { aircraft: aircraftAPI.getAll(), squawks: squawksAPI.getAll() };
      if (access.lessons) requests.lessons = lessonsAPI.getAll();
      if (access.maintenance) requests.maintenance = maintenanceAPI.getAll();
      if (access.users) requests.users = usersAPI.getAll();

      const keys = Object.keys(requests);
      const settled = await Promise.allSettled(keys.map((key) => requests[key]));
      const byKey = Object.fromEntries(keys.map((key, index) => [key, settled[index]]));

      keys.forEach((key) => {
        if (byKey[key]?.status === "rejected") {
          console.error(`Failed to fetch ${key} data:`, byKey[key].reason);
        }
      });

      const aircraft = asList(byKey.aircraft);
      const lessons = asList(byKey.lessons);
      const maintenance = asList(byKey.maintenance);
      const squawks = asList(byKey.squawks);
      const users = asList(byKey.users);
      const today = dateKeyET(new Date());

      setStats({
        access,
        aircraft: aircraft.length,
        groundedAircraft: aircraft.filter((item) => item.status && item.status !== "OK").length,
        lessons: lessons.length,
        todayLessons: lessons.filter((lesson) => lesson.start_at?.startsWith(today)).length,
        completedLessons: lessons.filter((lesson) => lesson.status === "COMPLETED").length,
        scheduledLessons: lessons.filter((lesson) => lesson.status === "SCHEDULED").length,
        maintenance: maintenance.length,
        activeMaintenance: maintenance.filter((item) => item.status !== "COMPLETED").length,
        dueMaintenance: maintenance.filter((item) => item.status === "DUE").length,
        squawks: squawks.filter((item) => item.status === "OPEN").length,
        users: users.length,
      });
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      // Still render something: an empty overview beats an endless skeleton.
      setStats((current) => current || {
        access, aircraft: 0, groundedAircraft: 0, lessons: 0, todayLessons: 0,
        completedLessons: 0, scheduledLessons: 0, maintenance: 0, activeMaintenance: 0,
        dueMaintenance: 0, squawks: 0, users: 0,
      });
    } finally {
      setLoading(false);
    }
  }, [user?.id, user?.role]);

  useEffect(() => { load(); }, [load]);

  return { stats, studentData, renterData, loading };
}

function DashboardHeader({ user, subtitle, children }) {
  return (
    <header className="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          {greetingFor()}, {firstNameOf(user?.name)}
        </h1>
        <p className="mt-1 text-muted-foreground">{subtitle}</p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Pill tone="gold" icon={ShieldCheck}>{ROLE_LABEL[user?.role] || "Member"}</Pill>
        {children}
      </div>
    </header>
  );
}

/** Tiles are built from what the role can actually read, so no metric shows a fake 0. */
function staffTiles(role, stats) {
  const { access } = stats;
  const tiles = [];

  if (access.lessons) {
    tiles.push({
      key: "today", label: "Today's Lessons", value: stats.todayLessons, icon: Clock,
      tone: stats.todayLessons > 0 ? "gold" : "neutral", href: "/lessons",
      hint: stats.todayLessons > 0 ? "On the schedule today" : "Nothing scheduled today",
    });
    tiles.push({
      key: "scheduled", label: "Upcoming Lessons", value: stats.scheduledLessons, icon: Calendar,
      href: "/lessons", hint: `${stats.lessons} lessons all time`,
    });
  }

  if (access.maintenance) {
    tiles.push({
      key: "maint", label: "Active Maintenance", value: stats.activeMaintenance, icon: Wrench,
      tone: stats.dueMaintenance > 0 ? "warning" : stats.activeMaintenance > 0 ? "info" : "success",
      href: "/maintenance",
      hint: stats.dueMaintenance > 0 ? `${stats.dueMaintenance} due now` : "Nothing overdue",
    });
  }

  tiles.push({
    key: "squawks", label: "Open Squawks", value: stats.squawks, icon: AlertTriangle,
    tone: stats.squawks > 0 ? "danger" : "success", href: "/squawks",
    hint: stats.squawks > 0 ? "Awaiting resolution" : "All clear",
  });

  tiles.push({
    key: "fleet", label: "Fleet", value: stats.aircraft, icon: Plane,
    tone: stats.groundedAircraft > 0 ? "warning" : "neutral", href: "/aircraft",
    hint: stats.groundedAircraft > 0
      ? `${stats.groundedAircraft} not airworthy`
      : "All aircraft available",
  });

  if (access.lessons) {
    tiles.push({
      key: "completed", label: "Completed Lessons", value: stats.completedLessons, icon: CheckCircle,
      tone: "success", href: "/lessons", hint: "Logged to date",
    });
  }

  if (access.users) {
    tiles.push({
      key: "users", label: "Total Users", value: stats.users, icon: Users,
      href: "/users", hint: "Students, instructors, and staff",
    });
  }

  return tiles;
}

const STAFF_ACTIONS = {
  ADMIN: [
    { href: "/lessons", icon: Calendar, label: "Schedule a lesson", description: "Book flight or ground time" },
    { href: "/aircraft", icon: Plane, label: "Manage aircraft", description: "Fleet status and meters" },
    { href: "/maintenance", icon: Wrench, label: "Log maintenance", description: "Inspections and due items" },
    { href: "/squawks", icon: AlertTriangle, label: "Review squawks", description: "Resolve reported issues" },
    { href: "/users", icon: Users, label: "Manage users", description: "Roles and assignments" },
    { href: "/billing", icon: Wallet, label: "Billing", description: "Payouts and balances" },
  ],
  INSTRUCTOR: [
    { href: "/lessons", icon: Calendar, label: "Schedule a lesson", description: "Book time with your students" },
    { href: "/progress", icon: GraduationCap, label: "Student progress", description: "Stages and endorsements" },
    { href: "/syllabus", icon: BookOpen, label: "Syllabus", description: "Lesson plans and stages" },
    { href: "/availability", icon: Clock, label: "My availability", description: "Set when you can teach" },
    { href: "/squawks", icon: AlertTriangle, label: "Report a squawk", description: "Flag an aircraft issue" },
  ],
  MAINT: [
    { href: "/aircraft", icon: Plane, label: "Manage aircraft", description: "Status, hours, and meters" },
    { href: "/maintenance", icon: Wrench, label: "Log maintenance", description: "Record work and inspections" },
    { href: "/squawks", icon: AlertTriangle, label: "Review squawks", description: "Resolve reported issues" },
  ],
};

const STAFF_SUBTITLE = {
  ADMIN: "Fleet, scheduling, and billing across the school.",
  INSTRUCTOR: "Your teaching schedule and the fleet you rely on.",
  MAINT: "Fleet airworthiness, inspections, and open squawks.",
};

function StaffDashboard({ user, stats }) {
  const role = user?.role;
  const tiles = useMemo(() => staffTiles(role, stats), [role, stats]);
  const actions = STAFF_ACTIONS[role] || STAFF_ACTIONS.MAINT;

  return (
    <div className="space-y-6">
      <DashboardHeader user={user} subtitle={STAFF_SUBTITLE[role] || "Your overview."} />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {tiles.map((tile) => <StatTile key={tile.key} {...tile} />)}
      </div>

      <SectionCard title="Quick actions" description="Common tasks for your role." icon={ClipboardList}>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {actions.map((action) => <QuickAction key={action.href} {...action} />)}
        </div>
      </SectionCard>
    </div>
  );
}

function StudentDashboard({ user, stats, data }) {
  const hours = data?.hours || {};
  const progress = data?.progressSummary;
  const billing = data?.instructionBilling || {};
  const upcoming = data?.upcomingLessons || [];
  const aircraft = data?.assignedAircraft || [];
  const notes = data?.latestNotes || [];
  const billingTone = billing.status === "BLOCKED" ? "danger" : billing.status === "WARNING" ? "warning" : "success";

  return (
    <div className="space-y-6">
      <DashboardHeader user={user} subtitle="Your flight training at a glance." />

      {billing.status === "BLOCKED" && (
        <div className="flex flex-wrap items-start gap-3 rounded-xl border border-red-500/40 bg-red-500/12 px-4 py-3.5">
          <AlertTriangle className="mt-0.5 size-4.5 shrink-0 text-red-600 dark:text-red-400" />
          <div className="min-w-50 flex-1">
            <p className="text-sm font-semibold">Scheduling is on hold</p>
            <p className="text-sm text-muted-foreground">
              No more flight lessons can be scheduled until your unpaid instructor time is paid down.
            </p>
          </div>
        </div>
      )}

      {billing.status === "WARNING" && (
        <div className="flex flex-wrap items-start gap-3 rounded-xl border border-amber-500/40 bg-amber-500/12 px-4 py-3.5">
          <AlertTriangle className="mt-0.5 size-4.5 shrink-0 text-amber-600 dark:text-amber-400" />
          <div className="min-w-50 flex-1">
            <p className="text-sm font-semibold">Unpaid instructor time needs attention</p>
            <p className="text-sm text-muted-foreground">
              {toFixed1(billing.outstandingHours)} hours are outstanding. Settle these to avoid a scheduling hold.
            </p>
          </div>
        </div>
      )}

      {progress && (
        <SectionCard title="Training progress" description="Where you are in the syllabus." icon={TrendingUp}>
          <div className="grid gap-5 lg:grid-cols-[1fr_1fr_1.4fr]">
            <div>
              <p className="text-sm text-muted-foreground">Current program</p>
              <p className="mt-1 text-lg font-semibold">{progress.currentProgram}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Current stage</p>
              <p className="mt-1 text-lg font-semibold">{progress.currentStage}</p>
            </div>
            <div>
              <div className="flex items-baseline justify-between gap-2">
                <p className="text-sm text-muted-foreground">Overall progress</p>
                <span className="text-lg font-bold tabular-nums">{progress.overallProgress}%</span>
              </div>
              <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-golden transition-all"
                  style={{ width: `${Math.max(0, Math.min(100, Number(progress.overallProgress) || 0))}%` }}
                />
              </div>
            </div>
          </div>
        </SectionCard>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          label="Hours Remaining" value={toFixed1(hours.hoursRemaining)} unit="hrs" icon={Plane}
          tone="gold" href="/billing"
          progress={100 - ratio(hours.hoursFlown, hours.totalPurchased)}
          progressLabel={`${toFixed1(hours.hoursFlown)} of ${toFixed1(hours.totalPurchased)} hrs flown`}
        />
        <StatTile
          label="Hours Purchased" value={toFixed1(hours.totalPurchased)} unit="hrs" icon={Wallet}
          href="/billing"
          hint={Number(hours.manualAdjustments) !== 0
            ? `Includes ${toFixed1(hours.manualAdjustments)} hrs adjusted`
            : "Across all hour blocks"}
        />
        <StatTile
          label="Instruction Owed" value={toFixed1(billing.outstandingHours)} unit="hrs" icon={GraduationCap}
          tone={billingTone} href="/billing"
          hint={`${toFixed1(billing.totalPaid)} of ${toFixed1(billing.totalInvoiced)} hrs paid`}
        />
        <StatTile
          label="Today's Lessons" value={stats.todayLessons} icon={Clock}
          tone={stats.todayLessons > 0 ? "gold" : "neutral"} href="/lessons"
          hint={stats.todayLessons > 0 ? "On your schedule today" : "Nothing scheduled today"}
        />
      </div>

      <SectionCard
        title="Upcoming lessons"
        description="Your next scheduled training."
        icon={Calendar}
      >
        {upcoming.length === 0 ? (
          <EmptyRow icon={Calendar} title="No upcoming lessons" description="Your instructor will schedule your next lesson." />
        ) : upcoming.slice(0, 5).map((lesson) => (
          <ListItem
            key={lesson.id}
            icon={Plane}
            iconTone="gold"
            title={lesson.lesson || "Flight Lesson"}
            meta={`${formatDateTime(lesson.start_at)} · ${lesson.instructor_name}`}
            trailing={lesson.tail_number ? <Pill tone="neutral">{lesson.tail_number}</Pill> : null}
          />
        ))}
      </SectionCard>

      <div className="grid gap-6 lg:grid-cols-2">
        <SectionCard title="Assigned aircraft" description="Aircraft you are scheduled to fly." icon={Plane}>
          {aircraft.length === 0 ? (
            <EmptyRow icon={Plane} title="No aircraft assigned" description="Aircraft appear here once lessons are booked." />
          ) : aircraft.map((item) => {
            const clear = !item.open_maintenance_count && !item.open_squawk_count;
            return (
              <ListItem
                key={item.id}
                title={item.tail_number}
                meta={`${item.make || ""} ${item.model || ""}`.trim() || "Aircraft"}
                trailing={(
                  <>
                    {item.open_maintenance_count > 0 && (
                      <Pill tone="warning" icon={Wrench}>{item.open_maintenance_count}</Pill>
                    )}
                    {item.open_squawk_count > 0 && (
                      <Pill tone="danger" icon={AlertTriangle}>{item.open_squawk_count}</Pill>
                    )}
                    {clear && <Pill tone="success" icon={CheckCircle}>Ready</Pill>}
                  </>
                )}
              />
            );
          })}
        </SectionCard>

        <SectionCard title="Latest instructor notes" description="Recent feedback on your flying." icon={FileText}>
          {notes.length === 0 ? (
            <EmptyRow icon={FileText} title="No instructor notes yet" description="Notes appear after your lessons are debriefed." />
          ) : notes.map((note) => (
            <div key={note.id} className="border-b py-3.5 last:border-b-0">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="font-medium">{note.lesson_title}</p>
                <p className="text-xs text-muted-foreground">{formatDay(note.created_at)}</p>
              </div>
              <p className="mt-1.5 text-sm text-muted-foreground">{note.content}</p>
              <p className="mt-1.5 text-xs text-muted-foreground">— {note.instructor_name}</p>
            </div>
          ))}
        </SectionCard>
      </div>

      <SectionCard title="Quick actions" description="Common tasks for your training." icon={ClipboardList}>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <QuickAction href="/lessons" icon={Calendar} label="View schedule" description="Your upcoming lessons" />
          <QuickAction href="/progress" icon={GraduationCap} label="View progress" description="Stages and milestones" />
          <QuickAction href="/billing" icon={Wallet} label="Billing" description="Hours and balances" />
          <QuickAction href="/squawks" icon={AlertTriangle} label="Report a squawk" description="Flag an aircraft issue" />
        </div>
      </SectionCard>
    </div>
  );
}

/** Compliance reads as a status list; each row is fine or it is not. */
function ComplianceRow({ label, items, tone }) {
  const clear = items.length === 0;
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b py-3 last:border-b-0">
      <p className="text-sm font-medium">{label}</p>
      {clear ? (
        <Pill tone="success" icon={CheckCircle}>None</Pill>
      ) : (
        <div className="flex flex-wrap justify-end gap-2">
          {items.map((item) => <Pill key={item} tone={tone} icon={AlertTriangle}>{item}</Pill>)}
        </div>
      )}
    </div>
  );
}

function RenterDashboard({ user, stats, data }) {
  const hours = data?.hours || {};
  const bookings = data?.upcomingBookings || [];
  const compliance = data?.compliance || {};
  const missing = (compliance.missingTypes || []).map(documentLabel);
  const expired = (compliance.expired || []).map((doc) => documentLabel(doc.document_type));
  const expiringSoon = (compliance.expiringSoon || []).map((doc) => documentLabel(doc.document_type));
  const blocking = missing.length + expired.length;

  return (
    <div className="space-y-6">
      <DashboardHeader user={user} subtitle="Your rental hours, bookings, and documents." />

      {blocking > 0 && (
        <div className="flex flex-wrap items-start gap-3 rounded-xl border border-red-500/40 bg-red-500/12 px-4 py-3.5">
          <AlertTriangle className="mt-0.5 size-4.5 shrink-0 text-red-600 dark:text-red-400" />
          <div className="min-w-50 flex-1">
            <p className="text-sm font-semibold">
              {blocking} document{blocking === 1 ? "" : "s"} need attention
            </p>
            <p className="text-sm text-muted-foreground">
              Missing or expired documents can prevent you from booking an aircraft.
            </p>
          </div>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          label="Hours Remaining" value={toFixed1(hours.hoursRemaining)} unit="hrs" icon={Plane}
          tone="gold" href="/billing"
          progress={100 - ratio(hours.hoursFlown, hours.totalPurchased)}
          progressLabel={`${toFixed1(hours.hoursFlown)} of ${toFixed1(hours.totalPurchased)} hrs flown`}
        />
        <StatTile
          label="Hours Purchased" value={toFixed1(hours.totalPurchased)} unit="hrs" icon={Wallet}
          href="/billing"
          hint={Number(hours.manualAdjustments) !== 0
            ? `Includes ${toFixed1(hours.manualAdjustments)} hrs adjusted`
            : "Across all hour blocks"}
        />
        <StatTile
          label="Upcoming Rentals" value={bookings.length} icon={Calendar}
          tone={bookings.length > 0 ? "gold" : "neutral"} href="/rentals"
          hint={bookings.length > 0 ? "Booked and confirmed" : "Nothing booked yet"}
        />
        <StatTile
          label="Open Squawks" value={stats.squawks} icon={AlertTriangle}
          tone={stats.squawks > 0 ? "danger" : "success"} href="/squawks"
          hint={stats.squawks > 0 ? "Across the fleet" : "All clear"}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <SectionCard title="Upcoming rentals" description="Your booked aircraft time." icon={Calendar}>
          {bookings.length === 0 ? (
            <EmptyRow icon={Calendar} title="No upcoming rentals" description="Book an aircraft from the schedule." />
          ) : bookings.map((booking) => (
            <ListItem
              key={booking.id}
              icon={Plane}
              iconTone="gold"
              title={booking.tail_number}
              meta={formatDateTime(booking.start_at)}
              detail={booking.purpose || null}
            />
          ))}
        </SectionCard>

        <SectionCard title="Compliance status" description="Documents required to rent." icon={ShieldCheck}>
          <ComplianceRow label="Missing" items={missing} tone="danger" />
          <ComplianceRow label="Expired" items={expired} tone="danger" />
          <ComplianceRow label="Expiring soon" items={expiringSoon} tone="warning" />
        </SectionCard>
      </div>

      <SectionCard title="Quick actions" description="Common tasks for renters." icon={ClipboardList}>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <QuickAction href="/rentals" icon={Calendar} label="View schedule" description="Book or review rentals" />
          <QuickAction href="/documents" icon={FileText} label="Manage documents" description="Licences and insurance" />
          <QuickAction href="/billing" icon={Wallet} label="Billing" description="Hours and purchases" />
          <QuickAction href="/squawks" icon={AlertTriangle} label="Report a squawk" description="Flag an aircraft issue" />
        </div>
      </SectionCard>
    </div>
  );
}

export function DashboardClient() {
  const { user } = useAuth();
  const { stats, studentData, renterData, loading } = useDashboardData(user);

  if (loading || !user?.role || !stats) return <DashboardSkeleton />;

  if (user.role === "STUDENT") return <StudentDashboard user={user} stats={stats} data={studentData} />;
  if (user.role === "RENTER") return <RenterDashboard user={user} stats={stats} data={renterData} />;
  return <StaffDashboard user={user} stats={stats} />;
}
