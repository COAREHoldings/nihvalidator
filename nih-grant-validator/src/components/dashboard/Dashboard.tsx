import { Plus, FileText, Upload, Clock, ChevronRight, Loader2 } from 'lucide-react'
import type { ProjectSchemaV2 } from '../../types'

interface DashboardProps {
  onStartNew: () => void
  onContinueDraft: () => void
  onAudit: () => void
  onResearchIntel: () => void
  currentProject: ProjectSchemaV2 | null
  projects?: ProjectSchemaV2[]
  onSelectProject?: (project: ProjectSchemaV2) => void
  loading?: boolean
}

export function Dashboard({ 
  onStartNew, 
  onContinueDraft, 
  onAudit, 
  onResearchIntel,
  currentProject,
  projects = [],
  onSelectProject,
  loading = false
}: DashboardProps) {
  const hasDraft = currentProject !== null || projects.length > 0
  const hasProjects = projects.length > 0
  
  // Use currentProject or fall back to first project for display
  const displayProject = currentProject || (projects.length > 0 ? projects[0] : null)
  
  // Calculate progress based on module states
  const getProgress = (project: ProjectSchemaV2) => {
    if (!project.module_states) return 0
    return Math.round((project.module_states.filter(m => m.status === 'complete').length / project.module_states.length) * 100)
  }
  
  const draftProgress = displayProject ? getProgress(displayProject) : 0

  return (
    <div className="flex-1 bg-neutral-50 min-h-screen">
      <div className="max-w-6xl mx-auto px-6 py-10">
        {/* Welcome Header */}
        <div className="mb-10">
          <h1 className="text-3xl font-bold text-neutral-900">Welcome Back</h1>
          <p className="text-neutral-500 mt-2">Manage your NIH SBIR/STTR grant applications</p>
        </div>

        {/* Action Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          {/* Start New Grant */}
          <ActionCard
            icon={<Plus className="w-8 h-8" />}
            iconBg="bg-primary-100"
            iconColor="text-primary-600"
            title="Start New Grant"
            description="Begin a new SBIR/STTR application with guided step-by-step workflow"
            buttonText="Start Now"
            buttonVariant="primary"
            onClick={onStartNew}
          />

          {/* Continue Draft */}
          <ActionCard
            icon={<FileText className="w-8 h-8" />}
            iconBg={hasDraft ? "bg-green-100" : "bg-neutral-100"}
            iconColor={hasDraft ? "text-green-600" : "text-neutral-400"}
            title="Continue Draft"
            description={hasDraft 
              ? `${displayProject?.program_type} ${displayProject?.grant_type || ''} - ${draftProgress}% complete`
              : 'No draft in progress'
            }
            subtext={hasDraft ? `Last edited: ${new Date(displayProject?.updated_at || '').toLocaleDateString()}` : undefined}
            buttonText="Resume"
            buttonVariant="primary"
            onClick={onContinueDraft}
            disabled={!hasDraft}
          />

          {/* Audit Grant */}
          <ActionCard
            icon={<Upload className="w-8 h-8" />}
            iconBg="bg-amber-100"
            iconColor="text-amber-600"
            title="Audit Grant"
            description="Upload and validate an existing grant document for compliance"
            buttonText="Upload File"
            buttonVariant="secondary"
            onClick={onAudit}
          />
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
          <button
            onClick={onResearchIntel}
            className="flex items-center justify-between p-5 bg-white rounded-xl border border-neutral-200 hover:border-primary-300 hover:shadow-sm transition-all text-left"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-cyan-100 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-cyan-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <div>
                <p className="font-semibold text-neutral-900">Research Intelligence</p>
                <p className="text-sm text-neutral-500">Analyze funding trends and competition</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-neutral-400" />
          </button>

          <div className="flex items-center justify-between p-5 bg-white rounded-xl border border-neutral-200 text-left opacity-60">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-neutral-100 rounded-xl flex items-center justify-center">
                <Clock className="w-6 h-6 text-neutral-400" />
              </div>
              <div>
                <p className="font-semibold text-neutral-900">Submission Tracker</p>
                <p className="text-sm text-neutral-500">Coming soon</p>
              </div>
            </div>
            <span className="text-xs px-2 py-1 bg-neutral-100 text-neutral-500 rounded-full">Soon</span>
          </div>
        </div>

        {/* My Grants */}
        <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
          <div className="flex items-center justify-between p-5 border-b border-neutral-100">
            <h2 className="font-semibold text-neutral-900">My Grants</h2>
            {hasProjects && (
              <span className="text-sm text-neutral-500">{projects.length} project{projects.length !== 1 ? 's' : ''}</span>
            )}
          </div>

          <div className="overflow-x-auto">
            {loading ? (
              <div className="py-12 text-center">
                <Loader2 className="w-8 h-8 animate-spin text-primary-500 mx-auto mb-4" />
                <p className="text-neutral-500">Loading your projects...</p>
              </div>
            ) : hasProjects ? (
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-neutral-50">
                    <th className="text-left py-3 px-5 font-medium text-neutral-600">Grant Name</th>
                    <th className="text-left py-3 px-5 font-medium text-neutral-600">Type</th>
                    <th className="text-left py-3 px-5 font-medium text-neutral-600">Progress</th>
                    <th className="text-left py-3 px-5 font-medium text-neutral-600">Last Edited</th>
                    <th className="text-right py-3 px-5 font-medium text-neutral-600">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {projects.map((project) => {
                    const progress = getProgress(project)
                    const isCurrentProject = currentProject?.id === project.id
                    
                    return (
                      <tr 
                        key={project.id} 
                        className={`border-b border-neutral-50 hover:bg-neutral-50 transition-colors ${isCurrentProject ? 'bg-primary-50' : ''}`}
                      >
                        <td className="py-4 px-5">
                          <span className="font-medium text-neutral-900">
                            {project.m1_title_concept?.project_title || 'Untitled Project'}
                          </span>
                          {isCurrentProject && (
                            <span className="ml-2 text-xs px-2 py-0.5 bg-primary-100 text-primary-700 rounded-full">
                              Current
                            </span>
                          )}
                        </td>
                        <td className="py-4 px-5 text-neutral-600">
                          {project.program_type} {project.grant_type}
                        </td>
                        <td className="py-4 px-5">
                          <div className="flex items-center gap-2">
                            <div className="w-20 h-2 bg-neutral-100 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-primary-500 rounded-full"
                                style={{ width: `${progress}%` }}
                              />
                            </div>
                            <span className="text-xs text-neutral-500">{progress}%</span>
                          </div>
                        </td>
                        <td className="py-4 px-5 text-neutral-500">
                          {new Date(project.updated_at || '').toLocaleDateString()}
                        </td>
                        <td className="py-4 px-5 text-right">
                          <button
                            onClick={() => onSelectProject?.(project)}
                            className="text-primary-600 hover:text-primary-700 font-medium"
                          >
                            {isCurrentProject ? 'Continue' : 'Open'}
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            ) : (
              <div className="py-12 text-center">
                <div className="w-16 h-16 bg-neutral-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <FileText className="w-8 h-8 text-neutral-400" />
                </div>
                <p className="text-neutral-500 mb-4">No grants yet</p>
                <button
                  onClick={onStartNew}
                  className="text-primary-600 hover:text-primary-700 font-medium"
                >
                  Start your first grant application
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

interface ActionCardProps {
  icon: React.ReactNode
  iconBg: string
  iconColor: string
  title: string
  description: string
  subtext?: string
  buttonText: string
  buttonVariant: 'primary' | 'secondary'
  onClick: () => void
  disabled?: boolean
}

function ActionCard({ 
  icon, 
  iconBg,
  iconColor,
  title, 
  description, 
  subtext, 
  buttonText, 
  buttonVariant, 
  onClick,
  disabled 
}: ActionCardProps) {
  return (
    <div className={`bg-white rounded-xl border border-neutral-200 p-6 flex flex-col transition-all hover:shadow-md ${disabled ? 'opacity-60' : ''}`}>
      <div className={`w-14 h-14 ${iconBg} rounded-xl flex items-center justify-center mb-4 ${iconColor}`}>
        {icon}
      </div>
      <h3 className="font-semibold text-lg text-neutral-900 mb-2">{title}</h3>
      <p className="text-sm text-neutral-500 mb-1 flex-grow">{description}</p>
      {subtext && <p className="text-xs text-neutral-400 mb-4">{subtext}</p>}
      <div className="mt-auto pt-4">
        <button
          onClick={onClick}
          disabled={disabled}
          className={`w-full px-4 py-3 rounded-xl font-medium text-sm transition-colors ${
            buttonVariant === 'primary'
              ? 'bg-primary-500 text-white hover:bg-primary-600 disabled:bg-neutral-300 disabled:cursor-not-allowed'
              : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
          }`}
        >
          {buttonText}
        </button>
      </div>
    </div>
  )
}
