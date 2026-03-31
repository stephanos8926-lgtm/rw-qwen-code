import React, { useState, useEffect, useRef } from 'react';

interface ContextMenuProps {
  x: number;
  y: number;
  onClose: () => void;
  items: { label: string; onClick: () => void }[];
}

export const ContextMenu: React.FC<ContextMenuProps> = ({ x, y, onClose, items }) => {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  return (
    <div
      ref={menuRef}
      className="absolute z-50 w-40 bg-popover text-popover-foreground rounded-md shadow-md border border-border py-1"
      style={{ top: y, left: x }}
    >
      {items.map((item, index) => (
        <button
          key={index}
          className="w-full text-left px-4 py-2 text-sm hover:bg-accent hover:text-accent-foreground"
          onClick={() => {
            item.onClick();
            onClose();
          }}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
};
