"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { GoldenButton } from "@/components/ui/golden-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Plane, ArrowLeft, Mail, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { authAPI } from "@/lib/api";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!email.trim()) {
      toast.error("Please enter your email address");
      return;
    }

    setIsLoading(true);

    try {
      await authAPI.forgotPassword(email.trim().toLowerCase());
      setIsSubmitted(true);
    } catch (error) {
      // Even on error, show success for security (prevents email enumeration)
      console.error("Forgot password error:", error);
      setIsSubmitted(true);
    } finally {
      setIsLoading(false);
    }
  };

  // Success state - email sent
  if (isSubmitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 to-yellow-100 dark:from-gray-900 dark:to-gray-800 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="p-4 rounded-full bg-green-100 dark:bg-green-900/30">
                <CheckCircle className="h-12 w-12 text-green-600 dark:text-green-400" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold">Check Your Email</CardTitle>
            <CardDescription className="mt-2">
              If an account exists for <span className="font-medium">{email}</span>,
              we've sent a password reset link.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-muted/50 rounded-lg p-4 text-sm text-muted-foreground">
              <p className="font-medium text-foreground mb-2">What's next?</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Check your inbox (and spam folder)</li>
                <li>Click the reset link in the email</li>
                <li>The link expires in 1 hour</li>
              </ul>
            </div>

            <div className="text-center space-y-3">
              <p className="text-sm text-muted-foreground">
                Didn't receive an email?
              </p>
              <Button
                variant="outline"
                onClick={() => {
                  setIsSubmitted(false);
                  setEmail("");
                }}
              >
                Try Again
              </Button>
            </div>

            <div className="text-center pt-4 border-t">
              <Link
                href="/login"
                className="text-sm text-primary hover:underline inline-flex items-center gap-1"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Login
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Initial form state
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 to-yellow-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="icon-container dark:icon-container-dark">
              <Plane className="icon-xl icon-black dark:icon-black-dark" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold text-golden dark:text-golden-dark">
            Forgot Password?
          </CardTitle>
          <CardDescription>
            Enter your email address and we'll send you a link to reset your
            password.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                  required
                  autoComplete="email"
                  autoFocus
                />
              </div>
            </div>

            <GoldenButton type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Sending..." : "Send Reset Link"}
            </GoldenButton>

            <div className="text-center pt-4">
              <Link
                href="/login"
                className="text-sm text-muted-foreground hover:text-primary inline-flex items-center gap-1"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Login
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
