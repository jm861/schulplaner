import { cp, rm, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';

const apiDir = 'src/app/api';
const apiBackupDir = 'api.backup'; // Move outside app directory
const chatDynamicDir = 'src/app/chat/[userId]';
const chatDynamicBackupDir = 'chat-userId.backup';
const nextDir = '.next';
const outDir = 'out';

async function prepareMobileBuild() {
  console.log('📦 Preparing mobile build...');
  
  // Step 0: Clean previous builds
  if (existsSync(nextDir)) {
    await rm(nextDir, { recursive: true });
    console.log('✓ Cleaned .next directory');
  }
  if (existsSync(outDir)) {
    await rm(outDir, { recursive: true });
    console.log('✓ Cleaned out directory');
  }
  
  // Step 1: Backup API routes and dynamic chat route
  if (existsSync(apiDir)) {
    if (existsSync(apiBackupDir)) {
      await rm(apiBackupDir, { recursive: true });
    }
    await cp(apiDir, apiBackupDir, { recursive: true });
    console.log('✓ Backed up API routes');
  }
  
  if (existsSync(chatDynamicDir)) {
    if (existsSync(chatDynamicBackupDir)) {
      await rm(chatDynamicBackupDir, { recursive: true });
    }
    await cp(chatDynamicDir, chatDynamicBackupDir, { recursive: true });
    console.log('✓ Backed up dynamic chat route');
  }
  
  // Step 2: Remove API routes and dynamic route temporarily
  if (existsSync(apiDir)) {
    await rm(apiDir, { recursive: true });
    console.log('✓ Temporarily removed API routes');
  }
  
  if (existsSync(chatDynamicDir)) {
    await rm(chatDynamicDir, { recursive: true });
    console.log('✓ Temporarily removed dynamic chat route');
  }
  
  try {
    // Step 3: Build with static export
    console.log('🏗️  Building with static export...');
    execSync('next build', { 
      stdio: 'inherit', 
      env: { ...process.env, MOBILE_BUILD: 'true' } 
    });
    console.log('✓ Build complete');
  } finally {
    // Step 4: Restore API routes and dynamic route
    if (existsSync(apiBackupDir)) {
      if (existsSync(apiDir)) {
        await rm(apiDir, { recursive: true });
      }
      await cp(apiBackupDir, apiDir, { recursive: true });
      await rm(apiBackupDir, { recursive: true });
      console.log('✓ Restored API routes');
    }
    
    if (existsSync(chatDynamicBackupDir)) {
      if (existsSync(chatDynamicDir)) {
        await rm(chatDynamicDir, { recursive: true });
      }
      await cp(chatDynamicBackupDir, chatDynamicDir, { recursive: true });
      await rm(chatDynamicBackupDir, { recursive: true });
      console.log('✓ Restored dynamic chat route');
    }
  }
}

prepareMobileBuild().catch(console.error);
