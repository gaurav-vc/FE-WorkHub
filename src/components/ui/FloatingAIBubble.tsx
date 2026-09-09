import React, { useState, useRef, useEffect } from 'react';
import { cn } from "@/lib/utils";

interface FloatingAIBubbleProps {
  children: React.ReactNode;
}

export function FloatingAIBubble({ children }: FloatingAIBubbleProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Calculate initial position equivalent to bottom-24 (96px) + some buffer
  const initialY = typeof window !== 'undefined' ? window.innerHeight - 160 : 500;
  const [positionY, setPositionY] = useState(initialY);
  
  const [isDragging, setIsDragging] = useState(false);
  const dragStartY = useRef(0);
  const dragStartPosY = useRef(0);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsExpanded(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handlePointerDown = (e: React.PointerEvent) => {
    setIsDragging(false);
    dragStartY.current = e.clientY;
    dragStartPosY.current = positionY;
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (e.buttons !== 1) return; // Only track when left mouse button / touch is active
    const dy = e.clientY - dragStartY.current;
    
    // Threshold to distinguish click from drag
    if (Math.abs(dy) > 5) {
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
    if (!isDragging) {
      // If it wasn't a drag, toggle the expanded state
      setIsExpanded(!isExpanded);
    }
  };

  return (
    <div
      ref={containerRef}
      className={cn(
        "fixed right-0 z-50 touch-none cursor-pointer flex items-center justify-center animate-bounce-subtle",
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
    >
      <div 
        className={cn(
          "transition-all duration-300 ease-out",
          isExpanded ? "scale-100" : "scale-90"
        )}
      >
        {/* 
          Intercept clicks when collapsed so the child button's onClick doesn't fire.
          When expanded, pointer events are enabled allowing the button to be clicked.
        */}
        <div className={cn("transition-all", !isExpanded && "pointer-events-none")}>
           {children}
        </div>
      </div>
    </div>
  );
}
