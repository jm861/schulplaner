'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';

import { useAuth } from '@/contexts/auth-context';
import { useLanguage } from '@/contexts/language-context';
import { readJSON } from '@/lib/storage';
import { subtleButtonStyles, inputStyles } from '@/styles/theme';
import { PlannerShell, PlannerNav } from '@/components/layout/planner-shell';
import { buildPlannerNavItems } from '@/lib/planner-nav';

type User = {
  id: string;
  name: string;
  email: string;
};

type ChatMessage = {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  timestamp: string;
  read: boolean;
};

export default function ChatDetailPage() {
  const { user, isAdmin, isOperator } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();
  const params = useParams();
  const otherUserId = params.userId as string;

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [otherUser, setOtherUser] = useState<User | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user || !otherUserId) return;

    const loadData = async (showLoading = false) => {
      try {
        if (showLoading) {
          setIsLoading(true);
        } else {
          setIsRefreshing(true);
        }
        // Load other user info (only once)
        if (showLoading) {
          const allUsers = readJSON<Array<User & { password?: string }>>('schulplaner:users', []);
          const found = allUsers.find((u) => u.id === otherUserId);
          if (found) {
            const { password, ...rest } = found;
            void password;
            setOtherUser(rest);
          }
        }

        // Load messages
        const res = await fetch(
          `/api/messages?userId=${encodeURIComponent(user.id)}&otherUserId=${encodeURIComponent(otherUserId)}`
        );
        if (res.ok) {
          const data = (await res.json()) as { messages: ChatMessage[] };
          setMessages(data.messages || []);
        }

        // Mark messages as read
        await fetch('/api/messages', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: user.id, otherUserId }),
        });
      } catch (error) {
        console.error('Failed to load chat:', error);
      } finally {
        if (showLoading) {
          setIsLoading(false);
        } else {
          setIsRefreshing(false);
        }
      }
    };

    loadData(true);
    // Refresh every 3 seconds (silently in background)
    const interval = setInterval(() => loadData(false), 3000);
    return () => clearInterval(interval);
  }, [user, otherUserId]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user || isSending) return;

    const content = newMessage.trim();
    setNewMessage('');
    setIsSending(true);

    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          senderId: user.id,
          receiverId: otherUserId,
          content,
        }),
      });

      if (res.ok) {
        // Reload messages
        const reloadRes = await fetch(
          `/api/messages?userId=${encodeURIComponent(user.id)}&otherUserId=${encodeURIComponent(otherUserId)}`
        );
        if (reloadRes.ok) {
          const data = (await reloadRes.json()) as { messages: ChatMessage[] };
          setMessages(data.messages || []);
        }
      } else {
        alert('Nachricht konnte nicht gesendet werden.');
        setNewMessage(content);
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      alert('Nachricht konnte nicht gesendet werden.');
      setNewMessage(content);
    } finally {
      setIsSending(false);
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Heute';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Gestern';
    } else {
      return date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
    }
  };

  const navItems = buildPlannerNavItems(t, { isAdmin, isOperator });

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
        <p className="text-sm text-slate-500">{t('chat.pleaseLogin')}</p>
      </PlannerShell>
    );
  }

  if (!otherUser) {
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
        {isLoading ? (
          <p className="text-sm text-slate-500">{t('common.loading')}</p>
        ) : (
          <p className="text-sm text-slate-500">{t('chat.userNotFound')}</p>
        )}
      </PlannerShell>
    );
  }

  // Group messages by date
  const groupedMessages: Array<{ date: string; messages: ChatMessage[] }> = [];
  let currentDate = '';
  let currentGroup: ChatMessage[] = [];

  messages.forEach((msg) => {
    const msgDate = formatDate(msg.timestamp);
    if (msgDate !== currentDate) {
      if (currentGroup.length > 0) {
        groupedMessages.push({ date: currentDate, messages: currentGroup });
      }
      currentDate = msgDate;
      currentGroup = [msg];
    } else {
      currentGroup.push(msg);
    }
  });
  if (currentGroup.length > 0) {
    groupedMessages.push({ date: currentDate, messages: currentGroup });
  }

  return (
    <PlannerShell
      sidebar={
        <>
          <div className="space-y-1">
            <p className="text-[10px] uppercase tracking-[0.4em] text-slate-400">Chat</p>
            <h2 className="text-2xl font-semibold text-white">{otherUser.name}</h2>
            <p className="text-sm text-slate-400">{otherUser.email}</p>
            {isRefreshing && (
              <div className="mt-2 flex items-center gap-2 text-xs text-slate-400">
                <span className="h-2 w-2 animate-pulse rounded-full bg-green-500"></span>
                <span>Online</span>
              </div>
            )}
          </div>
          <PlannerNav items={navItems} />
          <div className="mt-8 space-y-3 rounded-3xl border border-white/10 bg-white/5 p-4">
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Nachrichten</p>
            <p className="text-3xl font-semibold text-white">{messages.length}</p>
            <p className="text-xs text-slate-400">{t('chat.messagesInChat')}</p>
          </div>
        </>
      }
    >
      <div className="flex h-[calc(100vh-200px)] flex-col">
        <div className="mb-4">
          <button
            onClick={() => router.push('/chat')}
            className="mb-2 text-sm font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
          >
            ← {t('chat.backToChats')}
          </button>
        </div>

      <div
        ref={messagesContainerRef}
        className="flex-1 space-y-4 overflow-y-auto rounded-2xl border border-slate-200 bg-slate-50/50 p-4 dark:border-slate-700 dark:bg-slate-900/30"
      >
        {isLoading ? (
          <p className="text-center text-sm text-slate-500">{t('common.loading')}</p>
        ) : groupedMessages.length === 0 ? (
          <p className="text-center text-sm text-slate-500 dark:text-slate-400">
            {t('chat.noMessages')}
          </p>
        ) : (
          groupedMessages.map((group) => (
            <div key={group.date}>
              <div className="my-4 text-center">
                <span className="rounded-full bg-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                  {group.date}
                </span>
              </div>
              {group.messages.map((msg) => {
                const isMe = msg.senderId === user.id;
                return (
                  <div
                    key={msg.id}
                    className={`mb-3 flex ${isMe ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[75%] rounded-2xl px-4 py-2 ${
                        isMe
                          ? 'bg-indigo-600 text-white'
                          : 'bg-white text-slate-900 dark:bg-slate-800 dark:text-slate-100'
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
                      <p
                        className={`mt-1 text-xs ${
                          isMe ? 'text-indigo-100' : 'text-slate-500 dark:text-slate-400'
                        }`}
                      >
                        {formatTime(msg.timestamp)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSend} className="mt-4 flex gap-2">
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder={t('chat.typeMessage')}
          className={`${inputStyles} flex-1`}
          disabled={isSending}
        />
        <button
          type="submit"
          disabled={!newMessage.trim() || isSending}
          className={`${subtleButtonStyles} px-6 disabled:cursor-not-allowed disabled:opacity-60`}
        >
          {isSending ? '...' : t('chat.send')}
        </button>
      </form>
      </div>
    </PlannerShell>
  );
}

