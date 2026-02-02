export type GrantType = 'Phase I' | 'Phase II' | 'Fast Track' | 'Direct to Phase II' | 'Phase IIB'
export type ProgramType = 'SBIR' | 'STTR'

export interface PriorPhaseData {
  awardNumber: string
  completionDate: string
  fundingSource: string
  findings: string
}

export interface BudgetData {
  directCosts: number
  personnelCosts: number
  subawardCosts: number
  smallBusinessPercent: number
  researchInstitutionPercent: number
}

export interface GrantData {
  grantType: GrantType | null
  programType: ProgramType
  priorPhase: PriorPhaseData
  checklist: Record<string, boolean>
  budget: BudgetData
}

export interface ValidationError {
  code: string
  message: string
  field: string
}

export interface ValidationResult {
  status: 'structurally_ready' | 'not_ready'
  phase: string
  errors: ValidationError[]
  warnings: ValidationError[]
  data: GrantData
}
