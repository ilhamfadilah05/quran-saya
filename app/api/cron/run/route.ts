import { NextResponse } from 'next/server';
import { canAccessCronRoute } from '@/lib/cms-auth';
import { validateFcmEnv, validateSupabaseEnv } from '@/lib/env';
import { runAdzanCron, runReminderCron } from '@/lib/cron-jobs';

export async function POST(request: Request) {
  if (!(await canAccessCronRoute(request))) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    validateSupabaseEnv();
    validateFcmEnv();

    const adzan = await runAdzanCron();
    const reminder = await runReminderCron();

    return NextResponse.json({
      ok: true,
      run_every: '1 minute',
      adzan,
      reminder,
      total: {
        processed: adzan.processed + reminder.processed,
        sent: adzan.sent + reminder.sent,
        failed: adzan.failed + reminder.failed
      }
    });
  } catch (error) {
    return NextResponse.json({ ok: false, error: (error as Error).message }, { status: 500 });
  }
}
