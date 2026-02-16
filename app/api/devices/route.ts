import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getSupabaseServerClient } from '@/lib/supabase';
import { validateSupabaseEnv } from '@/lib/env';

const deviceSchema = z.object({
  userId: z.string().uuid().optional(),
  token: z.string().min(16),
  deviceId: z.string().optional(),
  deviceName: z.string().optional(),
  isReminder: z.boolean().optional()
});

export async function POST(request: Request) {
  try {
    validateSupabaseEnv();
    const payload = deviceSchema.parse(await request.json());
    const supabase = getSupabaseServerClient();

    const updateData = {
      token_firebase: payload.token,
      is_reminder: payload.isReminder ?? true,
      device_id: payload.deviceId ?? null,
      device_name: payload.deviceName ?? null
    };

    if (payload.userId) {
      const { error } = await supabase.from('users').update(updateData).eq('id', payload.userId);
      if (error) {
        return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
      }

      return NextResponse.json({ ok: true, userId: payload.userId }, { status: 200 });
    }

    if (payload.deviceId) {
      const { data: existingUser, error: existingError } = await supabase
        .from('users')
        .select('id')
        .eq('device_id', payload.deviceId)
        .limit(1)
        .maybeSingle();

      if (existingError) {
        return NextResponse.json({ ok: false, error: existingError.message }, { status: 500 });
      }

      if (existingUser?.id) {
        const { error } = await supabase.from('users').update(updateData).eq('id', existingUser.id);
        if (error) {
          return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
        }

        return NextResponse.json({ ok: true, userId: existingUser.id }, { status: 200 });
      }
    }

    const { data: insertedUser, error: insertError } = await supabase
      .from('users')
      .insert(updateData)
      .select('id')
      .single();

    if (insertError) {
      return NextResponse.json({ ok: false, error: insertError.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, userId: insertedUser.id }, { status: 200 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ ok: false, error: error.issues }, { status: 400 });
    }

    return NextResponse.json({ ok: false, error: (error as Error).message }, { status: 500 });
  }
}
