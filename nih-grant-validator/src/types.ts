// Schema Version
export const CURRENT_SCHEMA_VERSION = 2

export type GrantType = 'Phase I' | 'Phase II' | 'Fast Track' | 'Direct to Phase II' | 'Phase IIB'
export type ProgramType = 'SBIR' | 'STTR'
export type ModuleStatus = 'incomplete' | 'partial' | 'complete'
export type NIHInstitute = 'NCI' | 'NHLBI' | 'NIAID' | 'NIMH' | 'NINDS' | 'NIDDK' | 'NEI' | 'NICHD' | 'NIA' | 'NIGMS' | 'Standard NIH'

// Layer 8: Import dynamic configuration from compliance module
// Budget caps are now managed centrally in complianceConfig.ts
import { 
  INSTITUTE_CONFIGS, 
  getInstituteConfig, 
  getBudgetCapForPhase,
  POLICY_VERSION,
  POLICY_LAST_UPDATED,
  isPolicyExpired,
  getPolicyWarning
} from './compliance/complianceConfig'

// Re-export for backward compatibility
export { 
  INSTITUTE_CONFIGS, 
  getInstituteConfig, 
  getBudgetCapForPhase,
  POLICY_VERSION,
  POLICY_LAST_UPDATED,
  isPolicyExpired,
  getPolicyWarning
}

// Layer 7: Audit Trail Types
export interface ComplianceAuditEntry {
  timestamp: string
  moduleId: number | null
  sectionType: string | null
  action: 'check' | 'revision' | 'export_attempt' | 'export_success' | 'export_blocked'
  complianceScore: number
  agencyAlignmentScore: number
  issues: string[]
  passed: boolean
}

export interface AuditTrail {
  entries: ComplianceAuditEntry[]
  lastComplianceCheck: string | null
  lastSuccessfulExport: string | null
  totalRevisions: number
}

// Layer 5: FOA Parsed Data
export interface FOAParsedData {
  foaNumber: string
  title: string
  extractedAt: string
  pageLimits: Record<string, number>
  requiredAttachments: string[]
  clinicalTrialDesignation: boolean | null
  budgetCapOverride: number | null
  smallBusinessMinOverride: number | null
  researchInstitutionMinOverride: number | null
  reviewCriteria: string[]
  specialRequirements: string[]
  rawText: string
}

// Legacy budget caps interface (for backward compatibility)
export interface InstituteBudgetCaps {
  phase1: number
  phase2: number
  phase2b: number | null
}

// Helper to convert new config to legacy format
export function getInstituteBudgetCaps(institute: NIHInstitute): InstituteBudgetCaps {
  const config = getInstituteConfig(institute)
  return {
    phase1: config.phase1Cap,
    phase2: config.phase2Cap,
    phase2b: config.phase2bCap
  }
}

// Backward-compatible INSTITUTE_BUDGET_CAPS derived from dynamic config
export const INSTITUTE_BUDGET_CAPS: Record<NIHInstitute, InstituteBudgetCaps> = (
  Object.keys(INSTITUTE_CONFIGS) as NIHInstitute[]
).reduce((acc, key) => {
  acc[key] = getInstituteBudgetCaps(key)
  return acc
}, {} as Record<NIHInstitute, InstituteBudgetCaps>)

export const NIH_INSTITUTES: { code: NIHInstitute; name: string }[] = [
  { code: 'NCI', name: 'National Cancer Institute' },
  { code: 'NHLBI', name: 'National Heart, Lung, and Blood Institute' },
  { code: 'NIAID', name: 'National Institute of Allergy and Infectious Diseases' },
  { code: 'NIMH', name: 'National Institute of Mental Health' },
  { code: 'NINDS', name: 'National Institute of Neurological Disorders and Stroke' },
  { code: 'NIDDK', name: 'National Institute of Diabetes and Digestive and Kidney Diseases' },
  { code: 'NEI', name: 'National Eye Institute' },
  { code: 'NICHD', name: 'Eunice Kennedy Shriver National Institute of Child Health and Human Development' },
  { code: 'NIA', name: 'National Institute on Aging' },
  { code: 'NIGMS', name: 'National Institute of General Medical Sciences' },
  { code: 'Standard NIH', name: 'Standard NIH (Default Caps)' }
]

