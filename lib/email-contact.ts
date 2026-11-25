export const CARE_CONTACT_NUMBER = '+15722124506'

const contactPhoneHtml = `<p style="margin-top:20px;font-size:13px;color:#555">Contact number: <a href="tel:${CARE_CONTACT_NUMBER}" style="color:#e57200">${CARE_CONTACT_NUMBER}</a></p>`

export function appendContactPhoneHtml(html: string) {
  if (html.includes(CARE_CONTACT_NUMBER)) return html
  return /<\/body\s*>/i.test(html)
    ? html.replace(/<\/body\s*>/i, `${contactPhoneHtml}</body>`)
    : `${html}${contactPhoneHtml}`
}

export function appendContactPhoneText(text: string) {
  if (text.replace(/\D/g, '').includes('15722124506')) return text
  return `${text.trimEnd()}\n\nContact number: ${CARE_CONTACT_NUMBER}`
}
