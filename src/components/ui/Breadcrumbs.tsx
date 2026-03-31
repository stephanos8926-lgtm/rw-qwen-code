import React from 'react';
import { ChevronRight } from 'lucide-react';

interface BreadcrumbsProps {
  path: string;
  onNavigate: (path: string) => void;
}

export const Breadcrumbs: React.FC<BreadcrumbsProps> = ({ path, onNavigate }) => {
  const parts = path.split('/').filter(Boolean);
  
  return (
    <div className="flex items-center gap-1 text-sm text-muted-foreground">
      {parts.map((part, index) => (
        <React.Fragment key={index}>
          {index > 0 && <ChevronRight size={14} />}
          <button
            onClick={() => onNavigate(parts.slice(0, index + 1).join('/'))}
            className="hover:text-white transition-colors truncate"
          >
            {part}
          </button>
        </React.Fragment>
      ))}
    </div>
  );
};
