import type { GrantData } from '../types'

interface Props {
  data: GrantData
  updateData: (updates: Partial<GrantData>) => void
  onNext: () => void
  onBack: () => void
}

export function PriorPhaseStep({ data, updateData, onNext, onBack }: Props) {
  const isDirectToPhase2 = data.grantType === 'Direct to Phase II'
  const priorPhaseName = data.grantType === 'Phase IIB' ? 'Phase II' : 'Phase I'

  const updatePriorPhase = (field: string, value: string) => {
    updateData({ priorPhase: { ...data.priorPhase, [field]: value } })
  }

  return (
    <div>
      <h2 className="text-2xl font-semibold text-neutral-900 mb-2">
        {isDirectToPhase2 ? 'Feasibility Documentation' : `Prior ${priorPhaseName} Documentation`}
      </h2>
      <p className="text-neutral-700 mb-8">
        {isDirectToPhase2
          ? 'Provide evidence of feasibility achieved through non-SBIR/STTR funding'
          : `Document your successful ${priorPhaseName} completion`}
      </p>

      <div className="space-y-6">
        {!isDirectToPhase2 && (
          <>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                {priorPhaseName} Award Number
              </label>
              <input
                type="text"
                value={data.priorPhase.awardNumber}
                onChange={e => updatePriorPhase('awardNumber', e.target.value)}
                placeholder="e.g., 1R43AI123456-01"
                className="w-full px-4 py-3 border border-neutral-200 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                Completion Date
              </label>
              <input
                type="date"
                value={data.priorPhase.completionDate}
                onChange={e => updatePriorPhase('completionDate', e.target.value)}
                className="w-full px-4 py-3 border border-neutral-200 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
          </>
        )}

        {isDirectToPhase2 && (
          <>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                Funding Source
              </label>
              <input
                type="text"
                value={data.priorPhase.fundingSource}
                onChange={e => updatePriorPhase('fundingSource', e.target.value)}
                placeholder="e.g., NSF Grant, Angel Investment, Internal R&D"
                className="w-full px-4 py-3 border border-neutral-200 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                Key Findings Summary
              </label>
              <textarea
                value={data.priorPhase.findings}
                onChange={e => updatePriorPhase('findings', e.target.value)}
                rows={4}
                placeholder="Summarize the feasibility results that demonstrate readiness for Phase II"
                className="w-full px-4 py-3 border border-neutral-200 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
          </>
        )}
      </div>

      <div className="mt-10 flex justify-between">
        <button
          onClick={onBack}
          className="px-6 py-3 text-neutral-700 font-semibold rounded-md hover:bg-neutral-100 transition-colors"
        >
          Back
        </button>
        <button
          onClick={onNext}
          className="px-6 py-3 bg-primary-500 text-white font-semibold rounded-md hover:bg-primary-600 transition-colors"
        >
          Continue
        </button>
      </div>
    </div>
  )
}
