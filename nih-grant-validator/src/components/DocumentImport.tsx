import { useState, useRef } from 'react'
import { Upload, FileText, X, Check, AlertCircle, Loader2 } from 'lucide-react'
import * as mammoth from 'mammoth'
import * as pdfjsLib from 'pdfjs-dist'
import type { ProjectSchemaV2 } from '../types'

// Initialize PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`

interface ParsedModule {
  [key: string]: string | number | boolean | string[] | object[] | undefined
}

interface ParseResult {
  success: boolean
  data?: {
    m1_title_concept?: ParsedModule
    m2_hypothesis?: ParsedModule
    m3_specific_aims?: ParsedModule
    m4_team_mapping?: ParsedModule
    m5_experimental_approach?: ParsedModule
    m7_regulatory?: ParsedModule
  }
  summary?: {
    modulesFound: string[]
    totalFieldsExtracted: number
  }
  fileName?: string
  error?: string
}

interface DocumentImportProps {
  onImport: (updates: Partial<ProjectSchemaV2>) => void
  onClose: () => void
}

const SUPABASE_URL = 'https://raqkwtjsxohnhtcacakb.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJhcWt3dGpzeG9obmh0Y2FjYWtiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk3MDIyNTQsImV4cCI6MjA4NTI3ODI1NH0.pDpNp4UlpCinhi6gl2qtKhT3t20uUGHU_FUxTxYjttI'

