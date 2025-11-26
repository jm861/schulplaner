import { NextRequest, NextResponse } from 'next/server';
import { getStoredUsers, saveStoredUsers, StoredUser as User } from '@/lib/users-server';

// GET /api/users - Get all users (admin/operator only)
export async function GET() {
  try {
    const users = await getStoredUsers();
    
    // In a real app, verify admin/operator role from session/token
    // For now, we'll allow access (you should add authentication middleware)
    // Return all users (admins need passwords for management)
    // In production, check if user is admin before returning passwords
    return NextResponse.json({ users });
  } catch (error) {
    console.error('[users GET] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}

// POST /api/users - Create or update user
export async function POST(req: NextRequest) {
  try {
    const users = await getStoredUsers();
    const body = await req.json() as { action: 'create' | 'update' | 'delete'; user?: User; userId?: string };
    const { action, user, userId } = body;

    if (action === 'create' && user) {
      // Check if user already exists (by ID or email)
      const existingById = users.find((u) => u.id === user.id);
      const existingByEmail = users.find((u) => u.email === user.email);
      
      if (existingById) {
        // User exists by ID, update instead
        const index = users.findIndex((u) => u.id === user.id);
        const updatedUsers = [...users];
        updatedUsers[index] = user;
        await saveStoredUsers(updatedUsers);
        return NextResponse.json({ success: true, user, action: 'updated' });
      }
      
      if (existingByEmail) {
        // Email exists but different ID - this shouldn't happen, but handle it
        return NextResponse.json(
          { error: 'Email already exists' },
          { status: 400 }
        );
      }

      // New user - add it
      const updatedUsers = [...users, user];
      await saveStoredUsers(updatedUsers);
      return NextResponse.json({ success: true, user });
    }

    if (action === 'update' && user) {
      const index = users.findIndex((u) => u.id === user.id);
      if (index === -1) {
        return NextResponse.json(
          { error: 'User not found' },
          { status: 404 }
        );
      }

      const updatedUsers = [...users];
      updatedUsers[index] = user;
      await saveStoredUsers(updatedUsers);
      return NextResponse.json({ success: true, user });
    }

    if (action === 'delete' && userId) {
      const updatedUsers = users.filter((u) => u.id !== userId);
      await saveStoredUsers(updatedUsers);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    );
  } catch (error) {
    console.error('[users POST] Error:', error);
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    );
  }
}

