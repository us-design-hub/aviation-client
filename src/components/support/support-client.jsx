"use client";

import Link from "next/link";
import {
  BookOpen, CalendarClock, CreditCard, ExternalLink, FileText, GraduationCap,
  LifeBuoy, Mail, MessageSquare, Phone, Plane, Settings, UserCircle, Wrench,
} from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { Card, CardContent } from "@/components/ui/card";

const SUPPORT_EMAIL = "info@wingsofanangelaviation.com";
const SUPPORT_PHONE_DISPLAY = "(813) 774-3666";
const SUPPORT_PHONE_HREF = "+18137743666";
const CONTACT_FORM_URL = "https://wingsofanangelaviation.com/contact/";

const ROLE_LABEL = {
  ADMIN: "Administrator",
  INSTRUCTOR: "Instructor",
  STUDENT: "Student Pilot",
  MAINT: "Maintenance",
  RENTER: "Renter",
};

const ROLE_SUBTITLE = {
  ADMIN: "Portal configuration, integrations, and account issues.",
  INSTRUCTOR: "Scheduling, student rosters, and portal access.",
  STUDENT: "Lessons, training progress, billing, and account access.",
  MAINT: "Aircraft records, squawks, and maintenance tracking.",
  RENTER: "Bookings, rental hours, documents, and account access.",
};

/**
 * Things people usually contact the school about that they can in fact do themselves.
 * Every link points at a page the role can actually reach.
 */
const SELF_SERVE = {
  common: [
    { href: "/profile", icon: UserCircle, title: "Update your details", body: "Change your name, email, or password from your profile." },
    { href: "/profile", icon: MessageSquare, title: "Text message alerts", body: "Turn SMS reminders on or off and set your mobile number." },
  ],
  STUDENT: [
    { href: "/lessons", icon: CalendarClock, title: "Check your schedule", body: "See upcoming lessons and who is instructing." },
    { href: "/progress", icon: GraduationCap, title: "Track your progress", body: "Review syllabus stages and stage checks." },
    { href: "/billing", icon: CreditCard, title: "Hours and balances", body: "Buy hours, view purchases, and settle instruction time." },
    { href: "/squawks", icon: Plane, title: "Report an aircraft issue", body: "Log a squawk so maintenance can review it." },
  ],
  RENTER: [
    { href: "/rentals", icon: CalendarClock, title: "Book an aircraft", body: "Check availability and schedule a rental." },
    { href: "/documents", icon: FileText, title: "Keep documents current", body: "Upload your licence, medical, and insurance." },
    { href: "/billing", icon: CreditCard, title: "Hours and balances", body: "Buy hours and review your purchases." },
    { href: "/squawks", icon: Plane, title: "Report an aircraft issue", body: "Log a squawk so maintenance can review it." },
  ],
  INSTRUCTOR: [
    { href: "/lessons", icon: CalendarClock, title: "Schedule lessons", body: "Book flight or ground time with your students." },
    { href: "/progress", icon: GraduationCap, title: "Student progress", body: "Review stages and record stage checks." },
    { href: "/availability", icon: CalendarClock, title: "Set your availability", body: "Mark time when you cannot teach." },
    { href: "/syllabus", icon: BookOpen, title: "Review the syllabus", body: "See the active training program and lessons." },
  ],
  MAINT: [
    { href: "/maintenance", icon: Wrench, title: "Maintenance items", body: "Track inspections and record completed work." },
    { href: "/squawks", icon: Plane, title: "Resolve squawks", body: "Review and close reported aircraft issues." },
    { href: "/aircraft", icon: Plane, title: "Aircraft records", body: "Check status, meters, and airworthiness." },
  ],
  ADMIN: [
    { href: "/settings", icon: Settings, title: "Portal settings", body: "Email, SMS, and QuickBooks integration setup." },
    { href: "/users", icon: UserCircle, title: "Manage users", body: "Create accounts, set roles, and reset passwords." },
    { href: "/billing", icon: CreditCard, title: "Billing and payouts", body: "Confirm payments and record instructor payouts." },
    { href: "/syllabus", icon: BookOpen, title: "Training programs", body: "Edit the syllabus and set the active program." },
  ],
};

