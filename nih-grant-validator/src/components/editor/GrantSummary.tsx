import { useState } from 'react'
import { FileText, Download, ChevronDown, ChevronUp, Edit2, Check, X, FileOutput } from 'lucide-react'
import type { ProjectSchemaV2 } from '../../types'

interface GrantSummaryProps {
  project: ProjectSchemaV2
  onUpdate: (updates: Partial<ProjectSchemaV2>) => void
}

interface EditableFieldProps {
  label: string
  value: string
  onSave: (value: string) => void
  multiline?: boolean
}

function EditableField({ label, value, onSave, multiline = false }: EditableFieldProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState(value)

  const handleSave = () => {
    onSave(editValue)
    setIsEditing(false)
  }

  const handleCancel = () => {
    setEditValue(value)
    setIsEditing(false)
  }

  if (isEditing) {
    return (
      <div className="mb-4">
        <label className="block text-sm font-medium text-neutral-700 mb-1">{label}</label>
        {multiline ? (
          <textarea
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            className="w-full px-3 py-2 border border-primary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            rows={4}
            autoFocus
          />
        ) : (
          <input
            type="text"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            className="w-full px-3 py-2 border border-primary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            autoFocus
          />
        )}
        <div className="flex gap-2 mt-2">
          <button onClick={handleSave} className="flex items-center gap-1 px-3 py-1 bg-green-500 text-white rounded text-sm hover:bg-green-600">
            <Check className="w-4 h-4" /> Save
          </button>
          <button onClick={handleCancel} className="flex items-center gap-1 px-3 py-1 bg-neutral-200 text-neutral-700 rounded text-sm hover:bg-neutral-300">
            <X className="w-4 h-4" /> Cancel
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="mb-4 group">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-neutral-700 mb-1">{label}</label>
        <button
          onClick={() => setIsEditing(true)}
          className="opacity-0 group-hover:opacity-100 p-1 text-neutral-400 hover:text-primary-500 transition-opacity"
        >
          <Edit2 className="w-4 h-4" />
        </button>
      </div>
      <p className={`text-sm ${value ? 'text-neutral-900' : 'text-neutral-400 italic'}`}>
        {value || 'Not provided'}
      </p>
    </div>
  )
}

interface CollapsibleSectionProps {
  title: string
  icon: React.ReactNode
  children: React.ReactNode
  defaultExpanded?: boolean
  completionStatus?: 'complete' | 'partial' | 'incomplete'
}

function CollapsibleSection({ title, icon, children, defaultExpanded = true, completionStatus }: CollapsibleSectionProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded)

  const statusColors = {
    complete: 'bg-green-100 text-green-800',
    partial: 'bg-amber-100 text-amber-800',
    incomplete: 'bg-neutral-100 text-neutral-600'
  }

  return (
    <div className="border border-neutral-200 rounded-lg overflow-hidden mb-4">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 bg-neutral-50 flex items-center justify-between hover:bg-neutral-100 transition-colors"
      >
        <div className="flex items-center gap-3">
          {icon}
          <span className="font-semibold text-neutral-900">{title}</span>
          {completionStatus && (
            <span className={`text-xs px-2 py-0.5 rounded ${statusColors[completionStatus]}`}>
              {completionStatus}
            </span>
          )}
        </div>
        {isExpanded ? <ChevronUp className="w-5 h-5 text-neutral-400" /> : <ChevronDown className="w-5 h-5 text-neutral-400" />}
      </button>
      {isExpanded && (
        <div className="p-4 bg-white">
          {children}
        </div>
      )}
    </div>
  )
}

