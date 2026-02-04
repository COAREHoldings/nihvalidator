import { FileText, Download } from 'lucide-react'
import { generateDocx, generatePdf } from '../../lib/docxGenerator'
import { useState } from 'react'

interface DownloadButtonsProps {
  title: string
  content: string
  filename: string
  disabled?: boolean
}

export function DownloadButtons({ title, content, filename, disabled = false }: DownloadButtonsProps) {
  const [isGenerating, setIsGenerating] = useState(false)

  const handleDocxDownload = async () => {
    if (!content || disabled) return
    
    setIsGenerating(true)
    try {
      await generateDocx({
        title,
        content,
        filename: `${filename}.docx`
      })
    } catch (error) {
      console.error('Error generating DOCX:', error)
      alert('Error generating DOCX file. Please try again.')
    } finally {
      setIsGenerating(false)
    }
  }

  const handlePdfDownload = () => {
    if (!content || disabled) return
    generatePdf(title, content)
  }

  const isDisabled = disabled || !content || isGenerating

  return (
    <div className="flex items-center gap-2 mt-3">
      <button
        onClick={handleDocxDownload}
        disabled={isDisabled}
        className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
          isDisabled
            ? 'bg-neutral-100 text-neutral-400 cursor-not-allowed'
            : 'bg-primary-600 text-white hover:bg-primary-700'
        }`}
        title="Download as DOCX (NIH format)"
      >
        <FileText className="w-4 h-4" />
        {isGenerating ? 'Generating...' : 'Download DOCX'}
      </button>
      <button
        onClick={handlePdfDownload}
        disabled={isDisabled}
        className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
          isDisabled
            ? 'bg-neutral-100 text-neutral-400 cursor-not-allowed'
            : 'bg-neutral-200 text-neutral-700 hover:bg-neutral-300'
        }`}
        title="Download as PDF"
      >
        <Download className="w-4 h-4" />
        Download PDF
      </button>
    </div>
  )
}

export default DownloadButtons
