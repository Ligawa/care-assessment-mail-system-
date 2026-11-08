const LOGO = 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Care%20Intl%20logo-8dXiV9R7mb3d8yCbmDLtahqHcQJ2Xm.png'

export function resolveReminderDeadline(existing?: string | null) {
  const today = new Date().toISOString().slice(0, 10)
  if (existing && existing >= today) return { isoDate: existing, extended: false }
  const next = new Date(); next.setDate(next.getDate() + 1)
  return { isoDate: next.toISOString().slice(0, 10), extended: true }
}

export function formatDeadline(isoDate: string) {
  return new Date(`${isoDate}T00:00:00`).toLocaleDateString('en-GB')
}

function shell({ title, intro, panel, buttonLabel, url, closing }: { title: string; intro: string; panel: string; buttonLabel: string; url: string; closing: string }) {
  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>${title}</title></head><body style="margin:0;padding:0;background:#f3f5f7;font-family:Arial,Helvetica,sans-serif;color:#333"><table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f3f5f7;padding:30px 10px"><tr><td align="center"><table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:680px;background:#fff;border:1px solid #e5e7eb"><tr><td style="padding:28px 35px;text-align:center;border-bottom:4px solid #e57200"><img src="${LOGO}" alt="CARE International" width="190" style="display:block;margin:0 auto;max-width:190px;height:auto"></td></tr><tr><td style="padding:34px 35px 10px"><h1 style="margin:0;color:#252525;font-size:24px;line-height:1.4">${title}</h1></td></tr><tr><td style="padding:10px 35px 10px;font-size:14px;line-height:1.8"><p>Dear Applicant,</p>${intro}</td></tr><tr><td style="padding:0 35px 10px"><table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#fff7ed;border-left:4px solid #e57200"><tr><td style="padding:16px 20px;font-size:14px;line-height:1.8">${panel}</td></tr></table></td></tr><tr><td align="center" style="padding:24px 35px"><a href="${url}" style="display:inline-block;background:#e57200;color:#fff;text-decoration:none;font-weight:bold;font-size:14px;padding:16px 32px;border-radius:4px">${buttonLabel}</a></td></tr><tr><td style="padding:0 35px 30px;font-size:13px;line-height:1.8;color:#555"><p>If the button does not work, copy and paste this link into your browser:<br><a href="${url}" style="color:#e57200;word-break:break-all">${url}</a></p>${closing}<p>Kind regards,<br><strong>CARE International Recruitment Team</strong></p></td></tr></table></td></tr></table></body></html>`
}

export function documentReminderEmail({ role, portalUrl, deadline }: { role: string; portalUrl: string; deadline: string }) {
  return shell({
    title: 'Reminder: Supporting Documents Required',
    intro: `<p>This is a friendly reminder that we have not yet received all the supporting documents for your application for the <strong>${role}</strong> position at CARE International.</p><p>Documents already uploaded are saved. You only need to add what is missing and select <strong>Submit</strong> when you are done.</p>`,
    panel: `<strong>Please submit your documents by ${deadline}.</strong><br>Applications with incomplete documents cannot proceed to the next stage.`,
    buttonLabel: 'UPLOAD YOUR DOCUMENTS SECURELY',
    url: portalUrl,
    closing: '<p>If you have already submitted everything, please disregard this message.</p>'
  })
}

export function interviewReminderEmail({ role, url, deadline }: { role: string; url: string; deadline: string }) {
  return shell({
    title: 'Reminder: Your AI-Powered Interview',
    intro: `<p>This is a friendly reminder that your AI-powered interview for the <strong>${role}</strong> position at CARE International has not yet been completed.</p><p>The interview is conducted by Emmy Nana, our AI interview facilitator, through your browser using your camera and microphone. Your responses will be reviewed by the HR team.</p>`,
    panel: `<strong>Please complete your interview by ${deadline}.</strong><br>Find a quiet, well-lit space, allow camera and microphone access, and answer naturally.`,
    buttonLabel: 'START YOUR AI INTERVIEW',
    url,
    closing: '<p>If you have already completed your interview, please disregard this message.</p>'
  })
}