export function GrantSummary({ project, onUpdate }: GrantSummaryProps) {
  const [isExporting, setIsExporting] = useState(false)

  const showCommercializationModule = project.grant_type && 
    ['Phase II', 'Fast Track', 'Direct to Phase II', 'Phase IIB'].includes(project.grant_type)

  const m1 = project.m1_title_concept || {}
  const m2 = project.m2_hypothesis || {}
  const m3 = project.m3_specific_aims || {}
  const m4 = project.m4_team_mapping || {}
  const m5 = project.m5_experimental_approach || {}
  const m6 = project.m6_budget || {}
  const m7 = project.m7_regulatory || {}
  const m9 = project.m9_commercialization || {}

  // Calculate section completion
  const getCompletionStatus = (fields: (string | undefined)[]): 'complete' | 'partial' | 'incomplete' => {
    const filled = fields.filter(f => f && f.trim()).length
    if (filled === fields.length) return 'complete'
    if (filled > 0) return 'partial'
    return 'incomplete'
  }

  const coreConceptStatus = getCompletionStatus([
    m1.project_title, m1.scientific_abstract, m2.central_hypothesis, m3.aims?.[0]?.statement
  ])
  
  const researchPlanStatus = getCompletionStatus([
    m5.methodology_overview, m5.experimental_design, m7.facilities_description
  ])
  
  const teamBudgetStatus = getCompletionStatus([
    m4.pi_name, m4.pi_qualifications, m6.budget_justification
  ])

  // Generate compiled document text
  const generateCompiledText = (): string => {
    let text = `NIH ${project.program_type} ${project.grant_type || ''} Grant Application\n`
    text += `${'='.repeat(60)}\n\n`

    // Core Concept
    text += `CORE CONCEPT\n${'-'.repeat(40)}\n\n`
    text += `Project Title: ${m1.project_title || 'Not provided'}\n\n`
    text += `Lay Summary:\n${m1.lay_summary || 'Not provided'}\n\n`
    text += `Scientific Abstract:\n${m1.scientific_abstract || 'Not provided'}\n\n`
    text += `Problem Statement:\n${m1.problem_statement || 'Not provided'}\n\n`
    text += `Proposed Solution:\n${m1.proposed_solution || 'Not provided'}\n\n`
    text += `Central Hypothesis:\n${m2.central_hypothesis || 'Not provided'}\n\n`
    text += `Supporting Rationale:\n${m2.supporting_rationale || 'Not provided'}\n\n`
    
    // Specific Aims
    text += `\nSPECIFIC AIMS\n${'-'.repeat(40)}\n\n`
    if (m3.aims && m3.aims.length > 0) {
      m3.aims.forEach((aim, idx) => {
        text += `Aim ${idx + 1}: ${aim.statement || 'Not provided'}\n`
        if (aim.milestones?.length) {
          text += `Milestones: ${aim.milestones.join(', ')}\n`
        }
        if (aim.timeline) {
          text += `Timeline: ${aim.timeline}\n`
        }
        text += `\n`
      })
    } else {
      text += `No aims defined yet.\n\n`
    }
    text += `Timeline Summary:\n${m3.timeline_summary || 'Not provided'}\n`

    // Research Plan
    text += `\n\nRESEARCH PLAN\n${'-'.repeat(40)}\n\n`
    text += `Methodology Overview:\n${m5.methodology_overview || 'Not provided'}\n\n`
    text += `Experimental Design:\n${m5.experimental_design || 'Not provided'}\n\n`
    text += `Data Collection Methods:\n${m5.data_collection_methods || 'Not provided'}\n\n`
    text += `Analysis Plan:\n${m5.analysis_plan || 'Not provided'}\n\n`
    text += `Statistical Approach:\n${m5.statistical_approach || 'Not provided'}\n\n`
    text += `Expected Results:\n${m5.expected_results || 'Not provided'}\n\n`
    text += `Potential Pitfalls:\n${m5.potential_pitfalls || 'Not provided'}\n\n`
    text += `Alternative Approaches:\n${m5.alternative_approaches || 'Not provided'}\n`

    // Team & Budget
    text += `\n\nTEAM & BUDGET\n${'-'.repeat(40)}\n\n`
    text += `Principal Investigator: ${m4.pi_name || 'Not provided'}\n`
    text += `PI Qualifications:\n${m4.pi_qualifications || 'Not provided'}\n\n`
    if (m4.key_personnel?.length) {
      text += `Key Personnel:\n`
      m4.key_personnel.forEach(p => {
        text += `  - ${p.name} (${p.role}): ${p.expertise}\n`
      })
      text += '\n'
    }
    text += `Total Project Costs: $${(m6.total_project_costs || 0).toLocaleString()}\n`
    text += `Direct Costs: $${(m6.direct_costs_total || 0).toLocaleString()}\n`
    text += `Indirect Costs: $${(m6.indirect_costs || 0).toLocaleString()}\n\n`
    text += `Budget Justification:\n${m6.budget_justification || 'Not provided'}\n`

    // Regulatory
    text += `\n\nREGULATORY REQUIREMENTS\n${'-'.repeat(40)}\n\n`
    text += `Human Subjects: ${m7.human_subjects_involved ? 'Yes' : 'No'}\n`
    if (m7.human_subjects_involved) {
      text += `IRB Status: ${m7.irb_approval_status || 'Not specified'}\n`
    }
    text += `Vertebrate Animals: ${m7.vertebrate_animals_involved ? 'Yes' : 'No'}\n`
    if (m7.vertebrate_animals_involved) {
      text += `IACUC Status: ${m7.iacuc_approval_status || 'Not specified'}\n`
    }
    text += `\nFacilities Description:\n${m7.facilities_description || 'Not provided'}\n`

    // Commercialization Plan (Phase II+)
    if (showCommercializationModule) {
      text += `\n\nCOMMERCIALIZATION PLAN\n${'-'.repeat(40)}\n\n`
      const s1 = m9.section1_value || {}
      const s2 = m9.section2_company || {}
      const s3 = m9.section3_market || {}
      const s4 = m9.section4_ip || {}
      const s5 = m9.section5_finance || {}
      const s6 = m9.section6_revenue || {}

      text += `1. Value & Outcomes:\n${s1.product_service_description || 'Not provided'}\n\n`
      text += `2. Company:\n${s2.management_team || 'Not provided'}\n\n`
      text += `3. Market Analysis:\n${s3.market_size_assumptions || 'Not provided'}\n\n`
      text += `4. IP Protection:\n${s4.patents_filed_issued || 'Not provided'}\n\n`
      text += `5. Finance Plan:\n${s5.total_capital_required || 'Not provided'}\n\n`
      text += `6. Revenue Model:\n${s6.revenue_model || 'Not provided'}\n`
    }

    return text
  }

  // Export to Word (DOCX simulation - downloads as formatted text that can be opened in Word)
  const handleExportWord = async () => {
    setIsExporting(true)
    try {
      const text = generateCompiledText()
      const blob = new Blob([text], { type: 'application/msword' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${(m1.project_title || 'grant-application').replace(/\s+/g, '-').toLowerCase()}-compiled.doc`
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setIsExporting(false)
    }
  }

  // Export to PDF (uses print-to-PDF approach)
  const handleExportPDF = () => {
    setIsExporting(true)
    const printWindow = window.open('', '_blank')
    if (printWindow) {
      const text = generateCompiledText()
      printWindow.document.write(`
        <html>
          <head>
            <title>${m1.project_title || 'Grant Application'} - Compiled Summary</title>
            <style>
              body { font-family: 'Times New Roman', serif; font-size: 12pt; line-height: 1.6; padding: 40px; max-width: 800px; margin: 0 auto; }
              h1 { font-size: 16pt; border-bottom: 2px solid #333; padding-bottom: 10px; }
              h2 { font-size: 14pt; margin-top: 30px; color: #333; }
              pre { white-space: pre-wrap; word-wrap: break-word; font-family: 'Times New Roman', serif; }
            </style>
          </head>
          <body>
            <pre>${text}</pre>
            <script>window.onload = function() { window.print(); }</script>
          </body>
        </html>
      `)
      printWindow.document.close()
    }
    setIsExporting(false)
  }

  return (
    <div className="space-y-6">
      {/* Export Buttons */}
      <div className="bg-gradient-to-r from-primary-50 to-blue-50 rounded-xl border border-primary-200 p-4">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <FileText className="w-6 h-6 text-primary-600" />
            <div>
              <h3 className="font-semibold text-neutral-900">Compiled Grant Summary</h3>
              <p className="text-sm text-neutral-600">Review, edit, and export your complete application</p>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleExportPDF}
              disabled={isExporting}
              className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50 transition-colors"
            >
              <FileOutput className="w-4 h-4" />
              Export PDF
            </button>
            <button
              onClick={handleExportWord}
              disabled={isExporting}
              className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 transition-colors"
            >
              <Download className="w-4 h-4" />
              Export Word
            </button>
          </div>
        </div>
      </div>

      {/* Grant Type Banner */}
      <div className="bg-white rounded-lg border border-neutral-200 p-4 flex items-center justify-between">
        <div>
          <span className="text-sm text-neutral-500">Application Type</span>
          <p className="font-semibold text-lg text-neutral-900">
            NIH {project.program_type} {project.grant_type || '(Not Selected)'}
          </p>
        </div>
        <div className="text-right">
          <span className="text-sm text-neutral-500">Institute</span>
          <p className="font-semibold text-neutral-900">{project.institute || 'Standard NIH'}</p>
        </div>
      </div>

      {/* Core Concept Section */}
      <CollapsibleSection
        title="Core Concept"
        icon={<FileText className="w-5 h-5 text-blue-500" />}
        completionStatus={coreConceptStatus}
      >
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-medium text-neutral-700 mb-3 pb-2 border-b">Title & Overview</h4>
            <EditableField
              label="Project Title"
              value={m1.project_title || ''}
              onSave={(v) => onUpdate({ m1_title_concept: { ...m1, project_title: v } })}
            />
            <EditableField
              label="Lay Summary"
              value={m1.lay_summary || ''}
              onSave={(v) => onUpdate({ m1_title_concept: { ...m1, lay_summary: v } })}
              multiline
            />
            <EditableField
              label="Scientific Abstract"
              value={m1.scientific_abstract || ''}
              onSave={(v) => onUpdate({ m1_title_concept: { ...m1, scientific_abstract: v } })}
              multiline
            />
          </div>
          <div>
            <h4 className="font-medium text-neutral-700 mb-3 pb-2 border-b">Problem & Solution</h4>
            <EditableField
              label="Problem Statement"
              value={m1.problem_statement || ''}
              onSave={(v) => onUpdate({ m1_title_concept: { ...m1, problem_statement: v } })}
              multiline
            />
            <EditableField
              label="Proposed Solution"
              value={m1.proposed_solution || ''}
              onSave={(v) => onUpdate({ m1_title_concept: { ...m1, proposed_solution: v } })}
              multiline
            />
            <EditableField
              label="Central Hypothesis"
              value={m2.central_hypothesis || ''}
              onSave={(v) => onUpdate({ m2_hypothesis: { ...m2, central_hypothesis: v } })}
              multiline
            />
          </div>
        </div>

        {/* Specific Aims */}
        <div className="mt-6 pt-4 border-t">
          <h4 className="font-medium text-neutral-700 mb-3">Specific Aims</h4>
          <div className="space-y-4">
            {(m3.aims || []).map((aim, idx) => (
              <EditableField
                key={aim.id || idx}
                label={`Aim ${idx + 1}`}
                value={aim.statement || ''}
                onSave={(v) => {
                  const updatedAims = [...(m3.aims || [])]
                  updatedAims[idx] = { ...updatedAims[idx], statement: v }
                  onUpdate({ m3_specific_aims: { ...m3, aims: updatedAims } })
                }}
                multiline
              />
            ))}
            {(!m3.aims || m3.aims.length === 0) && (
              <p className="text-sm text-neutral-500 italic">No aims defined yet.</p>
            )}
            <EditableField
              label="Timeline Summary"
              value={m3.timeline_summary || ''}
              onSave={(v) => onUpdate({ m3_specific_aims: { ...m3, timeline_summary: v } })}
              multiline
            />
          </div>
        </div>
      </CollapsibleSection>

      {/* Research Plan Section */}
      <CollapsibleSection
        title="Research Plan"
        icon={<FileText className="w-5 h-5 text-green-500" />}
        completionStatus={researchPlanStatus}
      >
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-medium text-neutral-700 mb-3 pb-2 border-b">Methodology</h4>
            <EditableField
              label="Methodology Overview"
              value={m5.methodology_overview || ''}
              onSave={(v) => onUpdate({ m5_experimental_approach: { ...m5, methodology_overview: v } })}
              multiline
            />
            <EditableField
              label="Experimental Design"
              value={m5.experimental_design || ''}
              onSave={(v) => onUpdate({ m5_experimental_approach: { ...m5, experimental_design: v } })}
              multiline
            />
            <EditableField
              label="Statistical Approach"
              value={m5.statistical_approach || ''}
              onSave={(v) => onUpdate({ m5_experimental_approach: { ...m5, statistical_approach: v } })}
              multiline
            />
          </div>
          <div>
            <h4 className="font-medium text-neutral-700 mb-3 pb-2 border-b">Analysis & Results</h4>
            <EditableField
              label="Data Collection Methods"
              value={m5.data_collection_methods || ''}
              onSave={(v) => onUpdate({ m5_experimental_approach: { ...m5, data_collection_methods: v } })}
              multiline
            />
            <EditableField
              label="Analysis Plan"
              value={m5.analysis_plan || ''}
              onSave={(v) => onUpdate({ m5_experimental_approach: { ...m5, analysis_plan: v } })}
              multiline
            />
            <EditableField
              label="Expected Results"
              value={m5.expected_results || ''}
              onSave={(v) => onUpdate({ m5_experimental_approach: { ...m5, expected_results: v } })}
              multiline
            />
          </div>
        </div>

        {/* Pitfalls & Alternatives */}
        <div className="mt-6 pt-4 border-t grid md:grid-cols-2 gap-6">
          <EditableField
            label="Potential Pitfalls"
            value={m5.potential_pitfalls || ''}
            onSave={(v) => onUpdate({ m5_experimental_approach: { ...m5, potential_pitfalls: v } })}
            multiline
          />
          <EditableField
            label="Alternative Approaches"
            value={m5.alternative_approaches || ''}
            onSave={(v) => onUpdate({ m5_experimental_approach: { ...m5, alternative_approaches: v } })}
            multiline
          />
        </div>

        {/* Regulatory */}
        <div className="mt-6 pt-4 border-t">
          <h4 className="font-medium text-neutral-700 mb-3">Regulatory & Facilities</h4>
          <EditableField
            label="Facilities Description"
            value={m7.facilities_description || ''}
            onSave={(v) => onUpdate({ m7_regulatory: { ...m7, facilities_description: v } })}
            multiline
          />
        </div>
      </CollapsibleSection>

      {/* Team & Budget Section */}
      <CollapsibleSection
        title="Team & Budget"
        icon={<FileText className="w-5 h-5 text-purple-500" />}
        completionStatus={teamBudgetStatus}
      >
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-medium text-neutral-700 mb-3 pb-2 border-b">Team</h4>
            <EditableField
              label="Principal Investigator"
              value={m4.pi_name || ''}
              onSave={(v) => onUpdate({ m4_team_mapping: { ...m4, pi_name: v } })}
            />
            <EditableField
              label="PI Qualifications"
              value={m4.pi_qualifications || ''}
              onSave={(v) => onUpdate({ m4_team_mapping: { ...m4, pi_qualifications: v } })}
              multiline
            />
            
            {/* Key Personnel List */}
            {m4.key_personnel && m4.key_personnel.length > 0 && (
              <div className="mt-4">
                <label className="block text-sm font-medium text-neutral-700 mb-2">Key Personnel</label>
                <div className="space-y-2">
                  {m4.key_personnel.map((person, idx) => (
                    <div key={idx} className="p-2 bg-neutral-50 rounded text-sm">
                      <span className="font-medium">{person.name}</span> - {person.role}
                      <p className="text-neutral-600 text-xs">{person.expertise}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          <div>
            <h4 className="font-medium text-neutral-700 mb-3 pb-2 border-b">Budget</h4>
            <div className="space-y-3">
              <div className="flex justify-between py-2 border-b border-neutral-100">
                <span className="text-sm text-neutral-600">Total Project Costs</span>
                <span className="font-semibold">${(m6.total_project_costs || 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-neutral-100">
                <span className="text-sm text-neutral-600">Direct Costs</span>
                <span className="font-medium">${(m6.direct_costs_total || 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-neutral-100">
                <span className="text-sm text-neutral-600">Indirect Costs (F&A)</span>
                <span className="font-medium">${(m6.indirect_costs || 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-sm text-neutral-600">Small Business %</span>
                <span className="font-medium">{m6.small_business_percent || 0}%</span>
              </div>
            </div>
            
            <div className="mt-4">
              <EditableField
                label="Budget Justification"
                value={m6.budget_justification || ''}
                onSave={(v) => onUpdate({ m6_budget: { ...m6, budget_justification: v } })}
                multiline
              />
            </div>
          </div>
        </div>
      </CollapsibleSection>

      {/* Commercialization Plan (Phase II/Fast Track only) */}
      {showCommercializationModule && (
        <CollapsibleSection
          title="Commercialization Plan"
          icon={<FileText className="w-5 h-5 text-amber-500" />}
          completionStatus={m9.section1_value?.product_service_description ? 'partial' : 'incomplete'}
        >
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
            <p className="text-sm text-amber-700">
              <strong>Required for {project.grant_type}:</strong> A 12-page commercialization plan following NIH's required sections.
            </p>
          </div>
          
          <div className="space-y-6">
            <div>
              <h4 className="font-medium text-neutral-700 mb-3">1. Value of SBIR/STTR Project & Expected Outcomes</h4>
              <EditableField
                label="Product/Service Description"
                value={m9.section1_value?.product_service_description || ''}
                onSave={(v) => onUpdate({ 
                  m9_commercialization: { 
                    ...m9, 
                    section1_value: { ...m9.section1_value, product_service_description: v } 
                  } 
                })}
                multiline
              />
              <EditableField
                label="Unmet Need"
                value={m9.section1_value?.unmet_need || ''}
                onSave={(v) => onUpdate({ 
                  m9_commercialization: { 
                    ...m9, 
                    section1_value: { ...m9.section1_value, unmet_need: v } 
                  } 
                })}
                multiline
              />
            </div>

            <div>
              <h4 className="font-medium text-neutral-700 mb-3">2. Company</h4>
              <EditableField
                label="Management Team"
                value={m9.section2_company?.management_team || ''}
                onSave={(v) => onUpdate({ 
                  m9_commercialization: { 
                    ...m9, 
                    section2_company: { ...m9.section2_company, management_team: v } 
                  } 
                })}
                multiline
              />
            </div>

            <div>
              <h4 className="font-medium text-neutral-700 mb-3">3. Market, Customer & Competition</h4>
              <EditableField
                label="Market Size & Assumptions"
                value={m9.section3_market?.market_size_assumptions || ''}
                onSave={(v) => onUpdate({ 
                  m9_commercialization: { 
                    ...m9, 
                    section3_market: { ...m9.section3_market, market_size_assumptions: v } 
                  } 
                })}
                multiline
              />
            </div>

            <div>
              <h4 className="font-medium text-neutral-700 mb-3">4. Intellectual Property</h4>
              <EditableField
                label="Patents Filed/Issued"
                value={m9.section4_ip?.patents_filed_issued || ''}
                onSave={(v) => onUpdate({ 
                  m9_commercialization: { 
                    ...m9, 
                    section4_ip: { ...m9.section4_ip, patents_filed_issued: v } 
                  } 
                })}
                multiline
              />
            </div>

            <div>
              <h4 className="font-medium text-neutral-700 mb-3">5. Finance Plan</h4>
              <EditableField
                label="Total Capital Required"
                value={m9.section5_finance?.total_capital_required || ''}
                onSave={(v) => onUpdate({ 
                  m9_commercialization: { 
                    ...m9, 
                    section5_finance: { ...m9.section5_finance, total_capital_required: v } 
                  } 
                })}
                multiline
              />
            </div>

            <div>
              <h4 className="font-medium text-neutral-700 mb-3">6. Revenue Stream</h4>
              <EditableField
                label="Revenue Model"
                value={m9.section6_revenue?.revenue_model || ''}
                onSave={(v) => onUpdate({ 
                  m9_commercialization: { 
                    ...m9, 
                    section6_revenue: { ...m9.section6_revenue, revenue_model: v } 
                  } 
                })}
                multiline
              />
            </div>
          </div>
        </CollapsibleSection>
      )}
    </div>
  )
}
