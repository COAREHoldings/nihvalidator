import { Lightbulb, Target, FileText, Plus, Trash2 } from 'lucide-react'
import type { ProjectSchemaV2 } from '../../types'
import { TextField } from '../shared/FormField'
import { AIGenerateButton } from '../shared/AIGenerateButton'

interface StepCoreConceptProps {
  project: ProjectSchemaV2
  onUpdate: (updates: Partial<ProjectSchemaV2>) => void
}

export function StepCoreConcept({ project, onUpdate }: StepCoreConceptProps) {
  const isFastTrack = project.grant_type === 'Fast Track'
  
  // M1: Title & Concept
  const m1 = project.m1_title_concept
  const updateM1 = (field: string, value: string) => {
    onUpdate({ m1_title_concept: { ...m1, [field]: value } })
  }

  // M2: Hypothesis
  const m2 = project.m2_hypothesis
  const updateM2 = (field: string, value: string) => {
    onUpdate({ m2_hypothesis: { ...m2, [field]: value } })
  }

  // M3: Specific Aims
  const m3 = project.m3_specific_aims
  const updateM3 = (field: string, value: string | string[]) => {
    onUpdate({ m3_specific_aims: { ...m3, [field]: value } })
  }

  // Fast Track aims
  const m3ft = project.m3_fast_track

  const updateFastTrackAims = (phase: 'phase1' | 'phase2', field: string, value: string | string[]) => {
    const currentPhase = m3ft[phase]
    const updatedPhase = { ...currentPhase, [field]: value }
    
    // Check if phase is complete
    const isComplete = !!(
      updatedPhase.aim1_statement?.trim() && 
      updatedPhase.aim1_milestones?.length && 
      updatedPhase.aim2_statement?.trim() && 
      updatedPhase.timeline_summary?.trim()
    )
    
    onUpdate({
      m3_fast_track: {
        ...m3ft,
        [phase]: updatedPhase,
        [`${phase}_complete`]: isComplete
      }
    })
  }

  return (
    <div className="space-y-8">
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

      {/* AI Generation Section */}
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

      <div className="grid lg:grid-cols-2 gap-4">
        <AIGenerateButton
          project={project}
          documentType="specific-aims"
        />
        <AIGenerateButton
          project={project}
          documentType="specific-aims-page"
        />
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
        <div className="flex items-center gap-2 mb-6">
          <Target className="w-5 h-5 text-neutral-400" />
          <h3 className="text-lg font-semibold text-neutral-900">Specific Aims</h3>
        </div>

        {isFastTrack ? (
          <div className="space-y-8">
            {/* Fast Track info banner */}
            <div className="p-4 bg-primary-50 border border-primary-200 rounded-lg">
              <p className="text-sm text-primary-700">
                <strong>Fast Track:</strong> Define specific aims for both Phase I (feasibility) and Phase II (development) sections.
              </p>
            </div>

            {/* Phase I Aims */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <span className="px-3 py-1 bg-blue-100 text-blue-800 text-sm font-medium rounded-full">Phase I</span>
                <span className="text-sm text-neutral-500">Feasibility Study Aims</span>
              </div>
              
              <TextField
                label="Phase I - Aim 1"
                value={m3ft.phase1.aim1_statement || ''}
                onChange={v => updateFastTrackAims('phase1', 'aim1_statement', v)}
                required
                multiline
                rows={2}
                placeholder="First specific aim for Phase I feasibility"
              />
              
              <TextField
                label="Phase I - Aim 1 Milestones"
                value={(m3ft.phase1.aim1_milestones || []).join('\n')}
                onChange={v => updateFastTrackAims('phase1', 'aim1_milestones', v.split('\n').filter(s => s.trim()))}
                required
                multiline
                rows={2}
                placeholder="Enter milestones (one per line)"
              />

              <TextField
                label="Phase I - Aim 2"
                value={m3ft.phase1.aim2_statement || ''}
                onChange={v => updateFastTrackAims('phase1', 'aim2_statement', v)}
                required
                multiline
                rows={2}
                placeholder="Second specific aim for Phase I feasibility"
              />

              <TextField
                label="Phase I - Timeline"
                value={m3ft.phase1.timeline_summary || ''}
                onChange={v => updateFastTrackAims('phase1', 'timeline_summary', v)}
                required
                multiline
                rows={2}
                placeholder="Phase I timeline summary"
              />
            </div>

            {/* Phase II Aims */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <span className="px-3 py-1 bg-purple-100 text-purple-800 text-sm font-medium rounded-full">Phase II</span>
                <span className="text-sm text-neutral-500">Full Development Aims</span>
              </div>
              
              <TextField
                label="Phase II - Aim 1"
                value={m3ft.phase2.aim1_statement || ''}
                onChange={v => updateFastTrackAims('phase2', 'aim1_statement', v)}
                required
                multiline
                rows={2}
                placeholder="First specific aim for Phase II development"
              />
              
              <TextField
                label="Phase II - Aim 1 Milestones"
                value={(m3ft.phase2.aim1_milestones || []).join('\n')}
                onChange={v => updateFastTrackAims('phase2', 'aim1_milestones', v.split('\n').filter(s => s.trim()))}
                required
                multiline
                rows={2}
                placeholder="Enter milestones (one per line)"
              />

              <TextField
                label="Phase II - Aim 2"
                value={m3ft.phase2.aim2_statement || ''}
                onChange={v => updateFastTrackAims('phase2', 'aim2_statement', v)}
                required
                multiline
                rows={2}
                placeholder="Second specific aim for Phase II development"
              />

              <TextField
                label="Phase II - Timeline"
                value={m3ft.phase2.timeline_summary || ''}
                onChange={v => updateFastTrackAims('phase2', 'timeline_summary', v)}
                required
                multiline
                rows={2}
                placeholder="Phase II timeline summary"
              />
            </div>
          </div>
        ) : (
          // Standard aims (non-Fast Track)
          <div className="space-y-6">
            <div>
              <TextField
                label="Aim 1 Statement"
                value={m3.aim1_statement || ''}
                onChange={v => updateM3('aim1_statement', v)}
                required
                multiline
                rows={2}
                placeholder="First specific aim"
              />
              
              <TextField
                label="Aim 1 Milestones"
                value={(m3.aim1_milestones || []).join('\n')}
                onChange={v => updateM3('aim1_milestones', v.split('\n').filter(s => s.trim()))}
                required
                multiline
                rows={2}
                placeholder="Enter milestones (one per line)"
              />
            </div>

            <div>
              <TextField
                label="Aim 2 Statement"
                value={m3.aim2_statement || ''}
                onChange={v => updateM3('aim2_statement', v)}
                required
                multiline
                rows={2}
                placeholder="Second specific aim"
              />
              
              <TextField
                label="Aim 2 Milestones"
                value={(m3.aim2_milestones || []).join('\n')}
                onChange={v => updateM3('aim2_milestones', v.split('\n').filter(s => s.trim()))}
                required
                multiline
                rows={2}
                placeholder="Enter milestones (one per line)"
              />
            </div>

            <div>
              <TextField
                label="Aim 3 Statement (Optional)"
                value={m3.aim3_statement || ''}
                onChange={v => updateM3('aim3_statement', v)}
                multiline
                rows={2}
                placeholder="Third specific aim (if applicable)"
              />
              
              {m3.aim3_statement && (
                <TextField
                  label="Aim 3 Milestones"
                  value={(m3.aim3_milestones || []).join('\n')}
                  onChange={v => updateM3('aim3_milestones', v.split('\n').filter(s => s.trim()))}
                  multiline
                  rows={2}
                  placeholder="Enter milestones (one per line)"
                />
              )}
            </div>

            <TextField
              label="Timeline Summary"
              value={m3.timeline_summary || ''}
              onChange={v => updateM3('timeline_summary', v)}
              required
              multiline
              rows={3}
              placeholder="Overall project timeline"
            />

            <TextField
              label="Aim Interdependencies"
              value={m3.interdependencies || ''}
              onChange={v => updateM3('interdependencies', v)}
              required
              multiline
              rows={2}
              placeholder="How do the aims relate to each other?"
            />
          </div>
        )}
      </div>
    </div>
  )
}
