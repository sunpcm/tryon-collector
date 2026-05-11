import { Link, useLocation } from 'wouter';
import { IdentityBadge } from '@/features/identity';

const NAV_ITEMS = [
  { href: '/', label: '首页' },
  { href: '/audit', label: '审计页' },
  { href: '/tags', label: '标签管理' },
  { href: '/showcase', label: '展示图采集' },
  { href: '/showcase/audit', label: '展示图查看' },
];

export function Banner() {
  const [location] = useLocation();

  return (
    <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
      <h1 className="text-lg font-semibold text-gray-800">Tryon Collector</h1>
      <div className="flex items-center gap-4">
        {NAV_ITEMS.map(item => (
          <Link
            key={item.href}
            href={item.href}
            className={`text-sm ${
              location === item.href
                ? 'text-blue-600 font-medium'
                : 'text-blue-500 hover:text-blue-600'
            }`}
          >
            {item.label}
          </Link>
        ))}
        <IdentityBadge />
      </div>
    </header>
  );
}
