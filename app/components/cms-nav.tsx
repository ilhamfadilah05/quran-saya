'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BellRing, LayoutDashboard, Logs, MoonStar, UsersRound } from 'lucide-react';
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem
} from '@/app/components/ui/sidebar';

const menuGroups = [
  {
    title: 'Monitoring',
    items: [
      { href: '/', label: 'Dashboard', icon: LayoutDashboard },
      { href: '/notification-logs', label: 'Log Notification', icon: Logs }
    ]
  },
  {
    title: 'Data',
    items: [
      { href: '/users', label: 'Users', icon: UsersRound },
      { href: '/adzan-notifications', label: 'Notifikasi adzan', icon: MoonStar },
      { href: '/custom-reminders', label: 'Custom Reminder', icon: BellRing }
    ]
  }
];

export function CmsNav() {
  const pathname = usePathname();

  return (
    <nav className="cms-nav">
      {menuGroups.map((group) => (
        <SidebarGroup key={group.title}>
          <SidebarGroupLabel>{group.title}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
            {group.items.map((menu) => {
              const active = pathname === menu.href;
              const Icon = menu.icon;
              return (
                <SidebarMenuItem key={menu.href}>
                  <SidebarMenuButton asChild isActive={active}>
                    <Link href={menu.href}>
                      <span className="menu-icon" aria-hidden="true">
                        <Icon size={15} />
                      </span>
                      <span>{menu.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      ))}
    </nav>
  );
}
