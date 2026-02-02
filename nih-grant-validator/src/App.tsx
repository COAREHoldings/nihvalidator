import { useState, useCallback, useEffect } from 'react'
import { Hero } from './components/Hero'
import { ModuleNav } from './components/ModuleNav'
import { ModuleEditor } from './components/ModuleEditor'
import { GrantTypeSelector } from './components/GrantTypeSelector'
import { PriorPhaseEditor } from './components/PriorPhaseEditor'
import { AIRefinement } from './components/AIRefinement'
import type { ProjectSchemaV2, ValidationResult } from './types'
import { createNewProject, updateModuleStates, runFullValidation, checkAIGating } from './validation'
import { ClipboardCheck, Sparkles, Settings, FileCheck, Lock, CheckCircle, XCircle, Download, RotateCcw } from 'lucide-react'

type AppMode = 'modules' | 'ai-refinement' | 'results'
type ConfigTab = 'grant-type' | 'lifecycle'

export default function App() {
  const [started, setStarted] = useState(false)
  const [mode, setMode] = useState<AppMode>('modules')
  const [activeModule, setActiveModule] = useState(1)
  const [configTab, setConfigTab] = useState<ConfigTab>('grant-type')
  const [showConfig, setShowConfig] = useState(true)
  const [project, setProject] = useState<ProjectSchemaV2>(() => createNewProject())
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null)

  // Update module states when project changes
  useEffect(() => {
    const updatedStates = updateModuleStates(project)
    if (JSON.stringify(updatedStates) !== JSON.stringify(project.module_states)) {
      setProject(prev => ({ ...prev, module_states: updatedStates, updated_at: new Date().toISOString() }))
    }
  }, [project.m1_title_concept, project.m2_hypothesis, project.m3_specific_aims, project.m4_team_mapping, project.m5_experimental_approach, project.m6_budget, project.m7_regulatory, project.m8_compilation])

  const updateProject = useCallback((updates: Partial<ProjectSchemaV2>) => {
    setProject(prev => ({ ...prev, ...updates, updated_at: new Date().toISOString() }))
  }, [])

  const runValidation = () => {
    const result = runFullValidation(project)
    setValidationResult(result)
    setMode('results')
  }

  const reset = () => {
    setProject(createNewProject())
    setValidationResult(null)
    setMode('modules')
    setActiveModule(1)
    setShowConfig(true)
  }

  const aiGating = checkAIGating(project)
  const overallProgress = project.module_states.filter(m => m.status === 'complete').length
  const canValidate = project.grant_type !== null

  if (!started) {
    return <Hero onStart={() => setStarted(true)} />
  }

  const exportJSON = () => {
    if (!validationResult) return
    const exportData = { ...validationResult, exportedAt: new Date().toISOString() }
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `nih-validation-${project.grant_type?.replace(/\s+/g, '-').toLowerCase()}-${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      <header className="sticky top-0 z-50 bg-white border-b border-neutral-200 h-16 flex items-center px-4 md:px-6">
        <h1 className="text-lg font-semibold text-neutral-900">NIH SBIR/STTR Validator</h1>
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => setMode('modules')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${mode === 'modules' ? 'bg-primary-500 text-white' : 'text-neutral-600 hover:bg-neutral-100'}`}
          >
            <ClipboardCheck className="w-4 h-4" />
            <span className="hidden sm:inline">Modules</span>
          </button>
          <button
            onClick={() => setMode('ai-refinement')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${mode === 'ai-refinement' ? 'bg-primary-500 text-white' : 'text-neutral-600 hover:bg-neutral-100'} ${!aiGating.allowed ? 'opacity-60' : ''}`}
          >
            {!aiGating.allowed && <Lock className="w-3 h-3" />}
            <Sparkles className="w-4 h-4" />
            <span className="hidden sm:inline">AI Refinement</span>
          </button>
          <button onClick={reset} className="ml-2 text-sm text-neutral-500 hover:text-neutral-700">Reset</button>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        {mode === 'modules' && (
          <aside className="hidden lg:block w-72 border-r border-neutral-200 bg-white p-4 min-h-[calc(100vh-64px)] sticky top-16">
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-neutral-700">Overall Progress</span>
                <span className="text-sm text-neutral-500">{overallProgress}/8 modules</span>
              </div>
              <div className="h-2 bg-neutral-100 rounded-full overflow-hidden">
                <div className="h-full bg-primary-500 transition-all" style={{ width: `${(overallProgress / 8) * 100}%` }} />
              </div>
            </div>
            
            <button
              onClick={() => setShowConfig(!showConfig)}
              className={`w-full mb-4 p-3 rounded-lg border text-left flex items-center gap-3 transition-all ${showConfig ? 'border-primary-500 bg-primary-50' : 'border-neutral-200 hover:border-neutral-300'}`}
            >
              <Settings className="w-5 h-5 text-neutral-600" />
              <div className="flex-1">
                <span className="font-medium text-neutral-900 text-sm">Configuration</span>
                <p className="text-xs text-neutral-500">{project.grant_type || 'Not selected'} | {project.program_type}</p>
              </div>
            </button>

            <ModuleNav modules={project.module_states} activeModule={activeModule} onSelectModule={id => { setShowConfig(false); setActiveModule(id) }} />

            <button
              onClick={runValidation}
              disabled={!canValidate}
              className="mt-6 w-full px-4 py-3 bg-primary-500 text-white font-semibold rounded-lg hover:bg-primary-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <FileCheck className="w-5 h-5" />
              Run Validation
            </button>
          </aside>
        )}

        {/* Main Content */}
        <main className="flex-1 p-4 md:p-8 max-w-4xl mx-auto">
          {mode === 'ai-refinement' && (
            <div className="bg-white rounded-lg shadow-card p-6 md:p-10">
              <AIRefinement aiGating={aiGating} />
            </div>
          )}

          {mode === 'results' && validationResult && (
            <div className="bg-white rounded-lg shadow-card p-6 md:p-10">
              <div className={`p-6 rounded-lg mb-8 ${validationResult.status === 'structurally_ready' ? 'bg-green-50' : 'bg-red-50'}`}>
                <div className="flex items-center gap-4">
                  {validationResult.status === 'structurally_ready' ? (
                    <CheckCircle className="w-12 h-12 text-semantic-success" />
                  ) : (
                    <XCircle className="w-12 h-12 text-semantic-error" />
                  )}
                  <div>
                    <h2 className="text-2xl font-semibold text-neutral-900">
                      {validationResult.status === 'structurally_ready' ? 'Structurally Ready' : 'Not Ready for Submission'}
                    </h2>
                    <p className="text-neutral-700">{validationResult.phase} | {project.program_type}</p>
                  </div>
                </div>
              </div>

              {validationResult.errors.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-neutral-900 mb-3 flex items-center gap-2">
                    <XCircle className="w-5 h-5 text-semantic-error" /> Blocking Issues ({validationResult.errors.length})
                  </h3>
                  <div className="space-y-2">
                    {validationResult.errors.map((error, i) => (
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

              <div className="mb-6">
                <h3 className="text-lg font-semibold text-neutral-900 mb-3">Module Status</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {validationResult.module_results.map(mr => (
                    <div key={mr.module_id} className={`p-3 rounded-lg border ${mr.status === 'complete' ? 'bg-green-50 border-green-200' : mr.status === 'partial' ? 'bg-amber-50 border-amber-200' : 'bg-neutral-50 border-neutral-200'}`}>
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-sm">M{mr.module_id}</span>
                        <span className={`text-xs px-1.5 py-0.5 rounded ${mr.status === 'complete' ? 'bg-green-100 text-green-800' : mr.status === 'partial' ? 'bg-amber-100 text-amber-800' : 'bg-neutral-100 text-neutral-600'}`}>
                          {mr.status}
                        </span>
                      </div>
                      <p className="text-xs text-neutral-500 mt-1">{mr.populated_fields.length}/{mr.populated_fields.length + mr.missing_fields.length} fields</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4">
                <button onClick={exportJSON} className="flex-1 px-6 py-3 bg-primary-500 text-white font-semibold rounded-lg hover:bg-primary-600 transition-colors flex items-center justify-center gap-2">
                  <Download className="w-5 h-5" /> Export JSON
                </button>
                <button onClick={() => setMode('modules')} className="flex-1 px-6 py-3 border border-neutral-300 text-neutral-700 font-semibold rounded-lg hover:bg-neutral-100 transition-colors flex items-center justify-center gap-2">
                  <RotateCcw className="w-5 h-5" /> Edit Modules
                </button>
              </div>
            </div>
          )}

          {mode === 'modules' && (
            <>
              {/* Mobile Module Selector */}
              <div className="lg:hidden mb-6">
                <div className="flex items-center gap-2 mb-4">
                  <button
                    onClick={() => setShowConfig(true)}
                    className={`flex-1 p-3 rounded-lg border text-sm font-medium ${showConfig ? 'border-primary-500 bg-primary-50' : 'border-neutral-200'}`}
                  >
                    Config
                  </button>
                  <select
                    value={showConfig ? '' : activeModule}
                    onChange={e => { setShowConfig(false); setActiveModule(Number(e.target.value)) }}
                    className="flex-1 p-3 border border-neutral-200 rounded-lg text-sm"
                  >
                    {project.module_states.map(m => (
                      <option key={m.module_id} value={m.module_id} disabled={m.locked}>
                        M{m.module_id}: {m.name} ({m.status})
                      </option>
                    ))}
                  </select>
                </div>
                <button onClick={runValidation} disabled={!canValidate} className="w-full px-4 py-3 bg-primary-500 text-white font-semibold rounded-lg disabled:opacity-50">
                  Run Validation
                </button>
              </div>

              <div className="bg-white rounded-lg shadow-card p-6 md:p-10">
                {showConfig ? (
                  <div>
                    <div className="flex gap-2 mb-6">
                      <button
                        onClick={() => setConfigTab('grant-type')}
                        className={`px-4 py-2 rounded-lg font-medium text-sm ${configTab === 'grant-type' ? 'bg-primary-500 text-white' : 'bg-neutral-100 text-neutral-700'}`}
                      >
                        Grant Type
                      </button>
                      <button
                        onClick={() => setConfigTab('lifecycle')}
                        className={`px-4 py-2 rounded-lg font-medium text-sm ${configTab === 'lifecycle' ? 'bg-primary-500 text-white' : 'bg-neutral-100 text-neutral-700'}`}
                      >
                        Lifecycle Requirements
                      </button>
                    </div>
                    {configTab === 'grant-type' && <GrantTypeSelector project={project} onUpdate={updateProject} />}
                    {configTab === 'lifecycle' && <PriorPhaseEditor project={project} onUpdate={updateProject} />}
                  </div>
                ) : (
                  <ModuleEditor
                    project={project}
                    moduleId={activeModule}
                    moduleState={project.module_states.find(m => m.module_id === activeModule)!}
                    onUpdate={updateProject}
                  />
                )}
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  )
}
