import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getAdminSession } from '@/lib/admin-session';
import { validateSupabaseEnv } from '@/lib/env';
import { getSupabaseServerClient } from '@/lib/supabase';

const hhmmSchema = z
  .string()
  .regex(/^\d{2}:\d{2}$/)
  .refine((value) => {
    const [hh, mm] = value.split(':').map(Number);
    return hh >= 0 && hh <= 23 && mm >= 0 && mm <= 59;
  }, 'Format jam harus HH:MM');

const updateSchema = z.object({
  id: z.number().int().positive(),
  cityName: z.string().optional(),
  isSubuh: z.boolean().optional(),
  isDzuhur: z.boolean().optional(),
  isAshar: z.boolean().optional(),
  isMaghrib: z.boolean().optional(),
  isIsya: z.boolean().optional(),
  subuhTime: hhmmSchema.nullable().optional(),
  dzuhurTime: hhmmSchema.nullable().optional(),
  asharTime: hhmmSchema.nullable().optional(),
  maghribTime: hhmmSchema.nullable().optional(),
  isyaTime: hhmmSchema.nullable().optional()
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
      .from('adzan_notification')
      .select(
        'id, created_at, user_id, city_name, is_subuh, is_dzuhur, is_ashar, is_maghrib, is_isya, subuh_time, dzuhur_time, ashar_time, maghrib_time, isya_time'
      )
      .order('created_at', { ascending: false })
      .limit(2000);

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, data: data ?? [] });
  } catch (error) {
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

    const updateData: Record<string, unknown> = {};
    if (payload.cityName !== undefined) updateData.city_name = payload.cityName;
    if (payload.isSubuh !== undefined) updateData.is_subuh = payload.isSubuh;
    if (payload.isDzuhur !== undefined) updateData.is_dzuhur = payload.isDzuhur;
    if (payload.isAshar !== undefined) updateData.is_ashar = payload.isAshar;
    if (payload.isMaghrib !== undefined) updateData.is_maghrib = payload.isMaghrib;
    if (payload.isIsya !== undefined) updateData.is_isya = payload.isIsya;
    if (payload.subuhTime !== undefined) updateData.subuh_time = payload.subuhTime;
    if (payload.dzuhurTime !== undefined) updateData.dzuhur_time = payload.dzuhurTime;
    if (payload.asharTime !== undefined) updateData.ashar_time = payload.asharTime;
    if (payload.maghribTime !== undefined) updateData.maghrib_time = payload.maghribTime;
    if (payload.isyaTime !== undefined) updateData.isya_time = payload.isyaTime;

    const { error } = await supabase.from('adzan_notification').update(updateData).eq('id', payload.id);
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
