/**
 * VirtualizedList Component
 * Performance-optimized list for long lists
 * Uses simple virtualization (only renders visible items)
 */

'use client';

import { useState, useEffect, useRef, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

export interface VirtualizedListProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => ReactNode;
  itemHeight?: number;
  containerHeight?: number;
  className?: string;
  overscan?: number; // Number of items to render outside visible area
}

export function VirtualizedList<T>({
  items,
  renderItem,
  itemHeight = 60,
  containerHeight = 400,
  className,
  overscan = 3,
}: VirtualizedListProps<T>) {
  const [scrollTop, setScrollTop] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Calculate visible range
  const totalHeight = items.length * itemHeight;
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const endIndex = Math.min(
    items.length - 1,
    Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
  );

  const visibleItems = items.slice(startIndex, endIndex + 1);
  const offsetY = startIndex * itemHeight;

  // Handle scroll
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  };

  // Auto-update scroll position if container ref changes
  useEffect(() => {
    if (containerRef.current) {
      const handleScrollEvent = () => {
        if (containerRef.current) {
          setScrollTop(containerRef.current.scrollTop);
        }
      };
      containerRef.current.addEventListener('scroll', handleScrollEvent);
      return () => {
        containerRef.current?.removeEventListener('scroll', handleScrollEvent);
      };
    }
  }, []);

  return (
    <div
      ref={containerRef}
      className={cn('overflow-y-auto', className)}
      style={{ height: containerHeight }}
      onScroll={handleScroll}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        <div style={{ transform: `translateY(${offsetY}px)` }}>
          {visibleItems.map((item, index) => (
            <div
              key={startIndex + index}
              style={{ height: itemHeight }}
            >
              {renderItem(item, startIndex + index)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

