'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const menuGroups = [
  {
    title: 'Monitoring',
    items: [
      { href: '/', label: 'Dashboard', icon: 'DB' },
      { href: '/notification-logs', label: 'Log Notification', icon: 'LG' }
    ]
  },
  {
    title: 'Data',
    items: [
      { href: '/users', label: 'Users', icon: 'US' },
      { href: '/custom-reminders', label: 'Custom Reminder', icon: 'CR' }
    ]
  }
];

export function CmsNav() {
  const pathname = usePathname();

  return (
    <nav className="cms-nav">
      {menuGroups.map((group) => (
        <section key={group.title} className="nav-group">
          <p className="nav-group-title">{group.title}</p>
          <div className="nav-group-items">
            {group.items.map((menu) => {
              const active = pathname === menu.href;
              return (
                <Link key={menu.href} href={menu.href} className={active ? 'sidebar-link active' : 'sidebar-link'}>
                  <span className="menu-icon" aria-hidden="true">
                    {menu.icon}
                  </span>
                  <span>{menu.label}</span>
                </Link>
              );
            })}
          </div>
        </section>
      ))}
    </nav>
  );
}