// FOA Configuration (Layer 1 & 5)
export interface FOAConfig {
  direct_phase2_allowed: boolean
  fast_track_allowed: boolean
  phase2b_allowed: boolean
  commercialization_required: boolean
  // Layer 5: Parsed FOA overrides
  parsed_foa?: FOAParsedData
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

// Sub Award Entry (for multiple academic institutions/partners)
export interface SubAward {
  id: string
  institutionName: string
  contactPI: string
  directCosts: number
  faRate: number // F&A rate for this institution
  indirectCosts: number // calculated: directCosts * faRate%
  total: number // directCosts + indirectCosts
}

// Vendor/Contractor Entry
export interface Vendor {
  id: string
  vendorName: string
  description: string
  amount: number
}

// M6: Budget & Justification - Full NIH SBIR/STTR budget calculation fields
export interface M6Budget {
  // Line Items (Direct Costs)
  direct_costs_total: number
  personnel_costs: number
  equipment_costs: number
  supplies_costs: number
  travel_costs: number
  consultant_costs: number
  subaward_costs: number
  patient_care_costs: number
  tuition_costs: number
  other_costs: number
  // Multi-entry Sub Awards and Vendors
  sub_awards: SubAward[]
  vendors: Vendor[]
  // F&A (Indirect) Costs
  f_and_a_rate: number
  indirect_costs: number
  // Calculated Totals
  mtdc: number
  total_project_costs: number
  // Allocation Percentages
  small_business_percent: number
  research_institution_percent: number
  // Justification
  budget_justification: string
  // Fee/Profit
  fee_percent?: number
  fee_amount?: number
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

// M9: Commercialization Director (NIH Required Sections)
export interface M9Section1ValueOutcomes {
  product_service_description: string
  unmet_need: string
  phase2_outcomes: string
  measurable_impact: string
  ai_narrative: string
  ai_approved: boolean
}

export interface M9Section2Company {
  legal_entity_status: string
  management_team: string
  technical_expertise: string
  prior_funding: string
  commercialization_experience: string
  ai_narrative: string
  ai_approved: boolean
}

export interface M9Section3Market {
  paying_customer: string
  end_user: string
  alternatives_exist: string
  switch_reason: string
  market_size_assumptions: string
  tam_sam_som: string
  competitive_matrix: string
  ai_narrative: string
  ai_approved: boolean
}

export interface M9Section4IP {
  patents_filed_issued: string
  licensing_agreements: string
  freedom_to_operate: string
  exclusivity_timeline: string
  ai_narrative: string
  ai_approved: boolean
}

export interface M9Section5Finance {
  total_capital_required: string
  current_funding_secured: string
  investor_commitments: string
  matching_funds_phase2b: string
  burn_rate_runway: string
  ai_narrative: string
  ai_approved: boolean
}

export interface M9Section6Revenue {
  revenue_model: string
  pricing_assumptions: string
  time_to_revenue: string
  break_even_projection: string
  ai_narrative: string
  ai_approved: boolean
}

export interface M9CommercializationPlan {
  section1_value: Partial<M9Section1ValueOutcomes>
  section2_company: Partial<M9Section2Company>
  section3_market: Partial<M9Section3Market>
  section4_ip: Partial<M9Section4IP>
  section5_finance: Partial<M9Section5Finance>
  section6_revenue: Partial<M9Section6Revenue>
  total_word_count: number
  page_count: number
  validation_score: number
  risk_flags: string[]
  section_weaknesses: string[]
}

// Phase I lightweight commercialization discussion
export interface Phase1CommercializationDiscussion {
  commercial_potential: string
  target_market_brief: string
  competitive_advantage: string
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

// Complete Project Schema v2 (Extended for 8-Layer Compliance)
export interface ProjectSchemaV2 {
  // Database ID (optional, set when saved to DB)
  id?: string
  
  schema_version: 2
  project_id: string
  created_at: string
  updated_at: string
  grant_type: GrantType | null
  program_type: ProgramType
  institute: NIHInstitute
  foa_config: FOAConfig
  
  // Layer 1: Clinical Trial Flag (required at project creation)
  clinical_trial_included: boolean
  
  // Layer 5: FOA Number and Parsed Data
  foa_number: string
  
  // Layer 7: Audit Trail
  audit_trail: AuditTrail
  
  // Layer 4 & 8: Last Compliance Audit Results
  last_compliance_score: number | null
  last_agency_alignment_score: number | null
  compliance_export_allowed: boolean
  
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
  m9_commercialization: Partial<M9CommercializationPlan>
  
  // Phase I lightweight commercialization
  phase1_commercialization: Partial<Phase1CommercializationDiscussion>
  
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
  
  // Layer 6: Claim Control - tracked flagged terms
  flagged_claims: {
    term: string
    location: string
    suggested_replacement: string | null
    resolved: boolean
  }[]
  
