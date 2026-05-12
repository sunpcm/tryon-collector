import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'wouter';
import { IdentityBadge } from '@/features/identity';
import { cn } from '@/utils';

type Mode = 'tryon' | 'showcase-monologue' | 'showcase-laofengxiang';

interface ModeConfig {
  label: string;
  home: string;
  navItems: { href: string; label: string }[];
}

const MODES: Record<Mode, ModeConfig> = {
  tryon: {
    label: '试穿图采集',
    home: '/',
    navItems: [
      { href: '/', label: '首页' },
      { href: '/audit', label: '审计页' },
      { href: '/tags', label: '标签管理' },
    ],
  },
  'showcase-monologue': {
    label: 'monologue 展示图',
    home: '/showcase/monologue',
    navItems: [
      { href: '/showcase/monologue', label: '首页' },
      { href: '/showcase/monologue/audit', label: '展示图查看' },
    ],
  },
  'showcase-laofengxiang': {
    label: '老凤祥展示图',
    home: '/showcase/laofengxiang',
    navItems: [
      { href: '/showcase/laofengxiang', label: '首页' },
      { href: '/showcase/laofengxiang/audit', label: '展示图查看' },
    ],
  },
};

function currentMode(location: string): Mode {
  if (location.startsWith('/showcase/laofengxiang'))
    return 'showcase-laofengxiang';
  if (location.startsWith('/showcase/monologue')) return 'showcase-monologue';
  if (location.startsWith('/showcase')) return 'showcase-monologue';
  return 'tryon';
}

export function Banner() {
  const [location, navigate] = useLocation();
  const mode = currentMode(location);
  const config = MODES[mode];

  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onDocClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onEsc);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onEsc);
    };
  }, [menuOpen]);

  const switchMode = (target: Mode) => {
    setMenuOpen(false);
    if (target !== mode) navigate(MODES[target].home);
  };

  return (
    <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
      <div ref={menuRef} className="relative">
        <button
          type="button"
          onClick={() => setMenuOpen(v => !v)}
          className="flex items-center gap-1.5 text-lg font-semibold text-gray-800 hover:text-gray-900 focus:outline-none"
          aria-haspopup="true"
          aria-expanded={menuOpen}
        >
          <span>{config.label}</span>
          <svg
            className={cn(
              'w-4 h-4 text-gray-400 transition-transform',
              menuOpen && 'rotate-180'
            )}
            viewBox="0 0 20 20"
            fill="currentColor"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M5.23 7.21a.75.75 0 011.06.02L10 11.06l3.71-3.83a.75.75 0 111.08 1.04l-4.25 4.39a.75.75 0 01-1.08 0L5.21 8.27a.75.75 0 01.02-1.06z"
              clipRule="evenodd"
            />
          </svg>
        </button>
        {menuOpen && (
          <div
            role="menu"
            className="absolute left-0 top-full mt-1 min-w-[180px] bg-white border border-gray-200 rounded-md shadow-lg py-1 z-20"
          >
            {(Object.keys(MODES) as Mode[]).map(m => {
              const active = m === mode;
              return (
                <button
                  key={m}
                  role="menuitemradio"
                  aria-checked={active}
                  onClick={() => switchMode(m)}
                  className={cn(
                    'w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-gray-50',
                    active ? 'text-blue-600 font-medium' : 'text-gray-700'
                  )}
                >
                  <span className="w-4 text-center">{active ? '✓' : ''}</span>
                  <span>{MODES[m].label}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="flex items-center gap-4">
        {config.navItems.map(item => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'text-sm',
              location === item.href
                ? 'text-blue-600 font-medium'
                : 'text-blue-500 hover:text-blue-600'
            )}
          >
            {item.label}
          </Link>
        ))}
        <IdentityBadge />
      </div>
    </header>
  );
}
