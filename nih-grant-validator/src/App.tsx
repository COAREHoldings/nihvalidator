import { useState, useCallback } from 'react'
import { Hero } from './components/Hero'
import { Stepper } from './components/Stepper'
import { GrantTypeStep } from './components/GrantTypeStep'
import { PriorPhaseStep } from './components/PriorPhaseStep'
import { ChecklistStep } from './components/ChecklistStep'
import { BudgetStep } from './components/BudgetStep'
import { ResultsPanel } from './components/ResultsPanel'
import { AIRefinement } from './components/AIRefinement'
import type { GrantData, ValidationResult } from './types'
import { ClipboardCheck, Sparkles } from 'lucide-react'

const STEPS = ['Grant Type', 'Prior Phase', 'Checklist', 'Budget', 'Results']

type AppMode = 'validator' | 'ai-refinement'

export default function App() {
  const [started, setStarted] = useState(false)
  const [mode, setMode] = useState<AppMode>('validator')
  const [step, setStep] = useState(0)
  const [data, setData] = useState<GrantData>({
    grantType: null,
    programType: 'SBIR',
    priorPhase: { awardNumber: '', completionDate: '', fundingSource: '', findings: '' },
    checklist: {},
    budget: {
      directCosts: 0,
      personnelCosts: 0,
      subawardCosts: 0,
      smallBusinessPercent: 67,
      researchInstitutionPercent: 0,
    },
  })
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null)

  const updateData = useCallback((updates: Partial<GrantData>) => {
    setData(prev => ({ ...prev, ...updates }))
  }, [])

  const needsPriorPhase = data.grantType === 'Phase II' || data.grantType === 'Phase IIB' || data.grantType === 'Direct to Phase II'

  const goNext = () => {
    if (step === 0 && !needsPriorPhase) {
      setStep(2)
    } else if (step === 3) {
      runValidation()
      setStep(4)
    } else {
      setStep(s => s + 1)
    }
  }

  const goBack = () => {
    if (step === 2 && !needsPriorPhase) {
      setStep(0)
    } else {
      setStep(s => s - 1)
    }
  }

  const runValidation = () => {
    const errors: ValidationResult['errors'] = []
    const warnings: ValidationResult['warnings'] = []

    if (data.grantType === 'Phase II' && !data.priorPhase.awardNumber) {
      errors.push({ code: 'LIFECYCLE_002', message: 'Missing Phase I award documentation', field: 'priorPhase.awardNumber' })
    }
    if (data.grantType === 'Phase IIB' && !data.priorPhase.awardNumber) {
      errors.push({ code: 'LIFECYCLE_002', message: 'Missing Phase II award documentation', field: 'priorPhase.awardNumber' })
    }
    if (data.grantType === 'Direct to Phase II' && !data.priorPhase.fundingSource) {
      errors.push({ code: 'LIFECYCLE_002', message: 'Missing non-SBIR/STTR feasibility funding documentation', field: 'priorPhase.fundingSource' })
    }

    const budgetCap = data.grantType === 'Phase I' ? 275000 : data.grantType === 'Phase II' || data.grantType === 'Direct to Phase II' || data.grantType === 'Phase IIB' ? 1750000 : 275000
    if (data.budget.directCosts > budgetCap) {
      errors.push({ code: 'BUDGET_001', message: `Direct costs exceed ${data.grantType} cap of $${budgetCap.toLocaleString()}`, field: 'budget.directCosts' })
    }

    if (data.grantType === 'Fast Track' && data.budget.directCosts > 2025000) {
      errors.push({ code: 'BUDGET_001', message: 'Fast Track combined budget exceeds $2,025,000 limit', field: 'budget.directCosts' })
    }

    if (data.programType === 'SBIR') {
      const minPercent = data.grantType === 'Phase I' || data.grantType === 'Fast Track' ? 67 : 50
      if (data.budget.smallBusinessPercent < minPercent) {
        errors.push({ code: 'BUDGET_002', message: `SBIR ${data.grantType} requires minimum ${minPercent}% small business effort`, field: 'budget.smallBusinessPercent' })
      }
    }

    if (data.programType === 'STTR') {
      if (data.budget.smallBusinessPercent < 40) {
        errors.push({ code: 'BUDGET_002', message: 'STTR requires minimum 40% small business effort', field: 'budget.smallBusinessPercent' })
      }
      if (data.budget.researchInstitutionPercent < 30) {
        errors.push({ code: 'BUDGET_002', message: 'STTR requires minimum 30% research institution effort', field: 'budget.researchInstitutionPercent' })
      }
    }

    const calculatedTotal = data.budget.personnelCosts + data.budget.subawardCosts
    if (calculatedTotal > data.budget.directCosts) {
      errors.push({ code: 'BUDGET_003', message: 'Personnel + Subaward costs exceed total direct costs', field: 'budget' })
    }

    const requiredComponents = ['specificAims', 'researchStrategy', 'budget', 'biosketches', 'facilities']
    const phase2Components = ['progressReport', 'commercializationPlan', 'marketAnalysis']
    
    requiredComponents.forEach(comp => {
      if (!data.checklist[comp]) {
        errors.push({ code: 'INPUT_002', message: `Missing required component: ${comp.replace(/([A-Z])/g, ' $1').trim()}`, field: `checklist.${comp}` })
      }
    })

    if (data.grantType === 'Phase II' || data.grantType === 'Phase IIB' || data.grantType === 'Direct to Phase II') {
      phase2Components.forEach(comp => {
        if (!data.checklist[comp]) {
          errors.push({ code: 'INPUT_002', message: `Missing Phase II component: ${comp.replace(/([A-Z])/g, ' $1').trim()}`, field: `checklist.${comp}` })
        }
      })
    }

    if (data.grantType === 'Fast Track') {
      phase2Components.forEach(comp => {
        if (!data.checklist[comp]) {
          errors.push({ code: 'INPUT_002', message: `Fast Track requires Phase II component: ${comp.replace(/([A-Z])/g, ' $1').trim()}`, field: `checklist.${comp}` })
        }
      })
    }

    if (data.budget.directCosts > budgetCap * 0.95 && data.budget.directCosts <= budgetCap) {
      warnings.push({ code: 'BUDGET_WARN', message: 'Budget is within 5% of NIH cap', field: 'budget.directCosts' })
    }

    const status = errors.length === 0 ? 'structurally_ready' : 'not_ready'
    setValidationResult({ status, phase: data.grantType || 'Unknown', errors, warnings, data })
  }

  const reset = () => {
    setStep(0)
    setData({
      grantType: null,
      programType: 'SBIR',
      priorPhase: { awardNumber: '', completionDate: '', fundingSource: '', findings: '' },
      checklist: {},
      budget: { directCosts: 0, personnelCosts: 0, subawardCosts: 0, smallBusinessPercent: 67, researchInstitutionPercent: 0 },
    })
    setValidationResult(null)
  }

  if (!started) {
    return <Hero onStart={() => setStarted(true)} />
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      <header className="sticky top-0 z-50 bg-white border-b border-neutral-200 h-20 flex items-center px-6">
        <h1 className="text-xl font-semibold text-neutral-900">NIH SBIR/STTR Validator</h1>
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => { setMode('validator'); reset() }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${mode === 'validator' ? 'bg-primary-500 text-white' : 'text-neutral-600 hover:bg-neutral-100'}`}
          >
            <ClipboardCheck className="w-4 h-4" />
            <span className="hidden sm:inline">Validator</span>
          </button>
          <button
            onClick={() => setMode('ai-refinement')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${mode === 'ai-refinement' ? 'bg-primary-500 text-white' : 'text-neutral-600 hover:bg-neutral-100'}`}
          >
            <Sparkles className="w-4 h-4" />
            <span className="hidden sm:inline">AI Refinement</span>
          </button>
        </div>
      </header>

      <main className="container max-w-4xl mx-auto py-12 px-6">
        {mode === 'ai-refinement' ? (
          <div className="bg-white rounded-lg shadow-card p-8 md:p-16">
            <AIRefinement />
          </div>
        ) : (
          <>
            <Stepper steps={STEPS} current={step} skipStep={!needsPriorPhase ? 1 : undefined} />
            <div className="mt-12 bg-white rounded-lg shadow-card p-8 md:p-16">
              {step === 0 && <GrantTypeStep data={data} updateData={updateData} onNext={goNext} />}
              {step === 1 && <PriorPhaseStep data={data} updateData={updateData} onNext={goNext} onBack={goBack} />}
              {step === 2 && <ChecklistStep data={data} updateData={updateData} onNext={goNext} onBack={goBack} />}
              {step === 3 && <BudgetStep data={data} updateData={updateData} onNext={goNext} onBack={goBack} />}
              {step === 4 && validationResult && <ResultsPanel result={validationResult} onReset={reset} />}
            </div>
          </>
        )}
      </main>
    </div>
  )
}
