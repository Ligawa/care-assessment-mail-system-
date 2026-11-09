import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from 'pdf-lib'
import fs from 'node:fs/promises'
import path from 'node:path'

export type OfferLetterInput = {
  applicantName: string
  jobTitle: string
  hrReference: string
  issueDate: Date
  startDate: string
  workArrangement: string
  department: string
  contractType: string
  contractDuration: string
  basicSalary: number
  documentDeadline: string
  acceptanceDeadline: string
}

export const HR_CONTACT = 'Reintje van Haeringen\nHuman Resources\nCARE International'

export function formatLongDate(value: string | Date) {
  const date = value instanceof Date ? value : new Date(`${value}T00:00:00Z`)
  if (Number.isNaN(date.getTime())) return String(value)
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })
}

export function formatMonthlySalary(amount: number) {
  return `USD ${amount.toLocaleString('en-US', { maximumFractionDigits: 2 })} per month`
}

export async function buildOfferLetterPdf(input: OfferLetterInput) {
  const pdf = await PDFDocument.create()
  const font = await pdf.embedFont(StandardFonts.Helvetica)
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold)
  const signatureFont = await pdf.embedFont(StandardFonts.TimesRomanItalic)
  const logo = await pdf.embedPng(await fs.readFile(path.join(process.cwd(), 'public/care-logo.png')))
  const watermark = await pdf.embedPng(await fs.readFile(path.join(process.cwd(), 'public/care-seal.png')))
  const stamp = await pdf.embedPng(await fs.readFile(path.join(process.cwd(), 'public/care-stamp.png')))
  const size: [number, number] = [595.28, 841.89]
  const navy = rgb(0.04, 0.16, 0.34)
  const orange = rgb(0.93, 0.39, 0.05)
  const ink = rgb(0.12, 0.14, 0.18)
  const muted = rgb(0.36, 0.4, 0.46)
  const pages: PDFPage[] = []
  let page = pdf.addPage(size)
  pages.push(page)
  let y = 742

  const header = () => {
    page.drawImage(logo, { x: 45, y: 774, width: 128, height: 42 })
    page.drawText('HUMAN RESOURCES', { x: 426, y: 794, size: 8, font: bold, color: navy })
    page.drawText('CONDITIONAL OFFER', { x: 418, y: 781, size: 7, font, color: muted })
    page.drawLine({ start: { x: 45, y: 766 }, end: { x: 550, y: 766 }, thickness: 2, color: orange })
    page.drawImage(watermark, { x: 198, y: 230, width: 200, height: 200, opacity: 0.075 })
  }
  header()

  const newPage = () => {
    page = pdf.addPage(size)
    pages.push(page)
    y = 742
    header()
  }

  const textWidth = 490
  const wrap = (text: string, textFont: PDFFont, textSize: number, maxWidth: number) => {
    const lines: string[] = []
    for (const paragraphText of text.split('\n')) {
      let line = ''
      for (const word of paragraphText.split(/\s+/).filter(Boolean)) {
        const candidate = line ? `${line} ${word}` : word
        if (textFont.widthOfTextAtSize(candidate, textSize) > maxWidth && line) { lines.push(line); line = word } else line = candidate
      }
      lines.push(line)
    }
    return lines
  }

  const paragraph = (text: string, textSize = 10, gap = 14.5) => {
    const lines = wrap(text, font, textSize, textWidth)
    const height = lines.length * gap + 8
    if (y - height < 75) newPage()
    lines.forEach((line, index) => page.drawText(line, { x: 55, y: y - index * gap, size: textSize, font, color: ink }))
    y -= height
  }

  type Clause = { title: string; paragraphs: string[]; items?: string[]; highlight?: [string, string] }
  let clauseNumber = 0
  const clauseBlock = (clause: Clause) => {
    clauseNumber += 1
    const left = 48
    const width = 502
    const inner = width - 38
    const bodySize = 9.5
    const gap = 13.5
    const paragraphLines = clause.paragraphs.map(text => wrap(text, font, bodySize, inner))
    const itemLines = (clause.items ?? []).map(text => wrap(text, font, bodySize, inner - 14))
    const highlightLines = clause.highlight ? wrap(clause.highlight[1], bold, 10, inner - 20) : []
    const headerHeight = 28
    const height = headerHeight + 12
      + paragraphLines.reduce((sum, lines) => sum + lines.length * gap + 6, 0)
      + itemLines.reduce((sum, lines) => sum + lines.length * gap + 3, 0) + (itemLines.length ? 4 : 0)
      + (clause.highlight ? highlightLines.length * 14 + 30 : 0)
      + 8
    if (y - height < 62) newPage()
    const top = y + 10
    const bottom = top - height
    page.drawRectangle({ x: left, y: bottom, width, height, borderColor: rgb(0.82, 0.85, 0.9), borderWidth: 0.8 })
    page.drawRectangle({ x: left, y: top - headerHeight, width, height: headerHeight, color: rgb(0.93, 0.95, 0.98), opacity: 0.85 })
    page.drawRectangle({ x: left, y: bottom, width: 4, height, color: orange })
    page.drawCircle({ x: left + 24, y: top - headerHeight / 2, size: 9, color: navy })
    const label = String(clauseNumber)
    page.drawText(label, { x: left + 24 - bold.widthOfTextAtSize(label, 9) / 2, y: top - headerHeight / 2 - 3.2, size: 9, font: bold, color: rgb(1, 1, 1) })
    page.drawText(clause.title.toUpperCase(), { x: left + 40, y: top - headerHeight / 2 - 3.6, size: 10.5, font: bold, color: navy })
    let cursor = top - headerHeight - 16
    const textX = left + 20
    paragraphLines.forEach(lines => {
      lines.forEach((line, index) => page.drawText(line, { x: textX, y: cursor - index * gap, size: bodySize, font, color: ink }))
      cursor -= lines.length * gap + 6
    })
    itemLines.forEach(lines => {
      page.drawCircle({ x: textX + 4, y: cursor + 3, size: 1.7, color: orange })
      lines.forEach((line, index) => page.drawText(line, { x: textX + 14, y: cursor - index * gap, size: bodySize, font, color: ink }))
      cursor -= lines.length * gap + 3
    })
    if (clause.highlight) {
      cursor -= 6
      const boxHeight = highlightLines.length * 14 + 20
      page.drawRectangle({ x: textX, y: cursor - boxHeight + 12, width: inner, height: boxHeight, color: rgb(1, 0.96, 0.92), borderColor: rgb(0.95, 0.75, 0.55), borderWidth: 0.6 })
      page.drawText(clause.highlight[0].toUpperCase(), { x: textX + 10, y: cursor - 2, size: 7, font: bold, color: orange })
      highlightLines.forEach((line, index) => page.drawText(line, { x: textX + 10, y: cursor - 16 - index * 14, size: 10, font: bold, color: navy }))
    }
    y = bottom - 14
  }

  const termsTable = (rows: [string, string][]) => {
    const rowHeight = 22
    if (y - rows.length * rowHeight < 75) newPage()
    const top = y + 14
    page.drawRectangle({ x: 48, y: top - rows.length * rowHeight, width: 502, height: rows.length * rowHeight, color: rgb(0.97, 0.97, 0.98), borderColor: rgb(0.85, 0.87, 0.9), borderWidth: 0.8 })
    rows.forEach(([key, value], index) => {
      const rowY = top - (index + 1) * rowHeight
      if (index > 0) page.drawLine({ start: { x: 48, y: rowY + rowHeight }, end: { x: 550, y: rowY + rowHeight }, thickness: 0.5, color: rgb(0.85, 0.87, 0.9) })
      page.drawText(key.toUpperCase(), { x: 58, y: rowY + 8, size: 7.5, font: bold, color: muted })
      page.drawText(value.length > 62 ? `${value.slice(0, 59)}...` : value, { x: 205, y: rowY + 7.5, size: 9.5, font: index === 5 ? bold : font, color: index === 5 ? navy : ink })
    })
    y = top - rows.length * rowHeight - 18
  }

  const salary = formatMonthlySalary(input.basicSalary)
  const startDate = formatLongDate(input.startDate)
  const documentDeadline = formatLongDate(input.documentDeadline)
  const acceptanceDeadline = formatLongDate(input.acceptanceDeadline)

  page.drawText('CONDITIONAL OFFER OF EMPLOYMENT', { x: 55, y, size: 18, font: bold, color: navy })
  y -= 22
  page.drawText(`Reference: ${input.hrReference}      Date: ${formatLongDate(input.issueDate)}`, { x: 55, y, size: 9, font, color: muted })
  y -= 28

  termsTable([
    ['Candidate', input.applicantName],
    ['Position', input.jobTitle],
    ['Department / programme', input.department],
    ['Work arrangement', input.workArrangement],
    ['Contract type', `${input.contractType}, ${input.contractDuration}`],
    ['Basic salary', salary],
    ['Proposed start date', startDate],
  ])

  paragraph(`Dear ${input.applicantName},`)
  paragraph('Following completion of the applicable recruitment and selection process, including your interview and skills assessment, CARE International is pleased to offer you the position of ' + input.jobTitle + '. This offer is conditional upon satisfactory completion of the pre-employment and onboarding requirements set out in this letter.')

  const clauses: Clause[] = [
    {
      title: 'Remuneration',
      paragraphs: [
        `Your basic salary for this position is set out below. It is quoted in United States dollars (USD) and is a monthly amount, not an annual figure.`,
        'In addition to your basic salary, you may be eligible for bonuses and allowances. The type, amount and conditions of each will be set out in your employment contract. Nothing in this letter guarantees any bonus or allowance.',
        'Applicable taxes, social contributions and statutory deductions depend on the country through which your employment is administered, and will be explained in your employment contract.',
      ],
      highlight: ['Basic salary', salary],
    },
    {
      title: 'Position and reporting',
      paragraphs: [
        `You are offered the position of ${input.jobTitle} within ${input.department}. Your detailed responsibilities, performance objectives and reporting line will be confirmed in your job description and employment contract.`,
        'You are expected to carry out your duties in line with CARE International policies, including its safeguarding, code of conduct, anti-fraud and confidentiality requirements.',
      ],
    },
    {
      title: 'Contract term',
      paragraphs: [
        `The position is offered on a ${input.contractType.toLowerCase()} basis for ${input.contractDuration}, starting on ${startDate}. The start date remains subject to all conditions in this letter being met.`,
        'The contract is renewable in accordance with CARE International policies, funding availability and satisfactory performance. Renewal is not automatic. The full terms of employment, including notice periods and any probation period, will be set out in your employment contract.',
      ],
    },
    {
      title: 'Work arrangement and employing office',
      paragraphs: [
        `This role is offered on the following working arrangement: ${input.workArrangement}. Where the role is remote, you are responsible for a reliable internet connection and a suitable, secure working environment.`,
        'Your appointment will be processed through the CARE International office in Rwanda and, where applicable, Cape Verde. Further details on how your employment will be administered will be explained during the onboarding and documentation stage.',
      ],
    },
    {
      title: 'Conditions of offer',
      paragraphs: ['This offer is conditional upon each of the following being completed to the satisfaction of CARE International:'],
      items: [
        'Verification of academic and professional qualifications: the certificates you listed must be genuine and match the information you provided during recruitment.',
        'Verification of references and employment history: we will contact your referees and may confirm your previous roles and dates of employment.',
        'Confirmation of eligibility to work in the applicable country of employment.',
        'Completion of required compliance, safeguarding and background checks.',
        'Submission and verification of all required onboarding documentation.',
      ],
    },
    {
      title: 'Document and language requirements',
      paragraphs: [
        'If your appointment proceeds, you must submit copies of your documents, including relevant academic, professional and training certificates, in English, French and Portuguese.',
        'Where an original document is not available in one or more of these languages, you are responsible for arranging a professional translation and submitting it together with the original.',
      ],
    },
    {
      title: 'Translation costs and support',
      paragraphs: [
        'CARE International does not pay for translations upfront. Translation costs are reimbursed once you submit the receipts, together with the translated documents, in line with applicable organisational procedures.',
        'If you need documents translated into English, French or Portuguese, you may contact Lingua Bridge at info@linguab.com or visit https://linguab.com. Further details will be explained during onboarding and documentation.',
      ],
    },
    {
      title: 'Document submission deadline',
      paragraphs: [
        'All requested documents must be submitted to Human Resources by the date below.',
        'Failure to provide required documentation, or submission of documents that cannot be satisfactorily verified, may result in a delay, amendment or withdrawal of this conditional offer.',
      ],
      highlight: ['Submit documents by', documentDeadline],
    },
    {
      title: 'Acceptance',
      paragraphs: [
        'To accept this offer, please sign the acceptance page of this letter in ink and return the scanned copy to Human Resources, using the reply address of the email that accompanied this offer.',
        'If acceptance is not received by the deadline below, the offer may be considered to have lapsed.',
      ],
      highlight: ['Accept by', acceptanceDeadline],
    },
    {
      title: 'Important information',
      paragraphs: [
        'This conditional offer does not constitute a final appointment or employment contract. A formal contract will only be issued once every condition in this letter has been met.',
        'CARE International reserves the right to withdraw or amend this offer if any condition is not met, or if information provided during the recruitment process is found to be inaccurate or incomplete.',
      ],
    },
  ]
  clauses.forEach(clauseBlock)

  if (y - 115 < 62) newPage()
  paragraph('We look forward to completing the remaining requirements with you.')
  paragraph('Yours sincerely,')
  if (y - 90 < 55) newPage()
  y -= 4
  page.drawText('Reintje van Haeringen', { x: 55, y, size: 20, font: signatureFont, color: navy })
  y -= 10
  page.drawLine({ start: { x: 55, y }, end: { x: 235, y }, thickness: 0.8, color: navy })
  y -= 16
  paragraph('Reintje van Haeringen - Human Resources - CARE International', 9.5, 12)
  paragraph('CARE International is committed to safeguarding and to the highest standards of integrity, accountability and respect.', 8.5, 12)

  newPage()
  page.drawImage(stamp, { x: 405, y: 535, width: 105, height: 105, opacity: 0.72 })
  page.drawText('APPLICANT ACCEPTANCE', { x: 55, y, size: 15, font: bold, color: navy })
  y -= 30
  paragraph(`I, ${input.applicantName}, acknowledge receipt of this conditional offer for the position of ${input.jobTitle} at a basic salary of ${salary}, and confirm my intention to accept the offer subject to the conditions stated above.`)
  y -= 16
  const signatureRow = (labelText: string, value?: string) => {
    page.drawText(labelText, { x: 55, y, size: 8, font: bold, color: muted })
    if (value) page.drawText(value, { x: 200, y, size: 9.5, font, color: ink })
    else page.drawLine({ start: { x: 200, y: y - 3 }, end: { x: 400, y: y - 3 }, thickness: 0.8, color: ink })
    y -= 34
  }
  signatureRow('Applicant name', input.applicantName)
  signatureRow('Applicant signature (ink)')
  signatureRow('Signature date')
  signatureRow('Acceptance deadline', acceptanceDeadline)
  y -= 6
  paragraph('Return instructions: print this letter, sign the acceptance page in ink, scan the complete signed document, and email the scanned copy back to Human Resources using the reply address of the email that accompanied this offer.')

  pages.forEach((target, index) => {
    target.drawLine({ start: { x: 45, y: 45 }, end: { x: 550, y: 45 }, thickness: 0.7, color: rgb(0.8, 0.82, 0.85) })
    target.drawText(`CARE International  |  ${input.hrReference}  |  Confidential recruitment document`, { x: 45, y: 30, size: 7, font, color: muted })
    target.drawText(`Page ${index + 1} of ${pages.length}`, { x: 487, y: 30, size: 7, font, color: muted })
  })

  return pdf.save()
}
