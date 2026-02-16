import { redirect } from 'next/navigation';
import { getAdminSession } from '@/lib/admin-session';
import { LoginForm } from '@/app/components/login-form';

export default async function LoginPage() {
  const session = await getAdminSession();
  if (session) {
    redirect('/');
  }

  return (
    <main className="login-main">
      <div className="login-wrap">
        <LoginForm />
      </div>
    </main>
  );
}
