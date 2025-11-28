import { z } from "zod";

// Business submission schema
export const businessSubmissionSchema = z.object({
  businessType: z.string().min(2, "Business type is required"),
  city: z.string().min(2, "City is required"),
  province: z.string().min(2, "Province/State is required"),
  country: z.string().min(2, "Country is required"),
});

export type BusinessSubmission = z.infer<typeof businessSubmissionSchema>;

// CampaignData schema (from Firestore CampaignData collection)
export interface CampaignData {
  id: string;
  businessName: string;
  businessEmail?: string;
  address?: string;
  city?: string;
  mapLink?: string;
  phone?: string;
  rating?: number | string;
  createdAt: Date;
}

// CampaignData with associated email status
export interface CampaignWithEmail extends CampaignData {
  email?: GeneratedEmail;
  hasEmail: boolean;
}

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

// Product types for email generation
export const productTypes = [
  'AI Calling Agent',
  'AI Chatbot',
  'Booking Assistant',
  'Custom AI Solution',
] as const;

export type ProductType = typeof productTypes[number];

// Email status values
export type EmailStatus = 'not_generated' | 'generated' | 'edited' | 'sent';

// Generated Email schema (from Make.com AI)
export interface GeneratedEmail {
  id: string;
  campaignId?: string;
  businessName: string;
  address: string;
  businessEmail: string;
  phoneNumber?: string;
  website?: string;
  selectedProduct?: ProductType;
  subject?: string;
  aiEmail: string;
  editedSubject?: string;
  editedBody?: string;
  mapLink?: string;
  status: EmailStatus;
  createdAt: Date;
  updatedAt?: Date;
  sentAt?: Date;
}

// Mark email as sent schema
export const markEmailAsSentSchema = z.object({
  emailId: z.string().min(1, "Email ID is required"),
});

export type MarkEmailAsSent = z.infer<typeof markEmailAsSentSchema>;

// Send Email schema
export const sendEmailSchema = z.object({
  emailId: z.string().min(1, "Email ID is required"),
  recipientEmail: z.string().email("Valid email address is required"),
  subject: z.string().min(1, "Subject is required"),
  body: z.string().min(1, "Email body is required"),
  businessName: z.string().optional(),
});

export type SendEmail = z.infer<typeof sendEmailSchema>;

// Generate Email schema (for Make.com webhook)
export const generateEmailSchema = z.object({
  emailId: z.string().min(1, "Email ID is required"),
  businessName: z.string().min(1, "Business name is required"),
  businessEmail: z.string().optional(),
  phoneNumber: z.string().optional(),
  selectedProduct: z.enum(['AI Calling Agent', 'AI Chatbot', 'Booking Assistant', 'Custom AI Solution']),
  address: z.string().min(1, "Address is required"),
  website: z.string().optional(),
});

export type GenerateEmail = z.infer<typeof generateEmailSchema>;

// Update Email schema (for saving edits)
export const updateEmailSchema = z.object({
  subject: z.string().optional().default(""),
  body: z.string().min(1, "Email body is required"),
});

export type UpdateEmail = z.infer<typeof updateEmailSchema>;

// Generate Email from Admin (CampaignData) schema
export const generateEmailFromCampaignSchema = z.object({
  campaignId: z.string().min(1, "Campaign ID is required"),
  businessName: z.string().min(1, "Business name is required"),
  businessEmail: z.string().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  mapLink: z.string().optional(),
  rating: z.union([z.string(), z.number()]).optional(),
  product: z.string().min(1, "Product is required"),
});

export type GenerateEmailFromCampaign = z.infer<typeof generateEmailFromCampaignSchema>;
