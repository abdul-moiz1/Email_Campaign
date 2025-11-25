import { z } from "zod";

// Business submission schema
export const businessSubmissionSchema = z.object({
  businessType: z.string().min(2, "Business type is required"),
  city: z.string().min(2, "City is required"),
  province: z.string().min(2, "Province/State is required"),
  country: z.string().min(2, "Country is required"),
});

export type BusinessSubmission = z.infer<typeof businessSubmissionSchema>;

// Email draft schema (stored in Firestore)
export interface EmailDraft {
  id: string;
  businessName: string;
  email: string;
  body: string;
  status: 'pending' | 'approved' | 'rejected' | 'sent';
  createdAt: Date;
  updatedAt: Date;
}

export const updateStatusSchema = z.object({
  status: z.enum(['pending', 'approved', 'rejected', 'sent']),
});

export type UpdateStatus = z.infer<typeof updateStatusSchema>;
