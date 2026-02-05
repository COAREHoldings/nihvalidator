import { useState } from 'react'
import { Check, ChevronLeft, Menu, X } from 'lucide-react'

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
  const [mobileOpen, setMobileOpen] = useState(false)

  const handleStepClick = (stepId: number) => {
    onStepClick(stepId)
    setMobileOpen(false) // Close mobile menu after selection
  }

  const currentStepInfo = steps.find(s => s.id === currentStep)

  return (
    <>
      {/* Mobile Header Bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 bg-white border-b border-neutral-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileOpen(true)}
              className="p-2 -ml-2 text-neutral-600 hover:bg-neutral-100 rounded-lg"
              aria-label="Open step menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="min-w-0">
              <p className="text-sm font-medium text-neutral-900 truncate max-w-[180px]">
                {currentStepInfo?.name || 'Grant Editor'}
              </p>
              <p className="text-xs text-neutral-500">Step {currentStep} of {steps.length}</p>
            </div>
          </div>
          
          {/* Mobile Progress Indicator */}
          <div className="flex items-center gap-2">
            <div className="w-16 h-1.5 bg-neutral-200 rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary-500 rounded-full transition-all"
                style={{ width: `${overallProgress}%` }}
              />
            </div>
            <span className="text-xs text-neutral-500 w-8">{overallProgress}%</span>
          </div>
        </div>
        
        {/* Mobile Step Pills */}
        <div className="flex gap-1.5 mt-3 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-hide">
          {steps.map((step) => {
            const isCompleted = step.status === 'completed'
            const isCurrent = step.status === 'current'
            
            return (
              <button
                key={step.id}
                onClick={() => handleStepClick(step.id)}
                className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  isCurrent
                    ? 'bg-primary-500 text-white'
                    : isCompleted
                    ? 'bg-green-100 text-green-700'
                    : 'bg-neutral-100 text-neutral-500'
                }`}
              >
                {isCompleted ? (
                  <Check className="w-3 h-3" />
                ) : (
                  <span className="w-4 h-4 rounded-full bg-current/20 flex items-center justify-center text-[10px]">
                    {step.id}
                  </span>
                )}
                <span className="whitespace-nowrap">{step.name}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Mobile Overlay */}
      {mobileOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-black/50 z-50"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar - Desktop always visible, Mobile slides in */}
      <aside className={`
        fixed md:sticky top-0 left-0 z-50 md:z-auto
        w-72 min-h-screen bg-white border-r border-neutral-200 flex flex-col
        transform transition-transform duration-300 ease-in-out
        ${mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        {/* Mobile Close Button */}
        <button
          onClick={() => setMobileOpen(false)}
          className="md:hidden absolute top-4 right-4 p-1 text-neutral-500 hover:text-neutral-700"
          aria-label="Close menu"
        >
          <X className="w-5 h-5" />
        </button>

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
                  onClick={() => handleStepClick(step.id)}
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

      {/* Spacer for mobile header */}
      <div className="md:hidden h-[116px]" />
    </>
  )
}
