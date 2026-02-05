import { useState } from 'react'
import { Sparkles, Loader2, Check, AlertCircle, FileText, Download, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react'
import { generateDocument, getDocumentTypeTitle, getDocumentTypeDescription, type DocumentType, type GeneratedDocument } from '../../services/documentGenerationService'
import { generateDocx, generatePdf } from '../../lib/docxGenerator'
import { useToast } from '../shared/ToastProvider'
import type { ProjectSchemaV2 } from '../../types'

interface AIGenerateButtonProps {
  project: ProjectSchemaV2
  documentType: DocumentType
  onGenerated?: (document: GeneratedDocument) => void
  buttonText?: string
  className?: string
  compact?: boolean
}

export function AIGenerateButton({
  project,
  documentType,
  onGenerated,
  buttonText,
  className = '',
  compact = false
}: AIGenerateButtonProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [generatedContent, setGeneratedContent] = useState<GeneratedDocument | null>(null)
  const [showPreview, setShowPreview] = useState(false)
  const [downloadingDocx, setDownloadingDocx] = useState(false)
  const toast = useToast()

  const title = getDocumentTypeTitle(documentType)
  const description = getDocumentTypeDescription(documentType)

  const handleGenerate = async () => {
    setLoading(true)
    setError(null)

    const result = await generateDocument(project, documentType)

    setLoading(false)

    if (result.success && result.data) {
      setGeneratedContent(result.data)
      setShowPreview(true)
      onGenerated?.(result.data)
    } else {
      setError(result.error?.message || 'Generation failed')
    }
  }

  const handleDownloadDocx = async () => {
    if (!generatedContent) return

    setDownloadingDocx(true)
    try {
      await generateDocx({
        title: generatedContent.title || title,
        content: generatedContent.content,
        filename: `${documentType}-${Date.now()}.docx`
      })
    } catch (err) {
      console.error('DOCX generation error:', err)
      toast.error('Export Failed', 'Failed to generate DOCX file. Please try again.')
    } finally {
      setDownloadingDocx(false)
    }
  }

  const handleDownloadPdf = () => {
    if (!generatedContent) return
    generatePdf(generatedContent.title || title, generatedContent.content)
  }

  // Compact mode: just a button
  if (compact) {
    return (
      <button
        onClick={handleGenerate}
        disabled={loading}
        className={`inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg transition-all ${
          loading
            ? 'bg-neutral-100 text-neutral-400 cursor-wait'
            : 'bg-gradient-to-r from-violet-500 to-purple-600 text-white hover:from-violet-600 hover:to-purple-700 shadow-sm hover:shadow'
        } ${className}`}
      >
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Sparkles className="w-4 h-4" />
        )}
        {loading ? 'Generating...' : buttonText || `Generate ${title}`}
      </button>
    )
  }

  // Full mode: button with preview panel
  return (
    <div className={`border border-neutral-200 rounded-lg overflow-hidden ${className}`}>
      {/* Header */}
      <div className="p-4 bg-gradient-to-r from-violet-50 to-purple-50 border-b border-neutral-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-violet-500 to-purple-600 rounded-lg">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h4 className="font-semibold text-neutral-900">{title}</h4>
              <p className="text-xs text-neutral-500">{description}</p>
            </div>
          </div>
          
          <button
            onClick={handleGenerate}
            disabled={loading}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-all ${
              loading
                ? 'bg-neutral-200 text-neutral-500 cursor-wait'
                : generatedContent
                  ? 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
                  : 'bg-gradient-to-r from-violet-500 to-purple-600 text-white hover:from-violet-600 hover:to-purple-700 shadow-sm hover:shadow'
            }`}
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Generating...
              </>
            ) : generatedContent ? (
              <>
                <RefreshCw className="w-4 h-4" />
                Regenerate
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                {buttonText || 'Generate'}
              </>
            )}
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-4 bg-red-50 border-b border-red-200">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-red-800">Generation Failed</p>
              <p className="text-sm text-red-600">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Generated Content */}
      {generatedContent && (
        <div>
          {/* Stats & Actions Bar */}
          <div className="p-3 bg-neutral-50 border-b border-neutral-200 flex items-center justify-between">
            <div className="flex items-center gap-4 text-sm text-neutral-600">
              <span className="flex items-center gap-1">
                <Check className="w-4 h-4 text-green-500" />
                Generated
              </span>
              <span>{generatedContent.wordCount} words</span>
              <span className="text-neutral-400">|</span>
              <span>{new Date(generatedContent.generatedAt).toLocaleTimeString()}</span>
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={handleDownloadDocx}
                disabled={downloadingDocx}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
              >
                {downloadingDocx ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <FileText className="w-4 h-4" />
                )}
                DOCX
              </button>
              <button
                onClick={handleDownloadPdf}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-neutral-200 text-neutral-700 rounded-lg hover:bg-neutral-300 transition-colors"
              >
                <Download className="w-4 h-4" />
                PDF
              </button>
              <button
                onClick={() => setShowPreview(!showPreview)}
                className="flex items-center gap-1 px-2 py-1.5 text-sm text-neutral-600 hover:bg-neutral-200 rounded transition-colors"
              >
                {showPreview ? (
                  <>
                    <ChevronUp className="w-4 h-4" />
                    Hide
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-4 h-4" />
                    Preview
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Preview Content */}
          {showPreview && (
            <div className="p-4 max-h-96 overflow-auto bg-white">
              <div className="prose prose-sm prose-neutral max-w-none">
                {generatedContent.content.split('\n\n').map((paragraph, idx) => (
                  <p key={idx} className="mb-3 text-neutral-800 leading-relaxed whitespace-pre-wrap">
                    {paragraph}
                  </p>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Empty State */}
      {!generatedContent && !loading && !error && (
        <div className="p-6 text-center text-neutral-500">
          <FileText className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p className="text-sm">Click "Generate" to create your {title.toLowerCase()}</p>
          <p className="text-xs mt-1 text-neutral-400">{description}</p>
        </div>
      )}
    </div>
  )
}

export default AIGenerateButton
