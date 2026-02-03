// Layer 3, 4, 6: Compliance Audit UI with Score Display and Export Blocking
import { useState } from 'react'
import type { ProjectSchemaV2 } from '../types'
import { 
  runComplianceAudit, 
  type ComplianceAuditResult,
  type ValidationIssue 
} from '../compliance/complianceAudit'
import { addAuditEntry } from '../validation'
import { 
  ShieldCheck, 
  ShieldAlert, 
  AlertTriangle, 
  AlertCircle,
  CheckCircle,
  XCircle,
  Download,
  RefreshCw,
  FileWarning,
  ChevronDown,
  ChevronUp,
  Lock,
  Unlock
} from 'lucide-react'

interface ComplianceAuditPanelProps {
  project: ProjectSchemaV2
  onUpdate: (updates: Partial<ProjectSchemaV2>) => void
  onExport: () => void
}

export function ComplianceAuditPanel({ project, onUpdate, onExport }: ComplianceAuditPanelProps) {
  const [auditResult, setAuditResult] = useState<ComplianceAuditResult | null>(null)
  const [isRunning, setIsRunning] = useState(false)
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({})

  // Compile all project content for audit
  const compileProjectContent = (): string => {
    const sections: string[] = []
    
    // M1: Title & Concept
    if (project.m1_title_concept) {
      sections.push(Object.values(project.m1_title_concept).filter(v => typeof v === 'string').join('\n'))
    }
    
    // M2: Hypothesis
    if (project.m2_hypothesis) {
      sections.push(Object.values(project.m2_hypothesis).filter(v => typeof v === 'string').join('\n'))
    }
    
    // M3: Specific Aims
    if (project.m3_specific_aims) {
      sections.push(Object.values(project.m3_specific_aims).filter(v => typeof v === 'string').join('\n'))
    }
    
    // M5: Experimental Approach
    if (project.m5_experimental_approach) {
      sections.push(Object.values(project.m5_experimental_approach).filter(v => typeof v === 'string').join('\n'))
    }
    
    // M7: Regulatory
    if (project.m7_regulatory) {
      sections.push(Object.values(project.m7_regulatory).filter(v => typeof v === 'string').join('\n'))
    }
    
    // M9: Commercialization (if applicable)
    if (project.grant_type !== 'Phase I' && project.m9_commercialization) {
      const commercialization = project.m9_commercialization
      for (const section of Object.values(commercialization)) {
        if (typeof section === 'object' && section !== null) {
          sections.push(Object.values(section).filter(v => typeof v === 'string').join('\n'))
        }
      }
    }
    
    return sections.join('\n\n')
  }

  const runAudit = async () => {
    setIsRunning(true)
    
    try {
      const content = compileProjectContent()
      
      // Determine which sections to validate based on grant type
      const sectionTypes: string[] = ['specific_aims', 'rigor_reproducibility']
      if (project.m7_regulatory?.human_subjects_involved) {
        sectionTypes.push('human_subjects')
      }
      if (project.m7_regulatory?.vertebrate_animals_involved) {
        sectionTypes.push('vertebrate_animals')
      }
      if (project.grant_type !== 'Phase I') {
        sectionTypes.push('commercialization_plan')
      }
      
      const result = runComplianceAudit(
        content,
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
      
      setAuditResult(result)
      
      // Update project with audit results via Layer 7 audit trail
      const updatedProject = addAuditEntry(project, {
        moduleId: null,
        sectionType: sectionTypes.join(', '),
        action: 'check',
        complianceScore: result.complianceScore.total,
        agencyAlignmentScore: result.agencyAlignmentScore.total,
        issues: result.issues.map(i => i.message),
        passed: result.passed
      })
      
      onUpdate({
        audit_trail: updatedProject.audit_trail,
        last_compliance_score: result.complianceScore.total,
        last_agency_alignment_score: result.agencyAlignmentScore.total,
        compliance_export_allowed: result.exportAllowed
      })
      
    } finally {
      setIsRunning(false)
    }
  }

  const handleExport = () => {
    if (!auditResult?.exportAllowed) {
      // Log blocked export attempt
      const updatedProject = addAuditEntry(project, {
        moduleId: null,
        sectionType: null,
        action: 'export_blocked',
        complianceScore: auditResult?.complianceScore.total || 0,
        agencyAlignmentScore: auditResult?.agencyAlignmentScore.total || 0,
        issues: auditResult?.blockingIssues.map(i => i.message) || [],
        passed: false
      })
      onUpdate({ audit_trail: updatedProject.audit_trail })
      return
    }
    
    // Log successful export
    const updatedProject = addAuditEntry(project, {
      moduleId: null,
      sectionType: null,
      action: 'export_success',
      complianceScore: auditResult.complianceScore.total,
      agencyAlignmentScore: auditResult.agencyAlignmentScore.total,
      issues: [],
      passed: true
    })
    onUpdate({ audit_trail: updatedProject.audit_trail })
    onExport()
  }

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }))
  }

  const getScoreColor = (score: number, max: number) => {
    const percent = (score / max) * 100
    if (percent >= 90) return 'text-green-600'
    if (percent >= 70) return 'text-amber-600'
    return 'text-red-600'
  }

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <XCircle className="w-4 h-4 text-red-600" />
      case 'error':
        return <AlertCircle className="w-4 h-4 text-orange-600" />
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-amber-500" />
      default:
        return <AlertCircle className="w-4 h-4 text-neutral-400" />
    }
  }

  const groupIssuesBySection = (issues: ValidationIssue[]) => {
    const grouped: Record<string, ValidationIssue[]> = {}
    for (const issue of issues) {
      const section = issue.section || 'other'
      if (!grouped[section]) grouped[section] = []
      grouped[section].push(issue)
    }
    return grouped
  }

  return (
    <div className="bg-white rounded-lg border border-neutral-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          {auditResult?.passed ? (
            <ShieldCheck className="w-8 h-8 text-green-600" />
          ) : auditResult ? (
            <ShieldAlert className="w-8 h-8 text-red-600" />
          ) : (
            <ShieldCheck className="w-8 h-8 text-neutral-400" />
          )}
          <div>
            <h2 className="text-lg font-semibold text-neutral-900">Compliance Audit</h2>
            <p className="text-sm text-neutral-500">Layers 3, 4 & 6: Section validation, scoring, and claim control</p>
          </div>
        </div>
        
        <button
          onClick={runAudit}
          disabled={isRunning}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
        >
          {isRunning ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              Running...
            </>
          ) : (
            <>
              <ShieldCheck className="w-4 h-4" />
              Run Audit
            </>
          )}
        </button>
      </div>

      {auditResult && (
        <>
          {/* Score Summary */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            {/* Compliance Score */}
            <div className={`p-4 rounded-lg border-2 ${auditResult.complianceScore.total >= 90 ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-neutral-700">Compliance Score</span>
                <span className={`text-2xl font-bold ${getScoreColor(auditResult.complianceScore.total, 100)}`}>
                  {auditResult.complianceScore.total}/100
                </span>
              </div>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span>Structure</span>
                  <span className={getScoreColor(auditResult.complianceScore.structure, 30)}>
                    {auditResult.complianceScore.structure}/30
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Statistical</span>
                  <span className={getScoreColor(auditResult.complianceScore.statistical, 20)}>
                    {auditResult.complianceScore.statistical}/20
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Regulatory</span>
                  <span className={getScoreColor(auditResult.complianceScore.regulatory, 20)}>
                    {auditResult.complianceScore.regulatory}/20
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Commercial</span>
                  <span className={getScoreColor(auditResult.complianceScore.commercial, 20)}>
                    {auditResult.complianceScore.commercial}/20
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Tone</span>
                  <span className={getScoreColor(auditResult.complianceScore.tone, 10)}>
                    {auditResult.complianceScore.tone}/10
                  </span>
                </div>
              </div>
              {auditResult.complianceScore.total < 90 && (
                <p className="mt-2 text-xs text-red-600 font-medium">
                  Minimum 90 required for export
                </p>
              )}
            </div>

            {/* Agency Alignment Score */}
            <div className={`p-4 rounded-lg border-2 ${auditResult.agencyAlignmentScore.total >= 100 ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-neutral-700">Agency Alignment</span>
                <span className={`text-2xl font-bold ${auditResult.agencyAlignmentScore.total >= 100 ? 'text-green-600' : 'text-red-600'}`}>
                  {auditResult.agencyAlignmentScore.total}/100
                </span>
              </div>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span>Budget</span>
                  <span className={auditResult.agencyAlignmentScore.budgetCompliance >= 25 ? 'text-green-600' : 'text-red-600'}>
                    {auditResult.agencyAlignmentScore.budgetCompliance}/25
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Allocation</span>
                  <span className={auditResult.agencyAlignmentScore.allocationCompliance >= 25 ? 'text-green-600' : 'text-red-600'}>
                    {auditResult.agencyAlignmentScore.allocationCompliance}/25
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>FOA</span>
                  <span className={auditResult.agencyAlignmentScore.foaCompliance >= 25 ? 'text-green-600' : 'text-amber-600'}>
                    {auditResult.agencyAlignmentScore.foaCompliance}/25
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Clinical Trial</span>
                  <span className={auditResult.agencyAlignmentScore.clinicalTrialCompliance >= 25 ? 'text-green-600' : 'text-red-600'}>
                    {auditResult.agencyAlignmentScore.clinicalTrialCompliance}/25
                  </span>
                </div>
              </div>
              {auditResult.agencyAlignmentScore.total < 100 && (
                <p className="mt-2 text-xs text-red-600 font-medium">
                  100% required for export
                </p>
              )}
            </div>
          </div>

          {/* Export Status */}
          <div className={`p-4 rounded-lg mb-6 ${auditResult.exportAllowed ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {auditResult.exportAllowed ? (
                  <Unlock className="w-6 h-6 text-green-600" />
                ) : (
                  <Lock className="w-6 h-6 text-red-600" />
                )}
                <div>
                  <p className={`font-semibold ${auditResult.exportAllowed ? 'text-green-800' : 'text-red-800'}`}>
                    {auditResult.exportAllowed ? 'Export Allowed' : 'Export Blocked'}
                  </p>
                  <p className={`text-sm ${auditResult.exportAllowed ? 'text-green-600' : 'text-red-600'}`}>
                    {auditResult.exportAllowed 
                      ? 'Your application meets all compliance requirements'
                      : `${auditResult.blockingIssues.length} critical issue(s) must be resolved`
                    }
                  </p>
                </div>
              </div>
              <button
                onClick={handleExport}
                disabled={!auditResult.exportAllowed}
                className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
                  auditResult.exportAllowed 
                    ? 'bg-green-600 text-white hover:bg-green-700' 
                    : 'bg-neutral-200 text-neutral-400 cursor-not-allowed'
                }`}
              >
                <Download className="w-4 h-4" />
                Export
              </button>
            </div>
          </div>

          {/* Issues List */}
          {auditResult.issues.length > 0 && (
            <div className="border border-neutral-200 rounded-lg overflow-hidden">
              <div className="bg-neutral-50 px-4 py-3 border-b border-neutral-200">
                <h3 className="font-semibold text-neutral-900">
                  Issues Found ({auditResult.issues.length})
                </h3>
              </div>
              
              {Object.entries(groupIssuesBySection(auditResult.issues)).map(([section, issues]) => (
                <div key={section} className="border-b border-neutral-100 last:border-0">
                  <button
                    onClick={() => toggleSection(section)}
                    className="w-full px-4 py-3 flex items-center justify-between hover:bg-neutral-50"
                  >
                    <div className="flex items-center gap-2">
                      <FileWarning className="w-4 h-4 text-neutral-500" />
                      <span className="font-medium text-neutral-700 capitalize">{section}</span>
                      <span className="text-xs bg-neutral-200 text-neutral-600 px-2 py-0.5 rounded">
                        {issues.length}
                      </span>
                    </div>
                    {expandedSections[section] ? (
                      <ChevronUp className="w-4 h-4 text-neutral-400" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-neutral-400" />
                    )}
                  </button>
                  
                  {expandedSections[section] && (
                    <div className="px-4 pb-3 space-y-2">
                      {issues.map((issue, idx) => (
                        <div key={idx} className={`p-3 rounded-lg ${
                          issue.severity === 'critical' ? 'bg-red-50 border border-red-200' :
                          issue.severity === 'error' ? 'bg-orange-50 border border-orange-200' :
                          'bg-amber-50 border border-amber-200'
                        }`}>
                          <div className="flex items-start gap-2">
                            {getSeverityIcon(issue.severity)}
                            <div className="flex-1">
                              <p className="text-sm font-medium text-neutral-800">{issue.message}</p>
                              {issue.suggestion && (
                                <p className="text-xs text-neutral-600 mt-1">
                                  Suggestion: {issue.suggestion}
                                </p>
                              )}
                              <span className="text-xs bg-neutral-200 text-neutral-600 px-1.5 py-0.5 rounded mt-2 inline-block">
                                {issue.code}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* No Issues */}
          {auditResult.issues.length === 0 && (
            <div className="text-center py-8 bg-green-50 rounded-lg border border-green-200">
              <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-3" />
              <p className="font-semibold text-green-800">No compliance issues detected</p>
              <p className="text-sm text-green-600 mt-1">Your application is ready for export</p>
            </div>
          )}
        </>
      )}

      {/* Pre-audit state */}
      {!auditResult && !isRunning && (
        <div className="text-center py-12 bg-neutral-50 rounded-lg border border-neutral-200">
          <ShieldCheck className="w-16 h-16 text-neutral-300 mx-auto mb-4" />
          <p className="text-neutral-600 font-medium">Run a compliance audit to check your application</p>
          <p className="text-sm text-neutral-500 mt-2">
            The audit will validate content structure, statistical rigor, regulatory compliance, and flag promotional language
          </p>
        </div>
      )}
    </div>
  )
}
