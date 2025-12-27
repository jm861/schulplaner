/**
 * ListRow Component
 * Apple-like list row with consistent spacing and interactions
 */

'use client';

import { cn } from '@/lib/cn';
import { motion } from 'framer-motion';
import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';

export interface ListRowProps extends HTMLAttributes<HTMLDivElement> {
  leading?: ReactNode;
  trailing?: ReactNode;
  subtitle?: ReactNode;
  interactive?: boolean;
  selected?: boolean;
}

export const ListRow = forwardRef<HTMLDivElement, ListRowProps>(
  (
    {
      className,
      children,
      leading,
      trailing,
      subtitle,
      interactive = false,
      selected = false,
      ...props
    },
    ref
  ) => {
    const baseStyles =
      'flex items-center gap-3 px-4 py-3 rounded-xl transition-colors';
    
    const stateStyles = selected
      ? 'bg-blue-50 dark:bg-blue-950/30'
      : interactive
      ? 'hover:bg-gray-50 dark:hover:bg-gray-800/50 active:bg-gray-100 dark:active:bg-gray-800'
      : '';

    const Component = interactive ? motion.div : 'div';
    const { onDrag, onDragStart, onDragEnd, ...restProps } = props;
    const motionProps = interactive
      ? {
          whileTap: { scale: 0.98 },
          transition: { duration: 0.1 },
        }
      : {};

    return (
      <Component
        ref={ref}
        className={cn(baseStyles, stateStyles, className)}
        {...(interactive ? motionProps : {})}
        {...(restProps as any)}
      >
        {leading && <div className="flex-shrink-0">{leading}</div>}
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-gray-900 dark:text-white">
            {children}
          </div>
          {subtitle && (
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              {subtitle}
            </div>
          )}
        </div>
        {trailing && <div className="flex-shrink-0">{trailing}</div>}
      </Component>
    );
  }
);

ListRow.displayName = 'ListRow';

