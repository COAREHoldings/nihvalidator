import { useState, useEffect, useCallback } from 'react'
import type { ProjectSchemaV2, ModuleState, M3SpecificAims, M5ExperimentalApproach, M6Budget, M7Regulatory, M7Phase2Additional } from '../types'
import { MODULE_DEFINITIONS } from '../types'
import { getBudgetCap } from '../validation'
import { Plus, Trash2, AlertTriangle, Lock, CheckCircle, Sparkles, Loader2, X, Lightbulb, FileText, ShieldCheck } from 'lucide-react'

const SUPABASE_URL = 'https://dvuhtfzsvcacyrlfettz.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR2dWh0ZnpzdmNhY3lybGZldHR6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk2NDk3OTYsImV4cCI6MjA4NTIyNTc5Nn0.vUtnPXeQrzU0kO0E7qK2qJtZ_RCqnXCEFSa60adHld0'

interface Props {
  project: ProjectSchemaV2
  moduleId: number
  moduleState: ModuleState
  onUpdate: (updates: Partial<ProjectSchemaV2>) => void
}

interface AIState {
  loading: boolean
  suggestion: string | null
  error: string | null
}

async function callAIRefine(action: string, payload: Record<string, unknown>): Promise<{ result?: string; error?: string }> {
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/ai-refine`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      },
      body: JSON.stringify({ action, ...payload })
    })
    const data = await response.json()
    if (data.error) return { error: data.error.message || 'AI request failed' }
    return { result: data.result || data.suggestions?.[0] || data.draft || '' }
  } catch (err) {
    return { error: 'Failed to connect to AI service' }
  }
}

interface TextFieldProps {
  label: string
  value: string
  onChange: (val: string) => void
  required?: boolean
  multiline?: boolean
  placeholder?: string
  fieldId?: string
  moduleContext?: string
  enableAI?: boolean
}

function TextField({ label, value, onChange, required, multiline, placeholder, fieldId, moduleContext, enableAI = true }: TextFieldProps) {
  const populated = value?.trim().length > 0
  const [aiState, setAiState] = useState<AIState>({ loading: false, suggestion: null, error: null })
  const [showAI, setShowAI] = useState(false)

  const handleGetSuggestion = async () => {
    setAiState({ loading: true, suggestion: null, error: null })
    const { result, error } = await callAIRefine('field_suggest', {
      field_name: fieldId || label,
      current_value: value,
      context: moduleContext || 'NIH SBIR/STTR grant application'
    })
    if (error) {
      setAiState({ loading: false, suggestion: null, error })
    } else {
      setAiState({ loading: false, suggestion: result || null, error: null })
    }
  }

  const handleGenerateDraft = async () => {
    setAiState({ loading: true, suggestion: null, error: null })
    const { result, error } = await callAIRefine('draft_generate', {
      field_name: fieldId || label,
      context: moduleContext || 'NIH SBIR/STTR grant application',
      instructions: placeholder || `Generate content for ${label}`
    })
    if (error) {
      setAiState({ loading: false, suggestion: null, error })
    } else {
      setAiState({ loading: false, suggestion: result || null, error: null })
    }
  }

  const handleComplianceCheck = async () => {
    if (!value?.trim()) return
    setAiState({ loading: true, suggestion: null, error: null })
    const { result, error } = await callAIRefine('compliance_check', {
      field_name: fieldId || label,
      content: value,
      context: moduleContext || 'NIH SBIR/STTR grant application'
    })
    if (error) {
      setAiState({ loading: false, suggestion: null, error })
    } else {
      setAiState({ loading: false, suggestion: result || null, error: null })
    }
  }

  const acceptSuggestion = () => {
    if (aiState.suggestion) {
      onChange(aiState.suggestion)
      setAiState({ loading: false, suggestion: null, error: null })
      setShowAI(false)
    }
  }

  return (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-1.5">
        <label className="block text-sm font-medium text-neutral-700">
          {label} {required && <span className="text-semantic-error">*</span>}
          {populated && <span className="ml-2 text-xs text-semantic-success">(completed)</span>}
        </label>
        {enableAI && (
          <button
            onClick={() => setShowAI(!showAI)}
            className={`flex items-center gap-1 text-xs px-2 py-1 rounded-md transition-all ${showAI ? 'bg-violet-100 text-violet-700' : 'text-neutral-500 hover:bg-neutral-100'}`}
          >
            <Sparkles className="w-3 h-3" /> AI Assist
          </button>
        )}
      </div>
      
      {showAI && (
        <div className="mb-2 p-3 bg-gradient-to-r from-violet-50 to-indigo-50 border border-violet-200 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <button
              onClick={handleGetSuggestion}
              disabled={aiState.loading}
              className="flex items-center gap-1 text-xs px-2 py-1 bg-white border border-violet-200 rounded hover:bg-violet-50 disabled:opacity-50"
            >
              {aiState.loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Lightbulb className="w-3 h-3" />}
              Suggest
            </button>
            {multiline && (
              <button
                onClick={handleGenerateDraft}
                disabled={aiState.loading}
                className="flex items-center gap-1 text-xs px-2 py-1 bg-white border border-violet-200 rounded hover:bg-violet-50 disabled:opacity-50"
              >
                {aiState.loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <FileText className="w-3 h-3" />}
                Draft
              </button>
            )}
            <button
              onClick={handleComplianceCheck}
              disabled={aiState.loading || !value?.trim()}
              className="flex items-center gap-1 text-xs px-2 py-1 bg-white border border-green-200 rounded hover:bg-green-50 disabled:opacity-50"
            >
              {aiState.loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <ShieldCheck className="w-3 h-3 text-green-600" />}
              Check
            </button>
            <button onClick={() => setShowAI(false)} className="ml-auto text-neutral-400 hover:text-neutral-600">
              <X className="w-4 h-4" />
            </button>
          </div>
          {aiState.error && (
            <p className="text-xs text-red-600 mb-2">{aiState.error}</p>
          )}
          {aiState.suggestion && (
            <div className="mt-2">
              <p className="text-xs text-neutral-600 mb-1">AI Suggestion:</p>
              <div className="p-2 bg-white rounded border border-violet-100 text-sm text-neutral-800 max-h-32 overflow-y-auto">
                {aiState.suggestion}
              </div>
              <div className="flex gap-2 mt-2">
                <button onClick={acceptSuggestion} className="text-xs px-3 py-1 bg-violet-600 text-white rounded hover:bg-violet-700">
                  Accept
                </button>
                <button onClick={() => setAiState({ ...aiState, suggestion: null })} className="text-xs px-3 py-1 bg-neutral-200 text-neutral-700 rounded hover:bg-neutral-300">
                  Dismiss
                </button>
              </div>
            </div>
          )}
        </div>
      )}

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
  max?: number
}

function NumberField({ label, value, onChange, required, prefix, suffix, max }: NumberFieldProps) {
  return (
    <div className="mb-4">
      <label className="block text-sm font-medium text-neutral-700 mb-1.5">
        {label} {required && <span className="text-semantic-error">*</span>}
        {max && <span className="text-xs text-neutral-500 ml-2">(cap: ${max.toLocaleString()})</span>}
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

type PhaseTab = 'phase1' | 'phase2' | 'shared'

interface PhaseTabsProps {
  activeTab: PhaseTab
  onTabChange: (tab: PhaseTab) => void
  phase1Complete: boolean
  phase2Locked: boolean
  moduleId: number
}

function PhaseTabs({ activeTab, onTabChange, phase1Complete, phase2Locked, moduleId }: PhaseTabsProps) {
  const isM7 = moduleId === 7
  
  return (
    <div className="mb-6">
      <div className="flex items-center gap-1 mb-2">
        <span className="text-xs font-medium text-primary-600 bg-primary-50 px-2 py-1 rounded">Fast Track</span>
        <span className="text-xs text-neutral-500">Phase-specific content required</span>
      </div>
      <div className="flex gap-2 p-1 bg-neutral-100 rounded-lg">
        {isM7 ? (
          <>
            <button
              onClick={() => onTabChange('shared')}
              className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center justify-center gap-2
                ${activeTab === 'shared' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-600 hover:text-neutral-900'}`}
            >
              Shared Documents
              {phase1Complete && <CheckCircle className="w-4 h-4 text-semantic-success" />}
            </button>
            <button
              onClick={() => !phase2Locked && onTabChange('phase2')}
              disabled={phase2Locked}
              className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center justify-center gap-2
                ${activeTab === 'phase2' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-600 hover:text-neutral-900'}
                ${phase2Locked ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {phase2Locked && <Lock className="w-3 h-3" />}
              Phase II Specific
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => onTabChange('phase1')}
              className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center justify-center gap-2
                ${activeTab === 'phase1' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-600 hover:text-neutral-900'}`}
            >
              Phase I {moduleId === 6 && '($275K cap)'}
              {phase1Complete && <CheckCircle className="w-4 h-4 text-semantic-success" />}
            </button>
            <button
              onClick={() => !phase2Locked && onTabChange('phase2')}
              disabled={phase2Locked}
              className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center justify-center gap-2
                ${activeTab === 'phase2' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-600 hover:text-neutral-900'}
                ${phase2Locked ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {phase2Locked && <Lock className="w-3 h-3" />}
              Phase II {moduleId === 6 && '($1.75M cap)'}
            </button>
          </>
        )}
      </div>
      {phase2Locked && (
        <p className="text-xs text-amber-600 mt-2 flex items-center gap-1">
          <AlertTriangle className="w-3 h-3" />
          Complete {isM7 ? 'Shared Documents' : 'Phase I'} to unlock {isM7 ? 'Phase II Specific' : 'Phase II'}
        </p>
      )}
    </div>
  )
}

