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

const NIH_FONT_SIZE = 22 // 11pt in half-points
const NIH_FONT_NAME = 'Times New Roman'
const NIH_MARGIN = convertInchesToTwip(0.5)

interface GenerateDocxOptions {
  title: string
  content: string
  filename: string
}

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
    } else if (trimmedLine.match(/^\*\*.*\*\*$/) || trimmedLine.match(/^(Specific Aim|SA)\s*\d*:/i)) {
      const text = trimmedLine.replace(/\*\*/g, '')
      paragraphs.push(
        new Paragraph({
          children: [
            new TextRun({
              text,
              font: NIH_FONT_NAME,
              size: NIH_FONT_SIZE,
              bold: true
            })
          ],
          spacing: { before: 200, after: 80 }
        })
      )
    } else if (trimmedLine.startsWith('- ') || trimmedLine.startsWith('* ')) {
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
    } else if (trimmedLine.match(/^\d+\.\s/)) {
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
    } else {
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

      if (children.length > 0) {
        paragraphs.push(
          new Paragraph({
            children,
            spacing: { after: 80 }
          })
        )
      }
    }
  }

  return paragraphs
}

export async function generateDocx({ title, content, filename }: GenerateDocxOptions): Promise<void> {
  const paragraphs = parseContentToParagraphs(content)

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
            }
          }
        },
        footers: {
          default: new Footer({
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
        },
        children: [
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            children: [
              new TextRun({
                text: title,
                font: NIH_FONT_NAME,
                size: NIH_FONT_SIZE + 4,
                bold: true
              })
            ],
            spacing: { after: 240 }
          }),
          ...paragraphs
        ]
      }
    ]
  })

  const blob = await Packer.toBlob(doc)
  saveAs(blob, filename)
}

export function generatePdf(title: string, content: string): void {
  const printWindow = window.open('', '_blank')
  if (!printWindow) return

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>${title}</title>
      <style>
        body {
          font-family: "Times New Roman", Times, serif;
          font-size: 11pt;
          line-height: 1.5;
          margin: 0.5in;
          color: #000;
        }
        h1 { font-size: 14pt; font-weight: bold; margin: 16pt 0 8pt; }
        h2 { font-size: 12pt; font-weight: bold; margin: 14pt 0 7pt; }
        h3 { font-size: 11pt; font-weight: bold; margin: 12pt 0 6pt; }
        p { margin: 0 0 6pt; }
        ul { margin: 0 0 6pt; padding-left: 0.25in; }
        @media print {
          body { margin: 0.5in; }
        }
      </style>
    </head>
    <body>
      <h1>${title}</h1>
      ${content
        .split('\n')
        .map(line => {
          const t = line.trim()
          if (!t) return '<p>&nbsp;</p>'
          if (t.startsWith('### ')) return `<h3>${t.slice(4)}</h3>`
          if (t.startsWith('## ')) return `<h2>${t.slice(3)}</h2>`
          if (t.startsWith('# ')) return `<h1>${t.slice(2)}</h1>`
          if (t.startsWith('- ') || t.startsWith('* ')) return `<ul><li>${t.slice(2)}</li></ul>`
          return `<p>${t.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')}</p>`
        })
        .join('\n')}
    </body>
    </html>
  `)

  printWindow.document.close()
  printWindow.onload = () => {
    printWindow.print()
  }
}
