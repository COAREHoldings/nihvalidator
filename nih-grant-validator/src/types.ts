// Schema Version
export const CURRENT_SCHEMA_VERSION = 2

export type GrantType = 'Phase I' | 'Phase II' | 'Fast Track' | 'Direct to Phase II' | 'Phase IIB'
export type ProgramType = 'SBIR' | 'STTR'
export type ModuleStatus = 'incomplete' | 'partial' | 'complete'

// FOA Configuration
export interface FOAConfig {
  direct_phase2_allowed: boolean
  fast_track_allowed: boolean
  phase2b_allowed: boolean
  commercialization_required: boolean
}

// Module State Object
export interface ModuleState {
  module_id: number
  name: string
  required_fields: string[]
  completed_fields: string[]
  status: ModuleStatus
  locked: boolean
  last_updated: string
}

// Module Field Definitions
export interface ModuleFieldValue {
  value: string | number | boolean | string[]
  populated: boolean
}

// M1: Title & Concept Clarity (8 fields)
export interface M1TitleConcept {
  project_title: string
  lay_summary: string
  scientific_abstract: string
  problem_statement: string
  proposed_solution: string
  target_population: string
  therapeutic_area: string
  technology_type: string
}

// M2: Hypothesis Development (5 fields)
export interface M2Hypothesis {
  central_hypothesis: string
  supporting_rationale: string
  preliminary_data_summary: string
  expected_outcomes: string
  success_criteria: string
}

// M3: Specific Aims (8 fields)
export interface M3SpecificAims {
  aim1_statement: string
  aim1_milestones: string[]
  aim2_statement: string
  aim2_milestones: string[]
  aim3_statement: string
  aim3_milestones: string[]
  timeline_summary: string
  interdependencies: string
}

// M3 Fast Track Phase-specific
export interface M3FastTrack {
  phase1: Partial<M3SpecificAims>
  phase2: Partial<M3SpecificAims>
  phase1_complete: boolean
  phase2_complete: boolean
}

// M4: Team Mapping (5 fields)
export interface M4TeamMapping {
  pi_name: string
  pi_qualifications: string
  key_personnel: { name: string; role: string; expertise: string }[]
  collaborators: { name: string; institution: string; contribution: string }[]
  consultants: { name: string; expertise: string; role: string }[]
}

// M5: Experimental Approach (8 fields)
export interface M5ExperimentalApproach {
  methodology_overview: string
  experimental_design: string
  data_collection_methods: string
  analysis_plan: string
  statistical_approach: string
  expected_results: string
  potential_pitfalls: string
  alternative_approaches: string
}

// M5 Fast Track Phase-specific
export interface M5FastTrack {
  phase1: Partial<M5ExperimentalApproach>
  phase2: Partial<M5ExperimentalApproach>
  phase1_complete: boolean
  phase2_complete: boolean
}

// M6: Budget & Justification (7 fields) - DO NOT MODIFY calculation engine
export interface M6Budget {
  direct_costs_total: number
  personnel_costs: number
  equipment_costs: number
  supplies_costs: number
  travel_costs: number
  subaward_costs: number
  other_costs: number
  small_business_percent: number
  research_institution_percent: number
  budget_justification: string
}

// M6 Fast Track Phase-specific
export interface M6FastTrack {
  phase1: Partial<M6Budget>
  phase2: Partial<M6Budget>
  phase1_complete: boolean
  phase2_complete: boolean
}

// M7: Regulatory & Supporting (8 fields, conditional)
export interface M7Regulatory {
  human_subjects_involved: boolean
  irb_approval_status: string
  vertebrate_animals_involved: boolean
  iacuc_approval_status: string
  biohazards_involved: boolean
  ibc_approval_status: string
  letters_of_support: string[]
  facilities_description: string
}

// M7 Fast Track Phase II additional fields
export interface M7Phase2Additional {
  commercialization_plan: string
  market_analysis: string
  manufacturing_plan: string
}

// M7 Fast Track Phase-specific
export interface M7FastTrack {
  shared: Partial<M7Regulatory>
  phase2_additional: Partial<M7Phase2Additional>
  shared_complete: boolean
  phase2_complete: boolean
}

// M8: Compilation & Review (6 fields)
export interface M8Compilation {
  final_review_checklist: Record<string, boolean>
  page_limit_compliance: boolean
  format_compliance: boolean
  submission_readiness: boolean
  reviewer_notes: string
  export_timestamp: string
}

// Direct Phase II Feasibility Fields
export interface DirectPhase2Feasibility {
  preliminary_data_summary: string
  proof_of_feasibility_results: string
  technical_feasibility_evidence: string
  risk_reduction_data: string
  rationale_for_skipping_phase1: string
  commercialization_readiness_statement: string
}

// Prior Phase Documentation (for Phase II from Phase I Award)
export interface PriorPhaseData {
  awardNumber: string
  completionDate: string
  fundingSource: string
  findings: string
  phase1_success_documented: boolean
  phase2_success_documented: boolean
}

// Legacy Budget Data (preserved for calculation engine)
export interface BudgetData {
  directCosts: number
  personnelCosts: number
  subawardCosts: number
  smallBusinessPercent: number
  researchInstitutionPercent: number
}

// Complete Project Schema v2
export interface ProjectSchemaV2 {
  schema_version: 2
  project_id: string
  created_at: string
  updated_at: string
  grant_type: GrantType | null
  program_type: ProgramType
  foa_config: FOAConfig
  
