import { FlaskConical, ClipboardList, Shield, AlertTriangle } from 'lucide-react'
import type { ProjectSchemaV2 } from '../../types'
import { TextField, CheckboxField } from '../shared/FormField'

interface StepResearchPlanProps {
  project: ProjectSchemaV2
  onUpdate: (updates: Partial<ProjectSchemaV2>) => void
}

export function StepResearchPlan({ project, onUpdate }: StepResearchPlanProps) {
  const isFastTrack = project.grant_type === 'Fast Track'
  const isPhaseI = project.grant_type === 'Phase I'

  // M5: Experimental Approach
  const m5 = project.m5_experimental_approach
  const updateM5 = (field: string, value: string) => {
    onUpdate({ m5_experimental_approach: { ...m5, [field]: value } })
  }

  // M5 Fast Track
  const m5ft = project.m5_fast_track

  const updateFastTrackApproach = (phase: 'phase1' | 'phase2', field: string, value: string) => {
    const currentPhase = m5ft[phase]
    const updatedPhase = { ...currentPhase, [field]: value }
    
    const isComplete = !!(
      updatedPhase.methodology_overview?.trim() &&
      updatedPhase.experimental_design?.trim() &&
      updatedPhase.data_collection_methods?.trim() &&
      updatedPhase.analysis_plan?.trim()
    )
    
    onUpdate({
      m5_fast_track: {
        ...m5ft,
        [phase]: updatedPhase,
        [`${phase}_complete`]: isComplete
      }
    })
  }

  // M7: Regulatory
  const m7 = project.m7_regulatory
  const updateM7 = (field: string, value: unknown) => {
    onUpdate({ m7_regulatory: { ...m7, [field]: value } })
  }

  // Phase I Commercialization Discussion
  const p1Comm = project.phase1_commercialization || {}
  const updateP1Comm = (field: string, value: string) => {
    onUpdate({ phase1_commercialization: { ...p1Comm, [field]: value } })
  }

  const renderExperimentalApproach = (
    data: Partial<typeof m5>,
    updateFn: (field: string, value: string) => void,
    phaseLabel?: string
  ) => (
    <div className="space-y-4">
      {phaseLabel && (
        <div className="flex items-center gap-2 mb-4">
          <span className={`px-3 py-1 text-sm font-medium rounded-full ${
            phaseLabel === 'Phase I' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
          }`}>
            {phaseLabel}
          </span>
          <span className="text-sm text-neutral-500">
            {phaseLabel === 'Phase I' ? 'Feasibility Methods' : 'Full-Scale Development Methods'}
          </span>
        </div>
      )}

      <TextField
        label="Methodology Overview"
        value={data.methodology_overview || ''}
        onChange={v => updateFn('methodology_overview', v)}
        required
        multiline
        rows={3}
        placeholder="Describe your overall research methodology"
      />

      <TextField
        label="Experimental Design"
        value={data.experimental_design || ''}
        onChange={v => updateFn('experimental_design', v)}
        required
        multiline
        rows={3}
        placeholder="Detail your experimental design and controls"
      />

      <div className="grid md:grid-cols-2 gap-4">
        <TextField
          label="Data Collection Methods"
          value={data.data_collection_methods || ''}
          onChange={v => updateFn('data_collection_methods', v)}
          required
          multiline
          rows={3}
          placeholder="How will data be collected?"
        />

        <TextField
          label="Analysis Plan"
          value={data.analysis_plan || ''}
          onChange={v => updateFn('analysis_plan', v)}
          required
          multiline
          rows={3}
          placeholder="How will data be analyzed?"
        />
      </div>

      <TextField
        label="Statistical Approach"
        value={data.statistical_approach || ''}
        onChange={v => updateFn('statistical_approach', v)}
        required
        multiline
        rows={3}
        placeholder="Include power analysis, sample size justification"
        helpText="NIH requires statistical rigor - include power analysis (typically >=80%) and sample size calculations"
      />

      <TextField
        label="Expected Results"
        value={data.expected_results || ''}
        onChange={v => updateFn('expected_results', v)}
        required
        multiline
        rows={3}
        placeholder="What results do you anticipate?"
      />

      <div className="grid md:grid-cols-2 gap-4">
        <TextField
          label="Potential Pitfalls"
          value={data.potential_pitfalls || ''}
          onChange={v => updateFn('potential_pitfalls', v)}
          required
          multiline
          rows={3}
          placeholder="What could go wrong?"
        />

        <TextField
          label="Alternative Approaches"
          value={data.alternative_approaches || ''}
          onChange={v => updateFn('alternative_approaches', v)}
          required
          multiline
          rows={3}
          placeholder="Backup plans if primary approach fails"
        />
      </div>
    </div>
  )

  return (
    <div className="space-y-8">
      {/* Step Header */}
      <div>
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
            <FlaskConical className="w-5 h-5 text-primary-600" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-neutral-900">Research Plan</h2>
            <p className="text-sm text-neutral-500">Define your experimental approach, methods, and regulatory requirements</p>
          </div>
        </div>
      </div>

      {/* Experimental Approach */}
      <div className="bg-white rounded-xl border border-neutral-200 p-6">
        <div className="flex items-center gap-2 mb-6">
          <ClipboardList className="w-5 h-5 text-neutral-400" />
          <h3 className="text-lg font-semibold text-neutral-900">Experimental Approach</h3>
        </div>

        {isFastTrack ? (
          <div className="space-y-8">
            <div className="p-4 bg-primary-50 border border-primary-200 rounded-lg">
              <p className="text-sm text-primary-700">
                <strong>Fast Track:</strong> Define experimental approaches for both phases.
              </p>
            </div>

            {renderExperimentalApproach(
              m5ft.phase1,
              (field, value) => updateFastTrackApproach('phase1', field, value),
              'Phase I'
            )}

            <div className="border-t border-neutral-200 pt-8">
              {renderExperimentalApproach(
                m5ft.phase2,
                (field, value) => updateFastTrackApproach('phase2', field, value),
                'Phase II'
              )}
            </div>
          </div>
        ) : (
          renderExperimentalApproach(m5, updateM5)
        )}
      </div>

      {/* Phase I Commercialization Discussion */}
      {isPhaseI && (
        <div className="bg-blue-50 rounded-xl border border-blue-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <h3 className="text-lg font-semibold text-blue-900">Commercialization Discussion (Phase I)</h3>
          </div>
          <p className="text-sm text-blue-700 mb-6">
            While Phase I does not require a full commercialization plan, NIH reviewers expect a brief discussion of commercial potential.
          </p>

          <TextField
            label="Commercial Potential"
            value={p1Comm.commercial_potential || ''}
            onChange={v => updateP1Comm('commercial_potential', v)}
            multiline
            rows={3}
            placeholder="Describe the potential commercial applications"
          />

          <TextField
            label="Target Market (Brief)"
            value={p1Comm.target_market_brief || ''}
            onChange={v => updateP1Comm('target_market_brief', v)}
            multiline
            rows={2}
            placeholder="Initial target market and customer segments"
          />

          <TextField
            label="Competitive Advantage"
            value={p1Comm.competitive_advantage || ''}
            onChange={v => updateP1Comm('competitive_advantage', v)}
            multiline
            rows={2}
            placeholder="What differentiates your solution?"
          />
        </div>
      )}

      {/* Regulatory Requirements */}
      <div className="bg-white rounded-xl border border-neutral-200 p-6">
        <div className="flex items-center gap-2 mb-6">
          <Shield className="w-5 h-5 text-neutral-400" />
          <h3 className="text-lg font-semibold text-neutral-900">Regulatory Requirements</h3>
        </div>

        <div className="space-y-6">
          {/* Human Subjects */}
          <div className="p-4 bg-neutral-50 rounded-lg">
            <CheckboxField
              label="Human Subjects Involved"
              checked={m7.human_subjects_involved || false}
              onChange={v => updateM7('human_subjects_involved', v)}
              helpText="Check if your research involves human participants"
            />
            
            {m7.human_subjects_involved && (
              <div className="mt-4 pl-8">
                <TextField
                  label="IRB Approval Status"
                  value={m7.irb_approval_status || ''}
                  onChange={v => updateM7('irb_approval_status', v)}
                  placeholder="Approved, Pending, N/A"
                />
              </div>
            )}
          </div>

          {/* Vertebrate Animals */}
          <div className="p-4 bg-neutral-50 rounded-lg">
            <CheckboxField
              label="Vertebrate Animals Involved"
              checked={m7.vertebrate_animals_involved || false}
              onChange={v => updateM7('vertebrate_animals_involved', v)}
              helpText="Check if your research uses vertebrate animals"
            />
            
            {m7.vertebrate_animals_involved && (
              <div className="mt-4 pl-8">
                <TextField
                  label="IACUC Approval Status"
                  value={m7.iacuc_approval_status || ''}
                  onChange={v => updateM7('iacuc_approval_status', v)}
                  placeholder="Approved, Pending, N/A"
                />
              </div>
            )}
          </div>

          {/* Biohazards */}
          <div className="p-4 bg-neutral-50 rounded-lg">
            <CheckboxField
              label="Biohazards Involved"
              checked={m7.biohazards_involved || false}
              onChange={v => updateM7('biohazards_involved', v)}
              helpText="Check if your research involves biohazardous materials"
            />
            
            {m7.biohazards_involved && (
              <div className="mt-4 pl-8">
                <TextField
                  label="IBC Approval Status"
                  value={m7.ibc_approval_status || ''}
                  onChange={v => updateM7('ibc_approval_status', v)}
                  placeholder="Approved, Pending, N/A"
                />
              </div>
            )}
          </div>

          <TextField
            label="Facilities Description"
            value={m7.facilities_description || ''}
            onChange={v => updateM7('facilities_description', v)}
            required
            multiline
            rows={4}
            placeholder="Describe available facilities and equipment"
            helpText="Detail the laboratory space, equipment, and resources available"
          />

          <TextField
            label="Letters of Support"
            value={(m7.letters_of_support || []).join('\n')}
            onChange={v => updateM7('letters_of_support', v.split('\n').filter(s => s.trim()))}
            multiline
            rows={3}
            placeholder="List letters of support (one per line)"
            helpText="Include collaborators, consultants, and institutional support"
          />
        </div>
      </div>

      {/* Direct to Phase II Feasibility */}
      {project.grant_type === 'Direct to Phase II' && (
        <div className="bg-amber-50 rounded-xl border border-amber-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
            <h3 className="text-lg font-semibold text-amber-900">Direct to Phase II Feasibility Evidence</h3>
          </div>
          <p className="text-sm text-amber-700 mb-6">
            Required documentation proving feasibility without a prior Phase I award.
          </p>

          <div className="space-y-4">
            <TextField
              label="Preliminary Data Summary"
              value={project.direct_phase2_feasibility?.preliminary_data_summary || ''}
              onChange={v => onUpdate({ direct_phase2_feasibility: { ...project.direct_phase2_feasibility, preliminary_data_summary: v } })}
              required
              multiline
              rows={3}
            />

            <TextField
              label="Proof of Feasibility Results"
              value={project.direct_phase2_feasibility?.proof_of_feasibility_results || ''}
              onChange={v => onUpdate({ direct_phase2_feasibility: { ...project.direct_phase2_feasibility, proof_of_feasibility_results: v } })}
              required
              multiline
              rows={3}
            />

            <TextField
              label="Technical Feasibility Evidence"
              value={project.direct_phase2_feasibility?.technical_feasibility_evidence || ''}
              onChange={v => onUpdate({ direct_phase2_feasibility: { ...project.direct_phase2_feasibility, technical_feasibility_evidence: v } })}
              required
              multiline
              rows={3}
            />

            <TextField
              label="Risk Reduction Data"
              value={project.direct_phase2_feasibility?.risk_reduction_data || ''}
              onChange={v => onUpdate({ direct_phase2_feasibility: { ...project.direct_phase2_feasibility, risk_reduction_data: v } })}
              required
              multiline
              rows={3}
            />

            <TextField
              label="Rationale for Skipping Phase I"
              value={project.direct_phase2_feasibility?.rationale_for_skipping_phase1 || ''}
              onChange={v => onUpdate({ direct_phase2_feasibility: { ...project.direct_phase2_feasibility, rationale_for_skipping_phase1: v } })}
              required
              multiline
              rows={3}
            />

            <TextField
              label="Commercialization Readiness Statement"
              value={project.direct_phase2_feasibility?.commercialization_readiness_statement || ''}
              onChange={v => onUpdate({ direct_phase2_feasibility: { ...project.direct_phase2_feasibility, commercialization_readiness_statement: v } })}
              required
              multiline
              rows={3}
            />
          </div>
        </div>
      )}
    </div>
  )
}
