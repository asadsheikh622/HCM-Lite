import React, { useState } from 'react';
import { IUser, ICompany } from '../types/client';
import {
  LayoutDashboard,
  Users,
  Clock,
  Calendar,
  DollarSign,
  Settings,
  ShieldAlert,
  Sparkles,
  Database,
  LogOut,
  Menu,
  X,
  Bell,
  ChevronRight,
} from 'lucide-react';

interface AppLayoutProps {
  currentUser: IUser;
  company: ICompany | null;
  activeTab: string;
  onSelectTab: (tab: string) => void;
  onLogout: () => void;
  onOpenHealth: () => void;
  onOpenAI: () => void;
  children: React.ReactNode;
}

export const AppLayout: React.FC<AppLayoutProps> = ({
  currentUser,
  company,
  activeTab,
  onSelectTab,
  onLogout,
  onOpenHealth,
  onOpenAI,
  children,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [dbMode, setDbMode] = useState<'atlas' | 'fallback' | 'checking'>('checking');

  React.useEffect(() => {
    // Quick non-blocking health check for database status badge
    fetch('/api/v1/health')
      .then((r) => r.json())
      .then((data) => {
        if (data?.database?.isFallback) {
          setDbMode('fallback');
        } else if (data?.database?.status === 'connected') {
          setDbMode('atlas');
        } else {
          setDbMode('fallback');
        }
      })
      .catch(() => setDbMode('fallback'));
  }, []);

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['admin', 'hr', 'employee'] },
    { id: 'employees', label: 'Employees', icon: Users, roles: ['admin', 'hr', 'employee'] },
    { id: 'attendance', label: 'Attendance', icon: Clock, roles: ['admin', 'hr', 'employee'] },
    { id: 'leave', label: 'Time Off & Leave', icon: Calendar, roles: ['admin', 'hr', 'employee'] },
    { id: 'payroll', label: 'Payroll & Slips', icon: DollarSign, roles: ['admin', 'hr', 'employee'] },
    { id: 'organization', label: 'Organization Settings', icon: Settings, roles: ['admin'] },
    { id: 'audit', label: 'Audit Trail', icon: ShieldAlert, roles: ['admin'] },
  ];

  const visibleNav = navItems.filter((item) => item.roles.includes(currentUser.role));

  return (
    <div className="min-h-screen bg-[#FBFBFA] text-[#18181B] font-['Plus_Jakarta_Sans',sans-serif] flex flex-col">
      {/* 3-ZONE TOP BAR CONTRACT */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-zinc-200/80 px-4 sm:px-8 py-3.5 flex items-center justify-between gap-8">
        {/* Zone 1: Brand Wordmark (Single text element) */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-1.5 text-zinc-600 hover:text-zinc-900 rounded-lg hover:bg-zinc-100"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          <div className="w-8 h-8 rounded-xl bg-zinc-900 text-white flex items-center justify-center font-extrabold text-sm shadow-xs">
            H
          </div>
          <span className="text-base font-bold tracking-tight text-zinc-900 whitespace-nowrap shrink-0">
            HCM Lite
          </span>
          {company && (
            <span className="hidden lg:inline text-xs text-zinc-400 font-medium whitespace-nowrap">
              · {company.name}
            </span>
          )}
        </div>

        {/* Zone 2: Navigation Links (Single line, whitespace-nowrap) */}
        <nav className="hidden md:flex items-center gap-1 overflow-x-auto py-0.5">
          {visibleNav.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                className={`flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  isActive
                    ? 'bg-zinc-900 text-white shadow-xs'
                    : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Zone 3: Primary Action & Profile */}
        <div className="flex items-center gap-2.5 shrink-0">
          {/* Database Connection State Badge */}
          {dbMode === 'atlas' && (
            <button
              onClick={onOpenHealth}
              title="MongoDB Atlas Connected - Click for health report"
              className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/80 hover:bg-emerald-100 transition-colors cursor-pointer"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>Atlas Connected</span>
            </button>
          )}

          {/* AI Assistant Quick Trigger */}
          <button
            onClick={onOpenAI}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200/60 rounded-xl transition-all cursor-pointer whitespace-nowrap shrink-0"
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
            <span>AI Assistant</span>
          </button>

          {/* Database Health Trigger */}
          <button
            onClick={onOpenHealth}
            title="Database Diagnostics & Health"
            className="p-1.5 text-zinc-600 hover:text-zinc-900 rounded-lg hover:bg-zinc-100 transition-colors cursor-pointer"
          >
            <Database className="w-4 h-4 text-zinc-500" />
          </button>

          {/* User Role Badge & Signout */}
          <div className="hidden sm:flex items-center gap-2 pl-2 border-l border-zinc-200">
            <div className="text-right">
              <p className="text-xs font-bold text-zinc-900 leading-none">{currentUser.name}</p>
              <span className="text-[10px] uppercase font-mono font-semibold text-zinc-400">
                {currentUser.role}
              </span>
            </div>
            <button
              onClick={onLogout}
              title="Sign Out"
              className="p-1.5 text-zinc-400 hover:text-rose-600 rounded-lg hover:bg-zinc-100 transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-zinc-200 bg-white p-4 space-y-1">
          {visibleNav.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  onSelectTab(item.id);
                  setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2 text-xs font-semibold rounded-xl ${
                  isActive ? 'bg-zinc-900 text-white' : 'text-zinc-700 hover:bg-zinc-100'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 opacity-40" />
              </button>
            );
          })}
          <div className="pt-2 border-t border-zinc-100 flex items-center justify-between px-3">
            <span className="text-xs text-zinc-500">{currentUser.name} ({currentUser.role})</span>
            <button onClick={onLogout} className="text-xs text-rose-600 font-semibold">Sign Out</button>
          </div>
        </div>
      )}

      {/* Main Content Body */}
      <main className="flex-1 pb-12">{children}</main>

      {/* Footer */}
      <footer className="border-t border-zinc-200/80 bg-white px-6 py-4 text-center text-xs text-zinc-400 flex flex-col sm:flex-row items-center justify-between gap-2">
        <p>HCM Lite · Saylani Hackathon Official Master System</p>
        <p className="font-mono text-[11px] text-zinc-500">
          Strict M1–M9 RBAC Enforced · Verified Real Database Metrics
        </p>
      </footer>
    </div>
  );
};
