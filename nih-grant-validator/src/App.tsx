import { useState, useCallback, useEffect } from 'react'
import { Hero } from './components/Hero'
import { ModuleNav } from './components/ModuleNav'
import { ModuleEditor } from './components/ModuleEditor'
import { ProjectCreationWizard } from './components/ProjectCreationWizard'
import { PriorPhaseEditor } from './components/PriorPhaseEditor'
import { AIRefinement } from './components/AIRefinement'
import { CommercializationDirector } from './components/CommercializationDirector'
import { AuditMode } from './components/AuditMode'
import { ComplianceAuditPanel } from './components/ComplianceAuditPanel'
import type { ProjectSchemaV2, ValidationResult } from './types'
import { getBudgetCapForPhase, getInstituteConfig } from './compliance'
import { updateModuleStates, runFullValidation, checkAIGating } from './validation'
import { ClipboardCheck, Sparkles, Settings, FileCheck, Lock, CheckCircle, XCircle, Download, RotateCcw, ArrowRight, ChevronRight, ChevronLeft, Briefcase, Upload, FileText, Home, Menu, X, BookOpen, FileOutput, ListOrdered, AlertCircle, ShieldCheck } from 'lucide-react'
import { DocumentImport } from './components/DocumentImport'
import { SpecificAimsGenerator } from './components/SpecificAimsGenerator'
import { FOAUpload } from './components/FOAUpload'

type AppMode = 'modules' | 'ai-refinement' | 'results'
type ConfigTab = 'lifecycle' | 'overview'
type MainView = 'home' | 'build' | 'audit'

