import { supabase } from '../lib/supabase'
import type { ProjectSchemaV2 } from '../types'
import { createDefaultProject } from '../types'

// Map UI values to database-accepted values
function mapPhaseType(grantType: string): string {
  const mapping: Record<string, string> = {
    'Phase I': 'phase1',
    'Phase II': 'phase2',
    'Phase IIB': 'phase2b',
    'Fast-Track': 'fasttrack',
    'Direct-to-Phase II': 'phase2',
    // Default fallbacks
    'phase1': 'phase1',
    'phase2': 'phase2',
    'phase2b': 'phase2b',
    'fasttrack': 'fasttrack'
  }
  return mapping[grantType] || 'phase1'
}

// For award_type, we default to 'grant' since SBIR/STTR are typically grants
function mapAwardType(grantType: string): string {
  // All SBIR/STTR are grants unless otherwise specified
  return 'grant'
}

export interface DBProject {
  id: string
  user_id: string
  title: string | null
  funding_program: string
  award_type: string
  phase_type: string | null
  status: string | null
  data: ProjectSchemaV2 | null
  created_at: string
  updated_at: string
}

// Convert DB project to our schema
function dbToProject(dbProject: DBProject): ProjectSchemaV2 {
  // Create default project to ensure all required nested objects exist
  const defaultProject = createDefaultProject(
    dbProject.funding_program as 'SBIR' | 'STTR',
    dbProject.award_type as any
  )
  
  if (dbProject.data) {
    // Merge DB data with defaults to ensure no undefined nested objects
    return {
      ...defaultProject,
      ...dbProject.data,
      id: dbProject.id,
      updated_at: dbProject.updated_at,
      // Ensure critical nested objects have defaults if null/undefined
      m1_title_concept: dbProject.data.m1_title_concept || {},
      m2_hypothesis: dbProject.data.m2_hypothesis || {},
      m3_specific_aims: dbProject.data.m3_specific_aims || {},
      m4_team_mapping: dbProject.data.m4_team_mapping || {},
      m5_experimental_approach: dbProject.data.m5_experimental_approach || {},
      m6_budget: dbProject.data.m6_budget || {},
      m7_regulatory: dbProject.data.m7_regulatory || {},
      m8_compilation: dbProject.data.m8_compilation || {},
      m9_commercialization: dbProject.data.m9_commercialization || {},
      m3_fast_track: dbProject.data.m3_fast_track || defaultProject.m3_fast_track,
      m5_fast_track: dbProject.data.m5_fast_track || defaultProject.m5_fast_track,
      m6_fast_track: dbProject.data.m6_fast_track || defaultProject.m6_fast_track,
      m7_fast_track: dbProject.data.m7_fast_track || defaultProject.m7_fast_track,
      audit_trail: dbProject.data.audit_trail || defaultProject.audit_trail,
      foa_config: dbProject.data.foa_config || defaultProject.foa_config,
      prior_phase: dbProject.data.prior_phase || defaultProject.prior_phase,
      legacy_budget: dbProject.data.legacy_budget || defaultProject.legacy_budget,
      module_states: dbProject.data.module_states || defaultProject.module_states
    }
  }
  
  // Fallback: return default project with DB values
  return {
    ...defaultProject,
    id: dbProject.id,
    m1_title_concept: {
      ...defaultProject.m1_title_concept,
      project_title: dbProject.title || ''
    },
    updated_at: dbProject.updated_at
  }
}

// Get all projects for a user
export async function getUserProjects(userId: string): Promise<ProjectSchemaV2[]> {
  const { data, error } = await supabase
    .from('gf_projects')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })

  if (error) {
    console.error('Error fetching projects:', error)
    throw error
  }

  return (data || []).map(dbToProject)
}

// Get a single project by ID
export async function getProject(projectId: string, userId: string): Promise<ProjectSchemaV2 | null> {
  const { data, error } = await supabase
    .from('gf_projects')
    .select('*')
    .eq('id', projectId)
    .eq('user_id', userId)
    .maybeSingle()

  if (error) {
    console.error('Error fetching project:', error)
    throw error
  }

  return data ? dbToProject(data) : null
}

// Create a new project
export async function createProject(
  userId: string,
  programType: 'SBIR' | 'STTR',
  grantType: string,
  institute?: string
): Promise<ProjectSchemaV2> {
  const defaultProject = createDefaultProject(programType, grantType as any)
  
  if (institute) {
    defaultProject.institute = institute as any
  }

  const { data, error } = await supabase
    .from('gf_projects')
    .insert({
      user_id: userId,
      title: '',
      funding_program: programType,
      award_type: mapAwardType(grantType),
      phase_type: mapPhaseType(grantType),
      status: 'draft',
      data: defaultProject
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating project:', error)
    throw error
  }

  return {
    ...defaultProject,
    id: data.id,
    created_at: data.created_at,
    updated_at: data.updated_at
  }
}

// Update a project
export async function updateProject(
  projectId: string,
  userId: string,
  updates: Partial<ProjectSchemaV2>
): Promise<ProjectSchemaV2> {
  // First get current project data
  const { data: currentData, error: fetchError } = await supabase
    .from('gf_projects')
    .select('data')
    .eq('id', projectId)
    .eq('user_id', userId)
    .maybeSingle()

  if (fetchError) {
    console.error('Error fetching project for update:', fetchError)
    throw fetchError
  }

  // Merge updates with current data
  const mergedData: ProjectSchemaV2 = {
    ...(currentData?.data || {}),
    ...updates,
    updated_at: new Date().toISOString()
  }

  const { data, error } = await supabase
    .from('gf_projects')
    .update({
      title: mergedData.m1_title_concept?.project_title || '',
      funding_program: mergedData.program_type,
      award_type: mapAwardType(mergedData.grant_type || ''),
      phase_type: mapPhaseType(mergedData.grant_type || ''),
      data: mergedData,
      updated_at: new Date().toISOString()
    })
    .eq('id', projectId)
    .eq('user_id', userId)
    .select()
    .single()

  if (error) {
    console.error('Error updating project:', error)
    throw error
  }

  return dbToProject(data)
}

// Delete a project
export async function deleteProject(projectId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from('gf_projects')
    .delete()
    .eq('id', projectId)
    .eq('user_id', userId)

  if (error) {
    console.error('Error deleting project:', error)
    throw error
  }
}

// Save project (upsert - creates or updates)
export async function saveProject(
  userId: string,
  project: ProjectSchemaV2
): Promise<ProjectSchemaV2> {
  if (project.id) {
    return updateProject(project.id, userId, project)
  }
  
  // Create new project
  const newProject = await createProject(
    userId,
    project.program_type,
    project.grant_type || 'Phase I',
    project.institute
  )
  
  // Update with full data
  return updateProject(newProject.id!, userId, project)
}
