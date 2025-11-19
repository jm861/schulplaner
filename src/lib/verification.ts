// Shared verification code storage
// In production, use Redis or a database instead of in-memory storage

const verificationCodes = new Map<string, { code: string; expiresAt: number }>();

export function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export function storeVerificationCode(email: string, code: string): void {
  const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes
  verificationCodes.set(email.toLowerCase(), { code, expiresAt });
}

export function getVerificationCode(email: string): { code: string; expiresAt: number } | undefined {
  return verificationCodes.get(email.toLowerCase());
}

export function deleteVerificationCode(email: string): void {
  verificationCodes.delete(email.toLowerCase());
}

export function verifyCode(email: string, code: string): boolean {
  const stored = getVerificationCode(email);
  if (!stored) return false;
  if (Date.now() > stored.expiresAt) {
    deleteVerificationCode(email);
    return false;
  }
  if (stored.code !== code) return false;
  deleteVerificationCode(email);
  return true;
}

