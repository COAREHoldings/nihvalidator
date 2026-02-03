// 8-Layer Compliance Enforcement System
// Central export point for all compliance modules

// Layer 1 & 8: Mechanism Configuration and Dynamic Agency Alignment
export {
  POLICY_VERSION,
  POLICY_LAST_UPDATED,
  POLICY_EXPIRY_MONTHS,
  INSTITUTE_CONFIGS,
  PHASE_CONSTRAINTS,
  PROMOTIONAL_TERMS,
  SECTION_VALIDATION_RULES,
  getInstituteConfig,
  getBudgetCapForPhase,
  isPolicyExpired,
  getPolicyWarning,
  type InstituteConfig,
  type PhaseConstraints,
  type SectionValidationRules
} from './complianceConfig'

// Layer 2: NIH Compliance System Prompt
export {
  NIH_COMPLIANCE_SYSTEM_PROMPT,
  SECTION_COMPLIANCE_PROMPTS,
  getComplianceSystemPrompt
} from './complianceSystemPrompt'

// Layer 3 & 4: Section Validation and Compliance Audit
export {
  detectPromotionalLanguage,
  detectPlaceholders,
  detectMissingStatistics,
  checkGoNoGoCriteria,
  validateSection,
  calculateComplianceScore,
  calculateAgencyAlignmentScore,
  runComplianceAudit,
  type ValidationIssue,
  type ComplianceScore,
  type AgencyAlignmentScore,
  type ComplianceAuditResult
} from './complianceAudit'
