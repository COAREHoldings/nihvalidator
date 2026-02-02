import { Rocket, ArrowRight, Zap, FastForward, TrendingUp } from 'lucide-react'
import type { GrantData, GrantType, ProgramType } from '../types'

interface Props {
  data: GrantData
  updateData: (updates: Partial<GrantData>) => void
  onNext: () => void
}

const grantTypes: { type: GrantType; icon: typeof Rocket; title: string; desc: string }[] = [
  { type: 'Phase I', icon: Rocket, title: 'Phase I', desc: 'Initial feasibility study up to $275K' },
  { type: 'Phase II', icon: ArrowRight, title: 'Phase II', desc: 'Full R&D after Phase I success up to $1.75M' },
  { type: 'Fast Track', icon: Zap, title: 'Fast Track', desc: 'Combined Phase I + II application' },
  { type: 'Direct to Phase II', icon: FastForward, title: 'Direct to Phase II', desc: 'Skip Phase I with proven feasibility' },
  { type: 'Phase IIB', icon: TrendingUp, title: 'Phase IIB', desc: 'Continuation funding after Phase II' },
]

export function GrantTypeStep({ data, updateData, onNext }: Props) {
  return (
    <div>
      <h2 className="text-2xl font-semibold text-neutral-900 mb-2">Select Grant Type</h2>
      <p className="text-neutral-700 mb-8">Choose the SBIR/STTR phase you are applying for</p>

      <div className="flex gap-4 mb-8">
        {(['SBIR', 'STTR'] as ProgramType[]).map(prog => (
          <button
            key={prog}
            onClick={() => updateData({ programType: prog })}
            className={`px-6 py-3 rounded-md font-medium transition-all ${
              data.programType === prog
                ? 'bg-primary-500 text-white'
                : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
            }`}
          >
            {prog}
          </button>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {grantTypes.map(({ type, icon: Icon, title, desc }) => (
          <button
            key={type}
            onClick={() => updateData({ grantType: type })}
            className={`p-6 rounded-lg border-2 text-left transition-all hover:shadow-float hover:-translate-y-0.5 ${
              data.grantType === type
                ? 'border-primary-500 bg-primary-50'
                : 'border-neutral-200 bg-white hover:border-primary-500'
            }`}
          >
            <Icon className={`w-6 h-6 mb-3 ${data.grantType === type ? 'text-primary-500' : 'text-neutral-500'}`} />
            <h3 className="font-semibold text-neutral-900 mb-1">{title}</h3>
            <p className="text-sm text-neutral-700">{desc}</p>
          </button>
        ))}
      </div>

      <div className="mt-10 flex justify-end">
        <button
          onClick={onNext}
          disabled={!data.grantType}
          className="px-6 py-3 bg-primary-500 text-white font-semibold rounded-md hover:bg-primary-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Continue
        </button>
      </div>
    </div>
  )
}
