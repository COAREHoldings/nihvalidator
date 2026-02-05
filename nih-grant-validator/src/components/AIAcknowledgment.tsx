import { useState, useEffect, ReactNode } from 'react'
import { Sparkles } from 'lucide-react'

const STORAGE_KEY = 'ai_drafting_acknowledged'

interface AIAcknowledgmentProps {
  children: ReactNode
}

/**
 * Wrapper component that shows a one-time acknowledgment modal
 * before allowing access to AI features. Uses localStorage to
 * remember the user's acknowledgment.
 */
export function AIAcknowledgment({ children }: AIAcknowledgmentProps) {
  const [acknowledged, setAcknowledged] = useState<boolean | null>(null)

  useEffect(() => {
    const value = localStorage.getItem(STORAGE_KEY)
    setAcknowledged(!!value)
  }, [])

  const handleAcknowledge = () => {
    localStorage.setItem(STORAGE_KEY, 'true')
    setAcknowledged(true)
  }

  // Still loading from localStorage
  if (acknowledged === null) {
    return null
  }

  // Already acknowledged - render children directly
  if (acknowledged) {
    return <>{children}</>
  }

  // Show the modal
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 text-center">
        <div className="w-16 h-16 bg-gradient-to-br from-violet-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <Sparkles className="w-8 h-8 text-white" />
        </div>
        
        <h2 className="text-2xl font-bold text-neutral-900 mb-3">
          AI-Assisted Drafting
        </h2>
        
        <p className="text-neutral-600 mb-8">
          This tool generates drafts to accelerate your grant writing. 
          As the investigator, you are responsible for reviewing and 
          finalizing all content before submission.
        </p>
        
        <button
          onClick={handleAcknowledge}
          className="w-full py-3 px-6 bg-gradient-to-r from-violet-500 to-purple-600 text-white font-semibold rounded-xl hover:from-violet-600 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl"
        >
          Got it
        </button>
      </div>
    </div>
  )
}

/**
 * Hook to check if user has acknowledged AI drafting disclaimer
 */
export function useAIAcknowledged(): boolean {
  const [acknowledged, setAcknowledged] = useState(true)

  useEffect(() => {
    const value = localStorage.getItem(STORAGE_KEY)
    setAcknowledged(!!value)
  }, [])

  return acknowledged
}

export default AIAcknowledgment
