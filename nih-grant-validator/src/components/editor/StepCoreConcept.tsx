import { useState } from 'react'
import { Lightbulb, Target, FileText, Plus, Trash2, FlaskConical, AlertTriangle, X } from 'lucide-react'
import type { ProjectSchemaV2, SpecificAim, M3SpecificAims } from '../../types'
import { createDefaultAim, AIM_LIMITS } from '../../types'
import { TextField } from '../shared/FormField'
import { AIGenerateButton } from '../shared/AIGenerateButton'
import { ExperimentalPlanGenerator } from '../ExperimentalPlanGenerator'

interface StepCoreConceptProps {
  project: ProjectSchemaV2
  onUpdate: (updates: Partial<ProjectSchemaV2>) => void
}

// Warning Modal Component
function AimWarningModal({ 
  onConfirm, 
  onCancel,
  currentAimCount 
}: { 
  onConfirm: () => void
  onCancel: () => void
  currentAimCount: number
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4 p-6">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-neutral-900">Adding Aim {currentAimCount + 1}</h3>
            <p className="text-sm text-neutral-500 mt-1">Consider NIH best practices</p>
          </div>
        </div>
        
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-amber-800">
            <strong>NIH Recommendation:</strong> Most successful SBIR/STTR applications have 2-3 Specific Aims for Phase I 
            and 3-4 for Phase II. Having more than 5 aims may spread your resources too thin and could weaken 
            the overall focus of your proposal.
          </p>
        </div>
        
        <p className="text-sm text-neutral-600 mb-6">
          You currently have <strong>{currentAimCount} aims</strong>. Are you sure you want to add another?
        </p>
        
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2 border border-neutral-300 text-neutral-700 rounded-lg hover:bg-neutral-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors"
          >
            Add Aim Anyway
          </button>
        </div>
      </div>
    </div>
  )
}

