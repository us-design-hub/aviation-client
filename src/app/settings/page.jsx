"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  Mail,
  Server,
  Lock,
  Check,
  X,
  Loader2,
  Eye,
  EyeOff,
  Send,
  RefreshCw,
  Info,
  Shield,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { GoldenButton } from "@/components/ui/golden-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { ProtectedRoute } from "@/components/protected-route";
import { RoleGate } from "@/components/rbac/role-gate";
import { MainLayout } from "@/components/layout/main-layout";
import { settingsAPI, authAPI } from "@/lib/api";

function SettingsClient() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [testEmail, setTestEmail] = useState("");
  const [userEmail, setUserEmail] = useState("");

  // SMTP Configuration state
  const [config, setConfig] = useState({
    enabled: false,
    host: "",
    port: 465,
    secure: true,
    user: "",
    password: "",
    from: "",
    fromName: "",
    hasPassword: false,
  });

  // Active configuration (what's actually being used)
  const [activeConfig, setActiveConfig] = useState(null);
  const [defaults, setDefaults] = useState(null);

  // Fetch current settings and user info
  useEffect(() => {
    fetchSettings();
    fetchUserEmail();
  }, []);

  const fetchUserEmail = async () => {
    try {
      const response = await authAPI.getMe();
      if (response.data.email) {
        setUserEmail(response.data.email);
        setTestEmail(response.data.email); // Pre-fill test email
      }
    } catch (error) {
      console.error("Error fetching user email:", error);
    }
  };

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await settingsAPI.getSmtp();
      const data = response.data;

      setConfig({
        enabled: data.config.enabled,
        host: data.config.host || "",
        port: data.config.port || 465,
        secure: data.config.secure,
        user: data.config.user || "",
        password: "", // Never received from server
        from: data.config.from || "",
        fromName: data.config.fromName || "",
        hasPassword: data.config.hasPassword,
      });

      setActiveConfig(data.activeConfig);
      setDefaults(data.defaults);
    } catch (error) {
      console.error("Error fetching settings:", error);
      toast.error("Failed to load settings");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      // Validate if enabling
      if (config.enabled) {
        if (!config.host) {
          toast.error("SMTP Host is required");
          return;
        }
        if (!config.user) {
          toast.error("Username/Email is required");
          return;
        }
        if (!config.password && !config.hasPassword) {
          toast.error("Password is required");
          return;
        }
      }

      await settingsAPI.updateSmtp({
        enabled: config.enabled,
        host: config.host,
        port: config.port,
        secure: config.secure,
        user: config.user,
        password: config.password || undefined, // Only send if changed
        from: config.from,
        fromName: config.fromName,
      });

      toast.success("Settings saved successfully");
      
      // Refresh to get updated active config
      await fetchSettings();
    } catch (error) {
      console.error("Error saving settings:", error);
      const errorMsg = error.response?.data?.error || "Failed to save settings";
      toast.error(errorMsg);
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    try {
      setTesting(true);

      const response = await settingsAPI.testSmtp(testEmail || undefined);
      const result = response.data;

      if (result.success) {
        toast.success(result.message);
      } else {
        toast.error(result.message || result.error || "Connection test failed");
      }
    } catch (error) {
      console.error("Error testing SMTP:", error);
      const errorMsg = error.response?.data?.error || "Connection test failed";
      toast.error(errorMsg);
    } finally {
      setTesting(false);
    }
  };

  const handleUseDefaults = () => {
    if (defaults) {
      setConfig((prev) => ({
        ...prev,
        host: defaults.host,
        port: defaults.port,
        secure: defaults.secure,
        from: defaults.from,
        fromName: defaults.fromName,
      }));
      toast.success("Default values loaded. Enter your username and password.");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground mt-1">
          Configure system settings for Wings CRM
        </p>
      </div>

      {/* Current Status Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="h-5 w-5" />
            Email Configuration Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          {activeConfig && (
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Status:</span>
                {activeConfig.host && activeConfig.user ? (
                  <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                    <Check className="h-3 w-3 mr-1" />
                    Configured
                  </Badge>
                ) : (
                  <Badge variant="secondary">
                    <X className="h-3 w-3 mr-1" />
                    Not Configured
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Source:</span>
                <Badge variant="outline">
                  {activeConfig.source === "database"
                    ? "Custom Settings"
                    : activeConfig.source === "environment"
                    ? "Environment Variables"
                    : "Default"}
                </Badge>
              </div>
              {activeConfig.host && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Server:</span>
                  <code className="text-sm bg-muted px-2 py-0.5 rounded">
                    {activeConfig.host}:{activeConfig.port}
                  </code>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* SMTP Configuration Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Email (SMTP) Configuration
              </CardTitle>
              <CardDescription>
                Configure SMTP settings for sending password reset emails
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Label htmlFor="smtp-enabled" className="text-sm">
                Enable Custom SMTP
              </Label>
              <Switch
                id="smtp-enabled"
                checked={config.enabled}
                onCheckedChange={(checked) =>
                  setConfig((prev) => ({ ...prev, enabled: checked }))
                }
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Quick Actions */}
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleUseDefaults}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Load Hostinger Defaults
            </Button>
          </div>

          <Separator />

          {/* Server Settings */}
          <div className="space-y-4">
            <h3 className="font-medium flex items-center gap-2">
              <Server className="h-4 w-4" />
              Server Settings
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="smtp-host">SMTP Host</Label>
                <Input
                  id="smtp-host"
                  placeholder="smtp.hostinger.com"
                  value={config.host}
                  onChange={(e) =>
                    setConfig((prev) => ({ ...prev, host: e.target.value }))
                  }
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-2">
                  <Label htmlFor="smtp-port">Port</Label>
                  <Select
                    value={String(config.port)}
                    onValueChange={(value) =>
                      setConfig((prev) => ({
                        ...prev,
                        port: parseInt(value),
                        secure: value === "465",
                      }))
                    }
                  >
                    <SelectTrigger id="smtp-port">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="465">465 (SSL)</SelectItem>
                      <SelectItem value="587">587 (TLS)</SelectItem>
                      <SelectItem value="25">25 (Plain)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Security</Label>
                  <div className="flex items-center h-10 gap-2">
                    <Switch
                      checked={config.secure}
                      onCheckedChange={(checked) =>
                        setConfig((prev) => ({ ...prev, secure: checked }))
                      }
                    />
                    <span className="text-sm text-muted-foreground">
                      {config.secure ? "SSL/TLS" : "STARTTLS"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Authentication */}
          <div className="space-y-4">
            <h3 className="font-medium flex items-center gap-2">
              <Lock className="h-4 w-4" />
              Authentication
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="smtp-user">Username / Email</Label>
                <Input
                  id="smtp-user"
                  type="email"
                  placeholder="noreply@wingsofanangelaviation.com"
                  value={config.user}
                  onChange={(e) =>
                    setConfig((prev) => ({ ...prev, user: e.target.value }))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="smtp-pass">
                  Password
                  {config.hasPassword && !config.password && (
                    <span className="text-xs text-muted-foreground ml-2">
                      (leave blank to keep current)
                    </span>
                  )}
                </Label>
                <div className="relative">
                  <Input
                    id="smtp-pass"
                    type={showPassword ? "text" : "password"}
                    placeholder={config.hasPassword ? "••••••••" : "Enter password"}
                    value={config.password}
                    onChange={(e) =>
                      setConfig((prev) => ({ ...prev, password: e.target.value }))
                    }
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Sender Info */}
          <div className="space-y-4">
            <h3 className="font-medium flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Sender Information
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="smtp-from">From Email</Label>
                <Input
                  id="smtp-from"
                  type="email"
                  placeholder="noreply@wingsofanangelaviation.com"
                  value={config.from}
                  onChange={(e) =>
                    setConfig((prev) => ({ ...prev, from: e.target.value }))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="smtp-from-name">From Name</Label>
                <Input
                  id="smtp-from-name"
                  placeholder="Wings CRM"
                  value={config.fromName}
                  onChange={(e) =>
                    setConfig((prev) => ({ ...prev, fromName: e.target.value }))
                  }
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Test Connection */}
          <div className="space-y-4">
            <h3 className="font-medium flex items-center gap-2">
              <Send className="h-4 w-4" />
              Test Configuration
            </h3>

            <div className="space-y-2">
              <Label htmlFor="test-email">
                Send Test Email To
                {userEmail && (
                  <span className="text-xs text-muted-foreground ml-2">
                    (pre-filled with your email)
                  </span>
                )}
              </Label>
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <Input
                    id="test-email"
                    type="email"
                    placeholder={userEmail || "Enter email address"}
                    value={testEmail}
                    onChange={(e) => setTestEmail(e.target.value)}
                  />
                </div>
                <Button
                  variant="outline"
                  onClick={handleTestConnection}
                  disabled={testing}
                >
                  {testing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Testing...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      {testEmail ? "Send Test Email" : "Test Connection"}
                    </>
                  )}
                </Button>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Enter an email address to receive a test message, or clear the field to just test the SMTP connection.
            </p>
          </div>

          <Separator />

          {/* Save Button */}
          <div className="flex justify-end gap-4">
            <Button variant="outline" onClick={fetchSettings} disabled={saving}>
              Reset
            </Button>
            <GoldenButton onClick={handleSave} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Save Settings
                </>
              )}
            </GoldenButton>
          </div>
        </CardContent>
      </Card>

      {/* Security Note */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <Shield className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
            <div className="text-sm text-muted-foreground">
              <p className="font-medium text-foreground mb-1">Security Note</p>
              <p>
                SMTP passwords are encrypted before storage. The password is never
                sent back to the browser after being saved. If environment variables
                are configured, they will be used as a fallback when custom settings
                are disabled.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <ProtectedRoute>
      <RoleGate allowedRoles={["ADMIN"]}>
        <MainLayout>
          <SettingsClient />
        </MainLayout>
      </RoleGate>
    </ProtectedRoute>
  );
}
