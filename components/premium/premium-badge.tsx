import { Sparkles, Lock } from 'lucide-react';
import Link from 'next/link';

interface PremiumBadgeProps {
  showLock?: boolean;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function PremiumBadge({ 
  showLock = false, 
  className = '',
  size = 'sm' 
}: PremiumBadgeProps) {
  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-1',
    lg: 'text-base px-3 py-1.5',
  };

  const iconSize = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-4 h-4',
  };

  return (
    <span
      className={`
        inline-flex items-center gap-1 rounded-full font-medium
        bg-gradient-to-r from-yellow-400 to-orange-500 text-white
        ${sizeClasses[size]}
        ${className}
      `}
    >
      <Sparkles className={iconSize[size]} />
      Premium
      {showLock && <Lock className={`${iconSize[size]} ml-0.5`} />}
    </span>
  );
}

/**
 * PremiumBadgeLink - Premium badge that links to premium page
 */
export function PremiumBadgeLink({ className = '' }: { className?: string }) {
  return (
    <Link 
      href="/premium"
      className={`
        inline-flex items-center gap-1 rounded-full font-medium text-xs px-2 py-0.5
        bg-gradient-to-r from-yellow-400 to-orange-500 text-white hover:opacity-90 transition-opacity
        ${className}
      `}
    >
      <Sparkles className="w-3 h-3" />
      Premium
    </Link>
  );
}
