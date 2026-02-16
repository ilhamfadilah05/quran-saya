import { NextResponse } from 'next/server';
import { canAccessCronRoute } from '@/lib/cms-auth';
import { validateFcmEnv, validateSupabaseEnv } from '@/lib/env';
import { runReminderCron } from '@/lib/cron-jobs';

export async function POST(request: Request) {
  if (!(await canAccessCronRoute(request))) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    validateSupabaseEnv();
    validateFcmEnv();

    const result = await runReminderCron();
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ ok: false, error: (error as Error).message }, { status: 500 });
  }
}
