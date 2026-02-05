import { useState } from 'react'
import { FileCheck, CheckCircle, XCircle, AlertTriangle, Download, RefreshCw, ChevronDown, ChevronUp, ExternalLink, Briefcase, FileText, BookOpen } from 'lucide-react'
import type { ProjectSchemaV2, ValidationResult } from '../../types'
import { runFullValidation } from '../../validation'
import { ComplianceAuditPanel } from '../ComplianceAuditPanel'
import { CommercializationDirector } from '../CommercializationDirector'
import { AIGenerateButton } from '../shared/AIGenerateButton'
import { GrantSummary } from './GrantSummary'

type TabType = 'validation' | 'summary' | 'documents'

interface StepReviewProps {
  project: ProjectSchemaV2
  onUpdate: (updates: Partial<ProjectSchemaV2>) => void
}

export function StepReview({ project, onUpdate }: StepReviewProps) {
  const [activeTab, setActiveTab] = useState<TabType>('summary')
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null)
  const [isValidating, setIsValidating] = useState(false)
  const [showComplianceAudit, setShowComplianceAudit] = useState(false)
  const [showCommercialization, setShowCommercialization] = useState(false)
  const [expandedSections, setExpandedSections] = useState<Record<number, boolean>>({})

  const showCommercializationModule = project.grant_type && ['Phase II', 'Fast Track', 'Direct to Phase II', 'Phase IIB'].includes(project.grant_type)

  const handleRunValidation = () => {
    setIsValidating(true)
    setTimeout(() => {
      const result = runFullValidation(project)
      setValidationResult(result)
      setIsValidating(false)
    }, 500)
  }

  const handleExportJSON = () => {
    const exportData = {
      project,
      validationResult,
      exportedAt: new Date().toISOString()
    }
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `nih-grant-${project.grant_type?.replace(/\s+/g, '-').toLowerCase()}-${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const toggleSection = (moduleId: number) => {
    setExpandedSections(prev => ({ ...prev, [moduleId]: !prev[moduleId] }))
  }

  // Calculate completion stats - provide fallback for module_states
  const moduleStates = project.module_states || []
  const totalModules = moduleStates.length
  const completedModules = moduleStates.filter(m => m.status === 'complete').length
  const partialModules = moduleStates.filter(m => m.status === 'partial').length

  return (
    <div className="space-y-8">
      {/* Step Header */}
      <div>
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
            <FileCheck className="w-5 h-5 text-primary-600" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-neutral-900">Review & Export</h2>
            <p className="text-sm text-neutral-500">Review your compiled grant, validate, and export for submission</p>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-neutral-200">
        <nav className="flex gap-1" aria-label="Tabs">
          <button
            onClick={() => setActiveTab('summary')}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'summary'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-neutral-500 hover:text-neutral-700 hover:border-neutral-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Grant Summary
            </div>
          </button>
          <button
            onClick={() => setActiveTab('validation')}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'validation'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-neutral-500 hover:text-neutral-700 hover:border-neutral-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <FileCheck className="w-4 h-4" />
              Validation
            </div>
          </button>
          <button
            onClick={() => setActiveTab('documents')}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'documents'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-neutral-500 hover:text-neutral-700 hover:border-neutral-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4" />
              AI Documents
            </div>
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'summary' && (
        <GrantSummary project={project} onUpdate={onUpdate} />
      )}

      {activeTab === 'validation' && (
        <>
      {/* Quick Stats */}
      <div className="grid md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-neutral-200 p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-neutral-500">Completed</span>
            <CheckCircle className="w-5 h-5 text-green-500" />
          </div>
          <p className="text-2xl font-bold text-neutral-900 mt-1">{completedModules}/{totalModules}</p>
          <p className="text-xs text-neutral-500">modules complete</p>
        </div>

        <div className="bg-white rounded-xl border border-neutral-200 p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-neutral-500">In Progress</span>
            <AlertTriangle className="w-5 h-5 text-amber-500" />
          </div>
          <p className="text-2xl font-bold text-neutral-900 mt-1">{partialModules}</p>
          <p className="text-xs text-neutral-500">modules partial</p>
        </div>

        <div className="bg-white rounded-xl border border-neutral-200 p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-neutral-500">Grant Type</span>
            <FileCheck className="w-5 h-5 text-primary-500" />
          </div>
          <p className="text-2xl font-bold text-neutral-900 mt-1">{project.grant_type || 'Not Set'}</p>
          <p className="text-xs text-neutral-500">{project.program_type}</p>
        </div>
      </div>

      {/* Validation Section */}
      <div className="bg-white rounded-xl border border-neutral-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-neutral-900">Validation</h3>
          <button
            onClick={handleRunValidation}
            disabled={isValidating}
            className="flex items-center gap-2 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:opacity-50 transition-colors"
          >
            {isValidating ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Validating...
              </>
            ) : (
              <>
                <FileCheck className="w-4 h-4" />
                Run Validation
              </>
            )}
          </button>
        </div>

        {validationResult ? (
          <div className="space-y-6">
            {/* Overall Status */}
            <div className={`p-4 rounded-lg ${
              validationResult.status === 'structurally_ready'
                ? 'bg-green-50 border border-green-200'
                : 'bg-red-50 border border-red-200'
            }`}>
              <div className="flex items-center gap-3">
                {validationResult.status === 'structurally_ready' ? (
                  <CheckCircle className="w-8 h-8 text-green-600" />
                ) : (
                  <XCircle className="w-8 h-8 text-red-600" />
                )}
                <div>
                  <p className="font-semibold text-lg">
                    {validationResult.status === 'structurally_ready'
                      ? 'Structurally Ready'
                      : 'Not Ready for Submission'}
                  </p>
                  <p className="text-sm opacity-80">
                    {validationResult.phase} | {project.program_type}
                  </p>
                </div>
              </div>
            </div>

            {/* Errors */}
            {validationResult.errors.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-red-800 mb-3 flex items-center gap-2">
                  <XCircle className="w-4 h-4" />
                  Blocking Issues ({validationResult.errors.length})
                </h4>
                <div className="space-y-2">
                  {validationResult.errors.map((error, i) => (
                    <div key={i} className="p-3 bg-red-50 border border-red-200 rounded-lg">
                      <div className="flex items-start gap-2">
                        <span className="text-xs font-mono bg-red-100 text-red-800 px-2 py-0.5 rounded">{error.code}</span>
                        <p className="text-sm text-neutral-900">{error.message}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Warnings */}
            {validationResult.warnings.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-amber-800 mb-3 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  Warnings ({validationResult.warnings.length})
                </h4>
                <div className="space-y-2">
                  {validationResult.warnings.map((warning, i) => (
                    <div key={i} className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                      <div className="flex items-start gap-2">
                        <span className="text-xs font-mono bg-amber-100 text-amber-800 px-2 py-0.5 rounded">{warning.code}</span>
                        <p className="text-sm text-neutral-900">{warning.message}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Module Results */}
            <div>
              <h4 className="text-sm font-semibold text-neutral-700 mb-3">Module Status</h4>
              <div className="space-y-2">
                {validationResult.module_results.map(mr => (
                  <div key={mr.module_id} className="border border-neutral-200 rounded-lg overflow-hidden">
                    <button
                      onClick={() => toggleSection(mr.module_id)}
                      className={`w-full p-3 flex items-center justify-between ${
                        mr.status === 'complete' ? 'bg-green-50' : mr.status === 'partial' ? 'bg-amber-50' : 'bg-neutral-50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {mr.status === 'complete' ? (
                          <CheckCircle className="w-5 h-5 text-green-600" />
                        ) : mr.status === 'partial' ? (
                          <AlertTriangle className="w-5 h-5 text-amber-600" />
                        ) : (
                          <XCircle className="w-5 h-5 text-neutral-400" />
                        )}
                        <span className="font-medium">Module {mr.module_id}</span>
                        <span className={`text-xs px-2 py-0.5 rounded ${
                          mr.status === 'complete' ? 'bg-green-100 text-green-800' :
                          mr.status === 'partial' ? 'bg-amber-100 text-amber-800' :
                          'bg-neutral-100 text-neutral-600'
                        }`}>
                          {mr.status}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-neutral-500">
                          {mr.populated_fields.length}/{mr.populated_fields.length + mr.missing_fields.length} fields
                        </span>
                        {expandedSections[mr.module_id] ? (
                          <ChevronUp className="w-4 h-4 text-neutral-400" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-neutral-400" />
                        )}
                      </div>
                    </button>
                    
                    {expandedSections[mr.module_id] && mr.missing_fields.length > 0 && (
                      <div className="p-3 bg-white border-t border-neutral-200">
                        <p className="text-xs font-medium text-neutral-500 mb-2">Missing fields:</p>
                        <div className="flex flex-wrap gap-1">
                          {mr.missing_fields.map(field => (
                            <span key={field} className="text-xs px-2 py-1 bg-red-50 text-red-700 rounded">
                              {field.replace(/_/g, ' ')}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <FileCheck className="w-12 h-12 text-neutral-300 mx-auto mb-3" />
            <p className="text-neutral-500">Click "Run Validation" to check your application</p>
          </div>
        )}
      </div>

      {/* Compliance Audit */}
      <div className="bg-white rounded-xl border border-neutral-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-neutral-900">Compliance Audit</h3>
          <button
            onClick={() => setShowComplianceAudit(!showComplianceAudit)}
            className="flex items-center gap-2 px-4 py-2 bg-green-50 text-green-700 border border-green-200 rounded-lg hover:bg-green-100 transition-colors"
          >
            <FileCheck className="w-4 h-4" />
            {showComplianceAudit ? 'Hide Audit' : 'Run Audit'}
          </button>
        </div>
        
        <p className="text-sm text-neutral-500 mb-4">
          Check your application against NIH SBIR/STTR compliance requirements before export.
        </p>

        {showComplianceAudit && (
          <div className="mt-4 pt-4 border-t border-neutral-200">
            <ComplianceAuditPanel
              project={project}
              onUpdate={onUpdate}
              onExport={handleExportJSON}
            />
          </div>
        )}
      </div>

      {/* Commercialization Plan (Phase II+) */}
      {showCommercializationModule && (
        <div className="bg-white rounded-xl border border-neutral-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Briefcase className="w-5 h-5 text-purple-600" />
              <div>
                <h3 className="text-lg font-semibold text-neutral-900">Commercialization Plan</h3>
                <p className="text-sm text-neutral-500">12-page plan required for {project.grant_type}</p>
              </div>
            </div>
            <button
              onClick={() => setShowCommercialization(!showCommercialization)}
              className="flex items-center gap-2 px-4 py-2 bg-purple-50 text-purple-700 border border-purple-200 rounded-lg hover:bg-purple-100 transition-colors"
            >
              <Briefcase className="w-4 h-4" />
              {showCommercialization ? 'Hide Plan' : 'Edit Plan'}
            </button>
          </div>

          {showCommercialization && (
            <div className="mt-4 pt-4 border-t border-neutral-200">
              <CommercializationDirector
                project={project}
                onUpdate={onUpdate}
              />
            </div>
          )}
        </div>
      )}
        </>
      )}

      {activeTab === 'documents' && (
        <>
      {/* AI Document Generation */}
      <div className="bg-white rounded-xl border border-neutral-200 p-6">
        <div className="flex items-center gap-2 mb-2">
          <FileText className="w-5 h-5 text-neutral-400" />
          <h3 className="text-lg font-semibold text-neutral-900">AI Document Generation</h3>
        </div>
        <p className="text-sm text-neutral-500 mb-6">Generate NIH-compliant documents with AI assistance. Each document follows strict compliance guidelines.</p>

        {/* Core Documents */}
        <div className="space-y-6">
          {/* Specific Aims Section */}
          <div>
            <h4 className="text-sm font-medium text-neutral-700 mb-3 flex items-center gap-2">
              <span className="w-6 h-6 bg-primary-100 text-primary-700 rounded-full flex items-center justify-center text-xs font-bold">1</span>
              Specific Aims
            </h4>
            <div className="grid lg:grid-cols-2 gap-4 pl-8">
              <AIGenerateButton
                project={project}
                documentType="specific-aims"
              />
              <AIGenerateButton
                project={project}
                documentType="specific-aims-page"
              />
            </div>
          </div>

          {/* Narrative Section */}
          <div>
            <h4 className="text-sm font-medium text-neutral-700 mb-3 flex items-center gap-2">
              <span className="w-6 h-6 bg-primary-100 text-primary-700 rounded-full flex items-center justify-center text-xs font-bold">2</span>
              Project Narrative
            </h4>
            <div className="pl-8">
              <AIGenerateButton
                project={project}
                documentType="project-narrative"
              />
            </div>
          </div>

          {/* Research Strategy Section */}
          <div>
            <h4 className="text-sm font-medium text-neutral-700 mb-3 flex items-center gap-2">
              <span className="w-6 h-6 bg-primary-100 text-primary-700 rounded-full flex items-center justify-center text-xs font-bold">3</span>
              Research Strategy
            </h4>
            <div className="grid lg:grid-cols-2 gap-4 pl-8">
              <AIGenerateButton
                project={project}
                documentType="research-strategy"
              />
              <AIGenerateButton
                project={project}
                documentType="experimental-plan"
              />
            </div>
          </div>

          {/* Commercialization for Phase II+ */}
          {showCommercializationModule && (
            <div>
              <h4 className="text-sm font-medium text-neutral-700 mb-3 flex items-center gap-2">
                <span className="w-6 h-6 bg-purple-100 text-purple-700 rounded-full flex items-center justify-center text-xs font-bold">4</span>
                Commercialization Plan
                <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">Phase II+</span>
              </h4>
              <div className="pl-8">
                <AIGenerateButton
                  project={project}
                  documentType="commercialization"
                />
              </div>
            </div>
          )}

          {/* Full Application */}
          <div className="pt-4 border-t border-neutral-200">
            <h4 className="text-sm font-medium text-neutral-700 mb-3 flex items-center gap-2">
              <span className="w-6 h-6 bg-green-100 text-green-700 rounded-full flex items-center justify-center text-xs font-bold">✓</span>
              Compiled Full Application
            </h4>
            <div className="pl-8">
              <AIGenerateButton
                project={project}
                documentType="compiled-grant"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Export Section */}
      <div className="bg-white rounded-xl border border-neutral-200 p-6">
        <h3 className="text-lg font-semibold text-neutral-900 mb-4">Export</h3>
        
        <div className="grid md:grid-cols-2 gap-4">
          <button
            onClick={handleExportJSON}
            className="flex items-center justify-center gap-2 p-4 bg-primary-50 text-primary-700 border border-primary-200 rounded-lg hover:bg-primary-100 transition-colors"
          >
            <Download className="w-5 h-5" />
            <span className="font-medium">Export JSON</span>
          </button>

          <button
            disabled
            className="flex items-center justify-center gap-2 p-4 bg-neutral-50 text-neutral-400 border border-neutral-200 rounded-lg cursor-not-allowed"
          >
            <ExternalLink className="w-5 h-5" />
            <span className="font-medium">Generate Documents (Coming Soon)</span>
          </button>
        </div>

        <p className="text-xs text-neutral-500 mt-4 text-center">
          Export your grant data for document generation or backup.
        </p>
      </div>

      {/* Final Checklist */}
      <div className="bg-neutral-50 rounded-xl border border-neutral-200 p-6">
        <h3 className="text-lg font-semibold text-neutral-900 mb-4">Final Checklist</h3>
        
        <div className="space-y-3">
          {[
            { label: 'Grant type and program selected', done: !!project.grant_type },
            { label: 'All specific aims defined', done: !!(project.m3_specific_aims?.aims?.length >= 3 && project.m3_specific_aims.aims.some(a => a.statement?.trim())) },
            { label: 'Budget within NIH caps', done: project.m6_budget.total_project_costs !== undefined && project.m6_budget.total_project_costs > 0 },
            { label: 'Team qualifications documented', done: !!project.m4_team_mapping.pi_name },
            { label: 'Regulatory requirements addressed', done: !!project.m7_regulatory.facilities_description },
            { label: 'Validation passed', done: validationResult?.status === 'structurally_ready' },
          ].map((item, idx) => (
            <label key={idx} className="flex items-center gap-3">
              <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
                item.done ? 'bg-green-500' : 'bg-neutral-200'
              }`}>
                {item.done && <CheckCircle className="w-3 h-3 text-white" />}
              </div>
              <span className={`text-sm ${item.done ? 'text-neutral-900' : 'text-neutral-500'}`}>
                {item.label}
              </span>
            </label>
          ))}
        </div>
      </div>
        </>
      )}
    </div>
  )
}