function PhaseIndicator({ phase }: { phase: 'I' | 'II' | 'Shared' }) {
  const colors = phase === 'I' ? 'bg-blue-100 text-blue-800' : phase === 'II' ? 'bg-purple-100 text-purple-800' : 'bg-neutral-100 text-neutral-800'
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded ${colors}`}>
      {phase === 'Shared' ? 'Shared' : `Phase ${phase}`}
    </span>
  )
}

export function ModuleEditor({ project, moduleId, moduleState, onUpdate }: Props) {
  const def = MODULE_DEFINITIONS.find(m => m.id === moduleId)
  const isFastTrack = project.grant_type === 'Fast Track'
  const hasPhases = isFastTrack && [3, 5, 6, 7].includes(moduleId)
  
  const [phaseTab, setPhaseTab] = useState<PhaseTab>(moduleId === 7 ? 'shared' : 'phase1')
  
  // Reset phase tab when module changes
  useEffect(() => {
    setPhaseTab(moduleId === 7 ? 'shared' : 'phase1')
  }, [moduleId])

  // Check phase completion for locking
  const getPhase1Complete = () => {
    if (moduleId === 3) return project.m3_fast_track.phase1_complete
    if (moduleId === 5) return project.m5_fast_track.phase1_complete
    if (moduleId === 6) return project.m6_fast_track.phase1_complete
    if (moduleId === 7) return project.m7_fast_track.shared_complete
    return false
  }

  const checkPhase1Fields = (data: Partial<M3SpecificAims> | Partial<M5ExperimentalApproach> | Partial<M6Budget> | Partial<M7Regulatory>) => {
    if (moduleId === 3) {
      const d = data as Partial<M3SpecificAims>
      return !!(d.aim1_statement?.trim() && d.aim1_milestones?.length && d.aim2_statement?.trim() && d.timeline_summary?.trim())
    }
    if (moduleId === 5) {
      const d = data as Partial<M5ExperimentalApproach>
      return !!(d.methodology_overview?.trim() && d.experimental_design?.trim() && d.data_collection_methods?.trim() && d.analysis_plan?.trim())
    }
    if (moduleId === 6) {
      const d = data as Partial<M6Budget>
      return !!(d.direct_costs_total && d.direct_costs_total > 0 && d.budget_justification?.trim())
    }
    if (moduleId === 7) {
      const d = data as Partial<M7Regulatory>
      return !!(d.facilities_description?.trim())
    }
    return false
  }

  // Module 1: Title & Concept (shared for Fast Track)
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

  // Module 2: Hypothesis (shared for Fast Track)
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

  // Module 3: Specific Aims - with Fast Track phases
  const renderM3 = () => {
    if (isFastTrack) {
      const ftData = project.m3_fast_track
      const currentPhaseData = phaseTab === 'phase1' ? ftData.phase1 : ftData.phase2
      const phase1Complete = checkPhase1Fields(ftData.phase1)
      
      const update = (field: string, value: string | string[]) => {
        const updatedPhase = { ...currentPhaseData, [field]: value }
        const isComplete = checkPhase1Fields(updatedPhase as Partial<M3SpecificAims>)
        onUpdate({
          m3_fast_track: {
            ...ftData,
            [phaseTab]: updatedPhase,
            [`${phaseTab}_complete`]: isComplete
          }
        })
      }

      return (
        <div>
          <PhaseTabs
            activeTab={phaseTab}
            onTabChange={setPhaseTab}
            phase1Complete={phase1Complete}
            phase2Locked={!phase1Complete && phaseTab !== 'phase1'}
            moduleId={3}
          />
          <div className="flex items-center gap-2 mb-4">
            <PhaseIndicator phase={phaseTab === 'phase1' ? 'I' : 'II'} />
            <span className="text-sm text-neutral-600">
              {phaseTab === 'phase1' ? 'Feasibility study aims' : 'Full development aims'}
            </span>
          </div>
          <TextField label="Aim 1 Statement" value={currentPhaseData.aim1_statement || ''} onChange={v => update('aim1_statement', v)} required multiline placeholder={phaseTab === 'phase1' ? 'Phase I feasibility aim' : 'Phase II development aim'} />
          <TextField label="Aim 1 Milestones" value={(currentPhaseData.aim1_milestones || []).join('\n')} onChange={v => update('aim1_milestones', v.split('\n').filter(s => s.trim()))} required multiline placeholder="Enter milestones (one per line)" />
          <TextField label="Aim 2 Statement" value={currentPhaseData.aim2_statement || ''} onChange={v => update('aim2_statement', v)} required multiline placeholder={phaseTab === 'phase1' ? 'Secondary feasibility aim' : 'Secondary development aim'} />
          <TextField label="Aim 2 Milestones" value={(currentPhaseData.aim2_milestones || []).join('\n')} onChange={v => update('aim2_milestones', v.split('\n').filter(s => s.trim()))} required multiline placeholder="Enter milestones (one per line)" />
          <TextField label="Aim 3 Statement (Optional)" value={currentPhaseData.aim3_statement || ''} onChange={v => update('aim3_statement', v)} multiline placeholder="Third specific aim (if applicable)" />
          <TextField label="Timeline Summary" value={currentPhaseData.timeline_summary || ''} onChange={v => update('timeline_summary', v)} required multiline placeholder={`${phaseTab === 'phase1' ? 'Phase I' : 'Phase II'} timeline`} />
          <TextField label="Aim Interdependencies" value={currentPhaseData.interdependencies || ''} onChange={v => update('interdependencies', v)} required multiline placeholder="How do the aims relate to each other?" />
        </div>
      )
    }

    // Non-Fast Track
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

  // Module 4: Team Mapping (shared for Fast Track)
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

  // Module 5: Experimental Approach - with Fast Track phases
  const renderM5 = () => {
    if (isFastTrack) {
      const ftData = project.m5_fast_track
      const currentPhaseData = phaseTab === 'phase1' ? ftData.phase1 : ftData.phase2
      const phase1Complete = checkPhase1Fields(ftData.phase1)

      const update = (field: string, value: string) => {
        const updatedPhase = { ...currentPhaseData, [field]: value }
        const isComplete = checkPhase1Fields(updatedPhase as Partial<M5ExperimentalApproach>)
        onUpdate({
          m5_fast_track: {
            ...ftData,
            [phaseTab]: updatedPhase,
            [`${phaseTab}_complete`]: isComplete
          }
        })
      }

      return (
        <div>
          <PhaseTabs
            activeTab={phaseTab}
            onTabChange={setPhaseTab}
            phase1Complete={phase1Complete}
            phase2Locked={!phase1Complete && phaseTab !== 'phase1'}
            moduleId={5}
          />
          <div className="flex items-center gap-2 mb-4">
            <PhaseIndicator phase={phaseTab === 'phase1' ? 'I' : 'II'} />
            <span className="text-sm text-neutral-600">
              {phaseTab === 'phase1' ? 'Feasibility study methods' : 'Full-scale development methods'}
            </span>
          </div>
          <TextField label="Methodology Overview" value={currentPhaseData.methodology_overview || ''} onChange={v => update('methodology_overview', v)} required multiline />
          <TextField label="Experimental Design" value={currentPhaseData.experimental_design || ''} onChange={v => update('experimental_design', v)} required multiline />
          <TextField label="Data Collection Methods" value={currentPhaseData.data_collection_methods || ''} onChange={v => update('data_collection_methods', v)} required multiline />
          <TextField label="Analysis Plan" value={currentPhaseData.analysis_plan || ''} onChange={v => update('analysis_plan', v)} required multiline />
          <TextField label="Statistical Approach" value={currentPhaseData.statistical_approach || ''} onChange={v => update('statistical_approach', v)} required multiline />
          <TextField label="Expected Results" value={currentPhaseData.expected_results || ''} onChange={v => update('expected_results', v)} required multiline />
          <TextField label="Potential Pitfalls" value={currentPhaseData.potential_pitfalls || ''} onChange={v => update('potential_pitfalls', v)} required multiline />
          <TextField label="Alternative Approaches" value={currentPhaseData.alternative_approaches || ''} onChange={v => update('alternative_approaches', v)} required multiline />
        </div>
      )
    }

    // Non-Fast Track
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

  // Module 6: Budget - with Fast Track phases
  const renderM6 = () => {
    const institute = project.institute || 'Standard NIH'
    
    if (isFastTrack) {
      const ftData = project.m6_fast_track
      const currentPhaseData = phaseTab === 'phase1' ? ftData.phase1 : ftData.phase2
      const phase1Complete = checkPhase1Fields(ftData.phase1)
      const budgetCap = getBudgetCap(institute, 'Fast Track', phaseTab as 'phase1' | 'phase2')

      const updateField = (field: string, value: number | string) => {
        const updatedPhase = { ...currentPhaseData, [field]: value }
        const isComplete = checkPhase1Fields(updatedPhase as Partial<M6Budget>)
        onUpdate({
          m6_fast_track: {
            ...ftData,
            [phaseTab]: updatedPhase,
            [`${phaseTab}_complete`]: isComplete
          }
        })
      }

      return (
        <div>
          <PhaseTabs
            activeTab={phaseTab}
            onTabChange={setPhaseTab}
            phase1Complete={phase1Complete}
            phase2Locked={!phase1Complete && phaseTab !== 'phase1'}
            moduleId={6}
          />
          <div className="flex items-center gap-2 mb-4">
            <PhaseIndicator phase={phaseTab === 'phase1' ? 'I' : 'II'} />
            <span className="text-sm text-neutral-600">
              {institute} Budget cap: <strong>${budgetCap.toLocaleString()}</strong>
            </span>
          </div>
          {(currentPhaseData.direct_costs_total || 0) > budgetCap && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-sm text-red-800">
              <AlertTriangle className="w-4 h-4" />
              Budget exceeds {institute} {phaseTab === 'phase1' ? 'Phase I' : 'Phase II'} cap of ${budgetCap.toLocaleString()}
            </div>
          )}
          <NumberField label="Total Direct Costs" value={currentPhaseData.direct_costs_total || 0} onChange={v => updateField('direct_costs_total', v)} required prefix="$" max={budgetCap} />
          <NumberField label="Personnel Costs" value={currentPhaseData.personnel_costs || 0} onChange={v => updateField('personnel_costs', v)} required prefix="$" />
          <NumberField label="Equipment Costs" value={currentPhaseData.equipment_costs || 0} onChange={v => updateField('equipment_costs', v)} prefix="$" />
          <NumberField label="Supplies Costs" value={currentPhaseData.supplies_costs || 0} onChange={v => updateField('supplies_costs', v)} prefix="$" />
          <NumberField label="Travel Costs" value={currentPhaseData.travel_costs || 0} onChange={v => updateField('travel_costs', v)} prefix="$" />
          <NumberField label="Subaward Costs" value={currentPhaseData.subaward_costs || 0} onChange={v => updateField('subaward_costs', v)} prefix="$" />
          <NumberField label="Small Business %" value={currentPhaseData.small_business_percent || 67} onChange={v => updateField('small_business_percent', v)} required suffix="%" />
          {project.program_type === 'STTR' && (
            <NumberField label="Research Institution %" value={currentPhaseData.research_institution_percent || 0} onChange={v => updateField('research_institution_percent', v)} required suffix="%" />
          )}
          <TextField label="Budget Justification" value={currentPhaseData.budget_justification || ''} onChange={v => updateField('budget_justification', v)} required multiline placeholder={`Justify ${phaseTab === 'phase1' ? 'Phase I' : 'Phase II'} budget allocations`} />
        </div>
      )
    }

    // Non-Fast Track
    const data = project.m6_budget
    const legacy = project.legacy_budget
    const budgetCap = getBudgetCap(institute, project.grant_type)
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
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <span className="text-sm text-blue-800">
            {institute} {project.grant_type} budget cap: <strong>${budgetCap.toLocaleString()}</strong>
          </span>
        </div>
        {(data.direct_costs_total || legacy.directCosts || 0) > budgetCap && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-sm text-red-800">
            <AlertTriangle className="w-4 h-4" />
            Budget exceeds {institute} {project.grant_type} cap of ${budgetCap.toLocaleString()}
          </div>
        )}
        <NumberField label="Total Direct Costs" value={data.direct_costs_total || legacy.directCosts || 0} onChange={v => updateField('direct_costs_total', v)} required prefix="$" max={budgetCap} />
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

  // Module 7: Regulatory - with Fast Track phases
  const renderM7 = () => {
    if (isFastTrack) {
      const ftData = project.m7_fast_track
      const sharedData = ftData.shared || {}
      const phase2Data = ftData.phase2_additional || {}
      const sharedComplete = checkPhase1Fields(sharedData)

      const updateShared = (field: string, value: unknown) => {
        const updatedShared = { ...sharedData, [field]: value }
        const isComplete = checkPhase1Fields(updatedShared as Partial<M7Regulatory>)
        onUpdate({
          m7_fast_track: {
            ...ftData,
            shared: updatedShared,
            shared_complete: isComplete
          }
        })
      }

      const updatePhase2 = (field: string, value: string) => {
        const updated = { ...phase2Data, [field]: value }
        const isComplete = !!(updated.commercialization_plan?.trim())
        onUpdate({
          m7_fast_track: {
            ...ftData,
            phase2_additional: updated,
            phase2_complete: isComplete
          }
        })
      }

      return (
        <div>
          <PhaseTabs
            activeTab={phaseTab}
            onTabChange={setPhaseTab}
            phase1Complete={sharedComplete}
            phase2Locked={!sharedComplete && phaseTab !== 'shared'}
            moduleId={7}
          />
          
          {phaseTab === 'shared' ? (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <PhaseIndicator phase="Shared" />
                <span className="text-sm text-neutral-600">Applies to both phases</span>
              </div>
              <div className="mb-4">
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={sharedData.human_subjects_involved || false} onChange={e => updateShared('human_subjects_involved', e.target.checked)} className="w-4 h-4" />
                  <span className="text-sm font-medium text-neutral-700">Human Subjects Involved</span>
                </label>
                {sharedData.human_subjects_involved && (
                  <TextField label="IRB Approval Status" value={sharedData.irb_approval_status || ''} onChange={v => updateShared('irb_approval_status', v)} placeholder="Approved, Pending, N/A" />
                )}
              </div>
              <div className="mb-4">
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={sharedData.vertebrate_animals_involved || false} onChange={e => updateShared('vertebrate_animals_involved', e.target.checked)} className="w-4 h-4" />
                  <span className="text-sm font-medium text-neutral-700">Vertebrate Animals Involved</span>
                </label>
                {sharedData.vertebrate_animals_involved && (
                  <TextField label="IACUC Approval Status" value={sharedData.iacuc_approval_status || ''} onChange={v => updateShared('iacuc_approval_status', v)} placeholder="Approved, Pending, N/A" />
                )}
              </div>
              <div className="mb-4">
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={sharedData.biohazards_involved || false} onChange={e => updateShared('biohazards_involved', e.target.checked)} className="w-4 h-4" />
                  <span className="text-sm font-medium text-neutral-700">Biohazards Involved</span>
                </label>
                {sharedData.biohazards_involved && (
                  <TextField label="IBC Approval Status" value={sharedData.ibc_approval_status || ''} onChange={v => updateShared('ibc_approval_status', v)} placeholder="Approved, Pending, N/A" />
                )}
              </div>
              <TextField label="Facilities Description" value={sharedData.facilities_description || ''} onChange={v => updateShared('facilities_description', v)} required multiline placeholder="Describe available facilities and equipment" />
              <TextField label="Letters of Support" value={(sharedData.letters_of_support || []).join('\n')} onChange={v => updateShared('letters_of_support', v.split('\n').filter(s => s.trim()))} multiline placeholder="List letters of support (one per line)" />
            </div>
          ) : (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <PhaseIndicator phase="II" />
                <span className="text-sm text-neutral-600">Phase II specific requirements</span>
              </div>
              <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg mb-4">
                <p className="text-sm text-purple-800">Phase II applications require additional commercialization documentation.</p>
              </div>
              <TextField label="Commercialization Plan" value={phase2Data.commercialization_plan || ''} onChange={v => updatePhase2('commercialization_plan', v)} required multiline placeholder="Detailed plan for commercializing your technology" />
              <TextField label="Market Analysis" value={phase2Data.market_analysis || ''} onChange={v => updatePhase2('market_analysis', v)} multiline placeholder="Target market size and competitive landscape" />
              <TextField label="Manufacturing Plan" value={phase2Data.manufacturing_plan || ''} onChange={v => updatePhase2('manufacturing_plan', v)} multiline placeholder="How will you scale production?" />
            </div>
          )}
        </div>
      )
    }

    // Non-Fast Track
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

  // Module 8: Compilation (shared, validates both phases)
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

    const checklistItems = isFastTrack ? [
      'Phase I specific aims defined',
      'Phase II specific aims defined',
      'Phase I budget within $275K cap',
      'Phase II budget within $1.75M cap',
      'Team qualifications documented',
      'Regulatory approvals addressed',
      'Commercialization plan complete',
      'Page limits verified',
      'Format requirements met'
    ] : [
      'All specific aims defined',
      'Budget within NIH caps',
      'Team qualifications documented',
      'Regulatory approvals addressed',
      'Page limits verified',
      'Format requirements met'
    ]

    return (
      <div>
        {isFastTrack && (
          <div className="mb-6 p-4 bg-primary-50 border border-primary-200 rounded-lg">
            <p className="text-sm text-primary-800">Fast Track validation checks both Phase I and Phase II sections across all modules.</p>
          </div>
        )}
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

  // Calculate progress for display
  const getPhaseProgress = () => {
    if (!isFastTrack || !hasPhases) return null
    
    let phase1Progress = 0
    let phase2Progress = 0
    
    if (moduleId === 3) {
      phase1Progress = project.m3_fast_track.phase1_complete ? 100 : 50
      phase2Progress = project.m3_fast_track.phase2_complete ? 100 : 0
    } else if (moduleId === 5) {
      phase1Progress = project.m5_fast_track.phase1_complete ? 100 : 50
      phase2Progress = project.m5_fast_track.phase2_complete ? 100 : 0
    } else if (moduleId === 6) {
      phase1Progress = project.m6_fast_track.phase1_complete ? 100 : 50
      phase2Progress = project.m6_fast_track.phase2_complete ? 100 : 0
    } else if (moduleId === 7) {
      phase1Progress = project.m7_fast_track.shared_complete ? 100 : 50
      phase2Progress = project.m7_fast_track.phase2_complete ? 100 : 0
    }
    
    return { phase1Progress, phase2Progress }
  }

  const phaseProgress = getPhaseProgress()

  return (
    <div>
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-neutral-900">{def?.name}</h2>
          {isFastTrack && !hasPhases && (
            <span className="text-xs bg-neutral-100 text-neutral-600 px-2 py-1 rounded">Shared across phases</span>
          )}
        </div>
        {!hasPhases && (
          <p className="text-sm text-neutral-500 mt-1">
            {moduleState.completed_fields.length} of {moduleState.required_fields.length} required fields completed
          </p>
        )}
        {hasPhases && phaseProgress && (
          <div className="mt-3 grid grid-cols-2 gap-3">
            <div className="p-2 bg-blue-50 rounded-lg">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-blue-800">Phase I</span>
                <span className="text-xs text-blue-600">{phaseProgress.phase1Progress}%</span>
              </div>
              <div className="h-1.5 bg-blue-100 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 transition-all" style={{ width: `${phaseProgress.phase1Progress}%` }} />
              </div>
            </div>
            <div className="p-2 bg-purple-50 rounded-lg">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-purple-800">Phase II</span>
                <span className="text-xs text-purple-600">{phaseProgress.phase2Progress}%</span>
              </div>
              <div className="h-1.5 bg-purple-100 rounded-full overflow-hidden">
                <div className="h-full bg-purple-500 transition-all" style={{ width: `${phaseProgress.phase2Progress}%` }} />
              </div>
            </div>
          </div>
        )}
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
