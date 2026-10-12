'use client';

import React, { useState } from 'react';
import Link from 'next/navigation';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import {
  Sparkles,
  LayoutDashboard,
  PlusCircle,
  Film,
  Send,
  Wallet,
  LogOut,
  Menu,
  X,
} from 'lucide-react';

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const brandNav = [
    { label: 'Overview', href: '/dashboard/brand', icon: LayoutDashboard },
    { label: 'New Campaign', href: '/dashboard/brand/campaigns/new', icon: PlusCircle },
  ];

  const creatorNav = [
    { label: 'Overview', href: '/dashboard/creator', icon: LayoutDashboard },
    { label: 'Browse Campaigns', href: '/dashboard/creator/campaigns', icon: Film },
    { label: 'My Submissions', href: '/dashboard/creator/submissions', icon: Send },
    { label: 'Earnings', href: '/dashboard/creator/earnings', icon: Wallet },
  ];

  const currentNav = user?.role === 'brand' ? brandNav : user?.role === 'creator' ? creatorNav : [];

  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center gap-8">
            <a href="/" className="flex items-center gap-2 group">
              <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-sm shadow-indigo-200 group-hover:scale-105 transition-transform">
                <Sparkles className="w-5 h-5" />
              </div>
              <span className="font-bold text-lg tracking-tight text-slate-900">
                Meme&apos;d <span className="text-indigo-600 text-sm font-semibold ml-0.5">Payouts</span>
              </span>
            </a>

            {/* Desktop Navigation */}
            {user && (
              <nav className="hidden md:flex items-center space-x-1">
                {currentNav.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href;
                  return (
                    <a
                      key={item.href}
                      href={item.href}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        isActive
                          ? 'bg-indigo-50 text-indigo-700'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      {item.label}
                    </a>
                  );
                })}
              </nav>
            )}
          </div>

          {/* Right Header: User profile or Auth buttons */}
          <div className="hidden md:flex items-center gap-3">
            {user ? (
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div className="text-sm font-semibold text-slate-900">{user.name}</div>
                  <div className="flex items-center justify-end gap-1.5">
                    <Badge variant={user.role === 'brand' ? 'live' : 'paid'} className="text-[10px] py-0 px-2">
                      {user.role}
                    </Badge>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={logout}
                  className="text-slate-600 hover:text-red-600 hover:border-red-200"
                >
                  <LogOut className="w-4 h-4 mr-1.5" />
                  Logout
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <a href="/login">
                  <Button variant="ghost" size="sm">
                    Log in
                  </Button>
                </a>
                <a href="/signup">
                  <Button variant="primary" size="sm">
                    Get Started
                  </Button>
                </a>
              </div>
            )}
          </div>

          {/* Mobile hamburger */}
          <div className="flex md:hidden items-center">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-slate-600 hover:bg-slate-100"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-slate-200 bg-white px-4 pt-2 pb-4 space-y-1">
          {user ? (
            <>
              <div className="px-3 py-2 border-b border-slate-100 mb-2">
                <div className="font-semibold text-slate-900">{user.name}</div>
                <div className="text-xs text-slate-500">{user.email} ({user.role})</div>
              </div>
              {currentNav.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  <item.icon className="w-4 h-4 text-indigo-600" />
                  {item.label}
                </a>
              ))}
              <div className="pt-2">
                <Button variant="outline" size="sm" onClick={logout} className="w-full">
                  Logout
                </Button>
              </div>
            </>
          ) : (
            <div className="space-y-2 pt-2">
              <a href="/login" className="block w-full">
                <Button variant="outline" size="sm" className="w-full">
                  Log in
                </Button>
              </a>
              <a href="/signup" className="block w-full">
                <Button variant="primary" size="sm" className="w-full">
                  Get Started
                </Button>
              </a>
            </div>
          )}
        </div>
      )}
    </header>
  );
};
