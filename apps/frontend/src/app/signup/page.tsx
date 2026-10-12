'use client';

import React, { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { SignupSchema, SignupInput, UserRole } from '@/shared';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/Button';
import { Sparkles, AlertCircle, Building2, User } from 'lucide-react';

function SignupForm() {
  const searchParams = useSearchParams();
  const initialRole = (searchParams.get('role') as UserRole) || 'creator';

  const { signup } = useAuth();
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<SignupInput>({
    resolver: zodResolver(SignupSchema),
    defaultValues: {
      role: ['brand', 'creator'].includes(initialRole) ? initialRole : 'creator',
    },
  });

  const selectedRole = watch('role');

  const onSubmit = async (data: SignupInput) => {
    try {
      setError(null);
      await signup(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    }
  };

  return (
    <div className="max-w-md mx-auto my-12 bg-white rounded-2xl border border-slate-200 p-8 shadow-sm">
      <div className="text-center space-y-2 mb-6">
        <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center mx-auto shadow-xs">
          <Sparkles className="w-6 h-6" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900">Create an Account</h1>
        <p className="text-sm text-slate-500">Choose your role to get started</p>
      </div>

      {error && (
        <div className="mb-6 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Role Selector Tabs */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <button
          type="button"
          onClick={() => setValue('role', 'creator')}
          className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border text-center transition-all ${
            selectedRole === 'creator'
              ? 'border-indigo-600 bg-indigo-50/50 text-indigo-900 shadow-xs'
              : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
          }`}
        >
          <User className={`w-5 h-5 ${selectedRole === 'creator' ? 'text-indigo-600' : 'text-slate-400'}`} />
          <span className="text-xs font-bold uppercase tracking-wider">Creator</span>
          <span className="text-[11px] text-slate-500">Submit posts & earn</span>
        </button>

        <button
          type="button"
          onClick={() => setValue('role', 'brand')}
          className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border text-center transition-all ${
            selectedRole === 'brand'
              ? 'border-indigo-600 bg-indigo-50/50 text-indigo-900 shadow-xs'
              : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
          }`}
        >
          <Building2 className={`w-5 h-5 ${selectedRole === 'brand' ? 'text-indigo-600' : 'text-slate-400'}`} />
          <span className="text-xs font-bold uppercase tracking-wider">Brand</span>
          <span className="text-[11px] text-slate-500">Host campaigns</span>
        </button>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
            Full Name or Company
          </label>
          <input
            type="text"
            placeholder={selectedRole === 'brand' ? 'Acme Media Inc.' : 'Sarah Connor'}
            {...register('name')}
            className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
          />
          {errors.name && (
            <p className="mt-1 text-xs text-red-600">{errors.name.message}</p>
          )}
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
            Email Address
          </label>
          <input
            type="email"
            placeholder="you@domain.com"
            {...register('email')}
            className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
          />
          {errors.email && (
            <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>
          )}
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
            Password (min 8 chars)
          </label>
          <input
            type="password"
            placeholder="••••••••"
            {...register('password')}
            className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
          />
          {errors.password && (
            <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>
          )}
        </div>

        <Button type="submit" isLoading={isSubmitting} className="w-full mt-2">
          Create Account
        </Button>
      </form>

      <div className="mt-6 text-center text-xs text-slate-500">
        Already have an account?{' '}
        <a href="/login" className="font-semibold text-indigo-600 hover:text-indigo-500">
          Sign in
        </a>
      </div>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
      }
    >
      <SignupForm />
    </Suspense>
  );
}
