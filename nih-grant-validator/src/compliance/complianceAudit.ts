// Layer 3 & Layer 4: Section Validation and Compliance Audit Engine
import { 
  PROMOTIONAL_TERMS, 
  SECTION_VALIDATION_RULES,
  PHASE_CONSTRAINTS,
  getInstituteConfig,
  getBudgetCapForPhase
} from './complianceConfig'

export interface ValidationIssue {
  code: string
  severity: 'critical' | 'error' | 'warning'
  section: string
  message: string
  element?: string
  suggestion?: string
}

export interface ComplianceScore {
  total: number
  structure: number // 30 points max
  statistical: number // 20 points max
  regulatory: number // 20 points max
  commercial: number // 20 points max
  tone: number // 10 points max
  breakdown: Record<string, number>
}

export interface AgencyAlignmentScore {
  total: number
  budgetCompliance: number // 25 points
  allocationCompliance: number // 25 points
  foaCompliance: number // 25 points
  clinicalTrialCompliance: number // 25 points
  breakdown: Record<string, number>
}

export interface ComplianceAuditResult {
  passed: boolean
  complianceScore: ComplianceScore
  agencyAlignmentScore: AgencyAlignmentScore
  issues: ValidationIssue[]
  blockingIssues: ValidationIssue[]
  exportAllowed: boolean
  timestamp: string
  auditorVersion: string
}

// Layer 6: Claim Control - detect promotional language
export function detectPromotionalLanguage(text: string): ValidationIssue[] {
  const issues: ValidationIssue[] = []
  const lowerText = text.toLowerCase()
  
  for (const term of PROMOTIONAL_TERMS) {
    const regex = new RegExp(`\\b${term}\\b`, 'gi')
    const matches = text.match(regex)
    if (matches) {
      issues.push({
        code: 'CLAIM_PROMOTIONAL',
        severity: 'error',
        section: 'content',
        message: `Promotional language detected: "${term}"`,
        element: term,
        suggestion: `Remove or replace "${term}" with neutral scientific language`
      })
    }
  }
  
  return issues
}

// Detect placeholder text
export function detectPlaceholders(text: string): ValidationIssue[] {
  const issues: ValidationIssue[] = []
  const placeholderPatterns = [
    /\bTBD\b/gi,
    /\bTBA\b/gi,
    /\[to be determined\]/gi,
    /\[insert.*?\]/gi,
    /\[placeholder\]/gi,
    /\[TODO.*?\]/gi,
    /XXX/g,
    /\[FILL IN\]/gi,
    /\[ADD.*?\]/gi
  ]
  
  for (const pattern of placeholderPatterns) {
    const matches = text.match(pattern)
    if (matches) {
      for (const match of matches) {
        issues.push({
          code: 'PLACEHOLDER_DETECTED',
          severity: 'critical',
          section: 'content',
          message: `Placeholder text found: "${match}"`,
          element: match,
          suggestion: 'Replace placeholder with actual content'
        })
      }
    }
  }
  
  return issues
}

// Detect missing statistical elements
export function detectMissingStatistics(text: string): ValidationIssue[] {
  const issues: ValidationIssue[] = []
  const lowerText = text.toLowerCase()
  
  // Check for power calculation
  if (lowerText.includes('experiment') || lowerText.includes('study') || lowerText.includes('aim')) {
    if (!lowerText.includes('power') && !lowerText.includes('80%') && !lowerText.includes('sample size')) {
      issues.push({
        code: 'STATS_MISSING_POWER',
        severity: 'error',
        section: 'statistical',
        message: 'Missing power calculation or sample size justification',
        suggestion: 'Include power analysis with >= 80% power and effect size assumptions'
      })
    }
  }
  
  // Check for statistical test specification
  const statTests = ['t-test', 'anova', 'chi-square', 'fisher', 'mann-whitney', 'wilcoxon', 'regression']
  const hasStatTest = statTests.some(test => lowerText.includes(test))
  if (!hasStatTest && (lowerText.includes('compare') || lowerText.includes('analysis') || lowerText.includes('significant'))) {
    issues.push({
      code: 'STATS_MISSING_TEST',
      severity: 'warning',
      section: 'statistical',
      message: 'Statistical test not specified',
      suggestion: 'Specify the statistical test to be used (e.g., t-test, ANOVA)'
    })
  }
  
  // Check for n= sample size
  if (!text.match(/n\s*[=:]\s*\d+/i) && !text.match(/\d+\s*samples?/i) && !text.match(/\d+\s*subjects?/i)) {
    if (lowerText.includes('experiment') || lowerText.includes('group') || lowerText.includes('cohort')) {
      issues.push({
        code: 'STATS_MISSING_N',
        severity: 'warning',
        section: 'statistical',
        message: 'Sample size (n=) not specified',
        suggestion: 'Include sample size for experiments (e.g., n=6 per group)'
      })
    }
  }
  
  return issues
}

