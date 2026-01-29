import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: sessionId } = await params;

    // Fetch basic session info (no participant check)
    const { data: sessionData, error: sessionError } = await supabase
      .from('collaboration_sessions')
      .select(`
        id,
        session_name,
        description,
        language,
        is_active,
        created_at,
        creator:users!collaboration_sessions_created_by_fkey (
          id,
          name,
          email
        )
      `)
      .eq('id', sessionId)
      .eq('is_active', true)
      .single();

    if (sessionError || !sessionData) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    return NextResponse.json({
      session: sessionData
    });
  } catch (error) {
    console.error('Error fetching public session info:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
