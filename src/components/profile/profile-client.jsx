'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  AtSign, BadgeCheck, BookOpen, Check, Eye, EyeOff, FileText, GraduationCap,
  Loader2, Lock, MessageSquare, Phone, Plane, ShieldCheck, User, Wrench, X,
} from 'lucide-react';
import { toast } from 'sonner';
import { authAPI } from '@/lib/api';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DocumentsClient } from '@/components/rentals/documents-client';
import { cn } from '@/lib/utils';

/** What each role sees about itself on the profile header. */
const ROLE_META = {
  ADMIN: {
    label: 'Administrator',
    icon: ShieldCheck,
    blurb: 'Full access to scheduling, billing, users, and school settings.',
  },
  INSTRUCTOR: {
    label: 'Instructor',
    icon: GraduationCap,
    blurb: 'Teach lessons, log instruction time, and track student progress.',
  },
  STUDENT: {
    label: 'Student Pilot',
    icon: BookOpen,
    blurb: 'Book lessons, follow your syllabus, and manage your balances.',
  },
  MAINT: {
    label: 'Maintenance',
    icon: Wrench,
    blurb: 'Track squawks, inspections, and aircraft maintenance items.',
  },
  RENTER: {
    label: 'Renter',
    icon: Plane,
    blurb: 'Book aircraft, manage rental hours, and keep documents current.',
  },
};

const initialsOf = (name = '') => name
  .split(' ')
  .filter(Boolean)
  .slice(0, 2)
  .map((part) => part[0]?.toUpperCase())
  .join('') || '?';

const PASSWORD_RULES = [
  { id: 'length', label: 'At least 8 characters', test: (value) => value.length >= 8 },
  { id: 'case', label: 'Upper and lowercase letters', test: (value) => /[a-z]/.test(value) && /[A-Z]/.test(value) },
  { id: 'number', label: 'At least one number', test: (value) => /\d/.test(value) },
  { id: 'symbol', label: 'At least one symbol', test: (value) => /[^A-Za-z0-9]/.test(value) },
];

/** Strength is advisory only. The backend requires 8 characters; the rest is guidance. */
function strengthOf(value) {
  if (!value) return { score: 0, label: 'Enter a password', tone: 'bg-muted' };
  const passed = PASSWORD_RULES.filter((rule) => rule.test(value)).length;
  if (value.length < 8) return { score: 25, label: 'Too short', tone: 'bg-red-500' };
  if (passed <= 2) return { score: 50, label: 'Fair', tone: 'bg-amber-500' };
  if (passed === 3) return { score: 75, label: 'Good', tone: 'bg-sky-500' };
  return { score: 100, label: 'Strong', tone: 'bg-emerald-500' };
}

/** Identity banner: avatar, name, and the role-specific facts we actually have. */
function ProfileHero({ user, profile }) {
  const meta = ROLE_META[user?.role] || ROLE_META.STUDENT;
  const RoleIcon = meta.icon;
  const isLead = user?.role === 'INSTRUCTOR' && user?.isLeadInstructor;

  return (
    <Card className="gap-0 overflow-hidden py-0">
      <div className="bg-golden-gradient h-20 sm:h-24" />
      <CardContent className="p-5 pt-0 sm:p-6 sm:pt-0">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <div
              className="-mt-10 flex size-20 shrink-0 items-center justify-center rounded-2xl border-4 border-card bg-card text-2xl font-bold shadow-sm sm:-mt-12 sm:size-24 sm:text-3xl"
              aria-hidden="true"
            >
              <span className="text-golden">{initialsOf(profile.name || user?.name)}</span>
            </div>
            <div className="min-w-0 sm:pb-1">
              <h2 className="truncate text-xl font-bold tracking-tight sm:text-2xl">
                {profile.name || user?.name || 'Your profile'}
              </h2>
              <p className="mt-0.5 flex items-center gap-1.5 text-sm text-muted-foreground">
                <AtSign className="size-3.5 shrink-0" />
                <span className="truncate">{profile.email || user?.email}</span>
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:pb-1">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-golden/12 px-3 py-1 text-xs font-semibold text-golden">
              <RoleIcon className="size-3.5" />
              {meta.label}
            </span>
            {isLead && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-500/12 px-3 py-1 text-xs font-semibold text-sky-700 dark:text-sky-400">
                <BadgeCheck className="size-3.5" />
                Lead Instructor
              </span>
            )}
            <span className={cn(
              'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold',
              profile.smsConsent
                ? 'bg-emerald-500/12 text-emerald-700 dark:text-emerald-400'
                : 'bg-muted text-muted-foreground',
            )}>
              <MessageSquare className="size-3.5" />
              {profile.smsConsent ? 'SMS on' : 'SMS off'}
            </span>
          </div>
        </div>

        <p className="mt-4 border-t pt-4 text-sm text-muted-foreground">{meta.blurb}</p>
      </CardContent>
    </Card>
  );
}

