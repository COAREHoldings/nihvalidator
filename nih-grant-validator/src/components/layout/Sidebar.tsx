import { useState } from 'react'
import { Home, FileText, FlaskConical, Settings, LogOut, User, Menu, X } from 'lucide-react'

interface SidebarProps {
  activeNav: 'dashboard' | 'grants' | 'research' | 'settings'
  onNavigate: (nav: 'dashboard' | 'grants' | 'research' | 'settings') => void
  onReset?: () => void
  onSignOut?: () => void
  userEmail?: string | null
}

export function Sidebar({ activeNav, onNavigate, onReset, onSignOut, userEmail }: SidebarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const navItems = [
    { id: 'dashboard' as const, label: 'Dashboard', icon: Home },
    { id: 'grants' as const, label: 'My Grants', icon: FileText },
    { id: 'research' as const, label: 'Research Tools', icon: FlaskConical },
    { id: 'settings' as const, label: 'Settings', icon: Settings },
  ]

  const handleNavClick = (nav: typeof navItems[0]['id']) => {
    onNavigate(nav)
    setMobileMenuOpen(false)
  }

  const SidebarContent = () => (
    <>
      {/* Logo */}
      <div className="p-5 border-b border-neutral-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary-500 rounded-xl flex items-center justify-center">
            <span className="text-white font-bold text-sm">NIH</span>
          </div>
          <div>
            <span className="font-semibold text-neutral-900 block text-sm">Grant Validator</span>
            <span className="text-xs text-neutral-500">SBIR/STTR Assistant</span>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1">
        {navItems.map(item => (
          <button
            key={item.id}
            onClick={() => handleNavClick(item.id)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
              activeNav === item.id
                ? 'bg-primary-50 text-primary-700 shadow-sm'
                : 'text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900'
            }`}
          >
            <item.icon className={`w-5 h-5 ${activeNav === item.id ? 'text-primary-600' : 'text-neutral-400'}`} />
            {item.label}
          </button>
        ))}
      </nav>

      {/* User Section & Footer */}
      <div className="p-3 border-t border-neutral-100 space-y-2">
        {/* User Info */}
        {userEmail && (
          <div className="px-4 py-3 bg-neutral-50 rounded-xl">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                <User className="w-4 h-4 text-primary-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-neutral-500">Signed in as</p>
                <p className="text-sm font-medium text-neutral-900 truncate">{userEmail}</p>
              </div>
            </div>
          </div>
        )}

        {/* Sign Out */}
        {onSignOut && (
          <button
            onClick={onSignOut}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900 transition-colors"
          >
            <LogOut className="w-5 h-5 text-neutral-400" />
            Sign Out
          </button>
        )}

        {/* Reset (only show if no sign out option) */}
        {onReset && !onSignOut && (
          <button
            onClick={onReset}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
          >
            <LogOut className="w-5 h-5" />
            Reset Application
          </button>
        )}
      </div>
    </>
  )

  return (
    <>
      {/* Mobile Menu Button - Fixed at top */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 bg-white border-b border-neutral-200 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-primary-500 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-xs">NIH</span>
          </div>
          <span className="font-semibold text-neutral-900 text-sm">Grant Validator</span>
        </div>
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 rounded-lg hover:bg-neutral-100 transition-colors"
          aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
        >
          {mobileMenuOpen ? (
            <X className="w-6 h-6 text-neutral-600" />
          ) : (
            <Menu className="w-6 h-6 text-neutral-600" />
          )}
        </button>
      </div>

      {/* Mobile Spacer */}
      <div className="md:hidden h-14" />

      {/* Mobile Overlay */}
      {mobileMenuOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Mobile Drawer */}
      <aside
        className={`md:hidden fixed top-14 left-0 bottom-0 w-72 bg-white z-50 transform transition-transform duration-300 ease-in-out flex flex-col ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <SidebarContent />
      </aside>

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-60 min-h-screen bg-white border-r border-neutral-200 flex-col sticky top-0">
        <SidebarContent />
      </aside>
    </>
  )
}
