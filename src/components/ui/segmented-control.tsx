/**
 * SegmentedControl Component
 * Apple-like segmented control for tabs/switches
 */

'use client';

import { cn } from '@/lib/cn';
import { motion } from 'framer-motion';
import { type ReactNode } from 'react';

export interface SegmentedControlOption<T = string> {
  value: T;
  label: ReactNode;
  icon?: ReactNode;
}

export interface SegmentedControlProps<T = string> {
  options: SegmentedControlOption<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function SegmentedControl<T = string>({
  options,
  value,
  onChange,
  className,
  size = 'md',
}: SegmentedControlProps<T>) {
  const selectedIndex = options.findIndex((opt) => opt.value === value);
  const selectedOption = options[selectedIndex];

  const sizeStyles = {
    sm: 'h-8 text-xs px-2',
    md: 'h-10 text-sm px-3',
    lg: 'h-12 text-base px-4',
  };

  return (
    <div
      className={cn(
        'relative inline-flex w-full rounded-xl bg-gray-100 p-1 dark:bg-gray-800',
        className
      )}
      role="tablist"
    >
      {/* Background indicator */}
      {selectedOption && (
        <motion.div
          layoutId="segmented-control-indicator"
          className="absolute rounded-lg bg-white shadow-sm dark:bg-gray-700 dark:shadow-gray-900/50"
          style={{
            width: `calc(${100 / options.length}% - 0.25rem)`,
            height: 'calc(100% - 0.5rem)',
            left: `calc(${selectedIndex * (100 / options.length)}% + 0.125rem)`,
            top: '0.25rem',
          }}
          transition={{
            type: 'spring',
            stiffness: 300,
            damping: 30,
          }}
        />
      )}

      {/* Options */}
      {options.map((option, index) => {
        const isSelected = option.value === value;
        return (
          <button
            key={index}
            type="button"
            role="tab"
            aria-selected={isSelected}
            onClick={() => onChange(option.value)}
            className={cn(
              'relative z-10 flex flex-1 items-center justify-center gap-2 rounded-lg font-medium transition-colors',
              sizeStyles[size],
              isSelected
                ? 'text-gray-900 dark:text-white'
                : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100'
            )}
          >
            {option.icon && <span className="flex-shrink-0">{option.icon}</span>}
            <span>{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}

