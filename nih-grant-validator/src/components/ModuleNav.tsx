import { CheckCircle, Circle, Lock, AlertCircle } from 'lucide-react'
import type { ModuleState } from '../types'

interface Props {
  modules: ModuleState[]
  activeModule: number
  onSelectModule: (id: number) => void
}

export function ModuleNav({ modules, activeModule, onSelectModule }: Props) {
  const getStatusIcon = (module: ModuleState) => {
    if (module.locked) return <Lock className="w-4 h-4 text-neutral-400" />
    if (module.status === 'complete') return <CheckCircle className="w-4 h-4 text-semantic-success" />
    if (module.status === 'partial') return <AlertCircle className="w-4 h-4 text-semantic-warning" />
    return <Circle className="w-4 h-4 text-neutral-300" />
  }

  const getStatusColor = (module: ModuleState, isActive: boolean) => {
    if (isActive) return 'bg-primary-500 text-white border-primary-500'
    if (module.locked) return 'bg-neutral-100 text-neutral-400 border-neutral-200 cursor-not-allowed'
    if (module.status === 'complete') return 'bg-green-50 text-green-800 border-green-200 hover:border-green-400'
    if (module.status === 'partial') return 'bg-amber-50 text-amber-800 border-amber-200 hover:border-amber-400'
    return 'bg-white text-neutral-700 border-neutral-200 hover:border-primary-300'
  }

  const getProgress = (module: ModuleState) => {
    if (module.required_fields.length === 0) return 0
    return Math.round((module.completed_fields.length / module.required_fields.length) * 100)
  }

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-neutral-500 uppercase tracking-wider mb-4">Modules</h3>
      {modules.map(module => {
        const isActive = module.module_id === activeModule
        const progress = getProgress(module)
        
        return (
          <button
            key={module.module_id}
            onClick={() => !module.locked && onSelectModule(module.module_id)}
            disabled={module.locked}
            className={`w-full p-3 rounded-lg border transition-all text-left ${getStatusColor(module, isActive)}`}
          >
            <div className="flex items-center gap-3">
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                isActive ? 'bg-white/20 text-white' : 'bg-neutral-100 text-neutral-600'
              }`}>
                {module.module_id}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm truncate">{module.name}</span>
                  {getStatusIcon(module)}
                </div>
                {!module.locked && (
                  <div className="mt-1.5">
                    <div className="h-1 bg-neutral-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all ${
                          module.status === 'complete' ? 'bg-semantic-success' :
                          module.status === 'partial' ? 'bg-semantic-warning' : 'bg-neutral-300'
                        }`}
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <span className="text-xs text-neutral-500 mt-0.5 block">
                      {module.completed_fields.length}/{module.required_fields.length} fields
                    </span>
                  </div>
                )}
                {module.locked && (
                  <span className="text-xs text-neutral-400 mt-1 block">Complete M1-7 to unlock</span>
                )}
              </div>
            </div>
          </button>
        )
      })}
    </div>
  )
}
