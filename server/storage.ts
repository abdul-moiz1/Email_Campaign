import { getFirestore } from "./firebase";
import type { BusinessSubmission, EmailDraft, UpdateStatus } from "@shared/schema";

export interface IStorage {
  createEmailDraft(submission: BusinessSubmission): Promise<EmailDraft>;
  getAllEmailDrafts(): Promise<EmailDraft[]>;
  updateEmailDraftStatus(id: string, status: UpdateStatus): Promise<EmailDraft>;
}

export class FirestoreStorage implements IStorage {
  private get db() {
    return getFirestore();
  }

  async createEmailDraft(submission: BusinessSubmission): Promise<EmailDraft> {
    const now = new Date();
    
    // Generate email draft content
    const emailDraft = {
      businessName: `${submission.businessType} in ${submission.city}`,
      email: `contact@${submission.businessType.toLowerCase().replace(/\s+/g, '')}.com`,
      body: `Hello,\n\nWe are a ${submission.businessType} based in ${submission.city}, ${submission.province}, ${submission.country}. We are interested in learning more about your services.\n\nBest regards,\n${submission.businessType} Team`,
      status: 'pending' as const,
      createdAt: now,
      updatedAt: now,
    };

    const docRef = await this.db.collection('emailDrafts').add(emailDraft);
    
    return {
      id: docRef.id,
      ...emailDraft,
    };
  }

  async getAllEmailDrafts(): Promise<EmailDraft[]> {
    const snapshot = await this.db
      .collection('emailDrafts')
      .orderBy('createdAt', 'desc')
      .get();

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate() || new Date(),
      updatedAt: doc.data().updatedAt?.toDate() || new Date(),
    })) as EmailDraft[];
  }

  async updateEmailDraftStatus(id: string, { status }: UpdateStatus): Promise<EmailDraft> {
    const docRef = this.db.collection('emailDrafts').doc(id);
    const doc = await docRef.get();

    if (!doc.exists) {
      throw new Error('Email draft not found');
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
    } as EmailDraft;
  }
}

export const storage = new FirestoreStorage();
