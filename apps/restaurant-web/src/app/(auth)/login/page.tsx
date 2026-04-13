'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { fetchApi, ApiError } from '@/lib/api';
import { useAuthStore } from '@/store/auth';

export default function LoginPage() {
  const router = useRouter();
  const setAuth = useAuthStore((state) => state.setAuth);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const response = await fetchApi<{ accessToken: string; refreshToken: string; user: any }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });

      if (response.user.role !== 'RESTAURANT') {
        throw new Error('Access denied. Restaurant account required.');
      }

      setAuth(response.user, response.accessToken);
      router.push('/orders');
    } catch (err: any) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError(err.message || 'Failed to login');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardContent className="p-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-danger/10 text-danger p-4 rounded-lg text-sm font-medium">
              {error}
            </div>
          )}
          <Input
            label="Email Address"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            placeholder="restaurant@example.com"
          />
          <Input
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
            placeholder="••••••••"
          />
          <Button type="submit" className="w-full" size="lg" isLoading={isLoading}>
            Sign In to Dashboard
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
