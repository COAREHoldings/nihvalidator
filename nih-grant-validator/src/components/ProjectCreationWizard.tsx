// Layer 1: Mechanism Configuration - Project Creation Wizard
// Forces selection of SBIR/STTR, Phase, Institute, and Clinical Trial status at project creation
import { useState, useCallback } from 'react'
import type { GrantType, ProgramType, NIHInstitute } from '../types'
import { 
  INSTITUTE_CONFIGS, 
  getInstituteConfig, 
  getBudgetCapForPhase,
  isPolicyExpired,
  getPolicyWarning,
  PHASE_CONSTRAINTS
} from '../compliance/complianceConfig'
import { 
  createNewProjectWithConfig, 
  validateMechanismConfiguration,
  type ProjectCreationConfig 
} from '../validation'
import type { ProjectSchemaV2 } from '../types'
import { 
  ArrowRight, 
  ArrowLeft, 
  CheckCircle, 
  AlertTriangle, 
  AlertCircle,
  Building2,
  FlaskConical,
  DollarSign,
  Beaker,
  FileText
} from 'lucide-react'

interface ProjectCreationWizardProps {
  onComplete: (project: ProjectSchemaV2) => void
  onCancel: () => void
}

type WizardStep = 'program' | 'phase' | 'institute' | 'clinical' | 'review'

const NIH_INSTITUTES: { code: NIHInstitute; name: string }[] = [
  { code: 'NCI', name: 'National Cancer Institute' },
  { code: 'NHLBI', name: 'National Heart, Lung, and Blood Institute' },
  { code: 'NIAID', name: 'National Institute of Allergy and Infectious Diseases' },
  { code: 'NIMH', name: 'National Institute of Mental Health' },
  { code: 'NINDS', name: 'National Institute of Neurological Disorders and Stroke' },
  { code: 'NIDDK', name: 'National Institute of Diabetes and Digestive and Kidney Diseases' },
  { code: 'NEI', name: 'National Eye Institute' },
  { code: 'NICHD', name: 'Eunice Kennedy Shriver National Institute of Child Health and Human Development' },
  { code: 'NIA', name: 'National Institute on Aging' },
  { code: 'NIGMS', name: 'National Institute of General Medical Sciences' },
  { code: 'Standard NIH', name: 'Standard NIH (Default Caps)' }
]

const GRANT_TYPES: { type: GrantType; description: string; focus: string }[] = [
  { type: 'Phase I', description: 'Feasibility study', focus: 'Proof of concept, Go/No-Go required' },
  { type: 'Phase II', description: 'Full R&D', focus: '12-page commercialization plan required' },
  { type: 'Fast Track', description: 'Combined Phase I & II', focus: 'Single application with transition milestones' },
  { type: 'Direct to Phase II', description: 'Skip Phase I', focus: 'Requires demonstrated feasibility' },
  { type: 'Phase IIB', description: 'Phase II continuation', focus: 'Advanced development, limited institutes' }
]

