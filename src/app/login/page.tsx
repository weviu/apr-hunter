'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { TrendingUp, Mail, Lock, AlertCircle } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { Button, Card, FadeRise } from '@/components/ui';

const fieldClass =
  'w-full rounded-md border border-hairline bg-canvas py-2.5 pl-10 pr-3 text-sm text-fg ' +
  'placeholder:text-fg-faint transition focus:border-accent/60 focus:outline-none focus:ring-2 focus:ring-accent/40';

export default function LoginPage() {
  const router = useRouter();
  const { login, isLoading: authLoading } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await login(email, password);
      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas px-4">
      <FadeRise className="w-full max-w-md">
        <div className="mb-8 text-center">
          <Link href="/" className="inline-flex items-center gap-2">
            <TrendingUp className="h-8 w-8 text-accent" />
            <span className="text-2xl font-semibold tracking-tight text-fg">APR Hunter</span>
          </Link>
          <p className="mt-2 text-sm text-fg-muted">Sign in to track your positions</p>
        </div>

        <Card className="p-8">
          <form onSubmit={(e) => void handleSubmit(e)} className="space-y-5">
            {error && (
              <div className="flex items-center gap-2 rounded-md border border-danger/30 bg-danger-soft p-3 text-danger">
                <AlertCircle className="h-5 w-5 shrink-0" />
                <span className="text-sm">{error}</span>
              </div>
            )}

            <div>
              <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-fg-muted">
                Email address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-fg-faint" />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className={fieldClass}
                  placeholder="you@example.com"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-fg-muted">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-fg-faint" />
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className={fieldClass}
                  placeholder="••••••••"
                />
              </div>
            </div>

            <Button type="submit" className="w-full" loading={isLoading || authLoading} loadingText="Signing in…">
              Sign In
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-fg-muted">
            Don&apos;t have an account?{' '}
            <Link href="/register" className="font-medium text-accent transition hover:text-accent-hover">
              Sign up
            </Link>
          </p>
        </Card>

        <div className="mt-6 text-center">
          <Link href="/" className="text-sm text-fg-muted transition hover:text-fg">
            ← Back to home
          </Link>
        </div>
      </FadeRise>
    </div>
  );
}
