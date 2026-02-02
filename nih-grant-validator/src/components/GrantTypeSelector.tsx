import type { GrantType, ProgramType, ProjectSchemaV2, NIHInstitute } from '../types'
import { NIH_INSTITUTES, INSTITUTE_BUDGET_CAPS } from '../types'
import { FileText, Rocket, Zap, Target, Award, Building2 } from 'lucide-react'

interface Props {
  project: ProjectSchemaV2
  onUpdate: (updates: Partial<ProjectSchemaV2>) => void
}

const GRANT_TYPES: { type: GrantType; icon: typeof FileText; title: string; getDesc: (institute: NIHInstitute) => string }[] = [
  { type: 'Phase I', icon: FileText, title: 'Phase I', getDesc: (inst) => `Initial feasibility study ($${(INSTITUTE_BUDGET_CAPS[inst].phase1 / 1000).toFixed(0)}K cap)` },
  { type: 'Phase II', icon: Target, title: 'Phase II', getDesc: (inst) => `Full R&D from Phase I success ($${(INSTITUTE_BUDGET_CAPS[inst].phase2 / 1000000).toFixed(2)}M cap)` },
  { type: 'Fast Track', icon: Zap, title: 'Fast Track', getDesc: () => 'Combined Phase I & II application' },
  { type: 'Direct to Phase II', icon: Rocket, title: 'Direct to Phase II', getDesc: () => 'Skip Phase I with prior feasibility proof' },
  { type: 'Phase IIB', icon: Award, title: 'Phase IIB', getDesc: (inst) => {
    const cap = INSTITUTE_BUDGET_CAPS[inst].phase2b
    return cap ? `Continuation from Phase II ($${(cap / 1000000).toFixed(1)}M cap)` : 'Continuation from Phase II success'
  }},
]

export function GrantTypeSelector({ project, onUpdate }: Props) {
  const foa = project.foa_config
  const institute = project.institute || 'Standard NIH'
  const caps = INSTITUTE_BUDGET_CAPS[institute]
  
  const isTypeAllowed = (type: GrantType) => {
    if (type === 'Direct to Phase II' && !foa.direct_phase2_allowed) return false
    if (type === 'Fast Track' && !foa.fast_track_allowed) return false
    if (type === 'Phase IIB' && !foa.phase2b_allowed) return false
    if (type === 'Phase IIB' && !caps.phase2b) return false
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

      <div className="mb-6">
        <label className="block text-sm font-medium text-neutral-700 mb-2">
          <Building2 className="w-4 h-4 inline mr-1" />
          NIH Institute
        </label>
        <select
          value={institute}
          onChange={e => onUpdate({ institute: e.target.value as NIHInstitute })}
          className="w-full p-3 border border-neutral-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          {NIH_INSTITUTES.map(inst => (
            <option key={inst.code} value={inst.code}>
              {inst.code} - {inst.name}
            </option>
          ))}
        </select>
        {institute === 'NCI' && (
          <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800 font-medium">NCI has higher budget caps:</p>
            <ul className="text-sm text-blue-700 mt-1">
              <li>Phase I: $400,000 (vs standard $275,000)</li>
              <li>Phase II: $2,000,000 (vs standard $1,750,000)</li>
              <li>Phase IIB: $4,500,000</li>
            </ul>
          </div>
        )}
        {institute !== 'NCI' && institute !== 'Standard NIH' && (
          <p className="text-xs text-neutral-500 mt-2">
            Using standard NIH budget caps: Phase I $275K, Phase II $1.75M
          </p>
        )}
      </div>

      <div className="space-y-3">
        {GRANT_TYPES.map(({ type, icon: Icon, title, getDesc }) => {
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
                  <p className="text-sm text-neutral-500">{getDesc(institute)}</p>
                </div>
                {!allowed && (
                  <span className="text-xs text-neutral-400 bg-neutral-100 px-2 py-1 rounded">
                    {type === 'Phase IIB' && !caps.phase2b ? 'Not available for this institute' : 'Not allowed by FOA'}
                  </span>
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
