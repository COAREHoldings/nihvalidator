import { useState, useEffect, useMemo, useCallback } from 'react'
import type { ProjectSchemaV2, NIHInstitute, GrantType } from '../types'
import { getBudgetCap } from '../validation'
import { AlertTriangle, DollarSign, Calculator, TrendingUp, Info, Check, X, Briefcase } from 'lucide-react'

interface BudgetLineItems {
  personnel: number
  equipment: number
  supplies: number
  travel: number
  consultants: number
  subawards: number
  patientCare: number
  tuition: number
  otherDirect: number
}

interface BudgetCalculations {
  totalDirectCosts: number
  mtdc: number
  indirectCosts: number
  subtotal: number
  feeProfit: number
  totalProjectCosts: number
  remainingBudget: number
  budgetUtilization: number
}

interface STTRAllocation {
  smallBusinessPercent: number
  researchInstitutionPercent: number
  isValid: boolean
  errors: string[]
}

interface Props {
  project: ProjectSchemaV2
  onUpdate: (updates: Partial<ProjectSchemaV2>) => void
  isFastTrack?: boolean
  currentPhase?: 'phase1' | 'phase2'
}

// Threshold for subaward exclusion from MTDC
const SUBAWARD_MTDC_THRESHOLD = 25000

export function BudgetCalculator({ project, onUpdate, isFastTrack = false, currentPhase = 'phase1' }: Props) {
  const institute = project.institute || 'Standard NIH'
  const grantType = project.grant_type
  const programType = project.program_type

  // Get the appropriate budget cap
  const budgetCap = useMemo(() => {
    // Check for FOA override first
    if (project.foa_config.parsed_foa?.budgetCapOverride) {
      return project.foa_config.parsed_foa.budgetCapOverride
    }
    return getBudgetCap(institute, grantType, isFastTrack ? currentPhase : undefined)
  }, [institute, grantType, isFastTrack, currentPhase, project.foa_config.parsed_foa?.budgetCapOverride])

  // Get current budget data based on Fast Track status
  const getCurrentBudgetData = useCallback(() => {
    if (isFastTrack) {
      const ftData = currentPhase === 'phase1' 
        ? project.m6_fast_track.phase1 
        : project.m6_fast_track.phase2
      return ftData || {}
    }
    return project.m6_budget || {}
  }, [isFastTrack, currentPhase, project.m6_fast_track, project.m6_budget])

  const budgetData = getCurrentBudgetData()

  // Line items state
  const [lineItems, setLineItems] = useState<BudgetLineItems>({
    personnel: budgetData.personnel_costs || 0,
    equipment: budgetData.equipment_costs || 0,
    supplies: budgetData.supplies_costs || 0,
    travel: budgetData.travel_costs || 0,
    consultants: (budgetData as any).consultant_costs || 0,
    subawards: budgetData.subaward_costs || 0,
    patientCare: (budgetData as any).patient_care_costs || 0,
    tuition: (budgetData as any).tuition_costs || 0,
    otherDirect: budgetData.other_costs || 0
  })

  // F&A Rate state
  const [faRate, setFaRate] = useState<number>((budgetData as any).f_and_a_rate || 0)

  // STTR allocation state
  const [sttrAllocation, setSttrAllocation] = useState<{ smallBusiness: number; researchInstitution: number }>({
    smallBusiness: budgetData.small_business_percent || (programType === 'SBIR' ? 67 : 40),
    researchInstitution: budgetData.research_institution_percent || (programType === 'STTR' ? 30 : 0)
  })

  // Budget justification
  const [justification, setJustification] = useState<string>(budgetData.budget_justification || '')

  // Calculate all budget values
  const calculations = useMemo<BudgetCalculations>(() => {
    // Total Direct Costs = Sum of all line items
    const totalDirectCosts = 
      lineItems.personnel +
      lineItems.equipment +
      lineItems.supplies +
      lineItems.travel +
      lineItems.consultants +
      lineItems.subawards +
      lineItems.patientCare +
      lineItems.tuition +
      lineItems.otherDirect

    // MTDC = Total Direct - Equipment - (Subawards > $25K) - Patient Care - Tuition
    // For subawards, only the amount over $25K per subaward is excluded
    // Simplified: if total subawards > $25K, exclude the excess
    const subawardExclusion = Math.max(0, lineItems.subawards - SUBAWARD_MTDC_THRESHOLD)
    const mtdc = totalDirectCosts - lineItems.equipment - subawardExclusion - lineItems.patientCare - lineItems.tuition

    // Indirect Costs = MTDC x F&A Rate
    const indirectCosts = Math.round(mtdc * (faRate / 100))

    // Subtotal = Total Direct + Indirect
    const subtotal = totalDirectCosts + indirectCosts

    // Fee/Profit (7%) = Subtotal * 0.07
    const feeProfit = Math.round(subtotal * 0.07)

    // Total Project Costs = Subtotal + Fee
    const totalProjectCosts = subtotal + feeProfit

    // Remaining budget (based on direct costs cap)
    const remainingBudget = budgetCap - totalDirectCosts

    // Budget utilization percentage
    const budgetUtilization = budgetCap > 0 ? (totalDirectCosts / budgetCap) * 100 : 0

    return {
      totalDirectCosts,
      mtdc,
      indirectCosts,
      subtotal,
      feeProfit,
      totalProjectCosts,
      remainingBudget,
      budgetUtilization
    }
  }, [lineItems, faRate, budgetCap])

  // Validate STTR allocation
  const sttrValidation = useMemo<STTRAllocation>(() => {
    const errors: string[] = []
    let isValid = true

    if (programType === 'STTR') {
      // STTR requires: Small Business >= 40%, Research Institution >= 30%
      const sbMin = project.foa_config.parsed_foa?.smallBusinessMinOverride || 40
      const riMin = project.foa_config.parsed_foa?.researchInstitutionMinOverride || 30

      if (sttrAllocation.smallBusiness < sbMin) {
        errors.push(`Small Business must be at least ${sbMin}% (currently ${sttrAllocation.smallBusiness}%)`)
        isValid = false
      }
      if (sttrAllocation.researchInstitution < riMin) {
        errors.push(`Research Institution must be at least ${riMin}% (currently ${sttrAllocation.researchInstitution}%)`)
        isValid = false
      }
      if (sttrAllocation.smallBusiness + sttrAllocation.researchInstitution > 100) {
        errors.push('Total allocation cannot exceed 100%')
        isValid = false
      }
    } else {
      // SBIR requires: Small Business >= 67% for Phase I, >= 50% for Phase II
      const sbMin = grantType === 'Phase I' || (isFastTrack && currentPhase === 'phase1') ? 67 : 50
      if (sttrAllocation.smallBusiness < sbMin) {
        errors.push(`SBIR ${grantType || 'Phase I'} requires minimum ${sbMin}% small business effort (currently ${sttrAllocation.smallBusiness}%)`)
        isValid = false
      }
    }

    return {
      smallBusinessPercent: sttrAllocation.smallBusiness,
      researchInstitutionPercent: sttrAllocation.researchInstitution,
      isValid,
      errors
    }
  }, [programType, grantType, sttrAllocation, project.foa_config.parsed_foa, isFastTrack, currentPhase])

  // Get budget status color
  const getBudgetStatusColor = useCallback((utilization: number) => {
    if (utilization > 100) return 'red'
    if (utilization > 90) return 'yellow'
    return 'green'
  }, [])

  const budgetStatus = getBudgetStatusColor(calculations.budgetUtilization)

  // Update line item
  const updateLineItem = useCallback((field: keyof BudgetLineItems, value: number) => {
    setLineItems(prev => ({ ...prev, [field]: value }))
  }, [])

  // Sync to project state
  useEffect(() => {
    const budgetUpdate = {
      direct_costs_total: calculations.totalDirectCosts,
      personnel_costs: lineItems.personnel,
      equipment_costs: lineItems.equipment,
      supplies_costs: lineItems.supplies,
      travel_costs: lineItems.travel,
      consultant_costs: lineItems.consultants,
      subaward_costs: lineItems.subawards,
      patient_care_costs: lineItems.patientCare,
      tuition_costs: lineItems.tuition,
      other_costs: lineItems.otherDirect,
      f_and_a_rate: faRate,
      indirect_costs: calculations.indirectCosts,
      total_project_costs: calculations.totalProjectCosts,
      mtdc: calculations.mtdc,
      small_business_percent: sttrAllocation.smallBusiness,
      research_institution_percent: sttrAllocation.researchInstitution,
      budget_justification: justification
    }

    if (isFastTrack) {
      const ftData = project.m6_fast_track
      const phase = currentPhase
      const updatedPhase = { ...ftData[phase], ...budgetUpdate }
      const isComplete = calculations.totalDirectCosts > 0 && justification.trim().length > 0

      onUpdate({
        m6_fast_track: {
          ...ftData,
          [phase]: updatedPhase,
          [`${phase}_complete`]: isComplete
        },
        legacy_budget: {
          ...project.legacy_budget,
          directCosts: calculations.totalDirectCosts,
          personnelCosts: lineItems.personnel,
          subawardCosts: lineItems.subawards,
          smallBusinessPercent: sttrAllocation.smallBusiness,
          researchInstitutionPercent: sttrAllocation.researchInstitution
        }
      })
    } else {
      onUpdate({
        m6_budget: { ...project.m6_budget, ...budgetUpdate },
        legacy_budget: {
          ...project.legacy_budget,
          directCosts: calculations.totalDirectCosts,
          personnelCosts: lineItems.personnel,
          subawardCosts: lineItems.subawards,
          smallBusinessPercent: sttrAllocation.smallBusiness,
          researchInstitutionPercent: sttrAllocation.researchInstitution
        }
      })
    }
  }, [lineItems, faRate, sttrAllocation, justification, calculations])

  // Number input component
  const CurrencyInput = ({ label, value, onChange, hint }: { label: string; value: number; onChange: (v: number) => void; hint?: string }) => (
    <div className="mb-3">
      <label className="block text-sm font-medium text-neutral-700 mb-1">
        {label}
        {hint && <span className="text-xs text-neutral-500 ml-2">({hint})</span>}
      </label>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500">$</span>
        <input
          type="number"
          value={value || ''}
          onChange={e => onChange(parseFloat(e.target.value) || 0)}
          className="w-full pl-8 pr-3 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          placeholder="0"
        />
      </div>
    </div>
  )

  // Percentage input component
  const PercentInput = ({ label, value, onChange, hint }: { label: string; value: number; onChange: (v: number) => void; hint?: string }) => (
    <div className="mb-3">
      <label className="block text-sm font-medium text-neutral-700 mb-1">
        {label}
        {hint && <span className="text-xs text-neutral-500 ml-2">({hint})</span>}
      </label>
      <div className="relative">
        <input
          type="number"
          value={value || ''}
          onChange={e => onChange(parseFloat(e.target.value) || 0)}
          min={0}
          max={100}
          step={0.1}
          className="w-full pr-8 pl-3 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          placeholder="0"
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500">%</span>
      </div>
    </div>
  )

  // Status color classes
  const statusColors = {
    green: {
      bg: 'bg-green-50',
      border: 'border-green-200',
      text: 'text-green-800',
      bar: 'bg-green-500'
    },
    yellow: {
      bg: 'bg-amber-50',
      border: 'border-amber-200',
      text: 'text-amber-800',
      bar: 'bg-amber-500'
    },
    red: {
      bg: 'bg-red-50',
      border: 'border-red-200',
      text: 'text-red-800',
      bar: 'bg-red-500'
    }
  }

  const colors = statusColors[budgetStatus]

  return (
    <div className="space-y-6">
      {/* Budget Cap Info */}
      <div className={`p-4 rounded-lg ${colors.bg} ${colors.border} border`}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <DollarSign className={`w-5 h-5 ${colors.text}`} />
            <span className={`font-semibold ${colors.text}`}>
              {institute} {isFastTrack ? `Fast Track ${currentPhase === 'phase1' ? 'Phase I' : 'Phase II'}` : grantType} Budget Cap
            </span>
          </div>
          <span className={`text-lg font-bold ${colors.text}`}>
            ${budgetCap.toLocaleString()}
          </span>
        </div>

        {/* Budget Utilization Bar */}
        <div className="mb-2">
          <div className="flex justify-between text-sm mb-1">
            <span className={colors.text}>Direct Costs: ${calculations.totalDirectCosts.toLocaleString()}</span>
            <span className={colors.text}>{calculations.budgetUtilization.toFixed(1)}% utilized</span>
          </div>
          <div className="h-3 bg-white rounded-full overflow-hidden border border-neutral-200">
            <div
              className={`h-full ${colors.bar} transition-all duration-300`}
              style={{ width: `${Math.min(calculations.budgetUtilization, 100)}%` }}
            />
          </div>
        </div>

        {/* Remaining Budget */}
        <div className="flex items-center justify-between text-sm">
          <span className={colors.text}>
            {calculations.remainingBudget >= 0 ? 'Remaining:' : 'Over cap by:'}
          </span>
          <span className={`font-semibold ${calculations.remainingBudget < 0 ? 'text-red-700' : colors.text}`}>
            ${Math.abs(calculations.remainingBudget).toLocaleString()}
          </span>
        </div>

        {calculations.budgetUtilization > 100 && (
          <div className="mt-3 p-2 bg-red-100 rounded flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-700" />
            <span className="text-sm text-red-700 font-medium">
              Budget exceeds {institute} {grantType} cap of ${budgetCap.toLocaleString()}
            </span>
          </div>
        )}
      </div>

      {/* Direct Cost Line Items */}
      <div className="bg-white border border-neutral-200 rounded-lg p-4">
        <h3 className="font-semibold text-neutral-900 mb-4 flex items-center gap-2">
          <Calculator className="w-5 h-5 text-primary-500" />
          Direct Cost Line Items
        </h3>

        <div className="grid md:grid-cols-2 gap-4">
          <CurrencyInput
            label="Personnel (Salaries + Fringe)"
            value={lineItems.personnel}
            onChange={v => updateLineItem('personnel', v)}
            hint="Required"
          />
          <CurrencyInput
            label="Equipment"
            value={lineItems.equipment}
            onChange={v => updateLineItem('equipment', v)}
            hint="Items >$5,000"
          />
          <CurrencyInput
            label="Supplies"
            value={lineItems.supplies}
            onChange={v => updateLineItem('supplies', v)}
          />
          <CurrencyInput
            label="Travel"
            value={lineItems.travel}
            onChange={v => updateLineItem('travel', v)}
          />
          <CurrencyInput
            label="Consultant Costs"
            value={lineItems.consultants}
            onChange={v => updateLineItem('consultants', v)}
          />
          <CurrencyInput
            label="Subawards/Consortium"
            value={lineItems.subawards}
            onChange={v => updateLineItem('subawards', v)}
            hint="Partner institutions"
          />
          <CurrencyInput
            label="Patient Care Costs"
            value={lineItems.patientCare}
            onChange={v => updateLineItem('patientCare', v)}
            hint="Clinical trials only"
          />
          <CurrencyInput
            label="Tuition Remission"
            value={lineItems.tuition}
            onChange={v => updateLineItem('tuition', v)}
          />
          <CurrencyInput
            label="Other Direct Costs"
            value={lineItems.otherDirect}
            onChange={v => updateLineItem('otherDirect', v)}
          />
        </div>
      </div>

      {/* Calculations Summary */}
      <div className="bg-neutral-50 border border-neutral-200 rounded-lg p-4">
        <h3 className="font-semibold text-neutral-900 mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-primary-500" />
          Budget Calculations
        </h3>

        <div className="space-y-3">
          {/* Total Direct Costs */}
          <div className="flex justify-between items-center p-3 bg-white rounded-lg border border-neutral-200">
            <div>
              <span className="font-medium text-neutral-900">Total Direct Costs</span>
              <p className="text-xs text-neutral-500">Sum of all line items above</p>
            </div>
            <span className={`text-lg font-bold ${calculations.totalDirectCosts > budgetCap ? 'text-red-600' : 'text-neutral-900'}`}>
              ${calculations.totalDirectCosts.toLocaleString()}
            </span>
          </div>

          {/* MTDC */}
          <div className="flex justify-between items-center p-3 bg-white rounded-lg border border-neutral-200">
            <div>
              <span className="font-medium text-neutral-900">Modified Total Direct Costs (MTDC)</span>
              <p className="text-xs text-neutral-500">Excludes equipment, subawards over $25K, patient care, tuition</p>
            </div>
            <span className="text-lg font-bold text-neutral-900">
              ${calculations.mtdc.toLocaleString()}
            </span>
          </div>

          {/* F&A Rate Input */}
          <div className="p-3 bg-white rounded-lg border border-neutral-200">
            <div className="flex justify-between items-start mb-2">
              <div>
                <span className="font-medium text-neutral-900">F&A (Indirect Cost) Rate</span>
                <p className="text-xs text-neutral-500">Typically 40-50% for SBIR/STTR</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-32">
                <PercentInput
                  label=""
                  value={faRate}
                  onChange={setFaRate}
                />
              </div>
              <div className="flex-1 text-right">
                <span className="text-sm text-neutral-600">Indirect Costs: </span>
                <span className="font-bold text-neutral-900">${calculations.indirectCosts.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Subtotal */}
          <div className="flex justify-between items-center p-3 bg-white rounded-lg border border-neutral-200">
            <div>
              <span className="font-medium text-neutral-900">Subtotal</span>
              <p className="text-xs text-neutral-500">Direct Costs + Indirect Costs</p>
            </div>
            <span className="text-lg font-bold text-neutral-900">
              ${calculations.subtotal.toLocaleString()}
            </span>
          </div>

          {/* Fee/Profit (7%) */}
          <div className="flex justify-between items-center p-3 bg-amber-50 rounded-lg border border-amber-200">
            <div>
              <span className="font-medium text-amber-900">Fee/Profit (7%)</span>
              <p className="text-xs text-amber-700">Calculated on Subtotal (Direct + Indirect)</p>
            </div>
            <span className="text-lg font-bold text-amber-900">
              ${calculations.feeProfit.toLocaleString()}
            </span>
          </div>

          {/* Total Project Costs */}
          <div className="flex justify-between items-center p-3 bg-primary-50 rounded-lg border border-primary-200">
            <div>
              <span className="font-semibold text-primary-900">Total Project Costs</span>
              <p className="text-xs text-primary-700">Subtotal + Fee/Profit</p>
            </div>
            <span className="text-xl font-bold text-primary-900">
              ${calculations.totalProjectCosts.toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {/* STTR Allocation (or SBIR Small Business %) */}
      <div className="bg-white border border-neutral-200 rounded-lg p-4">
        <h3 className="font-semibold text-neutral-900 mb-4 flex items-center gap-2">
          <Briefcase className="w-5 h-5 text-primary-500" />
          {programType === 'STTR' ? 'STTR Allocation Requirements' : 'SBIR Small Business Allocation'}
        </h3>

        {programType === 'STTR' && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start gap-2">
              <Info className="w-4 h-4 text-blue-600 mt-0.5" />
              <div className="text-sm text-blue-800">
                <p className="font-medium">STTR Allocation Rules:</p>
                <ul className="mt-1 space-y-1">
                  <li>Small Business: minimum 40% of total effort</li>
                  <li>Research Institution: minimum 30% of total effort</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-4">
          <PercentInput
            label="Small Business Allocation"
            value={sttrAllocation.smallBusiness}
            onChange={v => setSttrAllocation(prev => ({ ...prev, smallBusiness: v }))}
            hint={programType === 'SBIR' ? (grantType === 'Phase I' ? 'Min 67%' : 'Min 50%') : 'Min 40%'}
          />
          {programType === 'STTR' && (
            <PercentInput
              label="Research Institution Allocation"
              value={sttrAllocation.researchInstitution}
              onChange={v => setSttrAllocation(prev => ({ ...prev, researchInstitution: v }))}
              hint="Min 30%"
            />
          )}
        </div>

        {/* Allocation Validation */}
        <div className={`mt-4 p-3 rounded-lg flex items-start gap-2 ${sttrValidation.isValid ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
          {sttrValidation.isValid ? (
            <>
              <Check className="w-5 h-5 text-green-600 mt-0.5" />
              <div className="text-sm text-green-800">
                <p className="font-medium">Allocation requirements met</p>
                {programType === 'STTR' && (
                  <p className="mt-1">
                    Small Business: {sttrAllocation.smallBusiness}% | Research Institution: {sttrAllocation.researchInstitution}%
                  </p>
                )}
              </div>
            </>
          ) : (
            <>
              <X className="w-5 h-5 text-red-600 mt-0.5" />
              <div className="text-sm text-red-800">
                <p className="font-medium">Allocation requirements not met</p>
                <ul className="mt-1 space-y-1">
                  {sttrValidation.errors.map((err, idx) => (
                    <li key={idx}>{err}</li>
                  ))}
                </ul>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Budget Justification */}
      <div className="bg-white border border-neutral-200 rounded-lg p-4">
        <h3 className="font-semibold text-neutral-900 mb-4">
          Budget Justification <span className="text-red-500">*</span>
        </h3>
        <textarea
          value={justification}
          onChange={e => setJustification(e.target.value)}
          rows={6}
          placeholder="Provide detailed justification for each budget category. Explain why each cost is necessary for the successful completion of the project..."
          className="w-full px-3 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 resize-y"
        />
        <p className="mt-2 text-xs text-neutral-500">
          {justification.length > 0 ? `${justification.length} characters` : 'Required - justify your budget allocations'}
        </p>
      </div>

      {/* Summary Card */}
      <div className={`p-4 rounded-lg border-2 ${colors.border} ${colors.bg}`}>
        <h4 className={`font-semibold ${colors.text} mb-3`}>Budget Summary</h4>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="text-center">
            <p className={`text-xs ${colors.text} opacity-75`}>Direct Costs</p>
            <p className={`text-lg font-bold ${colors.text}`}>${calculations.totalDirectCosts.toLocaleString()}</p>
          </div>
          <div className="text-center">
            <p className={`text-xs ${colors.text} opacity-75`}>Indirect ({faRate}%)</p>
            <p className={`text-lg font-bold ${colors.text}`}>${calculations.indirectCosts.toLocaleString()}</p>
          </div>
          <div className="text-center">
            <p className={`text-xs ${colors.text} opacity-75`}>Subtotal</p>
            <p className={`text-lg font-bold ${colors.text}`}>${calculations.subtotal.toLocaleString()}</p>
          </div>
          <div className="text-center">
            <p className={`text-xs ${colors.text} opacity-75`}>Fee (7%)</p>
            <p className={`text-lg font-bold ${colors.text}`}>${calculations.feeProfit.toLocaleString()}</p>
          </div>
          <div className="text-center">
            <p className={`text-xs ${colors.text} opacity-75`}>Total Project</p>
            <p className={`text-lg font-bold ${colors.text}`}>${calculations.totalProjectCosts.toLocaleString()}</p>
          </div>
        </div>

        {budgetStatus === 'yellow' && (
          <div className="mt-3 text-sm text-amber-700 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            Budget is within 10% of cap. Consider reviewing expenses.
          </div>
        )}
      </div>
    </div>
  )
}

export default BudgetCalculator
