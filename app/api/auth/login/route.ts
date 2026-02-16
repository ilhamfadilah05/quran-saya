import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getSupabaseServerClient } from '@/lib/supabase';
import { validateAdminEnv, validateSupabaseEnv } from '@/lib/env';
import { ADMIN_SESSION_COOKIE, createAdminSessionToken } from '@/lib/admin-session';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6)
});

export async function POST(request: Request) {
  try {
    validateSupabaseEnv();
    validateAdminEnv();

    const payload = loginSchema.parse(await request.json());
    const supabase = getSupabaseServerClient();

    const primaryCall = await supabase.rpc('admin_login', {
      email: payload.email,
      password: payload.password
    });

    const fallbackCall =
      primaryCall.error?.message.includes('Could not find the function public.admin_login') ??
      false
        ? await supabase.rpc('admin_login', {
            p_email: payload.email,
            p_password: payload.password
          })
        : null;

    const data = fallbackCall?.data ?? primaryCall.data;
    const error = fallbackCall?.error ?? primaryCall.error;

    if (error) {
      return NextResponse.json(
        {
          ok: false,
          error: `${error.message}. Pastikan function admin_login ada dan parameter sesuai.`
        },
        { status: 500 }
      );
    }

    const admin = data?.[0] as
      | {
          id: string;
          email: string;
          full_name: string | null;
        }
      | undefined;

    if (!admin) {
      return NextResponse.json({ ok: false, error: 'Email atau password salah.' }, { status: 401 });
    }

    await supabase.from('admin').update({ last_login_at: new Date().toISOString() }).eq('id', admin.id);

    const token = createAdminSessionToken(admin.id, admin.email);

    const response = NextResponse.json({ ok: true, admin: { id: admin.id, email: admin.email, fullName: admin.full_name } });
    response.cookies.set({
      name: ADMIN_SESSION_COOKIE,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7
    });

    return response;
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ ok: false, error: error.issues }, { status: 400 });
    }

    return NextResponse.json({ ok: false, error: (error as Error).message }, { status: 500 });
  }
}
