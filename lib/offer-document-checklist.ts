export const OFFER_DOCUMENT_CHECKLIST = [
  { key: 'signed_offer_letter', label: 'Signed offer letter', optional: false },
  { key: 'primary_basic_school_en', label: 'Primary/basic school certificate — English', optional: false },
  { key: 'primary_basic_school_fr', label: 'Primary/basic school certificate — French', optional: false },
  { key: 'primary_basic_school_pt', label: 'Primary/basic school certificate — Portuguese', optional: false },
  { key: 'secondary_certificate_en', label: 'Secondary school certificate — English', optional: false },
  { key: 'secondary_certificate_fr', label: 'Secondary school certificate — French', optional: false },
  { key: 'secondary_certificate_pt', label: 'Secondary school certificate — Portuguese', optional: false },
  { key: 'tertiary_certificates_en', label: 'Tertiary certificates — English', optional: false },
  { key: 'tertiary_certificates_fr', label: 'Tertiary certificates — French', optional: false },
  { key: 'tertiary_certificates_pt', label: 'Tertiary certificates — Portuguese', optional: false },
  { key: 'police_clearance_en', label: 'Police clearance — English', optional: true },
  { key: 'police_clearance_fr', label: 'Police clearance — French', optional: true },
  { key: 'police_clearance_pt', label: 'Police clearance — Portuguese', optional: true },
  { key: 'tax_documents_en', label: 'Tax documents — English', optional: true },
  { key: 'tax_documents_fr', label: 'Tax documents — French', optional: true },
  { key: 'tax_documents_pt', label: 'Tax documents — Portuguese', optional: true },
] as const

export type OfferDocumentKey = (typeof OFFER_DOCUMENT_CHECKLIST)[number]['key']
export type OfferDocumentStatus = 'pending' | 'received' | 'not_applicable'

export function getOfferDocument(key: string) {
  return OFFER_DOCUMENT_CHECKLIST.find((document) => document.key === key)
}
