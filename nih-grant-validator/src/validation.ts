import type {
  ProjectSchemaV2, ProjectSchemaV1, ModuleState, ModuleStatus,
  ModuleValidationResult, AIGatingResult, LifecycleValidationResult,
  ValidationError, ValidationResult, GrantType, FOAConfig, NIHInstitute,
  AuditTrail, ComplianceAuditEntry
} from './types'
import { 
  MODULE_DEFINITIONS, 
  DIRECT_PHASE2_REQUIRED_FIELDS, 
  getInstituteConfig,
  getBudgetCapForPhase,
  isPolicyExpired,
  getPolicyWarning
} from './types'
import { runComplianceAudit, type ComplianceAuditResult } from './compliance/complianceAudit'

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

// Create new v2 project with Layer 1 mechanism configuration
export interface ProjectCreationConfig {
  programType: 'SBIR' | 'STTR'
  grantType: GrantType
  institute: NIHInstitute
  clinicalTrialIncluded: boolean
  foaNumber?: string
}

// Create initial audit trail
function createInitialAuditTrail(): AuditTrail {
  return {
    entries: [],
    lastComplianceCheck: null,
    lastSuccessfulExport: null,
    totalRevisions: 0
  }
}

// Create new v2 project (default - for backward compatibility)
export function createNewProject(): ProjectSchemaV2 {
  return createNewProjectWithConfig({
    programType: 'SBIR',
    grantType: 'Phase I',
    institute: 'Standard NIH',
    clinicalTrialIncluded: false
  })
}

