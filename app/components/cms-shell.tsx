'use client';

import { ReactNode, useEffect, useState } from 'react';
import { Menu, X } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { LogoutButton } from '@/app/components/logout-button';
import { CmsNav } from '@/app/components/cms-nav';
import { Card, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader } from '@/app/components/ui/sidebar';

type Props = {
  title: string;
  subtitle?: string;
  email: string;
  children: ReactNode;
};

export function CmsShell({ title, subtitle, email, children }: Props) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setIsSidebarOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!isSidebarOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isSidebarOpen]);

  return (
    <main className="cms-layout">
      <div className="cms-mobile-topbar">
        <button
          type="button"
          className="cms-menu-toggle"
          onClick={() => setIsSidebarOpen(true)}
          aria-label="Buka menu sidebar"
        >
          <Menu size={18} />
          <span>Menu</span>
        </button>
        <p className="small">Quran Saya CMS</p>
      </div>

      {isSidebarOpen && (
        <button
          type="button"
          className="cms-sidebar-overlay"
          onClick={() => setIsSidebarOpen(false)}
          aria-label="Tutup menu sidebar"
        />
      )}

      <Sidebar className={`cms-sidebar${isSidebarOpen ? ' is-open' : ''}`}>
        <SidebarHeader>
          <button
            type="button"
            className="cms-sidebar-close"
            onClick={() => setIsSidebarOpen(false)}
            aria-label="Tutup sidebar"
          >
            <X size={16} />
          </button>
          <div className="brand-block">
            <div className="brand-logo" aria-hidden="true">
              QS
            </div>
            <div className="grid" style={{ gap: 2 }}>
              <h2>Quran Saya</h2>
              <p className="small">Admin Panel</p>
            </div>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <CmsNav onNavigate={() => setIsSidebarOpen(false)} />
        </SidebarContent>
        <SidebarFooter>
          <div className="grid" style={{ gap: 10 }}>
            <p className="small">Login sebagai: {email}</p>
            <LogoutButton />
          </div>
        </SidebarFooter>
      </Sidebar>

      <section className="cms-content">
        <Card>
          <CardHeader>
            <CardTitle>{title}</CardTitle>
            {subtitle && <p className="small">{subtitle}</p>}
          </CardHeader>
        </Card>
        <div className="grid">{children}</div>
      </section>
    </main>
  );
}
