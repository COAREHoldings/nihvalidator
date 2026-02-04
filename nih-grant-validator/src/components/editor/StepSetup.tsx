import { useState } from 'react'
import { Settings, Upload, FileText, CheckCircle, AlertTriangle, Info } from 'lucide-react'
import type { ProjectSchemaV2, GrantType, ProgramType, NIHInstitute } from '../../types'
import { NIH_INSTITUTES, getBudgetCapForPhase } from '../../types'
import { SelectField, CheckboxField } from '../shared/FormField'
import { FOAUpload } from '../FOAUpload'
import { AIGenerateButton } from '../shared/AIGenerateButton'

interface StepSetupProps {
  project: ProjectSchemaV2
  onUpdate: (updates: Partial<ProjectSchemaV2>) => void
}

const GRANT_TYPES: { value: GrantType; label: string; description: string }[] = [
  { value: 'Phase I', label: 'Phase I', description: 'Feasibility/proof-of-concept (typically $275K cap)' },
  { value: 'Phase II', label: 'Phase II', description: 'Full R&D (typically $1.75M cap, requires Phase I success)' },
  { value: 'Fast Track', label: 'Fast Track', description: 'Combined Phase I + II in single application' },
  { value: 'Direct to Phase II', label: 'Direct to Phase II', description: 'Skip Phase I with prior feasibility evidence' },
  { value: 'Phase IIB', label: 'Phase IIB', description: 'Bridge funding for commercialization' },
]

const PROGRAM_TYPES: { value: ProgramType; label: string; description: string }[] = [
  { value: 'SBIR', label: 'SBIR', description: 'Small Business Innovation Research (67% small business min)' },
  { value: 'STTR', label: 'STTR', description: 'Small Business Technology Transfer (40% SB, 30% RI min)' },
]

