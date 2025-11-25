import { getFirestore } from "./firebase";
import type { BusinessSubmission, Submission, UpdateStatus, EnrichedBusinessData, GeneratedEmail } from "@shared/schema";

export interface IStorage {
  createSubmission(submission: BusinessSubmission): Promise<Submission>;
  getAllSubmissions(): Promise<Submission[]>;
  updateSubmissionStatus(id: string, status: UpdateStatus): Promise<Submission>;
  updateEnrichedData(id: string, enrichedData: EnrichedBusinessData): Promise<Submission>;
  getAllGeneratedEmails(): Promise<GeneratedEmail[]>;
}

export class FirestoreStorage implements IStorage {
  private get db() {
    return getFirestore();
  }

  async createSubmission(submission: BusinessSubmission): Promise<Submission> {
    const now = new Date();
    
    // Store the exact form data submitted
    const submissionData = {
      businessType: submission.businessType,
      city: submission.city,
      province: submission.province,
      country: submission.country,
      status: 'pending' as const,
      createdAt: now,
      updatedAt: now,
    };

    const docRef = await this.db.collection('submissions').add(submissionData);
    
    return {
      id: docRef.id,
      ...submissionData,
    };
  }

  async getAllSubmissions(): Promise<Submission[]> {
    const snapshot = await this.db
      .collection('submissions')
      .orderBy('createdAt', 'desc')
      .get();

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate() || new Date(),
      updatedAt: doc.data().updatedAt?.toDate() || new Date(),
    })) as Submission[];
  }

  async updateSubmissionStatus(id: string, { status }: UpdateStatus): Promise<Submission> {
    const docRef = this.db.collection('submissions').doc(id);
    const doc = await docRef.get();

    if (!doc.exists) {
      throw new Error('Submission not found');
    }

    await docRef.update({
      status,
      updatedAt: new Date(),
    });

    const updated = await docRef.get();
    const data = updated.data()!;

    return {
      id: updated.id,
      ...data,
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date(),
    } as Submission;
  }

  async updateEnrichedData(id: string, enrichedData: EnrichedBusinessData): Promise<Submission> {
    const docRef = this.db.collection('submissions').doc(id);
    const doc = await docRef.get();

    if (!doc.exists) {
      throw new Error('Submission not found');
    }

    await docRef.update({
      enrichedData,
      updatedAt: new Date(),
    });

    const updated = await docRef.get();
    const data = updated.data()!;

    return {
      id: updated.id,
      ...data,
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date(),
    } as Submission;
  }

  async getAllGeneratedEmails(): Promise<GeneratedEmail[]> {
    const snapshot = await this.db
      .collection('generatedEmails')
      .get();

    const allEmails: GeneratedEmail[] = [];

    snapshot.docs.forEach(doc => {
      const data = doc.data();
      
      // The businessName field contains a JSON string with an array of businesses!
      if (data.businessName && data.email) {
        try {
          // Try to parse the businessName field as JSON
          let businesses: any[] = [];
          
          if (typeof data.businessName === 'string' && data.businessName.trim().startsWith('[')) {
            // Clean up the string - remove anything after the closing bracket
            let cleanedJson = data.businessName.trim();
            const closingBracketIndex = cleanedJson.lastIndexOf(']');
            if (closingBracketIndex !== -1) {
              cleanedJson = cleanedJson.substring(0, closingBracketIndex + 1);
            }
            businesses = JSON.parse(cleanedJson);
          } else if (Array.isArray(data.businessName)) {
            businesses = data.businessName;
          } else {
            // If it's just a string (single business), create a single-item array
            businesses = [{
              businessName: data.businessName,
              address: data.address || '',
              email: data.contactEmail || '',
              phone: data.phone || '',
              website: data.website || ''
            }];
          }
          
          // The email field contains personalized emails for each business
          // Split by business sections
          const emailSections = data.email.split(/\*\*For\s+/);
          
          // Create one email card for each business
          businesses.forEach((business: any, index: number) => {
            // Find the corresponding email section
            let emailBody = '';
            if (emailSections.length > index + 1) {
              emailBody = emailSections[index + 1].replace(/:\*\*/, '').trim();
            } else {
              emailBody = data.email; // Fallback to full email
            }
            
            allEmails.push({
              id: `${doc.id}_${index}`,
              businessName: business.businessName || business.name || 'Unknown Business',
              address: business.address || '',
              city: this.extractCity(business.address || ''),
              province: this.extractProvince(business.address || ''),
              country: this.extractCountry(business.address || ''),
              email: business.email || '',
              phone: business.phone || business.phoneNumber || '',
              website: business.website || '',
              emailSubject: data.emailSubject || `Partnership Opportunity with ${business.businessName || business.name}`,
              emailBody: emailBody,
              status: data.status || 'pending',
              createdAt: data.createdAt?.toDate() || new Date(),
            });
          });
        } catch (error) {
          console.error('Error parsing businessName JSON:', error);
          // Fallback: treat as a single business
          allEmails.push({
            id: doc.id,
            businessName: String(data.businessName),
            address: '',
            city: '',
            province: '',
            country: '',
            email: '',
            phone: '',
            website: '',
            emailSubject: 'Partnership Opportunity',
            emailBody: data.email,
            status: data.status || 'pending',
            createdAt: data.createdAt?.toDate() || new Date(),
          });
        }
      }
    });

    return allEmails;
  }

  private extractCity(address: string = ''): string {
    // Extract city from address like "Shahbaz Market, Mandi Bahauddin, Punjab, Pakistan"
    const parts = address.split(',').map(p => p.trim());
    return parts.length >= 2 ? parts[parts.length - 3] || '' : '';
  }

  private extractProvince(address: string = ''): string {
    // Extract province/state from address
    const parts = address.split(',').map(p => p.trim());
    return parts.length >= 2 ? parts[parts.length - 2] || '' : '';
  }

  private extractCountry(address: string = ''): string {
    // Extract country from address (usually last part)
    const parts = address.split(',').map(p => p.trim());
    return parts[parts.length - 1] || '';
  }
}

export const storage = new FirestoreStorage();
