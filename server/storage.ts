import { getFirestore } from "./firebase";
import type { BusinessSubmission, Submission, UpdateStatus, EnrichedBusinessData } from "@shared/schema";

export interface IStorage {
  createSubmission(submission: BusinessSubmission): Promise<Submission>;
  getAllSubmissions(): Promise<Submission[]>;
  updateSubmissionStatus(id: string, status: UpdateStatus): Promise<Submission>;
  updateEnrichedData(id: string, enrichedData: EnrichedBusinessData): Promise<Submission>;
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
}

export const storage = new FirestoreStorage();