// Layer 1: Create new project with mandatory mechanism configuration
export function createNewProjectWithConfig(config: ProjectCreationConfig): ProjectSchemaV2 {
  const now = new Date().toISOString()
  const instituteConfig = getInstituteConfig(config.institute)
  
  // Layer 1: Validate clinical trial compatibility with institute
  if (config.clinicalTrialIncluded && !instituteConfig.clinicalTrialAllowed) {
    console.warn(`Warning: Clinical trials not typically allowed for ${config.institute}. Proceeding but review may be impacted.`)
  }
  
  return {
    schema_version: 2,
    project_id: generateProjectId(),
    created_at: now,
    updated_at: now,
    grant_type: config.grantType,
    program_type: config.programType,
    institute: config.institute,
    foa_config: {
      direct_phase2_allowed: true,
      fast_track_allowed: true,
      phase2b_allowed: instituteConfig.phase2bCap !== null,
      commercialization_required: config.grantType !== 'Phase I'
    },
    
    // Layer 1: Clinical trial flag
    clinical_trial_included: config.clinicalTrialIncluded,
    
    // Layer 5: FOA tracking
    foa_number: config.foaNumber || '',
    
    // Layer 7: Audit trail
    audit_trail: createInitialAuditTrail(),
    
    // Layer 4 & 8: Compliance scores
    last_compliance_score: null,
    last_agency_alignment_score: null,
    compliance_export_allowed: false,
    
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
      smallBusinessPercent: config.programType === 'SBIR' ? 67 : 40,
      researchInstitutionPercent: config.programType === 'STTR' ? 30 : 0
    },
    legacy_checklist: {},
    
    // Layer 6: Claim control
    flagged_claims: []
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

// Get module data by ID - handles Fast Track phase-specific data
function getModuleData(project: ProjectSchemaV2, moduleId: number): Record<string, unknown> {
  const isFastTrack = project.grant_type === 'Fast Track'
  
  switch (moduleId) {
    case 1: return project.m1_title_concept as Record<string, unknown>
    case 2: return project.m2_hypothesis as Record<string, unknown>
    case 3: 
      if (isFastTrack) {
        // Merge phase1 and phase2 data for Fast Track validation
        const phase1Aims = project.m3_fast_track.phase1?.aims || []
        const phase2Aims = project.m3_fast_track.phase2?.aims || []
        // For validation: check if there are enough aims with content
        const hasValidAims = phase1Aims.some(a => a.statement?.trim()) || phase2Aims.some(a => a.statement?.trim())
        return {
          aims: hasValidAims ? [...phase1Aims, ...phase2Aims] : project.m3_specific_aims?.aims,
          timeline_summary: project.m3_fast_track.phase1?.timeline_summary || project.m3_fast_track.phase2?.timeline_summary || project.m3_specific_aims?.timeline_summary,
          interdependencies: project.m3_fast_track.phase1?.interdependencies || project.m3_fast_track.phase2?.interdependencies || project.m3_specific_aims?.interdependencies
        } as Record<string, unknown>
      }
      return project.m3_specific_aims as Record<string, unknown>
    case 4: return project.m4_team_mapping as Record<string, unknown>
    case 5: 
      if (isFastTrack) {
        return {
          ...project.m5_fast_track.phase1,
          ...project.m5_fast_track.phase2,
          methodology_overview: project.m5_fast_track.phase1?.methodology_overview || project.m5_experimental_approach?.methodology_overview,
          experimental_design: project.m5_fast_track.phase1?.experimental_design || project.m5_experimental_approach?.experimental_design,
          data_collection_methods: project.m5_fast_track.phase1?.data_collection_methods || project.m5_experimental_approach?.data_collection_methods,
          analysis_plan: project.m5_fast_track.phase1?.analysis_plan || project.m5_experimental_approach?.analysis_plan,
          statistical_approach: project.m5_fast_track.phase1?.statistical_approach || project.m5_experimental_approach?.statistical_approach,
          expected_results: project.m5_fast_track.phase1?.expected_results || project.m5_experimental_approach?.expected_results,
          potential_pitfalls: project.m5_fast_track.phase1?.potential_pitfalls || project.m5_experimental_approach?.potential_pitfalls,
          alternative_approaches: project.m5_fast_track.phase1?.alternative_approaches || project.m5_experimental_approach?.alternative_approaches
        } as Record<string, unknown>
      }
      return project.m5_experimental_approach as Record<string, unknown>
    case 6: 
      if (isFastTrack) {
        return {
          ...project.m6_fast_track.phase1,
          ...project.m6_fast_track.phase2,
          direct_costs_total: project.m6_fast_track.phase1?.direct_costs_total || project.m6_budget?.direct_costs_total,
          personnel_costs: project.m6_fast_track.phase1?.personnel_costs || project.m6_budget?.personnel_costs,
          small_business_percent: project.m6_fast_track.phase1?.small_business_percent || project.m6_budget?.small_business_percent,
          budget_justification: project.m6_fast_track.phase1?.budget_justification || project.m6_budget?.budget_justification
        } as Record<string, unknown>
      }
      return project.m6_budget as Record<string, unknown>
    case 7: 
      if (isFastTrack) {
        return {
          ...project.m7_fast_track.shared,
          ...project.m7_fast_track.phase2_additional,
          facilities_description: project.m7_fast_track.shared?.facilities_description || project.m7_regulatory?.facilities_description
        } as Record<string, unknown>
      }
      return project.m7_regulatory as Record<string, unknown>
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

// AI Gating Logic - Removed restrictions, always allowed
export function checkAIGating(project: ProjectSchemaV2): AIGatingResult {
  // Gate removed - AI features always available
  return { allowed: true, missing_modules: [], missing_fields: [] }
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

// Layer 8: Get budget cap for institute and grant type using dynamic configuration
export function getBudgetCap(institute: NIHInstitute, grantType: GrantType | null, phase?: 'phase1' | 'phase2'): number {
  // Use centralized configuration
  const config = getInstituteConfig(institute)
  
  if (grantType === 'Phase I') return config.phase1Cap
  if (grantType === 'Phase II' || grantType === 'Direct to Phase II') return config.phase2Cap
  if (grantType === 'Phase IIB') return config.phase2bCap || config.phase2Cap
  if (grantType === 'Fast Track') {
    if (phase === 'phase1') return config.phase1Cap
    if (phase === 'phase2') return config.phase2Cap
    return config.phase1Cap + config.phase2Cap
  }
  return config.phase1Cap
}

// Layer 8: Get allocation requirements using dynamic configuration
export function getAllocationRequirements(
  institute: NIHInstitute, 
  programType: 'SBIR' | 'STTR', 
  grantType: GrantType | null
): { smallBusinessMin: number; researchInstitutionMin: number } {
  const config = getInstituteConfig(institute)
  
  if (programType === 'SBIR') {
    const min = grantType === 'Phase I' || grantType === 'Fast Track' 
      ? config.sbir.phase1SmallBusinessMin 
      : config.sbir.phase2SmallBusinessMin
    return { smallBusinessMin: min, researchInstitutionMin: 0 }
  } else {
    return {
      smallBusinessMin: config.sttr.smallBusinessMin,
      researchInstitutionMin: config.sttr.researchInstitutionMin
    }
  }
}

// Budget Validation using Layer 8 dynamic configuration (DO NOT MODIFY calculation engine)
export function validateBudget(project: ProjectSchemaV2): ValidationError[] {
  const errors: ValidationError[] = []
  const budget = project.legacy_budget
  const grantType = project.grant_type
  const institute = project.institute || 'Standard NIH'
  const programType = project.program_type
  
  // Layer 8: Use dynamic configuration for budget cap
  const budgetCap = getBudgetCap(institute, grantType)
  const allocReqs = getAllocationRequirements(institute, programType, grantType)
  
  // Layer 8: Check for policy expiration warning
  const policyWarning = getPolicyWarning()
  if (policyWarning) {
    errors.push({ 
      code: 'POLICY_WARN', 
      message: policyWarning, 
      field: 'policy',
      severity: 'warning'
    })
  }
  
  if (budget.directCosts > budgetCap) {
    errors.push({ 
      code: 'BUDGET_001', 
      message: `Direct costs exceed ${institute} ${grantType} cap of $${budgetCap.toLocaleString()}`, 
      field: 'budget.directCosts',
      severity: 'critical'
    })
  }
  
  const fastTrackCap = getBudgetCap(institute, 'Fast Track')
  if (grantType === 'Fast Track' && budget.directCosts > fastTrackCap) {
    errors.push({ 
      code: 'BUDGET_001', 
      message: `Fast Track combined budget exceeds ${institute} limit of $${fastTrackCap.toLocaleString()}`, 
      field: 'budget.directCosts',
      severity: 'critical'
    })
  }
  
  // Layer 8: Use dynamic allocation requirements
  if (programType === 'SBIR') {
    if (budget.smallBusinessPercent < allocReqs.smallBusinessMin) {
      errors.push({ 
        code: 'BUDGET_002', 
        message: `SBIR ${grantType} requires minimum ${allocReqs.smallBusinessMin}% small business effort`, 
        field: 'budget.smallBusinessPercent',
        severity: 'critical'
      })
    }
  }
  
  if (programType === 'STTR') {
    if (budget.smallBusinessPercent < allocReqs.smallBusinessMin) {
      errors.push({ 
        code: 'BUDGET_002', 
        message: `STTR requires minimum ${allocReqs.smallBusinessMin}% small business effort`, 
        field: 'budget.smallBusinessPercent',
        severity: 'critical'
      })
    }
    if (budget.researchInstitutionPercent < allocReqs.researchInstitutionMin) {
      errors.push({ 
        code: 'BUDGET_002', 
        message: `STTR requires minimum ${allocReqs.researchInstitutionMin}% research institution effort`, 
        field: 'budget.researchInstitutionPercent',
        severity: 'critical'
      })
    }
  }
  
  const calculatedTotal = budget.personnelCosts + budget.subawardCosts
  if (calculatedTotal > budget.directCosts) {
    errors.push({ 
      code: 'BUDGET_003', 
      message: 'Personnel + Subaward costs exceed total direct costs', 
      field: 'budget',
      severity: 'error'
    })
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

// Layer 7: Add audit trail entry
export function addAuditEntry(
  project: ProjectSchemaV2,
  entry: Omit<ComplianceAuditEntry, 'timestamp'>
): ProjectSchemaV2 {
  const newEntry: ComplianceAuditEntry = {
    ...entry,
    timestamp: new Date().toISOString()
  }
  
  return {
    ...project,
    audit_trail: {
      ...project.audit_trail,
      entries: [...project.audit_trail.entries, newEntry],
      lastComplianceCheck: entry.action === 'check' ? newEntry.timestamp : project.audit_trail.lastComplianceCheck,
      lastSuccessfulExport: entry.action === 'export_success' ? newEntry.timestamp : project.audit_trail.lastSuccessfulExport,
      totalRevisions: entry.action === 'revision' ? project.audit_trail.totalRevisions + 1 : project.audit_trail.totalRevisions
    },
    last_compliance_score: entry.complianceScore,
    last_agency_alignment_score: entry.agencyAlignmentScore,
    compliance_export_allowed: entry.passed
  }
}

// Layer 4: Run full compliance audit on project content
export function runProjectComplianceAudit(
  project: ProjectSchemaV2,
  fullContent: string,
  sectionTypes: string[] = []
): { result: ComplianceAuditResult; updatedProject: ProjectSchemaV2 } {
  const result = runComplianceAudit(
    fullContent,
    {
      institute: project.institute,
      grantType: project.grant_type || 'Phase I',
      programType: project.program_type,
      directCosts: project.legacy_budget.directCosts,
      smallBusinessPercent: project.legacy_budget.smallBusinessPercent,
      researchInstitutionPercent: project.legacy_budget.researchInstitutionPercent,
      clinicalTrialIncluded: project.clinical_trial_included,
      foaNumber: project.foa_number || undefined,
      foaOverrides: project.foa_config.parsed_foa ? {
        budgetCap: project.foa_config.parsed_foa.budgetCapOverride || undefined,
        smallBusinessMin: project.foa_config.parsed_foa.smallBusinessMinOverride || undefined,
        researchInstitutionMin: project.foa_config.parsed_foa.researchInstitutionMinOverride || undefined,
        clinicalTrialAllowed: project.foa_config.parsed_foa.clinicalTrialDesignation || undefined
      } : undefined
    },
    sectionTypes
  )
  
  const updatedProject = addAuditEntry(project, {
    moduleId: null,
    sectionType: sectionTypes.length > 0 ? sectionTypes.join(', ') : 'full_audit',
    action: 'check',
    complianceScore: result.complianceScore.total,
    agencyAlignmentScore: result.agencyAlignmentScore.total,
    issues: result.issues.map(i => i.message),
    passed: result.passed
  })
  
  return { result, updatedProject }
}

// Layer 4: Check if export is allowed
export function canExportProject(project: ProjectSchemaV2): { 
  allowed: boolean
  reason: string | null
  complianceScore: number | null
  agencyAlignmentScore: number | null
} {
  if (project.last_compliance_score === null || project.last_agency_alignment_score === null) {
    return {
      allowed: false,
      reason: 'Compliance audit has not been run. Please run a compliance audit before exporting.',
      complianceScore: null,
      agencyAlignmentScore: null
    }
  }
  
  if (project.last_compliance_score < 90) {
    return {
      allowed: false,
      reason: `Compliance score (${project.last_compliance_score}) is below the required threshold of 90.`,
      complianceScore: project.last_compliance_score,
      agencyAlignmentScore: project.last_agency_alignment_score
    }
  }
  
  if (project.last_agency_alignment_score < 100) {
    return {
      allowed: false,
      reason: `Agency alignment score (${project.last_agency_alignment_score}) must be 100 for export.`,
      complianceScore: project.last_compliance_score,
      agencyAlignmentScore: project.last_agency_alignment_score
    }
  }
  
  return {
    allowed: true,
    reason: null,
    complianceScore: project.last_compliance_score,
    agencyAlignmentScore: project.last_agency_alignment_score
  }
}

// Layer 1: Validate mechanism configuration at project creation
export function validateMechanismConfiguration(config: ProjectCreationConfig): ValidationError[] {
  const errors: ValidationError[] = []
  const instituteConfig = getInstituteConfig(config.institute)
  
  // Check if Phase IIB is supported by institute
  if (config.grantType === 'Phase IIB' && instituteConfig.phase2bCap === null) {
    errors.push({
      code: 'MECHANISM_001',
      message: `${config.institute} does not support Phase IIB grants`,
      field: 'grantType',
      severity: 'critical'
    })
  }
  
  // Check clinical trial compatibility
  if (config.clinicalTrialIncluded && !instituteConfig.clinicalTrialAllowed) {
    errors.push({
      code: 'MECHANISM_002',
      message: `${config.institute} typically does not support clinical trials`,
      field: 'clinicalTrialIncluded',
      severity: 'warning'
    })
  }
  
  return errors
}
