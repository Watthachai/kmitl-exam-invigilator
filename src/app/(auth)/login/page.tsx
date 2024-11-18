// app/(auth)/login/page.tsx
'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Button } from "@/app/components/ui/button";
import { validateKMITLEmail } from '@/app/lib/validation';
import { Icons } from "@/app/components/ui/icons";

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    try {
      const result = await signIn('google');
      if (result?.error) {
        setError('Google authentication failed');
      }
    } catch {
      setError('Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!validateKMITLEmail(email)) {
      setError('Please use your KMITL institutional email (@kmitl.ac.th)');
      return;
    }

    setIsLoading(true);
    try {
      const result = await signIn('email', { 
        email, 
        redirect: false 
      });

      if (result?.error) {
        setError('Email login failed');
      } else {
        router.push('/dashboard');
      }
    } catch {
      setError('Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="border rounded-md p-8 bg-white shadow-md">
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold">KMITL Login</h1>
        <p className="text-gray-500 mt-2">Only @kmitl.ac.th emails allowed</p>
      </div>

      <form onSubmit={handleEmailLogin} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              KMITL Email address
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={`mt-1 block w-full border rounded-md shadow-sm py-2 px-3 focus:ring-blue-500 focus:border-blue-500 ${
                error ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="your.email@kmitl.ac.th"
            />
            {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
          </div>
          <Button 
            type="submit" 
            disabled={isLoading}
            className="w-full"
            variant="secondary"
          >
            {isLoading ? 'Signing in...' : 'Continue'}
          </Button>
        </form>

        <div className="relative w-full max-w-md">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t"></span>
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-white px-2 text-gray-500">
              Or continue with
            </span>
          </div>
        </div>
      
      <div className="space-y-4">
        <Button 
          onClick={handleGoogleLogin} 
          disabled={isLoading}
          className="w-full flex items-center justify-center"
          variant="outline"
        >
          {isLoading ? (
            <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Icons.google className="mr-2 h-4 w-4" />
          )}
          Continue with Google
        </Button>

      </div>
    </div>
  );
}