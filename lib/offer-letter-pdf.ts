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

  type DocRow = { name: string; detail: string; status: 'Required' | 'If available'; number?: number }
  type Block =
    | { kind: 'p'; text: string }
    | { kind: 'sub'; heading: string; text: string }
    | { kind: 'bullets'; items: string[] }
    | { kind: 'steps'; items: string[] }
    | { kind: 'highlight'; label: string; text: string }
    | { kind: 'docs'; rows: DocRow[] }
  type Clause = { title: string; blocks: Block[] }

  const boxLeft = 48
  const boxWidth = 502
  const inner = boxWidth - 38
  const bodySize = 9.5
  const gap = 13.5
  const headerHeight = 28
  const languages = ['English', 'French', 'Portuguese']
  const docRowHeight = (row: DocRow) => 52 + wrap(row.detail, font, 9, inner - 46).length * gap

  const measureBlock = (block: Block) => {
    switch (block.kind) {
      case 'p': return wrap(block.text, font, bodySize, inner).length * gap + 6
      case 'sub': return 13 + wrap(block.text, font, bodySize, inner).length * gap + 6
      case 'bullets':
      case 'steps': return block.items.reduce((sum, item) => sum + wrap(item, font, bodySize, inner - 16).length * gap + 3, 0) + 4
      case 'highlight': return wrap(block.text, bold, 10, inner - 20).length * 14 + 34
      case 'docs': return block.rows.reduce((sum, row) => sum + docRowHeight(row) + 8, 0)
    }
  }

  const drawBlock = (block: Block, startCursor: number, textX: number) => {
    let cursor = startCursor
    switch (block.kind) {
      case 'p': {
        const lines = wrap(block.text, font, bodySize, inner)
        lines.forEach((line, index) => page.drawText(line, { x: textX, y: cursor - index * gap, size: bodySize, font, color: ink }))
        return cursor - (lines.length * gap + 6)
      }
      case 'sub': {
        page.drawText(block.heading, { x: textX, y: cursor, size: bodySize, font: bold, color: navy })
        cursor -= 13
        const lines = wrap(block.text, font, bodySize, inner)
        lines.forEach((line, index) => page.drawText(line, { x: textX, y: cursor - index * gap, size: bodySize, font, color: ink }))
        return cursor - (lines.length * gap + 6)
      }
      case 'bullets':
      case 'steps': {
        block.items.forEach((item, itemIndex) => {
          const lines = wrap(item, font, bodySize, inner - 16)
          if (block.kind === 'bullets') page.drawCircle({ x: textX + 4, y: cursor + 3, size: 1.7, color: orange })
          else page.drawText(`${itemIndex + 1}.`, { x: textX, y: cursor, size: bodySize, font: bold, color: orange })
          lines.forEach((line, index) => page.drawText(line, { x: textX + 16, y: cursor - index * gap, size: bodySize, font, color: ink }))
          cursor -= lines.length * gap + 3
        })
        return cursor - 4
      }
      case 'highlight': {
        const lines = wrap(block.text, bold, 10, inner - 20)
        const boxHeight = lines.length * 14 + 20
        cursor -= 6
        page.drawRectangle({ x: textX, y: cursor - boxHeight + 12, width: inner, height: boxHeight, color: rgb(1, 0.96, 0.92), borderColor: rgb(0.95, 0.75, 0.55), borderWidth: 0.6 })
        page.drawText(block.label.toUpperCase(), { x: textX + 10, y: cursor - 2, size: 7, font: bold, color: orange })
        lines.forEach((line, index) => page.drawText(line, { x: textX + 10, y: cursor - 16 - index * 14, size: 10, font: bold, color: navy }))
        return cursor - boxHeight - 2
      }
      case 'docs': {
        block.rows.forEach((row, rowIndex) => {
          const rowHeight = docRowHeight(row)
          const cardTop = cursor + 8
          page.drawRectangle({ x: textX, y: cardTop - rowHeight, width: inner, height: rowHeight, color: rgb(0.97, 0.98, 1), borderColor: rgb(0.82, 0.85, 0.9), borderWidth: 0.7 })
          page.drawCircle({ x: textX + 18, y: cardTop - 15, size: 9, color: navy })
          const badge = String(row.number ?? rowIndex + 1)
          page.drawText(badge, { x: textX + 18 - bold.widthOfTextAtSize(badge, 9) / 2, y: cardTop - 18.2, size: 9, font: bold, color: rgb(1, 1, 1) })
          page.drawText(row.name, { x: textX + 36, y: cardTop - 18, size: 10, font: bold, color: navy })
          const lines = wrap(row.detail, font, 9, inner - 46)
          lines.forEach((line, index) => page.drawText(line, { x: textX + 36, y: cardTop - 33 - index * gap, size: 9, font, color: ink }))
          const chipY = cardTop - 33 - (lines.length - 1) * gap - 22
          let chipX = textX + 36
          languages.forEach(language => {
            const chipWidth = bold.widthOfTextAtSize(language, 7) + 14
            page.drawRectangle({ x: chipX, y: chipY - 4, width: chipWidth, height: 13, color: rgb(1, 1, 1), borderColor: navy, borderWidth: 0.6 })
            page.drawText(language, { x: chipX + 7, y: chipY, size: 7, font: bold, color: navy })
            chipX += chipWidth + 6
          })
          const statusWidth = bold.widthOfTextAtSize(row.status.toUpperCase(), 7) + 16
          const required = row.status === 'Required'
          page.drawRectangle({ x: textX + inner - statusWidth - 10, y: chipY - 4, width: statusWidth, height: 13, color: required ? orange : rgb(0.9, 0.92, 0.95) })
          page.drawText(row.status.toUpperCase(), { x: textX + inner - statusWidth - 2, y: chipY, size: 7, font: bold, color: required ? rgb(1, 1, 1) : muted })
          cursor -= rowHeight + 8
        })
        return cursor
      }
    }
  }

  let clauseNumber = 0
  const bottomMargin = 56
  const clauseBlock = (clause: Clause) => {
    clauseNumber += 1
    const remaining = clause.blocks.flatMap((block): Block[] => block.kind === 'docs' ? block.rows.map((row, index) => ({ kind: 'docs', rows: [{ ...row, number: index + 1 }] })) : [block])
    let continued = false
    while (remaining.length) {
      const available = y + 10 - bottomMargin
      const base = headerHeight + 12 + 8
      if (base + measureBlock(remaining[0]) > available && y < 742) { newPage(); continue }
      const chosen: Block[] = []
      let used = base
      while (remaining.length) {
        const blockHeight = measureBlock(remaining[0])
        if (used + blockHeight > available && chosen.length > 0) break
        chosen.push(remaining.shift() as Block)
        used += blockHeight
      }
      const top = y + 10
      const bottom = top - used
      page.drawRectangle({ x: boxLeft, y: bottom, width: boxWidth, height: used, borderColor: rgb(0.82, 0.85, 0.9), borderWidth: 0.8 })
      page.drawRectangle({ x: boxLeft, y: top - headerHeight, width: boxWidth, height: headerHeight, color: rgb(0.93, 0.95, 0.98), opacity: 0.85 })
      page.drawRectangle({ x: boxLeft, y: bottom, width: 4, height: used, color: orange })
      page.drawCircle({ x: boxLeft + 24, y: top - headerHeight / 2, size: 9, color: navy })
      const label = String(clauseNumber)
      page.drawText(label, { x: boxLeft + 24 - bold.widthOfTextAtSize(label, 9) / 2, y: top - headerHeight / 2 - 3.2, size: 9, font: bold, color: rgb(1, 1, 1) })
      page.drawText(`${clause.title.toUpperCase()}${continued ? ' (CONTINUED)' : ''}`, { x: boxLeft + 40, y: top - headerHeight / 2 - 3.6, size: 10.5, font: bold, color: navy })
      let cursor = top - headerHeight - 16
      chosen.forEach(block => { cursor = drawBlock(block, cursor, boxLeft + 20) })
      y = bottom - 14
      continued = true
    }
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
      page.drawText(value.length > 62 ? `${value.slice(0, 59)}...` : value, { x: 205, y: rowY + 7.5, size: 9.5, font: key === 'Basic salary' ? bold : font, color: key === 'Basic salary' ? navy : ink })
    })
    y = top - rows.length * rowHeight - 18
  }

  const isReceivables = /receivable/i.test(input.jobTitle)
  const roleResponsibilities = isReceivables
    ? [
        'Customer and donor invoicing: prepare, review and issue accurate invoices, grant billings and debit notes on time, in line with agreed contract and donor terms.',
        'Receivables ledger management: record all invoices, receipts and adjustments in the accounting system, and keep the accounts receivable sub-ledger complete, accurate and up to date.',
        'Cash application: match incoming payments and bank receipts to the correct invoices and accounts, investigate unidentified receipts and resolve unapplied cash promptly.',
        'Collections and follow-up: monitor ageing balances, contact debtors and funding partners about overdue amounts, agree payment plans and escalate disputed or long-outstanding items to management.',
        'Reconciliation: reconcile the receivables sub-ledger to the general ledger and to partner and donor statements every month, and clear reconciling items without delay.',
        'Month-end and year-end close: prepare receivables schedules, accruals, ageing analysis and supporting documentation for the monthly close, internal review and external audit.',
        'Reporting: produce periodic receivables, ageing and cash-forecast reports for Finance management, and flag risks to recoverability such as doubtful or write-off balances.',
        'Compliance and controls: apply CARE International financial policies, segregation of duties, donor compliance rules and anti-fraud controls, and keep a complete, auditable record of every transaction.',
        'Audit support: respond to internal and external auditor requests accurately and within agreed timelines, and implement agreed audit recommendations.',
        'Collaboration: work with Programmes, Grants, Procurement and Treasury colleagues across country offices to resolve billing queries and improve receivables processes.',
      ]
    : [
        `Deliver the core duties of the ${input.jobTitle} position to the standard and timelines agreed with your line manager, within ${input.department}.`,
        'Plan, organise and complete assigned work, keeping accurate records and documentation for every task and decision.',
        'Prepare regular reports, updates and analysis on your area of work for your line manager and, where required, for donors and partners.',
        'Apply CARE International policies, procedures, internal controls and donor requirements consistently in all of your work.',
        'Collaborate with colleagues across country offices, programmes and support functions, sharing information openly and responding to requests promptly.',
        'Support internal reviews, audits and quality assurance activities, and act on agreed recommendations.',
        'Contribute to continuous improvement of processes, tools and ways of working in your team.',
      ]

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
    ['Processing office', 'CARE International, Kigali, Rwanda'],
    ['Duty station', 'Kigali, Rwanda (working remotely)'],
    ['Contract type', `${input.contractType}, ${input.contractDuration}`],
    ['Basic salary', salary],
    ['Proposed start date', startDate],
  ])

  paragraph(`Dear ${input.applicantName},`)
  paragraph('Following completion of the applicable recruitment and selection process, including your interview and skills assessment, CARE International is pleased to offer you the position of ' + input.jobTitle + '. This offer is conditional upon satisfactory completion of the pre-employment and onboarding requirements set out in this letter.')

  const clauses: Clause[] = [
    {
      title: 'Position and reporting',
      blocks: [
        { kind: 'p', text: `CARE International offers you the position of ${input.jobTitle} within ${input.department}. This offer follows your application, your interview and your completed skills assessment, and reflects our confidence in your suitability for the role.` },
        { kind: 'sub', heading: 'Reporting line', text: 'You will report to the line manager named in your job description and employment contract. Your day-to-day work will be directed by that manager through regular one-to-one meetings, agreed work plans and performance objectives.' },
        { kind: 'sub', heading: 'Standards of conduct', text: 'You are expected to perform your duties in line with CARE International policies, including its code of conduct, safeguarding, anti-fraud, conflict of interest and confidentiality requirements, and to uphold the standards of integrity, accountability and respect that CARE International expects of every staff member.' },
      ],
    },
    {
      title: 'Scope of work and key responsibilities',
      blocks: [
        { kind: 'p', text: `As ${input.jobTitle}, you will be accountable for the following scope of work. This list describes the main responsibilities of the role and is not exhaustive.` },
        { kind: 'bullets', items: roleResponsibilities },
        { kind: 'sub', heading: 'Performance expectations', text: 'Your work will be measured against objectives agreed with your line manager, including accuracy, timeliness, quality of records, compliance with policy and the quality of your working relationships. Performance will be reviewed formally during probation and at least once a year.' },
        { kind: 'sub', heading: 'Additional duties', text: 'You may reasonably be asked to carry out other duties consistent with your role, skills and experience, including supporting colleagues, covering absences and contributing to organisation-wide initiatives. Your detailed job description and deliverables will be confirmed in your employment contract.' },
      ],
    },
    {
      title: 'Processing office and duty station',
      blocks: [
        { kind: 'p', text: 'This section states where your employment is processed and where you are based. Please read it carefully, as it affects your administration, travel and reporting.' },
        { kind: 'highlight', label: 'Current processing office', text: 'CARE International, Kigali, Rwanda' },
        { kind: 'sub', heading: 'Duty station', text: 'Your official duty station is Kigali, Rwanda. All administrative matters, including contract processing, onboarding, payroll coordination and human resources support, are currently handled by the Kigali office.' },
        { kind: 'sub', heading: 'Remote working from your location', text: 'You will perform your duties remotely and are not required to relocate to Kigali. Remote working does not change your duty station: you remain a member of the Kigali office team and are bound by its policies and reporting arrangements.' },
        { kind: 'sub', heading: 'Attendance at meetings, functions and events in Rwanda', text: 'From time to time you may be required to travel to Rwanda to attend meetings, trainings, workshops, functions and events. You will be given reasonable notice. Travel and related costs for such assignments will be covered under CARE International travel policy, and you must hold the travel documents and visas needed to enter Rwanda.' },
        { kind: 'sub', heading: 'Possible transfer to the Cape Verde (Praia) office', text: 'After completing one (1) year of service, you may be transferred to the CARE International office in Praia, Cape Verde. If transferred, you will continue to work remotely, but your reporting line, administration and processing office will move to the Praia office. Any transfer will depend on operational need, funding and performance, and will be confirmed to you in writing with reasonable notice.' },
        { kind: 'sub', heading: 'Effect of a transfer', text: 'A transfer to Praia does not create a new employment or restart your service. Your other terms continue unless varied in writing. Applicable legal, tax and payroll arrangements may change with the processing office, and Human Resources will explain these before the transfer takes effect.' },
      ],
    },
    {
      title: 'Remuneration',
      blocks: [
        { kind: 'p', text: 'Your basic salary for this position is stated below. It is quoted in United States dollars (USD) and is a monthly amount, not an annual figure.' },
        { kind: 'highlight', label: 'Basic salary', text: salary },
        { kind: 'sub', heading: 'Payment', text: 'Salary is paid monthly in arrears through the payroll arrangement confirmed in your employment contract. Payment details, the payment currency and any applicable bank requirements will be confirmed during onboarding.' },
        { kind: 'sub', heading: 'Bonuses and allowances', text: 'Depending on your role, location and contract, you may be eligible for bonuses and allowances. The type, amount, eligibility rules and conditions of each will be set out in your employment contract. Nothing in this letter guarantees any bonus or allowance.' },
        { kind: 'sub', heading: 'Taxes and deductions', text: 'Applicable income tax, social security contributions and other statutory deductions depend on the country through which your employment is administered. These will be explained in your employment contract and are your responsibility to the extent required by law.' },
      ],
    },
    {
      title: 'Contract term and renewal',
      blocks: [
        { kind: 'p', text: `The position is offered on a ${input.contractType.toLowerCase()} basis for ${input.contractDuration}, with a proposed start date of ${startDate}. The start date remains subject to every condition in this letter being met, and may move if documents or checks are delayed.` },
        { kind: 'sub', heading: 'Renewal', text: 'The contract may be renewed in accordance with CARE International policies, funding availability, operational need and satisfactory performance. Renewal is not automatic and nothing in this letter creates an expectation of renewal or permanent employment.' },
        { kind: 'sub', heading: 'Probation and notice', text: 'Any probation period, notice period, leave entitlement, working hours and termination provisions will be set out in your formal employment contract, which will be issued only after all conditions in this letter have been satisfied.' },
      ],
    },
    {
      title: 'Work arrangement',
      blocks: [
        { kind: 'p', text: `This role is offered on the following working arrangement: ${input.workArrangement}. Your processing office is Kigali, Rwanda, and your duty station is Kigali, Rwanda, as set out above.` },
        { kind: 'sub', heading: 'Employment administration', text: 'Human Resources will confirm how your employment will be administered, including the applicable legal and payroll arrangements, during onboarding and documentation.' },
        { kind: 'sub', heading: 'Remote working responsibilities', text: 'Where the role is remote, you are responsible for a reliable internet connection, a suitable and secure working environment, and being available during agreed working hours. You must protect CARE International information and systems and follow its information security rules.' },
      ],
    },
    {
      title: 'Conditions of this offer',
      blocks: [
        { kind: 'p', text: 'This offer is conditional. It becomes a final appointment only when each condition below has been completed to the satisfaction of CARE International:' },
        { kind: 'bullets', items: [
          'Verification of qualifications: every academic and professional certificate you declared must be genuine, issued by a recognised institution, and consistent with the information you gave during recruitment.',
          'Verification of references and employment history: we will contact your referees and may confirm your previous roles, responsibilities and dates of employment.',
          'Eligibility to work: you must confirm that you are legally able to work in, or be engaged from, the applicable country of employment.',
          'Compliance checks: you must complete CARE International safeguarding, conduct and background screening requirements.',
          'Pre-deployment documents: you must submit and have verified every document listed in the Pre-deployment Requirements section of this letter.',
        ] },
      ],
    },
    {
      title: 'Pre-deployment requirements',
      blocks: [
        { kind: 'p', text: 'Before you can be deployed, you must provide the documents listed below. Every document must be provided in English, French and Portuguese. Where the original is issued in only one language, you must supply translations into the other two languages, produced by an internationally sworn translator, together with the original.' },
        { kind: 'docs', rows: [
          { name: 'Primary / basic school certificate', detail: 'Certificate of completion of primary or basic education, or the equivalent leaving certificate issued by the school or national examination authority.', status: 'Required' },
          { name: 'Secondary school certificate', detail: 'Certificate of completion of secondary education (for example O-Level, A-Level, high school diploma, baccalaureate or the national equivalent), with the results transcript where one was issued.', status: 'Required' },
          { name: 'Tertiary certificates', detail: 'All diplomas, degrees and professional certificates you declared during application processing. Each must match the qualifications listed in your application so that CARE International can verify them with the issuing institution.', status: 'Required' },
          { name: 'Police clearance document', detail: 'A recent police clearance certificate (certificate of good conduct) from your country of residence, confirming you have no criminal record that would prevent your engagement.', status: 'If available' },
          { name: 'Tax documents', detail: 'Your tax identification number or tax registration document and, where issued in your country, a recent tax clearance or compliance certificate.', status: 'If available' },
        ] },
        { kind: 'sub', heading: 'Documents marked "If available"', text: 'If a police clearance or tax document cannot be issued in your country, or cannot be obtained before the deadline, tell Human Resources in writing before the deadline, explaining why and what you have already applied for. Human Resources will advise on an alternative arrangement.' },
        { kind: 'sub', heading: 'Quality of copies', text: 'Submit clear, complete and legible scanned copies in PDF or image format. Each page, stamp and signature must be visible. Name each file clearly, for example "Secondary certificate - French". Documents that are cropped, unreadable or incomplete will be returned for resubmission.' },
        { kind: 'highlight', label: 'Submit all documents by', text: documentDeadline },
      ],
    },
    {
      title: 'Languages, translation and costs',
      blocks: [
        { kind: 'p', text: 'English, French and Portuguese are all required because CARE International works across offices and partners that operate in different languages, and records must be verifiable in each.' },
        { kind: 'sub', heading: 'Translation costs', text: 'CARE International does not pay for translations upfront. Translation costs are reimbursed once you submit the translation receipts, together with the translated documents, in line with applicable organisational procedures. Keep every receipt.' },
        { kind: 'sub', heading: 'Sworn translation requirement', text: 'All documents must be translated by an internationally sworn translator. Translations that are not produced and certified by an internationally sworn translator will not be accepted and will be returned for resubmission. Each translation must be complete, accurate and carry the translator\'s stamp or certification.' },
        { kind: 'sub', heading: 'Translation support', text: 'If you need documents translated into English, French or Portuguese, you may contact Lingua Bridge at info@linguab.com or visit https://linguab.com. Further details will be explained during onboarding and documentation.' },
      ],
    },
    {
      title: 'Document submission and verification',
      blocks: [
        { kind: 'sub', heading: 'How to submit', text: 'Reply to the email that accompanied this offer, quoting your HR reference, and attach your documents. If your files are too large for one email, send them in several emails with the same reference in each subject line.' },
        { kind: 'sub', heading: 'Verification', text: 'CARE International may contact issuing institutions, referees and authorities to verify any document. By accepting this offer you authorise these checks. Original documents may be requested at a later stage.' },
        { kind: 'sub', heading: 'If documents are late or cannot be verified', text: 'Failure to provide the required documentation by the deadline, or submission of documents that cannot be satisfactorily verified, may result in a delay to your start date, an amendment of this offer or its withdrawal. If you expect a delay, contact Human Resources before the deadline.' },
        { kind: 'sub', heading: 'Confidentiality of your information', text: 'Documents you provide are used only for recruitment, verification, onboarding and employment administration, are handled confidentially, and are shared only with people who need them for those purposes.' },
      ],
    },
    {
      title: 'How to accept this offer',
      blocks: [
        { kind: 'p', text: 'To accept, follow the steps below. Acceptance confirms your intention to proceed; it does not replace the pre-deployment requirements.' },
        { kind: 'steps', items: [
          'Read the whole letter carefully, including every clause above.',
          'Print the letter and sign the Applicant Acceptance page in ink.',
          'Scan the complete signed document clearly, with all pages in order.',
          'Email the scanned copy to Human Resources by replying to the email that accompanied this offer.',
          'Submit your pre-deployment documents by the document deadline above.',
        ] },
        { kind: 'highlight', label: 'Accept by', text: acceptanceDeadline },
        { kind: 'p', text: 'If acceptance is not received by this date, the offer may be considered to have lapsed.' },
      ],
    },
    {
      title: 'Withdrawal and important information',
      blocks: [
        { kind: 'p', text: 'This conditional offer does not constitute a final appointment or employment contract. A formal contract will be issued only once every condition in this letter has been met and confirmed by Human Resources.' },
        { kind: 'p', text: 'CARE International reserves the right to withdraw or amend this offer if any condition is not met, if a document is found to be false, misleading or altered, or if information provided during the recruitment process is found to be inaccurate or incomplete.' },
        { kind: 'p', text: 'If you have questions about any part of this letter, reply to the accompanying email and quote your HR reference. Please ask before signing if anything is unclear.' },
      ],
    },
  ]
  clauses.forEach(clauseBlock)

  if (y - 190 < 62) newPage()
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
  paragraph(`I understand that I must submit all pre-deployment documents (school certificates, tertiary certificates, and police clearance and tax documents where available) in English, French and Portuguese by ${documentDeadline}.`)
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
