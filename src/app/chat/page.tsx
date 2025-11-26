'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

import { SectionCard } from '@/components/ui/section-card';
import { useAuth } from '@/contexts/auth-context';
import { useLanguage } from '@/contexts/language-context';
import { readJSON } from '@/lib/storage';
import { PlannerShell, PlannerNav } from '@/components/layout/planner-shell';
import { buildPlannerNavItems } from '@/lib/planner-nav';

type User = {
  id: string;
  name: string;
  email: string;
};

type Conversation = {
  userId: string;
  lastMessage: {
    content: string;
    timestamp: string;
    senderId: string;
  } | null;
  unreadCount: number;
};

export default function ChatPage() {
  const { user, isAdmin, isOperator } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    if (!user) return;

    const loadData = async (showLoading = false) => {
      try {
        if (showLoading) {
          setIsLoading(true);
        } else {
          setIsRefreshing(true);
        }
        // Load all users
        const allUsers = readJSON<Array<User & { password?: string }>>('schulplaner:users', []);
        const usersWithoutPassword = allUsers
          .filter((u) => u.id !== user.id)
          .map(({ password, ...rest }) => {
            void password;
            return rest;
          });
        setUsers(usersWithoutPassword);

        // Load conversations
        const res = await fetch(`/api/messages?userId=${encodeURIComponent(user.id)}`);
        if (res.ok) {
          const data = (await res.json()) as { conversations: Conversation[] };
          setConversations(data.conversations || []);
        }
      } catch (error) {
        console.error('Failed to load chat data:', error);
      } finally {
        if (showLoading) {
          setIsLoading(false);
        } else {
          setIsRefreshing(false);
        }
      }
    };

    loadData(true);
    // Refresh every 5 seconds (silently in background)
    const interval = setInterval(() => loadData(false), 5000);
    return () => clearInterval(interval);
  }, [user]);

  const getUserName = (userId: string) => {
    const found = users.find((u) => u.id === userId);
    return found?.name || found?.email || 'Unbekannt';
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (minutes < 1) return 'Gerade eben';
    if (minutes < 60) return `vor ${minutes} Min`;
    if (hours < 24) return `vor ${hours} Std`;
    if (days < 7) return `vor ${days} Tag${days > 1 ? 'en' : ''}`;
    return date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
  };

  const navItems = buildPlannerNavItems(t, { isAdmin, isOperator });
  const usersWithConversations = new Set(conversations.map((c) => c.userId));
  const availableUsers = users.filter((u) => !usersWithConversations.has(u.id));

  if (!user) {
    return (
      <PlannerShell
        sidebar={
          <>
            <div className="space-y-1">
              <p className="text-[10px] uppercase tracking-[0.4em] text-slate-400">Chat</p>
              <h2 className="text-2xl font-semibold text-white">{t('chat.title')}</h2>
              <p className="text-sm text-slate-400">{t('chat.description')}</p>
            </div>
            <PlannerNav items={navItems} label={t('planner.navigation')} />
          </>
        }
      >
        <SectionCard title={t('chat.loginRequired')}>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {t('chat.pleaseLogin')}
          </p>
        </SectionCard>
      </PlannerShell>
    );
  }

  return (
    <PlannerShell
      sidebar={
        <>
          <div className="space-y-1">
            <p className="text-[10px] uppercase tracking-[0.4em] text-slate-400">Chat</p>
            <h2 className="text-2xl font-semibold text-white">{t('chat.title')}</h2>
            <p className="text-sm text-slate-400">{t('chat.description')}</p>
            {isRefreshing && (
              <div className="mt-2 flex items-center gap-2 text-xs text-slate-400">
                <span className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent"></span>
                <span>Aktualisiert</span>
              </div>
            )}
          </div>
          <PlannerNav items={navItems} label={t('planner.navigation')} />
          <div className="mt-8 space-y-3 rounded-3xl border border-white/10 bg-white/5 p-4">
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Unterhaltungen</p>
            <p className="text-3xl font-semibold text-white">{conversations.length}</p>
            <p className="text-xs text-slate-400">{t('chat.activeConversations')}</p>
          </div>
        </>
      }
    >
      <div className="space-y-6">

      {isLoading ? (
        <SectionCard title={t('chat.conversations')}>
          <p className="text-sm text-slate-500">{t('common.loading')}</p>
        </SectionCard>
      ) : (
        <>
          {conversations.length > 0 && (
            <SectionCard title={t('chat.conversations')}>
              <ul className="space-y-2">
                {conversations.map((conv) => {
                  const userName = getUserName(conv.userId);
                  const isLastFromMe = conv.lastMessage?.senderId === user.id;
                  const preview = conv.lastMessage
                    ? isLastFromMe
                      ? `Du: ${conv.lastMessage.content}`
                      : conv.lastMessage.content
                    : t('chat.noMessages');

                  return (
                    <li
                      key={conv.userId}
                      onClick={() => router.push(`/chat/${conv.userId}`)}
                      className="flex cursor-pointer items-center gap-3 rounded-2xl border border-slate-200 bg-white/80 p-3 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900/40 dark:hover:bg-slate-900/60"
                    >
                      <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-indigo-100 text-lg font-semibold text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300">
                        {userName.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <h3 className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                            {userName}
                          </h3>
                          {conv.lastMessage && (
                            <span className="flex-shrink-0 text-xs text-slate-500 dark:text-slate-400">
                              {formatTime(conv.lastMessage.timestamp)}
                            </span>
                          )}
                        </div>
                        <p className="truncate text-xs text-slate-600 dark:text-slate-300">
                          {preview}
                        </p>
                      </div>
                      {conv.unreadCount > 0 && (
                        <div className="flex h-6 min-w-[24px] items-center justify-center rounded-full bg-indigo-600 px-2 text-xs font-semibold text-white">
                          {conv.unreadCount > 9 ? '9+' : conv.unreadCount}
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </SectionCard>
          )}

          {availableUsers.length > 0 && (
            <SectionCard title={t('chat.startNewChat')}>
              <ul className="space-y-2">
                {availableUsers.map((otherUser) => (
                  <li
                    key={otherUser.id}
                    onClick={() => router.push(`/chat/${otherUser.id}`)}
                    className="flex cursor-pointer items-center gap-3 rounded-2xl border border-slate-200 bg-white/80 p-3 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900/40 dark:hover:bg-slate-900/60"
                  >
                    <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-slate-100 text-lg font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                      {otherUser.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                        {otherUser.name}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {otherUser.email}
                      </p>
                    </div>
                    <span className="text-slate-400">→</span>
                  </li>
                ))}
              </ul>
            </SectionCard>
          )}

          {conversations.length === 0 && availableUsers.length === 0 && (
            <SectionCard title={t('chat.conversations')}>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {t('chat.noConversations')}
              </p>
            </SectionCard>
          )}
        </>
      )}
      </div>
    </PlannerShell>
  );
}

