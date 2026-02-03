// Layer 5: FOA Upload and Parsing Component
import { useState } from 'react'
import type { ProjectSchemaV2 } from '../types'
import { FileText, Upload, CheckCircle, AlertCircle, X, RefreshCw, FileSearch } from 'lucide-react'

interface FOAUploadProps {
  project: ProjectSchemaV2
  onUpdate: (updates: Partial<ProjectSchemaV2>) => void
  onClose: () => void
}

interface ParsedFOAData {
  foaNumber: string
  title: string
  activityCode: string
  organization: string
  pageLimits: Record<string, number | null>
  budgetCaps: {
    phase1TotalCost: number | null
    phase1DirectCostPerYear: number | null
    phase2TotalCost: number | null
    phase2DirectCostPerYear: number | null
    fastTrackTotalCost: number | null
  }
  eligibility: Record<string, boolean | null>
  allocationRequirements: Record<string, number | null>
  clinicalTrial: {
    clinicalTrialRequired: boolean | null
    clinicalTrialAllowed: boolean | null
    clinicalTrialDesignation: string | null
  }
  phases: {
    phase1Allowed: boolean
    phase2Allowed: boolean
    fastTrackAllowed: boolean
    directToPhase2Allowed: boolean
  }
  dueDates: {
    standardDates: boolean
    specificDates: string[] | null
    expirationDate: string | null
  }
  specialRequirements: string[]
  commercializationPlanRequired: boolean
}

