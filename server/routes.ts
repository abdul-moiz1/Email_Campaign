import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { initializeFirebase } from "./firebase";
import { businessSubmissionSchema, updateStatusSchema, enrichedDataSchema, sendEmailSchema, generateEmailSchema, updateEmailSchema, generateEmailFromCampaignSchema, markEmailAsSentSchema } from "@shared/schema";
import { fromZodError } from "zod-validation-error";
import { getUncachableSendGridClient } from "./sendgrid";
import { requireAuth, type AuthenticatedRequest } from "./authMiddleware";

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
      
      // Send data to Make.com webhook
      const makeWebhookUrl = process.env.VITE_MAKE_WEBHOOK_URL;
      const makeApiKey = process.env.MAKE_WEBHOOK_API_KEY;
      
      if (!makeWebhookUrl || !makeApiKey) {
        console.error("Make.com webhook not configured (missing URL or API key)");
        return res.status(500).json({ 
          message: "Webhook configuration error. Please contact support."
        });
      }
      
      try {
        const webhookResponse = await fetch(makeWebhookUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-make-apikey": makeApiKey,
          },
          body: JSON.stringify({
            ...parsed.data,
            submissionId: submission.id,
          }),
        });
        
        if (!webhookResponse.ok) {
          const errorText = await webhookResponse.text();
          console.error("✗ Make.com webhook returned error:", webhookResponse.status, errorText);
          return res.status(502).json({ 
            message: "Failed to send data to processing service. Please try again."
          });
        }
        
        console.log("✓ Data sent to Make.com webhook successfully");
        
        // Parse webhook response to check for duplicate status
        let webhookStatus = 'saved';
        const contentType = webhookResponse.headers.get('content-type') || '';
        
        if (contentType.includes('application/json')) {
          try {
            const responseText = await webhookResponse.text();
            if (responseText && responseText.trim()) {
              const webhookData = JSON.parse(responseText);
              if (webhookData && webhookData.status) {
                webhookStatus = webhookData.status;
                console.log("Webhook status:", webhookStatus);
              }
            }
          } catch (parseError) {
            // JSON parsing failed, continue with default status
            console.log("Could not parse webhook JSON response, using default status");
          }
        } else {
          // Non-JSON response, use default status
          console.log("Webhook returned non-JSON response, using default status 'saved'");
        }
        
        // Only send success response when webhook succeeds
        return res.status(201).json({ 
          message: webhookStatus === 'exists' ? "Business already exists" : "Submission successful",
          submission,
          webhookStatus
        });
      } catch (makeError) {
        console.error("✗ Make.com webhook error:", makeError);
        return res.status(502).json({ 
          message: "Failed to connect to processing service. Please try again."
        });
      }
    } catch (error) {
      console.error("Submission error:", error);
      res.status(500).json({ message: "Failed to process submission" });
    }
  });

  // Get all submissions (protected)
  app.get("/api/submissions", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const submissions = await storage.getAllSubmissions();
      res.json(submissions);
    } catch (error) {
      console.error("Fetch submissions error:", error);
      res.status(500).json({ message: "Failed to fetch submissions" });
    }
  });

  // Get all generated emails (protected)
  app.get("/api/emails/generated", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const emails = await storage.getAllGeneratedEmails();
      res.json(emails);
    } catch (error) {
      console.error("Fetch generated emails error:", error);
      res.status(500).json({ message: "Failed to fetch generated emails" });
    }
  });

  // Update submission status (protected)
  app.patch("/api/submissions/:id/status", requireAuth, async (req: AuthenticatedRequest, res) => {
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

  // Send email via SendGrid (protected)
  app.post("/api/emails/send", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const parsed = sendEmailSchema.safeParse(req.body);
      
      if (!parsed.success) {
        const error = fromZodError(parsed.error);
        return res.status(400).json({ message: error.message });
      }

      const { emailId, recipientEmail, subject, body, businessName } = parsed.data;
      
      console.log(`Sending email to ${recipientEmail} for email ID: ${emailId}`);
      
      // Get SendGrid client
      const { client, fromEmail } = await getUncachableSendGridClient();
      
      // Build final subject with business name if provided
      const finalSubject = businessName ? `${subject} - ${businessName}` : subject;
      
      // Send email with custom_args for SendGrid tracking/analytics
      await client.send({
        to: recipientEmail,
        from: fromEmail,
        subject: finalSubject,
        text: body,
        html: body.replace(/\n/g, '<br>'),
        customArgs: {
          businessName: businessName || '',
          emailId: emailId,
        },
      });
      
      console.log(`✓ Email sent successfully to ${recipientEmail}`);
      
      // Update email status to 'sent'
      await storage.updateEmailStatus(emailId, 'sent');
      
      res.json({ 
        message: "Email sent successfully",
        recipient: recipientEmail
      });
    } catch (error: any) {
      console.error("Send email error:", error);
      if (error.message === 'Email not found') {
        res.status(404).json({ message: error.message });
      } else if (error.message === 'SendGrid not connected') {
        res.status(500).json({ message: "SendGrid is not configured. Please set up the integration." });
      } else {
        res.status(500).json({ 
          message: "Failed to send email",
          error: error.message 
        });
      }
    }
  });

  // Generate email via Make.com webhook (protected)
  app.post("/api/emails/generate", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const parsed = generateEmailSchema.safeParse(req.body);
      
      if (!parsed.success) {
        const error = fromZodError(parsed.error);
        return res.status(400).json({ message: error.message });
      }

      const { emailId, businessName, businessEmail, phoneNumber, selectedProduct, address, website } = parsed.data;
      
      console.log(`Generating email for ${businessName} with product: ${selectedProduct}`);
      
      // Get Make.com webhook URL
      const makeWebhookUrl = process.env.VITE_MAKE_WEBHOOK_URL;
      const makeApiKey = process.env.MAKE_WEBHOOK_API_KEY;
      
      if (!makeWebhookUrl || !makeApiKey) {
        console.error("Make.com webhook not configured");
        return res.status(500).json({ 
          message: "Webhook configuration error. Please contact support."
        });
      }
      
      // Send to Make.com webhook for AI email generation
      const webhookResponse = await fetch(makeWebhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-make-apikey": makeApiKey,
        },
        body: JSON.stringify({
          emailId,
          businessName,
          businessEmail: businessEmail || '',
          phoneNumber: phoneNumber || '',
          selectedProduct,
          address,
          website: website || '',
          action: 'generate_email',
        }),
      });
      
      if (!webhookResponse.ok) {
        const errorText = await webhookResponse.text();
        console.error("Make.com webhook error:", webhookResponse.status, errorText);
        return res.status(502).json({ 
          message: "Failed to generate email. Please try again."
        });
      }
      
      // Parse the response from Make.com
      const result = await webhookResponse.json();
      
      console.log("✓ Email generated via Make.com:", result);
      
      // Update email in Firestore with generated content
      const subject = result.subject || `Introducing ${selectedProduct} for ${businessName}`;
      const aiEmail = result.aiEmail || result.body || result.email || '';
      
      const updated = await storage.updateEmailWithGenerated(emailId, subject, aiEmail, selectedProduct);
      
      res.json({ 
        message: "Email generated successfully",
        email: updated
      });
    } catch (error: any) {
      console.error("Generate email error:", error);
      res.status(500).json({ 
        message: "Failed to generate email",
        error: error.message 
      });
    }
  });

  // Update email content (save edits)
  app.patch("/api/emails/:id/update", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const { id } = req.params;
      const parsed = updateEmailSchema.safeParse(req.body);
      
      if (!parsed.success) {
        const error = fromZodError(parsed.error);
        return res.status(400).json({ message: error.message });
      }

      const { subject, body } = parsed.data;
      
      console.log(`Updating email ${id} with edited content`);
      
      const updated = await storage.updateEmailContent(id, subject, body);
      
      res.json({ 
        message: "Email updated successfully",
        email: updated
      });
    } catch (error: any) {
      console.error("Update email error:", error);
      if (error.message === 'Email not found') {
        res.status(404).json({ message: error.message });
      } else {
        res.status(500).json({ 
          message: "Failed to update email",
          error: error.message 
        });
      }
    }
  });

  // Mark email as sent (without actually sending via SendGrid)
  app.post("/api/emails/:id/mark-sent", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const { id } = req.params;
      
      // Validate the email ID
      if (!id || typeof id !== 'string' || id.trim() === '') {
        return res.status(400).json({ message: "Valid email ID is required" });
      }
      
      console.log(`Marking email ${id} as sent`);
      
      const updated = await storage.markEmailAsSent(id);
      
      res.json({ 
        message: "Email marked as sent",
        email: updated
      });
    } catch (error: any) {
      console.error("Mark as sent error:", error);
      if (error.message === 'Email not found') {
        res.status(404).json({ message: error.message });
      } else {
        res.status(500).json({ 
          message: "Failed to mark email as sent",
          error: error.message 
        });
      }
    }
  });

  // Get all campaigns with their email status
  app.get("/api/campaigns", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const campaigns = await storage.getAllCampaignsWithEmails();
      res.json(campaigns);
    } catch (error) {
      console.error("Fetch campaigns error:", error);
      res.status(500).json({ message: "Failed to fetch campaigns" });
    }
  });

  // Get email for a specific campaign
  app.get("/api/campaigns/:id/email", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const { id } = req.params;
      const email = await storage.getEmailByCampaignId(id);
      
      if (!email) {
        return res.status(404).json({ message: "No email found for this campaign" });
      }
      
      res.json(email);
    } catch (error) {
      console.error("Fetch campaign email error:", error);
      res.status(500).json({ message: "Failed to fetch campaign email" });
    }
  });

  // Generate email for a campaign via Make.com webhook
  app.post("/api/campaigns/:id/generate-email", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const { id } = req.params;
      const parsed = generateEmailFromCampaignSchema.safeParse({
        ...req.body,
        campaignId: id,
      });
      
      if (!parsed.success) {
        const error = fromZodError(parsed.error);
        return res.status(400).json({ message: error.message });
      }

      const { campaignId, businessName, businessEmail, phone, address, mapLink, rating, product } = parsed.data;
      
      console.log(`Generating email for campaign ${campaignId} with product: ${product}`);
      
      // Get Make.com webhook URL
      const makeWebhookUrl = process.env.VITE_MAKE_WEBHOOK_URL;
      const makeApiKey = process.env.MAKE_WEBHOOK_API_KEY;
      
      if (!makeWebhookUrl || !makeApiKey) {
        console.error("Make.com webhook not configured");
        return res.status(500).json({ 
          message: "Webhook configuration error. Please contact support."
        });
      }
      
      // Send to Make.com webhook for AI email generation with the exact payload requested
      const webhookResponse = await fetch(makeWebhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-make-apikey": makeApiKey,
        },
        body: JSON.stringify({
          source: "admin",
          campaignId,
          businessName,
          businessEmail: businessEmail || '',
          phone: phone || '',
          address: address || '',
          mapLink: mapLink || '',
          rating: rating || '',
          product,
        }),
      });
      
      if (!webhookResponse.ok) {
        const errorText = await webhookResponse.text();
        console.error("Make.com webhook error:", webhookResponse.status, errorText);
        return res.status(502).json({ 
          message: "Failed to generate email. Please try again."
        });
      }
      
      console.log("✓ Email generation request sent to Make.com for campaign:", campaignId);
      
      res.json({ 
        message: "Email generation started",
        campaignId
      });
    } catch (error: any) {
      console.error("Generate campaign email error:", error);
      res.status(500).json({ 
        message: "Failed to generate email",
        error: error.message 
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
