"use client";

import { useState, useCallback } from "react";
import { Eye, EyeOff, Copy, RefreshCw, Check, KeyRound, Shield } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GoldenButton } from "@/components/ui/golden-button";
import { toast } from "sonner";

// Password validation constants
const MIN_PASSWORD_LENGTH = 8;
const MAX_PASSWORD_LENGTH = 128;

// Generate a secure random password
function generateSecurePassword(length = 16) {
  const lowercase = "abcdefghijklmnopqrstuvwxyz";
  const uppercase = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const numbers = "0123456789";
  const symbols = "!@#$%^&*";
  const allChars = lowercase + uppercase + numbers + symbols;

  // Ensure at least one of each type
  let password = "";
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += symbols[Math.floor(Math.random() * symbols.length)];

  // Fill the rest randomly
  for (let i = password.length; i < length; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }

  // Shuffle the password
  return password
    .split("")
    .sort(() => Math.random() - 0.5)
    .join("");
}

// Calculate password strength (0-4)
function getPasswordStrength(password) {
  if (!password) return { score: 0, label: "", color: "" };

  let score = 0;

  // Length checks
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;

  // Character variety checks
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) score++;

  // Cap at 4
  score = Math.min(score, 4);

  const labels = ["Very Weak", "Weak", "Fair", "Good", "Strong"];
  const colors = [
    "bg-red-500",
    "bg-orange-500",
    "bg-yellow-500",
    "bg-blue-500",
    "bg-green-500",
  ];

  return {
    score,
    label: labels[score],
    color: colors[score],
  };
}

export function ResetPasswordDialog({ open, onOpenChange, user, onResetPassword }) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [errors, setErrors] = useState({});

  const passwordStrength = getPasswordStrength(password);

  // Reset state when dialog opens/closes
  const handleOpenChange = useCallback(
    (isOpen) => {
      if (!isOpen) {
        // Reset all state when closing
        setPassword("");
        setConfirmPassword("");
        setShowPassword(false);
        setShowConfirmPassword(false);
        setErrors({});
        setCopied(false);
      }
      onOpenChange(isOpen);
    },
    [onOpenChange]
  );

  // Generate and set a random password
  const handleGeneratePassword = useCallback(() => {
    const newPassword = generateSecurePassword(16);
    setPassword(newPassword);
    setConfirmPassword(newPassword);
    setShowPassword(true); // Show it so user can see/copy
    setErrors({});
    toast.success("Secure password generated");
  }, []);

  // Copy password to clipboard
  const handleCopyPassword = useCallback(async () => {
    if (!password) return;

    try {
      await navigator.clipboard.writeText(password);
      setCopied(true);
      toast.success("Password copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error("Failed to copy password");
    }
  }, [password]);

  // Validate the form
  const validate = useCallback(() => {
    const newErrors = {};

    if (!password) {
      newErrors.password = "Password is required";
    } else if (password.length < MIN_PASSWORD_LENGTH) {
      newErrors.password = `Password must be at least ${MIN_PASSWORD_LENGTH} characters`;
    } else if (password.length > MAX_PASSWORD_LENGTH) {
      newErrors.password = `Password must be less than ${MAX_PASSWORD_LENGTH} characters`;
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = "Please confirm the password";
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [password, confirmPassword]);

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validate()) return;

    setIsSubmitting(true);
    try {
      await onResetPassword(user.id, password);
      handleOpenChange(false);
    } catch (error) {
      // Error is handled by parent component
      console.error("Reset password error:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-full bg-amber-100 dark:bg-amber-900/30">
              <KeyRound className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <DialogTitle>Reset Password</DialogTitle>
            </div>
          </div>
          <DialogDescription>
            Set a new password for <span className="font-medium">{user.name || user.email}</span>.
            Make sure to share this password securely with the user.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          {/* Password Field */}
          <div className="space-y-2">
            <Label htmlFor="new-password">New Password</Label>
            <div className="relative">
              <Input
                id="new-password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (errors.password) setErrors((prev) => ({ ...prev, password: "" }));
                }}
                placeholder="Enter new password"
                className={`pr-24 ${errors.password ? "border-red-500 focus-visible:ring-red-500" : ""}`}
                autoComplete="new-password"
                disabled={isSubmitting}
              />
              <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0"
                  onClick={handleCopyPassword}
                  disabled={!password}
                  tabIndex={-1}
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <Copy className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
            </div>
            {errors.password && (
              <p className="text-sm text-red-500">{errors.password}</p>
            )}

            {/* Password Strength Indicator */}
            {password && (
              <div className="space-y-1">
                <div className="flex gap-1">
                  {[0, 1, 2, 3].map((index) => (
                    <div
                      key={index}
                      className={`h-1 flex-1 rounded-full transition-colors ${
                        index <= passwordStrength.score - 1
                          ? passwordStrength.color
                          : "bg-gray-200 dark:bg-gray-700"
                      }`}
                    />
                  ))}
                </div>
                <div className="flex items-center gap-1 text-xs">
                  <Shield className="h-3 w-3" />
                  <span className={passwordStrength.score >= 3 ? "text-green-600" : "text-muted-foreground"}>
                    {passwordStrength.label}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Confirm Password Field */}
          <div className="space-y-2">
            <Label htmlFor="confirm-password">Confirm Password</Label>
            <div className="relative">
              <Input
                id="confirm-password"
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  if (errors.confirmPassword)
                    setErrors((prev) => ({ ...prev, confirmPassword: "" }));
                }}
                placeholder="Confirm new password"
                className={`pr-10 ${errors.confirmPassword ? "border-red-500 focus-visible:ring-red-500" : ""}`}
                autoComplete="new-password"
                disabled={isSubmitting}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                tabIndex={-1}
              >
                {showConfirmPassword ? (
                  <EyeOff className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <Eye className="h-4 w-4 text-muted-foreground" />
                )}
              </Button>
            </div>
            {errors.confirmPassword && (
              <p className="text-sm text-red-500">{errors.confirmPassword}</p>
            )}
            {password && confirmPassword && password === confirmPassword && !errors.confirmPassword && (
              <p className="text-sm text-green-600 flex items-center gap-1">
                <Check className="h-3 w-3" /> Passwords match
              </p>
            )}
          </div>

          {/* Generate Password Button */}
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={handleGeneratePassword}
            disabled={isSubmitting}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Generate Secure Password
          </Button>

          {/* Security Notice */}
          <div className="rounded-md bg-muted/50 p-3 text-sm text-muted-foreground">
            <p className="font-medium text-foreground mb-1">Security Tips:</p>
            <ul className="list-disc list-inside space-y-0.5 text-xs">
              <li>Use at least 8 characters (12+ recommended)</li>
              <li>Include uppercase, lowercase, numbers, and symbols</li>
              <li>Share the password securely (not via email)</li>
              <li>Advise the user to change it after first login</li>
            </ul>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <GoldenButton type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Resetting..." : "Reset Password"}
            </GoldenButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
