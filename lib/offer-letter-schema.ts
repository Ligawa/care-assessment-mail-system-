import { z } from 'zod'

export const offerSchema = z.object({
  submissionId: z.string().uuid(),
  applicantName: z.string().trim().min(1),
  jobTitle: z.string().trim().min(1).refine(value => value !== 'Assessed position', 'Select the actual position.'),
  startDate: z.string().min(1),
  workArrangement: z.string().trim().min(1),
  department: z.string().trim().min(1),
  contractType: z.string().trim().min(1),
  contractDuration: z.string().trim().min(1),
  basicSalary: z.coerce.number().positive(),
  documentDeadline: z.string().min(1),
  acceptanceDeadline: z.string().min(1),
})
