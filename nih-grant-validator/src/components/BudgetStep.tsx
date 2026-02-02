import { AlertCircle } from 'lucide-react'
import type { GrantData } from '../types'

interface Props {
  data: GrantData
  updateData: (updates: Partial<GrantData>) => void
  onNext: () => void
  onBack: () => void
}

export function BudgetStep({ data, updateData, onNext, onBack }: Props) {
  const budgetCap = data.grantType === 'Phase I' ? 275000 
    : data.grantType === 'Fast Track' ? 2025000 
    : 1750000

  const minSBPercent = data.programType === 'SBIR' 
    ? (data.grantType === 'Phase I' || data.grantType === 'Fast Track' ? 67 : 50)
    : 40

  const updateBudget = (field: string, value: number) => {
    updateData({ budget: { ...data.budget, [field]: value } })
  }

  const overBudget = data.budget.directCosts > budgetCap
  const percentError = data.budget.smallBusinessPercent < minSBPercent

  return (
    <div>
      <h2 className="text-2xl font-semibold text-neutral-900 mb-2">Budget Information</h2>
      <p className="text-neutral-700 mb-8">Enter your budget details for validation against NIH caps</p>

      <div className="bg-neutral-50 rounded-lg p-4 mb-8">
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium text-neutral-700">Budget Cap for {data.grantType}</span>
          <span className="text-lg font-semibold text-neutral-900">${budgetCap.toLocaleString()}</span>
        </div>
      </div>

      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-2">Total Direct Costs ($)</label>
          <input
            type="number"
            value={data.budget.directCosts || ''}
            onChange={e => updateBudget('directCosts', Number(e.target.value))}
            placeholder="0"
            className={`w-full px-4 py-3 border rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
              overBudget ? 'border-semantic-error bg-red-50' : 'border-neutral-200'
            }`}
          />
          {overBudget && (
            <p className="mt-2 text-sm text-semantic-error flex items-center gap-1">
              <AlertCircle className="w-4 h-4" /> Exceeds NIH cap by ${(data.budget.directCosts - budgetCap).toLocaleString()}
            </p>
          )}
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">Personnel Costs ($)</label>
            <input
              type="number"
              value={data.budget.personnelCosts || ''}
              onChange={e => updateBudget('personnelCosts', Number(e.target.value))}
              placeholder="0"
              className="w-full px-4 py-3 border border-neutral-200 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">Subaward Costs ($)</label>
            <input
              type="number"
              value={data.budget.subawardCosts || ''}
              onChange={e => updateBudget('subawardCosts', Number(e.target.value))}
              placeholder="0"
              className="w-full px-4 py-3 border border-neutral-200 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
        </div>

        <div className="border-t border-neutral-200 pt-6">
          <h3 className="text-lg font-semibold text-neutral-900 mb-4">
            {data.programType} Effort Allocation
          </h3>
          <p className="text-sm text-neutral-500 mb-4">
            {data.programType === 'SBIR' 
              ? `Minimum ${minSBPercent}% small business effort required for ${data.grantType}`
              : 'STTR requires minimum 40% small business and 30% research institution effort'}
          </p>

          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">Small Business Effort (%)</label>
              <input
                type="number"
                min="0"
                max="100"
                value={data.budget.smallBusinessPercent}
                onChange={e => updateBudget('smallBusinessPercent', Number(e.target.value))}
                className={`w-full px-4 py-3 border rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
                  percentError ? 'border-semantic-error bg-red-50' : 'border-neutral-200'
                }`}
              />
              {percentError && (
                <p className="mt-2 text-sm text-semantic-error flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" /> Below minimum {minSBPercent}%
                </p>
              )}
            </div>

            {data.programType === 'STTR' && (
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">Research Institution Effort (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={data.budget.researchInstitutionPercent}
                  onChange={e => updateBudget('researchInstitutionPercent', Number(e.target.value))}
                  className={`w-full px-4 py-3 border rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
                    data.budget.researchInstitutionPercent < 30 ? 'border-semantic-error bg-red-50' : 'border-neutral-200'
                  }`}
                />
                {data.budget.researchInstitutionPercent < 30 && (
                  <p className="mt-2 text-sm text-semantic-error flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" /> Below minimum 30%
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mt-10 flex justify-between">
        <button
          onClick={onBack}
          className="px-6 py-3 text-neutral-700 font-semibold rounded-md hover:bg-neutral-100 transition-colors"
        >
          Back
        </button>
        <button
          onClick={onNext}
          className="px-6 py-3 bg-primary-500 text-white font-semibold rounded-md hover:bg-primary-600 transition-colors"
        >
          Validate Application
        </button>
      </div>
    </div>
  )
}
