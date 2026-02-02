import type { ProjectSchemaV2 } from '../types'
import { AlertTriangle, CheckCircle } from 'lucide-react'

interface Props {
  project: ProjectSchemaV2
  onUpdate: (updates: Partial<ProjectSchemaV2>) => void
}

export function PriorPhaseEditor({ project, onUpdate }: Props) {
  const grantType = project.grant_type
  const prior = project.prior_phase

  // Determine what's required based on grant type
  const needsPriorAward = grantType === 'Phase II' || grantType === 'Phase IIB'
  const needsFeasibility = grantType === 'Direct to Phase II'
  
  if (!needsPriorAward && !needsFeasibility) {
    return (
      <div className="p-4 bg-green-50 rounded-lg border border-green-200">
        <div className="flex items-center gap-3">
          <CheckCircle className="w-6 h-6 text-semantic-success" />
          <div>
            <h4 className="font-semibold text-green-800">No Prior Phase Required</h4>
            <p className="text-sm text-green-700">{grantType} applications can proceed from zero state.</p>
          </div>
        </div>
      </div>
    )
  }

  const updatePrior = (field: string, value: string | boolean) => {
    onUpdate({ prior_phase: { ...prior, [field]: value } })
  }

  if (needsPriorAward) {
    const priorPhase = grantType === 'Phase II' ? 'Phase I' : 'Phase II'
    const successField = grantType === 'Phase II' ? 'phase1_success_documented' : 'phase2_success_documented'
    return (
      <div>
        <div className="mb-6 p-4 bg-amber-50 rounded-lg border border-amber-200">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-semibold text-amber-800">Prior {priorPhase} Award Required</h4>
              <p className="text-sm text-amber-700">{grantType} applications require documented success from a prior {priorPhase} award.</p>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1.5">
              {priorPhase} Award Number <span className="text-semantic-error">*</span>
            </label>
            <input
              type="text"
              value={prior.awardNumber}
              onChange={e => updatePrior('awardNumber', e.target.value)}
              placeholder="e.g., 1R43AI123456-01"
              className="w-full px-3 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1.5">
              Completion Date <span className="text-semantic-error">*</span>
            </label>
            <input
              type="date"
              value={prior.completionDate}
              onChange={e => updatePrior('completionDate', e.target.value)}
              className="w-full px-3 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1.5">
              Key Findings Summary
            </label>
            <textarea
              value={prior.findings}
              onChange={e => updatePrior('findings', e.target.value)}
              placeholder="Summarize the key findings and outcomes from the prior phase"
              rows={4}
              className="w-full px-3 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <label className="flex items-center gap-3 p-3 bg-neutral-50 rounded-lg">
            <input
              type="checkbox"
              checked={successField === 'phase1_success_documented' ? prior.phase1_success_documented : prior.phase2_success_documented}
              onChange={e => updatePrior(successField, e.target.checked)}
              className="w-5 h-5"
            />
            <div>
              <span className="font-medium text-neutral-900">{priorPhase} Success Documented</span>
              <p className="text-sm text-neutral-500">I confirm that the {priorPhase} was successfully completed with documented outcomes</p>
            </div>
          </label>
        </div>
      </div>
    )
  }

  // Direct to Phase II - Feasibility Evidence
  const feasibility = project.direct_phase2_feasibility
  const updateFeasibility = (field: string, value: string) => {
    onUpdate({ direct_phase2_feasibility: { ...feasibility, [field]: value } })
  }

  return (
    <div>
      <div className="mb-6 p-4 bg-amber-50 rounded-lg border border-amber-200">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-semibold text-amber-800">Feasibility Evidence Required</h4>
            <p className="text-sm text-amber-700">Direct to Phase II requires proof of feasibility achieved through non-SBIR/STTR funding.</p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1.5">
            Funding Source <span className="text-semantic-error">*</span>
          </label>
          <input
            type="text"
            value={prior.fundingSource}
            onChange={e => updatePrior('fundingSource', e.target.value)}
            placeholder="e.g., Internal R&D, Angel Investment, Federal Grant"
            className="w-full px-3 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1.5">
            Preliminary Data Summary <span className="text-semantic-error">*</span>
          </label>
          <textarea
            value={feasibility.preliminary_data_summary || ''}
            onChange={e => updateFeasibility('preliminary_data_summary', e.target.value)}
            placeholder="Summarize preliminary data supporting feasibility"
            rows={3}
            className="w-full px-3 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1.5">
            Proof of Feasibility Results <span className="text-semantic-error">*</span>
          </label>
          <textarea
            value={feasibility.proof_of_feasibility_results || ''}
            onChange={e => updateFeasibility('proof_of_feasibility_results', e.target.value)}
            placeholder="Describe results demonstrating proof of concept"
            rows={3}
            className="w-full px-3 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1.5">
            Technical Feasibility Evidence <span className="text-semantic-error">*</span>
          </label>
          <textarea
            value={feasibility.technical_feasibility_evidence || ''}
            onChange={e => updateFeasibility('technical_feasibility_evidence', e.target.value)}
            placeholder="Technical evidence supporting feasibility"
            rows={3}
            className="w-full px-3 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1.5">
            Risk Reduction Data <span className="text-semantic-error">*</span>
          </label>
          <textarea
            value={feasibility.risk_reduction_data || ''}
            onChange={e => updateFeasibility('risk_reduction_data', e.target.value)}
            placeholder="Data showing reduced technical/commercial risk"
            rows={3}
            className="w-full px-3 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1.5">
            Rationale for Skipping Phase I <span className="text-semantic-error">*</span>
          </label>
          <textarea
            value={feasibility.rationale_for_skipping_phase1 || ''}
            onChange={e => updateFeasibility('rationale_for_skipping_phase1', e.target.value)}
            placeholder="Explain why Phase I is not needed"
            rows={3}
            className="w-full px-3 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1.5">
            Commercialization Readiness Statement <span className="text-semantic-error">*</span>
          </label>
          <textarea
            value={feasibility.commercialization_readiness_statement || ''}
            onChange={e => updateFeasibility('commercialization_readiness_statement', e.target.value)}
            placeholder="Statement of commercialization readiness"
            rows={3}
            className="w-full px-3 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
      </div>
    </div>
  )
}
