import { CheckCircle, XCircle, AlertTriangle, Download, RotateCcw } from 'lucide-react'
import type { ValidationResult } from '../types'

interface Props {
  result: ValidationResult
  onReset: () => void
}

export function ResultsPanel({ result, onReset }: Props) {
  const isReady = result.status === 'structurally_ready'

  const exportJSON = () => {
    const exportData = {
      ...result,
      exportedAt: new Date().toISOString(),
      note: 'Final funding outcome determined by NIH peer review. This validation confirms structural completeness only.',
    }
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `nih-validation-${result.phase.replace(/\s+/g, '-').toLowerCase()}-${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div>
      <div className={`p-6 rounded-lg mb-8 ${isReady ? 'bg-green-50' : 'bg-red-50'}`}>
        <div className="flex items-center gap-4">
          {isReady ? (
            <CheckCircle className="w-12 h-12 text-semantic-success" />
          ) : (
            <XCircle className="w-12 h-12 text-semantic-error" />
          )}
          <div>
            <h2 className="text-2xl font-semibold text-neutral-900">
              {isReady ? 'Structurally Ready' : 'Not Ready for Submission'}
            </h2>
            <p className="text-neutral-700">
              {result.phase} | {result.data.program_type}
            </p>
          </div>
        </div>
      </div>

      {result.errors.length > 0 && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-neutral-900 mb-3 flex items-center gap-2">
            <XCircle className="w-5 h-5 text-semantic-error" />
            Blocking Issues ({result.errors.length})
          </h3>
          <div className="space-y-2">
            {result.errors.map((error, i) => (
              <div key={i} className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-start gap-3">
                  <span className="text-xs font-mono bg-red-100 text-red-800 px-2 py-1 rounded">{error.code}</span>
                  <p className="text-neutral-900">{error.message}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {result.warnings.length > 0 && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-neutral-900 mb-3 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-semantic-warning" />
            Warnings ({result.warnings.length})
          </h3>
          <div className="space-y-2">
            {result.warnings.map((warning, i) => (
              <div key={i} className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <div className="flex items-start gap-3">
                  <span className="text-xs font-mono bg-amber-100 text-amber-800 px-2 py-1 rounded">{warning.code}</span>
                  <p className="text-neutral-900">{warning.message}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {isReady && (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg mb-6">
          <p className="text-sm text-neutral-700">
            <strong>Note:</strong> Final funding outcome determined by NIH peer review. This validation confirms structural completeness only.
          </p>
        </div>
      )}

      <div className="border-t border-neutral-200 pt-6">
        <h3 className="text-lg font-semibold text-neutral-900 mb-4">Summary</h3>
        <div className="grid md:grid-cols-2 gap-4 text-sm">
          <div className="p-3 bg-neutral-50 rounded-lg">
            <span className="text-neutral-500">Grant Type:</span>
            <span className="ml-2 font-medium text-neutral-900">{result.phase}</span>
          </div>
          <div className="p-3 bg-neutral-50 rounded-lg">
            <span className="text-neutral-500">Program:</span>
            <span className="ml-2 font-medium text-neutral-900">{result.data.program_type}</span>
          </div>
          <div className="p-3 bg-neutral-50 rounded-lg">
            <span className="text-neutral-500">Direct Costs:</span>
            <span className="ml-2 font-medium text-neutral-900">${result.data.legacy_budget.directCosts.toLocaleString()}</span>
          </div>
          <div className="p-3 bg-neutral-50 rounded-lg">
            <span className="text-neutral-500">Small Business %:</span>
            <span className="ml-2 font-medium text-neutral-900">{result.data.legacy_budget.smallBusinessPercent}%</span>
          </div>
        </div>
      </div>

      <div className="mt-10 flex flex-col sm:flex-row gap-4">
        <button
          onClick={exportJSON}
          className="flex-1 px-6 py-3 bg-primary-500 text-white font-semibold rounded-md hover:bg-primary-600 transition-colors flex items-center justify-center gap-2"
        >
          <Download className="w-5 h-5" />
          Export JSON
        </button>
        <button
          onClick={onReset}
          className="flex-1 px-6 py-3 border border-neutral-300 text-neutral-700 font-semibold rounded-md hover:bg-neutral-100 transition-colors flex items-center justify-center gap-2"
        >
          <RotateCcw className="w-5 h-5" />
          Start New Validation
        </button>
      </div>
    </div>
  )
}