export function ProjectCreationWizard({ onComplete, onCancel }: ProjectCreationWizardProps) {
  const [step, setStep] = useState<WizardStep>('program')
  const [programType, setProgramType] = useState<ProgramType>('SBIR')
  const [grantType, setGrantType] = useState<GrantType | null>(null)
  const [institute, setInstitute] = useState<NIHInstitute>('Standard NIH')
  const [clinicalTrial, setClinicalTrial] = useState<boolean>(false)
  const [foaNumber, setFoaNumber] = useState<string>('')

  const policyWarning = getPolicyWarning()
  const instituteConfig = getInstituteConfig(institute)
  
  // Validation
  const validationErrors = grantType ? validateMechanismConfiguration({
    programType,
    grantType,
    institute,
    clinicalTrialIncluded: clinicalTrial,
    foaNumber: foaNumber || undefined
  }) : []

  const criticalErrors = validationErrors.filter(e => e.severity === 'critical')
  const warnings = validationErrors.filter(e => e.severity === 'warning')

  const handleNext = () => {
    switch (step) {
      case 'program':
        setStep('phase')
        break
      case 'phase':
        if (grantType) setStep('institute')
        break
      case 'institute':
        setStep('clinical')
        break
      case 'clinical':
        setStep('review')
        break
      case 'review':
        if (grantType && criticalErrors.length === 0) {
          const config: ProjectCreationConfig = {
            programType,
            grantType,
            institute,
            clinicalTrialIncluded: clinicalTrial,
            foaNumber: foaNumber || undefined
          }
          const project = createNewProjectWithConfig(config)
          onComplete(project)
        }
        break
    }
  }

  const handleBack = () => {
    switch (step) {
      case 'phase':
        setStep('program')
        break
      case 'institute':
        setStep('phase')
        break
      case 'clinical':
        setStep('institute')
        break
      case 'review':
        setStep('clinical')
        break
    }
  }

  const canProceed = () => {
    switch (step) {
      case 'program':
        return true
      case 'phase':
        return grantType !== null
      case 'institute':
        return true
      case 'clinical':
        return true
      case 'review':
        return criticalErrors.length === 0
    }
  }

  const budgetCap = grantType ? getBudgetCapForPhase(institute, grantType) : 0

  const StepIndicator = () => (
    <div className="flex items-center justify-center gap-2 mb-8">
      {(['program', 'phase', 'institute', 'clinical', 'review'] as WizardStep[]).map((s, i) => (
        <div key={s} className="flex items-center">
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
              step === s
                ? 'bg-blue-600 text-white'
                : i < ['program', 'phase', 'institute', 'clinical', 'review'].indexOf(step)
                ? 'bg-green-500 text-white'
                : 'bg-neutral-200 text-neutral-500'
            }`}
          >
            {i < ['program', 'phase', 'institute', 'clinical', 'review'].indexOf(step) ? (
              <CheckCircle className="w-4 h-4" />
            ) : (
              i + 1
            )}
          </div>
          {i < 4 && <div className={`w-8 h-0.5 ${i < ['program', 'phase', 'institute', 'clinical', 'review'].indexOf(step) ? 'bg-green-500' : 'bg-neutral-200'}`} />}
        </div>
      ))}
    </div>
  )

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-auto">
        <div className="p-6 border-b border-neutral-200">
          <h2 className="text-xl font-bold text-neutral-900">Create New Grant Application</h2>
          <p className="text-sm text-neutral-600 mt-1">Configure your SBIR/STTR application settings</p>
        </div>

        <div className="p-6">
          <StepIndicator />

          {policyWarning && (
            <div className="mb-6 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-amber-700">{policyWarning}</p>
            </div>
          )}

          {/* Step 1: Program Type */}
          {step === 'program' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-neutral-900 mb-4">Select Program Type</h3>
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => setProgramType('SBIR')}
                  className={`p-6 rounded-xl border-2 text-left transition-all ${
                    programType === 'SBIR'
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-neutral-200 hover:border-neutral-300'
                  }`}
                >
                  <Building2 className={`w-8 h-8 mb-3 ${programType === 'SBIR' ? 'text-blue-600' : 'text-neutral-400'}`} />
                  <h4 className="font-bold text-lg text-neutral-900">SBIR</h4>
                  <p className="text-sm text-neutral-600 mt-1">Small Business Innovation Research</p>
                  <div className="mt-3 text-xs text-neutral-500">
                    <p>Phase I: min 67% small business</p>
                    <p>Phase II: min 50% small business</p>
                  </div>
                </button>

                <button
                  onClick={() => setProgramType('STTR')}
                  className={`p-6 rounded-xl border-2 text-left transition-all ${
                    programType === 'STTR'
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-neutral-200 hover:border-neutral-300'
                  }`}
                >
                  <FlaskConical className={`w-8 h-8 mb-3 ${programType === 'STTR' ? 'text-blue-600' : 'text-neutral-400'}`} />
                  <h4 className="font-bold text-lg text-neutral-900">STTR</h4>
                  <p className="text-sm text-neutral-600 mt-1">Small Business Technology Transfer</p>
                  <div className="mt-3 text-xs text-neutral-500">
                    <p>Min 40% small business</p>
                    <p>Min 30% research institution</p>
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Grant Type/Phase */}
          {step === 'phase' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-neutral-900 mb-4">Select Grant Type</h3>
              <div className="space-y-3">
                {GRANT_TYPES.map(gt => {
                  const constraints = PHASE_CONSTRAINTS[gt.type]
                  const isPhase2B = gt.type === 'Phase IIB'
                  const phase2BUnavailable = isPhase2B && instituteConfig.phase2bCap === null

                  return (
                    <button
                      key={gt.type}
                      onClick={() => !phase2BUnavailable && setGrantType(gt.type)}
                      disabled={phase2BUnavailable}
                      className={`w-full p-4 rounded-lg border-2 text-left transition-all ${
                        grantType === gt.type
                          ? 'border-blue-500 bg-blue-50'
                          : phase2BUnavailable
                          ? 'border-neutral-100 bg-neutral-50 opacity-50 cursor-not-allowed'
                          : 'border-neutral-200 hover:border-neutral-300'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-semibold text-neutral-900">{gt.type}</h4>
                          <p className="text-sm text-neutral-600">{gt.description}</p>
                          <p className="text-xs text-neutral-500 mt-1">{gt.focus}</p>
                        </div>
                        {constraints?.goNoGoRequired && (
                          <span className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded">
                            Go/No-Go Required
                          </span>
                        )}
                        {constraints?.commercializationPlanRequired && (
                          <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded">
                            12-page Plan Required
                          </span>
                        )}
                      </div>
                      {phase2BUnavailable && (
                        <p className="text-xs text-red-500 mt-2">Not available for selected institute</p>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Step 3: Institute Selection */}
          {step === 'institute' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-neutral-900 mb-4">Select Funding Institute</h3>
              <div className="grid grid-cols-1 gap-2 max-h-[400px] overflow-y-auto pr-2">
                {NIH_INSTITUTES.map(inst => {
                  const config = getInstituteConfig(inst.code)
                  const budgetCapForPhase = grantType ? getBudgetCapForPhase(inst.code, grantType) : config.phase1Cap

                  return (
                    <button
                      key={inst.code}
                      onClick={() => setInstitute(inst.code)}
                      className={`p-4 rounded-lg border-2 text-left transition-all ${
                        institute === inst.code
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-neutral-200 hover:border-neutral-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-semibold text-neutral-900">{inst.code}</h4>
                          <p className="text-xs text-neutral-500">{inst.name}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium text-green-700">
                            ${budgetCapForPhase.toLocaleString()}
                          </p>
                          <p className="text-xs text-neutral-500">budget cap</p>
                        </div>
                      </div>
                      {config.specialNotes && (
                        <p className="text-xs text-blue-600 mt-2">{config.specialNotes}</p>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Step 4: Clinical Trial */}
          {step === 'clinical' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-neutral-900 mb-4">Clinical Trial Involvement</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => setClinicalTrial(false)}
                  className={`p-6 rounded-xl border-2 text-left transition-all ${
                    !clinicalTrial
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-neutral-200 hover:border-neutral-300'
                  }`}
                >
                  <Beaker className={`w-8 h-8 mb-3 ${!clinicalTrial ? 'text-blue-600' : 'text-neutral-400'}`} />
                  <h4 className="font-bold text-lg text-neutral-900">No Clinical Trial</h4>
                  <p className="text-sm text-neutral-600 mt-1">Preclinical research, basic research, or device development</p>
                </button>

                <button
                  onClick={() => setClinicalTrial(true)}
                  disabled={!instituteConfig.clinicalTrialAllowed}
                  className={`p-6 rounded-xl border-2 text-left transition-all ${
                    clinicalTrial
                      ? 'border-blue-500 bg-blue-50'
                      : !instituteConfig.clinicalTrialAllowed
                      ? 'border-neutral-100 bg-neutral-50 opacity-50 cursor-not-allowed'
                      : 'border-neutral-200 hover:border-neutral-300'
                  }`}
                >
                  <FileText className={`w-8 h-8 mb-3 ${clinicalTrial ? 'text-blue-600' : 'text-neutral-400'}`} />
                  <h4 className="font-bold text-lg text-neutral-900">Includes Clinical Trial</h4>
                  <p className="text-sm text-neutral-600 mt-1">Human subjects research with interventions</p>
                  {!instituteConfig.clinicalTrialAllowed && (
                    <p className="text-xs text-red-500 mt-2">Not typically supported by {institute}</p>
                  )}
                </button>
              </div>

              <div className="mt-6">
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  FOA Number (Optional)
                </label>
                <input
                  type="text"
                  value={foaNumber}
                  onChange={e => setFoaNumber(e.target.value)}
                  placeholder="e.g., PA-24-123 or RFA-CA-24-001"
                  className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <p className="text-xs text-neutral-500 mt-1">
                  Enter the Funding Opportunity Announcement number if known
                </p>
              </div>
            </div>
          )}

          {/* Step 5: Review */}
          {step === 'review' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-neutral-900 mb-4">Review Configuration</h3>
              
              <div className="bg-neutral-50 rounded-lg p-6 space-y-4">
                <div className="flex justify-between items-center pb-3 border-b border-neutral-200">
                  <span className="text-neutral-600">Program</span>
                  <span className="font-semibold text-neutral-900">{programType}</span>
                </div>
                <div className="flex justify-between items-center pb-3 border-b border-neutral-200">
                  <span className="text-neutral-600">Grant Type</span>
                  <span className="font-semibold text-neutral-900">{grantType}</span>
                </div>
                <div className="flex justify-between items-center pb-3 border-b border-neutral-200">
                  <span className="text-neutral-600">Institute</span>
                  <span className="font-semibold text-neutral-900">{institute}</span>
                </div>
                <div className="flex justify-between items-center pb-3 border-b border-neutral-200">
                  <span className="text-neutral-600">Budget Cap</span>
                  <span className="font-semibold text-green-700">${budgetCap.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center pb-3 border-b border-neutral-200">
                  <span className="text-neutral-600">Clinical Trial</span>
                  <span className={`font-semibold ${clinicalTrial ? 'text-blue-600' : 'text-neutral-900'}`}>
                    {clinicalTrial ? 'Yes' : 'No'}
                  </span>
                </div>
                {foaNumber && (
                  <div className="flex justify-between items-center">
                    <span className="text-neutral-600">FOA Number</span>
                    <span className="font-semibold text-neutral-900">{foaNumber}</span>
                  </div>
                )}
              </div>

              {/* Compliance Requirements Summary */}
              <div className="bg-blue-50 rounded-lg p-4">
                <h4 className="font-semibold text-blue-900 mb-2">Compliance Requirements</h4>
                <ul className="text-sm text-blue-700 space-y-1">
                  {grantType === 'Phase I' || grantType === 'Fast Track' ? (
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4" />
                      Go/No-Go criteria required for Phase II transition
                    </li>
                  ) : null}
                  {grantType !== 'Phase I' ? (
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4" />
                      12-page commercialization plan required
                    </li>
                  ) : null}
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4" />
                    {programType === 'SBIR' 
                      ? `Min ${grantType === 'Phase I' ? '67' : '50'}% small business effort`
                      : 'Min 40% small business, 30% research institution'
                    }
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4" />
                    Statistical rigor required (power ≥80%, n= specified)
                  </li>
                </ul>
              </div>

              {/* Errors and Warnings */}
              {criticalErrors.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <h4 className="font-semibold text-red-900 mb-2 flex items-center gap-2">
                    <AlertCircle className="w-5 h-5" />
                    Configuration Errors
                  </h4>
                  <ul className="text-sm text-red-700 space-y-1">
                    {criticalErrors.map((err, i) => (
                      <li key={i}>{err.message}</li>
                    ))}
                  </ul>
                </div>
              )}

              {warnings.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <h4 className="font-semibold text-amber-900 mb-2 flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5" />
                    Warnings
                  </h4>
                  <ul className="text-sm text-amber-700 space-y-1">
                    {warnings.map((warn, i) => (
                      <li key={i}>{warn.message}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="p-6 border-t border-neutral-200 flex justify-between">
          <button
            onClick={step === 'program' ? onCancel : handleBack}
            className="px-4 py-2 text-neutral-600 hover:bg-neutral-100 rounded-lg flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            {step === 'program' ? 'Cancel' : 'Back'}
          </button>
          <button
            onClick={handleNext}
            disabled={!canProceed()}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {step === 'review' ? 'Create Project' : 'Next'}
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
