import { useState, useEffect, useMemo, useCallback } from 'react'
import type { ProjectSchemaV2, NIHInstitute, GrantType, SubAward, Vendor } from '../types'
import { getBudgetCap } from '../validation'
import { AlertTriangle, DollarSign, Calculator, TrendingUp, Info, Check, X, Briefcase, Plus, Trash2, Building2, Users } from 'lucide-react'

interface BudgetLineItems {
  personnel: number
  equipment: number
  supplies: number
  travel: number
  consultants: number
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
  totalSubAwards: number
  totalVendors: number
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

// Threshold for subaward exclusion from MTDC (per sub-award)
const SUBAWARD_MTDC_THRESHOLD = 25000

// Generate unique ID
const generateId = () => crypto.randomUUID()

export function BudgetCalculator({ project, onUpdate, isFastTrack = false, currentPhase = 'phase1' }: Props) {
  const institute = project.institute || 'Standard NIH'
  const grantType = project.grant_type
  const programType = project.program_type

  // Get the appropriate budget cap
  const budgetCap = useMemo(() => {
    if (project.foa_config?.parsed_foa?.budgetCapOverride) {
      return project.foa_config.parsed_foa.budgetCapOverride
    }
    return getBudgetCap(institute, grantType, isFastTrack ? currentPhase : undefined)
  }, [institute, grantType, isFastTrack, currentPhase, project.foa_config?.parsed_foa?.budgetCapOverride])

  // Get current budget data based on Fast Track status
  const getCurrentBudgetData = useCallback(() => {
    if (isFastTrack) {
      const ftData = currentPhase === 'phase1' 
        ? project.m6_fast_track?.phase1 
        : project.m6_fast_track?.phase2
      return ftData || {}
    }
    return project.m6_budget || {}
  }, [isFastTrack, currentPhase, project.m6_fast_track, project.m6_budget])

  const budgetData = getCurrentBudgetData()

  // Line items state (excluding subawards - now managed separately)
  const [lineItems, setLineItems] = useState<BudgetLineItems>({
    personnel: budgetData.personnel_costs || 0,
    equipment: budgetData.equipment_costs || 0,
    supplies: budgetData.supplies_costs || 0,
    travel: budgetData.travel_costs || 0,
    consultants: (budgetData as any).consultant_costs || 0,
    patientCare: (budgetData as any).patient_care_costs || 0,
    tuition: (budgetData as any).tuition_costs || 0,
    otherDirect: budgetData.other_costs || 0
  })

  // Sub Awards state (multiple academic institutions/partners)
  const [subAwards, setSubAwards] = useState<SubAward[]>(() => {
    const saved = (budgetData as any).sub_awards
    return Array.isArray(saved) && saved.length > 0 ? saved : []
  })

  // Vendors state (multiple vendors/contractors)
  const [vendors, setVendors] = useState<Vendor[]>(() => {
    const saved = (budgetData as any).vendors
    return Array.isArray(saved) && saved.length > 0 ? saved : []
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

  // Fee/Profit percentage state (1-7%, default 7%)
  const [feePercent, setFeePercent] = useState<number>((budgetData as any).fee_percent || 7)

  // Add new sub-award
  const addSubAward = useCallback(() => {
    const newSubAward: SubAward = {
      id: generateId(),
      institutionName: '',
      contactPI: '',
      directCosts: 0,
      faRate: 0,
      indirectCosts: 0,
      total: 0
    }
    setSubAwards(prev => [...prev, newSubAward])
  }, [])

  // Update sub-award
  const updateSubAward = useCallback((id: string, field: keyof SubAward, value: string | number) => {
    setSubAwards(prev => prev.map(sa => {
      if (sa.id !== id) return sa
      
      const updated = { ...sa, [field]: value }
      
      // Recalculate indirect and total when direct costs or FA rate changes
      if (field === 'directCosts' || field === 'faRate') {
        updated.indirectCosts = Math.round(updated.directCosts * (updated.faRate / 100))
        updated.total = updated.directCosts + updated.indirectCosts
      }
      
      return updated
    }))
  }, [])

  // Remove sub-award
  const removeSubAward = useCallback((id: string) => {
    setSubAwards(prev => prev.filter(sa => sa.id !== id))
  }, [])

  // Add new vendor
  const addVendor = useCallback(() => {
    const newVendor: Vendor = {
      id: generateId(),
      vendorName: '',
      description: '',
      amount: 0
    }
    setVendors(prev => [...prev, newVendor])
  }, [])

  // Update vendor
  const updateVendor = useCallback((id: string, field: keyof Vendor, value: string | number) => {
    setVendors(prev => prev.map(v => 
      v.id === id ? { ...v, [field]: value } : v
    ))
  }, [])

  // Remove vendor
  const removeVendor = useCallback((id: string) => {
    setVendors(prev => prev.filter(v => v.id !== id))
  }, [])

  // Calculate all budget values
  const calculations = useMemo<BudgetCalculations>(() => {
    // Sum all sub-award direct costs
    const totalSubAwardDirect = subAwards.reduce((sum, sa) => sum + (sa.directCosts || 0), 0)
    const totalSubAwardIndirect = subAwards.reduce((sum, sa) => sum + (sa.indirectCosts || 0), 0)
    const totalSubAwards = totalSubAwardDirect + totalSubAwardIndirect

    // Sum all vendor costs
    const totalVendors = vendors.reduce((sum, v) => sum + (v.amount || 0), 0)

    // Total Direct Costs = Line items + Sub Award Direct Costs + Vendors
    const totalDirectCosts = 
      lineItems.personnel +
      lineItems.equipment +
      lineItems.supplies +
      lineItems.travel +
      lineItems.consultants +
      totalSubAwardDirect +
      totalVendors +
      lineItems.patientCare +
      lineItems.tuition +
      lineItems.otherDirect

    // MTDC Calculation with per-subaward $25K threshold
    // For each sub-award, only the first $25K of direct costs counts toward MTDC
    const subAwardMTDCInclusion = subAwards.reduce((sum, sa) => {
      return sum + Math.min(sa.directCosts || 0, SUBAWARD_MTDC_THRESHOLD)
    }, 0)
    const subAwardMTDCExclusion = totalSubAwardDirect - subAwardMTDCInclusion

    // MTDC = Total Direct - Equipment - (Subaward amounts over $25K each) - Patient Care - Tuition
    // Note: Vendors are typically included in MTDC unless specifically excluded
    const mtdc = totalDirectCosts - lineItems.equipment - subAwardMTDCExclusion - lineItems.patientCare - lineItems.tuition

    // Indirect Costs = MTDC x F&A Rate
    const indirectCosts = Math.round(mtdc * (faRate / 100))

    // Subtotal = Total Direct + Indirect (not including sub-award indirect which is already in sub-awards)
    const subtotal = totalDirectCosts + indirectCosts + totalSubAwardIndirect

    // Fee/Profit = Subtotal * feePercent%
    const feeProfit = Math.round(subtotal * (feePercent / 100))

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
      budgetUtilization,
      totalSubAwards,
      totalVendors
    }
  }, [lineItems, subAwards, vendors, faRate, budgetCap, feePercent])

  // Validate STTR allocation
  const sttrValidation = useMemo<STTRAllocation>(() => {
    const errors: string[] = []
    let isValid = true

    if (programType === 'STTR') {
      const sbMin = project.foa_config?.parsed_foa?.smallBusinessMinOverride || 40
      const riMin = project.foa_config?.parsed_foa?.researchInstitutionMinOverride || 30

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
  }, [programType, grantType, sttrAllocation, project.foa_config?.parsed_foa, isFastTrack, currentPhase])

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
    const totalSubAwardDirect = subAwards.reduce((sum, sa) => sum + (sa.directCosts || 0), 0)
    
    const budgetUpdate = {
      direct_costs_total: calculations.totalDirectCosts,
      personnel_costs: lineItems.personnel,
      equipment_costs: lineItems.equipment,
      supplies_costs: lineItems.supplies,
      travel_costs: lineItems.travel,
      consultant_costs: lineItems.consultants,
      subaward_costs: totalSubAwardDirect,
      patient_care_costs: lineItems.patientCare,
      tuition_costs: lineItems.tuition,
      other_costs: lineItems.otherDirect,
      f_and_a_rate: faRate,
      indirect_costs: calculations.indirectCosts,
      total_project_costs: calculations.totalProjectCosts,
      mtdc: calculations.mtdc,
      small_business_percent: sttrAllocation.smallBusiness,
      research_institution_percent: sttrAllocation.researchInstitution,
      budget_justification: justification,
      fee_percent: feePercent,
      fee_amount: calculations.feeProfit,
      sub_awards: subAwards,
      vendors: vendors
    }

    if (isFastTrack) {
      const ftData = project.m6_fast_track
      const phase = currentPhase
      const updatedPhase = { ...ftData?.[phase], ...budgetUpdate }
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
          subawardCosts: totalSubAwardDirect,
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
          subawardCosts: totalSubAwardDirect,
          smallBusinessPercent: sttrAllocation.smallBusiness,
          researchInstitutionPercent: sttrAllocation.researchInstitution
        }
      })
    }
  }, [lineItems, faRate, sttrAllocation, justification, calculations, feePercent, subAwards, vendors])

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

      {/* Sub Awards Section (Multiple Academic Institutions/Partners) */}
      <div className="bg-white border border-neutral-200 rounded-lg p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-neutral-900 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-blue-500" />
            Sub Awards (Academic Institutions/Partners)
          </h3>
          <button
            onClick={addSubAward}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Sub Award
          </button>
        </div>

        {subAwards.length === 0 ? (
          <div className="text-center py-8 text-neutral-500">
            <Building2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No sub awards added yet</p>
            <p className="text-xs mt-1">Click "Add Sub Award" to include academic partners or consortia</p>
          </div>
        ) : (
          <div className="space-y-4">
            {subAwards.map((sa, index) => (
              <div key={sa.id} className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <span className="font-medium text-blue-900">Sub Award #{index + 1}</span>
                  <button
                    onClick={() => removeSubAward(sa.id)}
                    className="p-1.5 text-red-600 hover:bg-red-100 rounded transition-colors"
                    title="Remove sub award"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <div className="grid md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1">Institution Name</label>
                    <input
                      type="text"
                      value={sa.institutionName}
                      onChange={e => updateSubAward(sa.id, 'institutionName', e.target.value)}
                      className="w-full px-3 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g., Harvard University"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1">Contact PI</label>
                    <input
                      type="text"
                      value={sa.contactPI}
                      onChange={e => updateSubAward(sa.id, 'contactPI', e.target.value)}
                      className="w-full px-3 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g., Dr. Jane Smith"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1">Direct Costs</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500">$</span>
                      <input
                        type="number"
                        value={sa.directCosts || ''}
                        onChange={e => updateSubAward(sa.id, 'directCosts', parseFloat(e.target.value) || 0)}
                        className="w-full pl-8 pr-3 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="0"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1">F&A Rate (%)</label>
                    <div className="relative">
                      <input
                        type="number"
                        value={sa.faRate || ''}
                        onChange={e => updateSubAward(sa.id, 'faRate', parseFloat(e.target.value) || 0)}
                        className="w-full pr-8 pl-3 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="0"
                        min={0}
                        max={100}
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500">%</span>
                    </div>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-blue-200 flex justify-between text-sm">
                  <span className="text-blue-800">
                    Indirect Costs: <strong>${sa.indirectCosts.toLocaleString()}</strong>
                  </span>
                  <span className="text-blue-900 font-semibold">
                    Total: ${sa.total.toLocaleString()}
                  </span>
                </div>
              </div>
            ))}

            {/* Sub Awards Summary */}
            <div className="p-3 bg-blue-100 border border-blue-300 rounded-lg">
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-blue-700">Total Direct:</span>
                  <p className="font-semibold text-blue-900">
                    ${subAwards.reduce((sum, sa) => sum + (sa.directCosts || 0), 0).toLocaleString()}
                  </p>
                </div>
                <div>
                  <span className="text-blue-700">Total Indirect:</span>
                  <p className="font-semibold text-blue-900">
                    ${subAwards.reduce((sum, sa) => sum + (sa.indirectCosts || 0), 0).toLocaleString()}
                  </p>
                </div>
                <div>
                  <span className="text-blue-700">Grand Total:</span>
                  <p className="font-semibold text-blue-900">${calculations.totalSubAwards.toLocaleString()}</p>
                </div>
              </div>
              <p className="text-xs text-blue-600 mt-2">
                Note: Only the first $25,000 of each sub award's direct costs is included in MTDC calculation.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Vendors/Contractors Section */}
      <div className="bg-white border border-neutral-200 rounded-lg p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-neutral-900 flex items-center gap-2">
            <Users className="w-5 h-5 text-purple-500" />
            Vendors/Contractors
          </h3>
          <button
            onClick={addVendor}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-purple-600 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Vendor
          </button>
        </div>

        {vendors.length === 0 ? (
          <div className="text-center py-8 text-neutral-500">
            <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No vendors added yet</p>
            <p className="text-xs mt-1">Click "Add Vendor" to include external contractors or service providers</p>
          </div>
        ) : (
          <div className="space-y-4">
            {vendors.map((v, index) => (
              <div key={v.id} className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <span className="font-medium text-purple-900">Vendor #{index + 1}</span>
                  <button
                    onClick={() => removeVendor(v.id)}
                    className="p-1.5 text-red-600 hover:bg-red-100 rounded transition-colors"
                    title="Remove vendor"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <div className="grid md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1">Vendor Name</label>
                    <input
                      type="text"
                      value={v.vendorName}
                      onChange={e => updateVendor(v.id, 'vendorName', e.target.value)}
                      className="w-full px-3 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                      placeholder="e.g., Lab Services Inc."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1">Description</label>
                    <input
                      type="text"
                      value={v.description}
                      onChange={e => updateVendor(v.id, 'description', e.target.value)}
                      className="w-full px-3 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                      placeholder="e.g., Bioanalytical services"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1">Amount</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500">$</span>
                      <input
                        type="number"
                        value={v.amount || ''}
                        onChange={e => updateVendor(v.id, 'amount', parseFloat(e.target.value) || 0)}
                        className="w-full pl-8 pr-3 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                        placeholder="0"
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {/* Vendors Summary */}
            <div className="p-3 bg-purple-100 border border-purple-300 rounded-lg">
              <div className="flex justify-between items-center">
                <span className="text-purple-700 text-sm">Total Vendor Costs:</span>
                <span className="font-semibold text-purple-900 text-lg">${calculations.totalVendors.toLocaleString()}</span>
              </div>
            </div>
          </div>
        )}
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
              <p className="text-xs text-neutral-500">Line items + Sub Awards (direct) + Vendors</p>
            </div>
            <span className={`text-lg font-bold ${calculations.totalDirectCosts > budgetCap ? 'text-red-600' : 'text-neutral-900'}`}>
              ${calculations.totalDirectCosts.toLocaleString()}
            </span>
          </div>

          {/* MTDC */}
          <div className="flex justify-between items-center p-3 bg-white rounded-lg border border-neutral-200">
            <div>
              <span className="font-medium text-neutral-900">Modified Total Direct Costs (MTDC)</span>
              <p className="text-xs text-neutral-500">Excludes equipment, sub award amounts over $25K each, patient care, tuition</p>
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
              <p className="text-xs text-neutral-500">Direct Costs + Indirect Costs + Sub Award Indirect</p>
            </div>
            <span className="text-lg font-bold text-neutral-900">
              ${calculations.subtotal.toLocaleString()}
            </span>
          </div>

          {/* Fee/Profit (Configurable) */}
          <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
            <div className="flex justify-between items-start mb-3">
              <div>
                <span className="font-medium text-amber-900">Fee/Profit Rate</span>
                <p className="text-xs text-amber-700">Configurable 1-7% (calculated on Subtotal)</p>
              </div>
              <span className="text-lg font-bold text-amber-900">
                ${calculations.feeProfit.toLocaleString()}
              </span>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <input
                  type="range"
                  min={1}
                  max={7}
                  step={0.5}
                  value={feePercent}
                  onChange={e => setFeePercent(parseFloat(e.target.value))}
                  className="w-full h-2 bg-amber-200 rounded-lg appearance-none cursor-pointer accent-amber-600"
                />
                <div className="flex justify-between text-xs text-amber-700 mt-1">
                  <span>1%</span>
                  <span>4%</span>
                  <span>7%</span>
                </div>
              </div>
              <div className="w-20">
                <div className="relative">
                  <input
                    type="number"
                    min={1}
                    max={7}
                    step={0.5}
                    value={feePercent}
                    onChange={e => {
                      const val = parseFloat(e.target.value)
                      if (val >= 1 && val <= 7) setFeePercent(val)
                    }}
                    className="w-full pr-6 pl-2 py-1 text-sm border border-amber-300 rounded focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white"
                  />
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-amber-700 text-sm">%</span>
                </div>
              </div>
            </div>
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
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          <div className="text-center">
            <p className={`text-xs ${colors.text} opacity-75`}>Direct Costs</p>
            <p className={`text-lg font-bold ${colors.text}`}>${calculations.totalDirectCosts.toLocaleString()}</p>
          </div>
          <div className="text-center">
            <p className={`text-xs ${colors.text} opacity-75`}>Indirect ({faRate}%)</p>
            <p className={`text-lg font-bold ${colors.text}`}>${calculations.indirectCosts.toLocaleString()}</p>
          </div>
          <div className="text-center">
            <p className={`text-xs ${colors.text} opacity-75`}>Sub Awards</p>
            <p className={`text-lg font-bold ${colors.text}`}>${calculations.totalSubAwards.toLocaleString()}</p>
          </div>
          <div className="text-center">
            <p className={`text-xs ${colors.text} opacity-75`}>Vendors</p>
            <p className={`text-lg font-bold ${colors.text}`}>${calculations.totalVendors.toLocaleString()}</p>
          </div>
          <div className="text-center">
            <p className={`text-xs ${colors.text} opacity-75`}>Fee ({feePercent}%)</p>
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
