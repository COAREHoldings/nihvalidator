import { useState } from 'react'
import type { ProjectSchemaV2, ModuleState } from '../types'
import { MODULE_DEFINITIONS, DIRECT_PHASE2_REQUIRED_FIELDS } from '../types'
import { Plus, Trash2, AlertTriangle } from 'lucide-react'

interface Props {
  project: ProjectSchemaV2
  moduleId: number
  moduleState: ModuleState
  onUpdate: (updates: Partial<ProjectSchemaV2>) => void
}

interface TextFieldProps {
  label: string
  value: string
  onChange: (val: string) => void
  required?: boolean
  multiline?: boolean
  placeholder?: string
}

function TextField({ label, value, onChange, required, multiline, placeholder }: TextFieldProps) {
  const populated = value?.trim().length > 0
  return (
    <div className="mb-4">
      <label className="block text-sm font-medium text-neutral-700 mb-1.5">
        {label} {required && <span className="text-semantic-error">*</span>}
        {populated && <span className="ml-2 text-xs text-semantic-success">(completed)</span>}
      </label>
      {multiline ? (
        <textarea
          value={value || ''}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          rows={4}
          className="w-full px-3 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 resize-y"
        />
      ) : (
        <input
          type="text"
          value={value || ''}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full px-3 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
      )}
    </div>
  )
}

interface NumberFieldProps {
  label: string
  value: number
  onChange: (val: number) => void
  required?: boolean
  prefix?: string
  suffix?: string
}

function NumberField({ label, value, onChange, required, prefix, suffix }: NumberFieldProps) {
  return (
    <div className="mb-4">
      <label className="block text-sm font-medium text-neutral-700 mb-1.5">
        {label} {required && <span className="text-semantic-error">*</span>}
      </label>
      <div className="flex items-center">
        {prefix && <span className="text-neutral-500 mr-2">{prefix}</span>}
        <input
          type="number"
          value={value || 0}
          onChange={e => onChange(parseFloat(e.target.value) || 0)}
          className="w-full px-3 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
        {suffix && <span className="text-neutral-500 ml-2">{suffix}</span>}
      </div>
    </div>
  )
}

