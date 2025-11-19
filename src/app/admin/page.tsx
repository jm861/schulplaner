'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

import { useAuth } from '@/contexts/auth-context';
import { useLanguage } from '@/contexts/language-context';
import { PageHeader } from '@/components/ui/page-header';
import { SectionCard } from '@/components/ui/section-card';
import { readJSON, writeJSON } from '@/lib/storage';
import { subtleButtonStyles, selectStyles } from '@/styles/theme';

type User = {
  id: string;
  email: string;
  name: string;
  role: 'user' | 'admin' | 'operator';
  yearBorn?: string;
  class?: string;
  schoolForm?: string;
  registeredAt?: string;
  lastLoginAt?: string;
  loginCount?: number;
};

type UserWithPassword = User & { password: string };

export default function AdminPage() {
  const { t } = useLanguage();
  const { user, logout, isAdmin, isOperator } = useAuth();
  const router = useRouter();
  const [users, setUsers] = useState<UserWithPassword[]>([]);
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});
  const [editingRole, setEditingRole] = useState<string | null>(null);
  const [kvStatus, setKvStatus] = useState<{
    configured: boolean;
    connected: boolean;
    message: string;
    userCount?: number;
  } | null>(null);

  // Check KV/Upstash connection status
  const checkKvStatus = async () => {
    try {
      const response = await fetch('/api/kv-status');
      if (response.ok) {
        const status = await response.json();
        setKvStatus(status);
      }
    } catch (error) {
      console.warn('Failed to check KV status:', error);
    }
  };

  // Load users and refresh periodically for live updates
  const loadUsers = async () => {
    let apiUsers: UserWithPassword[] = [];
    
    try {
      // Try to fetch from API first (server-side storage)
      const response = await fetch('/api/users');
      if (response.ok) {
        const data = await response.json();
        if (data.users && Array.isArray(data.users)) {
          apiUsers = data.users;
        }
      }
    } catch (error) {
      console.warn('Failed to fetch users from API:', error);
    }
    
    // Get users from localStorage
    const localUsers = readJSON<UserWithPassword[]>('schulplaner:users', []);
    
    // Merge users: if API only has defaults (2 users) and localStorage has more, prioritize localStorage
    // Otherwise, merge API users with localStorage users that aren't in API
    const hasOnlyDefaults = apiUsers.length <= 2 && localUsers.length > apiUsers.length;
    
    let mergedUsers: UserWithPassword[];
    if (hasOnlyDefaults) {
      // If API only has defaults, use localStorage as source of truth
      mergedUsers = localUsers;
      
      // Try to sync all localStorage users to API in background
      localUsers.forEach(async (user) => {
        try {
          await fetch('/api/users', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'create', user }),
          });
        } catch (error) {
          // Silently fail - API might not be configured
        }
      });
    } else {
      // Merge API users with localStorage users that aren't in API
      const apiUserIds = new Set(apiUsers.map(u => u.id));
      const localUsersNotInApi = localUsers.filter(u => !apiUserIds.has(u.id));
      mergedUsers = [...apiUsers, ...localUsersNotInApi];
      
      // Sync missing users to API
      localUsersNotInApi.forEach(async (user) => {
        try {
          await fetch('/api/users', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'create', user }),
          });
        } catch (error) {
          // Silently fail
        }
      });
    }
    
    setUsers(mergedUsers);
  };

  useEffect(() => {
    if (!isAdmin && !isOperator) {
      router.push('/');
      return;
    }

    checkKvStatus();
    loadUsers();

    // Refresh every 2 seconds to show live registrations and login updates
    const interval = setInterval(() => {
      loadUsers();
    }, 2000);

    // Check KV status every 10 seconds
    const statusInterval = setInterval(() => {
      checkKvStatus();
    }, 10000);

    return () => {
      clearInterval(interval);
      clearInterval(statusInterval);
    };
  }, [isAdmin, isOperator, router]);

  // Get recent registrations (last 10, sorted by registration time)
  const recentRegistrations = users
    .filter((u) => u.registeredAt)
    .sort((a, b) => {
      const timeA = new Date(a.registeredAt || 0).getTime();
      const timeB = new Date(b.registeredAt || 0).getTime();
      return timeB - timeA;
    })
    .slice(0, 10);

  const handleDeleteUser = async (userId: string, userEmail: string) => {
    // Prevent deleting yourself
    if (userId === user?.id) {
      alert(t('admin.cannotDeleteSelf'));
      return;
    }

    if (!confirm(t('admin.confirmDelete').replace('{email}', userEmail))) {
      return;
    }

    const updatedUsers = users.filter((u) => u.id !== userId);
    
    // Sync to API
    try {
      await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', userId }),
      });
    } catch (error) {
      console.warn('Failed to sync delete to API:', error);
    }
    
    // Update localStorage
    writeJSON('schulplaner:users', updatedUsers);
    setUsers(updatedUsers);
  };

  const togglePasswordVisibility = (userId: string) => {
    setShowPasswords((prev) => ({
      ...prev,
      [userId]: !prev[userId],
    }));
  };

  const handleRoleChange = async (userId: string, newRole: 'user' | 'admin' | 'operator') => {
    const userToUpdate = users.find((u) => u.id === userId);
    if (!userToUpdate) return;

    const updatedUser = { ...userToUpdate, role: newRole };
    const updatedUsers = users.map((u) =>
      u.id === userId ? updatedUser : u
    );
    
    // Sync to API
    try {
      await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update', user: updatedUser }),
      });
    } catch (error) {
      console.warn('Failed to sync role change to API:', error);
    }
    
    // Update localStorage
    writeJSON('schulplaner:users', updatedUsers);
    setUsers(updatedUsers);
    setEditingRole(null);
  };

  if (!isAdmin && !isOperator) {
    return null;
  }

  return (
    <div className="space-y-12">
      <PageHeader
        badge={isAdmin ? 'Admin' : 'Operator'}
        title={isAdmin ? t('admin.title') : t('admin.operatorTitle')}
        description={isAdmin ? t('admin.description') : t('admin.operatorDescription')}
      />

      <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white/70 px-6 py-4 dark:border-slate-800 dark:bg-slate-900/60">
        <div className="flex-1">
          <p className="text-sm font-semibold text-slate-900 dark:text-white">{t('admin.loggedInAs')}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">{user?.email}</p>
          {kvStatus && (
            <div className="mt-2 flex items-center gap-2">
              <div
                className={`h-2 w-2 rounded-full ${
                  kvStatus.connected
                    ? 'bg-emerald-500'
                    : kvStatus.configured
                      ? 'bg-amber-500'
                      : 'bg-slate-400'
                }`}
              />
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {kvStatus.connected
                  ? `Upstash: Connected (${kvStatus.userCount || 0} users)`
                  : kvStatus.configured
                    ? 'Upstash: Configured but not connected'
                    : 'Upstash: Not configured (using localStorage)'}
              </p>
            </div>
          )}
        </div>
        <button onClick={logout} className={subtleButtonStyles}>
          {t('admin.logout')}
        </button>
      </div>

      {/* Live Registration Feed */}
      {(isAdmin || isOperator) && (
        <SectionCard title={t('admin.liveRegistrations')}>
          <div className="space-y-3">
            {recentRegistrations.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">{t('admin.noRecentRegistrations')}</p>
            ) : (
              recentRegistrations.map((u) => {
                const registeredDate = u.registeredAt
                  ? new Date(u.registeredAt).toLocaleString('de-DE', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : '';
                const isRecent = u.registeredAt
                  ? Date.now() - new Date(u.registeredAt).getTime() < 60000 // Less than 1 minute ago
                  : false;

                return (
                  <div
                    key={u.id}
                    className={`rounded-2xl border px-4 py-3 ${
                      isRecent
                        ? 'border-emerald-200 bg-emerald-50/50 dark:border-emerald-900 dark:bg-emerald-950/50'
                        : 'border-slate-200 bg-white/70 dark:border-slate-800 dark:bg-slate-900/60'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-slate-900 dark:text-white">{u.name}</p>
                          {isRecent && (
                            <span className="rounded-full bg-emerald-500 px-2 py-0.5 text-xs font-semibold text-white">
                              {t('admin.new')}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{u.email}</p>
                        <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-600 dark:text-slate-300">
                          {u.yearBorn && (
                            <span>
                              {t('admin.yearBorn')}: <strong>{u.yearBorn}</strong>
                            </span>
                          )}
                          {u.class && (
                            <span>
                              {t('admin.class')}: <strong>{u.class}</strong>
                            </span>
                          )}
                          {u.schoolForm && (
                            <span>
                              {t('admin.schoolForm')}: <strong>{u.schoolForm}</strong>
                            </span>
                          )}
                        </div>
                        <div className="mt-2 space-y-1 text-xs text-slate-400 dark:text-slate-500">
                          <p>
                            {t('admin.registeredAt')}: {registeredDate}
                          </p>
                          {u.lastLoginAt && (
                            <p>
                              {t('admin.lastLogin')}: {new Date(u.lastLoginAt).toLocaleString('de-DE', {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                              {u.loginCount && u.loginCount > 1 && (
                                <span className="ml-2 text-slate-500">({u.loginCount}x)</span>
                              )}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </SectionCard>
      )}

      {/* User Count for Operators */}
      {isOperator && (
        <SectionCard title={t('admin.userStatistics')}>
          <div className="rounded-2xl border border-indigo-200 bg-indigo-50/50 p-6 text-center dark:border-indigo-900 dark:bg-indigo-950/50">
            <p className="text-4xl font-bold text-indigo-900 dark:text-indigo-100">{users.length}</p>
            <p className="mt-2 text-sm font-semibold text-indigo-700 dark:text-indigo-300">
              {t('admin.totalUsers')}
            </p>
          </div>
        </SectionCard>
      )}

      {/* Full User List for Admins */}
      {isAdmin && (
        <SectionCard title={t('admin.allUsers')}>
          <div className="space-y-3">
            {users.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">{t('admin.noUsers')}</p>
            ) : (
              users.map((u) => (
                <div
                  key={u.id}
                  className="rounded-2xl border border-slate-200 bg-white/70 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/60"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-slate-900 dark:text-white">{u.name}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{u.email}</p>
                      {u.lastLoginAt && (
                        <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
                          {t('admin.lastLogin')}: {new Date(u.lastLoginAt).toLocaleString('de-DE', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                          {u.loginCount && u.loginCount > 1 && (
                            <span className="ml-2">({u.loginCount}x)</span>
                          )}
                        </p>
                      )}
                      <div className="mt-2 flex items-center gap-2">
                        <span className="text-xs text-slate-600 dark:text-slate-400">{t('admin.password')}:</span>
                        <span className="font-mono text-xs text-slate-900 dark:text-white">
                          {showPasswords[u.id] ? u.password : '••••••••'}
                        </span>
                        <button
                          onClick={() => togglePasswordVisibility(u.id)}
                          className="text-xs font-semibold text-indigo-600 underline decoration-dotted hover:text-indigo-700 dark:text-indigo-400"
                        >
                          {showPasswords[u.id] ? t('admin.hidePassword') : t('admin.showPassword')}
                        </button>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      {editingRole === u.id ? (
                        <div className="flex flex-col gap-2">
                          <select
                            value={u.role}
                            onChange={(e) => handleRoleChange(u.id, e.target.value as 'user' | 'admin' | 'operator')}
                            className={`${selectStyles} text-xs`}
                          >
                            <option value="user">{t('admin.roleUser')}</option>
                            <option value="operator">{t('admin.roleOperator')}</option>
                            <option value="admin">{t('admin.roleAdmin')}</option>
                          </select>
                          <button
                            onClick={() => setEditingRole(null)}
                            className="text-xs font-semibold text-slate-500 hover:text-slate-700 dark:text-slate-400"
                          >
                            {t('common.cancel')}
                          </button>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center gap-2">
                            <span
                              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                                u.role === 'admin'
                                  ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-200'
                                  : u.role === 'operator'
                                    ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-200'
                                    : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                              }`}
                            >
                              {u.role === 'admin'
                                ? t('admin.roleAdmin')
                                : u.role === 'operator'
                                  ? t('admin.roleOperator')
                                  : t('admin.roleUser')}
                            </span>
                            <button
                              onClick={() => setEditingRole(u.id)}
                              className="text-xs font-semibold text-indigo-600 underline decoration-dotted hover:text-indigo-700 dark:text-indigo-400"
                            >
                              {t('admin.editRole')}
                            </button>
                          </div>
                          {u.id !== user?.id && (
                            <button
                              onClick={() => handleDeleteUser(u.id, u.email)}
                              className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700 transition hover:bg-rose-100 dark:border-rose-900 dark:bg-rose-950/50 dark:text-rose-300 dark:hover:bg-rose-900/50"
                            >
                              {t('admin.delete')}
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </SectionCard>
      )}

      {/* Active Members List for Operators (no passwords, no delete) */}
      {isOperator && !isAdmin && (
        <SectionCard title={t('admin.activeMembers')}>
          <div className="space-y-3">
            {users.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">{t('admin.noUsers')}</p>
            ) : (
              users.map((u) => {
                const registeredDate = u.registeredAt
                  ? new Date(u.registeredAt).toLocaleString('de-DE', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : '';
                const isRecentlyActive = u.lastLoginAt
                  ? Date.now() - new Date(u.lastLoginAt).getTime() < 7 * 24 * 60 * 60 * 1000 // Active in last 7 days
                  : false;

                return (
                  <div
                    key={u.id}
                    className={`rounded-2xl border px-4 py-3 ${
                      isRecentlyActive
                        ? 'border-emerald-200 bg-emerald-50/50 dark:border-emerald-900 dark:bg-emerald-950/50'
                        : 'border-slate-200 bg-white/70 dark:border-slate-800 dark:bg-slate-900/60'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-slate-900 dark:text-white">{u.name}</p>
                          {isRecentlyActive && (
                            <span className="rounded-full bg-emerald-500 px-2 py-0.5 text-xs font-semibold text-white">
                              {t('admin.active')}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{u.email}</p>
                        <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-600 dark:text-slate-300">
                          {u.yearBorn && (
                            <span>
                              {t('admin.yearBorn')}: <strong>{u.yearBorn}</strong>
                            </span>
                          )}
                          {u.class && (
                            <span>
                              {t('admin.class')}: <strong>{u.class}</strong>
                            </span>
                          )}
                          {u.schoolForm && (
                            <span>
                              {t('admin.schoolForm')}: <strong>{u.schoolForm}</strong>
                            </span>
                          )}
                        </div>
                        <div className="mt-2 space-y-1 text-xs text-slate-400 dark:text-slate-500">
                          {u.registeredAt && (
                            <p>
                              {t('admin.registeredAt')}: {registeredDate}
                            </p>
                          )}
                          {u.lastLoginAt && (
                            <p>
                              {t('admin.lastLogin')}: {new Date(u.lastLoginAt).toLocaleString('de-DE', {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                              {u.loginCount && u.loginCount > 1 && (
                                <span className="ml-2 text-slate-500">({u.loginCount}x)</span>
                              )}
                            </p>
                          )}
                        </div>
                      </div>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          u.role === 'admin'
                            ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-200'
                            : u.role === 'operator'
                              ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-200'
                              : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                        }`}
                      >
                        {u.role === 'admin'
                          ? t('admin.roleAdmin')
                          : u.role === 'operator'
                            ? t('admin.roleOperator')
                            : t('admin.roleUser')}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </SectionCard>
      )}
    </div>
  );
}

