import { cn } from '@/utils';

interface TagProps {
  label: string;
  selected?: boolean;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
}

export function Tag({
  label,
  selected = false,
  onClick,
  disabled = false,
  className,
}: TagProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'inline-flex items-center px-3 py-1 rounded-full text-sm font-medium transition-colors',
        'border focus:outline-none focus:ring-2 focus:ring-blue-400',
        selected
          ? 'bg-blue-500 text-white border-blue-500'
          : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400 hover:text-blue-600',
        disabled && 'opacity-50 cursor-not-allowed',
        className
      )}
    >
      {label}
    </button>
  );
}