export function FOAUpload({ project, onUpdate, onClose }: FOAUploadProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [isParsing, setIsParsing] = useState(false)
  const [parseError, setParseError] = useState<string | null>(null)
  const [parsedData, setParsedData] = useState<ParsedFOAData | null>(null)
  const [foaNumber, setFoaNumber] = useState('')
  const [fileContent, setFileContent] = useState<string | null>(null)
  const [fileName, setFileName] = useState<string | null>(null)

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) {
      await processFile(file)
    }
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      await processFile(file)
    }
  }

  const processFile = async (file: File) => {
    setParseError(null)
    setFileName(file.name)
    
    // Extract text from file
    if (file.type === 'text/plain' || file.name.endsWith('.txt')) {
      const text = await file.text()
      setFileContent(text)
    } else if (file.type === 'application/pdf') {
      // For PDF, we'll send a placeholder - in production, would use pdf.js
      setParseError('PDF parsing requires extracting text first. Please copy/paste the FOA text below.')
      setFileContent(null)
    } else {
      setParseError(`Unsupported file type: ${file.type}. Please use TXT files or paste content directly.`)
      setFileContent(null)
    }
  }

  const parseFOA = async () => {
    if (!fileContent && !foaNumber) {
      setParseError('Please provide FOA content or enter an FOA number')
      return
    }

    setIsParsing(true)
    setParseError(null)

    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://dvuhtfzsvcacyrlfettz.supabase.co'
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR2dWh0ZnpzdmNhY3lybGZldHR6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk2NDk3OTYsImV4cCI6MjA4NTIyNTc5Nn0.vUtnPXeQrzU0kO0E7qK2qJtZ_RCqnXCEFSa60adHld0'

      const response = await fetch(`${supabaseUrl}/functions/v1/parse-foa`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseAnonKey}`
        },
        body: JSON.stringify({
          foaText: fileContent,
          foaNumber: foaNumber
        })
      })

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || 'Failed to parse FOA')
      }

      setParsedData(result.data)
    } catch (err) {
      console.error('FOA parsing error:', err)
      setParseError(err instanceof Error ? err.message : 'Failed to parse FOA')
    } finally {
      setIsParsing(false)
    }
  }

  const applyFOAOverrides = () => {
    if (!parsedData) return

    // Build the FOA parsed data for the project
    const foaParsedData = {
      foaNumber: parsedData.foaNumber || foaNumber,
      title: parsedData.title || '',
      extractedAt: new Date().toISOString(),
      pageLimits: {
        specificAims: parsedData.pageLimits?.specificAims || 1,
        researchStrategy: parsedData.pageLimits?.researchStrategy || 12,
        commercializationPlan: parsedData.pageLimits?.commercializationPlan || 12
      },
      requiredAttachments: parsedData.specialRequirements || [],
      clinicalTrialDesignation: parsedData.clinicalTrial?.clinicalTrialAllowed ?? null,
      budgetCapOverride: parsedData.budgetCaps?.phase1DirectCostPerYear || 
                         parsedData.budgetCaps?.phase2DirectCostPerYear || 
                         null,
      smallBusinessMinOverride: parsedData.allocationRequirements?.smallBusinessMinPercent || null,
      researchInstitutionMinOverride: parsedData.allocationRequirements?.researchInstitutionMinPercent || null,
      reviewCriteria: [],
      specialRequirements: parsedData.specialRequirements || [],
      rawText: fileContent || ''
    }

    // Update project with FOA data
    onUpdate({
      foa_number: parsedData.foaNumber || foaNumber,
      foa_config: {
        ...project.foa_config,
        direct_phase2_allowed: parsedData.phases?.directToPhase2Allowed ?? project.foa_config.direct_phase2_allowed,
        fast_track_allowed: parsedData.phases?.fastTrackAllowed ?? project.foa_config.fast_track_allowed,
        commercialization_required: parsedData.commercializationPlanRequired ?? project.foa_config.commercialization_required,
        parsed_foa: foaParsedData
      }
    })

    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-neutral-200">
          <div className="flex items-center gap-3">
            <FileSearch className="w-6 h-6 text-blue-600" />
            <div>
              <h2 className="text-lg font-semibold text-neutral-900">Upload FOA Document</h2>
              <p className="text-sm text-neutral-500">Layer 5: Extract requirements from your FOA</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-neutral-500 hover:bg-neutral-100 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-auto p-6">
          {!parsedData ? (
            <div className="space-y-6">
              {/* FOA Number Input */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  FOA Number
                </label>
                <input
                  type="text"
                  value={foaNumber}
                  onChange={(e) => setFoaNumber(e.target.value)}
                  placeholder="e.g., PA-23-199, PAR-24-001"
                  className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* File Upload Zone */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  FOA Document
                </label>
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                    isDragging
                      ? 'border-blue-400 bg-blue-50'
                      : 'border-neutral-300 hover:border-neutral-400'
                  }`}
                >
                  <Upload className="w-12 h-12 text-neutral-400 mx-auto mb-4" />
                  <p className="text-neutral-600 mb-2">
                    Drag and drop your FOA file here, or{' '}
                    <label className="text-blue-600 cursor-pointer hover:underline">
                      browse
                      <input
                        type="file"
                        accept=".txt,.pdf"
                        onChange={handleFileSelect}
                        className="hidden"
                      />
                    </label>
                  </p>
                  <p className="text-sm text-neutral-500">
                    Supports TXT files. For PDFs, copy and paste the text below.
                  </p>
                  {fileName && (
                    <div className="mt-4 p-2 bg-neutral-100 rounded inline-flex items-center gap-2">
                      <FileText className="w-4 h-4 text-neutral-600" />
                      <span className="text-sm text-neutral-700">{fileName}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Text Input */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  Or paste FOA text directly
                </label>
                <textarea
                  value={fileContent || ''}
                  onChange={(e) => setFileContent(e.target.value)}
                  placeholder="Paste the relevant sections of your FOA document here..."
                  rows={8}
                  className="w-full px-4 py-3 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm font-mono"
                />
              </div>

              {parseError && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-700">{parseError}</p>
                </div>
              )}

              <button
                onClick={parseFOA}
                disabled={isParsing || (!fileContent && !foaNumber)}
                className="w-full px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isParsing ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    Parsing FOA...
                  </>
                ) : (
                  <>
                    <FileSearch className="w-5 h-5" />
                    Parse FOA
                  </>
                )}
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Parsed Data Display */}
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-green-800">FOA Parsed Successfully</p>
                  <p className="text-sm text-green-700">{parsedData.foaNumber || foaNumber}</p>
                </div>
              </div>

              {/* FOA Details */}
              <div className="grid grid-cols-2 gap-4">
                {/* Basic Info */}
                <div className="p-4 bg-neutral-50 rounded-lg">
                  <h3 className="font-semibold text-neutral-800 mb-3">Basic Information</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-neutral-600">FOA Number</span>
                      <span className="font-medium">{parsedData.foaNumber || foaNumber || '-'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-600">Activity Code</span>
                      <span className="font-medium">{parsedData.activityCode || '-'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-600">Organization</span>
                      <span className="font-medium">{parsedData.organization || '-'}</span>
                    </div>
                  </div>
                </div>

                {/* Budget Caps */}
                <div className="p-4 bg-neutral-50 rounded-lg">
                  <h3 className="font-semibold text-neutral-800 mb-3">Budget Caps</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-neutral-600">Phase I (per year)</span>
                      <span className="font-medium">
                        {parsedData.budgetCaps?.phase1DirectCostPerYear 
                          ? `$${parsedData.budgetCaps.phase1DirectCostPerYear.toLocaleString()}`
                          : '-'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-600">Phase II (per year)</span>
                      <span className="font-medium">
                        {parsedData.budgetCaps?.phase2DirectCostPerYear 
                          ? `$${parsedData.budgetCaps.phase2DirectCostPerYear.toLocaleString()}`
                          : '-'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Page Limits */}
                <div className="p-4 bg-neutral-50 rounded-lg">
                  <h3 className="font-semibold text-neutral-800 mb-3">Page Limits</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-neutral-600">Specific Aims</span>
                      <span className="font-medium">{parsedData.pageLimits?.specificAims || 1} page(s)</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-600">Research Strategy</span>
                      <span className="font-medium">{parsedData.pageLimits?.researchStrategy || '-'} pages</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-600">Commercialization</span>
                      <span className="font-medium">{parsedData.pageLimits?.commercializationPlan || 12} pages</span>
                    </div>
                  </div>
                </div>

                {/* Clinical Trial */}
                <div className="p-4 bg-neutral-50 rounded-lg">
                  <h3 className="font-semibold text-neutral-800 mb-3">Clinical Trial Policy</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-neutral-600">Designation</span>
                      <span className={`font-medium ${
                        parsedData.clinicalTrial?.clinicalTrialDesignation === 'Required' ? 'text-red-600' :
                        parsedData.clinicalTrial?.clinicalTrialDesignation === 'Not Allowed' ? 'text-amber-600' :
                        'text-green-600'
                      }`}>
                        {parsedData.clinicalTrial?.clinicalTrialDesignation || 'Not specified'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Allocation Requirements */}
                <div className="p-4 bg-neutral-50 rounded-lg col-span-2">
                  <h3 className="font-semibold text-neutral-800 mb-3">Allocation Requirements</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="flex justify-between">
                      <span className="text-neutral-600">Small Business Minimum</span>
                      <span className="font-medium">
                        {parsedData.allocationRequirements?.smallBusinessMinPercent 
                          ? `${parsedData.allocationRequirements.smallBusinessMinPercent}%`
                          : '-'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-600">Research Institution Min (STTR)</span>
                      <span className="font-medium">
                        {parsedData.allocationRequirements?.researchInstitutionMinPercent 
                          ? `${parsedData.allocationRequirements.researchInstitutionMinPercent}%`
                          : '-'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Special Requirements */}
                {parsedData.specialRequirements && parsedData.specialRequirements.length > 0 && (
                  <div className="p-4 bg-amber-50 rounded-lg col-span-2 border border-amber-200">
                    <h3 className="font-semibold text-amber-800 mb-3">Special Requirements</h3>
                    <ul className="space-y-1 text-sm text-amber-700">
                      {parsedData.specialRequirements.map((req, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span className="text-amber-500">*</span>
                          {req}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-4 pt-4 border-t border-neutral-200">
                <button
                  onClick={() => setParsedData(null)}
                  className="flex-1 px-6 py-3 border border-neutral-300 text-neutral-700 font-semibold rounded-lg hover:bg-neutral-50"
                >
                  Parse Another FOA
                </button>
                <button
                  onClick={applyFOAOverrides}
                  className="flex-1 px-6 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 flex items-center justify-center gap-2"
                >
                  <CheckCircle className="w-5 h-5" />
                  Apply FOA Overrides
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