export default function App() {
  const [mainView, setMainView] = useState<MainView>('home')
  const [started, setStarted] = useState(false)
  const [mode, setMode] = useState<AppMode>('modules')
  const [activeModule, setActiveModule] = useState(1)
  const [configTab, setConfigTab] = useState<ConfigTab>('overview')
  const [showConfig, setShowConfig] = useState(false) // Start with config hidden since wizard handles it
  const [project, setProject] = useState<ProjectSchemaV2 | null>(null)
  const [showWizard, setShowWizard] = useState(false)
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null)
  const [showImport, setShowImport] = useState(false)
  const [showAimsGenerator, setShowAimsGenerator] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [showDocGenerator, setShowDocGenerator] = useState<'titles' | 'research' | 'references' | 'commercialization' | null>(null)
  const [generatedContent, setGeneratedContent] = useState<{ type: string; content: string } | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [pendingNavigation, setPendingNavigation] = useState<{ target: number | 'config' | 'validate' } | null>(null)
  const [showComplianceAudit, setShowComplianceAudit] = useState(false)
  const [showFOAUpload, setShowFOAUpload] = useState(false)

  // Update module states when project changes
  useEffect(() => {
    if (!project) return
    const updatedStates = updateModuleStates(project)
    if (JSON.stringify(updatedStates) !== JSON.stringify(project.module_states)) {
      setProject(prev => prev ? { ...prev, module_states: updatedStates, updated_at: new Date().toISOString() } : null)
    }
  }, [project?.m1_title_concept, project?.m2_hypothesis, project?.m3_specific_aims, project?.m4_team_mapping, project?.m5_experimental_approach, project?.m6_budget, project?.m7_regulatory, project?.m8_compilation])

  const updateProject = useCallback((updates: Partial<ProjectSchemaV2>) => {
    setProject(prev => prev ? { ...prev, ...updates, updated_at: new Date().toISOString() } : null)
  }, [])

  const runValidation = () => {
    if (!project) return
    const result = runFullValidation(project)
    setValidationResult(result)
    setMode('results')
  }

  const reset = () => {
    setProject(null)
    setValidationResult(null)
    setMode('modules')
    setActiveModule(1)
    setShowConfig(false)
    setStarted(false)
    setMainView('home')
    setShowWizard(true) // Show wizard to create a new project
  }

  const startModules = () => {
    setShowConfig(false)
    setActiveModule(1)
  }

  // Check if current module is incomplete
  const getCurrentModuleMissingFields = () => {
    if (!project) return []
    const currentState = project.module_states.find(m => m.module_id === activeModule)
    if (!currentState) return []
    const missing = currentState.required_fields.filter(f => !currentState.completed_fields.includes(f))
    return missing
  }

  // Handle navigation with validation warning
  const handleModuleNavigation = (target: number | 'config' | 'validate') => {
    if (showConfig) {
      // No warning needed when leaving config
      if (target === 'validate') {
        runValidation()
      } else if (target === 'config') {
        setShowConfig(true)
      } else {
        setActiveModule(target)
        setShowConfig(false)
      }
      return
    }

    const missingFields = getCurrentModuleMissingFields()
    if (missingFields.length > 0) {
      setPendingNavigation({ target })
    } else {
      executeNavigation(target)
    }
  }

  const executeNavigation = (target: number | 'config' | 'validate') => {
    setPendingNavigation(null)
    if (target === 'validate') {
      runValidation()
    } else if (target === 'config') {
      setShowConfig(true)
    } else {
      setActiveModule(target)
      setShowConfig(false)
    }
  }

  const dismissWarning = () => {
    setPendingNavigation(null)
  }

  const aiGating = project ? checkAIGating(project) : { allowed: false, missing_modules: [], missing_fields: [] }
  const overallProgress = project ? project.module_states.filter(m => m.status === 'complete').length : 0
  const configComplete = project?.grant_type !== null && project?.grant_type !== undefined
  const canValidate = configComplete && project !== null

  // Get budget cap for display
  const institute = project?.institute || 'Standard NIH'
  const budgetCap = project?.grant_type ? getBudgetCapForPhase(institute, project.grant_type) : 0
  const instituteConfig = getInstituteConfig(institute)

  // Check if commercialization module should be visible
  const showCommercializationModule = project?.grant_type && ['Phase II', 'Fast Track', 'Direct to Phase II', 'Phase IIB'].includes(project.grant_type)
  const isPhaseI = project?.grant_type === 'Phase I'
  const totalModules = showCommercializationModule ? 9 : 8

  // Check if Modules 1-4 are complete (required for Specific Aims generation)
  const checkModules1to4Complete = (): boolean => {
    if (!project) return false
    const isFastTrack = project.grant_type === 'Fast Track'
    
    // Module 1: Title & Concept - must have key fields
    const m1Complete = !!(project.m1_title_concept.project_title && 
      project.m1_title_concept.problem_statement && 
      project.m1_title_concept.proposed_solution)
    
    // Module 2: Hypothesis - must have key fields
    const m2Complete = !!(project.m2_hypothesis.central_hypothesis && 
      project.m2_hypothesis.supporting_rationale)
    
    // Module 3: Specific Aims - check based on grant type
    let m3Complete = false
    if (isFastTrack) {
      // For Fast Track, check phase-specific aims
      const phase1Has = !!(project.m3_fast_track.phase1.aim1_statement || project.m3_specific_aims.aim1_statement)
      const phase2Has = !!(project.m3_fast_track.phase2.aim1_statement)
      m3Complete = phase1Has || phase2Has
    } else {
      m3Complete = !!(project.m3_specific_aims.aim1_statement)
    }
    
    // Module 4: Team - must have PI info
    const m4Complete = !!(project.m4_team_mapping.pi_name)
    
    return m1Complete && m2Complete && m3Complete && m4Complete
  }
  
  const canGenerateAims = configComplete && checkModules1to4Complete()

  // Handler for when wizard completes
  const handleWizardComplete = (newProject: ProjectSchemaV2) => {
    setProject(newProject)
    setShowWizard(false)
    setStarted(true)
    setMainView('build')
    setShowConfig(false)
    setActiveModule(1)
  }

  // Handler for when wizard is cancelled
  const handleWizardCancel = () => {
    setShowWizard(false)
  }

  // Handler for "Get Started" - show wizard
  const handleGetStarted = () => {
    setShowWizard(true)
  }

  // Show audit mode
  if (mainView === 'audit') {
    return <AuditMode onBack={() => setMainView('home')} />
  }

  // Show wizard if active
  if (showWizard) {
    return <ProjectCreationWizard onComplete={handleWizardComplete} onCancel={handleWizardCancel} />
  }

  if (!started && mainView === 'home') {
    return <Hero onStart={handleGetStarted} onAudit={() => setMainView('audit')} />
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

  // Configuration Summary Component
  const ConfigSummary = () => {
    if (!configComplete) return null
    
    return (
      <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
        <div className="flex items-center gap-2">
          <CheckCircle className="w-5 h-5 text-green-600" />
          <div className="flex-1">
            <p className="text-sm font-medium text-green-800">Configuration Complete</p>
            <p className="text-xs text-green-600">
              {project.program_type} | {project.grant_type} | {institute}
              {budgetCap > 0 && ` | $${budgetCap.toLocaleString()} cap`}
            </p>
          </div>
          {showConfig && (
            <button
              onClick={startModules}
              className="px-3 py-1.5 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors flex items-center gap-1"
            >
              Start Module 1 <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Improved Header */}
      <header className="sticky top-0 z-50 bg-white border-b border-neutral-200">
        <div className="h-16 flex items-center px-4 md:px-6">
          {/* Home Button & Logo */}
          <button
            onClick={() => { setMainView('home'); setStarted(false); }}
            className="flex items-center gap-2 text-neutral-900 hover:text-primary-600 transition-colors mr-4"
          >
            <Home className="w-5 h-5" />
            <span className="font-semibold hidden sm:inline">NIH Validator</span>
          </button>

          {/* Breadcrumbs */}
          <nav className="hidden md:flex items-center gap-2 text-sm">
            <ChevronRight className="w-4 h-4 text-neutral-400" />
            <span className="text-primary-600 font-medium">Build Mode</span>
            {!showConfig && (
              <>
                <ChevronRight className="w-4 h-4 text-neutral-400" />
                <span className="text-neutral-600">
                  {activeModule === 9 ? 'Commercialization' : `Module ${activeModule}`}
                </span>
              </>
            )}
          </nav>

          {/* Desktop Actions */}
          <div className="ml-auto hidden md:flex items-center gap-2">
            <button
              onClick={() => setShowFOAUpload(true)}
              disabled={!project}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium text-purple-600 hover:bg-purple-50 border border-purple-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FileText className="w-4 h-4" />
              Upload FOA
            </button>
            <button
              onClick={() => setShowComplianceAudit(true)}
              disabled={!project}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium text-green-600 hover:bg-green-50 border border-green-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ShieldCheck className="w-4 h-4" />
              Compliance Audit
            </button>
            <button
              onClick={() => setMainView('audit')}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium text-indigo-600 hover:bg-indigo-50 border border-indigo-200"
            >
              <Upload className="w-4 h-4" />
              Audit Mode
            </button>
            <button
              onClick={() => setShowImport(true)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium text-neutral-600 hover:bg-neutral-100 border border-neutral-200"
            >
              <Upload className="w-4 h-4" />
              Import
            </button>
            <div className="w-px h-6 bg-neutral-200 mx-2" />
            <button
              onClick={() => setMode('modules')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium ${mode === 'modules' ? 'bg-primary-500 text-white' : 'text-neutral-600 hover:bg-neutral-100'}`}
            >
              Modules
            </button>
            <button
              onClick={() => setMode('ai-refinement')}
              disabled={!aiGating.allowed}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium ${mode === 'ai-refinement' ? 'bg-primary-500 text-white' : 'text-neutral-600 hover:bg-neutral-100'} ${!aiGating.allowed ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {!aiGating.allowed && <Lock className="w-3 h-3" />}
              <Sparkles className="w-4 h-4" />
              AI
            </button>
            <button onClick={reset} className="px-3 py-1.5 text-sm text-red-500 hover:bg-red-50 rounded-lg">
              Reset
            </button>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="ml-auto md:hidden p-2 text-neutral-600 hover:bg-neutral-100 rounded-lg"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Menu Dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-neutral-200 bg-white p-4 space-y-2">
            <button
              onClick={() => { setMainView('home'); setStarted(false); setMobileMenuOpen(false); }}
              className="w-full flex items-center gap-3 px-4 py-3 text-left rounded-lg hover:bg-neutral-100"
            >
              <Home className="w-5 h-5" />
              <span>Home</span>
            </button>
            <button
                              onClick={() => { setShowFOAUpload(true); setMobileMenuOpen(false); }}
                              disabled={!project}
                              className="w-full flex items-center gap-3 px-4 py-3 text-left rounded-lg hover:bg-purple-50 text-purple-600 disabled:opacity-50"
                            >
                              <FileText className="w-5 h-5" />
                              <span>Upload FOA</span>
                            </button>
                            <button
                              onClick={() => { setShowComplianceAudit(true); setMobileMenuOpen(false); }}
                              disabled={!project}
                              className="w-full flex items-center gap-3 px-4 py-3 text-left rounded-lg hover:bg-green-50 text-green-600 disabled:opacity-50"
                            >
                              <ShieldCheck className="w-5 h-5" />
                              <span>Compliance Audit</span>
                            </button>
                            <button
                              onClick={() => { setMainView('audit'); setMobileMenuOpen(false); }}
                              className="w-full flex items-center gap-3 px-4 py-3 text-left rounded-lg hover:bg-indigo-50 text-indigo-600"
                            >
                              <Upload className="w-5 h-5" />
                              <span>Audit Mode</span>
                            </button>
            <button
              onClick={() => { setShowImport(true); setMobileMenuOpen(false); }}
              className="w-full flex items-center gap-3 px-4 py-3 text-left rounded-lg hover:bg-neutral-100"
            >
              <FileText className="w-5 h-5" />
              <span>Import Document</span>
            </button>
            <div className="border-t border-neutral-200 my-2" />
            <button
              onClick={() => { setMode('modules'); setMobileMenuOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-3 text-left rounded-lg ${mode === 'modules' ? 'bg-primary-50 text-primary-700' : 'hover:bg-neutral-100'}`}
            >
              <ClipboardCheck className="w-5 h-5" />
              <span>Modules</span>
            </button>
            <button
              onClick={() => { setMode('ai-refinement'); setMobileMenuOpen(false); }}
              disabled={!aiGating.allowed}
              className={`w-full flex items-center gap-3 px-4 py-3 text-left rounded-lg ${mode === 'ai-refinement' ? 'bg-primary-50 text-primary-700' : 'hover:bg-neutral-100'} ${!aiGating.allowed ? 'opacity-50' : ''}`}
            >
              <Sparkles className="w-5 h-5" />
              <span>AI Refinement</span>
              {!aiGating.allowed && <Lock className="w-4 h-4 ml-auto" />}
            </button>
            <div className="border-t border-neutral-200 my-2" />
            <button onClick={() => { reset(); setMobileMenuOpen(false); }} className="w-full flex items-center gap-3 px-4 py-3 text-left rounded-lg text-red-500 hover:bg-red-50">
              <RotateCcw className="w-5 h-5" />
              <span>Reset</span>
            </button>
          </div>
        )}

        {/* Module Navigation Bar (when in modules mode) */}
        {mode === 'modules' && !showConfig && configComplete && project && (
          <div className="bg-neutral-50 border-t border-neutral-100">
            {/* Current Module Title */}
            <div className="h-10 flex items-center justify-center px-4 border-b border-neutral-100">
              <span className="text-sm font-semibold text-primary-700">
                Module {activeModule}: {project?.module_states[activeModule - 1]?.name || 'Unknown'}
              </span>
            </div>
            {/* Navigation Controls */}
            <div className="h-12 flex items-center justify-between px-4 md:px-6">
              <button
                onClick={() => {
                  if (activeModule === 1) handleModuleNavigation('config');
                  else handleModuleNavigation(activeModule - 1);
                }}
                className="flex items-center gap-1 px-3 py-1.5 text-sm text-neutral-600 hover:bg-white rounded-lg border border-transparent hover:border-neutral-200"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>{activeModule === 1 ? 'Config' : `M${activeModule - 1}`}</span>
              </button>
              
              {/* Module Pills with Labels */}
              <div className="flex items-center gap-1 overflow-x-auto max-w-[60%] scrollbar-hide">
                {Array.from({ length: totalModules }, (_, i) => i + 1).map(num => {
                  const moduleName = project?.module_states[num - 1]?.name || `Module ${num}`;
                  const shortName = moduleName.split(' ').slice(0, 2).join(' ');
                  const isComplete = project?.module_states[num - 1]?.status === 'complete';
                  return (
                    <button
                      key={num}
                      onClick={() => handleModuleNavigation(num)}
                      title={moduleName}
                      className={`flex-shrink-0 px-2 py-1 rounded-lg text-xs font-medium transition-all ${
                        activeModule === num 
                          ? 'bg-primary-500 text-white shadow-sm' 
                          : isComplete
                            ? 'bg-green-100 text-green-700 hover:bg-green-200'
                            : 'bg-white text-neutral-600 hover:bg-neutral-100 border border-neutral-200'
                      }`}
                    >
                      <span className="hidden md:inline">{shortName}</span>
                      <span className="md:hidden">{num}</span>
                    </button>
                  );
                })}
              </div>
              
              <button
                onClick={() => {
                  if (activeModule === totalModules) {
                    handleModuleNavigation('validate');
                  } else {
                    handleModuleNavigation(activeModule + 1);
                  }
                }}
                className={`flex items-center gap-1 px-3 py-1.5 text-sm rounded-lg border ${
                  activeModule === totalModules 
                    ? 'bg-green-600 text-white hover:bg-green-700 border-green-600' 
                    : 'text-neutral-600 hover:bg-white border-transparent hover:border-neutral-200'
                }`}
              >
                <span>{activeModule === totalModules ? 'Validate' : `M${activeModule + 1}`}</span>
                {activeModule === totalModules ? <FileCheck className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </button>
            </div>
          </div>
        )}
      </header>

      <div className="flex">
        {/* Sidebar */}
        {mode === 'modules' && (
          <aside className="hidden lg:block w-72 border-r border-neutral-200 bg-white p-4 min-h-[calc(100vh-64px)] sticky top-16">
            {/* Step indicator */}
            <div className="mb-4">
              <div className="flex items-center gap-2 text-xs text-neutral-500 mb-3">
                <span className={`px-2 py-0.5 rounded ${showConfig ? 'bg-primary-100 text-primary-700 font-medium' : configComplete ? 'bg-green-100 text-green-700' : 'bg-neutral-100'}`}>
                  Step 0: Config
                </span>
                <ChevronRight className="w-3 h-3" />
                <span className={`px-2 py-0.5 rounded ${!showConfig ? 'bg-primary-100 text-primary-700 font-medium' : 'bg-neutral-100'}`}>
                  Steps 1-{showCommercializationModule ? '9' : '8'}: Modules
                </span>
              </div>
            </div>

            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-neutral-700">Overall Progress</span>
                <span className="text-sm text-neutral-500">{overallProgress}/{totalModules} modules</span>
              </div>
              <div className="h-2 bg-neutral-100 rounded-full overflow-hidden">
                <div className="h-full bg-primary-500 transition-all" style={{ width: `${(overallProgress / totalModules) * 100}%` }} />
              </div>
            </div>
            
            {/* Configuration Button */}
            <button
              onClick={() => setShowConfig(true)}
              className={`w-full mb-4 p-3 rounded-lg border text-left flex items-center gap-3 transition-all ${
                showConfig 
                  ? 'border-primary-500 bg-primary-50' 
                  : configComplete 
                    ? 'border-green-300 bg-green-50 hover:border-green-400' 
                    : 'border-amber-300 bg-amber-50 hover:border-amber-400'
              }`}
            >
              {configComplete ? (
                <CheckCircle className="w-5 h-5 text-green-600" />
              ) : (
                <Settings className="w-5 h-5 text-amber-600" />
              )}
              <div className="flex-1">
                <span className={`font-medium text-sm ${configComplete ? 'text-green-800' : 'text-amber-800'}`}>
                  {configComplete ? 'Configuration' : 'Configure First'}
                </span>
                <p className={`text-xs ${configComplete ? 'text-green-600' : 'text-amber-600'}`}>
                  {configComplete 
                    ? `${project?.grant_type} | ${institute}` 
                    : 'Select grant type to continue'}
                </p>
              </div>
            </button>

            {/* Modules - with disabled state when config not complete */}
            <div className={`${!configComplete ? 'opacity-50 pointer-events-none' : ''}`}>
              {!configComplete && (
                <div className="mb-3 p-2 bg-amber-50 border border-amber-200 rounded text-xs text-amber-700 text-center">
                  Complete configuration to unlock modules
                </div>
              )}
              <ModuleNav 
                modules={(project?.module_states || []).filter(m => showCommercializationModule ? true : m.module_id <= 8)} 
                activeModule={activeModule} 
                onSelectModule={id => handleModuleNavigation(id)} 
              />
              
              {/* Commercialization Module Button */}
              {showCommercializationModule && (
                <button
                  onClick={() => handleModuleNavigation(9)}
                  className={`w-full mt-2 p-3 rounded-lg border text-left flex items-center gap-3 transition-all ${
                    activeModule === 9 && !showConfig
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-purple-200 bg-purple-50 hover:border-purple-300'
                  }`}
                >
                  <Briefcase className="w-5 h-5 text-purple-600" />
                  <div className="flex-1">
                    <span className="font-medium text-sm text-purple-800">Commercialization Director</span>
                    <p className="text-xs text-purple-600">NIH 12-page plan (Required)</p>
                  </div>
                </button>
              )}
            </div>

            {/* Generate Documents Section */}
            <div className="mt-6 pt-4 border-t border-neutral-200">
              <h4 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-3">Generate Documents</h4>
              
              <button
                onClick={() => setShowDocGenerator('titles')}
                disabled={!canGenerateAims}
                className="w-full mb-2 px-3 py-2 text-left text-sm bg-amber-50 text-amber-700 border border-amber-200 rounded-lg hover:bg-amber-100 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <ListOrdered className="w-4 h-4" />
                Generate 3 Titles
              </button>

              <button
                onClick={() => setShowAimsGenerator(true)}
                disabled={!canGenerateAims}
                className="w-full mb-2 px-3 py-2 text-left text-sm bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-lg hover:bg-indigo-100 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <FileText className="w-4 h-4" />
                Generate Specific Aims
              </button>

              <button
                onClick={() => setShowDocGenerator('research')}
                disabled={overallProgress < 5}
                className="w-full mb-2 px-3 py-2 text-left text-sm bg-blue-50 text-blue-700 border border-blue-200 rounded-lg hover:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                title={overallProgress < 5 ? 'Complete at least 5 modules' : 'Generate Research Strategy'}
              >
                <BookOpen className="w-4 h-4" />
                Generate Research Strategy
              </button>

              <button
                onClick={() => setShowDocGenerator('references')}
                disabled={overallProgress < 5}
                className="w-full mb-2 px-3 py-2 text-left text-sm bg-purple-50 text-purple-700 border border-purple-200 rounded-lg hover:bg-purple-100 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                title={overallProgress < 5 ? 'Complete at least 5 modules' : 'Generate References'}
              >
                <FileOutput className="w-4 h-4" />
                Generate References
              </button>

              {showCommercializationModule && (
                <button
                  onClick={() => setShowDocGenerator('commercialization')}
                  disabled={overallProgress < 6}
                  className="w-full mb-2 px-3 py-2 text-left text-sm bg-green-50 text-green-700 border border-green-200 rounded-lg hover:bg-green-100 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  title={overallProgress < 6 ? 'Complete at least 6 modules' : 'Generate Commercialization Plan'}
                >
                  <Briefcase className="w-4 h-4" />
                  Generate Commercialization
                </button>
              )}
            </div>

            <button
              onClick={runValidation}
              disabled={!canValidate}
              className="mt-4 w-full px-4 py-3 bg-primary-500 text-white font-semibold rounded-lg hover:bg-primary-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <FileCheck className="w-5 h-5" />
              Run Validation
            </button>
            
            <button
              onClick={() => setShowComplianceAudit(true)}
              disabled={!project}
              className="mt-2 w-full px-4 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <ShieldCheck className="w-5 h-5" />
              Compliance Audit
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
                    className={`flex-1 p-3 rounded-lg border text-sm font-medium flex items-center justify-center gap-2 ${
                      showConfig 
                        ? 'border-primary-500 bg-primary-50' 
                        : configComplete 
                          ? 'border-green-300 bg-green-50' 
                          : 'border-amber-300 bg-amber-50'
                    }`}
                  >
                    {configComplete ? <CheckCircle className="w-4 h-4 text-green-600" /> : <Settings className="w-4 h-4 text-amber-600" />}
                    Config
                  </button>
                  <select
                    value={showConfig ? '' : activeModule}
                    onChange={e => { setShowConfig(false); setActiveModule(Number(e.target.value)) }}
                    disabled={!configComplete || !project}
                    className="flex-1 p-3 border border-neutral-200 rounded-lg text-sm disabled:opacity-50"
                  >
                    {project?.module_states.map(m => (
                      <option key={m.module_id} value={m.module_id} disabled={m.locked}>
                        M{m.module_id}: {m.name} ({m.status})
                      </option>
                    )) || <option value="">No project</option>}
                  </select>
                </div>
                <button onClick={runValidation} disabled={!canValidate} className="w-full px-4 py-3 bg-primary-500 text-white font-semibold rounded-lg disabled:opacity-50">
                  Run Validation
                </button>
              </div>

              {/* Config Summary Banner (when not showing config) */}
              {!showConfig && <ConfigSummary />}

              <div className="bg-white rounded-lg shadow-card p-6 md:p-10">
                {showConfig && project ? (
                  <div>
                    {/* Step indicator in main content */}
                    <div className="mb-6 pb-4 border-b border-neutral-200">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="w-6 h-6 rounded-full bg-primary-500 text-white text-xs font-bold flex items-center justify-center">0</span>
                        <h2 className="text-lg font-semibold text-neutral-900">Application Configuration</h2>
                      </div>
                      <p className="text-sm text-neutral-500 ml-8">Review your grant configuration or edit lifecycle requirements</p>
                    </div>

                    <div className="flex gap-2 mb-6">
                      <button
                        onClick={() => setConfigTab('overview')}
                        className={`px-4 py-2 rounded-lg font-medium text-sm ${configTab === 'overview' ? 'bg-primary-500 text-white' : 'bg-neutral-100 text-neutral-700'}`}
                      >
                        Configuration Overview
                      </button>
                      <button
                        onClick={() => setConfigTab('lifecycle')}
                        className={`px-4 py-2 rounded-lg font-medium text-sm ${configTab === 'lifecycle' ? 'bg-primary-500 text-white' : 'bg-neutral-100 text-neutral-700'}`}
                      >
                        Lifecycle Requirements
                      </button>
                    </div>
                    
                    {configTab === 'overview' && (
                      <div className="space-y-6">
                        {/* Configuration Overview Panel */}
                        <div className="bg-blue-50 rounded-lg p-6 border border-blue-100">
                          <h3 className="text-lg font-semibold text-blue-900 mb-4">Grant Configuration</h3>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <p className="text-sm text-blue-600">Program Type</p>
                              <p className="font-semibold text-blue-900">{project.program_type}</p>
                            </div>
                            <div>
                              <p className="text-sm text-blue-600">Grant Type</p>
                              <p className="font-semibold text-blue-900">{project.grant_type}</p>
                            </div>
                            <div>
                              <p className="text-sm text-blue-600">NIH Institute</p>
                              <p className="font-semibold text-blue-900">{institute}</p>
                            </div>
                            <div>
                              <p className="text-sm text-blue-600">Budget Cap</p>
                              <p className="font-semibold text-green-700">${budgetCap.toLocaleString()}</p>
                            </div>
                            <div>
                              <p className="text-sm text-blue-600">Clinical Trial</p>
                              <p className="font-semibold text-blue-900">{project.clinical_trial_included ? 'Yes' : 'No'}</p>
                            </div>
                            {project.foa_number && (
                              <div>
                                <p className="text-sm text-blue-600">FOA Number</p>
                                <p className="font-semibold text-blue-900">{project.foa_number}</p>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Compliance Requirements */}
                        <div className="bg-neutral-50 rounded-lg p-6 border border-neutral-200">
                          <h3 className="text-lg font-semibold text-neutral-800 mb-4">Compliance Requirements</h3>
                          <ul className="space-y-2 text-sm text-neutral-700">
                            {(project.grant_type === 'Phase I' || project.grant_type === 'Fast Track') && (
                              <li className="flex items-center gap-2">
                                <CheckCircle className="w-4 h-4 text-green-600" />
                                Go/No-Go criteria required for Phase II transition
                              </li>
                            )}
                            {project.grant_type !== 'Phase I' && (
                              <li className="flex items-center gap-2">
                                <CheckCircle className="w-4 h-4 text-green-600" />
                                12-page commercialization plan required
                              </li>
                            )}
                            <li className="flex items-center gap-2">
                              <CheckCircle className="w-4 h-4 text-green-600" />
                              {project.program_type === 'SBIR' 
                                ? `Min ${project.grant_type === 'Phase I' ? '67' : '50'}% small business effort`
                                : 'Min 40% small business, 30% research institution'
                              }
                            </li>
                            <li className="flex items-center gap-2">
                              <CheckCircle className="w-4 h-4 text-green-600" />
                              Statistical rigor required (power ≥80%, n= specified)
                            </li>
                          </ul>
                        </div>

                        <p className="text-sm text-neutral-500 italic">
                          To change grant type, institute, or clinical trial status, click Reset and create a new project.
                        </p>
                      </div>
                    )}
                    {configTab === 'lifecycle' && <PriorPhaseEditor project={project} onUpdate={updateProject} />}

                    {/* Continue Button */}
                    <div className="mt-8 pt-6 border-t border-neutral-200">
                      <div className="p-4 bg-green-50 border border-green-200 rounded-lg mb-4">
                        <div className="flex items-start gap-3">
                          <CheckCircle className="w-6 h-6 text-green-600 mt-0.5" />
                          <div>
                            <h3 className="font-semibold text-green-800">Configuration Complete</h3>
                            <p className="text-sm text-green-700 mt-1">
                              <strong>{project.program_type} {project.grant_type}</strong> application for <strong>{institute}</strong>
                              {budgetCap > 0 && <span> with a <strong>${budgetCap.toLocaleString()}</strong> budget cap</span>}
                            </p>
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={startModules}
                        className="w-full px-6 py-4 bg-primary-500 text-white font-semibold rounded-lg hover:bg-primary-600 transition-colors flex items-center justify-center gap-2 text-lg"
                      >
                        Continue to Module 1: Title & Concept <ArrowRight className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                ) : project && activeModule === 9 && showCommercializationModule ? (
                  <CommercializationDirector
                    project={project}
                    onUpdate={updateProject}
                  />
                ) : project ? (
                  <ModuleEditor
                    project={project}
                    moduleId={activeModule}
                    moduleState={project.module_states.find(m => m.module_id === activeModule)!}
                    onUpdate={updateProject}
                    onNext={() => handleModuleNavigation(Math.min(totalModules, activeModule + 1))}
                    onValidate={runValidation}
                    isLastModule={activeModule === totalModules}
                    totalModules={totalModules}
                  />
                ) : (
                  <div className="text-center py-12">
                    <p className="text-neutral-500">No project loaded. Click Get Started to create a new project.</p>
                  </div>
                )}
              </div>
            </>
          )}
        </main>
      </div>

      {showImport && (
        <DocumentImport
          onImport={updateProject}
          onClose={() => setShowImport(false)}
        />
      )}

      {showAimsGenerator && (
        <SpecificAimsGenerator
          project={project}
          onClose={() => setShowAimsGenerator(false)}
        />
      )}

      {showFOAUpload && project && (
        <FOAUpload
          project={project}
          onUpdate={updateProject}
          onClose={() => setShowFOAUpload(false)}
        />
      )}

      {/* Document Generator Modal */}
      {showDocGenerator && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-neutral-200">
              <h3 className="text-lg font-semibold text-neutral-900">
                {showDocGenerator === 'titles' && '🎯 Generate Project Titles'}
                {showDocGenerator === 'research' && '📚 Generate Research Strategy'}
                {showDocGenerator === 'references' && '📖 Generate References'}
                {showDocGenerator === 'commercialization' && '💼 Generate Commercialization Plan'}
              </h3>
              <button
                onClick={() => { setShowDocGenerator(null); setGeneratedContent(null); }}
                className="p-2 text-neutral-500 hover:bg-neutral-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="flex-1 overflow-auto p-6">
              {!generatedContent ? (
                <div className="text-center py-8">
                  <p className="text-neutral-600 mb-6">
                    {showDocGenerator === 'titles' && 'Generate 3 compelling project titles based on your module content.'}
                    {showDocGenerator === 'research' && 'Generate a complete NIH Research Strategy (Significance, Innovation, Approach) based on your modules.'}
                    {showDocGenerator === 'references' && 'Generate relevant scientific references to support your Research Strategy.'}
                    {showDocGenerator === 'commercialization' && 'Generate a 12-page NIH Commercialization Plan with all 6 required sections.'}
                  </p>
                  <button
                    onClick={async () => {
                      setIsGenerating(true)
                      try {
                        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://dvuhtfzsvcacyrlfettz.supabase.co'
                        const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR2dWh0ZnpzdmNhY3lybGZldHR6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk2NDk3OTYsImV4cCI6MjA4NTIyNTc5Nn0.vUtnPXeQrzU0kO0E7qK2qJtZ_RCqnXCEFSa60adHld0'
                        
                        const response = await fetch(`${supabaseUrl}/functions/v1/generate-document`, {
                          method: 'POST',
                          headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${supabaseAnonKey}`
                          },
                          body: JSON.stringify({
                            documentType: showDocGenerator,
                            grantType: project.grant_type,
                            modules: {
                              m1: project.m1_title_concept,
                              m2: project.m2_hypothesis,
                              m3: project.m3_specific_aims,
                              m3_fast_track: project.m3_fast_track,
                              m4: project.m4_team_mapping,
                              m5: project.m5_experimental_approach,
                              m6: project.m6_budget,
                              m7: project.m7_regulatory,
                              m9: project.m9_commercialization
                            }
                          })
                        })
                        
                        const data = await response.json()
                        if (data.content) {
                          setGeneratedContent({ type: showDocGenerator, content: data.content })
                        } else if (data.error) {
                          throw new Error(data.error.message || 'Generation failed')
                        }
                      } catch (err) {
                        console.error('Generation error:', err)
                        alert('Failed to generate content. Please try again.')
                      } finally {
                        setIsGenerating(false)
                      }
                    }}
                    disabled={isGenerating}
                    className="px-8 py-3 bg-primary-500 text-white font-semibold rounded-lg hover:bg-primary-600 disabled:opacity-50 flex items-center gap-2 mx-auto"
                  >
                    {isGenerating ? (
                      <>
                        <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Generating...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-5 h-5" />
                        Generate Now
                      </>
                    )}
                  </button>
                </div>
              ) : (
                <div className="prose prose-sm max-w-none">
                  <pre className="whitespace-pre-wrap font-sans text-sm text-neutral-700 leading-relaxed bg-neutral-50 p-4 rounded-lg">
                    {generatedContent.content}
                  </pre>
                </div>
              )}
            </div>

            {generatedContent && (
              <div className="flex items-center justify-end gap-3 p-4 border-t border-neutral-200 bg-neutral-50">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(generatedContent.content)
                    alert('Copied to clipboard!')
                  }}
                  className="px-4 py-2 bg-neutral-200 text-neutral-700 rounded-lg hover:bg-neutral-300 flex items-center gap-2"
                >
                  Copy to Clipboard
                </button>
                <button
                  onClick={() => {
                    const blob = new Blob([generatedContent.content], { type: 'text/plain' })
                    const url = URL.createObjectURL(blob)
                    const a = document.createElement('a')
                    a.href = url
                    a.download = `${generatedContent.type}_${Date.now()}.txt`
                    a.click()
                    URL.revokeObjectURL(url)
                  }}
                  className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Download
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Compliance Audit Modal */}
      {showComplianceAudit && project && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-neutral-200">
              <h3 className="text-lg font-semibold text-neutral-900">
                Pre-Export Compliance Audit
              </h3>
              <button
                onClick={() => setShowComplianceAudit(false)}
                className="p-2 text-neutral-500 hover:bg-neutral-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="flex-1 overflow-auto p-6">
              <ComplianceAuditPanel
                project={project}
                onUpdate={updateProject}
                onExport={() => {
                  setShowComplianceAudit(false)
                  exportJSON()
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Inline Validation Warning Modal */}
      {pendingNavigation && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-start gap-4 mb-4">
              <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                <AlertCircle className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-neutral-900">Incomplete Module</h3>
                <p className="text-sm text-neutral-600 mt-1">
                  Module {activeModule} has {getCurrentModuleMissingFields().length} empty required field{getCurrentModuleMissingFields().length !== 1 ? 's' : ''}.
                </p>
              </div>
            </div>
            
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-6">
              <p className="text-xs font-medium text-amber-800 mb-2">Missing fields:</p>
              <ul className="text-xs text-amber-700 space-y-1 max-h-32 overflow-y-auto">
                {getCurrentModuleMissingFields().slice(0, 5).map((field, i) => (
                  <li key={i} className="flex items-center gap-1">
                    <span className="w-1 h-1 bg-amber-500 rounded-full" />
                    {field.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </li>
                ))}
                {getCurrentModuleMissingFields().length > 5 && (
                  <li className="text-amber-600 italic">...and {getCurrentModuleMissingFields().length - 5} more</li>
                )}
              </ul>
            </div>

            <div className="flex gap-3">
              <button
                onClick={dismissWarning}
                className="flex-1 px-4 py-2.5 border border-neutral-300 text-neutral-700 font-medium rounded-lg hover:bg-neutral-50 transition-colors"
              >
                Stay & Complete
              </button>
              <button
                onClick={() => executeNavigation(pendingNavigation.target)}
                className="flex-1 px-4 py-2.5 bg-amber-500 text-white font-medium rounded-lg hover:bg-amber-600 transition-colors"
              >
                Continue Anyway
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
