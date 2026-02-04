import { useState } from 'react'
import { Sparkles, Loader2, Lightbulb, FileText, ShieldCheck, X } from 'lucide-react'

const SUPABASE_URL = 'https://dvuhtfzsvcacyrlfettz.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR2dWh0ZnpzdmNhY3lybGZldHR6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk2NDk3OTYsImV4cCI6MjA4NTIyNTc5Nn0.vUtnPXeQrzU0kO0E7qK2qJtZ_RCqnXCEFSa60adHld0'

interface AIState {
  loading: boolean
  suggestion: string | null
  error: string | null
}

async function callAIRefine(action: string, payload: Record<string, unknown>): Promise<{ result?: string; error?: string }> {
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/ai-refine`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      },
      body: JSON.stringify({ action, ...payload })
    })
    const data = await response.json()
    if (data.error) return { error: data.error.message || 'AI request failed' }
    return { result: data.result || data.suggestions?.[0] || data.draft || '' }
  } catch (err) {
    return { error: 'Failed to connect to AI service' }
  }
}

interface TextFieldProps {
  label: string
  value: string
  onChange: (val: string) => void
  required?: boolean
  multiline?: boolean
  placeholder?: string
  fieldId?: string
  moduleContext?: string
  enableAI?: boolean
  rows?: number
  helpText?: string
}

export function TextField({ 
  label, 
  value, 
  onChange, 
  required, 
  multiline, 
  placeholder, 
  fieldId, 
  moduleContext, 
  enableAI = true,
  rows = 4,
  helpText
}: TextFieldProps) {
  const populated = value?.trim().length > 0
  const [aiState, setAiState] = useState<AIState>({ loading: false, suggestion: null, error: null })
  const [showAI, setShowAI] = useState(false)

  const handleGetSuggestion = async () => {
    setAiState({ loading: true, suggestion: null, error: null })
    const { result, error } = await callAIRefine('field_suggest', {
      field_name: fieldId || label,
      current_value: value,
      context: moduleContext || 'NIH SBIR/STTR grant application'
    })
    if (error) {
      setAiState({ loading: false, suggestion: null, error })
    } else {
      setAiState({ loading: false, suggestion: result || null, error: null })
    }
  }

  const handleGenerateDraft = async () => {
    setAiState({ loading: true, suggestion: null, error: null })
    const { result, error } = await callAIRefine('draft_generate', {
      field_name: fieldId || label,
      context: moduleContext || 'NIH SBIR/STTR grant application',
      instructions: placeholder || `Generate content for ${label}`
    })
    if (error) {
      setAiState({ loading: false, suggestion: null, error })
    } else {
      setAiState({ loading: false, suggestion: result || null, error: null })
    }
  }

  const handleComplianceCheck = async () => {
    if (!value?.trim()) return
    setAiState({ loading: true, suggestion: null, error: null })
    const { result, error } = await callAIRefine('compliance_check', {
      field_name: fieldId || label,
      content: value,
      context: moduleContext || 'NIH SBIR/STTR grant application'
    })
    if (error) {
      setAiState({ loading: false, suggestion: null, error })
    } else {
      setAiState({ loading: false, suggestion: result || null, error: null })
    }
  }

  const acceptSuggestion = () => {
    if (aiState.suggestion) {
      onChange(aiState.suggestion)
      setAiState({ loading: false, suggestion: null, error: null })
      setShowAI(false)
    }
  }

  return (
    <div className="mb-5">
      <div className="flex items-center justify-between mb-1.5">
        <label className="block text-sm font-medium text-neutral-700">
          {label} {required && <span className="text-semantic-error">*</span>}
          {populated && <span className="ml-2 text-xs text-semantic-success">(completed)</span>}
        </label>
        {enableAI && (
          <button
            onClick={() => setShowAI(!showAI)}
            className={`flex items-center gap-1 text-xs px-2 py-1 rounded-md transition-all ${showAI ? 'bg-violet-100 text-violet-700' : 'text-neutral-500 hover:bg-neutral-100'}`}
          >
            <Sparkles className="w-3 h-3" /> AI Assist
          </button>
        )}
      </div>
      
      {helpText && (
        <p className="text-xs text-neutral-500 mb-2">{helpText}</p>
      )}
      
      {showAI && (
        <div className="mb-2 p-3 bg-gradient-to-r from-violet-50 to-indigo-50 border border-violet-200 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <button
              onClick={handleGetSuggestion}
              disabled={aiState.loading}
              className="flex items-center gap-1 text-xs px-2 py-1 bg-white border border-violet-200 rounded hover:bg-violet-50 disabled:opacity-50"
            >
              {aiState.loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Lightbulb className="w-3 h-3" />}
              Suggest
            </button>
            {multiline && (
              <button
                onClick={handleGenerateDraft}
                disabled={aiState.loading}
                className="flex items-center gap-1 text-xs px-2 py-1 bg-white border border-violet-200 rounded hover:bg-violet-50 disabled:opacity-50"
              >
                {aiState.loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <FileText className="w-3 h-3" />}
                Draft
              </button>
            )}
            <button
              onClick={handleComplianceCheck}
              disabled={aiState.loading || !value?.trim()}
              className="flex items-center gap-1 text-xs px-2 py-1 bg-white border border-green-200 rounded hover:bg-green-50 disabled:opacity-50"
            >
              {aiState.loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <ShieldCheck className="w-3 h-3 text-green-600" />}
              Check
            </button>
            <button onClick={() => setShowAI(false)} className="ml-auto text-neutral-400 hover:text-neutral-600">
              <X className="w-4 h-4" />
            </button>
          </div>
          {aiState.error && (
            <p className="text-xs text-red-600 mb-2">{aiState.error}</p>
          )}
          {aiState.suggestion && (
            <div className="mt-2">
              <p className="text-xs text-neutral-600 mb-1">AI Suggestion:</p>
              <div className="p-2 bg-white rounded border border-violet-100 text-sm text-neutral-800 max-h-32 overflow-y-auto">
                {aiState.suggestion}
              </div>
              <div className="flex gap-2 mt-2">
                <button onClick={acceptSuggestion} className="text-xs px-3 py-1 bg-violet-600 text-white rounded hover:bg-violet-700">
                  Accept
                </button>
                <button onClick={() => setAiState({ ...aiState, suggestion: null })} className="text-xs px-3 py-1 bg-neutral-200 text-neutral-700 rounded hover:bg-neutral-300">
                  Dismiss
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {multiline ? (
        <textarea
          value={value || ''}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          rows={rows}
          className="w-full px-3 py-2.5 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-y text-neutral-900 placeholder:text-neutral-400"
        />
      ) : (
        <input
          type="text"
          value={value || ''}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full px-3 py-2.5 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-neutral-900 placeholder:text-neutral-400"
        />
      )}
    </div>
  )
}

interface NumberFieldProps {
  label: string
  value: number
  onChange: (val: number) => void
  required?: boolean
  prefix?: string
  suffix?: string
  max?: number
  min?: number
  helpText?: string
}

export function NumberField({ label, value, onChange, required, prefix, suffix, max, min, helpText }: NumberFieldProps) {
  return (
    <div className="mb-5">
      <label className="block text-sm font-medium text-neutral-700 mb-1.5">
        {label} {required && <span className="text-semantic-error">*</span>}
        {max && <span className="text-xs text-neutral-500 ml-2">(max: ${max.toLocaleString()})</span>}
      </label>
      {helpText && (
        <p className="text-xs text-neutral-500 mb-2">{helpText}</p>
      )}
      <div className="flex items-center">
        {prefix && <span className="text-neutral-500 mr-2">{prefix}</span>}
        <input
          type="number"
          value={value || 0}
          onChange={e => onChange(parseFloat(e.target.value) || 0)}
          min={min}
          max={max}
          className="w-full px-3 py-2.5 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-neutral-900"
        />
        {suffix && <span className="text-neutral-500 ml-2">{suffix}</span>}
      </div>
    </div>
  )
}

interface SelectFieldProps {
  label: string
  value: string
  onChange: (val: string) => void
  options: { value: string; label: string }[]
  required?: boolean
  helpText?: string
  placeholder?: string
}

export function SelectField({ label, value, onChange, options, required, helpText, placeholder }: SelectFieldProps) {
  return (
    <div className="mb-5">
      <label className="block text-sm font-medium text-neutral-700 mb-1.5">
        {label} {required && <span className="text-semantic-error">*</span>}
      </label>
      {helpText && (
        <p className="text-xs text-neutral-500 mb-2">{helpText}</p>
      )}
      <select
        value={value || ''}
        onChange={e => onChange(e.target.value)}
        className="w-full px-3 py-2.5 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-neutral-900 bg-white"
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map(opt => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </div>
  )
}

interface CheckboxFieldProps {
  label: string
  checked: boolean
  onChange: (checked: boolean) => void
  helpText?: string
}

export function CheckboxField({ label, checked, onChange, helpText }: CheckboxFieldProps) {
  return (
    <div className="mb-4">
      <label className="flex items-start gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={checked || false}
          onChange={e => onChange(e.target.checked)}
          className="w-5 h-5 rounded border-neutral-300 text-primary-500 focus:ring-primary-500 mt-0.5"
        />
        <div>
          <span className="text-sm font-medium text-neutral-700">{label}</span>
          {helpText && <p className="text-xs text-neutral-500 mt-0.5">{helpText}</p>}
        </div>
      </label>
    </div>
  )
}
