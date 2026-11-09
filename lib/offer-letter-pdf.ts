import { PDFDocument, StandardFonts, rgb, type PDFPage } from 'pdf-lib'
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

function wrap(text: string, max: number) {
  const lines: string[] = []
  for (const paragraph of text.split('\n')) {
    let line = ''
    for (const word of paragraph.split(/\s+/)) {
      if ((line + ' ' + word).trim().length > max) { lines.push(line); line = word } else line = (line + ' ' + word).trim()
    }
    lines.push(line)
  }
  return lines
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

  const paragraph = (text: string, textSize = 10, gap = 14.5) => {
    const lines = wrap(text, 84)
    const height = lines.length * gap + 8
    if (y - height < 75) newPage()
    lines.forEach((line, index) => page.drawText(line, { x: 55, y: y - index * gap, size: textSize, font, color: ink }))
    y -= height
  }

  const heading = (text: string) => {
    if (y - 50 < 75) newPage()
    y -= 6
    page.drawRectangle({ x: 48, y: y - 4, width: 4, height: 15, color: orange })
    page.drawText(text, { x: 58, y, size: 11, font: bold, color: navy })
    y -= 20
  }

  const bullets = (items: string[]) => {
    for (const item of items) {
      const lines = wrap(item, 80)
      const height = lines.length * 14.5 + 3
      if (y - height < 75) newPage()
      page.drawCircle({ x: 63, y: y + 3, size: 1.6, color: orange })
      lines.forEach((line, index) => page.drawText(line, { x: 72, y: y - index * 14.5, size: 10, font, color: ink }))
      y -= height
    }
    y -= 5
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

  heading('1. REMUNERATION')
  paragraph(`Your basic salary for this position will be ${salary}. In addition to your basic salary, you may be eligible for bonuses and allowances. The type, amount and conditions of each will be set out in your employment contract.`)

  heading('2. CONTRACT TERM')
  paragraph(`The position is offered on a ${input.contractType.toLowerCase()} basis for ${input.contractDuration}, starting on ${startDate}. The contract is renewable in accordance with CARE International policies. The full terms of employment will be set out in your employment contract.`)

  heading('3. WORK ARRANGEMENT AND EMPLOYING OFFICE')
  paragraph(`This is a remote role (${input.workArrangement}). Your appointment will be processed through the CARE International office in Rwanda and, where applicable, Cape Verde. Further details on how your employment will be administered will be explained during the onboarding and documentation stage.`)

  heading('4. CONDITIONS OF OFFER')
  paragraph('This offer is conditional upon:')
  bullets([
    'Satisfactory verification of academic and professional qualifications.',
    'Verification of references and employment history.',
    'Confirmation of eligibility to work in the applicable country of employment.',
    'Completion of required compliance, safeguarding and background checks.',
    'Submission and verification of all required onboarding documentation.',
  ])

  heading('5. DOCUMENT AND LANGUAGE REQUIREMENTS')
  paragraph('If your appointment proceeds, you will be required to submit copies of your documents, including relevant academic, professional and training certificates, in English, French and Portuguese. Where an original document is not available in one or more of these languages, you are responsible for arranging a professional translation.')
  paragraph('CARE International does not pay for translations upfront. Translation costs are reimbursed once you submit the receipts, together with the translated documents, in line with applicable organisational procedures. If you need documents translated into English, French or Portuguese, you may contact Lingua Bridge at info@linguab.com or visit https://linguab.com. Further details will be explained during onboarding and documentation.')

  heading('6. DOCUMENT SUBMISSION DEADLINE')
  paragraph(`All requested documents must be submitted by ${documentDeadline}. Failure to provide required documentation, or submission of documents that cannot be satisfactorily verified, may result in a delay, amendment or withdrawal of this conditional offer.`)

  heading('7. ACCEPTANCE')
  paragraph(`To accept this offer, please sign the acceptance page of this letter and return the scanned copy to Human Resources by ${acceptanceDeadline}. If acceptance is not received by the deadline, the offer may be considered to have lapsed.`)

  heading('8. IMPORTANT INFORMATION')
  paragraph('This conditional offer does not constitute a final appointment or employment contract. CARE International reserves the right to withdraw or amend this offer if any condition is not met or if information provided during the recruitment process is found to be inaccurate or incomplete.')
  paragraph('We look forward to completing the remaining requirements with you.')
  paragraph('Yours sincerely,')
  if (y - 90 < 75) newPage()
  y -= 4
  page.drawText('Reintje van Haeringen', { x: 55, y, size: 20, font: signatureFont, color: navy })
  y -= 10
  page.drawLine({ start: { x: 55, y }, end: { x: 235, y }, thickness: 0.8, color: navy })
  y -= 16
  paragraph('Reintje van Haeringen - Human Resources - CARE International', 9.5)
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
