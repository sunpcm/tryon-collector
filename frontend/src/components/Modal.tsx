import { useEffect, type ReactNode } from 'react';
import { cn } from '@/utils';

interface ModalProps {
  open: boolean;
  title?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode | null;
  onClose?: () => void;
  maskClosable?: boolean;
  className?: string;
  width?: number | string;
}

export function Modal({
  open,
  title,
  children,
  footer,
  onClose,
  maskClosable = true,
  className,
  width = 480,
}: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && maskClosable) onClose?.();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, maskClosable, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/40"
        onClick={() => maskClosable && onClose?.()}
      />
      <div
        role="dialog"
        aria-modal="true"
        className={cn(
          'relative bg-white rounded-lg shadow-xl flex flex-col max-h-[90vh]',
          className
        )}
        style={{ width }}
      >
        {title && (
          <div className="px-6 py-4 border-b border-gray-200 text-base font-semibold text-gray-800">
            {title}
          </div>
        )}
        <div className="px-6 py-4 overflow-auto">{children}</div>
        {footer !== null && footer !== undefined && (
          <div className="px-6 py-3 border-t border-gray-200 flex items-center justify-end gap-2">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
