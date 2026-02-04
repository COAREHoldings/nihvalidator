import { useState, useEffect, useCallback } from 'react'
import { ChevronLeft, ChevronRight, Save, Loader2 } from 'lucide-react'
import type { ProjectSchemaV2 } from '../../types'
import { StepSidebar, type Step } from '../layout/StepSidebar'
import { AIAssistant } from '../shared/AIAssistant'
import { StepSetup } from './StepSetup'
import { StepCoreConcept } from './StepCoreConcept'
import { StepResearchPlan } from './StepResearchPlan'
import { StepTeamBudget } from './StepTeamBudget'
import { StepReview } from './StepReview'

interface GrantEditorProps {
  project: ProjectSchemaV2
  onUpdate: (updates: Partial<ProjectSchemaV2>) => void
  onBackToDashboard: () => void
  onSave?: () => void
  saving?: boolean
  lastSaved?: Date | null
}

const STEPS = [
  { id: 1, name: 'Setup', description: 'Grant type, Institute, FOA' },
  { id: 2, name: 'Core Concept', description: 'Title, Hypothesis, Aims' },
  { id: 3, name: 'Research Plan', description: 'Methods, Timeline, Regulatory' },
  { id: 4, name: 'Team & Budget', description: 'Personnel, Budget Calculator' },
  { id: 5, name: 'Review & Export', description: 'Validation, Compliance, Export' },
]