/** Password input with a show/hide toggle. */
function PasswordField({ id, label, value, onChange, autoComplete, invalid }) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Input
          id={id}
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={onChange}
          autoComplete={autoComplete}
          aria-invalid={invalid || undefined}
          className={cn('pr-10', invalid && 'border-destructive focus-visible:ring-destructive/30')}
        />
        <button
          type="button"
          onClick={() => setVisible((current) => !current)}
          className="absolute inset-y-0 right-0 flex w-10 items-center justify-center rounded-r-md text-muted-foreground transition-colors hover:text-foreground"
          aria-label={visible ? 'Hide password' : 'Show password'}
        >
          {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      </div>
    </div>
  );
}

function SectionCard({ icon: Icon, title, description, children, footer }) {
  return (
    <Card className="gap-0 py-0">
      <div className="flex items-start gap-3 border-b px-5 py-4">
        <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted">
          <Icon className="size-4 text-muted-foreground" />
        </span>
        <div>
          <h3 className="font-semibold leading-tight">{title}</h3>
          {description && <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>}
        </div>
      </div>
      <div className="px-5 py-5">{children}</div>
      {footer && <div className="flex flex-wrap items-center gap-3 border-t bg-muted/30 px-5 py-4">{footer}</div>}
    </Card>
  );
}

function ProfileSkeleton() {
  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-4 w-72 max-w-full" />
      </div>
      <Skeleton className="h-56 rounded-xl" />
      <Skeleton className="h-10 w-72 max-w-full rounded-lg" />
      <Skeleton className="h-80 rounded-xl" />
    </div>
  );
}

