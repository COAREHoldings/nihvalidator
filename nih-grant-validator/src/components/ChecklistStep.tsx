import { Check } from 'lucide-react'
import type { GrantData } from '../types'

interface Props {
  data: GrantData
  updateData: (updates: Partial<GrantData>) => void
  onNext: () => void
  onBack: () => void
}

const baseComponents = [
  { id: 'specificAims', label: 'Specific Aims (with impact statement)', limit: '1 page' },
  { id: 'researchStrategy', label: 'Research Strategy (Significance, Innovation, Approach)', limit: '6 pages' },
  { id: 'budget', label: 'Budget & Justification', limit: 'N/A' },
  { id: 'biosketches', label: 'Biographical Sketches', limit: '5 pages each' },
  { id: 'facilities', label: 'Facilities & Equipment', limit: 'N/A' },
  { id: 'lettersOfSupport', label: 'Letters of Support', limit: 'If applicable' },
  { id: 'iacucApproval', label: 'IACUC Approval', limit: 'If vertebrate animals' },
  { id: 'irbApproval', label: 'IRB Approval', limit: 'If human subjects' },
]

const phase2Components = [
  { id: 'progressReport', label: 'Phase I Progress Report', limit: 'Required' },
  { id: 'commercializationPlan', label: 'Commercialization Plan', limit: 'Required' },
  { id: 'marketAnalysis', label: 'Market Analysis', limit: 'Required' },
  { id: 'teamStructure', label: 'Updated Team Structure', limit: 'Required' },
]

export function ChecklistStep({ data, updateData, onNext, onBack }: Props) {
  const needsPhase2 = data.grantType === 'Phase II' || data.grantType === 'Fast Track' || data.grantType === 'Direct to Phase II' || data.grantType === 'Phase IIB'
  
  const toggleItem = (id: string) => {
    updateData({ checklist: { ...data.checklist, [id]: !data.checklist[id] } })
  }

  const allComponents = needsPhase2 ? [...baseComponents, ...phase2Components] : baseComponents
  const checkedCount = allComponents.filter(c => data.checklist[c.id]).length

  return (
    <div>
      <h2 className="text-2xl font-semibold text-neutral-900 mb-2">Structural Completeness</h2>
      <p className="text-neutral-700 mb-2">Check all components included in your application</p>
      <p className="text-sm text-neutral-500 mb-8">{checkedCount} of {allComponents.length} components checked</p>

      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-neutral-500 uppercase tracking-wide">Core Components</h3>
        {baseComponents.map(item => (
          <label
            key={item.id}
            className={`flex items-center p-4 rounded-lg border cursor-pointer transition-all ${
              data.checklist[item.id]
                ? 'border-primary-500 bg-primary-50'
                : 'border-neutral-200 hover:border-neutral-300'
            }`}
          >
            <div
              className={`w-6 h-6 rounded flex items-center justify-center mr-4 ${
                data.checklist[item.id] ? 'bg-primary-500' : 'border-2 border-neutral-300'
              }`}
            >
              {data.checklist[item.id] && <Check className="w-4 h-4 text-white" />}
            </div>
            <input
              type="checkbox"
              checked={data.checklist[item.id] || false}
              onChange={() => toggleItem(item.id)}
              className="sr-only"
            />
            <span className="flex-1 text-neutral-900">{item.label}</span>
            <span className="text-sm text-neutral-500">{item.limit}</span>
          </label>
        ))}

        {needsPhase2 && (
          <>
            <h3 className="text-sm font-semibold text-neutral-500 uppercase tracking-wide mt-8">Phase II Components</h3>
            {phase2Components.map(item => (
              <label
                key={item.id}
                className={`flex items-center p-4 rounded-lg border cursor-pointer transition-all ${
                  data.checklist[item.id]
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-neutral-200 hover:border-neutral-300'
                }`}
              >
                <div
                  className={`w-6 h-6 rounded flex items-center justify-center mr-4 ${
                    data.checklist[item.id] ? 'bg-primary-500' : 'border-2 border-neutral-300'
                  }`}
                >
                  {data.checklist[item.id] && <Check className="w-4 h-4 text-white" />}
                </div>
                <input
                  type="checkbox"
                  checked={data.checklist[item.id] || false}
                  onChange={() => toggleItem(item.id)}
                  className="sr-only"
                />
                <span className="flex-1 text-neutral-900">{item.label}</span>
                <span className="text-sm text-neutral-500">{item.limit}</span>
              </label>
            ))}
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
