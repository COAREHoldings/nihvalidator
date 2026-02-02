import { FileCheck } from 'lucide-react'

interface HeroProps {
  onStart: () => void
}

export function Hero({ onStart }: HeroProps) {
  return (
    <div className="min-h-screen bg-neutral-50 flex items-center justify-center px-6">
      <div className="text-center max-w-2xl">
        <div className="w-16 h-16 bg-primary-50 rounded-2xl flex items-center justify-center mx-auto mb-8">
          <FileCheck className="w-8 h-8 text-primary-500" />
        </div>
        <h1 className="text-5xl font-bold text-neutral-900 tracking-tight mb-4">
          NIH SBIR/STTR Validator
        </h1>
        <p className="text-xl text-neutral-700 mb-10 leading-relaxed">
          Pre-submission structural and budget compliance check for your grant application
        </p>
        <button
          onClick={onStart}
          className="px-8 py-4 bg-primary-500 text-white font-semibold rounded-md hover:bg-primary-600 transition-colors shadow-card hover:shadow-float"
        >
          Start Validation
        </button>
        <p className="mt-6 text-sm text-neutral-500">
          Validate Phase I, Phase II, Fast Track, Direct to Phase II, and Phase IIB applications
        </p>
      </div>
    </div>
  )
}
