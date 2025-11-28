import { getFirestore } from "./firebase";
import type { BusinessSubmission, Submission, UpdateStatus, EnrichedBusinessData, GeneratedEmail, EmailStatus, ProductType } from "@shared/schema";

export interface IStorage {
  createSubmission(submission: BusinessSubmission): Promise<Submission>;
  getAllSubmissions(): Promise<Submission[]>;
  updateSubmissionStatus(id: string, status: UpdateStatus): Promise<Submission>;
  updateEnrichedData(id: string, enrichedData: EnrichedBusinessData): Promise<Submission>;
  getAllGeneratedEmails(): Promise<GeneratedEmail[]>;
  updateEmailStatus(emailId: string, status: EmailStatus): Promise<void>;
  updateEmailContent(emailId: string, subject: string, body: string): Promise<GeneratedEmail>;
  updateEmailWithGenerated(emailId: string, subject: string, aiEmail: string, selectedProduct: ProductType): Promise<GeneratedEmail>;
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
      return {
        id: doc.id,
        businessName: data.BusinessName || '',
        address: data.Address || '',
        businessEmail: data.BusinessEmail || '',
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

    await docRef.update({
      editedSubject: subject,
      editedBody: body,
      status: 'edited',
      updatedAt: now,
    });

    return {
      id: emailId,
      businessName: existingData.BusinessName || '',
      address: existingData.Address || '',
      businessEmail: existingData.BusinessEmail || '',
      phoneNumber: existingData.PhoneNumber || existingData.phoneNumber || undefined,
      website: existingData.Website || existingData.website || undefined,
      selectedProduct: existingData.selectedProduct || undefined,
      subject: existingData.subject || undefined,
      aiEmail: existingData.AIEmail || existingData.aiEmail || '',
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
      businessName: existingData.BusinessName || '',
      address: existingData.Address || '',
      businessEmail: existingData.BusinessEmail || '',
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
}

export const storage = new FirestoreStorage();
