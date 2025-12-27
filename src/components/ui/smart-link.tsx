/**
 * SmartLink Component
 * Generates deep links from entity relationships with context badges
 */

'use client';

import Link from 'next/link';
import { cn } from '@/lib/cn';
import { generateDeepLink, type DeepLink, type EntityType } from '@/types/entities';
import { type ReactNode } from 'react';

export interface SmartLinkProps {
  entity: DeepLink;
  children: ReactNode;
  className?: string;
  showBadge?: boolean;
  badgeContent?: ReactNode;
}

/**
 * Get a color for an entity type (for badges)
 */
function getEntityColor(type: EntityType): string {
  const colors: Record<EntityType, string> = {
    subject: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    lesson: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    task: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
    note: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    material: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400',
    exam: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    teacher: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  };
  return colors[type] || colors.subject;
}

export function SmartLink({
  entity,
  children,
  className,
  showBadge = false,
  badgeContent,
}: SmartLinkProps) {
  const href = generateDeepLink(entity);
  const badgeColor = getEntityColor(entity.type);

  return (
    <Link
      href={href}
      className={cn(
        'inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors',
        className
      )}
    >
      {children}
      {showBadge && (
        <span
          className={cn(
            'text-xs font-medium px-2 py-0.5 rounded-full',
            badgeColor
          )}
        >
          {badgeContent || entity.type}
        </span>
      )}
    </Link>
  );
}

/**
 * ContextBadge Component
 * Standalone badge for displaying entity context
 */
export interface ContextBadgeProps {
  type: EntityType;
  label?: string;
  color?: string; // Custom hex color
  className?: string;
}

export function ContextBadge({
  type,
  label,
  color,
  className,
}: ContextBadgeProps) {
  const defaultColor = getEntityColor(type);
  const style = color ? { backgroundColor: color, color: '#fff' } : undefined;

  return (
    <span
      className={cn(
        'inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full',
        !color && defaultColor,
        className
      )}
      style={style}
    >
      {label || type}
    </span>
  );
}

