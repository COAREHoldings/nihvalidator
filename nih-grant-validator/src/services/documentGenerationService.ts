import type { ProjectSchemaV2 } from '../types'

const SUPABASE_URL = 'https://dvuhtfzsvcacyrlfettz.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR2dWh0ZnpzdmNhY3lybGZldHR6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk2NDk3OTYsImV4cCI6MjA4NTIyNTc5Nn0.vUtnPXeQrzU0kO0E7qK2qJtZ_RCqnXCEFSa60adHld0'

export type DocumentType = 
  | 'title'
  | 'project-summary'
  | 'project-narrative'
  | 'specific-aims'
  | 'specific-aims-page'
  | 'research-strategy'
  | 'experimental-plan'
  | 'commercialization'
  | 'references'
  | 'compiled-grant'

export interface GeneratedDocument {
  type: DocumentType
  content: string
  wordCount: number
  generatedAt: string
  title: string
}

export interface GenerationError {
  code: string
  message: string
}

export interface GenerationResult {
  success: boolean
  data?: GeneratedDocument
  error?: GenerationError
}

/**
 * Build the context payload for document generation
 */
function buildGenerationPayload(project: ProjectSchemaV2, documentType: DocumentType) {
  return {
    documentType,
    grantType: project.grant_type,
    programType: project.program_type,
    institute: project.institute,
    m1: project.m1_title_concept,
    m2: project.m2_hypothesis,
    m3: project.m3_specific_aims,
    m3FastTrack: project.m3_fast_track,
    m4: project.m4_team_mapping,
    m5: project.m5_experimental_approach,
    m5FastTrack: project.m5_fast_track,
    m6: project.m6_budget,
    m6FastTrack: project.m6_fast_track,
    m7: project.m7_regulatory,
    m8: project.m8_compilation,
    m9: project.m9_commercialization,
    generatedDocuments: project.generated_documents || {}
  }
}

/**
 * Generate a document using the Supabase edge function
 */
export async function generateDocument(
  project: ProjectSchemaV2,
  documentType: DocumentType
): Promise<GenerationResult> {
  try {
    const payload = buildGenerationPayload(project, documentType)
    
    // Use dedicated edge function for experimental-plan
    const endpoint = documentType === 'experimental-plan' 
      ? 'generate-experimental-plan' 
      : 'generate-document'

    const response = await fetch(`${SUPABASE_URL}/functions/v1/${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      },
      body: JSON.stringify(payload)
    })

    const result = await response.json()

    if (!response.ok || result.error) {
      return {
        success: false,
        error: {
          code: result.error?.code || 'GENERATION_ERROR',
          message: result.error?.message || 'Failed to generate document'
        }
      }
    }

    return {
      success: true,
      data: result.data
    }
  } catch (error) {
    return {
      success: false,
      error: {
        code: 'NETWORK_ERROR',
        message: error instanceof Error ? error.message : 'Network error occurred'
      }
    }
  }
}

/**
 * Get document type display name
 */
export function getDocumentTypeTitle(type: DocumentType): string {
  const titles: Record<DocumentType, string> = {
    'title': 'Project Title',
    'project-summary': 'Project Summary/Abstract',
    'project-narrative': 'Project Narrative',
    'specific-aims': 'Specific Aims',
    'specific-aims-page': 'Specific Aims Page',
    'research-strategy': 'Research Strategy',
    'experimental-plan': 'Experimental Plan',
    'commercialization': 'Commercialization Plan',
    'references': 'References',
    'compiled-grant': 'Compiled Full Application'
  }
  return titles[type] || type
}

/**
 * Get description for each document type
 */
export function getDocumentTypeDescription(type: DocumentType): string {
  const descriptions: Record<DocumentType, string> = {
    'title': 'Generate an optimal project title under 81 characters',
    'project-summary': '30-line abstract for your application',
    'project-narrative': '2-3 sentence public health relevance statement',
    'specific-aims': 'Clear, testable aims with milestones',
    'specific-aims-page': 'The most important page of your grant',
    'research-strategy': 'Significance, Innovation, and Approach sections',
    'experimental-plan': 'Detailed methodology with statistical considerations',
    'commercialization': '12-page plan with all 6 NIH sections',
    'references': 'Reference framework with search guidance',
    'compiled-grant': 'Full application document ready for submission'
  }
  return descriptions[type] || ''
}

/**
 * Get the expected location/step for each document type
 */
export function getDocumentStep(type: DocumentType): number {
  const steps: Record<DocumentType, number> = {
    'title': 1,
    'project-summary': 2,
    'project-narrative': 2,
    'specific-aims': 2,
    'specific-aims-page': 2,
    'research-strategy': 3,
    'experimental-plan': 3,
    'commercialization': 4,
    'references': 5,
    'compiled-grant': 5
  }
  return steps[type] || 1
}

export default {
  generateDocument,
  getDocumentTypeTitle,
  getDocumentStep
}
