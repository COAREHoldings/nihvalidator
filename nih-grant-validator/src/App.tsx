import { useState, useCallback, useEffect, useRef } from 'react'
import { Loader2, LogOut } from 'lucide-react'
import { Sidebar } from './components/layout/Sidebar'
import { Dashboard } from './components/dashboard/Dashboard'
import { GrantEditor } from './components/editor/GrantEditor'
import { ProjectCreationWizard } from './components/ProjectCreationWizard'
import { AuditMode } from './components/AuditMode'
import { ResearchIntelligence } from './components/ResearchIntelligence'
import { AuthScreen } from './components/auth/AuthScreen'
import { Onboarding } from './components/Onboarding'
import { useAuth } from './contexts/AuthContext'
import { getUserProjects, createProject, updateProject as updateProjectDB, saveProject } from './services/projectService'
import type { ProjectSchemaV2 } from './types'
import { updateModuleStates, createDefaultProject } from './types'

type MainView = 'dashboard' | 'editor' | 'audit' | 'research-intelligence' | 'settings'
type NavItem = 'dashboard' | 'grants' | 'research' | 'settings'

export default function App() {
  const { user, loading: authLoading, signOut } = useAuth()
  const [mainView, setMainView] = useState<MainView>('dashboard')
  const [activeNav, setActiveNav] = useState<NavItem>('dashboard')
  const [projects, setProjects] = useState<ProjectSchemaV2[]>([])
  const [currentProject, setCurrentProject] = useState<ProjectSchemaV2 | null>(null)
  const [showWizard, setShowWizard] = useState(false)
  const [loadingProjects, setLoadingProjects] = useState(false)
  const [saving, setSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [showOnboarding, setShowOnboarding] = useState(false)
  
  // Auto-save debounce timer
  const saveTimerRef = useRef<NodeJS.Timeout | null>(null)
  const pendingChangesRef = useRef<Partial<ProjectSchemaV2> | null>(null)

  // Load projects when user logs in
  useEffect(() => {
    if (user) {
      loadProjects()
      // Check if user has seen onboarding
      const hasSeenOnboarding = localStorage.getItem(`onboarding_completed_${user.id}`)
      if (!hasSeenOnboarding) {
        setShowOnboarding(true)
      }
    } else {
      setProjects([])
      setCurrentProject(null)
    }
  }, [user])

  // Handle onboarding completion
  const handleOnboardingComplete = () => {
    if (user) {
      localStorage.setItem(`onboarding_completed_${user.id}`, 'true')
    }
    setShowOnboarding(false)
  }

  // Auto-save functionality
  useEffect(() => {
    // Clear any existing timer on unmount
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current)
      }
    }
  }, [])

  // Update module states when project changes
  useEffect(() => {
    if (!currentProject) return
    const updatedStates = updateModuleStates(currentProject)
    if (JSON.stringify(updatedStates) !== JSON.stringify(currentProject.module_states)) {
      setCurrentProject(prev => prev ? { ...prev, module_states: updatedStates } : null)
    }
  }, [
    currentProject?.m1_title_concept, 
    currentProject?.m2_hypothesis, 
    currentProject?.m3_specific_aims, 
    currentProject?.m4_team_mapping, 
    currentProject?.m5_experimental_approach, 
    currentProject?.m6_budget, 
    currentProject?.m7_regulatory, 
    currentProject?.m8_compilation
  ])

  const loadProjects = async () => {
    if (!user) return
    setLoadingProjects(true)
    try {
      const userProjects = await getUserProjects(user.id)
      setProjects(userProjects)
      // Set most recent as current if exists
      if (userProjects.length > 0 && !currentProject) {
        setCurrentProject(userProjects[0])
      }
    } catch (error) {
      console.error('Failed to load projects:', error)
    } finally {
      setLoadingProjects(false)
    }
  }

  // Auto-save with debounce
  const scheduleAutoSave = useCallback((project: ProjectSchemaV2) => {
    if (!user || !project.id) return
    
    pendingChangesRef.current = project

    // Clear existing timer
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current)
    }

    // Schedule new save in 2 seconds
    saveTimerRef.current = setTimeout(async () => {
      if (!pendingChangesRef.current || !user) return
      
      setSaving(true)
      try {
        await updateProjectDB(project.id!, user.id, pendingChangesRef.current)
        setLastSaved(new Date())
        pendingChangesRef.current = null
      } catch (error) {
        console.error('Auto-save failed:', error)
      } finally {
        setSaving(false)
      }
    }, 2000)
  }, [user])

  const handleProjectUpdate = useCallback((updates: Partial<ProjectSchemaV2>) => {
    setCurrentProject(prev => {
      if (!prev) return null
      const updated = { ...prev, ...updates, updated_at: new Date().toISOString() }
      // Schedule auto-save
      scheduleAutoSave(updated)
      return updated
    })
  }, [scheduleAutoSave])

  // Manual save
  const handleManualSave = async () => {
    if (!user || !currentProject?.id) return
    
    setSaving(true)
    try {
      await updateProjectDB(currentProject.id, user.id, currentProject)
      setLastSaved(new Date())
      // Clear any pending auto-save
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current)
      }
      pendingChangesRef.current = null
    } catch (error) {
      console.error('Save failed:', error)
    } finally {
      setSaving(false)
    }
  }

  const reset = () => {
    setCurrentProject(null)
    setMainView('dashboard')
    setActiveNav('dashboard')
  }

  // Handler for when wizard completes
  const handleWizardComplete = async (newProject: ProjectSchemaV2) => {
    if (!user) return
    
    setShowWizard(false)
    setSaving(true)
    
    try {
      // Create project in database
      const created = await createProject(
        user.id,
        newProject.program_type,
        newProject.grant_type || 'Phase I',
        newProject.institute
      )
      
      // Merge wizard data with created project
      const merged = { ...newProject, id: created.id }
      await updateProjectDB(created.id!, user.id, merged)
      
      setCurrentProject(merged)
      setProjects(prev => [merged, ...prev])
      setMainView('editor')
      setLastSaved(new Date())
    } catch (error) {
      console.error('Failed to create project:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleWizardCancel = () => {
    setShowWizard(false)
  }

  const handleStartNew = () => {
    setShowWizard(true)
  }

  const handleContinueDraft = () => {
    if (currentProject) {
      setMainView('editor')
    }
  }

  const handleSelectProject = (project: ProjectSchemaV2) => {
    setCurrentProject(project)
    setMainView('editor')
  }

  const handleNavigate = (nav: NavItem) => {
    setActiveNav(nav)
    switch (nav) {
      case 'dashboard':
        setMainView('dashboard')
        break
      case 'grants':
        if (currentProject) {
          setMainView('editor')
        }
        break
      case 'research':
        setMainView('research-intelligence')
        break
      case 'settings':
        setMainView('settings')
        break
    }
  }

  const handleBackToDashboard = () => {
    // Save before leaving
    if (currentProject?.id && user) {
      handleManualSave()
    }
    setMainView('dashboard')
    setActiveNav('dashboard')
  }

  const handleSignOut = async () => {
    // Save before signing out
    if (currentProject?.id && user) {
      await handleManualSave()
    }
    await signOut()
  }

  // Show loading while checking auth
  if (authLoading) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary-500 mx-auto mb-4" />
          <p className="text-neutral-500">Loading...</p>
        </div>
      </div>
    )
  }

  // Show auth screen if not logged in
  if (!user) {
    return <AuthScreen onSuccess={loadProjects} />
  }

  // Show onboarding for new users
  if (showOnboarding) {
    return (
      <>
        <div className="flex min-h-screen">
          <Sidebar 
            activeNav={activeNav} 
            onNavigate={handleNavigate}
            onReset={currentProject ? reset : undefined}
            onSignOut={handleSignOut}
            userEmail={user.email}
          />
          <Dashboard
            onStartNew={handleStartNew}
            onContinueDraft={handleContinueDraft}
            onAudit={() => setMainView('audit')}
            onResearchIntel={() => setMainView('research-intelligence')}
            currentProject={currentProject}
            projects={projects}
            onSelectProject={handleSelectProject}
            loading={loadingProjects}
          />
        </div>
        <Onboarding 
          onComplete={handleOnboardingComplete} 
          userName={user.email?.split('@')[0]}
        />
      </>
    )
  }

  // Show wizard if active
  if (showWizard) {
    return <ProjectCreationWizard onComplete={handleWizardComplete} onCancel={handleWizardCancel} />
  }

  // Show audit mode
  if (mainView === 'audit') {
    return <AuditMode onBack={handleBackToDashboard} />
  }

  // Show research intelligence
  if (mainView === 'research-intelligence') {
    return (
      <div className="flex min-h-screen">
        <Sidebar 
          activeNav={activeNav} 
          onNavigate={handleNavigate}
          onReset={reset}
          onSignOut={handleSignOut}
          userEmail={user.email}
        />
        <div className="flex-1">
          <ResearchIntelligence project={currentProject} onBack={handleBackToDashboard} />
        </div>
      </div>
    )
  }

  // Show grant editor
  if (mainView === 'editor' && currentProject) {
    return (
      <GrantEditor
        project={currentProject}
        onUpdate={handleProjectUpdate}
        onBackToDashboard={handleBackToDashboard}
        onSave={handleManualSave}
        saving={saving}
        lastSaved={lastSaved}
      />
    )
  }

  // Show settings
  if (mainView === 'settings') {
    return (
      <div className="flex min-h-screen">
        <Sidebar 
          activeNav={activeNav} 
          onNavigate={handleNavigate}
          onReset={currentProject ? reset : undefined}
          onSignOut={handleSignOut}
          userEmail={user.email}
        />
        <div className="flex-1 bg-neutral-50 p-10">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-3xl font-bold text-neutral-900 mb-2">Settings</h1>
            <p className="text-neutral-500 mb-10">Configure your application preferences</p>
            
            <div className="bg-white rounded-xl border border-neutral-200 p-6 mb-6">
              <h2 className="text-lg font-semibold text-neutral-900 mb-4">Account</h2>
              <div className="flex items-center justify-between py-3 border-b border-neutral-100">
                <div>
                  <p className="font-medium text-neutral-900">Email</p>
                  <p className="text-sm text-neutral-500">{user.email}</p>
                </div>
              </div>
              <div className="pt-4">
                <button
                  onClick={handleSignOut}
                  className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
              </div>
            </div>
            
            <div className="bg-white rounded-xl border border-neutral-200 p-6 mb-6">
              <h2 className="text-lg font-semibold text-neutral-900 mb-4">Notifications</h2>
              <p className="text-sm text-neutral-500">Email and notification preferences will be available in a future update.</p>
            </div>
            
            <div className="bg-white rounded-xl border border-neutral-200 p-6">
              <h2 className="text-lg font-semibold text-neutral-900 mb-4">Application</h2>
              <div className="flex items-center justify-between py-3 border-b border-neutral-100">
                <div>
                  <p className="font-medium text-neutral-900">Version</p>
                  <p className="text-sm text-neutral-500">NIH Grant Validator</p>
                </div>
                <span className="text-sm text-neutral-500">2.0.0</span>
              </div>
              <div className="flex items-center justify-between py-3">
                <div>
                  <p className="font-medium text-neutral-900">Last Updated</p>
                  <p className="text-sm text-neutral-500">Application build date</p>
                </div>
                <span className="text-sm text-neutral-500">February 2026</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Show dashboard (default)
  return (
    <div className="flex min-h-screen">
      <Sidebar 
        activeNav={activeNav} 
        onNavigate={handleNavigate}
        onReset={currentProject ? reset : undefined}
        onSignOut={handleSignOut}
        userEmail={user.email}
      />
      <Dashboard
        onStartNew={handleStartNew}
        onContinueDraft={handleContinueDraft}
        onAudit={() => setMainView('audit')}
        onResearchIntel={() => setMainView('research-intelligence')}
        currentProject={currentProject}
        projects={projects}
        onSelectProject={handleSelectProject}
        loading={loadingProjects}
      />
    </div>
  )
}
