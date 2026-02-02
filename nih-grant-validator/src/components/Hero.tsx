import { FileCheck, Upload } from 'lucide-react'

interface HeroProps {
  onStart: () => void
  onAudit: () => void
}

export function Hero({ onStart, onAudit }: HeroProps) {
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
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={onStart}
            className="px-8 py-4 bg-primary-500 text-white font-semibold rounded-md hover:bg-primary-600 transition-colors shadow-card hover:shadow-float"
          >
            Build New Grant
          </button>
          <button
            onClick={onAudit}
            className="px-8 py-4 bg-indigo-500 text-white font-semibold rounded-md hover:bg-indigo-600 transition-colors shadow-card hover:shadow-float flex items-center justify-center gap-2"
          >
            <Upload className="w-5 h-5" />
            Upload & Audit Existing Grant
          </button>
        </div>
        <p className="mt-6 text-sm text-neutral-500">
          Validate Phase I, Phase II, Fast Track, Direct to Phase II, and Phase IIB applications
        </p>
      </div>
    </div>
  )
}