// Check for Go/No-Go criteria (Phase I requirement)
export function checkGoNoGoCriteria(text: string, grantType: string): ValidationIssue[] {
  const issues: ValidationIssue[] = []
  const lowerText = text.toLowerCase()
  
  if (grantType === 'Phase I' || grantType === 'Fast Track') {
    const hasGoNoGo = lowerText.includes('go/no-go') || 
                      lowerText.includes('go no go') ||
                      lowerText.includes('decision criteria') ||
                      lowerText.includes('success criterion') ||
                      lowerText.includes('milestone criteria') ||
                      (lowerText.includes('proceed') && lowerText.includes('if'))
    
    if (!hasGoNoGo) {
      issues.push({
        code: 'MISSING_GO_NO_GO',
        severity: 'critical',
        section: 'structure',
        message: 'Missing Go/No-Go criteria (required for Phase I)',
        suggestion: 'Add explicit Go/No-Go decision criteria with quantitative thresholds'
      })
    }
  }
  
  return issues
}

// Layer 3: Validate specific section
export function validateSection(
  sectionType: string,
  content: string,
  grantType: string
): ValidationIssue[] {
  const issues: ValidationIssue[] = []
  const rules = SECTION_VALIDATION_RULES[sectionType]
  
  if (!rules) return issues
  
  const lowerContent = content.toLowerCase()
  
  // Check for required elements
  for (const element of rules.requiredElements) {
    const elementPatterns: Record<string, RegExp[]> = {
      'explicit_hypothesis': [/hypothes[ie]s?/i, /we hypothesize/i, /our hypothesis/i],
      'defined_endpoints': [/endpoint/i, /primary outcome/i, /measure[ds]?/i],
      'quantitative_success_thresholds': [/>\s*\d+%/i, /<\s*\d+/i, /threshold/i, /criterion/i, /criteria/i],
      'statistical_method': [/t-test/i, /anova/i, /regression/i, /statistical\s+anal/i],
      'biological_replicates': [/replicate/i, /n\s*=/i, /independent\s+experiment/i],
      'go_no_go_criteria': [/go[\s/-]no[\s/-]go/i, /decision\s+criter/i],
      'power_calculation_80_percent': [/power/i, /80%/i, /sample size/i],
      'significance_threshold_alpha': [/alpha/i, /p\s*[<>=]/i, /0\.05/i, /significance/i],
      'cell_line_authentication': [/authentication/i, /str\s+profil/i, /cell\s+line\s+valid/i],
      'mycoplasma_testing': [/mycoplasma/i],
      'randomization_statement': [/random/i],
      'blinding_statement': [/blind/i, /mask/i],
      // Vertebrate animals
      'description_of_procedures': [/procedure/i, /protocol/i, /method/i],
      'justification_species_numbers': [/justif/i, /species/i, /number\s+of\s+animal/i],
      'minimization_pain_distress': [/pain/i, /distress/i, /humane/i, /anesthesia/i],
      'euthanasia_method': [/euthanas/i, /sacrifice/i],
      'statistical_justification_group_size': [/group\s+size/i, /power/i, /n\s*=/i],
      // Human subjects
      'classification_human_subjects': [/human\s+subject/i, /clinical/i, /participant/i],
      'irb_status': [/irb/i, /institutional\s+review/i],
      'risk_level': [/risk/i, /minimal\s+risk/i],
      'de_identification_explanation': [/de-identif/i, /deidentif/i, /anonymi/i, /privacy/i],
      // Commercialization
      'company_overview': [/company/i, /organization/i, /team/i],
      'market_size_tam_sam': [/tam/i, /sam/i, /market\s+size/i, /addressable/i],
      'competitive_landscape': [/competitor/i, /competitive/i, /alternative/i],
      'ip_position': [/ip/i, /patent/i, /intellectual\s+property/i],
      'freedom_to_operate': [/freedom\s+to\s+operate/i, /fto/i, /blocking\s+patent/i],
      'regulatory_pathway': [/fda/i, /regulatory/i, /510\(k\)/i, /ind/i, /pma/i],
      'manufacturing_plan': [/manufactur/i, /production/i, /gmp/i],
      'revenue_model_5year': [/revenue/i, /projection/i, /forecast/i],
      'reimbursement_strategy': [/reimburse/i, /cpt/i, /payer/i, /coverage/i],
      'exit_strategy': [/exit/i, /acquisition/i, /partnership/i, /licens/i]
    }
    
    const patterns = elementPatterns[element]
    if (patterns) {
      const found = patterns.some(p => p.test(content))
      if (!found) {
        issues.push({
          code: `MISSING_${element.toUpperCase()}`,
          severity: 'error',
          section: sectionType,
          message: `Missing required element: ${element.replace(/_/g, ' ')}`,
          element: element,
          suggestion: `Add ${element.replace(/_/g, ' ')} to meet NIH requirements`
        })
      }
    }
  }
  
  return issues
}

