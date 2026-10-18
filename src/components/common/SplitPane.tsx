import React, { useState, useRef, useEffect, useCallback } from 'react';

interface SplitPaneProps {
  top: React.ReactNode;
  bottom: React.ReactNode;
  initialRatio?: number; // 0 to 1, default 0.5
  minTopHeight?: number;
  minBottomHeight?: number;
}

export const SplitPane: React.FC<SplitPaneProps> = ({
  top,
  bottom,
  initialRatio = 0.5,
  minTopHeight = 180,
  minBottomHeight = 180,
}) => {
  const [ratio, setRatio] = useState(initialRatio);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    isDraggingRef.current = true;
    document.body.style.cursor = 'row-resize';
  };

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDraggingRef.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const relativeY = e.clientY - rect.top;
      const totalHeight = rect.height;

      if (relativeY >= minTopHeight && totalHeight - relativeY >= minBottomHeight) {
        setRatio(relativeY / totalHeight);
      }
    },
    [minTopHeight, minBottomHeight]
  );

  const handleMouseUp = useCallback(() => {
    isDraggingRef.current = false;
    document.body.style.cursor = 'default';
  }, []);

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  return (
    <div ref={containerRef} className="flex flex-col h-full w-full overflow-hidden relative">
      {/* Top Pane */}
      <div
        style={{ height: `calc(${ratio * 100}% - 3px)` }}
        className="w-full overflow-hidden flex flex-col"
      >
        {top}
      </div>

      {/* Resize Handle */}
      <div
        onMouseDown={handleMouseDown}
        className="h-1.5 w-full bg-surface-border hover:bg-brand-500/80 cursor-row-resize transition-colors flex items-center justify-center group select-none z-10"
        title="Drag to resize split panes"
      >
        <div className="w-8 h-0.5 rounded-full bg-surface-muted group-hover:bg-brand-primary transition-colors" />
      </div>

      {/* Bottom Pane */}
      <div
        style={{ height: `calc(${(1 - ratio) * 100}% - 3px)` }}
        className="w-full overflow-hidden flex flex-col"
      >
        {bottom}
      </div>
    </div>
  );
};
