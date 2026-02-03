import { useState, useCallback, useRef, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
import { 
  Upload, FileText, CheckCircle, XCircle, AlertTriangle, 
  Download, Sparkles, ChevronDown, ChevronUp, ArrowLeft,
  FileCheck, AlertCircle, Info, Users, DollarSign, Briefcase, 
  ClipboardList, Loader2, Plus, Trash2, File as FileIcon, Type, X, Clock,
  Eye, FileUp, Layers, Home
} from 'lucide-react'
import * as pdfjsLib from 'pdfjs-dist'
import mammoth from 'mammoth'

pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://dvuhtfzsvcacyrlfettz.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR2dWh0ZnpzdmNhY3lybGZldHR6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk2NDk3OTYsImV4cCI6MjA4NTIyNTc5Nn0.vUtnPXeQrzU0kO0E7qK2qJtZ_RCqnXCEFSa60adHld0'
const supabase = createClient(supabaseUrl, supabaseAnonKey)

type Mechanism = 'Phase I' | 'Phase II' | 'Direct-to-Phase II' | 'Fast Track' | 'Phase IIB'
type DocumentType = 'specific_aims' | 'research_strategy' | 'budget' | 'commercialization_plan' | 'biosketches' | 'letters_of_support' | 'milestones'

interface UploadedFile {
  id: string
  file: File
  fileName: string
  content: string
  pageCount?: number
  audit?: DocumentAuditResult
  isAuditing?: boolean
}

interface DocumentAuditResult {
  score: number
  strengths: string[]
  weaknesses: string[]
  suggestions: string[]
  [key: string]: unknown
}

interface DocumentCategory {
  type: DocumentType
  label: string
  description: string
  required: Mechanism[]
  recommended: Mechanism[]
  multiFile: boolean
  maxFiles: number
  files: UploadedFile[]
  inputMode: 'upload' | 'paste'
  pastedText: string
}

interface PackageAuditResult {
  success: boolean
  mechanism: string
  audit: {
    overallScores: {
      structural: number
      scientific: number
      budget: number
      commercialization: number
      consistency: number
      weighted_total: number
    }
    reviewerSimulation: {
      scientific: { overallImpression: string; strengths: string[]; weaknesses: string[]; score: number; recommendedScore: string }
      commercialization: { overallImpression: string; strengths: string[]; weaknesses: string[]; score: number }
      budget: { overallImpression: string; concerns: string[]; recommendations: string[] }
    }
    validationResults: Record<string, { score: number; findings: { issue: string; severity: string; location: string }[] }>
    conditionalDetection: Record<string, { detected: boolean; details: string }>
  }
  administrativeCompliance?: {
    documents: Record<string, { actualPages: number | null; estimatedPages: number; pageLimit: number; status: 'pass' | 'warning' | 'fail'; issues: string[]; isActualCount: boolean }>
    summary: { pass: number; warning: number; fail: number }
    formatReminders: string[]
    agencyAlerts: string[]
  }
  suggestions?: {
    prioritized_improvements: { priority: number; area: string; issue: string; suggestion: string; impact: string }[]
    quick_wins: string[]
    major_revisions: string[]
    reviewer_tips: string[]
  }
}

const INSTITUTES = [
  { value: '', label: 'Select Institute (Optional)' },
  { value: 'NCI', label: 'NCI - National Cancer Institute' },
  { value: 'NIAID', label: 'NIAID - Allergy and Infectious Diseases' },
  { value: 'NHLBI', label: 'NHLBI - Heart, Lung, and Blood' },
  { value: 'NINDS', label: 'NINDS - Neurological Disorders' },
  { value: 'NIDDK', label: 'NIDDK - Diabetes and Digestive' },
  { value: 'NIA', label: 'NIA - Aging' },
  { value: 'NIMH', label: 'NIMH - Mental Health' },
  { value: 'NIGMS', label: 'NIGMS - General Medical Sciences' },
]

const MECHANISMS: { value: Mechanism; label: string; description: string }[] = [
  { value: 'Phase I', label: 'Phase I', description: 'Feasibility study (up to $275K)' },
  { value: 'Phase II', label: 'Phase II', description: 'Full R&D (up to $1.75M)' },
  { value: 'Direct-to-Phase II', label: 'Direct-to-Phase II', description: 'Skip Phase I with feasibility data' },
  { value: 'Fast Track', label: 'Fast Track', description: 'Combined Phase I + II' },
  { value: 'Phase IIB', label: 'Phase IIB', description: 'Bridge funding for commercialization' },
]

const createInitialCategories = (): DocumentCategory[] => [
  { type: 'specific_aims', label: 'Specific Aims', description: '1-page summary of aims and goals', required: ['Phase I', 'Phase II', 'Direct-to-Phase II', 'Fast Track', 'Phase IIB'], recommended: [], multiFile: false, maxFiles: 1, files: [], inputMode: 'upload', pastedText: '' },
  { type: 'research_strategy', label: 'Research Strategy', description: 'Significance, Innovation, Approach sections', required: ['Phase I', 'Phase II', 'Direct-to-Phase II', 'Fast Track', 'Phase IIB'], recommended: [], multiFile: false, maxFiles: 1, files: [], inputMode: 'upload', pastedText: '' },
  { type: 'budget', label: 'Budget', description: 'Detailed budget and justification', required: ['Phase II', 'Direct-to-Phase II', 'Fast Track', 'Phase IIB'], recommended: ['Phase I'], multiFile: false, maxFiles: 1, files: [], inputMode: 'upload', pastedText: '' },
  { type: 'commercialization_plan', label: 'Commercialization Plan', description: 'NIH 12-page commercialization plan', required: ['Phase II', 'Direct-to-Phase II', 'Fast Track', 'Phase IIB'], recommended: [], multiFile: false, maxFiles: 1, files: [], inputMode: 'upload', pastedText: '' },
  { type: 'biosketches', label: 'Biosketches', description: 'Key personnel biosketches (PI, Co-I, etc.)', required: [], recommended: ['Phase I', 'Phase II', 'Direct-to-Phase II', 'Fast Track', 'Phase IIB'], multiFile: true, maxFiles: 10, files: [], inputMode: 'upload', pastedText: '' },
  { type: 'letters_of_support', label: 'Letters of Support', description: 'Collaborator and partner letters', required: [], recommended: ['Phase I', 'Phase II', 'Direct-to-Phase II', 'Fast Track', 'Phase IIB'], multiFile: true, maxFiles: 15, files: [], inputMode: 'upload', pastedText: '' },
  { type: 'milestones', label: 'Milestones', description: 'Project milestones and timeline', required: ['Fast Track'], recommended: ['Phase II', 'Direct-to-Phase II', 'Phase IIB'], multiFile: false, maxFiles: 1, files: [], inputMode: 'upload', pastedText: '' },
]

interface AuditModeProps {
  onBack: () => void
}

export function AuditMode({ onBack }: AuditModeProps) {
  const [mechanism, setMechanism] = useState<Mechanism | null>(null)
  const [institute, setInstitute] = useState('')
  const [categories, setCategories] = useState<DocumentCategory[]>(createInitialCategories())
  const [isProcessing, setIsProcessing] = useState(false)
  const [packageAudit, setPackageAudit] = useState<PackageAuditResult | null>(null)
  const [activeTab, setActiveTab] = useState<'individual' | 'package' | 'compliance'>('individual')
  const [expandedDocs, setExpandedDocs] = useState<Set<string>>(new Set())
  const [parsingFile, setParsingFile] = useState<string | null>(null)
  const [generatingSuggestions, setGeneratingSuggestions] = useState(false)
  const extractionCancelledRef = useRef(false)
  const [extractionTimedOut, setExtractionTimedOut] = useState(false)
  const [extractionProgress, setExtractionProgress] = useState({ currentPage: 0, totalPages: 0, elapsedTime: 0 })
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  
  // Full Grant Upload States
  const [uploadMode, setUploadMode] = useState<'full' | 'sections'>('full')
  const [fullGrantDoc, setFullGrantDoc] = useState<{ fileName: string; content: string; pageCount?: number } | null>(null)
  const [showDocViewer, setShowDocViewer] = useState(false)
  const [fullGrantAudit, setFullGrantAudit] = useState<PackageAuditResult | null>(null)
  const [isAuditingFullGrant, setIsAuditingFullGrant] = useState(false)

  // Timer effect for extraction progress
  useEffect(() => {
    if (parsingFile) {
      setExtractionProgress(p => ({ ...p, elapsedTime: 0 }))
      timerRef.current = setInterval(() => {
        setExtractionProgress(p => ({ ...p, elapsedTime: p.elapsedTime + 1 }))
      }, 1000)
    } else {
      if (timerRef.current) clearInterval(timerRef.current)
      setExtractionProgress({ currentPage: 0, totalPages: 0, elapsedTime: 0 })
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [parsingFile])

  const setInputMode = (categoryType: DocumentType, mode: 'upload' | 'paste') => {
    setCategories(prev => prev.map(cat => 
      cat.type === categoryType ? { ...cat, inputMode: mode } : cat
    ))
  }

  const setPastedText = (categoryType: DocumentType, text: string) => {
    setCategories(prev => prev.map(cat =>
      cat.type === categoryType ? { ...cat, pastedText: text } : cat
    ))
  }

  const addPastedDocument = (categoryType: DocumentType) => {
    const cat = categories.find(c => c.type === categoryType)
    if (!cat || !cat.pastedText.trim()) return
    
    const newFile: UploadedFile = {
      id: `${categoryType}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      file: new File([cat.pastedText], `pasted_${cat.label.toLowerCase().replace(/\s+/g, '_')}.txt`),
      fileName: `Pasted Text (${cat.pastedText.length.toLocaleString()} chars)`,
      content: cat.pastedText
    }

    setCategories(prev => prev.map(c => {
      if (c.type !== categoryType) return c
      if (c.multiFile) {
        if (c.files.length >= c.maxFiles) return c
        return { ...c, files: [...c.files, newFile], pastedText: '' }
      } else {
        return { ...c, files: [newFile], pastedText: '' }
      }
    }))
  }

  const cancelExtraction = () => {
    extractionCancelledRef.current = true
    setParsingFile(null)
  }

  const extractTextFromPDF = async (file: File): Promise<{ text: string; pageCount: number }> => {
    const arrayBuffer = await file.arrayBuffer()
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
    let fullText = ''
    const actualPageCount = pdf.numPages
    const maxPages = Math.min(actualPageCount, 50)
    setExtractionProgress(p => ({ ...p, totalPages: maxPages, currentPage: 0 }))
    for (let i = 1; i <= maxPages; i++) {
      if (extractionCancelledRef.current) throw new Error('cancelled')
      setExtractionProgress(p => ({ ...p, currentPage: i }))
      const page = await pdf.getPage(i)
      const textContent = await page.getTextContent()
      const pageText = textContent.items.map((item) => ('str' in item ? item.str : '')).join(' ')
      fullText += pageText + '\n\n'
    }
    return { text: fullText.trim(), pageCount: actualPageCount }
  }

  const extractTextFromDOCX = async (file: File): Promise<string> => {
    const arrayBuffer = await file.arrayBuffer()
    const result = await mammoth.extractRawText({ arrayBuffer })
    return result.value
  }

  const handleFileUpload = useCallback(async (categoryType: DocumentType, file: File) => {
    // Check file size (warn if > 5MB)
    if (file.size > 5 * 1024 * 1024) {
      if (!confirm(`${file.name} is ${(file.size / 1024 / 1024).toFixed(1)}MB. Large files may take longer to process. Continue?`)) {
        return
      }
    }

    extractionCancelledRef.current = false
    setExtractionTimedOut(false)
    setParsingFile(file.name)
    
    try {
      let content = ''
      let pageCount: number | undefined = undefined
      
      // Create timeout promise
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('timeout')), 30000)
      })
      
      const extractionPromise = (async () => {
        if (file.name.toLowerCase().endsWith('.pdf')) {
          const result = await extractTextFromPDF(file)
          return { text: result.text, pageCount: result.pageCount }
        } else if (file.name.toLowerCase().endsWith('.docx')) {
          return { text: await extractTextFromDOCX(file), pageCount: undefined }
        } else {
          return { text: await file.text(), pageCount: undefined }
        }
      })()
      
      const result = await Promise.race([extractionPromise, timeoutPromise])
      content = result.text
      pageCount = result.pageCount

      if (extractionCancelledRef.current) return

      if (!content || content.trim().length === 0) {
        alert(`Could not extract text from ${file.name}. Try pasting text instead.`)
        setInputMode(categoryType, 'paste')
        return
      }

      const newFile: UploadedFile = {
        id: `${categoryType}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        file,
        fileName: file.name,
        content,
        pageCount
      }

      setCategories(prev => prev.map(cat => {
        if (cat.type !== categoryType) return cat
        if (cat.multiFile) {
          if (cat.files.length >= cat.maxFiles) {
            alert(`Maximum ${cat.maxFiles} files allowed for ${cat.label}`)
            return cat
          }
          return { ...cat, files: [...cat.files, newFile] }
        } else {
          return { ...cat, files: [newFile] }
        }
      }))
    } catch (error: any) {
      if (error?.message === 'cancelled') return
      if (error?.message === 'timeout') {
        setExtractionTimedOut(true)
        setInputMode(categoryType, 'paste')
        alert('Extraction timed out (30s). Please paste your text manually.')
        return
      }
      console.error('Error parsing file:', error)
      alert(`Error parsing ${file.name}. Try pasting text instead.`)
      setInputMode(categoryType, 'paste')
    } finally {
      setParsingFile(null)
    }
  }, [])

  const handleMultipleFileUpload = useCallback(async (categoryType: DocumentType, files: FileList) => {
    const fileArray = Array.from(files)
    for (const file of fileArray) {
      await handleFileUpload(categoryType, file)
    }
  }, [handleFileUpload])

  const removeFile = useCallback((categoryType: DocumentType, fileId: string) => {
    setCategories(prev => prev.map(cat => {
      if (cat.type !== categoryType) return cat
      return { ...cat, files: cat.files.filter(f => f.id !== fileId) }
    }))
  }, [])

  const auditSingleDocument = async (categoryType: DocumentType, fileId: string) => {
    const category = categories.find(c => c.type === categoryType)
    const file = category?.files.find(f => f.id === fileId)
    if (!file || !mechanism) return

    setCategories(prev => prev.map(cat => {
      if (cat.type !== categoryType) return cat
      return {
        ...cat,
        files: cat.files.map(f => f.id === fileId ? { ...f, isAuditing: true } : f)
      }
    }))

    try {
      const { data, error } = await supabase.functions.invoke('audit-document', {
        body: { documentType: categoryType, documentContent: file.content, fileName: file.fileName, mechanism }
      })

      if (error) throw error

      setCategories(prev => prev.map(cat => {
        if (cat.type !== categoryType) return cat
        return {
          ...cat,
          files: cat.files.map(f => f.id === fileId ? { ...f, audit: data.audit, isAuditing: false } : f)
        }
      }))
    } catch (err) {
      console.error('Audit error:', err)
      setCategories(prev => prev.map(cat => {
        if (cat.type !== categoryType) return cat
        return {
          ...cat,
          files: cat.files.map(f => f.id === fileId ? { ...f, isAuditing: false } : f)
        }
      }))
    }
  }

  const runFullAudit = async () => {
    if (!mechanism) return
    setIsProcessing(true)

    // First, audit all individual documents that haven't been audited
    for (const category of categories) {
      for (const file of category.files) {
        if (!file.audit) {
          await auditSingleDocument(category.type, file.id)
        }
      }
    }

    // Then run package-level audit
    try {
      const documentsObj: Record<string, string> = {}
      const pageCountsObj: Record<string, number> = {}
      categories.forEach(cat => {
        if (cat.files.length > 0) {
          if (cat.multiFile) {
            documentsObj[cat.type] = cat.files.map((f, i) => `[${f.fileName}]\n${f.content}`).join('\n\n---\n\n')
            // Sum page counts for multi-file categories
            const totalPages = cat.files.reduce((sum, f) => sum + (f.pageCount || 0), 0)
            if (totalPages > 0) pageCountsObj[cat.type] = totalPages
          } else {
            documentsObj[cat.type] = cat.files[0].content
            if (cat.files[0].pageCount) pageCountsObj[cat.type] = cat.files[0].pageCount
          }
        }
      })

      const { data, error } = await supabase.functions.invoke('audit-grant', {
        body: { documents: documentsObj, pageCounts: pageCountsObj, mechanism, institute, generateSuggestions: false }
      })

      if (error) throw error
      setPackageAudit(data)
      setActiveTab('package')
    } catch (err) {
      console.error('Package audit error:', err)
    } finally {
      setIsProcessing(false)
    }
  }

  const generateSuggestions = async () => {
    if (!mechanism) return
    setGeneratingSuggestions(true)

    try {
      const documentsObj: Record<string, string> = {}
      const pageCountsObj: Record<string, number> = {}
      categories.forEach(cat => {
        if (cat.files.length > 0) {
          if (cat.multiFile) {
            documentsObj[cat.type] = cat.files.map(f => `[${f.fileName}]\n${f.content}`).join('\n\n---\n\n')
            const totalPages = cat.files.reduce((sum, f) => sum + (f.pageCount || 0), 0)
            if (totalPages > 0) pageCountsObj[cat.type] = totalPages
          } else {
            documentsObj[cat.type] = cat.files[0].content
            if (cat.files[0].pageCount) pageCountsObj[cat.type] = cat.files[0].pageCount
          }
        }
      })

      const { data, error } = await supabase.functions.invoke('audit-grant', {
        body: { documents: documentsObj, pageCounts: pageCountsObj, mechanism, institute, generateSuggestions: true }
      })

      if (error) throw error
      setPackageAudit(data)
    } catch (err) {
      console.error('Suggestions error:', err)
    } finally {
      setGeneratingSuggestions(false)
    }
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600'
    if (score >= 60) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getScoreBg = (score: number) => {
    if (score >= 80) return 'bg-green-500'
    if (score >= 60) return 'bg-yellow-500'
    return 'bg-red-500'
  }

  const totalFiles = categories.reduce((sum, cat) => sum + cat.files.length, 0)
  const auditedFiles = categories.reduce((sum, cat) => sum + cat.files.filter(f => f.audit).length, 0)

  const toggleDocExpand = (id: string) => {
    setExpandedDocs(prev => {
      const newSet = new Set(prev)
      if (newSet.has(id)) newSet.delete(id)
      else newSet.add(id)
      return newSet
    })
  }

  const exportReport = () => {
    if (!packageAudit) return
    let report = `NIH SBIR/STTR GRANT AUDIT REPORT\n${'='.repeat(40)}\nMechanism: ${packageAudit.mechanism}\nGenerated: ${new Date().toLocaleString()}\n\n`
    
    report += `INDIVIDUAL DOCUMENT AUDITS\n${'-'.repeat(30)}\n`
    categories.forEach(cat => {
      if (cat.files.length === 0) return
      report += `\n${cat.label.toUpperCase()}\n`
      cat.files.forEach(f => {
        if (f.audit) {
          report += `  ${f.fileName}: ${f.audit.score}/100\n`
          if (f.audit.strengths?.length) report += `    Strengths: ${f.audit.strengths.join('; ')}\n`
          if (f.audit.weaknesses?.length) report += `    Weaknesses: ${f.audit.weaknesses.join('; ')}\n`
        }
      })
    })

    report += `\nPACKAGE AUDIT\n${'-'.repeat(30)}\n`
    report += `Weighted Total: ${packageAudit.audit.overallScores.weighted_total}/100\n`
    report += `  Structural: ${packageAudit.audit.overallScores.structural}/100\n`
    report += `  Scientific: ${packageAudit.audit.overallScores.scientific}/100\n`
    report += `  Budget: ${packageAudit.audit.overallScores.budget}/100\n`
    report += `  Commercialization: ${packageAudit.audit.overallScores.commercialization}/100\n`
    report += `  Consistency: ${packageAudit.audit.overallScores.consistency}/100\n`

    const blob = new Blob([report], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `nih-audit-${mechanism?.replace(/\s+/g, '-').toLowerCase()}-${Date.now()}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  const resetAudit = () => {
    setCategories(createInitialCategories())
    setPackageAudit(null)
    setMechanism(null)
    setActiveTab('individual')
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      <header className="sticky top-0 z-50 bg-white border-b border-neutral-200 h-16 flex items-center px-4 md:px-6">
        {/* Home Button */}
        <button 
          onClick={onBack} 
          className="flex items-center gap-2 text-neutral-900 hover:text-primary-600 transition-colors mr-4"
        >
          <Home className="w-5 h-5" />
          <span className="font-semibold hidden sm:inline">NIH Validator</span>
        </button>

        {/* Navigation Tabs */}
        <nav className="flex items-center gap-1 md:gap-2">
          <button
            onClick={onBack}
            className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-neutral-600 hover:bg-neutral-100 rounded-lg"
          >
            <ClipboardList className="w-4 h-4" />
            <span className="hidden sm:inline">Build Mode</span>
          </button>
          <span className="text-neutral-300">|</span>
          <span className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium bg-indigo-100 text-indigo-700 rounded-lg">
            <FileCheck className="w-4 h-4" />
            <span className="hidden sm:inline">Audit Mode</span>
          </span>
        </nav>

        <div className="ml-auto">
          <span className="px-3 py-1 bg-amber-100 text-amber-800 text-xs font-medium rounded-full">
            Advisory Pre-Submission Audit
          </span>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-amber-800">Advisory Pre-Submission Audit - Not an NIH Official Review</p>
            <p className="text-sm text-amber-700 mt-1">This tool provides guidance for grant improvement. Results do not guarantee funding outcomes.</p>
          </div>
        </div>

        {!packageAudit ? (
          <div className="space-y-6">
            {/* Mechanism Selection */}
            <div className="bg-white rounded-lg shadow-sm border border-neutral-200 p-6">
              <h2 className="text-lg font-semibold text-neutral-900 mb-4 flex items-center gap-2">
                <span className="w-6 h-6 bg-primary-500 text-white rounded-full text-sm flex items-center justify-center">1</span>
                Select Grant Mechanism
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {MECHANISMS.map(m => (
                  <button
                    key={m.value}
                    onClick={() => setMechanism(m.value)}
                    className={`p-4 rounded-lg border text-left transition-all ${
                      mechanism === m.value
                        ? 'border-primary-500 bg-primary-50 ring-2 ring-primary-200'
                        : 'border-neutral-200 hover:border-primary-300 hover:bg-neutral-50'
                    }`}
                  >
                    <p className="font-medium text-neutral-900">{m.label}</p>
                    <p className="text-sm text-neutral-500 mt-1">{m.description}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Institute Selection (Optional) */}
            {mechanism && (
              <div className="bg-white rounded-lg shadow-sm border border-neutral-200 p-6">
                <h2 className="text-lg font-semibold text-neutral-900 mb-4 flex items-center gap-2">
                  <span className="w-6 h-6 bg-neutral-300 text-white rounded-full text-sm flex items-center justify-center">*</span>
                  Target Institute (Optional)
                </h2>
                <select
                  value={institute}
                  onChange={(e) => setInstitute(e.target.value)}
                  className="w-full md:w-1/2 px-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-200 focus:border-primary-400"
                >
                  {INSTITUTES.map(inst => (
                    <option key={inst.value} value={inst.value}>{inst.label}</option>
                  ))}
                </select>
                <p className="text-xs text-neutral-500 mt-2">Some institutes have specific requirements. Select for tailored compliance alerts.</p>
              </div>
            )}

            {/* Document Upload */}
            {mechanism && (
              <div className="bg-white rounded-lg shadow-sm border border-neutral-200 p-6">
                <h2 className="text-lg font-semibold text-neutral-900 mb-4 flex items-center gap-2">
                  <span className="w-6 h-6 bg-primary-500 text-white rounded-full text-sm flex items-center justify-center">2</span>
                  Upload Documents
                </h2>

                {/* Upload Mode Selector */}
                <div className="mb-6 flex gap-3">
                  <button
                    onClick={() => setUploadMode('full')}
                    className={`flex-1 p-4 rounded-lg border-2 text-left transition-all ${
                      uploadMode === 'full'
                        ? 'border-primary-500 bg-primary-50'
                        : 'border-neutral-200 hover:border-neutral-300'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <FileUp className={`w-8 h-8 ${uploadMode === 'full' ? 'text-primary-600' : 'text-neutral-400'}`} />
                      <div>
                        <p className="font-semibold text-neutral-900">Full Grant Upload</p>
                        <p className="text-sm text-neutral-500">Upload your complete grant as one document</p>
                      </div>
                    </div>
                  </button>
                  <button
                    onClick={() => setUploadMode('sections')}
                    className={`flex-1 p-4 rounded-lg border-2 text-left transition-all ${
                      uploadMode === 'sections'
                        ? 'border-primary-500 bg-primary-50'
                        : 'border-neutral-200 hover:border-neutral-300'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Layers className={`w-8 h-8 ${uploadMode === 'sections' ? 'text-primary-600' : 'text-neutral-400'}`} />
                      <div>
                        <p className="font-semibold text-neutral-900">Section by Section</p>
                        <p className="text-sm text-neutral-500">Upload individual grant sections separately</p>
                      </div>
                    </div>
                  </button>
                </div>

                {/* Full Grant Upload Mode */}
                {uploadMode === 'full' && (
                  <div className="space-y-4">
                    {!fullGrantDoc ? (
                      <div className="border-2 border-dashed border-neutral-300 rounded-lg p-8 text-center hover:border-primary-400 transition-colors">
                        <input
                          type="file"
                          id="full-grant-upload"
                          accept=".pdf,.docx,.doc,.txt"
                          className="hidden"
                          onChange={async (e) => {
                            const file = e.target.files?.[0]
                            if (!file) return
                            setParsingFile(file.name)
                            try {
                              let content = ''
                              let pageCount: number | undefined
                              if (file.name.toLowerCase().endsWith('.pdf')) {
                                const result = await extractTextFromPDF(file)
                                content = result.text
                                pageCount = result.pageCount
                              } else if (file.name.toLowerCase().endsWith('.docx') || file.name.toLowerCase().endsWith('.doc')) {
                                content = await extractTextFromDOCX(file)
                              } else {
                                content = await file.text()
                              }
                              setFullGrantDoc({ fileName: file.name, content, pageCount })
                            } catch (err) {
                              console.error('Error parsing file:', err)
                            } finally {
                              setParsingFile(null)
                            }
                          }}
                        />
                        <label htmlFor="full-grant-upload" className="cursor-pointer">
                          <FileUp className="w-12 h-12 text-neutral-400 mx-auto mb-3" />
                          <p className="font-medium text-neutral-700">Drop your complete grant document here</p>
                          <p className="text-sm text-neutral-500 mt-1">Supports PDF, DOCX, DOC, or TXT</p>
                          <button className="mt-4 px-6 py-2 bg-primary-500 text-white font-medium rounded-lg hover:bg-primary-600">
                            Choose File
                          </button>
                        </label>
                      </div>
                    ) : (
                      <div className="border border-green-200 bg-green-50 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <FileText className="w-8 h-8 text-green-600" />
                            <div>
                              <p className="font-medium text-green-800">{fullGrantDoc.fileName}</p>
                              <p className="text-sm text-green-600">
                                {fullGrantDoc.pageCount && `${fullGrantDoc.pageCount} pages • `}
                                {fullGrantDoc.content.length.toLocaleString()} characters extracted
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setShowDocViewer(true)}
                              className="flex items-center gap-2 px-4 py-2 bg-white border border-green-300 text-green-700 rounded-lg hover:bg-green-100"
                            >
                              <Eye className="w-4 h-4" />
                              View Document
                            </button>
                            <button
                              onClick={() => { setFullGrantDoc(null); setFullGrantAudit(null); }}
                              className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {parsingFile && (
                      <div className="flex items-center justify-center gap-3 p-4 bg-blue-50 rounded-lg">
                        <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
                        <span className="text-blue-700">Extracting text from {parsingFile}...</span>
                        {extractionProgress.totalPages > 0 && (
                          <span className="text-blue-600">
                            Page {extractionProgress.currentPage}/{extractionProgress.totalPages}
                          </span>
                        )}
                      </div>
                    )}

                    {fullGrantDoc && !fullGrantAudit && (
                      <button
                        onClick={async () => {
                          if (!fullGrantDoc || !mechanism) return
                          setIsAuditingFullGrant(true)
                          try {
                            const { data, error } = await supabase.functions.invoke('audit-grant', {
                              body: {
                                mechanism,
                                institute: institute || undefined,
                                documents: {
                                  full_grant: fullGrantDoc.content
                                },
                                isFullGrantMode: true
                              }
                            })
                            if (error) throw error
                            setFullGrantAudit(data)
                          } catch (err) {
                            console.error('Audit error:', err)
                          } finally {
                            setIsAuditingFullGrant(false)
                          }
                        }}
                        disabled={isAuditingFullGrant}
                        className="w-full px-6 py-4 bg-primary-500 text-white font-semibold rounded-lg hover:bg-primary-600 disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        {isAuditingFullGrant ? (
                          <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            Analyzing Grant...
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-5 h-5" />
                            Run Full Grant Audit
                          </>
                        )}
                      </button>
                    )}

                    {fullGrantAudit && (
                      <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                        <div className="flex items-center gap-2 mb-4">
                          <CheckCircle className="w-6 h-6 text-green-600" />
                          <h3 className="font-semibold text-green-800">Audit Complete</h3>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
                          <div className="p-3 bg-white rounded-lg text-center">
                            <p className="text-2xl font-bold text-primary-600">{fullGrantAudit.audit?.overallScores?.weighted_total || 0}</p>
                            <p className="text-xs text-neutral-500">Overall</p>
                          </div>
                          <div className="p-3 bg-white rounded-lg text-center">
                            <p className="text-xl font-bold text-blue-600">{fullGrantAudit.audit?.overallScores?.scientific || 0}</p>
                            <p className="text-xs text-neutral-500">Scientific</p>
                          </div>
                          <div className="p-3 bg-white rounded-lg text-center">
                            <p className="text-xl font-bold text-purple-600">{fullGrantAudit.audit?.overallScores?.structural || 0}</p>
                            <p className="text-xs text-neutral-500">Structural</p>
                          </div>
                          <div className="p-3 bg-white rounded-lg text-center">
                            <p className="text-xl font-bold text-green-600">{fullGrantAudit.audit?.overallScores?.budget || 0}</p>
                            <p className="text-xs text-neutral-500">Budget</p>
                          </div>
                          <div className="p-3 bg-white rounded-lg text-center">
                            <p className="text-xl font-bold text-amber-600">{fullGrantAudit.audit?.overallScores?.commercialization || 0}</p>
                            <p className="text-xs text-neutral-500">Commercialization</p>
                          </div>
                        </div>
                        <button
                          onClick={() => setPackageAudit(fullGrantAudit)}
                          className="w-full px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600"
                        >
                          View Detailed Results
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Section by Section Mode - Status Summary */}
                {uploadMode === 'sections' && (
                  <>
                    <div className="mb-6 p-4 bg-neutral-50 rounded-lg">
                  <div className="flex flex-wrap gap-2 mb-3">
                    {categories.map(cat => {
                      const hasFiles = cat.files.length > 0
                      const isRequired = cat.required.includes(mechanism)
                      const isRecommended = cat.recommended.includes(mechanism)
                      let statusClass = 'bg-neutral-100 text-neutral-500 border-neutral-200'
                      if (hasFiles) statusClass = 'bg-green-100 text-green-700 border-green-200'
                      else if (isRequired) statusClass = 'bg-red-100 text-red-700 border-red-200'
                      else if (isRecommended) statusClass = 'bg-yellow-100 text-yellow-700 border-yellow-200'
                      
                      return (
                        <span key={cat.type} className={`px-3 py-1 text-xs font-medium rounded-full border ${statusClass}`}>
                          {hasFiles && <CheckCircle className="w-3 h-3 inline mr-1" />}
                          {!hasFiles && isRequired && <XCircle className="w-3 h-3 inline mr-1" />}
                          {cat.label} {cat.multiFile && cat.files.length > 0 && `(${cat.files.length})`}
                        </span>
                      )
                    })}
                  </div>
                  <div className="flex gap-4 text-xs text-neutral-500">
                    <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-green-500"></span> Present</span>
                    <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-red-500"></span> Required Missing</span>
                    <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-yellow-500"></span> Recommended</span>
                  </div>
                </div>

                <div className="space-y-4">
                  {categories.map(cat => {
                    const isRequired = cat.required.includes(mechanism)
                    const isRecommended = cat.recommended.includes(mechanism)
                    const hasFiles = cat.files.length > 0

                    return (
                      <div key={cat.type} className={`p-4 rounded-lg border ${hasFiles ? 'border-green-200 bg-green-50' : isRequired ? 'border-red-200 bg-red-50' : 'border-neutral-200'}`}>
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <p className="font-medium text-neutral-900 flex items-center gap-2">
                              {cat.label}
                              {isRequired && <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded">Required</span>}
                              {isRecommended && !isRequired && <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded">Recommended</span>}
                              {cat.multiFile && <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">Multiple Files</span>}
                            </p>
                            <p className="text-sm text-neutral-500">{cat.description}</p>
                          </div>
                        </div>

                        {/* Uploaded Files List */}
                        {cat.files.length > 0 && (
                          <div className="mb-3 space-y-2">
                            {cat.files.map(f => (
                              <div key={f.id} className="flex items-center gap-3 p-2 bg-white rounded border border-neutral-200">
                                <FileIcon className="w-4 h-4 text-neutral-400" />
                                <span className="flex-1 text-sm text-neutral-700 truncate">{f.fileName}</span>
                                <span className="text-xs text-neutral-400">{Math.round(f.content.length / 1000)}K</span>
                                {f.audit && (
                                  <span className={`px-2 py-0.5 text-xs font-medium rounded ${getScoreBg(f.audit.score)} text-white`}>
                                    {f.audit.score}
                                  </span>
                                )}
                                {f.isAuditing && <Loader2 className="w-4 h-4 animate-spin text-primary-500" />}
                                {!f.audit && !f.isAuditing && (
                                  <button
                                    onClick={() => auditSingleDocument(cat.type, f.id)}
                                    className="text-xs text-primary-600 hover:text-primary-800"
                                  >
                                    Audit
                                  </button>
                                )}
                                <button onClick={() => removeFile(cat.type, f.id)} className="text-red-400 hover:text-red-600">
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Upload Button */}
                        {(cat.multiFile ? cat.files.length < cat.maxFiles : cat.files.length === 0) && (
                          <div className="space-y-3">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => setInputMode(cat.type, 'upload')}
                                className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg transition-colors ${
                                  cat.inputMode === 'upload' ? 'bg-primary-500 text-white' : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                                }`}
                              >
                                <Upload className="w-3.5 h-3.5" /> Upload File
                              </button>
                              <button
                                onClick={() => setInputMode(cat.type, 'paste')}
                                className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg transition-colors ${
                                  cat.inputMode === 'paste' ? 'bg-primary-500 text-white' : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                                }`}
                              >
                                <Type className="w-3.5 h-3.5" /> Paste Text
                              </button>
                            </div>

                            {cat.inputMode === 'upload' ? (
                              <label className={`flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
                                parsingFile ? 'border-primary-300 bg-primary-50' : 'border-neutral-300 hover:border-primary-400 hover:bg-primary-50'
                              }`}>
                                {parsingFile ? (
                                  <div className="flex flex-col items-center gap-3 py-2 w-full">
                                    {/* Progress bar */}
                                    <div className="w-full">
                                      <div className="h-2 bg-neutral-200 rounded-full overflow-hidden">
                                        <div 
                                          className={`h-full transition-all duration-300 ${
                                            extractionProgress.elapsedTime < 15 ? 'bg-green-500' :
                                            extractionProgress.elapsedTime < 25 ? 'bg-yellow-500' : 'bg-red-500'
                                          }`}
                                          style={{ width: `${Math.min((extractionProgress.elapsedTime / 30) * 100, 100)}%` }}
                                        />
                                      </div>
                                    </div>
                                    {/* Status text */}
                                    <div className="flex items-center gap-2">
                                      <Loader2 className="w-4 h-4 text-primary-500 animate-spin" />
                                      <span className="text-sm text-primary-600">
                                        {extractionProgress.totalPages > 0 
                                          ? `Page ${extractionProgress.currentPage} of ${extractionProgress.totalPages}` 
                                          : `Extracting ${parsingFile}`}
                                      </span>
                                    </div>
                                    {/* Timer */}
                                    <div className={`flex items-center gap-1 text-xs ${
                                      extractionProgress.elapsedTime < 15 ? 'text-green-600' :
                                      extractionProgress.elapsedTime < 25 ? 'text-yellow-600' : 'text-red-600'
                                    }`}>
                                      <Clock className="w-3 h-3" />
                                      <span>{extractionProgress.elapsedTime}s / 30s max</span>
                                    </div>
                                    {/* Cancel button */}
                                    <button
                                      onClick={(e) => { e.preventDefault(); cancelExtraction(); }}
                                      className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1"
                                    >
                                      <X className="w-3 h-3" /> Cancel
                                    </button>
                                  </div>
                                ) : (
                                  <>
                                    {cat.multiFile && cat.files.length > 0 ? <Plus className="w-4 h-4 text-neutral-400" /> : <Upload className="w-4 h-4 text-neutral-400" />}
                                    <span className="text-sm text-neutral-500">
                                      {cat.multiFile && cat.files.length > 0 
                                        ? `Add More ${cat.label}` 
                                        : cat.multiFile 
                                          ? 'Select Multiple Files (Ctrl+Click)' 
                                          : 'Upload PDF, DOCX, or TXT'}
                                    </span>
                                    <input
                                      type="file"
                                      accept=".pdf,.docx,.txt,.md"
                                      multiple={cat.multiFile}
                                      className="hidden"
                                      onChange={(e) => {
                                        if (!e.target.files?.length) return
                                        if (cat.multiFile && e.target.files.length > 1) {
                                          handleMultipleFileUpload(cat.type, e.target.files)
                                        } else {
                                          handleFileUpload(cat.type, e.target.files[0])
                                        }
                                        e.target.value = ''
                                      }}
                                    />
                                  </>
                                )}
                              </label>
                            ) : (
                              <div className="space-y-2">
                                <textarea
                                  value={cat.pastedText}
                                  onChange={(e) => setPastedText(cat.type, e.target.value)}
                                  placeholder="Paste your document text here..."
                                  className="w-full h-40 p-3 text-sm border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-200 focus:border-primary-400 resize-y"
                                />
                                <div className="flex items-center justify-between">
                                  <span className="text-xs text-neutral-400">
                                    {cat.pastedText.length.toLocaleString()} characters
                                  </span>
                                  <button
                                    onClick={() => addPastedDocument(cat.type)}
                                    disabled={!cat.pastedText.trim()}
                                    className="px-3 py-1.5 text-sm bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed"
                                  >
                                    Add Document
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
                  </>
                )}
              </div>
            )}

            {/* Run Audit Button */}
            {mechanism && totalFiles > 0 && (
              <button
                onClick={runFullAudit}
                disabled={isProcessing}
                className="w-full px-6 py-4 bg-primary-500 text-white font-semibold rounded-lg hover:bg-primary-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Auditing Documents ({auditedFiles}/{totalFiles})...
                  </>
                ) : (
                  <>
                    <FileCheck className="w-5 h-5" />
                    Run Full Audit ({totalFiles} documents)
                  </>
                )}
              </button>
            )}
          </div>
        ) : (
          /* Results View */
          <div className="space-y-6">
            {/* Tab Navigation */}
            <div className="bg-white rounded-lg shadow-sm border border-neutral-200 p-2 flex gap-2">
              <button
                onClick={() => setActiveTab('individual')}
                className={`flex-1 px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                  activeTab === 'individual' ? 'bg-primary-500 text-white' : 'text-neutral-600 hover:bg-neutral-100'
                }`}
              >
                Individual Audits
              </button>
              <button
                onClick={() => setActiveTab('compliance')}
                className={`flex-1 px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                  activeTab === 'compliance' ? 'bg-primary-500 text-white' : 'text-neutral-600 hover:bg-neutral-100'
                }`}
              >
                Admin Compliance
              </button>
              <button
                onClick={() => setActiveTab('package')}
                className={`flex-1 px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                  activeTab === 'package' ? 'bg-primary-500 text-white' : 'text-neutral-600 hover:bg-neutral-100'
                }`}
              >
                Package Audit
              </button>
            </div>

            {activeTab === 'individual' ? (
              /* Individual Document Audits */
              <div className="space-y-4">
                {/* Summary Table */}
                <div className="bg-white rounded-lg shadow-sm border border-neutral-200 p-6">
                  <h3 className="font-semibold text-neutral-900 mb-4">Document Scores Summary</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-neutral-200">
                          <th className="text-left py-2 px-3 font-medium text-neutral-600">Document</th>
                          <th className="text-left py-2 px-3 font-medium text-neutral-600">File</th>
                          <th className="text-center py-2 px-3 font-medium text-neutral-600">Score</th>
                          <th className="text-left py-2 px-3 font-medium text-neutral-600">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {categories.filter(c => c.files.length > 0).flatMap(cat =>
                          cat.files.map(f => (
                            <tr key={f.id} className="border-b border-neutral-100 hover:bg-neutral-50">
                              <td className="py-2 px-3 font-medium">{cat.label}</td>
                              <td className="py-2 px-3 text-neutral-600 truncate max-w-[200px]">{f.fileName}</td>
                              <td className="py-2 px-3 text-center">
                                {f.audit ? (
                                  <span className={`font-bold ${getScoreColor(f.audit.score)}`}>{f.audit.score}</span>
                                ) : (
                                  <span className="text-neutral-400">-</span>
                                )}
                              </td>
                              <td className="py-2 px-3">
                                {f.audit ? (
                                  <span className="text-green-600 text-xs">Audited</span>
                                ) : f.isAuditing ? (
                                  <span className="text-primary-600 text-xs">Auditing...</span>
                                ) : (
                                  <span className="text-neutral-400 text-xs">Pending</span>
                                )}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Expandable Document Details */}
                {categories.filter(c => c.files.length > 0).map(cat =>
                  cat.files.filter(f => f.audit).map(f => (
                    <div key={f.id} className="bg-white rounded-lg shadow-sm border border-neutral-200 overflow-hidden">
                      <button
                        onClick={() => toggleDocExpand(f.id)}
                        className="w-full px-6 py-4 flex items-center justify-between bg-neutral-50 hover:bg-neutral-100 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <FileText className="w-5 h-5 text-neutral-400" />
                          <div className="text-left">
                            <p className="font-medium text-neutral-900">{f.fileName}</p>
                            <p className="text-xs text-neutral-500">{cat.label}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={`text-2xl font-bold ${getScoreColor(f.audit!.score)}`}>{f.audit!.score}</span>
                          {expandedDocs.has(f.id) ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                        </div>
                      </button>
                      {expandedDocs.has(f.id) && (
                        <div className="p-6 space-y-4">
                          {f.audit!.strengths?.length > 0 && (
                            <div>
                              <h4 className="text-sm font-medium text-green-700 mb-2">Strengths</h4>
                              <ul className="space-y-1">
                                {f.audit!.strengths.map((s, i) => (
                                  <li key={i} className="text-sm text-green-800 flex items-start gap-2">
                                    <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />{s}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                          {f.audit!.weaknesses?.length > 0 && (
                            <div>
                              <h4 className="text-sm font-medium text-red-700 mb-2">Weaknesses</h4>
                              <ul className="space-y-1">
                                {f.audit!.weaknesses.map((w, i) => (
                                  <li key={i} className="text-sm text-red-800 flex items-start gap-2">
                                    <XCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />{w}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                          {f.audit!.suggestions?.length > 0 && (
                            <div>
                              <h4 className="text-sm font-medium text-blue-700 mb-2">Suggestions</h4>
                              <ul className="space-y-1">
                                {f.audit!.suggestions.map((s, i) => (
                                  <li key={i} className="text-sm text-blue-800 flex items-start gap-2">
                                    <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />{s}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            ) : activeTab === 'compliance' ? (
              /* Administrative Compliance */
              <div className="space-y-6">
                {/* Warning Banner */}
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-red-800">Administrative Non-Compliance May Result in Rejection Without Review</p>
                    <p className="text-sm text-red-700 mt-1">NIH strictly enforces formatting requirements. Applications exceeding page limits or violating format rules are returned without scientific review.</p>
                  </div>
                </div>

                {packageAudit.administrativeCompliance ? (
                  <>
                    {/* Summary Cards */}
                    <div className="grid grid-cols-3 gap-4">
                      <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                        <div className="text-3xl font-bold text-green-600">{packageAudit.administrativeCompliance.summary.pass}</div>
                        <p className="text-sm text-green-700">Pass</p>
                      </div>
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
                        <div className="text-3xl font-bold text-yellow-600">{packageAudit.administrativeCompliance.summary.warning}</div>
                        <p className="text-sm text-yellow-700">Warnings</p>
                      </div>
                      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
                        <div className="text-3xl font-bold text-red-600">{packageAudit.administrativeCompliance.summary.fail}</div>
                        <p className="text-sm text-red-700">Failures</p>
                      </div>
                    </div>

                    {/* Page Count Table */}
                    <div className="bg-white rounded-lg shadow-sm border border-neutral-200 p-6">
                      <h3 className="font-semibold text-neutral-900 mb-4">Page Count Validation</h3>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-neutral-200">
                              <th className="text-left py-2 px-3 font-medium text-neutral-600">Document</th>
                              <th className="text-center py-2 px-3 font-medium text-neutral-600">Pages</th>
                              <th className="text-center py-2 px-3 font-medium text-neutral-600">Limit</th>
                              <th className="text-center py-2 px-3 font-medium text-neutral-600">Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {Object.entries(packageAudit.administrativeCompliance.documents).map(([docType, info]) => (
                              <tr key={docType} className="border-b border-neutral-100">
                                <td className="py-2 px-3 font-medium capitalize">{docType.replace(/_/g, ' ')}</td>
                                <td className="py-2 px-3 text-center">
                                  {info.isActualCount ? (
                                    <span className="font-semibold">{info.actualPages}</span>
                                  ) : (
                                    <span className="text-neutral-500" title="Estimated from text length">~{info.estimatedPages}</span>
                                  )}
                                  {info.isActualCount && <span className="text-xs text-green-600 ml-1">(PDF)</span>}
                                </td>
                                <td className="py-2 px-3 text-center">{info.pageLimit < 999 ? info.pageLimit : 'No limit'}</td>
                                <td className="py-2 px-3 text-center">
                                  <span className={`px-2 py-1 text-xs font-medium rounded ${
                                    info.status === 'pass' ? 'bg-green-100 text-green-700' :
                                    info.status === 'warning' ? 'bg-yellow-100 text-yellow-700' :
                                    'bg-red-100 text-red-700'
                                  }`}>
                                    {info.status.toUpperCase()}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Document Issues */}
                    {Object.entries(packageAudit.administrativeCompliance.documents).some(([_, info]) => info.issues.length > 0) && (
                      <div className="bg-white rounded-lg shadow-sm border border-neutral-200 p-6">
                        <h3 className="font-semibold text-neutral-900 mb-4">Document-Specific Issues</h3>
                        <div className="space-y-3">
                          {Object.entries(packageAudit.administrativeCompliance.documents)
                            .filter(([_, info]) => info.issues.length > 0)
                            .map(([docType, info]) => (
                              <div key={docType} className={`p-3 rounded-lg border ${
                                info.status === 'fail' ? 'bg-red-50 border-red-200' : 'bg-yellow-50 border-yellow-200'
                              }`}>
                                <p className="font-medium capitalize text-neutral-800">{docType.replace(/_/g, ' ')}</p>
                                <ul className="mt-2 space-y-1">
                                  {info.issues.map((issue, i) => (
                                    <li key={i} className="text-sm text-neutral-700 flex items-start gap-2">
                                      <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                                      {issue}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            ))}
                        </div>
                      </div>
                    )}

                    {/* Format Reminders */}
                    <div className="bg-white rounded-lg shadow-sm border border-neutral-200 p-6">
                      <h3 className="font-semibold text-neutral-900 mb-4">NIH Formatting Requirements Checklist</h3>
                      <ul className="space-y-2">
                        {packageAudit.administrativeCompliance.formatReminders.map((reminder, i) => (
                          <li key={i} className="text-sm text-neutral-700 flex items-center gap-2">
                            <div className="w-4 h-4 border border-neutral-400 rounded" />
                            {reminder}
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Agency Alerts */}
                    {packageAudit.administrativeCompliance.agencyAlerts.length > 0 && (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                        <h3 className="font-semibold text-blue-900 mb-3">Institute-Specific Alerts</h3>
                        <ul className="space-y-2">
                          {packageAudit.administrativeCompliance.agencyAlerts.map((alert, i) => (
                            <li key={i} className="text-sm text-blue-800 flex items-start gap-2">
                              <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
                              {alert}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="bg-white rounded-lg shadow-sm border border-neutral-200 p-6 text-center text-neutral-500">
                    Administrative compliance data not available
                  </div>
                )}
              </div>
            ) : (
              /* Package Audit */
              <div className="space-y-6">
                {/* Overall Score Card */}
                <div className="bg-white rounded-lg shadow-sm border border-neutral-200 p-6">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h2 className="text-xl font-bold text-neutral-900">Package Audit Results</h2>
                      <p className="text-neutral-500">{packageAudit.mechanism} Application</p>
                    </div>
                    <div className="text-right">
                      <div className={`text-4xl font-bold ${getScoreColor(packageAudit.audit.overallScores.weighted_total)}`}>
                        {packageAudit.audit.overallScores.weighted_total}
                      </div>
                      <p className="text-sm text-neutral-500">Weighted Score</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-5 gap-4">
                    {[
                      { key: 'structural', label: 'Structural', weight: '25%', icon: ClipboardList },
                      { key: 'scientific', label: 'Scientific', weight: '30%', icon: FileText },
                      { key: 'budget', label: 'Budget', weight: '15%', icon: DollarSign },
                      { key: 'commercialization', label: 'Commercial', weight: '20%', icon: Briefcase },
                      { key: 'consistency', label: 'Consistency', weight: '10%', icon: CheckCircle },
                    ].map(item => {
                      const score = packageAudit.audit.overallScores[item.key as keyof typeof packageAudit.audit.overallScores] as number
                      return (
                        <div key={item.key} className="text-center">
                          <item.icon className={`w-6 h-6 mx-auto mb-2 ${getScoreColor(score)}`} />
                          <div className={`text-2xl font-bold ${getScoreColor(score)}`}>{score}</div>
                          <p className="text-xs text-neutral-500">{item.label}</p>
                          <p className="text-xs text-neutral-400">({item.weight})</p>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Reviewer Simulation */}
                <div className="bg-white rounded-lg shadow-sm border border-neutral-200 p-6">
                  <h3 className="font-semibold text-neutral-900 mb-4 flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    Reviewer Simulation
                  </h3>
                  <div className="space-y-4">
                    <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-blue-900">Scientific Reviewer</h4>
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                          packageAudit.audit.reviewerSimulation.scientific.score <= 3 ? 'bg-green-100 text-green-800' :
                          packageAudit.audit.reviewerSimulation.scientific.score <= 5 ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {packageAudit.audit.reviewerSimulation.scientific.score}/9 ({packageAudit.audit.reviewerSimulation.scientific.recommendedScore})
                        </span>
                      </div>
                      <p className="text-sm text-blue-800">{packageAudit.audit.reviewerSimulation.scientific.overallImpression}</p>
                    </div>

                    <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-purple-900">Commercialization Reviewer</h4>
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                          packageAudit.audit.reviewerSimulation.commercialization.score <= 3 ? 'bg-green-100 text-green-800' :
                          packageAudit.audit.reviewerSimulation.commercialization.score <= 5 ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {packageAudit.audit.reviewerSimulation.commercialization.score}/9
                        </span>
                      </div>
                      <p className="text-sm text-purple-800">{packageAudit.audit.reviewerSimulation.commercialization.overallImpression}</p>
                    </div>

                    <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                      <h4 className="font-medium text-green-900 mb-2">Budget Reviewer</h4>
                      <p className="text-sm text-green-800">{packageAudit.audit.reviewerSimulation.budget.overallImpression}</p>
                    </div>
                  </div>
                </div>

                {/* Suggestions */}
                {packageAudit.suggestions && (
                  <div className="bg-white rounded-lg shadow-sm border border-neutral-200 p-6">
                    <h3 className="font-semibold text-neutral-900 mb-4 flex items-center gap-2">
                      <Sparkles className="w-5 h-5" />
                      AI Improvement Suggestions
                    </h3>
                    <div className="space-y-3">
                      {packageAudit.suggestions.prioritized_improvements.slice(0, 5).map((item, i) => (
                        <div key={i} className="p-3 bg-neutral-50 rounded-lg border border-neutral-200">
                          <div className="flex items-start gap-3">
                            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-sm font-bold ${
                              item.impact === 'high' ? 'bg-red-500' : item.impact === 'medium' ? 'bg-amber-500' : 'bg-blue-500'
                            }`}>{item.priority}</span>
                            <div className="flex-1">
                              <p className="font-medium text-neutral-800 text-sm">{item.area}: {item.issue}</p>
                              <p className="text-xs text-neutral-600 mt-1">{item.suggestion}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4">
              {!packageAudit.suggestions && (
                <button
                  onClick={generateSuggestions}
                  disabled={generatingSuggestions}
                  className="flex-1 px-6 py-3 bg-indigo-500 text-white font-semibold rounded-lg hover:bg-indigo-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {generatingSuggestions ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
                  {generatingSuggestions ? 'Generating...' : 'Generate AI Suggestions'}
                </button>
              )}
              <button onClick={exportReport} className="flex-1 px-6 py-3 bg-primary-500 text-white font-semibold rounded-lg hover:bg-primary-600 transition-colors flex items-center justify-center gap-2">
                <Download className="w-5 h-5" />
                Download Report
              </button>
              <button onClick={resetAudit} className="flex-1 px-6 py-3 border border-neutral-300 text-neutral-700 font-semibold rounded-lg hover:bg-neutral-100 transition-colors">
                Start New Audit
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Document Viewer Modal */}
      {showDocViewer && fullGrantDoc && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-neutral-200">
              <div className="flex items-center gap-3">
                <FileText className="w-6 h-6 text-primary-600" />
                <div>
                  <h3 className="font-semibold text-neutral-900">{fullGrantDoc.fileName}</h3>
                  <p className="text-sm text-neutral-500">
                    {fullGrantDoc.pageCount && `${fullGrantDoc.pageCount} pages • `}
                    {fullGrantDoc.content.length.toLocaleString()} characters
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowDocViewer(false)}
                className="p-2 text-neutral-500 hover:bg-neutral-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-auto p-6">
              <div className="prose prose-sm max-w-none">
                <pre className="whitespace-pre-wrap font-sans text-sm text-neutral-700 leading-relaxed bg-neutral-50 p-4 rounded-lg">
                  {fullGrantDoc.content}
                </pre>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 p-4 border-t border-neutral-200 bg-neutral-50">
              <button
                onClick={() => {
                  const blob = new Blob([fullGrantDoc.content], { type: 'text/plain' })
                  const url = URL.createObjectURL(blob)
                  const a = document.createElement('a')
                  a.href = url
                  a.download = `${fullGrantDoc.fileName.replace(/\.[^/.]+$/, '')}_extracted.txt`
                  a.click()
                  URL.revokeObjectURL(url)
                }}
                className="px-4 py-2 bg-neutral-200 text-neutral-700 rounded-lg hover:bg-neutral-300 flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Download Text
              </button>
              <button
                onClick={() => setShowDocViewer(false)}
                className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
