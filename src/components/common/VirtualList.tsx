import React, { useRef, useState, useEffect, useCallback } from 'react';

export interface VirtualListProps<T> {
  items: T[];
  itemHeight: number;
  maxHeight?: number | string;
  renderItem: (item: T, index: number) => React.ReactNode;
  overscan?: number;
  className?: string;
  emptyPlaceholder?: React.ReactNode;
  ariaLabel?: string;
}

/**
 * High-performance virtualized list capable of rendering 1,000+ items with constant minimal DOM footprint.
 */
export function VirtualList<T>({
  items,
  itemHeight,
  maxHeight = '100%',
  renderItem,
  overscan = 5,
  className = '',
  emptyPlaceholder,
  ariaLabel,
}: VirtualListProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(() => {
    return typeof maxHeight === 'number' ? maxHeight : 400;
  });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    if (typeof ResizeObserver !== 'undefined') {
      const observer = new ResizeObserver((entries) => {
        for (const entry of entries) {
          if (entry.contentRect.height > 0) {
            setContainerHeight(entry.contentRect.height);
          }
        }
      });

      observer.observe(el);
      if (el.clientHeight > 0) {
        setContainerHeight(el.clientHeight);
      }
      return () => observer.disconnect();
    }
  }, [maxHeight]);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  if (items.length === 0) {
    return <>{emptyPlaceholder || null}</>;
  }

  const totalHeight = items.length * itemHeight;
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const endIndex = Math.min(
    items.length,
    Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
  );

  const visibleItems = items.slice(startIndex, endIndex);
  const offsetY = startIndex * itemHeight;

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className={`relative overflow-y-auto ${className}`}
      style={{ height: maxHeight, maxHeight }}
      aria-label={ariaLabel}
      role="region"
    >
      <div style={{ height: totalHeight, width: '100%', position: 'relative' }}>
        <div
          style={{
            transform: `translateY(${offsetY}px)`,
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
          }}
        >
          {visibleItems.map((item, idx) => renderItem(item, startIndex + idx))}
        </div>
      </div>
    </div>
  );
}