export function StepSetup({ project, onUpdate }: StepSetupProps) {
  const [showFOAUpload, setShowFOAUpload] = useState(false)
  
  const budgetCap = project.grant_type ? getBudgetCapForPhase(project.institute || 'Standard NIH', project.grant_type) : 0

  const handleProgramTypeChange = (value: string) => {
    onUpdate({ program_type: value as ProgramType })
  }

  const handleGrantTypeChange = (value: string) => {
    onUpdate({ grant_type: value as GrantType })
  }

  const handleInstituteChange = (value: string) => {
    onUpdate({ institute: value as NIHInstitute })
  }

  const isConfigComplete = project.grant_type !== null && project.grant_type !== undefined

  return (
    <div className="space-y-8">
      {/* Step Header */}
      <div>
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
            <Settings className="w-5 h-5 text-primary-600" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-neutral-900">Application Setup</h2>
            <p className="text-sm text-neutral-500">Configure your grant type, program, and NIH institute</p>
          </div>
        </div>
      </div>

      {/* Configuration Status */}
      {isConfigComplete && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-xl">
          <div className="flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
            <div>
              <p className="font-medium text-green-800">Configuration Complete</p>
              <p className="text-sm text-green-600 mt-1">
                {project.program_type} {project.grant_type} | {project.institute || 'Standard NIH'}
                {budgetCap > 0 && ` | Budget Cap: $${budgetCap.toLocaleString()}`}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Program Type */}
      <div className="bg-white rounded-xl border border-neutral-200 p-6">
        <h3 className="text-lg font-semibold text-neutral-900 mb-4">Program Type</h3>
        <div className="grid md:grid-cols-2 gap-4">
          {PROGRAM_TYPES.map(type => (
            <button
              key={type.value}
              onClick={() => handleProgramTypeChange(type.value)}
              className={`p-4 rounded-lg border-2 text-left transition-all ${
                project.program_type === type.value
                  ? 'border-primary-500 bg-primary-50'
                  : 'border-neutral-200 hover:border-neutral-300'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="font-semibold text-neutral-900">{type.label}</span>
                {project.program_type === type.value && (
                  <CheckCircle className="w-4 h-4 text-primary-500" />
                )}
              </div>
              <p className="text-sm text-neutral-500">{type.description}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Grant Type */}
      <div className="bg-white rounded-xl border border-neutral-200 p-6">
        <h3 className="text-lg font-semibold text-neutral-900 mb-4">Grant Type</h3>
        <div className="space-y-3">
          {GRANT_TYPES.map(type => (
            <button
              key={type.value}
              onClick={() => handleGrantTypeChange(type.value)}
              className={`w-full p-4 rounded-lg border-2 text-left transition-all ${
                project.grant_type === type.value
                  ? 'border-primary-500 bg-primary-50'
                  : 'border-neutral-200 hover:border-neutral-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-neutral-900">{type.label}</span>
                    {project.grant_type === type.value && (
                      <CheckCircle className="w-4 h-4 text-primary-500" />
                    )}
                  </div>
                  <p className="text-sm text-neutral-500 mt-1">{type.description}</p>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* NIH Institute */}
      <div className="bg-white rounded-xl border border-neutral-200 p-6">
        <h3 className="text-lg font-semibold text-neutral-900 mb-4">NIH Institute</h3>
        <SelectField
          label="Select NIH Institute"
          value={project.institute || 'Standard NIH'}
          onChange={handleInstituteChange}
          options={NIH_INSTITUTES.map(inst => ({ value: inst.code, label: `${inst.code} - ${inst.name}` }))}
          helpText="Different institutes may have different budget caps and requirements"
        />
        
        {budgetCap > 0 && (
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-blue-600" />
              <span className="text-sm text-blue-700">
                Budget cap for {project.grant_type}: <strong>${budgetCap.toLocaleString()}</strong>
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Clinical Trial */}
      <div className="bg-white rounded-xl border border-neutral-200 p-6">
        <h3 className="text-lg font-semibold text-neutral-900 mb-4">Clinical Trial Designation</h3>
        <CheckboxField
          label="This project includes a clinical trial"
          checked={project.clinical_trial_included || false}
          onChange={(checked) => onUpdate({ clinical_trial_included: checked })}
          helpText="Select if your research involves clinical trials with human subjects"
        />
        
        {project.clinical_trial_included && (
          <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-amber-700">Additional Requirements</p>
                <p className="text-xs text-amber-600 mt-1">
                  Clinical trial applications require IRB approval documentation and must follow NIH clinical trial policies.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* FOA Upload */}
      <div className="bg-white rounded-xl border border-neutral-200 p-6">
        <h3 className="text-lg font-semibold text-neutral-900 mb-2">Funding Opportunity Announcement (Optional)</h3>
        <p className="text-sm text-neutral-500 mb-4">
          Upload your FOA to automatically extract requirements, page limits, and special instructions.
        </p>
        
        {project.foa_number ? (
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-green-600" />
                <div>
                  <p className="font-medium text-green-800">FOA Loaded</p>
                  <p className="text-sm text-green-600">{project.foa_number}</p>
                </div>
              </div>
              <button
                onClick={() => setShowFOAUpload(true)}
                className="text-sm text-green-700 hover:text-green-800 underline"
              >
                Update
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowFOAUpload(true)}
            className="w-full p-4 border-2 border-dashed border-neutral-300 rounded-lg hover:border-primary-400 hover:bg-primary-50 transition-colors"
          >
            <div className="flex flex-col items-center gap-2 text-neutral-500">
              <Upload className="w-8 h-8" />
              <span className="text-sm font-medium">Click to upload FOA document</span>
              <span className="text-xs">PDF or TXT format</span>
            </div>
          </button>
        )}
      </div>

      {/* FOA Upload Modal */}
      {showFOAUpload && (
        <FOAUpload
          project={project}
          onUpdate={onUpdate}
          onClose={() => setShowFOAUpload(false)}
        />
      )}

      {/* AI Generation Section - positioned after all form fields */}
      <div className="bg-gradient-to-r from-primary-50 to-blue-50 rounded-xl border border-primary-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Settings className="w-5 h-5 text-primary-600" />
          <h3 className="text-lg font-semibold text-neutral-900">AI Assistance</h3>
        </div>
        <p className="text-sm text-neutral-600 mb-4">
          Generate a project title based on your configuration above.
        </p>
        <AIGenerateButton
          project={project}
          documentType="title"
          onGenerated={(doc) => {
            if (doc.content) {
              onUpdate({ m1_title_concept: { ...project.m1_title_concept, project_title: doc.content.trim() } })
            }
          }}
        />
      </div>
    </div>
  )
}