export function GrantEditor({ project, onUpdate, onBackToDashboard, onSave, saving: externalSaving, lastSaved: externalLastSaved }: GrantEditorProps) {
  const [currentStep, setCurrentStep] = useState(1)
  const [showAI, setShowAI] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  
  // Use external save state if provided, otherwise use internal
  const actualSaving = externalSaving !== undefined ? externalSaving : isSaving
  const actualLastSaved = externalLastSaved !== undefined ? externalLastSaved : lastSaved

  // Calculate step completion status
  const getStepStatus = useCallback((stepId: number): 'completed' | 'current' | 'locked' => {
    if (stepId === currentStep) return 'current'
    
    // Check completion based on step
    switch (stepId) {
      case 1: // Setup
        return project.grant_type ? 'completed' : 'locked'
      case 2: // Core Concept
        const m1Done = !!(project.m1_title_concept?.project_title && project.m1_title_concept?.problem_statement)
        const m2Done = !!(project.m2_hypothesis?.central_hypothesis)
        const m3Done = !!(project.m3_specific_aims?.aims?.length > 0 && project.m3_specific_aims.aims[0]?.statement)
        return (m1Done && m2Done && m3Done) ? 'completed' : (stepId < currentStep ? 'completed' : 'locked')
      case 3: // Research Plan
        const m5Done = !!(project.m5_experimental_approach?.methodology_overview)
        const m7Done = !!(project.m7_regulatory?.facilities_description)
        return (m5Done && m7Done) ? 'completed' : (stepId < currentStep ? 'completed' : 'locked')
      case 4: // Team & Budget
        const m4Done = !!(project.m4_team_mapping?.pi_name)
        const m6Done = project.m6_budget?.total_project_costs !== undefined && project.m6_budget?.total_project_costs > 0
        return (m4Done && m6Done) ? 'completed' : (stepId < currentStep ? 'completed' : 'locked')
      case 5: // Review
        return stepId < currentStep ? 'completed' : 'locked'
      default:
        return 'locked'
    }
  }, [project, currentStep])

  // Build steps with status
  const stepsWithStatus: Step[] = STEPS.map(step => ({
    id: step.id,
    name: step.name,
    status: getStepStatus(step.id)
  }))

  // Calculate overall progress - use fallback values to prevent crashes
  const calculateProgress = (): number => {
    let completed = 0
    
    // Step 1: Setup (20%)
    if (project.grant_type) completed += 20
    
    // Step 2: Core Concept (20%)
    const m1 = project.m1_title_concept || {}
    const m1Fields = ['project_title', 'problem_statement', 'proposed_solution'] as const
    const m1Progress = m1Fields.filter(f => m1[f]).length / m1Fields.length
    const m2Progress = project.m2_hypothesis?.central_hypothesis ? 1 : 0
    const m3Progress = (project.m3_specific_aims?.aims?.length > 0 && project.m3_specific_aims.aims[0]?.statement) ? 1 : 0
    completed += ((m1Progress + m2Progress + m3Progress) / 3) * 20
    
    // Step 3: Research Plan (20%)
    const m5Progress = project.m5_experimental_approach?.methodology_overview ? 1 : 0
    const m7Progress = project.m7_regulatory?.facilities_description ? 1 : 0
    completed += ((m5Progress + m7Progress) / 2) * 20
    
    // Step 4: Team & Budget (20%)
    const m4Progress = project.m4_team_mapping?.pi_name ? 1 : 0
    const m6Progress = project.m6_budget?.total_project_costs && project.m6_budget?.total_project_costs > 0 ? 1 : 0
    completed += ((m4Progress + m6Progress) / 2) * 20
    
    // Step 5: Review (20%) - always considered incomplete until validation passes
    
    return Math.round(completed)
  }

  // Auto-save functionality
  useEffect(() => {
    const saveTimer = setInterval(() => {
      // Simulate auto-save
      setIsSaving(true)
      setTimeout(() => {
        setIsSaving(false)
        setLastSaved(new Date())
      }, 500)
    }, 30000) // Auto-save every 30 seconds

    return () => clearInterval(saveTimer)
  }, [])

  const handleSaveDraft = () => {
    if (onSave) {
      onSave()
    } else {
      setIsSaving(true)
      // Trigger update to persist
      onUpdate({ updated_at: new Date().toISOString() })
      setTimeout(() => {
        setIsSaving(false)
        setLastSaved(new Date())
      }, 500)
    }
  }

  const handleStepClick = (stepId: number) => {
    // Allow navigating to any step (progressive unlock can be enforced if needed)
    setCurrentStep(stepId)
  }

  const handleContinue = () => {
    if (currentStep < 5) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 1:
        return <StepSetup project={project} onUpdate={onUpdate} />
      case 2:
        return <StepCoreConcept project={project} onUpdate={onUpdate} />
      case 3:
        return <StepResearchPlan project={project} onUpdate={onUpdate} />
      case 4:
        return <StepTeamBudget project={project} onUpdate={onUpdate} />
      case 5:
        return <StepReview project={project} onUpdate={onUpdate} />
      default:
        return null
    }
  }

  const currentStepInfo = STEPS.find(s => s.id === currentStep)

  return (
    <div className="flex min-h-screen bg-neutral-50">
      {/* Step Sidebar */}
      <StepSidebar
        steps={stepsWithStatus}
        currentStep={currentStep}
        onStepClick={handleStepClick}
        onBackToDashboard={onBackToDashboard}
        grantTitle={project.m1_title_concept?.project_title || 'Untitled Grant'}
        grantType={project.grant_type ? `${project.program_type} ${project.grant_type}` : undefined}
        overallProgress={calculateProgress()}
      />

      {/* Main Content */}
      <main className="flex-1 flex flex-col">
        {/* Top Bar */}
        <header className="sticky top-0 z-30 bg-white border-b border-neutral-200">
          <div className="flex items-center justify-between px-6 py-3">
            {/* Breadcrumb */}
            <nav className="flex items-center gap-2 text-sm">
              <button onClick={onBackToDashboard} className="text-neutral-500 hover:text-neutral-700">
                Dashboard
              </button>
              <ChevronRight className="w-4 h-4 text-neutral-300" />
              <span className="text-neutral-500">{project.m1_title_concept?.project_title || 'Untitled Grant'}</span>
              <ChevronRight className="w-4 h-4 text-neutral-300" />
              <span className="text-primary-600 font-medium">{currentStepInfo?.name}</span>
            </nav>

            {/* Actions */}
            <div className="flex items-center gap-3">
              {actualLastSaved && (
                <span className="text-xs text-neutral-400">
                  Last saved {actualLastSaved.toLocaleTimeString()}
                </span>
              )}
              <button
                onClick={handleSaveDraft}
                disabled={actualSaving}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-neutral-700 bg-neutral-100 rounded-lg hover:bg-neutral-200 transition-colors disabled:opacity-50"
              >
                {actualSaving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                {actualSaving ? 'Saving...' : 'Save Draft'}
              </button>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 flex">
          <div className={`flex-1 p-6 lg:p-8 max-w-4xl mx-auto transition-all ${showAI ? 'mr-80' : ''}`}>
            {renderCurrentStep()}

            {/* Footer Navigation */}
            <div className="mt-8 pt-6 border-t border-neutral-200 flex items-center justify-between">
              <button
                onClick={handleBack}
                disabled={currentStep === 1}
                className="flex items-center gap-2 px-4 py-2 text-neutral-600 hover:text-neutral-900 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-5 h-5" />
                Back
              </button>

              <div className="flex items-center gap-3">
                {currentStep < 5 && (
                  <button
                    onClick={handleContinue}
                    className="flex items-center gap-2 px-6 py-2.5 bg-primary-500 text-white font-medium rounded-lg hover:bg-primary-600 transition-colors"
                  >
                    Continue
                    <ChevronRight className="w-5 h-5" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* AI Assistant Panel */}
          <AIAssistant
            isOpen={showAI}
            onToggle={() => setShowAI(!showAI)}
            currentStep={currentStep}
            stepName={currentStepInfo?.name || 'Grant Editor'}
            context={`${project.program_type} ${project.grant_type || ''} application`}
          />
        </div>
      </main>
    </div>
  )
}