// Layer 4: Calculate compliance score
export function calculateComplianceScore(
  content: string,
  grantType: string,
  issues: ValidationIssue[]
): ComplianceScore {
  let structure = 30
  let statistical = 20
  let regulatory = 20
  let commercial = 20
  let tone = 10
  
  const breakdown: Record<string, number> = {}
  
  // Deduct for issues
  for (const issue of issues) {
    const deduction = issue.severity === 'critical' ? 10 : issue.severity === 'error' ? 5 : 2
    
    switch (issue.section) {
      case 'structure':
        structure = Math.max(0, structure - deduction)
        break
      case 'statistical':
        statistical = Math.max(0, statistical - deduction)
        break
      case 'regulatory':
        regulatory = Math.max(0, regulatory - deduction)
        break
      case 'commercial':
        commercial = Math.max(0, commercial - deduction)
        break
      case 'content':
        tone = Math.max(0, tone - deduction)
        break
    }
    
    breakdown[issue.code] = (breakdown[issue.code] || 0) + deduction
  }
  
  // Adjust commercial score based on grant type
  if (grantType === 'Phase I') {
    // Phase I doesn't require full commercialization
    commercial = 20 // Full points if no issues
  }
  
  const total = structure + statistical + regulatory + commercial + tone
  
  return {
    total,
    structure,
    statistical,
    regulatory,
    commercial,
    tone,
    breakdown
  }
}

