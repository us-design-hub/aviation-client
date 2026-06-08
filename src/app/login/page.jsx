"use client"

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { GoldenButton } from '@/components/ui/golden-button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plane, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';

export default function LoginPage() {
  const [credentials, setCredentials] = useState({
    email: "",
    password: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { login } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const result = await login(credentials);
      if (result.success) {
        toast.success('Login successful!');
        router.push('/dashboard');
      } else {
        toast.error(result.error);
      }
    } catch (error) {
      toast.error('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#000000] text-white">
      <div className="mx-auto flex min-h-screen w-full max-w-xl items-center justify-center px-4 py-10">
        <div className="w-full overflow-hidden rounded-lg border border-[#f4c21b]/35 bg-[#151515] p-6 shadow-2xl shadow-black/50 sm:p-10">
            <div className="mb-8 text-center">
              <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-lg border border-[#f4c21b]/40 bg-black">
                <img src="/icon.png" alt="Wings of Angel Aviation" className="h-16 w-16 object-contain" />
              </div>
              <h2 className="text-2xl font-bold text-[#f9d24a]">Wings of Angel Aviation</h2>
              <p className="mt-2 text-sm text-zinc-300">
                Sign in to your Flight School CRM account
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-zinc-100">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
                value={credentials.email}
                onChange={(e) => setCredentials(prev => ({ ...prev, email: e.target.value }))}
                required
                className="border-zinc-700 bg-black text-white placeholder:text-zinc-500 focus-visible:ring-[#f4c21b]"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-zinc-100">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={credentials.password}
                  onChange={(e) => setCredentials(prev => ({ ...prev, password: e.target.value }))}
                  required
                  className="border-zinc-700 bg-black pr-10 text-white placeholder:text-zinc-500 focus-visible:ring-[#f4c21b]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 transition-colors hover:text-[#f9d24a]"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
            <GoldenButton 
              type="submit" 
              className="w-full bg-[#f4c21b] text-black hover:bg-[#ffd84d]" 
              disabled={isLoading}
            >
              {isLoading ? 'Signing in...' : 'Sign In'}
            </GoldenButton>

            <div className="text-center">
              <a 
                href="/forgot-password" 
                className="text-sm text-zinc-300 transition-colors hover:text-[#f9d24a]"
              >
                Forgot your password?
              </a>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