  // Module States
  module_states: ModuleState[]
  
  // Module Data
  m1_title_concept: Partial<M1TitleConcept>
  m2_hypothesis: Partial<M2Hypothesis>
  m3_specific_aims: Partial<M3SpecificAims>
  m4_team_mapping: Partial<M4TeamMapping>
  m5_experimental_approach: Partial<M5ExperimentalApproach>
  m6_budget: Partial<M6Budget>
  m7_regulatory: Partial<M7Regulatory>
  m8_compilation: Partial<M8Compilation>
  
  // Fast Track Phase-specific data
  m3_fast_track: M3FastTrack
  m5_fast_track: M5FastTrack
  m6_fast_track: M6FastTrack
  m7_fast_track: M7FastTrack
  
  // Lifecycle-specific
  prior_phase: PriorPhaseData
  direct_phase2_feasibility: Partial<DirectPhase2Feasibility>
  
  // Legacy compatibility
  legacy_budget: BudgetData
  legacy_checklist: Record<string, boolean>
}

// Legacy Schema v1 (for migration)
export interface ProjectSchemaV1 {
  schema_version?: 1
  grantType: GrantType | null
  programType: ProgramType
  priorPhase: PriorPhaseData
  checklist: Record<string, boolean>
  budget: BudgetData
}

// Alias for primary schema
export type GrantData = ProjectSchemaV2

// Validation Types
export interface ValidationError {
  code: string
  message: string
  field: string
  severity?: 'critical' | 'error' | 'warning'
}

export interface ModuleValidationResult {
  module_id: number
  status: ModuleStatus
  missing_fields: string[]
  populated_fields: string[]
  errors: ValidationError[]
}

export interface AIGatingResult {
  allowed: boolean
  blocking_reason?: string
  missing_modules: number[]
  missing_fields: { module_id: number; fields: string[] }[]
}

export interface LifecycleValidationResult {
  valid: boolean
  current_state: string
  target_state: string
  errors: ValidationError[]
  required_documentation: string[]
}

export interface ValidationResult {
  status: 'structurally_ready' | 'not_ready'
  phase: string
  errors: ValidationError[]
  warnings: ValidationError[]
  module_results: ModuleValidationResult[]
  ai_gating: AIGatingResult
  lifecycle_validation: LifecycleValidationResult
  data: ProjectSchemaV2
}

// Module Definitions
export const MODULE_DEFINITIONS: { id: number; name: string; required_fields: string[] }[] = [
  {
    id: 1,
    name: 'Title & Concept Clarity',
    required_fields: ['project_title', 'lay_summary', 'scientific_abstract', 'problem_statement', 'proposed_solution', 'target_population', 'therapeutic_area', 'technology_type']
  },
  {
    id: 2,
    name: 'Hypothesis Development',
    required_fields: ['central_hypothesis', 'supporting_rationale', 'preliminary_data_summary', 'expected_outcomes', 'success_criteria']
  },
  {
    id: 3,
    name: 'Specific Aims',
    required_fields: ['aim1_statement', 'aim1_milestones', 'aim2_statement', 'aim2_milestones', 'timeline_summary', 'interdependencies']
  },
  {
    id: 4,
    name: 'Team Mapping',
    required_fields: ['pi_name', 'pi_qualifications', 'key_personnel']
  },
  {
    id: 5,
    name: 'Experimental Approach',
    required_fields: ['methodology_overview', 'experimental_design', 'data_collection_methods', 'analysis_plan', 'statistical_approach', 'expected_results', 'potential_pitfalls', 'alternative_approaches']
  },
  {
    id: 6,
    name: 'Budget & Justification',
    required_fields: ['direct_costs_total', 'personnel_costs', 'small_business_percent', 'budget_justification']
  },
  {
    id: 7,
    name: 'Regulatory & Supporting',
    required_fields: ['facilities_description'] // Others conditional
  },
  {
    id: 8,
    name: 'Compilation & Review',
    required_fields: ['final_review_checklist', 'page_limit_compliance', 'format_compliance', 'submission_readiness']
  }
]

// Direct Phase II Required Fields
export const DIRECT_PHASE2_REQUIRED_FIELDS = [
  'preliminary_data_summary',
  'proof_of_feasibility_results',
  'technical_feasibility_evidence',
  'risk_reduction_data',
  'rationale_for_skipping_phase1',
  'commercialization_readiness_statement'
]

// Lifecycle Transitions
export const LIFECYCLE_TRANSITIONS: Record<string, { from: string; to: string; requirements: string[] }> = {
  'zero_to_phase1': { from: 'Zero', to: 'Phase I', requirements: [] },
  'zero_to_fast_track': { from: 'Zero', to: 'Fast Track', requirements: ['phase1_section_complete'] },
  'zero_to_direct_phase2': { from: 'Zero', to: 'Direct to Phase II', requirements: DIRECT_PHASE2_REQUIRED_FIELDS },
  'phase1_to_phase2': { from: 'Phase I Award', to: 'Phase II', requirements: ['phase1_success_documented', 'awardNumber', 'completionDate'] },
  'phase2_to_phase2b': { from: 'Phase II Award', to: 'Phase IIB', requirements: ['phase2_success_documented', 'awardNumber', 'completionDate'] }
}
