import { Check } from 'lucide-react'

interface StepperProps {
  steps: string[]
  current: number
  skipStep?: number
}

export function Stepper({ steps, current, skipStep }: StepperProps) {
  const visibleSteps = skipStep !== undefined 
    ? steps.filter((_, i) => i !== skipStep)
    : steps

  const adjustedCurrent = skipStep !== undefined && current > skipStep 
    ? current - 1 
    : current

  return (
    <div className="flex items-center justify-center">
      {visibleSteps.map((label, index) => {
        const isComplete = index < adjustedCurrent
        const isActive = index === adjustedCurrent

        return (
          <div key={label} className="flex items-center">
            <div className="flex flex-col items-center">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold transition-all ${
                  isComplete
                    ? 'bg-primary-500 text-white'
                    : isActive
                    ? 'bg-primary-500 text-white'
                    : 'bg-neutral-200 text-neutral-500'
                }`}
              >
                {isComplete ? <Check className="w-5 h-5" /> : index + 1}
              </div>
              <span
                className={`mt-2 text-sm font-medium ${
                  isActive ? 'text-neutral-900' : 'text-neutral-500'
                }`}
              >
                {label}
              </span>
            </div>
            {index < visibleSteps.length - 1 && (
              <div
                className={`w-16 md:w-24 h-0.5 mx-2 ${
                  index < adjustedCurrent ? 'bg-primary-500' : 'bg-neutral-200'
                }`}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}
