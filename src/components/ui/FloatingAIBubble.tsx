import React, { useState, useRef } from 'react';
import { cn } from "@/lib/utils";

interface FloatingAIBubbleProps {
  children: React.ReactNode;
}

export function FloatingAIBubble({ children }: FloatingAIBubbleProps) {
  const [isExpanded, setIsExpanded] = useState(true); // Default to fully visible
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Calculate initial position equivalent to bottom-24 (96px) + some buffer
  const initialY = typeof window !== 'undefined' ? window.innerHeight - 160 : 500;
  const [positionY, setPositionY] = useState(initialY);
  
  const [isDragging, setIsDragging] = useState(false);
  const dragStartY = useRef(0);
  const dragStartPosY = useRef(0);

  const handlePointerDown = (e: React.PointerEvent) => {
    setIsDragging(false);
    dragStartY.current = e.clientY;
    dragStartPosY.current = positionY;
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    // Only track if left mouse button is pressed (or if it's a touch event)
    if (e.pointerType === 'mouse' && e.buttons !== 1) return; 
    
    const dy = e.clientY - dragStartY.current;
    
    // Threshold to distinguish click from drag
    if (Math.abs(dy) > 10) {
      setIsDragging(true);
    }
    
    if (isDragging) {
      let newY = dragStartPosY.current + dy;
      // Boundary check to keep it within the screen
      const maxY = window.innerHeight - 80;
      const minY = 80;
      newY = Math.max(minY, Math.min(newY, maxY));
      setPositionY(newY);
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    e.currentTarget.releasePointerCapture(e.pointerId);
  };

  return (
    <div
      ref={containerRef}
      className={cn(
        "fixed right-0 z-50 touch-none flex items-center justify-center animate-bounce-subtle",
        isExpanded ? "translate-x-[-24px]" : "translate-x-[50%] hover:translate-x-[40%] opacity-80 hover:opacity-100"
      )}
      style={{ 
        top: positionY, 
        transition: isDragging ? 'none' : 'transform 300ms cubic-bezier(0.2, 0.8, 0.2, 1), opacity 300ms ease-out' 
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onDoubleClick={() => setIsExpanded(prev => !prev)}
      onClickCapture={(e) => {
        // Prevent click events on the children ONLY if the user was dragging the bubble
        if (isDragging) {
          e.stopPropagation();
          e.preventDefault();
        }
      }}
    >
      <div 
        className={cn(
          "transition-all duration-300 ease-out cursor-pointer",
          isExpanded ? "scale-100" : "scale-90"
        )}
      >
        {/* Let the child handle its own single-clicks natively! */}
        {children}
      </div>
    </div>
  );
}
