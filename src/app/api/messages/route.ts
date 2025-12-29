import { randomUUID } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';

import { kv } from '@/lib/kv';

export const runtime = 'nodejs';
export const maxDuration = 30;

const MESSAGES_KEY = 'schulplaner:messages';

export interface ChatMessage {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  timestamp: string;
  read: boolean;
}

// GET /api/messages?userId=xxx&otherUserId=xxx (get conversation)
// GET /api/messages?userId=xxx (get all conversations for user)
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const userId = url.searchParams.get('userId');
    const otherUserId = url.searchParams.get('otherUserId');

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    if (!kv.isConfigured()) {
      return NextResponse.json({ messages: [], conversations: [] });
    }

    const allMessages = await kv.get<ChatMessage[]>(MESSAGES_KEY) || [];

    if (otherUserId) {
      // Get conversation between two users
      const conversation = allMessages
        .filter(
          (msg) =>
            (msg.senderId === userId && msg.receiverId === otherUserId) ||
            (msg.senderId === otherUserId && msg.receiverId === userId)
        )
        .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

      return NextResponse.json({ messages: conversation });
    }

    // Get all conversations for user (list of other users they've chatted with)
    const conversationPartners = new Set<string>();
    allMessages.forEach((msg) => {
      if (msg.senderId === userId) {
        conversationPartners.add(msg.receiverId);
      } else if (msg.receiverId === userId) {
        conversationPartners.add(msg.senderId);
      }
    });

    // Get last message for each conversation
    const conversations = Array.from(conversationPartners).map((partnerId) => {
      const messages = allMessages
        .filter(
          (msg) =>
            (msg.senderId === userId && msg.receiverId === partnerId) ||
            (msg.senderId === partnerId && msg.receiverId === userId)
        )
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      const lastMessage = messages[0];
      const unreadCount = messages.filter(
        (msg) => msg.receiverId === userId && !msg.read
      ).length;

      return {
        userId: partnerId,
        lastMessage: lastMessage
          ? {
              content: lastMessage.content,
              timestamp: lastMessage.timestamp,
              senderId: lastMessage.senderId,
            }
          : null,
        unreadCount,
      };
    });

    // Sort by last message timestamp
    conversations.sort((a, b) => {
      if (!a.lastMessage) return 1;
      if (!b.lastMessage) return -1;
      return (
        new Date(b.lastMessage.timestamp).getTime() -
        new Date(a.lastMessage.timestamp).getTime()
      );
    });

    return NextResponse.json({ conversations });
  } catch (error) {
    console.error('[messages] GET error:', error);
    return NextResponse.json({ error: 'Failed to load messages' }, { status: 500 });
  }
}

// POST /api/messages - Send a message
export async function POST(req: NextRequest) {
  if (!kv.isConfigured()) {
    return NextResponse.json(
      { error: 'Server storage not configured. Please set Upstash credentials.' },
      { status: 500 }
    );
  }

  try {
    const body = (await req.json()) as {
      senderId: string;
      receiverId: string;
      content: string;
    };

    const { senderId, receiverId, content } = body;

    if (!senderId || !receiverId || !content?.trim()) {
      return NextResponse.json(
        { error: 'senderId, receiverId, and content are required' },
        { status: 400 }
      );
    }

    const newMessage: ChatMessage = {
      id: randomUUID(),
      senderId,
      receiverId,
      content: content.trim(),
      timestamp: new Date().toISOString(),
      read: false,
    };

    const allMessages = (await kv.get<ChatMessage[]>(MESSAGES_KEY)) || [];
    allMessages.push(newMessage);

    // Keep only last 1000 messages per conversation pair
    const conversationMessages = allMessages.filter(
      (msg) =>
        (msg.senderId === senderId && msg.receiverId === receiverId) ||
        (msg.senderId === receiverId && msg.receiverId === senderId)
    );

    if (conversationMessages.length > 1000) {
      const toKeep = conversationMessages
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, 1000);
      const toRemove = conversationMessages.filter((msg) => !toKeep.find((m) => m.id === msg.id));

      // Remove old messages
      const filtered = allMessages.filter((msg) => !toRemove.find((m) => m.id === msg.id));
      await kv.set(MESSAGES_KEY, filtered);
    } else {
      await kv.set(MESSAGES_KEY, allMessages);
    }

    return NextResponse.json({ message: newMessage });
  } catch (error) {
    console.error('[messages] POST error:', error);
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 });
  }
}

// PATCH /api/messages - Mark messages as read
export async function PATCH(req: NextRequest) {
  if (!kv.isConfigured()) {
    return NextResponse.json(
      { error: 'Server storage not configured.' },
      { status: 500 }
    );
  }

  try {
    const body = (await req.json()) as {
      userId: string;
      otherUserId: string;
    };

    const { userId, otherUserId } = body;

    if (!userId || !otherUserId) {
      return NextResponse.json(
        { error: 'userId and otherUserId are required' },
        { status: 400 }
      );
    }

    const allMessages = (await kv.get<ChatMessage[]>(MESSAGES_KEY)) || [];
    const updated = allMessages.map((msg) => {
      if (msg.receiverId === userId && msg.senderId === otherUserId && !msg.read) {
        return { ...msg, read: true };
      }
      return msg;
    });

    await kv.set(MESSAGES_KEY, updated);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[messages] PATCH error:', error);
    return NextResponse.json({ error: 'Failed to mark messages as read' }, { status: 500 });
  }
}


