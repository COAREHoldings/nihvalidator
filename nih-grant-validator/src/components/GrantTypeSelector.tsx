import type { GrantType, ProgramType, FOAConfig, ProjectSchemaV2 } from '../types'
import { FileText, Rocket, Zap, Target, Award } from 'lucide-react'

interface Props {
  project: ProjectSchemaV2
  onUpdate: (updates: Partial<ProjectSchemaV2>) => void
}

const GRANT_TYPES: { type: GrantType; icon: typeof FileText; title: string; desc: string }[] = [
  { type: 'Phase I', icon: FileText, title: 'Phase I', desc: 'Initial feasibility study ($275K cap)' },
  { type: 'Phase II', icon: Target, title: 'Phase II', desc: 'Full R&D from Phase I success ($1.75M cap)' },
  { type: 'Fast Track', icon: Zap, title: 'Fast Track', desc: 'Combined Phase I & II application' },
  { type: 'Direct to Phase II', icon: Rocket, title: 'Direct to Phase II', desc: 'Skip Phase I with prior feasibility proof' },
  { type: 'Phase IIB', icon: Award, title: 'Phase IIB', desc: 'Continuation from Phase II success' },
]

export function GrantTypeSelector({ project, onUpdate }: Props) {
  const foa = project.foa_config
  
  const isTypeAllowed = (type: GrantType) => {
    if (type === 'Direct to Phase II' && !foa.direct_phase2_allowed) return false
    if (type === 'Fast Track' && !foa.fast_track_allowed) return false
    if (type === 'Phase IIB' && !foa.phase2b_allowed) return false
    return true
  }

  return (
    <div>
      <h2 className="text-xl font-semibold text-neutral-900 mb-2">Select Grant Type</h2>
      <p className="text-neutral-600 mb-6">Choose the type of SBIR/STTR grant you are applying for</p>

      <div className="mb-6">
        <label className="block text-sm font-medium text-neutral-700 mb-2">Program Type</label>
        <div className="flex gap-4">
          {(['SBIR', 'STTR'] as ProgramType[]).map(pt => (
            <button
              key={pt}
              onClick={() => onUpdate({ program_type: pt })}
              className={`flex-1 p-4 rounded-lg border-2 transition-all ${
                project.program_type === pt
                  ? 'border-primary-500 bg-primary-50'
                  : 'border-neutral-200 hover:border-neutral-300'
              }`}
            >
              <span className="font-semibold text-neutral-900">{pt}</span>
              <p className="text-xs text-neutral-500 mt-1">
                {pt === 'SBIR' ? 'Small Business Innovation Research' : 'Small Business Technology Transfer'}
              </p>
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {GRANT_TYPES.map(({ type, icon: Icon, title, desc }) => {
          const allowed = isTypeAllowed(type)
          const selected = project.grant_type === type
          return (
            <button
              key={type}
              onClick={() => allowed && onUpdate({ grant_type: type })}
              disabled={!allowed}
              className={`w-full p-4 rounded-lg border-2 text-left transition-all ${
                !allowed ? 'opacity-50 cursor-not-allowed border-neutral-200 bg-neutral-50' :
                selected ? 'border-primary-500 bg-primary-50' : 'border-neutral-200 hover:border-primary-300'
              }`}
            >
              <div className="flex items-center gap-4">
                <div className={`p-2 rounded-lg ${selected ? 'bg-primary-500 text-white' : 'bg-neutral-100 text-neutral-600'}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-neutral-900">{title}</h3>
                  <p className="text-sm text-neutral-500">{desc}</p>
                </div>
                {!allowed && (
                  <span className="text-xs text-neutral-400 bg-neutral-100 px-2 py-1 rounded">Not allowed by FOA</span>
                )}
              </div>
            </button>
          )
        })}
      </div>

      <div className="mt-8 p-4 bg-neutral-50 rounded-lg border border-neutral-200">
        <h4 className="font-semibold text-neutral-700 mb-3">FOA Configuration</h4>
        <div className="grid grid-cols-2 gap-3 text-sm">
          {[
            { key: 'direct_phase2_allowed' as const, label: 'Direct to Phase II Allowed' },
            { key: 'fast_track_allowed' as const, label: 'Fast Track Allowed' },
            { key: 'phase2b_allowed' as const, label: 'Phase IIB Allowed' },
            { key: 'commercialization_required' as const, label: 'Commercialization Required' },
          ].map(({ key, label }) => (
            <label key={key} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={foa[key]}
                onChange={e => onUpdate({ foa_config: { ...foa, [key]: e.target.checked } })}
                className="w-4 h-4 rounded"
              />
              <span className="text-neutral-700">{label}</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  )
}
