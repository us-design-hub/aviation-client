'use client';

import { useState, useEffect } from 'react';
import { authAPI } from '@/lib/api';
import { useAuth } from '@/contexts/auth-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { User, Lock, Loader2, Phone } from 'lucide-react';
import { toast } from 'sonner';

export function ProfileClient() {
  const { setSessionFromToken } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [changingPw, setChangingPw] = useState(false);
  const [profile, setProfile] = useState({
    name: '',
    email: '',
    phone: '',
    smsConsent: false,
  });
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
          setProfile({
            name: res.data.name || '',
            email: res.data.email || '',
            phone: res.data.phone || '',
            smsConsent: !!res.data.smsConsent,
          });
        }
      } catch {
        if (!cancelled) toast.error('Failed to load profile');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      const res = await authAPI.updateMe({
        name: profile.name.trim(),
        email: profile.email.trim(),
        phone: profile.phone.trim() || null,
        smsConsent: !!profile.smsConsent,
      });
      if (res.data?.access) {
        setSessionFromToken(res.data.access);
      }
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

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-lg">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Profile</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Update your contact information and password
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <User className="h-5 w-5" />
            Contact
          </CardTitle>
          <CardDescription>Email and phone are used for scheduling notices and SMS.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={profile.name}
                onChange={(e) => setProfile((p) => ({ ...p, name: e.target.value }))}
                autoComplete="name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={profile.email}
                onChange={(e) => setProfile((p) => ({ ...p, email: e.target.value }))}
                autoComplete="email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone" className="flex items-center gap-2">
                <Phone className="h-4 w-4" />
                Phone
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
            </div>
            <label className="flex items-start gap-3 rounded-md border p-3 text-sm leading-6">
              <input
                type="checkbox"
                className="mt-1 h-4 w-4 shrink-0"
                checked={profile.smsConsent}
                onChange={(e) =>
                  setProfile((p) => ({ ...p, smsConsent: e.target.checked }))
                }
              />
              <span>
                I agree to receive transactional SMS messages from Wings of Angel Aviation regarding my flight lessons (including scheduling confirmations, reminders, and updates). Message frequency varies. Message and data rates may apply. Reply STOP to opt out or HELP for help.
              </span>
            </label>
            <Button type="submit" disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving…
                </>
              ) : (
                'Save changes'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Lock className="h-5 w-5" />
            Password
          </CardTitle>
          <CardDescription>Use a strong password you do not reuse elsewhere.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="currentPassword">Current password</Label>
              <Input
                id="currentPassword"
                type="password"
                value={passwordForm.currentPassword}
                onChange={(e) =>
                  setPasswordForm((p) => ({ ...p, currentPassword: e.target.value }))
                }
                autoComplete="current-password"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="newPassword">New password</Label>
              <Input
                id="newPassword"
                type="password"
                value={passwordForm.newPassword}
                onChange={(e) =>
                  setPasswordForm((p) => ({ ...p, newPassword: e.target.value }))
                }
                autoComplete="new-password"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm new password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={passwordForm.confirmPassword}
                onChange={(e) =>
                  setPasswordForm((p) => ({ ...p, confirmPassword: e.target.value }))
                }
                autoComplete="new-password"
              />
            </div>
            <Button type="submit" variant="secondary" disabled={changingPw}>
              {changingPw ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating…
                </>
              ) : (
                'Change password'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
