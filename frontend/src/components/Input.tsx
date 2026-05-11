import { forwardRef, type InputHTMLAttributes } from 'react';
import { cn } from '@/utils';

interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  size?: 'sm' | 'md' | 'lg';
  status?: 'error' | 'default';
}

const sizeClasses: Record<NonNullable<InputProps['size']>, string> = {
  sm: 'h-8 px-2.5 text-sm',
  md: 'h-10 px-3 text-sm',
  lg: 'h-12 px-4 text-base',
};

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { size = 'md', status = 'default', className, ...props },
  ref
) {
  return (
    <input
      ref={ref}
      className={cn(
        'w-full rounded-md border bg-white text-gray-900 placeholder:text-gray-400',
        'transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
        'disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed',
        status === 'error'
          ? 'border-red-500 focus:ring-red-500 focus:border-red-500'
          : 'border-gray-300',
        sizeClasses[size],
        className
      )}
      {...props}
    />
  );
});
