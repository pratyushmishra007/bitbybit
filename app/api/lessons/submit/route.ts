/**
 * Lesson Solution Submission API
 * Handles code submission and progress tracking
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { supabase } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { lessonId, code, attempts, hintsUsed } = body;

    if (!lessonId || !code) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Get user ID
    const { data: user } = await supabase
      .from('users')
      .select('id')
      .eq('email', session.user.email)
      .single();

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Get lesson details
    const { data: lesson } = await supabase
      .from('lessons')
      .select('xp_reward, course_id')
      .eq('id', lessonId)
      .single();

    if (!lesson) {
      return NextResponse.json(
        { error: 'Lesson not found' },
        { status: 404 }
      );
    }

    // Calculate XP based on performance
    let xpEarned = lesson.xp_reward || 10;
    
    // Reduce XP for using hints
    xpEarned = Math.max(5, xpEarned - (hintsUsed * 2));
    
    // Bonus for completing in few attempts
    if (attempts === 1) {
      xpEarned += 5; // First try bonus
    }

    // Check if already completed
    const { data: existingProgress } = await supabase
      .from('lesson_progress')
      .select('*')
      .eq('user_id', user.id)
      .eq('lesson_id', lessonId)
      .single();

    if (existingProgress) {
      // Update existing progress
      await supabase
        .from('lesson_progress')
        .update({
          completed: true,
          code_submitted: code,
          xp_earned: Math.max(existingProgress.xp_earned, xpEarned), // Keep highest XP
          completed_at: new Date().toISOString(),
          attempts_count: (existingProgress.attempts_count || 0) + attempts,
          hints_used: (existingProgress.hints_used || 0) + hintsUsed,
        })
        .eq('user_id', user.id)
        .eq('lesson_id', lessonId);
    } else {
      // Create new progress entry
      await supabase
        .from('lesson_progress')
        .insert({
          user_id: user.id,
          lesson_id: lessonId,
          course_id: lesson.course_id,
          completed: true,
          code_submitted: code,
          xp_earned: xpEarned,
          completed_at: new Date().toISOString(),
          attempts_count: attempts,
          hints_used: hintsUsed,
        });
    }

    // Update user's total XP
    const { data: userStats } = await supabase
      .from('users')
      .select('total_xp')
      .eq('id', user.id)
      .single();

    const newTotalXp = (userStats?.total_xp || 0) + xpEarned;
    const newLevel = Math.floor(newTotalXp / 100) + 1;

    await supabase
      .from('users')
      .update({
        total_xp: newTotalXp,
        level: newLevel,
      })
      .eq('id', user.id);

    return NextResponse.json({
      success: true,
      xpEarned,
      totalXp: newTotalXp,
      level: newLevel,
      message: attempts === 1 
        ? '🎉 Perfect! First try bonus!' 
        : hintsUsed === 0 
          ? '✨ Great job! No hints needed!'
          : '✓ Well done!',
    });
    
  } catch (error: any) {
    console.error('Submission error:', error);
    return NextResponse.json(
      { error: error.message || 'Submission failed' },
      { status: 500 }
    );
  }
}
