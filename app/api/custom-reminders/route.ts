import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getSupabaseServerClient } from '@/lib/supabase';
import { getAdminSession } from '@/lib/admin-session';
import { validateSupabaseEnv } from '@/lib/env';

const createSchema = z.object({
  title: z.string().min(1),
  body: z.string().min(1),
  scheduleTime: z.string().regex(/^\d{2}:\d{2}$/),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().optional()
});

const updateSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1).optional(),
  body: z.string().min(1).optional(),
  scheduleTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().optional()
});

const deleteSchema = z.object({
  id: z.string().uuid()
});

async function ensureAdmin() {
  const session = await getAdminSession();
  return Boolean(session);
}

export async function GET() {
  if (!(await ensureAdmin())) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    validateSupabaseEnv();
    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase
      .from('custom_reminders')
      .select('id, title, body, schedule_time, is_active, sort_order, created_at, updated_at')
      .order('schedule_time', { ascending: true })
      .order('sort_order', { ascending: true });

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, data: data ?? [] });
  } catch (error) {
    return NextResponse.json({ ok: false, error: (error as Error).message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (!(await ensureAdmin())) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    validateSupabaseEnv();
    const payload = createSchema.parse(await request.json());
    const supabase = getSupabaseServerClient();

    const { data, error } = await supabase
      .from('custom_reminders')
      .insert({
        title: payload.title,
        body: payload.body,
        schedule_time: payload.scheduleTime,
        is_active: payload.isActive ?? true,
        sort_order: payload.sortOrder ?? 0,
        updated_at: new Date().toISOString()
      })
      .select('id')
      .single();

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, id: data.id });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ ok: false, error: error.issues }, { status: 400 });
    }

    return NextResponse.json({ ok: false, error: (error as Error).message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  if (!(await ensureAdmin())) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    validateSupabaseEnv();
    const payload = updateSchema.parse(await request.json());
    const supabase = getSupabaseServerClient();

    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString()
    };

    if (payload.title !== undefined) updateData.title = payload.title;
    if (payload.body !== undefined) updateData.body = payload.body;
    if (payload.scheduleTime !== undefined) updateData.schedule_time = payload.scheduleTime;
    if (payload.isActive !== undefined) updateData.is_active = payload.isActive;
    if (payload.sortOrder !== undefined) updateData.sort_order = payload.sortOrder;

    const { error } = await supabase.from('custom_reminders').update(updateData).eq('id', payload.id);

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ ok: false, error: error.issues }, { status: 400 });
    }

    return NextResponse.json({ ok: false, error: (error as Error).message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  if (!(await ensureAdmin())) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    validateSupabaseEnv();
    const payload = deleteSchema.parse(await request.json());
    const supabase = getSupabaseServerClient();

    const { error } = await supabase.from('custom_reminders').delete().eq('id', payload.id);
    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ ok: false, error: error.issues }, { status: 400 });
    }

    return NextResponse.json({ ok: false, error: (error as Error).message }, { status: 500 });
  }
}
