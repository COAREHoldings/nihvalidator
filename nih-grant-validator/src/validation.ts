import type {
  ProjectSchemaV2, ProjectSchemaV1, ModuleState, ModuleStatus,
  ModuleValidationResult, AIGatingResult, LifecycleValidationResult,
  ValidationError, ValidationResult, GrantType, FOAConfig, NIHInstitute
} from './types'
import { MODULE_DEFINITIONS, DIRECT_PHASE2_REQUIRED_FIELDS, INSTITUTE_BUDGET_CAPS } from './types'

// Generate unique project ID
function generateProjectId(): string {
  return `proj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

// Create initial module states
export function createInitialModuleStates(): ModuleState[] {
  const now = new Date().toISOString()
  return MODULE_DEFINITIONS.map((def, idx) => ({
    module_id: def.id,
    name: def.name,
    required_fields: def.required_fields,
    completed_fields: [],
    status: 'incomplete' as ModuleStatus,
    locked: idx === 7 || idx === 8, // M8 and M9 locked by default
    last_updated: now
  }))
}

// Create new v2 project
export function createNewProject(): ProjectSchemaV2 {
  const now = new Date().toISOString()
  return {
    schema_version: 2,
    project_id: generateProjectId(),
    created_at: now,
    updated_at: now,
    grant_type: null,
    program_type: 'SBIR',
    institute: 'Standard NIH',
    foa_config: {
      direct_phase2_allowed: true,
      fast_track_allowed: true,
      phase2b_allowed: true,
      commercialization_required: true
    },
    module_states: createInitialModuleStates(),
    m1_title_concept: {},
    m2_hypothesis: {},
    m3_specific_aims: {},
    m4_team_mapping: {},
    m5_experimental_approach: {},
    m6_budget: {},
    m7_regulatory: {},
    m8_compilation: {},
    m9_commercialization: {
      section1_value: {},
      section2_company: {},
      section3_market: {},
      section4_ip: {},
      section5_finance: {},
      section6_revenue: {},
      total_word_count: 0,
      page_count: 0,
      validation_score: 0,
      risk_flags: [],
      section_weaknesses: []
    },
    phase1_commercialization: {},
    prior_phase: {
      awardNumber: '',
      completionDate: '',
      fundingSource: '',
      findings: '',
      phase1_success_documented: false,
      phase2_success_documented: false
    },
    direct_phase2_feasibility: {},
    m3_fast_track: { phase1: {}, phase2: {}, phase1_complete: false, phase2_complete: false },
    m5_fast_track: { phase1: {}, phase2: {}, phase1_complete: false, phase2_complete: false },
    m6_fast_track: { phase1: {}, phase2: {}, phase1_complete: false, phase2_complete: false },
    m7_fast_track: { shared: {}, phase2_additional: {}, shared_complete: false, phase2_complete: false },
    legacy_budget: {
      directCosts: 0,
      personnelCosts: 0,
      subawardCosts: 0,
      smallBusinessPercent: 67,
      researchInstitutionPercent: 0
    },
    legacy_checklist: {}
  }
}

// Migrate v1 to v2
export function migrateV1toV2(v1: ProjectSchemaV1): ProjectSchemaV2 {
  const base = createNewProject()
  return {
    ...base,
    grant_type: v1.grantType,
    program_type: v1.programType,
    prior_phase: {
      ...v1.priorPhase,
      phase1_success_documented: !!v1.priorPhase.awardNumber,
      phase2_success_documented: false
    },
    legacy_budget: v1.budget,
    legacy_checklist: v1.checklist,
    // Map legacy checklist to modules
    m6_budget: {
      direct_costs_total: v1.budget.directCosts,
      personnel_costs: v1.budget.personnelCosts,
      subaward_costs: v1.budget.subawardCosts,
      small_business_percent: v1.budget.smallBusinessPercent,
      research_institution_percent: v1.budget.researchInstitutionPercent
    }
  }
}

// Check if field is populated
function isFieldPopulated(value: unknown): boolean {
  if (value === undefined || value === null) return false
  if (typeof value === 'string') return value.trim().length > 0
  if (typeof value === 'number') return true
  if (typeof value === 'boolean') return true
  if (Array.isArray(value)) return value.length > 0
  if (typeof value === 'object') return Object.keys(value).length > 0
  return false
}

// Get module data by ID
function getModuleData(project: ProjectSchemaV2, moduleId: number): Record<string, unknown> {
  switch (moduleId) {
    case 1: return project.m1_title_concept as Record<string, unknown>
    case 2: return project.m2_hypothesis as Record<string, unknown>
    case 3: return project.m3_specific_aims as Record<string, unknown>
    case 4: return project.m4_team_mapping as Record<string, unknown>
    case 5: return project.m5_experimental_approach as Record<string, unknown>
    case 6: return project.m6_budget as Record<string, unknown>
    case 7: return project.m7_regulatory as Record<string, unknown>
    case 8: return project.m8_compilation as Record<string, unknown>
    case 9: return project.m9_commercialization as Record<string, unknown>
    default: return {}
  }
}

// Calculate module status deterministically
export function calculateModuleStatus(project: ProjectSchemaV2, moduleId: number): { status: ModuleStatus; completed: string[]; missing: string[] } {
  const def = MODULE_DEFINITIONS.find(m => m.id === moduleId)
  if (!def) return { status: 'incomplete', completed: [], missing: [] }
  
  const data = getModuleData(project, moduleId)
  const completed: string[] = []
  const missing: string[] = []
  
  for (const field of def.required_fields) {
    if (isFieldPopulated(data[field])) {
      completed.push(field)
    } else {
      missing.push(field)
    }
  }
  
  let status: ModuleStatus
  if (completed.length === 0) {
    status = 'incomplete'
  } else if (missing.length === 0) {
    status = 'complete'
  } else {
    status = 'partial'
  }
  
  return { status, completed, missing }
}

// Update all module states
export function updateModuleStates(project: ProjectSchemaV2): ModuleState[] {
  const now = new Date().toISOString()
  const m1to7Complete = [1, 2, 3, 4, 5, 6, 7].every(id => {
    const { status } = calculateModuleStatus(project, id)
    return status === 'complete'
  })
  
  return MODULE_DEFINITIONS.map(def => {
    const { status, completed, missing } = calculateModuleStatus(project, def.id)
    const locked = def.id === 8 ? !m1to7Complete : false
    
    return {
      module_id: def.id,
      name: def.name,
      required_fields: def.required_fields,
      completed_fields: completed,
      status,
      locked,
      last_updated: now
    }
  })
}

// Validate all modules
export function validateModules(project: ProjectSchemaV2): ModuleValidationResult[] {
  // Module 9 (Commercialization) only required for Phase II, Direct Phase II, Phase IIB, Fast Track
  const commercializationRequired = project.grant_type !== 'Phase I' && project.grant_type !== null
  
  return MODULE_DEFINITIONS.map(def => {
    // Skip Module 9 validation for Phase I grants
    if (def.id === 9 && !commercializationRequired) {
      return {
        module_id: def.id,
        status: 'complete' as ModuleStatus,
        missing_fields: [],
        populated_fields: [],
        errors: []
      }
    }
    
    const { status, completed, missing } = calculateModuleStatus(project, def.id)
    const errors: ValidationError[] = missing.map(field => ({
      code: `MODULE_${def.id}_MISSING`,
      message: `Missing required field: ${field.replace(/_/g, ' ')}`,
      field: `m${def.id}.${field}`,
      severity: 'error'
    }))
    
    return {
      module_id: def.id,
      status,
      missing_fields: missing,
      populated_fields: completed,
      errors
    }
  })
}

// AI Gating Logic
export function checkAIGating(project: ProjectSchemaV2): AIGatingResult {
  const moduleResults = validateModules(project)
  const incompleteModules = moduleResults.filter(m => m.module_id <= 7 && m.status !== 'complete')
  
  if (incompleteModules.length === 0) {
    return { allowed: true, missing_modules: [], missing_fields: [] }
  }
  
  return {
    allowed: false,
    blocking_reason: `AI refinement requires Modules 1-7 to be complete. ${incompleteModules.length} module(s) incomplete.`,
    missing_modules: incompleteModules.map(m => m.module_id),
    missing_fields: incompleteModules.map(m => ({
      module_id: m.module_id,
      fields: m.missing_fields
    }))
  }
}

// Lifecycle Validation
export function validateLifecycle(project: ProjectSchemaV2): LifecycleValidationResult {
  const errors: ValidationError[] = []
  const required: string[] = []
  let valid = true
  
  const grantType = project.grant_type
  if (!grantType) {
    return { valid: false, current_state: 'Unknown', target_state: 'Unknown', errors: [{ code: 'LIFECYCLE_000', message: 'Grant type not selected', field: 'grant_type' }], required_documentation: [] }
  }
  
  // Determine current state and validate transition
  switch (grantType) {
    case 'Phase I':
      // Zero -> Phase I: No requirements
      break
      
    case 'Fast Track':
      // Zero -> Fast Track: Phase I section must be conceptually complete
      // Phase II section locked until Phase I section complete in the same application
      break
      
    case 'Direct to Phase II':
      // Requires feasibility evidence, NOT a prior award
      const feasibility = project.direct_phase2_feasibility
      for (const field of DIRECT_PHASE2_REQUIRED_FIELDS) {
        if (!isFieldPopulated((feasibility as Record<string, unknown>)?.[field])) {
          valid = false
          required.push(field)
          errors.push({
            code: 'LIFECYCLE_D2P_MISSING',
            message: `Direct to Phase II requires: ${field.replace(/_/g, ' ')}`,
            field: `direct_phase2_feasibility.${field}`,
            severity: 'critical'
          })
        }
      }
      break
      
    case 'Phase II':
      // Requires documented Phase I success (prior award)
      if (!project.prior_phase.phase1_success_documented) {
        valid = false
        errors.push({ code: 'LIFECYCLE_002', message: 'Phase II requires documented Phase I success', field: 'prior_phase.phase1_success_documented', severity: 'critical' })
        required.push('phase1_success_documented')
      }
      if (!project.prior_phase.awardNumber) {
        valid = false
        errors.push({ code: 'LIFECYCLE_002', message: 'Phase II requires Phase I award number', field: 'prior_phase.awardNumber', severity: 'critical' })
        required.push('awardNumber')
      }
      if (!project.prior_phase.completionDate) {
        valid = false
        errors.push({ code: 'LIFECYCLE_002', message: 'Phase II requires Phase I completion date', field: 'prior_phase.completionDate', severity: 'critical' })
        required.push('completionDate')
      }
      break
      
    case 'Phase IIB':
      // Requires documented Phase II success
      if (!project.prior_phase.phase2_success_documented) {
        valid = false
        errors.push({ code: 'LIFECYCLE_003', message: 'Phase IIB requires documented Phase II success', field: 'prior_phase.phase2_success_documented', severity: 'critical' })
        required.push('phase2_success_documented')
      }
      if (!project.prior_phase.awardNumber) {
        valid = false
        errors.push({ code: 'LIFECYCLE_003', message: 'Phase IIB requires Phase II award number', field: 'prior_phase.awardNumber', severity: 'critical' })
        required.push('awardNumber')
      }
      break
  }
  
  return {
    valid,
    current_state: 'Zero',
    target_state: grantType,
    errors,
    required_documentation: required
  }
}

// Get budget cap for institute and grant type
export function getBudgetCap(institute: NIHInstitute, grantType: GrantType | null, phase?: 'phase1' | 'phase2'): number {
  const caps = INSTITUTE_BUDGET_CAPS[institute] || INSTITUTE_BUDGET_CAPS['Standard NIH']
  
  if (grantType === 'Phase I') return caps.phase1
  if (grantType === 'Phase II' || grantType === 'Direct to Phase II') return caps.phase2
  if (grantType === 'Phase IIB') return caps.phase2b || caps.phase2
  if (grantType === 'Fast Track') {
    if (phase === 'phase1') return caps.phase1
    if (phase === 'phase2') return caps.phase2
    return caps.phase1 + caps.phase2
  }
  return caps.phase1
}

// Budget Validation (DO NOT MODIFY calculation engine)
export function validateBudget(project: ProjectSchemaV2): ValidationError[] {
  const errors: ValidationError[] = []
  const budget = project.legacy_budget
  const grantType = project.grant_type
  const institute = project.institute || 'Standard NIH'
  
  const budgetCap = getBudgetCap(institute, grantType)
  
  if (budget.directCosts > budgetCap) {
    errors.push({ code: 'BUDGET_001', message: `Direct costs exceed ${institute} ${grantType} cap of $${budgetCap.toLocaleString()}`, field: 'budget.directCosts' })
  }
  
  const fastTrackCap = getBudgetCap(institute, 'Fast Track')
  if (grantType === 'Fast Track' && budget.directCosts > fastTrackCap) {
    errors.push({ code: 'BUDGET_001', message: `Fast Track combined budget exceeds ${institute} limit of $${fastTrackCap.toLocaleString()}`, field: 'budget.directCosts' })
  }
  
  if (project.program_type === 'SBIR') {
    const minPercent = (grantType === 'Phase I' || grantType === 'Fast Track') ? 67 : 50
    if (budget.smallBusinessPercent < minPercent) {
      errors.push({ code: 'BUDGET_002', message: `SBIR ${grantType} requires minimum ${minPercent}% small business effort`, field: 'budget.smallBusinessPercent' })
    }
  }
  
  if (project.program_type === 'STTR') {
    if (budget.smallBusinessPercent < 40) {
      errors.push({ code: 'BUDGET_002', message: 'STTR requires minimum 40% small business effort', field: 'budget.smallBusinessPercent' })
    }
    if (budget.researchInstitutionPercent < 30) {
      errors.push({ code: 'BUDGET_002', message: 'STTR requires minimum 30% research institution effort', field: 'budget.researchInstitutionPercent' })
    }
  }
  
  const calculatedTotal = budget.personnelCosts + budget.subawardCosts
  if (calculatedTotal > budget.directCosts) {
    errors.push({ code: 'BUDGET_003', message: 'Personnel + Subaward costs exceed total direct costs', field: 'budget' })
  }
  
  return errors
}

// Full Validation
export function runFullValidation(project: ProjectSchemaV2): ValidationResult {
  const moduleResults = validateModules(project)
  const aiGating = checkAIGating(project)
  const lifecycleValidation = validateLifecycle(project)
  const budgetErrors = validateBudget(project)
  
  const allErrors: ValidationError[] = [
    ...lifecycleValidation.errors,
    ...budgetErrors,
    ...moduleResults.flatMap(m => m.errors)
  ]
  
  const warnings: ValidationError[] = []
  const budget = project.legacy_budget
  const grantType = project.grant_type
  const institute = project.institute || 'Standard NIH'
  const budgetCap = getBudgetCap(institute, grantType)
  
  if (budget.directCosts > budgetCap * 0.95 && budget.directCosts <= budgetCap) {
    warnings.push({ code: 'BUDGET_WARN', message: `Budget is within 5% of ${institute} cap`, field: 'budget.directCosts' })
  }
  
  const criticalErrors = allErrors.filter(e => e.severity === 'critical' || !e.severity)
  const status = criticalErrors.length === 0 ? 'structurally_ready' : 'not_ready'
  
  return {
    status,
    phase: grantType || 'Unknown',
    errors: allErrors,
    warnings,
    module_results: moduleResults,
    ai_gating: aiGating,
    lifecycle_validation: lifecycleValidation,
    data: project
  }
}

// Check if grant type is allowed by FOA
export function isGrantTypeAllowed(grantType: GrantType, foa: FOAConfig): boolean {
  switch (grantType) {
    case 'Direct to Phase II': return foa.direct_phase2_allowed
    case 'Fast Track': return foa.fast_track_allowed
    case 'Phase IIB': return foa.phase2b_allowed
    default: return true
  }
}