export function DocumentImport({ onImport, onClose }: DocumentImportProps) {
  const [status, setStatus] = useState<'idle' | 'uploading' | 'parsing' | 'review' | 'error'>('idle')
  const [error, setError] = useState<string | null>(null)
  const [parseResult, setParseResult] = useState<ParseResult | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const extractTextFromFile = async (file: File): Promise<string> => {
    const arrayBuffer = await file.arrayBuffer()
    
    if (file.name.endsWith('.pdf')) {
      try {
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
        let fullText = ''
        const maxPages = Math.min(pdf.numPages, 50)
        for (let i = 1; i <= maxPages; i++) {
          const page = await pdf.getPage(i)
          const textContent = await page.getTextContent()
          const pageText = textContent.items
            .map((item: any) => item.str)
            .join(' ')
          fullText += pageText + '\n\n'
        }
        return fullText.trim() || 'Unable to extract PDF text.'
      } catch (err) {
        console.error('PDF extraction error:', err)
        return 'Unable to extract PDF text. Please try a DOCX file.'
      }
    }
    
    if (file.name.endsWith('.docx')) {
      try {
        const result = await mammoth.extractRawText({ arrayBuffer })
        return result.value || 'Unable to extract DOCX text.'
      } catch (err) {
        console.error('DOCX extraction error:', err)
        return 'Unable to extract DOCX text.'
      }
    }
    
    // Plain text
    return new TextDecoder('utf-8').decode(arrayBuffer)
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const validTypes = ['.pdf', '.docx', '.doc', '.txt']
    const isValid = validTypes.some(ext => file.name.toLowerCase().endsWith(ext))
    
    if (!isValid) {
      setError('Please upload a PDF, DOCX, or TXT file')
      return
    }

    setSelectedFile(file)
    setError(null)
    setStatus('uploading')

    try {
      setStatus('parsing')
      const textContent = await extractTextFromFile(file)
      
      if (textContent.length < 50) {
        throw new Error('Could not extract sufficient text from the document. Please try a different file format.')
      }

      const response = await fetch(`${SUPABASE_URL}/functions/v1/parse-document`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          fileContent: textContent.substring(0, 30000), // Limit to avoid token limits
          fileName: file.name,
          fileType: file.type,
        }),
      })

      const result = await response.json()
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to parse document')
      }

      setParseResult(result)
      setStatus('review')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process document')
      setStatus('error')
    }
  }

  const handleConfirmImport = () => {
    if (!parseResult?.data) return

    const updates: Partial<ProjectSchemaV2> = {}
    
    if (parseResult.data.m1_title_concept) {
      updates.m1_title_concept = parseResult.data.m1_title_concept as ProjectSchemaV2['m1_title_concept']
    }
    if (parseResult.data.m2_hypothesis) {
      updates.m2_hypothesis = parseResult.data.m2_hypothesis as ProjectSchemaV2['m2_hypothesis']
    }
    if (parseResult.data.m3_specific_aims) {
      updates.m3_specific_aims = parseResult.data.m3_specific_aims as ProjectSchemaV2['m3_specific_aims']
    }
    if (parseResult.data.m4_team_mapping) {
      updates.m4_team_mapping = parseResult.data.m4_team_mapping as ProjectSchemaV2['m4_team_mapping']
    }
    if (parseResult.data.m5_experimental_approach) {
      updates.m5_experimental_approach = parseResult.data.m5_experimental_approach as ProjectSchemaV2['m5_experimental_approach']
    }
    if (parseResult.data.m7_regulatory) {
      updates.m7_regulatory = parseResult.data.m7_regulatory as ProjectSchemaV2['m7_regulatory']
    }

    onImport(updates)
    onClose()
  }

  const moduleLabels: Record<string, string> = {
    m1_title_concept: 'M1: Title & Concept',
    m2_hypothesis: 'M2: Hypothesis',
    m3_specific_aims: 'M3: Specific Aims',
    m4_team_mapping: 'M4: Team Mapping',
    m5_experimental_approach: 'M5: Experimental Approach',
    m7_regulatory: 'M7: Regulatory',
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-neutral-200">
          <h2 className="text-lg font-semibold text-neutral-900">Import Grant Document</h2>
          <button onClick={onClose} className="p-1 hover:bg-neutral-100 rounded-lg">
            <X className="w-5 h-5 text-neutral-500" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          {status === 'idle' && (
            <div>
              <p className="text-sm text-neutral-600 mb-4">
                Upload an existing grant document (PDF or DOCX) and AI will extract content into the appropriate modules.
              </p>
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-neutral-300 rounded-xl p-8 text-center cursor-pointer hover:border-primary-400 hover:bg-primary-50/50 transition-colors"
              >
                <Upload className="w-12 h-12 text-neutral-400 mx-auto mb-3" />
                <p className="text-sm font-medium text-neutral-700">Click to upload or drag and drop</p>
                <p className="text-xs text-neutral-500 mt-1">PDF, DOCX, or TXT (max 10MB)</p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.docx,.doc,.txt"
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>
          )}

          {(status === 'uploading' || status === 'parsing') && (
            <div className="text-center py-12">
              <Loader2 className="w-12 h-12 text-primary-500 mx-auto mb-4 animate-spin" />
              <p className="text-neutral-700 font-medium">
                {status === 'uploading' ? 'Reading document...' : 'AI is analyzing your document...'}
              </p>
              <p className="text-sm text-neutral-500 mt-2">This may take a moment</p>
            </div>
          )}

          {status === 'error' && (
            <div className="text-center py-8">
              <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <p className="text-neutral-900 font-medium mb-2">Import Failed</p>
              <p className="text-sm text-red-600 mb-4">{error}</p>
              <button
                onClick={() => { setStatus('idle'); setError(null); setSelectedFile(null); }}
                className="px-4 py-2 bg-neutral-100 text-neutral-700 rounded-lg hover:bg-neutral-200"
              >
                Try Again
              </button>
            </div>
          )}

          {status === 'review' && parseResult?.data && (
            <div>
              <div className="flex items-center gap-3 mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                <Check className="w-5 h-5 text-green-600" />
                <div>
                  <p className="text-sm font-medium text-green-800">Document Parsed Successfully</p>
                  <p className="text-xs text-green-600">
                    Found content for {parseResult.summary?.modulesFound.length || 0} modules 
                    ({parseResult.summary?.totalFieldsExtracted || 0} fields)
                  </p>
                </div>
              </div>

              {selectedFile && (
                <div className="flex items-center gap-2 mb-4 p-2 bg-neutral-50 rounded-lg">
                  <FileText className="w-4 h-4 text-neutral-500" />
                  <span className="text-sm text-neutral-700">{selectedFile.name}</span>
                </div>
              )}

              <p className="text-sm font-medium text-neutral-700 mb-3">Content to Import:</p>
              <div className="space-y-3 mb-4">
                {Object.entries(parseResult.data).map(([moduleKey, moduleData]) => {
                  if (!moduleData || typeof moduleData !== 'object') return null
                  const fields = Object.entries(moduleData).filter(([, v]) => v !== undefined && v !== '' && v !== null)
                  if (fields.length === 0) return null
                  
                  return (
                    <div key={moduleKey} className="border border-neutral-200 rounded-lg overflow-hidden">
                      <div className="bg-neutral-50 px-3 py-2 border-b border-neutral-200">
                        <span className="text-sm font-medium text-neutral-800">
                          {moduleLabels[moduleKey] || moduleKey}
                        </span>
                        <span className="text-xs text-neutral-500 ml-2">({fields.length} fields)</span>
                      </div>
                      <div className="p-3 space-y-2 max-h-40 overflow-y-auto">
                        {fields.slice(0, 5).map(([fieldKey, fieldValue]) => (
                          <div key={fieldKey} className="text-xs">
                            <span className="font-medium text-neutral-600">{fieldKey.replace(/_/g, ' ')}:</span>
                            <span className="text-neutral-500 ml-1">
                              {typeof fieldValue === 'string' 
                                ? fieldValue.substring(0, 100) + (fieldValue.length > 100 ? '...' : '')
                                : Array.isArray(fieldValue) 
                                  ? `[${fieldValue.length} items]`
                                  : JSON.stringify(fieldValue).substring(0, 50)}
                            </span>
                          </div>
                        ))}
                        {fields.length > 5 && (
                          <p className="text-xs text-neutral-400">+ {fields.length - 5} more fields</p>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>

              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg mb-4">
                <p className="text-xs text-amber-800">
                  <strong>Note:</strong> Importing will overwrite any existing content in these modules. 
                  You can edit the imported content after confirming.
                </p>
              </div>
            </div>
          )}
        </div>

        {status === 'review' && (
          <div className="flex gap-3 p-4 border-t border-neutral-200 bg-neutral-50">
            <button
              onClick={() => { setStatus('idle'); setParseResult(null); setSelectedFile(null); }}
              className="flex-1 px-4 py-2 border border-neutral-300 text-neutral-700 rounded-lg hover:bg-white"
            >
              Upload Different File
            </button>
            <button
              onClick={handleConfirmImport}
              className="flex-1 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 font-medium"
            >
              Confirm Import
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