/** Prefill what the school needs to identify the account, so nobody has to ask for it. */
function buildMailto(user) {
  const role = ROLE_LABEL[user?.role] || "Portal user";
  const subject = `Portal support request — ${user?.name || "Account holder"}`;
  const body = [
    "Please describe the issue below.",
    "",
    "",
    "---",
    `Name: ${user?.name || "-"}`,
    `Email: ${user?.email || "-"}`,
    `Role: ${role}`,
  ].join("\n");
  return `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

function ContactCard({ href, external, icon: Icon, label, value, note }) {
  const content = (
    <CardContent className="flex h-full flex-col gap-3 p-5">
      <span className="flex size-10 items-center justify-center rounded-lg bg-golden/12">
        <Icon className="size-5 text-golden" />
      </span>
      <div>
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <p className="mt-0.5 font-semibold break-words">{value}</p>
      </div>
      {note && <p className="mt-auto text-xs text-muted-foreground">{note}</p>}
    </CardContent>
  );

  return (
    <a
      href={href}
      {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      className="block h-full rounded-xl"
    >
      <Card className="h-full gap-0 py-0 transition-all hover:-translate-y-0.5 hover:border-golden/40 hover:shadow-md">
        {content}
      </Card>
    </a>
  );
}

function HelpLink({ href, icon: Icon, title, body }) {
  return (
    <Link
      href={href}
      className="group flex items-start gap-3 rounded-xl border bg-card p-4 transition-all hover:-translate-y-0.5 hover:border-golden/40 hover:shadow-md"
    >
      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted">
        <Icon className="size-4.5 text-muted-foreground" />
      </span>
      <span className="min-w-0">
        <span className="block font-medium">{title}</span>
        <span className="mt-0.5 block text-sm text-muted-foreground">{body}</span>
      </span>
    </Link>
  );
}

export function SupportClient() {
  const { user } = useAuth();
  const roleTopics = SELF_SERVE[user?.role] || [];
  const topics = [...roleTopics, ...SELF_SERVE.common];

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <header>
        <h1 className="flex items-center gap-3 text-3xl font-bold tracking-tight">
          <span className="flex size-11 items-center justify-center rounded-xl bg-golden/12">
            <LifeBuoy className="size-6 text-golden" />
          </span>
          Support
        </h1>
        <p className="mt-2 text-muted-foreground">
          {ROLE_SUBTITLE[user?.role] || "Portal and account assistance."}
        </p>
      </header>

      <section className="space-y-3">
        <div>
          <h2 className="text-lg font-semibold">Contact Wings of Angel Aviation</h2>
          <p className="text-sm text-muted-foreground">
            Email is best for account issues. Call for anything urgent about a flight today.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <ContactCard
            href={buildMailto(user)}
            icon={Mail}
            label="Email"
            value={SUPPORT_EMAIL}
            note="Opens your mail app with your account details filled in."
          />
          <ContactCard
            href={`tel:${SUPPORT_PHONE_HREF}`}
            icon={Phone}
            label="Phone"
            value={SUPPORT_PHONE_DISPLAY}
            note="Best for same-day scheduling or aircraft issues."
          />
          <ContactCard
            href={CONTACT_FORM_URL}
            external
            icon={ExternalLink}
            label="Contact form"
            value="wingsofanangelaviation.com"
            note="Opens the public website in a new tab."
          />
        </div>
      </section>

      <section className="space-y-3">
        <div>
          <h2 className="text-lg font-semibold">Before you get in touch</h2>
          <p className="text-sm text-muted-foreground">
            Most common requests can be handled from the portal directly.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {topics.map((topic) => (
            <HelpLink key={`${topic.href}-${topic.title}`} {...topic} />
          ))}
        </div>
      </section>

      <p className="border-t pt-4 text-sm text-muted-foreground">
        Forgotten your password? You can reset it from the{" "}
        <Link href="/login" className="font-medium text-golden hover:underline">sign-in page</Link>
        {" "}without contacting support.
      </p>
    </div>
  );
}
