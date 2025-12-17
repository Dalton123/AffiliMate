import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { ApiError, Project } from '@affilimate/types';

// GET /api/admin/projects - Get or auto-create user's project
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json<ApiError>(
      { error: 'unauthorized', message: 'Not authenticated' },
      { status: 401 }
    );
  }

  // Check for existing project
  let { data: project } = await supabase
    .from('projects')
    .select('*')
    .eq('owner_id', user.id)
    .single();

  // Auto-create if none exists
  if (!project) {
    const slug = `project-${user.id.slice(0, 8)}`;
    const { data: newProject, error } = await supabase
      .from('projects')
      .insert({
        name: 'My Project',
        slug,
        owner_id: user.id,
        settings: {},
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json<ApiError>(
        { error: 'database_error', message: error.message },
        { status: 500 }
      );
    }
    project = newProject;
  }

  return NextResponse.json({ project: project as Project });
}
