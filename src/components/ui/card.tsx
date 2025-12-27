/**
 * Card Component
 * Apple-like card with elevation and subtle shadows
 */

'use client';

import { cn } from '@/lib/cn';
import { motion } from 'framer-motion';
import { forwardRef, type HTMLAttributes } from 'react';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'elevated' | 'outlined';
  interactive?: boolean;
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = 'default', interactive = false, children, ...props }, ref) => {
    const baseStyles = 'rounded-2xl bg-white dark:bg-gray-900 transition-all';
    
    const variants = {
      default: 'border border-gray-200 dark:border-gray-800 shadow-sm',
      elevated: 'border border-gray-200 dark:border-gray-800 shadow-md',
      outlined: 'border-2 border-gray-300 dark:border-gray-700',
    };

    const interactiveStyles = interactive
      ? 'cursor-pointer hover:shadow-lg hover:scale-[1.01] active:scale-[0.99]'
      : '';

    const Component = interactive ? motion.div : 'div';
    const { onDrag, onDragStart, onDragEnd, ...restProps } = props;
    const motionProps = interactive
      ? {
          whileHover: { scale: 1.01 },
          whileTap: { scale: 0.99 },
          transition: { duration: 0.2, ease: 'easeOut' },
        }
      : {};

    return (
      <Component
        ref={ref}
        className={cn(baseStyles, variants[variant], interactiveStyles, className)}
        {...(interactive ? motionProps : {})}
        {...(restProps as any)}
      >
        {children}
      </Component>
    );
  }
);

Card.displayName = 'Card';

export const CardHeader = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('flex flex-col space-y-1.5 p-6', className)}
      {...props}
    />
  )
);
CardHeader.displayName = 'CardHeader';

export const CardTitle = forwardRef<HTMLParagraphElement, HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3
      ref={ref}
      className={cn('text-lg font-semibold leading-none tracking-tight text-gray-900 dark:text-white', className)}
      {...props}
    />
  )
);
CardTitle.displayName = 'CardTitle';

export const CardDescription = forwardRef<HTMLParagraphElement, HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p
      ref={ref}
      className={cn('text-sm text-gray-600 dark:text-gray-400', className)}
      {...props}
    />
  )
);
CardDescription.displayName = 'CardDescription';

export const CardContent = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('p-6 pt-0', className)} {...props} />
  )
);
CardContent.displayName = 'CardContent';

export const CardFooter = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('flex items-center p-6 pt-0', className)}
      {...props}
    />
  )
);
CardFooter.displayName = 'CardFooter';

