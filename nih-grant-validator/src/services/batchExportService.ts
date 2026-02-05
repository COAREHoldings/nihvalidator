import JSZip from 'jszip'
import { saveAs } from 'file-saver'
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  PageNumber,
  NumberFormat,
  Footer,
  AlignmentType,
  convertInchesToTwip,
  HeadingLevel
} from 'docx'
import { generateDocument, getDocumentTypeTitle, type DocumentType, type GeneratedDocument } from './documentGenerationService'
import type { ProjectSchemaV2 } from '../types'

// NIH Standard Formatting
const NIH_FONT_SIZE = 22 // 11pt in half-points
const NIH_FONT_NAME = 'Times New Roman'
const NIH_MARGIN = convertInchesToTwip(0.5)

export interface BatchExportProgress {
  current: number
  total: number
  currentDocument: string
  status: 'generating' | 'packaging' | 'complete' | 'error'
  error?: string
}

export type ProgressCallback = (progress: BatchExportProgress) => void

// Core documents to generate (excluding phase-specific ones)
const CORE_DOCUMENTS: DocumentType[] = [
  'specific-aims',
  'specific-aims-page',
  'project-narrative',
  'research-strategy',
  'experimental-plan'
]

// Phase II+ documents
const PHASE_II_DOCUMENTS: DocumentType[] = [
  'commercialization'
]

/**
 * Parses markdown-like content into docx paragraphs
 */
function parseContentToParagraphs(content: string): Paragraph[] {
  const paragraphs: Paragraph[] = []
  const lines = content.split('\n')

  for (const line of lines) {
    const trimmedLine = line.trim()

    if (!trimmedLine) {
      paragraphs.push(
        new Paragraph({
          children: [new TextRun({ text: '', font: NIH_FONT_NAME, size: NIH_FONT_SIZE })],
          spacing: { after: 120 }
        })
      )
      continue
    }

    // Headers
    if (trimmedLine.startsWith('### ')) {
      paragraphs.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_3,
          children: [
            new TextRun({
              text: trimmedLine.replace('### ', ''),
              font: NIH_FONT_NAME,
              size: NIH_FONT_SIZE,
              bold: true
            })
          ],
          spacing: { before: 240, after: 120 }
        })
      )
    } else if (trimmedLine.startsWith('## ')) {
      paragraphs.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_2,
          children: [
            new TextRun({
              text: trimmedLine.replace('## ', ''),
              font: NIH_FONT_NAME,
              size: NIH_FONT_SIZE + 2,
              bold: true
            })
          ],
          spacing: { before: 280, after: 140 }
        })
      )
    } else if (trimmedLine.startsWith('# ')) {
      paragraphs.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_1,
          children: [
            new TextRun({
              text: trimmedLine.replace('# ', ''),
              font: NIH_FONT_NAME,
              size: NIH_FONT_SIZE + 4,
              bold: true
            })
          ],
          spacing: { before: 320, after: 160 }
        })
      )
    }
    // Bold lines
    else if (trimmedLine.match(/^\*\*.*\*\*$/) || trimmedLine.match(/^(Specific Aim|SA)\s*\d*:/i)) {
      const text = trimmedLine.replace(/\*\*/g, '')
      paragraphs.push(
        new Paragraph({
          children: [
            new TextRun({
              text: text,
              font: NIH_FONT_NAME,
              size: NIH_FONT_SIZE,
              bold: true
            })
          ],
          spacing: { before: 200, after: 80 }
        })
      )
    }
    // Bullet points
    else if (trimmedLine.startsWith('- ') || trimmedLine.startsWith('* ')) {
      const text = trimmedLine.replace(/^[-*]\s+/, '')
      paragraphs.push(
        new Paragraph({
          children: [
            new TextRun({
              text: '• ' + text,
              font: NIH_FONT_NAME,
              size: NIH_FONT_SIZE
            })
          ],
          indent: { left: convertInchesToTwip(0.25) },
          spacing: { after: 60 }
        })
      )
    }
    // Numbered lists
    else if (trimmedLine.match(/^\d+\.\s/)) {
      paragraphs.push(
        new Paragraph({
          children: [
            new TextRun({
              text: trimmedLine,
              font: NIH_FONT_NAME,
              size: NIH_FONT_SIZE
            })
          ],
          indent: { left: convertInchesToTwip(0.25) },
          spacing: { after: 60 }
        })
      )
    }
    // Regular paragraph with inline bold
    else {
      const parts = trimmedLine.split(/(\*\*[^*]+\*\*)/g)
      const children: TextRun[] = []

      for (const part of parts) {
        if (part.startsWith('**') && part.endsWith('**')) {
          children.push(
            new TextRun({
              text: part.slice(2, -2),
              font: NIH_FONT_NAME,
              size: NIH_FONT_SIZE,
              bold: true
            })
          )
        } else if (part) {
          children.push(
            new TextRun({
              text: part,
              font: NIH_FONT_NAME,
              size: NIH_FONT_SIZE
            })
          )
        }
      }

      paragraphs.push(
        new Paragraph({
          children: children.length > 0 ? children : [
            new TextRun({
              text: trimmedLine,
              font: NIH_FONT_NAME,
              size: NIH_FONT_SIZE
            })
          ],
          spacing: { after: 120 }
        })
      )
    }
  }

  return paragraphs
}

