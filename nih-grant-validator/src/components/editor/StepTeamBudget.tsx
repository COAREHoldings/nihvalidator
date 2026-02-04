import { Users, DollarSign, Plus, Trash2, AlertTriangle } from 'lucide-react'
import type { ProjectSchemaV2 } from '../../types'
import { TextField } from '../shared/FormField'
import { BudgetCalculator } from '../BudgetCalculator'

interface StepTeamBudgetProps {
  project: ProjectSchemaV2
  onUpdate: (updates: Partial<ProjectSchemaV2>) => void
}

export function StepTeamBudget({ project, onUpdate }: StepTeamBudgetProps) {
  const isFastTrack = project.grant_type === 'Fast Track'

  // M4: Team Mapping - provide empty object fallback to prevent crashes
  const m4 = project.m4_team_mapping || {}
  const updateM4 = (field: string, value: unknown) => {
    onUpdate({ m4_team_mapping: { ...m4, [field]: value } })
  }

  const personnel = m4.key_personnel || []
  const collaborators = m4.collaborators || []
  const consultants = m4.consultants || []

  const addPersonnel = () => {
    updateM4('key_personnel', [...personnel, { name: '', role: '', expertise: '' }])
  }
  const removePersonnel = (idx: number) => {
    updateM4('key_personnel', personnel.filter((_, i) => i !== idx))
  }
  const updatePersonnel = (idx: number, field: string, value: string) => {
    const updated = [...personnel]
    updated[idx] = { ...updated[idx], [field]: value }
    updateM4('key_personnel', updated)
  }

  const addCollaborator = () => {
    updateM4('collaborators', [...collaborators, { name: '', institution: '', contribution: '' }])
  }
  const removeCollaborator = (idx: number) => {
    updateM4('collaborators', collaborators.filter((_, i) => i !== idx))
  }
  const updateCollaborator = (idx: number, field: string, value: string) => {
    const updated = [...collaborators]
    updated[idx] = { ...updated[idx], [field]: value }
    updateM4('collaborators', updated)
  }

  const addConsultant = () => {
    updateM4('consultants', [...consultants, { name: '', expertise: '', role: '' }])
  }
  const removeConsultant = (idx: number) => {
    updateM4('consultants', consultants.filter((_, i) => i !== idx))
  }
  const updateConsultant = (idx: number, field: string, value: string) => {
    const updated = [...consultants]
    updated[idx] = { ...updated[idx], [field]: value }
    updateM4('consultants', updated)
  }

  return (
    <div className="space-y-8">
      {/* Step Header */}
      <div>
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
            <Users className="w-5 h-5 text-primary-600" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-neutral-900">Team & Budget</h2>
            <p className="text-sm text-neutral-500">Define your research team and calculate budget requirements</p>
          </div>
        </div>
      </div>

      {/* Team Section */}
      <div className="bg-white rounded-xl border border-neutral-200 p-6">
        <div className="flex items-center gap-2 mb-6">
          <Users className="w-5 h-5 text-neutral-400" />
          <h3 className="text-lg font-semibold text-neutral-900">Research Team</h3>
        </div>

        {/* Principal Investigator */}
        <div className="mb-8">
          <h4 className="text-sm font-semibold text-neutral-700 mb-4">Principal Investigator</h4>
          
          <TextField
            label="PI Name"
            value={m4.pi_name || ''}
            onChange={v => updateM4('pi_name', v)}
            required
            placeholder="Full name of the Principal Investigator"
          />

          <TextField
            label="PI Qualifications"
            value={m4.pi_qualifications || ''}
            onChange={v => updateM4('pi_qualifications', v)}
            required
            multiline
            rows={4}
            placeholder="Relevant experience, credentials, and track record"
            helpText="Highlight expertise relevant to the proposed research"
          />
        </div>

        {/* Key Personnel */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-sm font-semibold text-neutral-700">Key Personnel</h4>
            <button
              onClick={addPersonnel}
              className="flex items-center gap-1 text-sm text-primary-600 hover:text-primary-700 font-medium"
            >
              <Plus className="w-4 h-4" /> Add Person
            </button>
          </div>

          {personnel.length === 0 ? (
            <p className="text-sm text-neutral-500 italic p-4 bg-neutral-50 rounded-lg">
              No key personnel added yet. Click "Add Person" to add team members.
            </p>
          ) : (
            <div className="space-y-3">
              {personnel.map((p, idx) => (
                <div key={idx} className="p-4 bg-neutral-50 rounded-lg">
                  <div className="flex justify-between items-start mb-3">
                    <span className="text-sm font-medium text-neutral-600">Person {idx + 1}</span>
                    <button
                      onClick={() => removePersonnel(idx)}
                      className="text-red-500 hover:text-red-600 p-1"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="grid md:grid-cols-3 gap-3">
                    <input
                      placeholder="Name"
                      value={p.name}
                      onChange={e => updatePersonnel(idx, 'name', e.target.value)}
                      className="px-3 py-2 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                    <input
                      placeholder="Role"
                      value={p.role}
                      onChange={e => updatePersonnel(idx, 'role', e.target.value)}
                      className="px-3 py-2 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                    <input
                      placeholder="Expertise"
                      value={p.expertise}
                      onChange={e => updatePersonnel(idx, 'expertise', e.target.value)}
                      className="px-3 py-2 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Collaborators */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-sm font-semibold text-neutral-700">Collaborators</h4>
            <button
              onClick={addCollaborator}
              className="flex items-center gap-1 text-sm text-primary-600 hover:text-primary-700 font-medium"
            >
              <Plus className="w-4 h-4" /> Add Collaborator
            </button>
          </div>

          {collaborators.length === 0 ? (
            <p className="text-sm text-neutral-500 italic p-4 bg-neutral-50 rounded-lg">
              No collaborators added yet.
            </p>
          ) : (
            <div className="space-y-3">
              {collaborators.map((c, idx) => (
                <div key={idx} className="p-4 bg-neutral-50 rounded-lg">
                  <div className="flex justify-between items-start mb-3">
                    <span className="text-sm font-medium text-neutral-600">Collaborator {idx + 1}</span>
                    <button
                      onClick={() => removeCollaborator(idx)}
                      className="text-red-500 hover:text-red-600 p-1"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="grid md:grid-cols-3 gap-3">
                    <input
                      placeholder="Name"
                      value={c.name}
                      onChange={e => updateCollaborator(idx, 'name', e.target.value)}
                      className="px-3 py-2 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                    <input
                      placeholder="Institution"
                      value={c.institution}
                      onChange={e => updateCollaborator(idx, 'institution', e.target.value)}
                      className="px-3 py-2 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                    <input
                      placeholder="Contribution"
                      value={c.contribution}
                      onChange={e => updateCollaborator(idx, 'contribution', e.target.value)}
                      className="px-3 py-2 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Consultants */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-sm font-semibold text-neutral-700">Consultants</h4>
            <button
              onClick={addConsultant}
              className="flex items-center gap-1 text-sm text-primary-600 hover:text-primary-700 font-medium"
            >
              <Plus className="w-4 h-4" /> Add Consultant
            </button>
          </div>

          {consultants.length === 0 ? (
            <p className="text-sm text-neutral-500 italic p-4 bg-neutral-50 rounded-lg">
              No consultants added yet.
            </p>
          ) : (
            <div className="space-y-3">
              {consultants.map((c, idx) => (
                <div key={idx} className="p-4 bg-neutral-50 rounded-lg">
                  <div className="flex justify-between items-start mb-3">
                    <span className="text-sm font-medium text-neutral-600">Consultant {idx + 1}</span>
                    <button
                      onClick={() => removeConsultant(idx)}
                      className="text-red-500 hover:text-red-600 p-1"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="grid md:grid-cols-3 gap-3">
                    <input
                      placeholder="Name"
                      value={c.name}
                      onChange={e => updateConsultant(idx, 'name', e.target.value)}
                      className="px-3 py-2 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                    <input
                      placeholder="Expertise"
                      value={c.expertise}
                      onChange={e => updateConsultant(idx, 'expertise', e.target.value)}
                      className="px-3 py-2 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                    <input
                      placeholder="Role"
                      value={c.role}
                      onChange={e => updateConsultant(idx, 'role', e.target.value)}
                      className="px-3 py-2 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Budget Section */}
      <div className="bg-white rounded-xl border border-neutral-200 p-6">
        <div className="flex items-center gap-2 mb-6">
          <DollarSign className="w-5 h-5 text-neutral-400" />
          <h3 className="text-lg font-semibold text-neutral-900">Budget Calculator</h3>
        </div>

        {/* SBIR/STTR Effort Requirements */}
        <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-amber-800">Effort Allocation Requirements</p>
              <p className="text-xs text-amber-700 mt-1">
                {project.program_type === 'SBIR' ? (
                  project.grant_type === 'Phase I'
                    ? 'SBIR Phase I: Minimum 67% small business effort required'
                    : 'SBIR Phase II: Minimum 50% small business effort required'
                ) : (
                  'STTR: Minimum 40% small business, 30% research institution effort required'
                )}
              </p>
            </div>
          </div>
        </div>

        {isFastTrack ? (
          <div className="space-y-8">
            <div className="p-4 bg-primary-50 border border-primary-200 rounded-lg">
              <p className="text-sm text-primary-700">
                <strong>Fast Track:</strong> Separate budgets are required for Phase I and Phase II.
              </p>
            </div>

            {/* Phase I Budget */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <span className="px-3 py-1 bg-blue-100 text-blue-800 text-sm font-medium rounded-full">Phase I</span>
                <span className="text-sm text-neutral-500">Budget Cap: $275,000</span>
              </div>
              <BudgetCalculator
                project={project}
                onUpdate={onUpdate}
                isFastTrack={true}
                currentPhase="phase1"
              />
            </div>

            <div className="border-t border-neutral-200 pt-8">
              {/* Phase II Budget */}
              <div className="flex items-center gap-2 mb-4">
                <span className="px-3 py-1 bg-purple-100 text-purple-800 text-sm font-medium rounded-full">Phase II</span>
                <span className="text-sm text-neutral-500">Budget Cap: $1,750,000</span>
              </div>
              <BudgetCalculator
                project={project}
                onUpdate={onUpdate}
                isFastTrack={true}
                currentPhase="phase2"
              />
            </div>
          </div>
        ) : (
          <BudgetCalculator
            project={project}
            onUpdate={onUpdate}
            isFastTrack={false}
          />
        )}
      </div>
    </div>
  )
}