export function ProfileClient() {
  const { user, setSessionFromToken } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [changingPw, setChangingPw] = useState(false);
  const [profile, setProfile] = useState({ name: '', email: '', phone: '', smsConsent: false });
  const [saved, setSaved] = useState(null);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await authAPI.getMe();
        if (!cancelled && res.data) {
          const next = {
            name: res.data.name || '',
            email: res.data.email || '',
            phone: res.data.phone || '',
            smsConsent: !!res.data.smsConsent,
          };
          setProfile(next);
          setSaved(next);
        }
      } catch {
        if (!cancelled) toast.error('Failed to load profile');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const dirty = useMemo(
    () => Boolean(saved) && Object.keys(saved).some((key) => profile[key] !== saved[key]),
    [profile, saved],
  );

  const strength = strengthOf(passwordForm.newPassword);
  const mismatch = Boolean(passwordForm.confirmPassword)
    && passwordForm.newPassword !== passwordForm.confirmPassword;
  const canSubmitPassword = Boolean(passwordForm.currentPassword)
    && passwordForm.newPassword.length >= 8
    && passwordForm.newPassword === passwordForm.confirmPassword;

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      const payload = {
        name: profile.name.trim(),
        email: profile.email.trim(),
        phone: profile.phone.trim() || null,
        smsConsent: !!profile.smsConsent,
      };
      const res = await authAPI.updateMe(payload);
      if (res.data?.access) {
        setSessionFromToken(res.data.access);
      }
      // Mirror the trimmed values back so a saved form does not read as dirty.
      const normalized = { ...payload, phone: payload.phone || '' };
      setProfile(normalized);
      setSaved(normalized);
      toast.success('Profile updated');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Could not update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }
    try {
      setChangingPw(true);
      await authAPI.changePassword(passwordForm.currentPassword, passwordForm.newPassword);
      toast.success('Password changed');
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      toast.error(err.response?.data?.error || 'Could not change password');
    } finally {
      setChangingPw(false);
    }
  };

  if (loading) return <ProfileSkeleton />;

  const showDocuments = user?.role === 'STUDENT' || user?.role === 'RENTER';

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Profile</h1>
        <p className="mt-1 text-muted-foreground">
          Manage your contact details, notifications, and sign-in security.
        </p>
      </div>

      <ProfileHero user={user} profile={profile} />

      <Tabs defaultValue="account" className="space-y-5">
        <TabsList className="h-auto w-full flex-wrap justify-start gap-1 p-1 sm:w-auto">
          <TabsTrigger value="account" className="gap-1.5 px-3 py-1.5">
            <User className="size-4" />
            Account
          </TabsTrigger>
          <TabsTrigger value="security" className="gap-1.5 px-3 py-1.5">
            <Lock className="size-4" />
            Security
          </TabsTrigger>
          {showDocuments && (
            <TabsTrigger value="documents" className="gap-1.5 px-3 py-1.5">
              <FileText className="size-4" />
              Documents
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="account">
          <form onSubmit={handleSaveProfile} className="space-y-5">
            <SectionCard
              icon={User}
              title="Contact details"
              description="Used for scheduling notices and account recovery."
              footer={(
                <>
                  <Button type="submit" disabled={saving || !dirty}>
                    {saving ? (<><Loader2 className="mr-2 size-4 animate-spin" />Saving…</>) : 'Save changes'}
                  </Button>
                  {dirty && !saving && (
                    <Button type="button" variant="ghost" onClick={() => setProfile(saved)}>
                      Discard
                    </Button>
                  )}
                  <p className="text-sm text-muted-foreground">
                    {dirty ? 'You have unsaved changes.' : 'Everything is saved.'}
                  </p>
                </>
              )}
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">Full name</Label>
                  <Input
                    id="name"
                    value={profile.name}
                    onChange={(e) => setProfile((p) => ({ ...p, name: e.target.value }))}
                    autoComplete="name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email address</Label>
                  <Input
                    id="email"
                    type="email"
                    value={profile.email}
                    onChange={(e) => setProfile((p) => ({ ...p, email: e.target.value }))}
                    autoComplete="email"
                  />
                </div>
              </div>
            </SectionCard>

            <SectionCard
              icon={MessageSquare}
              title="Text message notifications"
              description="Lesson confirmations, reminders, and schedule changes by SMS."
            >
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-4 rounded-lg border p-4">
                  <div className="space-y-1">
                    <p className="font-medium">Receive SMS notifications</p>
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      I agree to receive transactional SMS messages from Wings of Angel Aviation
                      regarding my flight lessons, including scheduling confirmations, reminders,
                      and updates. Message frequency varies. Message and data rates may apply.
                      Reply STOP to opt out or HELP for help.
                    </p>
                  </div>
                  <Switch
                    checked={profile.smsConsent}
                    onCheckedChange={(checked) => setProfile((p) => ({ ...p, smsConsent: checked }))}
                    aria-label="Receive SMS notifications"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone" className="flex items-center gap-2">
                    <Phone className="size-4" />
                    Mobile number
                  </Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="e.g. 913-401-5457"
                    value={profile.phone}
                    onChange={(e) => setProfile((p) => ({ ...p, phone: e.target.value }))}
                    autoComplete="tel"
                    disabled={!profile.smsConsent}
                    className={cn(!profile.smsConsent && 'cursor-not-allowed opacity-60')}
                  />
                  <p className="text-xs text-muted-foreground">
                    {profile.smsConsent
                      ? 'Include your area code. Standard carrier rates apply.'
                      : 'Turn on SMS notifications above to add or edit your mobile number.'}
                  </p>
                </div>
              </div>
            </SectionCard>
          </form>
        </TabsContent>

        <TabsContent value="security">
          <form onSubmit={handleChangePassword}>
            <SectionCard
              icon={Lock}
              title="Change password"
              description="Use a strong password you do not reuse anywhere else."
              footer={(
                <>
                  <Button type="submit" disabled={changingPw || !canSubmitPassword}>
                    {changingPw ? (<><Loader2 className="mr-2 size-4 animate-spin" />Updating…</>) : 'Change password'}
                  </Button>
                  <p className="text-sm text-muted-foreground">
                    You stay signed in on this device after changing it.
                  </p>
                </>
              )}
            >
              <div className="grid gap-6 lg:grid-cols-2">
                <div className="space-y-4">
                  <PasswordField
                    id="currentPassword"
                    label="Current password"
                    value={passwordForm.currentPassword}
                    onChange={(e) => setPasswordForm((p) => ({ ...p, currentPassword: e.target.value }))}
                    autoComplete="current-password"
                  />
                  <PasswordField
                    id="newPassword"
                    label="New password"
                    value={passwordForm.newPassword}
                    onChange={(e) => setPasswordForm((p) => ({ ...p, newPassword: e.target.value }))}
                    autoComplete="new-password"
                  />
                  <PasswordField
                    id="confirmPassword"
                    label="Confirm new password"
                    value={passwordForm.confirmPassword}
                    onChange={(e) => setPasswordForm((p) => ({ ...p, confirmPassword: e.target.value }))}
                    autoComplete="new-password"
                    invalid={mismatch}
                  />
                  {mismatch && (
                    <p className="flex items-center gap-1.5 text-sm text-destructive">
                      <X className="size-4" />
                      Passwords do not match.
                    </p>
                  )}
                </div>

                <div className="space-y-4 rounded-lg bg-muted/40 p-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium">Password strength</p>
                      <span className="text-sm text-muted-foreground">{strength.label}</span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className={cn('h-full rounded-full transition-all', strength.tone)}
                        style={{ width: `${strength.score}%` }}
                      />
                    </div>
                  </div>

                  <ul className="space-y-2">
                    {PASSWORD_RULES.map((rule) => {
                      const met = rule.test(passwordForm.newPassword);
                      return (
                        <li key={rule.id} className="flex items-center gap-2 text-sm">
                          <span className={cn(
                            'flex size-4 shrink-0 items-center justify-center rounded-full',
                            met ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' : 'bg-muted-foreground/15 text-muted-foreground',
                          )}>
                            <Check className="size-3" />
                          </span>
                          <span className={met ? 'text-foreground' : 'text-muted-foreground'}>
                            {rule.label}
                          </span>
                        </li>
                      );
                    })}
                  </ul>

                  <p className="border-t pt-3 text-xs text-muted-foreground">
                    Only the first rule is enforced. The rest are strong recommendations.
                  </p>
                </div>
              </div>
            </SectionCard>
          </form>
        </TabsContent>

        {showDocuments && (
          <TabsContent value="documents">
            <DocumentsClient embedded />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
