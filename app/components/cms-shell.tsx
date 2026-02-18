import { ReactNode } from 'react';
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

export async function CmsShell({ title, subtitle, email, children }: Props) {
  return (
    <main className="cms-layout">
      <Sidebar className="cms-sidebar">
        <SidebarHeader>
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
          <CmsNav />
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
