import { getFirestore } from "./firebase";
import type { BusinessSubmission, Submission, UpdateStatus, EnrichedBusinessData, GeneratedEmail, EmailStatus, ProductType, CampaignData, CampaignWithEmail } from "@shared/schema";

export interface IStorage {
  createSubmission(submission: BusinessSubmission): Promise<Submission>;
  getAllSubmissions(): Promise<Submission[]>;
  updateSubmissionStatus(id: string, status: UpdateStatus): Promise<Submission>;
  updateEnrichedData(id: string, enrichedData: EnrichedBusinessData): Promise<Submission>;
  getAllGeneratedEmails(): Promise<GeneratedEmail[]>;
  updateEmailStatus(emailId: string, status: EmailStatus): Promise<void>;
  updateEmailContent(emailId: string, subject: string, body: string): Promise<GeneratedEmail>;
  updateEmailWithGenerated(emailId: string, subject: string, aiEmail: string, selectedProduct: ProductType): Promise<GeneratedEmail>;
  getAllCampaigns(): Promise<CampaignData[]>;
  getAllCampaignsWithEmails(): Promise<CampaignWithEmail[]>;
  getEmailByCampaignId(campaignId: string): Promise<GeneratedEmail | null>;
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

    const emails = snapshot.docs.map(doc => {
      const data = doc.data();
      // Use the document ID as campaignId if no explicit campaignId field exists
      // The generatedEmails collection uses Place IDs as document IDs which match campaign IDs
      const campaignId = data.campaignId || data.CampaignId || data['Campaign ID'] || data.campaign_id || doc.id;
      return {
        id: doc.id,
        campaignId,
        businessName: data.BusinessName || data.businessName || '',
        address: data.Address || data.address || '',
        businessEmail: data.BusinessEmail || data.businessEmail || '',
        phoneNumber: data.PhoneNumber || data.phoneNumber || undefined,
        website: data.Website || data.website || undefined,
        selectedProduct: data.selectedProduct || undefined,
        subject: data.subject || undefined,
        aiEmail: data.AIEmail || data.aiEmail || '',
        editedSubject: data.editedSubject || undefined,
        editedBody: data.editedBody || undefined,
        mapLink: data.MapLink && data.MapLink.trim() !== '' ? data.MapLink : undefined,
        status: data.status || 'not_generated',
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || undefined,
      };
    }) as GeneratedEmail[];

    // Sort by createdAt in memory
    return emails.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async updateEmailStatus(emailId: string, status: EmailStatus): Promise<void> {
    const docRef = this.db.collection('generatedEmails').doc(emailId);
    const doc = await docRef.get();

    if (!doc.exists) {
      throw new Error('Email not found');
    }

    await docRef.update({
      status,
      updatedAt: new Date(),
    });
  }

  async updateEmailContent(emailId: string, subject: string, body: string): Promise<GeneratedEmail> {
    const docRef = this.db.collection('generatedEmails').doc(emailId);
    const doc = await docRef.get();

    if (!doc.exists) {
      throw new Error('Email not found');
    }

    const existingData = doc.data()!;
    const now = new Date();

    // Update both the original fields and edited fields for consistency
    // This ensures the changes persist across reloads and are used when sending
    await docRef.update({
      subject: subject,
      AIEmail: body,
      editedSubject: subject,
      editedBody: body,
      status: 'edited',
      updatedAt: now,
    });

    return {
      id: emailId,
      campaignId: existingData.campaignId || existingData.CampaignId || existingData['Campaign ID'] || existingData.campaign_id || emailId,
      businessName: existingData.BusinessName || existingData.businessName || '',
      address: existingData.Address || existingData.address || '',
      businessEmail: existingData.BusinessEmail || existingData.businessEmail || '',
      phoneNumber: existingData.PhoneNumber || existingData.phoneNumber || undefined,
      website: existingData.Website || existingData.website || undefined,
      selectedProduct: existingData.selectedProduct || undefined,
      subject: subject,
      aiEmail: body,
      editedSubject: subject,
      editedBody: body,
      mapLink: existingData.MapLink && existingData.MapLink.trim() !== '' ? existingData.MapLink : undefined,
      status: 'edited',
      createdAt: existingData.createdAt?.toDate() || new Date(),
      updatedAt: now,
    } as GeneratedEmail;
  }

  async updateEmailWithGenerated(emailId: string, subject: string, aiEmail: string, selectedProduct: ProductType): Promise<GeneratedEmail> {
    const docRef = this.db.collection('generatedEmails').doc(emailId);
    const doc = await docRef.get();

    if (!doc.exists) {
      throw new Error('Email not found');
    }

    const existingData = doc.data()!;
    const now = new Date();

    await docRef.update({
      subject,
      AIEmail: aiEmail,
      selectedProduct,
      status: 'generated',
      updatedAt: now,
    });

    return {
      id: emailId,
      campaignId: existingData.campaignId || existingData.CampaignId || existingData['Campaign ID'] || existingData.campaign_id || emailId,
      businessName: existingData.BusinessName || existingData.businessName || '',
      address: existingData.Address || existingData.address || '',
      businessEmail: existingData.BusinessEmail || existingData.businessEmail || '',
      phoneNumber: existingData.PhoneNumber || existingData.phoneNumber || undefined,
      website: existingData.Website || existingData.website || undefined,
      selectedProduct: selectedProduct,
      subject: subject,
      aiEmail: aiEmail,
      editedSubject: existingData.editedSubject || undefined,
      editedBody: existingData.editedBody || undefined,
      mapLink: existingData.MapLink && existingData.MapLink.trim() !== '' ? existingData.MapLink : undefined,
      status: 'generated',
      createdAt: existingData.createdAt?.toDate() || new Date(),
      updatedAt: now,
    } as GeneratedEmail;
  }

