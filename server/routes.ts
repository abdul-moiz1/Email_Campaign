import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { initializeFirebase } from "./firebase";
import { businessSubmissionSchema, updateStatusSchema } from "@shared/schema";
import { fromZodError } from "zod-validation-error";

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

  const httpServer = createServer(app);
  return httpServer;
}
