// Layer 1 & Layer 8: Mechanism Configuration and Dynamic Agency Alignment
// Policy version control with annual update warning

export const POLICY_VERSION = '2026.1'
export const POLICY_LAST_UPDATED = '2026-01-15'
export const POLICY_EXPIRY_MONTHS = 12

// NIH Institutes with dynamic budget caps (Layer 8 - no hardcoded values)
export interface InstituteConfig {
  code: string
  name: string
  phase1Cap: number
  phase2Cap: number
  phase2bCap: number | null
  sbir: {
    phase1SmallBusinessMin: number
    phase2SmallBusinessMin: number
  }
  sttr: {
    smallBusinessMin: number
    researchInstitutionMin: number
  }
  clinicalTrialAllowed: boolean
  specialNotes?: string
}

export const INSTITUTE_CONFIGS: Record<string, InstituteConfig> = {
  'NCI': {
    code: 'NCI',
    name: 'National Cancer Institute',
    phase1Cap: 400000,
    phase2Cap: 2000000,
    phase2bCap: 4500000,
    sbir: { phase1SmallBusinessMin: 67, phase2SmallBusinessMin: 50 },
    sttr: { smallBusinessMin: 40, researchInstitutionMin: 30 },
    clinicalTrialAllowed: true,
    specialNotes: 'NCI has higher budget caps than standard NIH'
  },
  'NHLBI': {
    code: 'NHLBI',
    name: 'National Heart, Lung, and Blood Institute',
    phase1Cap: 275000,
    phase2Cap: 1750000,
    phase2bCap: null,
    sbir: { phase1SmallBusinessMin: 67, phase2SmallBusinessMin: 50 },
    sttr: { smallBusinessMin: 40, researchInstitutionMin: 30 },
    clinicalTrialAllowed: true
  },
  'NIAID': {
    code: 'NIAID',
    name: 'National Institute of Allergy and Infectious Diseases',
    phase1Cap: 275000,
    phase2Cap: 1750000,
    phase2bCap: null,
    sbir: { phase1SmallBusinessMin: 67, phase2SmallBusinessMin: 50 },
    sttr: { smallBusinessMin: 40, researchInstitutionMin: 30 },
    clinicalTrialAllowed: true
  },
  'NIMH': {
    code: 'NIMH',
    name: 'National Institute of Mental Health',
    phase1Cap: 275000,
    phase2Cap: 1750000,
    phase2bCap: null,
    sbir: { phase1SmallBusinessMin: 67, phase2SmallBusinessMin: 50 },
    sttr: { smallBusinessMin: 40, researchInstitutionMin: 30 },
    clinicalTrialAllowed: true
  },
  'NINDS': {
    code: 'NINDS',
    name: 'National Institute of Neurological Disorders and Stroke',
    phase1Cap: 275000,
    phase2Cap: 1750000,
    phase2bCap: null,
    sbir: { phase1SmallBusinessMin: 67, phase2SmallBusinessMin: 50 },
    sttr: { smallBusinessMin: 40, researchInstitutionMin: 30 },
    clinicalTrialAllowed: true
  },
  'NIDDK': {
    code: 'NIDDK',
    name: 'National Institute of Diabetes and Digestive and Kidney Diseases',
    phase1Cap: 275000,
    phase2Cap: 1750000,
    phase2bCap: null,
    sbir: { phase1SmallBusinessMin: 67, phase2SmallBusinessMin: 50 },
    sttr: { smallBusinessMin: 40, researchInstitutionMin: 30 },
    clinicalTrialAllowed: true
  },
  'NEI': {
    code: 'NEI',
    name: 'National Eye Institute',
    phase1Cap: 275000,
    phase2Cap: 1750000,
    phase2bCap: null,
    sbir: { phase1SmallBusinessMin: 67, phase2SmallBusinessMin: 50 },
    sttr: { smallBusinessMin: 40, researchInstitutionMin: 30 },
    clinicalTrialAllowed: true
  },
  'NICHD': {
    code: 'NICHD',
    name: 'Eunice Kennedy Shriver National Institute of Child Health and Human Development',
    phase1Cap: 275000,
    phase2Cap: 1750000,
    phase2bCap: null,
    sbir: { phase1SmallBusinessMin: 67, phase2SmallBusinessMin: 50 },
    sttr: { smallBusinessMin: 40, researchInstitutionMin: 30 },
    clinicalTrialAllowed: true
  },
  'NIA': {
    code: 'NIA',
    name: 'National Institute on Aging',
    phase1Cap: 275000,
    phase2Cap: 1750000,
    phase2bCap: null,
    sbir: { phase1SmallBusinessMin: 67, phase2SmallBusinessMin: 50 },
    sttr: { smallBusinessMin: 40, researchInstitutionMin: 30 },
    clinicalTrialAllowed: true
  },
  'NIGMS': {
    code: 'NIGMS',
    name: 'National Institute of General Medical Sciences',
    phase1Cap: 275000,
    phase2Cap: 1750000,
    phase2bCap: null,
    sbir: { phase1SmallBusinessMin: 67, phase2SmallBusinessMin: 50 },
    sttr: { smallBusinessMin: 40, researchInstitutionMin: 30 },
    clinicalTrialAllowed: false
  },
  'Standard NIH': {
    code: 'Standard NIH',
    name: 'Standard NIH (Default Caps)',
    phase1Cap: 275000,
    phase2Cap: 1750000,
    phase2bCap: null,
    sbir: { phase1SmallBusinessMin: 67, phase2SmallBusinessMin: 50 },
    sttr: { smallBusinessMin: 40, researchInstitutionMin: 30 },
    clinicalTrialAllowed: true
  }
}

