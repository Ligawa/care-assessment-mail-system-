import InterviewStatus from '@/components/interview-status'
import InterviewCodeForm from '@/components/interview-code-form'

export const metadata = { title: 'CARE International | Interview Portal' }

export default function InterviewIndexPage() {
  return (
    <InterviewStatus variant="invalid" title="Enter your interview code" message="Use the link in your invitation email, or type the interview code from that email below (it starts with INT-).">
      <InterviewCodeForm />
    </InterviewStatus>
  )
}