/**
 * Create footer with page numbers
 */
function createFooter(): Footer {
  return new Footer({
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({
            children: [PageNumber.CURRENT],
            font: NIH_FONT_NAME,
            size: NIH_FONT_SIZE - 2
          })
        ]
      })
    ]
  })
}

/**
 * Generate DOCX blob from content
 */
async function generateDocxBlob(title: string, content: string): Promise<Blob> {
  const paragraphs = parseContentToParagraphs(content)

  const titleParagraph = new Paragraph({
    children: [
      new TextRun({
        text: title,
        font: NIH_FONT_NAME,
        size: NIH_FONT_SIZE + 6,
        bold: true
      })
    ],
    alignment: AlignmentType.CENTER,
    spacing: { after: 400 }
  })

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: NIH_MARGIN,
              right: NIH_MARGIN,
              bottom: NIH_MARGIN,
              left: NIH_MARGIN
            },
            pageNumbers: {
              start: 1,
              formatType: NumberFormat.DECIMAL
            }
          }
        },
        footers: {
          default: createFooter()
        },
        children: [titleParagraph, ...paragraphs]
      }
    ]
  })

  return await Packer.toBlob(doc)
}

/**
 * Get document filename from type
 */
function getDocumentFilename(type: DocumentType): string {
  const filenames: Record<DocumentType, string> = {
    'title': '00_Project_Title.docx',
    'project-summary': '01_Project_Summary.docx',
    'project-narrative': '02_Project_Narrative.docx',
    'specific-aims': '03_Specific_Aims.docx',
    'specific-aims-page': '04_Specific_Aims_Page.docx',
    'research-strategy': '05_Research_Strategy.docx',
    'experimental-plan': '06_Experimental_Plan.docx',
    'commercialization': '07_Commercialization_Plan.docx',
    'references': '08_References.docx',
    'compiled-grant': '09_Compiled_Application.docx'
  }
  return filenames[type] || `${type}.docx`
}

/**
 * Batch generate and export all documents as a ZIP file
 */
export async function batchExportDocuments(
  project: ProjectSchemaV2,
  onProgress?: ProgressCallback
): Promise<{ success: boolean; error?: string }> {
  const zip = new JSZip()
  const generatedDocs: GeneratedDocument[] = []
  const errors: string[] = []

  // Determine which documents to generate
  const isPhaseII = project.grant_type && 
    ['Phase II', 'Fast Track', 'Direct to Phase II', 'Phase IIB'].includes(project.grant_type)
  
  const documentsToGenerate = [
    ...CORE_DOCUMENTS,
    ...(isPhaseII ? PHASE_II_DOCUMENTS : [])
  ]

  const total = documentsToGenerate.length

  // Generate each document
  for (let i = 0; i < documentsToGenerate.length; i++) {
    const docType = documentsToGenerate[i]
    const title = getDocumentTypeTitle(docType)

    onProgress?.({
      current: i + 1,
      total,
      currentDocument: title,
      status: 'generating'
    })

    try {
      const result = await generateDocument(project, docType)

      if (result.success && result.data) {
        generatedDocs.push(result.data)

        // Convert to DOCX and add to ZIP
        const docxBlob = await generateDocxBlob(
          result.data.title || title,
          result.data.content
        )
        zip.file(getDocumentFilename(docType), docxBlob)
      } else {
        errors.push(`${title}: ${result.error?.message || 'Generation failed'}`)
      }
    } catch (error) {
      errors.push(`${title}: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }

    // Small delay between requests to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 500))
  }

  // Add a summary file
  const summaryContent = `
NIH Grant Document Export
=========================

Project: ${project.m1_title_concept?.title || 'Untitled'}
Grant Type: ${project.grant_type || 'Not specified'}
Program: ${project.program_type || 'Not specified'}
Institute: ${project.institute || 'Not specified'}

Generated: ${new Date().toISOString()}

Documents Included:
${generatedDocs.map(d => `- ${d.title} (${d.wordCount} words)`).join('\n')}

${errors.length > 0 ? `\nErrors:\n${errors.join('\n')}` : ''}
`.trim()

  zip.file('_README.txt', summaryContent)

  // Add JSON export
  const jsonExport = {
    project,
    generatedDocuments: generatedDocs,
    exportedAt: new Date().toISOString()
  }
  zip.file('project_data.json', JSON.stringify(jsonExport, null, 2))

  onProgress?.({
    current: total,
    total,
    currentDocument: 'Packaging ZIP',
    status: 'packaging'
  })

  try {
    // Generate and download ZIP
    const zipBlob = await zip.generateAsync({ type: 'blob' })
    const projectName = project.m1_title_concept?.title?.slice(0, 30).replace(/[^a-zA-Z0-9]/g, '_') || 'nih_grant'
    saveAs(zipBlob, `${projectName}_documents_${Date.now()}.zip`)

    onProgress?.({
      current: total,
      total,
      currentDocument: 'Complete',
      status: 'complete'
    })

    return { success: true }
  } catch (error) {
    onProgress?.({
      current: total,
      total,
      currentDocument: 'Error',
      status: 'error',
      error: error instanceof Error ? error.message : 'Failed to create ZIP'
    })

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create ZIP'
    }
  }
}

export default { batchExportDocuments }