// Layer 1: Phase-specific constraints
export interface PhaseConstraints {
  budgetCapKey: 'phase1Cap' | 'phase2Cap' | 'phase2bCap'
  focusDescription: string
  requiredElements: string[]
  commercializationPlanRequired: boolean
  commercializationPlanPages?: number
  goNoGoRequired: boolean
}

export const PHASE_CONSTRAINTS: Record<string, PhaseConstraints> = {
  'Phase I': {
    budgetCapKey: 'phase1Cap',
    focusDescription: 'Feasibility study - establish proof of concept',
    requiredElements: [
      'quantitative_milestones',
      'go_no_go_criteria',
      'feasibility_endpoints'
    ],
    commercializationPlanRequired: false,
    goNoGoRequired: true
  },
  'Phase II': {
    budgetCapKey: 'phase2Cap',
    focusDescription: 'Full R&D - product development and validation',
    requiredElements: [
      'commercialization_plan',
      'manufacturing_plan',
      'regulatory_pathway',
      'revenue_forecast'
    ],
    commercializationPlanRequired: true,
    commercializationPlanPages: 12,
    goNoGoRequired: false
  },
  'Fast Track': {
    budgetCapKey: 'phase1Cap', // Uses both caps
    focusDescription: 'Combined Phase I & II application',
    requiredElements: [
      'phase1_go_no_go_criteria',
      'phase2_commercialization_plan',
      'transition_milestones'
    ],
    commercializationPlanRequired: true,
    commercializationPlanPages: 12,
    goNoGoRequired: true
  },
  'Direct to Phase II': {
    budgetCapKey: 'phase2Cap',
    focusDescription: 'Skip Phase I with demonstrated feasibility',
    requiredElements: [
      'feasibility_evidence',
      'prior_data_summary',
      'commercialization_plan',
      'manufacturing_plan',
      'regulatory_pathway'
    ],
    commercializationPlanRequired: true,
    commercializationPlanPages: 12,
    goNoGoRequired: false
  },
  'Phase IIB': {
    budgetCapKey: 'phase2bCap',
    focusDescription: 'Continuation from Phase II success',
    requiredElements: [
      'prior_phase2_results',
      'commercialization_plan',
      'manufacturing_scale_up',
      'regulatory_progress'
    ],
    commercializationPlanRequired: true,
    commercializationPlanPages: 12,
    goNoGoRequired: false
  }
}