// Single Aim Component
function AimSection({
  aim,
  index,
  totalAims,
  onUpdate,
  onRemove,
  phaseLabel
}: {
  aim: SpecificAim
  index: number
  totalAims: number
  onUpdate: (field: keyof SpecificAim, value: string | string[]) => void
  onRemove: () => void
  phaseLabel?: string
}) {
  const canRemove = totalAims > AIM_LIMITS.minimum
  const aimLabel = phaseLabel ? `${phaseLabel} - Aim ${index + 1}` : `Aim ${index + 1}`
  
  return (
    <div className="relative border border-neutral-200 rounded-lg p-4 bg-neutral-50">
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-medium text-neutral-700">{aimLabel}</h4>
        {canRemove && (
          <button
            onClick={onRemove}
            className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
            title="Remove this aim"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>
      
      <TextField
        label="Statement"
        value={aim.statement || ''}
        onChange={v => onUpdate('statement', v)}
        required
        multiline
        rows={2}
        placeholder={`Describe specific aim ${index + 1}`}
      />
      
      <TextField
        label="Milestones"
        value={(aim.milestones || []).join('\n')}
        onChange={v => onUpdate('milestones', v.split('\n').filter(s => s.trim()))}
        required
        multiline
        rows={2}
        placeholder="Enter milestones (one per line)"
      />
      
      <TextField
        label="Timeline"
        value={aim.timeline || ''}
        onChange={v => onUpdate('timeline', v)}
        required
        placeholder={`Timeline for aim ${index + 1} (e.g., Months 1-6)`}
      />
    </div>
  )
}

export function StepCoreConcept({ project, onUpdate }: StepCoreConceptProps) {
  const isFastTrack = project.grant_type === 'Fast Track'
  const [showExperimentalPlanGenerator, setShowExperimentalPlanGenerator] = useState(false)
  const [showAimWarning, setShowAimWarning] = useState(false)
  const [pendingAddAim, setPendingAddAim] = useState<'standard' | 'phase1' | 'phase2' | null>(null)
  
  // M1: Title & Concept - provide empty object fallback to prevent crashes
  const m1 = project.m1_title_concept || {}
  const updateM1 = (field: string, value: string) => {
    onUpdate({ m1_title_concept: { ...m1, [field]: value } })
  }

  // M2: Hypothesis - provide empty object fallback
  const m2 = project.m2_hypothesis || {}
  const updateM2 = (field: string, value: string) => {
    onUpdate({ m2_hypothesis: { ...m2, [field]: value } })
  }

  // M3: Specific Aims - provide default structure with 3 aims
  const m3: M3SpecificAims = {
    aims: project.m3_specific_aims?.aims || [
      createDefaultAim(1),
      createDefaultAim(2),
      createDefaultAim(3)
    ],
    timeline_summary: project.m3_specific_aims?.timeline_summary || '',
    interdependencies: project.m3_specific_aims?.interdependencies || ''
  }

  // Update a specific aim
  const updateAim = (index: number, field: keyof SpecificAim, value: string | string[]) => {
    const newAims = [...m3.aims]
    newAims[index] = { ...newAims[index], [field]: value }
    onUpdate({ m3_specific_aims: { ...m3, aims: newAims } })
  }

  // Add a new aim
  const addAim = () => {
    if (m3.aims.length >= AIM_LIMITS.warning_threshold) {
      setPendingAddAim('standard')
      setShowAimWarning(true)
    } else {
      const newAims = [...m3.aims, createDefaultAim(m3.aims.length + 1)]
      onUpdate({ m3_specific_aims: { ...m3, aims: newAims } })
    }
  }

  // Confirm adding aim after warning
  const confirmAddAim = () => {
    if (pendingAddAim === 'standard') {
      const newAims = [...m3.aims, createDefaultAim(m3.aims.length + 1)]
      onUpdate({ m3_specific_aims: { ...m3, aims: newAims } })
    } else if (pendingAddAim === 'phase1' || pendingAddAim === 'phase2') {
      const phase = pendingAddAim
      const currentPhase = m3ft[phase] || { aims: [], timeline_summary: '', interdependencies: '' }
      const currentAims = currentPhase.aims || []
      const newAims = [...currentAims, createDefaultAim(currentAims.length + 1)]
      onUpdate({
        m3_fast_track: {
          ...m3ft,
          [phase]: { ...currentPhase, aims: newAims }
        }
      })
    }
    setShowAimWarning(false)
    setPendingAddAim(null)
  }

  // Remove an aim
  const removeAim = (index: number) => {
    if (m3.aims.length > AIM_LIMITS.minimum) {
      const newAims = m3.aims.filter((_, i) => i !== index)
      onUpdate({ m3_specific_aims: { ...m3, aims: newAims } })
    }
  }

  // Update shared M3 fields
  const updateM3Field = (field: 'timeline_summary' | 'interdependencies', value: string) => {
    onUpdate({ m3_specific_aims: { ...m3, [field]: value } })
  }

  // Fast Track aims - provide default structure
  const m3ft = project.m3_fast_track || { 
    phase1: { aims: [createDefaultAim(1), createDefaultAim(2), createDefaultAim(3)], timeline_summary: '', interdependencies: '' },
    phase2: { aims: [createDefaultAim(1), createDefaultAim(2), createDefaultAim(3)], timeline_summary: '', interdependencies: '' },
    phase1_complete: false,
    phase2_complete: false
  }

  // Get aims for a Fast Track phase
  const getFastTrackAims = (phase: 'phase1' | 'phase2'): SpecificAim[] => {
    const phaseData = m3ft[phase]
    return phaseData?.aims || [createDefaultAim(1), createDefaultAim(2), createDefaultAim(3)]
  }

  // Update a specific aim in Fast Track
  const updateFastTrackAim = (phase: 'phase1' | 'phase2', index: number, field: keyof SpecificAim, value: string | string[]) => {
    const currentPhase = m3ft[phase] || { aims: [], timeline_summary: '', interdependencies: '' }
    const currentAims = currentPhase.aims || []
    const newAims = [...currentAims]
    newAims[index] = { ...newAims[index], [field]: value }
    
    onUpdate({
      m3_fast_track: {
        ...m3ft,
        [phase]: { ...currentPhase, aims: newAims }
      }
    })
  }

  // Add aim to Fast Track phase
  const addFastTrackAim = (phase: 'phase1' | 'phase2') => {
    const currentPhase = m3ft[phase] || { aims: [], timeline_summary: '', interdependencies: '' }
    const currentAims = currentPhase.aims || []
    
    if (currentAims.length >= AIM_LIMITS.warning_threshold) {
      setPendingAddAim(phase)
      setShowAimWarning(true)
    } else {
      const newAims = [...currentAims, createDefaultAim(currentAims.length + 1)]
      onUpdate({
        m3_fast_track: {
          ...m3ft,
          [phase]: { ...currentPhase, aims: newAims }
        }
      })
    }
  }

  // Remove aim from Fast Track phase
  const removeFastTrackAim = (phase: 'phase1' | 'phase2', index: number) => {
    const currentPhase = m3ft[phase] || { aims: [], timeline_summary: '', interdependencies: '' }
    const currentAims = currentPhase.aims || []
    
    if (currentAims.length > AIM_LIMITS.minimum) {
      const newAims = currentAims.filter((_, i) => i !== index)
      onUpdate({
        m3_fast_track: {
          ...m3ft,
          [phase]: { ...currentPhase, aims: newAims }
        }
      })
    }
  }

  // Update Fast Track shared field
  const updateFastTrackField = (phase: 'phase1' | 'phase2', field: 'timeline_summary' | 'interdependencies', value: string) => {
    const currentPhase = m3ft[phase] || { aims: [], timeline_summary: '', interdependencies: '' }
    onUpdate({
      m3_fast_track: {
        ...m3ft,
        [phase]: { ...currentPhase, [field]: value }
      }
    })
  }

  // Get current aim count for warning modal
  const getCurrentAimCount = (): number => {
    if (pendingAddAim === 'standard') return m3.aims.length
    if (pendingAddAim === 'phase1') return getFastTrackAims('phase1').length
    if (pendingAddAim === 'phase2') return getFastTrackAims('phase2').length
    return 0
  }

  return (
    <div className="space-y-8">
      {/* Warning Modal */}
      {showAimWarning && (
        <AimWarningModal
          currentAimCount={getCurrentAimCount()}
          onConfirm={confirmAddAim}
          onCancel={() => {
            setShowAimWarning(false)
            setPendingAddAim(null)
          }}
        />
      )}

      {/* Step Header */}
      <div>
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
            <Lightbulb className="w-5 h-5 text-primary-600" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-neutral-900">Core Concept</h2>
            <p className="text-sm text-neutral-500">Define your project's title, problem, hypothesis, and specific aims</p>
          </div>
        </div>
      </div>

      {/* Section 1: Title & Concept */}
      <div className="bg-white rounded-xl border border-neutral-200 p-6">
        <div className="flex items-center gap-2 mb-6">
          <FileText className="w-5 h-5 text-neutral-400" />
          <h3 className="text-lg font-semibold text-neutral-900">Title & Concept</h3>
        </div>

        <TextField
          label="Project Title"
          value={m1.project_title || ''}
          onChange={v => updateM1('project_title', v)}
          required
          placeholder="Enter a clear, descriptive project title"
          helpText="Keep it concise but informative (typically under 200 characters)"
        />

        <TextField
          label="Lay Summary"
          value={m1.lay_summary || ''}
          onChange={v => updateM1('lay_summary', v)}
          required
          multiline
          rows={3}
          placeholder="Explain your project in plain language for non-experts"
          helpText="This helps reviewers quickly understand the project's significance"
        />

        <TextField
          label="Scientific Abstract"
          value={m1.scientific_abstract || ''}
          onChange={v => updateM1('scientific_abstract', v)}
          required
          multiline
          rows={4}
          placeholder="Technical summary of your research project"
        />

        <div className="grid md:grid-cols-2 gap-4">
          <TextField
            label="Problem Statement"
            value={m1.problem_statement || ''}
            onChange={v => updateM1('problem_statement', v)}
            required
            multiline
            rows={3}
            placeholder="What unmet need does this address?"
          />

          <TextField
            label="Proposed Solution"
            value={m1.proposed_solution || ''}
            onChange={v => updateM1('proposed_solution', v)}
            required
            multiline
            rows={3}
            placeholder="Your innovative approach"
          />
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          <TextField
            label="Target Population"
            value={m1.target_population || ''}
            onChange={v => updateM1('target_population', v)}
            required
            placeholder="Who will benefit?"
          />

          <TextField
            label="Therapeutic Area"
            value={m1.therapeutic_area || ''}
            onChange={v => updateM1('therapeutic_area', v)}
            required
            placeholder="e.g., Oncology, Cardiology"
          />

          <TextField
            label="Technology Type"
            value={m1.technology_type || ''}
            onChange={v => updateM1('technology_type', v)}
            required
            placeholder="e.g., Drug, Device, Diagnostic"
          />
        </div>
      </div>

      {/* Section 2: Hypothesis */}
      <div className="bg-white rounded-xl border border-neutral-200 p-6">
        <div className="flex items-center gap-2 mb-6">
          <Target className="w-5 h-5 text-neutral-400" />
          <h3 className="text-lg font-semibold text-neutral-900">Hypothesis Development</h3>
        </div>

        <TextField
          label="Central Hypothesis"
          value={m2.central_hypothesis || ''}
          onChange={v => updateM2('central_hypothesis', v)}
          required
          multiline
          rows={3}
          placeholder="Your main scientific hypothesis that will be tested"
          helpText="A strong hypothesis is specific, testable, and directly addresses the problem"
        />

        <TextField
          label="Supporting Rationale"
          value={m2.supporting_rationale || ''}
          onChange={v => updateM2('supporting_rationale', v)}
          required
          multiline
          rows={3}
          placeholder="Evidence and reasoning supporting your hypothesis"
        />

        <TextField
          label="Preliminary Data Summary"
          value={m2.preliminary_data_summary || ''}
          onChange={v => updateM2('preliminary_data_summary', v)}
          required
          multiline
          rows={3}
          placeholder="Summary of existing data that supports feasibility"
        />

        <div className="grid md:grid-cols-2 gap-4">
          <TextField
            label="Expected Outcomes"
            value={m2.expected_outcomes || ''}
            onChange={v => updateM2('expected_outcomes', v)}
            required
            multiline
            rows={3}
            placeholder="What results do you anticipate?"
          />

          <TextField
            label="Success Criteria"
            value={m2.success_criteria || ''}
            onChange={v => updateM2('success_criteria', v)}
            required
            multiline
            rows={3}
            placeholder="How will you measure success?"
          />
        </div>
      </div>

      {/* Section 3: Specific Aims */}
      <div className="bg-white rounded-xl border border-neutral-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Target className="w-5 h-5 text-neutral-400" />
            <h3 className="text-lg font-semibold text-neutral-900">Specific Aims</h3>
          </div>
          <div className="text-sm text-neutral-500">
            Minimum {AIM_LIMITS.minimum} aims required • Recommended max: {AIM_LIMITS.recommended_max}
          </div>
        </div>

        {isFastTrack ? (
          <div className="space-y-8">
            {/* Fast Track info banner */}
            <div className="p-4 bg-primary-50 border border-primary-200 rounded-lg">
              <p className="text-sm text-primary-700">
                <strong>Fast Track:</strong> Define specific aims for both Phase I (feasibility) and Phase II (development) sections.
                Each phase requires a minimum of {AIM_LIMITS.minimum} aims.
              </p>
            </div>

            {/* Phase I Aims */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 bg-blue-100 text-blue-800 text-sm font-medium rounded-full">Phase I</span>
                  <span className="text-sm text-neutral-500">Feasibility Study Aims ({getFastTrackAims('phase1').length} aims)</span>
                </div>
                <button
                  onClick={() => addFastTrackAim('phase1')}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Add Aim
                </button>
              </div>
              
              <div className="space-y-4">
                {getFastTrackAims('phase1').map((aim, index) => (
                  <AimSection
                    key={aim.id || index}
                    aim={aim}
                    index={index}
                    totalAims={getFastTrackAims('phase1').length}
                    onUpdate={(field, value) => updateFastTrackAim('phase1', index, field, value)}
                    onRemove={() => removeFastTrackAim('phase1', index)}
                    phaseLabel="Phase I"
                  />
                ))}
              </div>

              <div className="mt-4 grid md:grid-cols-2 gap-4">
                <TextField
                  label="Phase I - Timeline Summary"
                  value={m3ft.phase1?.timeline_summary || ''}
                  onChange={v => updateFastTrackField('phase1', 'timeline_summary', v)}
                  required
                  multiline
                  rows={2}
                  placeholder="Overall Phase I timeline"
                />
                <TextField
                  label="Phase I - Aim Interdependencies"
                  value={m3ft.phase1?.interdependencies || ''}
                  onChange={v => updateFastTrackField('phase1', 'interdependencies', v)}
                  required
                  multiline
                  rows={2}
                  placeholder="How do the Phase I aims relate to each other?"
                />
              </div>
            </div>

            {/* Phase II Aims */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 bg-purple-100 text-purple-800 text-sm font-medium rounded-full">Phase II</span>
                  <span className="text-sm text-neutral-500">Full Development Aims ({getFastTrackAims('phase2').length} aims)</span>
                </div>
                <button
                  onClick={() => addFastTrackAim('phase2')}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Add Aim
                </button>
              </div>
              
              <div className="space-y-4">
                {getFastTrackAims('phase2').map((aim, index) => (
                  <AimSection
                    key={aim.id || index}
                    aim={aim}
                    index={index}
                    totalAims={getFastTrackAims('phase2').length}
                    onUpdate={(field, value) => updateFastTrackAim('phase2', index, field, value)}
                    onRemove={() => removeFastTrackAim('phase2', index)}
                    phaseLabel="Phase II"
                  />
                ))}
              </div>

              <div className="mt-4 grid md:grid-cols-2 gap-4">
                <TextField
                  label="Phase II - Timeline Summary"
                  value={m3ft.phase2?.timeline_summary || ''}
                  onChange={v => updateFastTrackField('phase2', 'timeline_summary', v)}
                  required
                  multiline
                  rows={2}
                  placeholder="Overall Phase II timeline"
                />
                <TextField
                  label="Phase II - Aim Interdependencies"
                  value={m3ft.phase2?.interdependencies || ''}
                  onChange={v => updateFastTrackField('phase2', 'interdependencies', v)}
                  required
                  multiline
                  rows={2}
                  placeholder="How do the Phase II aims relate to each other?"
                />
              </div>
            </div>
          </div>
        ) : (
          // Standard aims (non-Fast Track)
          <div className="space-y-6">
            {/* Dynamic Aims List */}
            <div className="space-y-4">
              {m3.aims.map((aim, index) => (
                <AimSection
                  key={aim.id || index}
                  aim={aim}
                  index={index}
                  totalAims={m3.aims.length}
                  onUpdate={(field, value) => updateAim(index, field, value)}
                  onRemove={() => removeAim(index)}
                />
              ))}
            </div>

            {/* Add Aim Button */}
            <button
              onClick={addAim}
              className="w-full flex items-center justify-center gap-2 p-3 border-2 border-dashed border-neutral-300 rounded-lg text-neutral-600 hover:border-primary-400 hover:text-primary-600 hover:bg-primary-50 transition-colors"
            >
              <Plus className="w-5 h-5" />
              Add Another Aim
            </button>

            {/* Shared Fields */}
            <div className="mt-6 pt-6 border-t border-neutral-200">
              <TextField
                label="Overall Timeline Summary"
                value={m3.timeline_summary || ''}
                onChange={v => updateM3Field('timeline_summary', v)}
                required
                multiline
                rows={3}
                placeholder="Describe the overall project timeline across all aims"
              />

              <TextField
                label="Aim Interdependencies"
                value={m3.interdependencies || ''}
                onChange={v => updateM3Field('interdependencies', v)}
                required
                multiline
                rows={2}
                placeholder="How do the aims relate to and build upon each other?"
              />
            </div>
          </div>
        )}
      </div>

      {/* AI Generation Section - positioned after all form fields */}
      <div className="bg-gradient-to-r from-primary-50 to-blue-50 rounded-xl border border-primary-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Lightbulb className="w-5 h-5 text-primary-600" />
          <h3 className="text-lg font-semibold text-neutral-900">AI Document Generation</h3>
        </div>
        <p className="text-sm text-neutral-600 mb-4">
          Generate polished documents based on the information you've entered above.
        </p>
        <div className="grid lg:grid-cols-2 gap-4">
          <AIGenerateButton
            project={project}
            documentType="project-summary"
            onGenerated={(doc) => {
              if (doc.content) {
                onUpdate({ m1_title_concept: { ...m1, scientific_abstract: doc.content.trim() } })
              }
            }}
          />
          <AIGenerateButton
            project={project}
            documentType="project-narrative"
          />
        </div>
        <div className="grid lg:grid-cols-2 gap-4 mt-4">
          <AIGenerateButton
            project={project}
            documentType="specific-aims"
          />
          <AIGenerateButton
            project={project}
            documentType="specific-aims-page"
          />
        </div>
        
        {/* Experimental Plan Generator Button */}
        <div className="mt-4">
          <button
            onClick={() => setShowExperimentalPlanGenerator(true)}
            className="w-full flex items-center justify-center gap-3 p-4 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-semibold rounded-lg hover:from-emerald-600 hover:to-teal-700 transition-all shadow-sm hover:shadow"
          >
            <FlaskConical className="w-5 h-5" />
            Generate Experimental Plan
            <span className="text-xs bg-white/20 px-2 py-0.5 rounded">Research Strategy</span>
          </button>
          <p className="text-xs text-neutral-500 mt-2 text-center">
            Generate a complete Research Strategy / Experimental Plan from your Specific Aims
          </p>
        </div>
      </div>
      
      {/* Experimental Plan Generator Modal */}
      {showExperimentalPlanGenerator && (
        <ExperimentalPlanGenerator
          project={project}
          onClose={() => setShowExperimentalPlanGenerator(false)}
        />
      )}
    </div>
  )
}