// Layer 8: Calculate Agency Alignment Score
export function calculateAgencyAlignmentScore(
  projectData: {
    institute: string
    grantType: string
    programType: 'SBIR' | 'STTR'
    directCosts: number
    smallBusinessPercent: number
    researchInstitutionPercent: number
    clinicalTrialIncluded: boolean
    foaNumber?: string
    foaOverrides?: {
      budgetCap?: number
      smallBusinessMin?: number
      researchInstitutionMin?: number
      clinicalTrialAllowed?: boolean
    }
  }
): AgencyAlignmentScore {
  const config = getInstituteConfig(projectData.institute)
  const breakdown: Record<string, number> = {}
  
  // Use FOA overrides if available
  const budgetCap = projectData.foaOverrides?.budgetCap || 
                    getBudgetCapForPhase(projectData.institute, projectData.grantType)
  
  // Budget compliance (25 points)
  let budgetCompliance = 25
  if (projectData.directCosts > budgetCap) {
    budgetCompliance = 0
    breakdown['budget_exceeded'] = 25
  } else if (projectData.directCosts > budgetCap * 0.95) {
    budgetCompliance = 20 // Warning zone
    breakdown['budget_near_cap'] = 5
  }
  
  // Allocation compliance (25 points)
  let allocationCompliance = 25
  
  if (projectData.programType === 'SBIR') {
    const minPercent = projectData.grantType === 'Phase I' ? 
      config.sbir.phase1SmallBusinessMin : 
      config.sbir.phase2SmallBusinessMin
    const actualMin = projectData.foaOverrides?.smallBusinessMin || minPercent
    
    if (projectData.smallBusinessPercent < actualMin) {
      allocationCompliance = 0
      breakdown['sbir_allocation_failed'] = 25
    }
  } else { // STTR
    const sbMin = projectData.foaOverrides?.smallBusinessMin || config.sttr.smallBusinessMin
    const riMin = projectData.foaOverrides?.researchInstitutionMin || config.sttr.researchInstitutionMin
    
    if (projectData.smallBusinessPercent < sbMin) {
      allocationCompliance = Math.max(0, allocationCompliance - 15)
      breakdown['sttr_sb_allocation_failed'] = 15
    }
    if (projectData.researchInstitutionPercent < riMin) {
      allocationCompliance = Math.max(0, allocationCompliance - 10)
      breakdown['sttr_ri_allocation_failed'] = 10
    }
  }
  
  // FOA compliance (25 points)
  let foaCompliance = 25
  if (!projectData.foaNumber && projectData.grantType !== 'Phase I') {
    foaCompliance = 15 // Reduced but not zero for missing FOA
    breakdown['foa_not_specified'] = 10
  }
  
  // Clinical trial compliance (25 points)
  let clinicalTrialCompliance = 25
  const ctAllowed = projectData.foaOverrides?.clinicalTrialAllowed ?? config.clinicalTrialAllowed
  
  if (projectData.clinicalTrialIncluded && !ctAllowed) {
    clinicalTrialCompliance = 0
    breakdown['clinical_trial_not_allowed'] = 25
  }
  
  const total = budgetCompliance + allocationCompliance + foaCompliance + clinicalTrialCompliance
  
  return {
    total,
    budgetCompliance,
    allocationCompliance,
    foaCompliance,
    clinicalTrialCompliance,
    breakdown
  }
}

// Layer 4: Run full compliance audit
export function runComplianceAudit(
  content: string,
  projectData: {
    institute: string
    grantType: string
    programType: 'SBIR' | 'STTR'
    directCosts: number
    smallBusinessPercent: number
    researchInstitutionPercent: number
    clinicalTrialIncluded: boolean
    foaNumber?: string
    foaOverrides?: {
      budgetCap?: number
      smallBusinessMin?: number
      researchInstitutionMin?: number
      clinicalTrialAllowed?: boolean
    }
  },
  sectionTypes: string[] = []
): ComplianceAuditResult {
  const allIssues: ValidationIssue[] = []
  
  // Run all detections
  allIssues.push(...detectPromotionalLanguage(content))
  allIssues.push(...detectPlaceholders(content))
  allIssues.push(...detectMissingStatistics(content))
  allIssues.push(...checkGoNoGoCriteria(content, projectData.grantType))
  
  // Run section-specific validation
  for (const sectionType of sectionTypes) {
    allIssues.push(...validateSection(sectionType, content, projectData.grantType))
  }
  
  // Calculate scores
  const complianceScore = calculateComplianceScore(content, projectData.grantType, allIssues)
  const agencyAlignmentScore = calculateAgencyAlignmentScore(projectData)
  
  // Identify blocking issues
  const blockingIssues = allIssues.filter(i => i.severity === 'critical')
  
  // Determine if export is allowed
  const exportAllowed = complianceScore.total >= 90 && 
                        agencyAlignmentScore.total >= 100 && 
                        blockingIssues.length === 0
  
  return {
    passed: exportAllowed,
    complianceScore,
    agencyAlignmentScore,
    issues: allIssues,
    blockingIssues,
    exportAllowed,
    timestamp: new Date().toISOString(),
    auditorVersion: '1.0.0'
  }
}