// Layer 6: Promotional language terms to flag
export const PROMOTIONAL_TERMS = [
  'revolutionary',
  'groundbreaking',
  'game-changing',
  'cure',
  'guaranteed',
  'breakthrough',
  'transformative',
  'unprecedented',
  'paradigm-shifting',
  'cutting-edge',
  'best-in-class',
  'world-class',
  'unique',
  'first-ever',
  'only solution',
  'miracle',
  'proven cure',
  'guaranteed success',
  '100% effective',
  'no side effects'
]

// Layer 3: Section-specific validation requirements
export interface SectionValidationRules {
  requiredElements: string[]
  description: string
}

export const SECTION_VALIDATION_RULES: Record<string, SectionValidationRules> = {
  'specific_aims': {
    requiredElements: [
      'explicit_hypothesis',
      'defined_endpoints',
      'quantitative_success_thresholds',
      'statistical_method',
      'biological_replicates',
      'go_no_go_criteria'
    ],
    description: 'Specific Aims must include testable hypothesis, measurable endpoints, and Go/No-Go criteria'
  },
  'rigor_reproducibility': {
    requiredElements: [
      'biological_replicates',
      'statistical_test_specified',
      'power_calculation_80_percent',
      'significance_threshold_alpha',
      'cell_line_authentication',
      'mycoplasma_testing',
      'randomization_statement',
      'blinding_statement'
    ],
    description: 'Rigor section must include statistical power, replicates, and authentication statements'
  },
  'vertebrate_animals': {
    requiredElements: [
      'description_of_procedures',
      'justification_species_numbers',
      'minimization_pain_distress',
      'euthanasia_method',
      'statistical_justification_group_size'
    ],
    description: 'Must include all 5 NIH-required points for vertebrate animal research'
  },
  'human_subjects': {
    requiredElements: [
      'classification_human_subjects',
      'irb_status',
      'risk_level',
      'de_identification_explanation'
    ],
    description: 'Human subjects section must address classification, IRB, risk, and data protection'
  },
  'commercialization_plan': {
    requiredElements: [
      'company_overview',
      'market_size_tam_sam',
      'competitive_landscape',
      'ip_position',
      'freedom_to_operate',
      'regulatory_pathway',
      'manufacturing_plan',
      'revenue_model_5year',
      'reimbursement_strategy',
      'exit_strategy'
    ],
    description: 'Phase II commercialization plan requires all 10 standard elements'
  }
}

// Helper functions
export function getInstituteConfig(instituteCode: string): InstituteConfig {
  return INSTITUTE_CONFIGS[instituteCode] || INSTITUTE_CONFIGS['Standard NIH']
}

export function getBudgetCapForPhase(instituteCode: string, phase: string): number {
  const config = getInstituteConfig(instituteCode)
  const constraints = PHASE_CONSTRAINTS[phase]
  if (!constraints) return config.phase1Cap
  
  const capKey = constraints.budgetCapKey
  const cap = config[capKey]
  
  if (cap === null) {
    // Fallback for institutes without Phase IIB
    return config.phase2Cap
  }
  
  return cap
}

export function isPolicyExpired(): boolean {
  const lastUpdated = new Date(POLICY_LAST_UPDATED)
  const now = new Date()
  const monthsDiff = (now.getFullYear() - lastUpdated.getFullYear()) * 12 + 
                     (now.getMonth() - lastUpdated.getMonth())
  return monthsDiff >= POLICY_EXPIRY_MONTHS
}

export function getPolicyWarning(): string | null {
  if (isPolicyExpired()) {
    return `Policy tables last updated ${POLICY_LAST_UPDATED}. Budget caps and allocation requirements may have changed. Please verify current NIH guidelines.`
  }
  return null
}