  // AI Generated Documents storage
  generated_documents?: Record<string, {
    content: string
    generatedAt: string
    wordCount: number
  }>
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
  },
  {
    id: 9,
    name: 'Commercialization Director',
    required_fields: ['section1_value', 'section2_company', 'section3_market', 'section4_ip', 'section5_finance', 'section6_revenue']
  }
]

// NIH Commercialization Section Headings (verbatim, must be preserved)
export const NIH_COMMERCIALIZATION_HEADINGS = [
  '1. Value of the SBIR/STTR Project, Expected Outcomes, and Impact',
  '2. Company',
  '3. Market, Customer, and Competition',
  '4. Intellectual Property Protection',
  '5. Finance Plan',
  '6. Revenue Stream'
]

export const COMMERCIALIZATION_PAGE_LIMITS = {
  section1: { min: 1.5, max: 2, label: 'Value & Outcomes' },
  section2: { min: 1, max: 1.5, label: 'Company' },
  section3: { min: 2, max: 3, label: 'Market & Competition' },
  section4: { min: 1, max: 1, label: 'IP Protection' },
  section5: { min: 2, max: 3, label: 'Finance Plan' },
  section6: { min: 2, max: 2, label: 'Revenue Stream' },
  total: 12
}

export const WORDS_PER_PAGE = 550 // ~500-600 average

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

// Helper Functions

/**
 * Create a default project with initial values
 */
export function createDefaultProject(
  programType: ProgramType = 'SBIR',
  grantType?: GrantType | null
): ProjectSchemaV2 {
  const now = new Date().toISOString()
  return {
    schema_version: 2,
    project_id: crypto.randomUUID(),
    created_at: now,
    updated_at: now,
    grant_type: grantType || null,
    program_type: programType,
    institute: 'Standard NIH',
    foa_config: {
      direct_phase2_allowed: true,
      fast_track_allowed: true,
      phase2b_allowed: false,
      commercialization_required: false
    },
    clinical_trial_included: false,
    foa_number: '',
    audit_trail: {
      entries: [],
      lastComplianceCheck: null,
      lastSuccessfulExport: null,
      totalRevisions: 0
    },
    last_compliance_score: null,
    last_agency_alignment_score: null,
    compliance_export_allowed: false,
    module_states: MODULE_DEFINITIONS.map(def => ({
      module_id: def.id,
      name: def.name,
      required_fields: def.required_fields,
      completed_fields: [],
      status: 'incomplete' as ModuleStatus,
      locked: false,
      last_updated: now
    })),
    m1_title_concept: {},
    m2_hypothesis: {},
    m3_specific_aims: {},
    m4_team_mapping: {},
    m5_experimental_approach: {},
    m6_budget: {},
    m7_regulatory: {},
    m8_compilation: {},
    m9_commercialization: {},
    phase1_commercialization: {},
    m3_fast_track: {
      phase1: {},
      phase2: {},
      phase1_complete: false,
      phase2_complete: false
    },
    m5_fast_track: {
      phase1: {},
      phase2: {},
      phase1_complete: false,
      phase2_complete: false
    },
    m6_fast_track: {
      phase1: {},
      phase2: {},
      phase1_complete: false,
      phase2_complete: false
    },
    m7_fast_track: {
      shared: {},
      phase2_additional: {},
      shared_complete: false,
      phase2_complete: false
    },
    prior_phase: {
      awardNumber: '',
      completionDate: '',
      fundingSource: '',
      findings: '',
      phase1_success_documented: false,
      phase2_success_documented: false
    },
    direct_phase2_feasibility: {},
    legacy_budget: {
      directCosts: 0,
      personnelCosts: 0,
      subawardCosts: 0,
      smallBusinessPercent: 67,
      researchInstitutionPercent: 0
    },
    legacy_checklist: {},
    flagged_claims: [],
    generated_documents: {}
  }
}

/**
 * Update module states based on project data
 */
export function updateModuleStates(project: ProjectSchemaV2): ModuleState[] {
  const now = new Date().toISOString()
  
  const getFieldValue = (moduleData: Record<string, unknown>, field: string): boolean => {
    const value = moduleData[field]
    if (value === undefined || value === null) return false
    if (typeof value === 'string') return value.trim().length > 0
    if (Array.isArray(value)) return value.length > 0
    if (typeof value === 'object') return Object.keys(value).length > 0
    if (typeof value === 'boolean') return value
    if (typeof value === 'number') return value > 0
    return false
  }
  
  const moduleDataMap: Record<number, Record<string, unknown>> = {
    1: project.m1_title_concept as Record<string, unknown>,
    2: project.m2_hypothesis as Record<string, unknown>,
    3: project.m3_specific_aims as Record<string, unknown>,
    4: project.m4_team_mapping as Record<string, unknown>,
    5: project.m5_experimental_approach as Record<string, unknown>,
    6: project.m6_budget as Record<string, unknown>,
    7: project.m7_regulatory as Record<string, unknown>,
    8: project.m8_compilation as Record<string, unknown>,
    9: project.m9_commercialization as Record<string, unknown>
  }
  
  return MODULE_DEFINITIONS.map(def => {
    const moduleData = moduleDataMap[def.id] || {}
    const completedFields = def.required_fields.filter(field => getFieldValue(moduleData, field))
    const totalRequired = def.required_fields.length
    const completedCount = completedFields.length
    
    let status: ModuleStatus = 'incomplete'
    if (completedCount === totalRequired && totalRequired > 0) {
      status = 'complete'
    } else if (completedCount > 0) {
      status = 'partial'
    }
    
    return {
      module_id: def.id,
      name: def.name,
      required_fields: def.required_fields,
      completed_fields: completedFields,
      status,
      locked: false,
      last_updated: now
    }
  })
}
