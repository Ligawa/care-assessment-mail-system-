import { del } from '@vercel/blob'
import type { SupabaseClient } from '@supabase/supabase-js'

export async function deleteDocumentPortal(supabase: SupabaseClient, portalId: string) {
  const { data: documents, error: documentsError } = await supabase
    .from('applicant_documents')
    .select('pathname')
    .eq('portal_id', portalId)

  if (documentsError) throw new Error(documentsError.message)

  const pathnames = (documents ?? []).map(document => document.pathname)
  if (pathnames.length) await del(pathnames)

  const { error: deleteError } = await supabase
    .from('applicant_document_portals')
    .delete()
    .eq('id', portalId)

  if (deleteError) throw new Error(deleteError.message)
  return pathnames.length
}