  async getAllCampaigns(): Promise<CampaignData[]> {
    try {
      // Fetch without ordering to avoid Firestore index requirements
      const snapshot = await this.db
        .collection('CampaignData')
        .get();

      const campaigns = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          businessName: data.businessName || data.BusinessName || data.business_name || data.name || data.Name || '',
          businessEmail: data.businessEmail || data.BusinessEmail || data.business_email || data.email || data.Email || undefined,
          address: data.address || data.Address || undefined,
          city: data.city || data.City || undefined,
          mapLink: data.mapLink || data.MapLink || data.map_link || data['Map Link'] || undefined,
          phone: data.phone || data.Phone || undefined,
          rating: data.rating || data.Rating || data.Ratings || undefined,
          createdAt: data.createdAt?.toDate() || data.created_at?.toDate() || new Date(),
        };
      }) as CampaignData[];

      // Sort in memory by createdAt descending
      return campaigns.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    } catch (error) {
      console.error('Error fetching campaigns:', error);
      throw error;
    }
  }

  async getEmailByCampaignId(campaignId: string): Promise<GeneratedEmail | null> {
    // First try to get by document ID (most generatedEmails use Place ID as doc ID)
    const docRef = this.db.collection('generatedEmails').doc(campaignId);
    const doc = await docRef.get();

    if (doc.exists) {
      const data = doc.data()!;
      return {
        id: doc.id,
        campaignId: data.campaignId || data.CampaignId || data['Campaign ID'] || data.campaign_id || doc.id,
        businessName: data.BusinessName || data.businessName || '',
        address: data.Address || data.address || '',
        businessEmail: data.BusinessEmail || data.businessEmail || '',
        phoneNumber: data.PhoneNumber || data.phoneNumber || undefined,
        website: data.Website || data.website || undefined,
        selectedProduct: data.selectedProduct || undefined,
        subject: data.subject || undefined,
        aiEmail: data.AIEmail || data.aiEmail || '',
        editedSubject: data.editedSubject || undefined,
        editedBody: data.editedBody || undefined,
        mapLink: data.MapLink && data.MapLink.trim() !== '' ? data.MapLink : undefined,
        status: data.status || 'not_generated',
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || undefined,
      };
    }

    // Fallback: try to query by campaignId field (for older documents that may have it)
    const snapshot = await this.db
      .collection('generatedEmails')
      .where('campaignId', '==', campaignId)
      .limit(1)
      .get();

    if (snapshot.empty) {
      return null;
    }

    const fieldDoc = snapshot.docs[0];
    const fieldData = fieldDoc.data();

    return {
      id: fieldDoc.id,
      campaignId: fieldData.campaignId || fieldDoc.id,
      businessName: fieldData.BusinessName || fieldData.businessName || '',
      address: fieldData.Address || fieldData.address || '',
      businessEmail: fieldData.BusinessEmail || fieldData.businessEmail || '',
      phoneNumber: fieldData.PhoneNumber || fieldData.phoneNumber || undefined,
      website: fieldData.Website || fieldData.website || undefined,
      selectedProduct: fieldData.selectedProduct || undefined,
      subject: fieldData.subject || undefined,
      aiEmail: fieldData.AIEmail || fieldData.aiEmail || '',
      editedSubject: fieldData.editedSubject || undefined,
      editedBody: fieldData.editedBody || undefined,
      mapLink: fieldData.MapLink && fieldData.MapLink.trim() !== '' ? fieldData.MapLink : undefined,
      status: fieldData.status || 'not_generated',
      createdAt: fieldData.createdAt?.toDate() || new Date(),
      updatedAt: fieldData.updatedAt?.toDate() || undefined,
    };
  }

  async getAllCampaignsWithEmails(): Promise<CampaignWithEmail[]> {
    const campaigns = await this.getAllCampaigns();
    const emails = await this.getAllGeneratedEmails();
    
    const emailsByCampaignId = new Map<string, GeneratedEmail>();
    for (const email of emails) {
      if (email.campaignId) {
        emailsByCampaignId.set(email.campaignId, email);
      }
    }

    return campaigns.map(campaign => ({
      ...campaign,
      email: emailsByCampaignId.get(campaign.id),
      hasEmail: emailsByCampaignId.has(campaign.id),
    }));
  }
}

export const storage = new FirestoreStorage();