export function ModuleEditor({ project, moduleId, moduleState, onUpdate }: Props) {
  const def = MODULE_DEFINITIONS.find(m => m.id === moduleId)
  
  const renderM1 = () => {
    const data = project.m1_title_concept
    const update = (field: string, value: string) => {
      onUpdate({ m1_title_concept: { ...data, [field]: value } })
    }
    return (
      <div>
        <TextField label="Project Title" value={data.project_title || ''} onChange={v => update('project_title', v)} required placeholder="Enter your project title" />
        <TextField label="Lay Summary" value={data.lay_summary || ''} onChange={v => update('lay_summary', v)} required multiline placeholder="Plain language summary for non-experts" />
        <TextField label="Scientific Abstract" value={data.scientific_abstract || ''} onChange={v => update('scientific_abstract', v)} required multiline placeholder="Technical summary of the project" />
        <TextField label="Problem Statement" value={data.problem_statement || ''} onChange={v => update('problem_statement', v)} required multiline placeholder="What problem does this address?" />
        <TextField label="Proposed Solution" value={data.proposed_solution || ''} onChange={v => update('proposed_solution', v)} required multiline placeholder="Your innovative solution" />
        <TextField label="Target Population" value={data.target_population || ''} onChange={v => update('target_population', v)} required placeholder="Who will benefit?" />
        <TextField label="Therapeutic Area" value={data.therapeutic_area || ''} onChange={v => update('therapeutic_area', v)} required placeholder="e.g., Oncology, Cardiology" />
        <TextField label="Technology Type" value={data.technology_type || ''} onChange={v => update('technology_type', v)} required placeholder="e.g., Drug, Device, Diagnostic" />
      </div>
    )
  }

  const renderM2 = () => {
    const data = project.m2_hypothesis
    const update = (field: string, value: string) => {
      onUpdate({ m2_hypothesis: { ...data, [field]: value } })
    }
    return (
      <div>
        <TextField label="Central Hypothesis" value={data.central_hypothesis || ''} onChange={v => update('central_hypothesis', v)} required multiline placeholder="Your main scientific hypothesis" />
        <TextField label="Supporting Rationale" value={data.supporting_rationale || ''} onChange={v => update('supporting_rationale', v)} required multiline placeholder="Evidence supporting your hypothesis" />
        <TextField label="Preliminary Data Summary" value={data.preliminary_data_summary || ''} onChange={v => update('preliminary_data_summary', v)} required multiline placeholder="Summary of existing data" />
        <TextField label="Expected Outcomes" value={data.expected_outcomes || ''} onChange={v => update('expected_outcomes', v)} required multiline placeholder="What results do you anticipate?" />
        <TextField label="Success Criteria" value={data.success_criteria || ''} onChange={v => update('success_criteria', v)} required multiline placeholder="How will you measure success?" />
      </div>
    )
  }

  const renderM3 = () => {
    const data = project.m3_specific_aims
    const update = (field: string, value: string | string[]) => {
      onUpdate({ m3_specific_aims: { ...data, [field]: value } })
    }
    return (
      <div>
        <TextField label="Aim 1 Statement" value={data.aim1_statement || ''} onChange={v => update('aim1_statement', v)} required multiline placeholder="First specific aim" />
        <TextField label="Aim 1 Milestones" value={(data.aim1_milestones || []).join('\n')} onChange={v => update('aim1_milestones', v.split('\n').filter(s => s.trim()))} required multiline placeholder="Enter milestones (one per line)" />
        <TextField label="Aim 2 Statement" value={data.aim2_statement || ''} onChange={v => update('aim2_statement', v)} required multiline placeholder="Second specific aim" />
        <TextField label="Aim 2 Milestones" value={(data.aim2_milestones || []).join('\n')} onChange={v => update('aim2_milestones', v.split('\n').filter(s => s.trim()))} required multiline placeholder="Enter milestones (one per line)" />
        <TextField label="Aim 3 Statement (Optional)" value={data.aim3_statement || ''} onChange={v => update('aim3_statement', v)} multiline placeholder="Third specific aim (if applicable)" />
        <TextField label="Timeline Summary" value={data.timeline_summary || ''} onChange={v => update('timeline_summary', v)} required multiline placeholder="Overall project timeline" />
        <TextField label="Aim Interdependencies" value={data.interdependencies || ''} onChange={v => update('interdependencies', v)} required multiline placeholder="How do the aims relate to each other?" />
      </div>
    )
  }

  const renderM4 = () => {
    const data = project.m4_team_mapping
    const update = (field: string, value: unknown) => {
      onUpdate({ m4_team_mapping: { ...data, [field]: value } })
    }
    const personnel = data.key_personnel || []
    
    const addPersonnel = () => {
      update('key_personnel', [...personnel, { name: '', role: '', expertise: '' }])
    }
    const removePersonnel = (idx: number) => {
      update('key_personnel', personnel.filter((_, i) => i !== idx))
    }
    const updatePersonnel = (idx: number, field: string, value: string) => {
      const updated = [...personnel]
      updated[idx] = { ...updated[idx], [field]: value }
      update('key_personnel', updated)
    }

    return (
      <div>
        <TextField label="Principal Investigator Name" value={data.pi_name || ''} onChange={v => update('pi_name', v)} required placeholder="Full name" />
        <TextField label="PI Qualifications" value={data.pi_qualifications || ''} onChange={v => update('pi_qualifications', v)} required multiline placeholder="Relevant experience and credentials" />
        
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-neutral-700">Key Personnel <span className="text-semantic-error">*</span></label>
            <button onClick={addPersonnel} className="flex items-center gap-1 text-sm text-primary-500 hover:text-primary-600">
              <Plus className="w-4 h-4" /> Add
            </button>
          </div>
          {personnel.length === 0 && (
            <p className="text-sm text-neutral-500 italic">No key personnel added yet</p>
          )}
          {personnel.map((p, idx) => (
            <div key={idx} className="p-3 bg-neutral-50 rounded-lg mb-2">
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium">Person {idx + 1}</span>
                <button onClick={() => removePersonnel(idx)} className="text-semantic-error hover:text-red-700">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <div className="grid md:grid-cols-3 gap-2">
                <input placeholder="Name" value={p.name} onChange={e => updatePersonnel(idx, 'name', e.target.value)} className="px-2 py-1.5 border rounded text-sm" />
                <input placeholder="Role" value={p.role} onChange={e => updatePersonnel(idx, 'role', e.target.value)} className="px-2 py-1.5 border rounded text-sm" />
                <input placeholder="Expertise" value={p.expertise} onChange={e => updatePersonnel(idx, 'expertise', e.target.value)} className="px-2 py-1.5 border rounded text-sm" />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  const renderM5 = () => {
    const data = project.m5_experimental_approach
    const update = (field: string, value: string) => {
      onUpdate({ m5_experimental_approach: { ...data, [field]: value } })
    }
    return (
      <div>
        <TextField label="Methodology Overview" value={data.methodology_overview || ''} onChange={v => update('methodology_overview', v)} required multiline />
        <TextField label="Experimental Design" value={data.experimental_design || ''} onChange={v => update('experimental_design', v)} required multiline />
        <TextField label="Data Collection Methods" value={data.data_collection_methods || ''} onChange={v => update('data_collection_methods', v)} required multiline />
        <TextField label="Analysis Plan" value={data.analysis_plan || ''} onChange={v => update('analysis_plan', v)} required multiline />
        <TextField label="Statistical Approach" value={data.statistical_approach || ''} onChange={v => update('statistical_approach', v)} required multiline />
        <TextField label="Expected Results" value={data.expected_results || ''} onChange={v => update('expected_results', v)} required multiline />
        <TextField label="Potential Pitfalls" value={data.potential_pitfalls || ''} onChange={v => update('potential_pitfalls', v)} required multiline />
        <TextField label="Alternative Approaches" value={data.alternative_approaches || ''} onChange={v => update('alternative_approaches', v)} required multiline />
      </div>
    )
  }

  const renderM6 = () => {
    const data = project.m6_budget
    const legacy = project.legacy_budget
    const updateField = (field: string, value: number | string) => {
      onUpdate({ 
        m6_budget: { ...data, [field]: value },
        legacy_budget: {
          ...legacy,
          directCosts: field === 'direct_costs_total' ? value as number : legacy.directCosts,
          personnelCosts: field === 'personnel_costs' ? value as number : legacy.personnelCosts,
          subawardCosts: field === 'subaward_costs' ? value as number : legacy.subawardCosts,
          smallBusinessPercent: field === 'small_business_percent' ? value as number : legacy.smallBusinessPercent,
          researchInstitutionPercent: field === 'research_institution_percent' ? value as number : legacy.researchInstitutionPercent
        }
      })
    }
    return (
      <div>
        <NumberField label="Total Direct Costs" value={data.direct_costs_total || legacy.directCosts || 0} onChange={v => updateField('direct_costs_total', v)} required prefix="$" />
        <NumberField label="Personnel Costs" value={data.personnel_costs || legacy.personnelCosts || 0} onChange={v => updateField('personnel_costs', v)} required prefix="$" />
        <NumberField label="Equipment Costs" value={data.equipment_costs || 0} onChange={v => updateField('equipment_costs', v)} prefix="$" />
        <NumberField label="Supplies Costs" value={data.supplies_costs || 0} onChange={v => updateField('supplies_costs', v)} prefix="$" />
        <NumberField label="Travel Costs" value={data.travel_costs || 0} onChange={v => updateField('travel_costs', v)} prefix="$" />
        <NumberField label="Subaward Costs" value={data.subaward_costs || legacy.subawardCosts || 0} onChange={v => updateField('subaward_costs', v)} prefix="$" />
        <NumberField label="Small Business %" value={data.small_business_percent || legacy.smallBusinessPercent || 67} onChange={v => updateField('small_business_percent', v)} required suffix="%" />
        {project.program_type === 'STTR' && (
          <NumberField label="Research Institution %" value={data.research_institution_percent || legacy.researchInstitutionPercent || 0} onChange={v => updateField('research_institution_percent', v)} required suffix="%" />
        )}
        <TextField label="Budget Justification" value={data.budget_justification || ''} onChange={v => onUpdate({ m6_budget: { ...data, budget_justification: v } })} required multiline placeholder="Justify your budget allocations" />
      </div>
    )
  }

  const renderM7 = () => {
    const data = project.m7_regulatory
    const update = (field: string, value: unknown) => {
      onUpdate({ m7_regulatory: { ...data, [field]: value } })
    }
    return (
      <div>
        <div className="mb-4">
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={data.human_subjects_involved || false} onChange={e => update('human_subjects_involved', e.target.checked)} className="w-4 h-4" />
            <span className="text-sm font-medium text-neutral-700">Human Subjects Involved</span>
          </label>
          {data.human_subjects_involved && (
            <TextField label="IRB Approval Status" value={data.irb_approval_status || ''} onChange={v => update('irb_approval_status', v)} placeholder="Approved, Pending, N/A" />
          )}
        </div>
        <div className="mb-4">
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={data.vertebrate_animals_involved || false} onChange={e => update('vertebrate_animals_involved', e.target.checked)} className="w-4 h-4" />
            <span className="text-sm font-medium text-neutral-700">Vertebrate Animals Involved</span>
          </label>
          {data.vertebrate_animals_involved && (
            <TextField label="IACUC Approval Status" value={data.iacuc_approval_status || ''} onChange={v => update('iacuc_approval_status', v)} placeholder="Approved, Pending, N/A" />
          )}
        </div>
        <div className="mb-4">
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={data.biohazards_involved || false} onChange={e => update('biohazards_involved', e.target.checked)} className="w-4 h-4" />
            <span className="text-sm font-medium text-neutral-700">Biohazards Involved</span>
          </label>
          {data.biohazards_involved && (
            <TextField label="IBC Approval Status" value={data.ibc_approval_status || ''} onChange={v => update('ibc_approval_status', v)} placeholder="Approved, Pending, N/A" />
          )}
        </div>
        <TextField label="Facilities Description" value={data.facilities_description || ''} onChange={v => update('facilities_description', v)} required multiline placeholder="Describe available facilities and equipment" />
        <TextField label="Letters of Support" value={(data.letters_of_support || []).join('\n')} onChange={v => update('letters_of_support', v.split('\n').filter(s => s.trim()))} multiline placeholder="List letters of support (one per line)" />
      </div>
    )
  }

  const renderM8 = () => {
    const data = project.m8_compilation
    const update = (field: string, value: unknown) => {
      onUpdate({ m8_compilation: { ...data, [field]: value } })
    }
    
    if (moduleState.locked) {
      return (
        <div className="p-6 bg-neutral-50 rounded-lg text-center">
          <AlertTriangle className="w-12 h-12 text-neutral-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-neutral-700 mb-2">Module Locked</h3>
          <p className="text-neutral-500">Complete Modules 1-7 to unlock the Compilation & Review module.</p>
        </div>
      )
    }

    const checklistItems = [
      'All specific aims defined',
      'Budget within NIH caps',
      'Team qualifications documented',
      'Regulatory approvals addressed',
      'Page limits verified',
      'Format requirements met'
    ]

    return (
      <div>
        <h4 className="text-sm font-semibold text-neutral-700 mb-3">Final Review Checklist</h4>
        {checklistItems.map(item => (
          <label key={item} className="flex items-center gap-2 mb-2">
            <input
              type="checkbox"
              checked={(data.final_review_checklist || {})[item] || false}
              onChange={e => update('final_review_checklist', { ...data.final_review_checklist, [item]: e.target.checked })}
              className="w-4 h-4"
            />
            <span className="text-sm text-neutral-700">{item}</span>
          </label>
        ))}
        <div className="mt-4 grid md:grid-cols-3 gap-4">
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={data.page_limit_compliance || false} onChange={e => update('page_limit_compliance', e.target.checked)} className="w-4 h-4" />
            <span className="text-sm text-neutral-700">Page Limits OK</span>
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={data.format_compliance || false} onChange={e => update('format_compliance', e.target.checked)} className="w-4 h-4" />
            <span className="text-sm text-neutral-700">Format OK</span>
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={data.submission_readiness || false} onChange={e => update('submission_readiness', e.target.checked)} className="w-4 h-4" />
            <span className="text-sm text-neutral-700">Ready to Submit</span>
          </label>
        </div>
        <TextField label="Reviewer Notes" value={data.reviewer_notes || ''} onChange={v => update('reviewer_notes', v)} multiline placeholder="Any notes for internal review" />
      </div>
    )
  }

  const renderDirectPhase2 = () => {
    if (project.grant_type !== 'Direct to Phase II') return null
    const data = project.direct_phase2_feasibility
    const update = (field: string, value: string) => {
      onUpdate({ direct_phase2_feasibility: { ...data, [field]: value } })
    }
    return (
      <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
        <h4 className="font-semibold text-amber-800 mb-4 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5" /> Direct to Phase II Feasibility Evidence
        </h4>
        <p className="text-sm text-amber-700 mb-4">These fields are required for Direct to Phase II applications (no prior SBIR/STTR award).</p>
        <TextField label="Preliminary Data Summary" value={data.preliminary_data_summary || ''} onChange={v => update('preliminary_data_summary', v)} required multiline />
        <TextField label="Proof of Feasibility Results" value={data.proof_of_feasibility_results || ''} onChange={v => update('proof_of_feasibility_results', v)} required multiline />
        <TextField label="Technical Feasibility Evidence" value={data.technical_feasibility_evidence || ''} onChange={v => update('technical_feasibility_evidence', v)} required multiline />
        <TextField label="Risk Reduction Data" value={data.risk_reduction_data || ''} onChange={v => update('risk_reduction_data', v)} required multiline />
        <TextField label="Rationale for Skipping Phase I" value={data.rationale_for_skipping_phase1 || ''} onChange={v => update('rationale_for_skipping_phase1', v)} required multiline />
        <TextField label="Commercialization Readiness Statement" value={data.commercialization_readiness_statement || ''} onChange={v => update('commercialization_readiness_statement', v)} required multiline />
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-neutral-900">{def?.name}</h2>
        <p className="text-sm text-neutral-500 mt-1">
          {moduleState.completed_fields.length} of {moduleState.required_fields.length} required fields completed
        </p>
      </div>
      
      {moduleId === 1 && renderM1()}
      {moduleId === 2 && renderM2()}
      {moduleId === 3 && renderM3()}
      {moduleId === 4 && renderM4()}
      {moduleId === 5 && renderM5()}
      {moduleId === 6 && renderM6()}
      {moduleId === 7 && renderM7()}
      {moduleId === 8 && renderM8()}
      
      {moduleId === 2 && renderDirectPhase2()}
    </div>
  )
}
