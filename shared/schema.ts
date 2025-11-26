import { z } from "zod";

// Business submission schema
export const businessSubmissionSchema = z.object({
  businessType: z.string().min(2, "Business type is required"),
  city: z.string().min(2, "City is required"),
  province: z.string().min(2, "Province/State is required"),
  country: z.string().min(2, "Country is required"),
});

export type BusinessSubmission = z.infer<typeof businessSubmissionSchema>;

// Submission record (stored in Firestore)
export interface Submission {
  id: string;
  businessType: string;
  city: string;
  province: string;
  country: string;
  status: 'pending' | 'approved' | 'rejected' | 'contacted';
  createdAt: Date;
  updatedAt: Date;
  enrichedData?: EnrichedBusinessData;
}

// Enriched data from Make AI agent
export interface EnrichedBusinessData {
  businessName?: string;
  website?: string;
  phone?: string;
  email?: string;
  address?: string;
  description?: string;
  industry?: string;
  employeeCount?: string;
  revenue?: string;
  socialMedia?: {
    linkedin?: string;
    facebook?: string;
    twitter?: string;
    instagram?: string;
  };
  otherDetails?: Record<string, any>;
}

export const updateStatusSchema = z.object({
  status: z.enum(['pending', 'approved', 'rejected', 'contacted']),
});

export type UpdateStatus = z.infer<typeof updateStatusSchema>;

// Schema for enriched data from Make webhook
export const enrichedDataSchema = z.object({
  submissionId: z.string().min(1, "Submission ID is required"),
  enrichedData: z.object({
    businessName: z.string().optional(),
    website: z.string().optional(),
    phone: z.string().optional(),
    email: z.string().optional(),
    address: z.string().optional(),
    description: z.string().optional(),
    industry: z.string().optional(),
    employeeCount: z.string().optional(),
    revenue: z.string().optional(),
    socialMedia: z.object({
      linkedin: z.string().optional(),
      facebook: z.string().optional(),
      twitter: z.string().optional(),
      instagram: z.string().optional(),
    }).optional(),
    otherDetails: z.record(z.any()).optional(),
  }),
});

export type EnrichedDataPayload = z.infer<typeof enrichedDataSchema>;

// Generated Email schema (from Make.com AI)
export interface GeneratedEmail {
  id: string;
  businessName: string;
  address: string;
  businessEmail: string;
  aiEmail: string;
  mapLink?: string;
  status: 'pending' | 'approved' | 'sent';
  createdAt: Date;
}

// Send Email schema
export const sendEmailSchema = z.object({
  emailId: z.string().min(1, "Email ID is required"),
  recipientEmail: z.string().email("Valid email address is required"),
  subject: z.string().min(1, "Subject is required"),
  body: z.string().min(1, "Email body is required"),
});

export type SendEmail = z.infer<typeof sendEmailSchema>;
