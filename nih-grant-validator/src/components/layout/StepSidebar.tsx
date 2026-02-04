import { Check, ChevronLeft } from 'lucide-react'

export interface Step {
  id: number
  name: string
  status: 'completed' | 'current' | 'locked'
}

interface StepSidebarProps {
  steps: Step[]
  currentStep: number
  onStepClick: (stepId: number) => void
  onBackToDashboard: () => void
  grantTitle?: string
  grantType?: string
  overallProgress: number
}

export function StepSidebar({
  steps,
  currentStep,
  onStepClick,
  onBackToDashboard,
  grantTitle,
  grantType,
  overallProgress
}: StepSidebarProps) {
  return (
    <aside className="w-72 min-h-screen bg-white border-r border-neutral-200 flex flex-col sticky top-0">
      {/* Header */}
      <div className="p-4 border-b border-neutral-100">
        <button
          onClick={onBackToDashboard}
          className="flex items-center gap-2 text-sm text-neutral-500 hover:text-neutral-700 transition-colors mb-3"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to Dashboard
        </button>
        {grantTitle && (
          <div>
            <h3 className="font-semibold text-neutral-900 truncate">{grantTitle}</h3>
            {grantType && <p className="text-xs text-neutral-500 mt-0.5">{grantType}</p>}
          </div>
        )}
      </div>

      {/* Steps */}
      <div className="flex-1 p-4 overflow-y-auto">
        <h4 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-4">
          Grant Progress
        </h4>
        
        <div className="space-y-1">
          {steps.map((step, index) => {
            const isCompleted = step.status === 'completed'
            const isCurrent = step.status === 'current'
            const isLocked = step.status === 'locked'

            return (
              <button
                key={step.id}
                onClick={() => onStepClick(step.id)}
                className={`w-full flex items-start gap-3 p-3 rounded-xl text-left transition-all ${
                  isCurrent
                    ? 'bg-primary-50 border-2 border-primary-200 shadow-sm'
                    : isCompleted
                    ? 'hover:bg-neutral-50'
                    : 'opacity-60'
                }`}
              >
                {/* Step Number/Check */}
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-medium ${
                  isCompleted
                    ? 'bg-green-500 text-white'
                    : isCurrent
                    ? 'bg-primary-500 text-white'
                    : 'bg-neutral-200 text-neutral-500'
                }`}>
                  {isCompleted ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    <span>{step.id}</span>
                  )}
                </div>

                {/* Step Info */}
                <div className="flex-1 min-w-0 pt-1">
                  <p className={`text-sm font-medium ${
                    isCurrent ? 'text-primary-700' : isCompleted ? 'text-neutral-900' : 'text-neutral-500'
                  }`}>
                    {step.name}
                  </p>
                  <p className={`text-xs mt-0.5 ${
                    isCurrent ? 'text-primary-600' : 'text-neutral-400'
                  }`}>
                    {isCompleted ? 'Completed' : isCurrent ? 'In Progress' : 'Not Started'}
                  </p>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Progress Footer */}
      <div className="p-4 border-t border-neutral-100 bg-neutral-50">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-neutral-700">Overall Progress</span>
          <span className="text-sm text-neutral-500">{overallProgress}%</span>
        </div>
        <div className="h-2 bg-neutral-200 rounded-full overflow-hidden">
          <div 
            className="h-full bg-primary-500 transition-all duration-500 ease-out rounded-full"
            style={{ width: `${overallProgress}%` }}
          />
        </div>
      </div>
    </aside>
  )
}
