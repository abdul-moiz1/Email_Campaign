import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { initializeFirebase } from "./firebase";
import { businessSubmissionSchema, updateStatusSchema, enrichedDataSchema } from "@shared/schema";
import { fromZodError } from "zod-validation-error";

function validateApiKey(req: Request, res: Response, next: NextFunction) {
  const apiKey = req.headers['x-make-apikey'];
  const expectedApiKey = process.env.MAKE_WEBHOOK_API_KEY;

  if (!expectedApiKey) {
    console.error('MAKE_WEBHOOK_API_KEY not configured');
    return res.status(500).json({ message: 'Server configuration error' });
  }

  if (!apiKey || apiKey !== expectedApiKey) {
    console.warn('Invalid API key attempt');
    return res.status(401).json({ message: 'Unauthorized: Invalid API key' });
  }

  next();
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Initialize Firebase before setting up routes
  initializeFirebase();

  // Submit business inquiry form
  app.post("/api/submit", async (req, res) => {
    try {
      const parsed = businessSubmissionSchema.safeParse(req.body);
      
      if (!parsed.success) {
        const error = fromZodError(parsed.error);
        return res.status(400).json({ message: error.message });
      }

      console.log("Business inquiry submitted:", parsed.data);
      
      const submission = await storage.createSubmission(parsed.data);
      
      res.status(201).json({ 
        message: "Submission successful",
        submission
      });
    } catch (error) {
      console.error("Submission error:", error);
      res.status(500).json({ message: "Failed to process submission" });
    }
  });

  // Get all submissions
  app.get("/api/submissions", async (req, res) => {
    try {
      const submissions = await storage.getAllSubmissions();
      res.json(submissions);
    } catch (error) {
      console.error("Fetch submissions error:", error);
      res.status(500).json({ message: "Failed to fetch submissions" });
    }
  });

  // Get all generated emails
  app.get("/api/emails/generated", async (req, res) => {
    try {
      const emails = await storage.getAllGeneratedEmails();
      res.json(emails);
    } catch (error) {
      console.error("Fetch generated emails error:", error);
      res.status(500).json({ message: "Failed to fetch generated emails" });
    }
  });

  // Update submission status
  app.patch("/api/submissions/:id/status", async (req, res) => {
    try {
      const { id } = req.params;
      const parsed = updateStatusSchema.safeParse(req.body);

      if (!parsed.success) {
        const error = fromZodError(parsed.error);
        return res.status(400).json({ message: error.message });
      }

      const updated = await storage.updateSubmissionStatus(id, parsed.data);
      res.json(updated);
    } catch (error: any) {
      console.error("Update status error:", error);
      if (error.message === 'Submission not found') {
        res.status(404).json({ message: error.message });
      } else {
        res.status(500).json({ message: "Failed to update status" });
      }
    }
  });

  // Webhook endpoint for Make to send enriched data
  app.post("/api/webhook/enrich", validateApiKey, async (req, res) => {
    try {
      const parsed = enrichedDataSchema.safeParse(req.body);
      
      if (!parsed.success) {
        const error = fromZodError(parsed.error);
        return res.status(400).json({ message: error.message });
      }

      const { submissionId, enrichedData } = parsed.data;
      
      console.log("Enriched data received for submission:", submissionId);
      
      const updated = await storage.updateEnrichedData(submissionId, enrichedData);
      
      res.json({ 
        message: "Enriched data saved successfully",
        submission: updated
      });
    } catch (error: any) {
      console.error("Webhook enrich error:", error);
      if (error.message === 'Submission not found') {
        res.status(404).json({ message: error.message });
      } else {
        res.status(500).json({ message: "Failed to save enriched data" });
      }
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
