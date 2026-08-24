import { useState } from 'react';
import { cn } from '@/lib/utils';
import { API_URL } from '@/lib/api';

const AVATAR_COLORS = [
  'bg-pine-600',
  'bg-brass-600',
  'bg-steel-600',
  'bg-terracotta-600',
  'bg-ink-600',
];

export function getAvatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

interface AvatarProps {
  name: string;
  src?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function Avatar({ name, src, size = 'md', className }: AvatarProps) {
  const [imgFailed, setImgFailed] = useState(false);
  const resolvedSrc = src ? (src.startsWith('http') ? src : `${API_URL}${src}`) : undefined;

  if (resolvedSrc && !imgFailed) {
    return (
      <img
        src={resolvedSrc}
        alt={name}
        onError={() => setImgFailed(true)}
        className={cn(
          'rounded-full object-cover select-none',
          size === 'sm' && 'h-6 w-6',
          size === 'md' && 'h-8 w-8',
          size === 'lg' && 'h-10 w-10',
          className
        )}
      />
    );
  }

  return (
    <div
      className={cn(
        'flex items-center justify-center rounded-full font-medium text-bone-50 select-none',
        getAvatarColor(name),
        size === 'sm' && 'h-6 w-6 text-[10px]',
        size === 'md' && 'h-8 w-8 text-xs',
        size === 'lg' && 'h-10 w-10 text-sm',
        className
      )}
    >
      {getInitials(name)}
    </div>
  );
}
