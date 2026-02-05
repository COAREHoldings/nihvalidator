import { Plus, FileText, Loader2 } from 'lucide-react'
import type { ProjectSchemaV2 } from '../../types'

interface MyGrantsProps {
  projects: ProjectSchemaV2[]
  currentProject: ProjectSchemaV2 | null
  onSelectProject: (project: ProjectSchemaV2) => void
  onStartNew: () => void
  loading?: boolean
}

export function MyGrants({ 
  projects, 
  currentProject, 
  onSelectProject, 
  onStartNew,
  loading = false 
}: MyGrantsProps) {
  const hasProjects = projects.length > 0

  // Calculate progress based on module states
  const getProgress = (project: ProjectSchemaV2) => {
    if (!project.module_states) return 0
    return Math.round((project.module_states.filter(m => m.status === 'complete').length / project.module_states.length) * 100)
  }

  return (
    <div className="flex-1 bg-neutral-50 min-h-screen">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 sm:mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-neutral-900 mb-1 sm:mb-2">My Grants</h1>
            <p className="text-sm sm:text-base text-neutral-500">Manage all your grant applications</p>
          </div>
          <button
            onClick={onStartNew}
            className="flex items-center justify-center gap-2 px-4 sm:px-5 py-2.5 sm:py-3 bg-primary-500 text-white rounded-xl hover:bg-primary-600 transition-colors shadow-sm w-full sm:w-auto"
          >
            <Plus className="w-5 h-5" />
            New Grant
          </button>
        </div>

        {/* Grants - Desktop Table / Mobile Cards */}
        <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
          {loading ? (
            <div className="py-16 text-center">
              <Loader2 className="w-8 h-8 animate-spin text-primary-500 mx-auto mb-4" />
              <p className="text-neutral-500">Loading your grants...</p>
            </div>
          ) : hasProjects ? (
            <>
              {/* Desktop Table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-neutral-50 border-b border-neutral-200">
                      <th className="text-left py-4 px-6 font-semibold text-neutral-700">Grant Name</th>
                      <th className="text-left py-4 px-6 font-semibold text-neutral-700">Type</th>
                      <th className="text-left py-4 px-6 font-semibold text-neutral-700">Institute</th>
                      <th className="text-left py-4 px-6 font-semibold text-neutral-700">Progress</th>
                      <th className="text-left py-4 px-6 font-semibold text-neutral-700">Last Edited</th>
                      <th className="text-right py-4 px-6 font-semibold text-neutral-700">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {projects.map((project) => {
                      const progress = getProgress(project)
                      const isCurrentProject = currentProject?.id === project.id
                      
                      return (
                        <tr 
                          key={project.id} 
                          className={`border-b border-neutral-100 hover:bg-neutral-50 transition-colors cursor-pointer ${isCurrentProject ? 'bg-primary-50/50' : ''}`}
                          onClick={() => onSelectProject(project)}
                        >
                          <td className="py-4 px-6">
                            <div className="flex items-center gap-3">
                              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isCurrentProject ? 'bg-primary-100' : 'bg-neutral-100'}`}>
                                <FileText className={`w-5 h-5 ${isCurrentProject ? 'text-primary-600' : 'text-neutral-400'}`} />
                              </div>
                              <div>
                                <span className="font-medium text-neutral-900 block">
                                  {project.m1_title_concept?.project_title || 'Untitled Project'}
                                </span>
                                {isCurrentProject && (
                                  <span className="text-xs text-primary-600">Currently editing</span>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="py-4 px-6">
                            <span className="px-2.5 py-1 bg-neutral-100 text-neutral-700 rounded-full text-xs font-medium">
                              {project.program_type}
                            </span>
                            <span className="ml-2 text-neutral-500">{project.grant_type}</span>
                          </td>
                          <td className="py-4 px-6 text-neutral-600">
                            {project.institute || '—'}
                          </td>
                          <td className="py-4 px-6">
                            <div className="flex items-center gap-3">
                              <div className="w-24 h-2 bg-neutral-100 rounded-full overflow-hidden">
                                <div 
                                  className={`h-full rounded-full ${progress === 100 ? 'bg-green-500' : 'bg-primary-500'}`}
                                  style={{ width: `${progress}%` }}
                                />
                              </div>
                              <span className="text-xs font-medium text-neutral-600 w-8">{progress}%</span>
                            </div>
                          </td>
                          <td className="py-4 px-6 text-neutral-500">
                            {new Date(project.updated_at || '').toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric'
                            })}
                          </td>
                          <td className="py-4 px-6 text-right">
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                onSelectProject(project)
                              }}
                              className="px-4 py-2 text-primary-600 hover:bg-primary-50 rounded-lg font-medium transition-colors"
                            >
                              {isCurrentProject ? 'Continue' : 'Open'}
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card List */}
              <div className="md:hidden divide-y divide-neutral-100">
                {projects.map((project) => {
                  const progress = getProgress(project)
                  const isCurrentProject = currentProject?.id === project.id
                  
                  return (
                    <div 
                      key={project.id}
                      onClick={() => onSelectProject(project)}
                      className={`p-4 cursor-pointer active:bg-neutral-50 transition-colors ${isCurrentProject ? 'bg-primary-50/50' : ''}`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${isCurrentProject ? 'bg-primary-100' : 'bg-neutral-100'}`}>
                          <FileText className={`w-5 h-5 ${isCurrentProject ? 'text-primary-600' : 'text-neutral-400'}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <h3 className="font-medium text-neutral-900 truncate">
                                {project.m1_title_concept?.project_title || 'Untitled Project'}
                              </h3>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="px-2 py-0.5 bg-neutral-100 text-neutral-600 rounded text-xs font-medium">
                                  {project.program_type}
                                </span>
                                <span className="text-xs text-neutral-500">{project.grant_type}</span>
                              </div>
                            </div>
                            {isCurrentProject && (
                              <span className="flex-shrink-0 text-xs px-2 py-0.5 bg-primary-100 text-primary-700 rounded-full">
                                Current
                              </span>
                            )}
                          </div>
                          
                          <div className="flex items-center justify-between mt-3">
                            <div className="flex items-center gap-2 flex-1">
                              <div className="w-full max-w-[100px] h-1.5 bg-neutral-100 rounded-full overflow-hidden">
                                <div 
                                  className={`h-full rounded-full ${progress === 100 ? 'bg-green-500' : 'bg-primary-500'}`}
                                  style={{ width: `${progress}%` }}
                                />
                              </div>
                              <span className="text-xs text-neutral-500">{progress}%</span>
                            </div>
                            <span className="text-xs text-neutral-400 ml-3">
                              {new Date(project.updated_at || '').toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric'
                              })}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          ) : (
            <div className="py-16 text-center px-4">
              <div className="w-16 h-16 bg-neutral-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <FileText className="w-8 h-8 text-neutral-400" />
              </div>
              <h3 className="text-lg font-semibold text-neutral-900 mb-2">No grants yet</h3>
              <p className="text-neutral-500 mb-6">Start your first grant application to see it here</p>
              <button
                onClick={onStartNew}
                className="inline-flex items-center gap-2 px-5 py-3 bg-primary-500 text-white rounded-xl hover:bg-primary-600 transition-colors"
              >
                <Plus className="w-5 h-5" />
                Create Your First Grant
              </button>
            </div>
          )}
        </div>

        {/* Stats */}
        {hasProjects && (
          <div className="grid grid-cols-3 gap-3 sm:gap-4 mt-6">
            <div className="bg-white rounded-xl border border-neutral-200 p-4 sm:p-5">
              <p className="text-xs sm:text-sm text-neutral-500 mb-1">Total Grants</p>
              <p className="text-xl sm:text-2xl font-bold text-neutral-900">{projects.length}</p>
            </div>
            <div className="bg-white rounded-xl border border-neutral-200 p-4 sm:p-5">
              <p className="text-xs sm:text-sm text-neutral-500 mb-1">In Progress</p>
              <p className="text-xl sm:text-2xl font-bold text-neutral-900">
                {projects.filter(p => getProgress(p) > 0 && getProgress(p) < 100).length}
              </p>
            </div>
            <div className="bg-white rounded-xl border border-neutral-200 p-4 sm:p-5">
              <p className="text-xs sm:text-sm text-neutral-500 mb-1">Completed</p>
              <p className="text-xl sm:text-2xl font-bold text-neutral-900">
                {projects.filter(p => getProgress(p) === 100).length}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
