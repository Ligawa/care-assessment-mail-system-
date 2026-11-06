import DocumentUploadPortal from '@/components/document-upload-portal'

export default async function DocumentsPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  return <DocumentUploadPortal token={token} />
}
