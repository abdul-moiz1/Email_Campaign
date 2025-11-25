# Make Integration Guide

## Overview
Your application is now configured to work with Make for AI-powered business enrichment. Here's how the flow works:

1. **User submits form** → Saved to Firestore (original data)
2. **Form data sent to Make** → Make receives: businessType, city, province, country, submissionId
3. **Make AI enriches data** → Searches for business details
4. **Make sends enriched data back** → Updates Firestore record
5. **Make drafts email** → You review and approve
6. **Make sends email** → Business receives your service offer

---

## Step 1: Set Your Make Webhook URL

Once you create your Make webhook (next step), you'll need to add its URL to your Replit environment variables:

1. Go to Replit's "Secrets" tab (🔒 icon in left sidebar)
2. Add a new secret:
   - **Key:** `VITE_MAKE_WEBHOOK_URL`
   - **Value:** Your Make webhook URL (you'll get this in Step 2)

---

## Step 2: Create Make Scenario

### Module 1: Webhook Trigger

1. **Add a Webhook module** → "Custom webhook"
2. **Create a webhook:**
   - Name: "Business Form Webhook"
   - Click "Save"
   - **Copy the webhook URL** → This goes into `VITE_MAKE_WEBHOOK_URL` (see Step 1)

3. **Test it:**
   - Submit your form once
   - The webhook should receive data like:
```json
{
  "businessType": "Marketing Agency",
  "city": "Toronto",
  "province": "ON",
  "country": "Canada",
  "submissionId": "abc123xyz"
}
```

### Module 2: AI Agent (Search & Enrich)

1. **Add your AI tool** (e.g., OpenAI, Perplexity, or Make's AI modules)
2. **Configure it to search for business information based on:**
   - Business Type: `{{1.businessType}}`
   - Location: `{{1.city}}, {{1.province}}, {{1.country}}`

3. **Extract information like:**
   - Business name
   - Website
   - Phone number
   - Email address
   - Full address
   - Description
   - Industry
   - Employee count
   - Revenue estimates
   - Social media profiles (LinkedIn, Facebook, Twitter, Instagram)

### Module 3: Send Enriched Data to Your App

1. **Add HTTP > Make a request**
2. **Configure:**
   - **URL:** `https://[your-replit-url]/api/webhook/enrich`
     - Replace `[your-replit-url]` with your actual Replit domain
   - **Method:** POST
   - **Headers:**
     - Name: `Content-Type`, Value: `application/json`
     - Name: `x-make-apikey`, Value: `[SEE STEP 0 BELOW - GET FROM REPLIT SECRETS]`
   - **Body type:** Raw
   - **Content type:** JSON (application/json)
   - **Request content:**

```json
{
  "submissionId": "{{1.submissionId}}",
  "enrichedData": {
    "businessName": "{{2.businessName}}",
    "website": "{{2.website}}",
    "phone": "{{2.phone}}",
    "email": "{{2.email}}",
    "address": "{{2.address}}",
    "description": "{{2.description}}",
    "industry": "{{2.industry}}",
    "employeeCount": "{{2.employeeCount}}",
    "revenue": "{{2.revenue}}",
    "socialMedia": {
      "linkedin": "{{2.linkedin}}",
      "facebook": "{{2.facebook}}",
      "twitter": "{{2.twitter}}",
      "instagram": "{{2.instagram}}"
    }
  }
}
```

**Note:** Adjust the field mappings ({{2.fieldname}}) based on what your AI module outputs.

### Module 4: Draft Email

1. **Add Email > Create a Draft** (or your email service)
2. **Configure:**
   - **To:** `{{2.email}}` (from enriched data)
   - **Subject:** Customize your offer
   - **Body:** Use the enriched data to personalize:

```
Hi {{2.businessName}} team,

I noticed you're a {{1.businessType}} based in {{1.city}}, {{1.province}}.

[Your personalized service pitch using the enriched data]

Best regards,
[Your name]
```

### Module 5: Manual Review & Send

1. **Add a manual approval step** before sending
2. This lets you review each email before it goes out

---

## Step 3: Test the Complete Flow

1. **Submit a test form** on your website
2. **Check Firestore:** Original data should be saved
3. **Wait for Make:** AI enriches the data
4. **Check Firestore again:** enrichedData field should be populated
5. **Review email draft:** Make sure it looks good
6. **Approve and send**

---

## Important URLs & Credentials

### Your Backend Endpoints

- **Form submission:** `https://[your-replit-url]/api/submit`
- **Webhook for enriched data:** `https://[your-replit-url]/api/webhook/enrich`
- **View all submissions:** `https://[your-replit-url]/api/submissions`

### Step 0: Get Your API Key

**IMPORTANT:** The API key is stored securely in Replit Secrets.

1. Go to Replit's "Secrets" tab (🔒 icon in left sidebar)
2. Find the secret named `MAKE_WEBHOOK_API_KEY`
3. Copy its value
4. Use this value in Make's HTTP module header `x-make-apikey`

**Never share this key publicly or commit it to your repository!**

---

## Troubleshooting

### Form submits but Make doesn't receive data
- Check that `VITE_MAKE_WEBHOOK_URL` is set correctly in Replit Secrets
- Restart your Replit app after adding the secret

### Make sends enriched data but Firestore doesn't update
- Verify the API key is correct in Make's HTTP module header
- Check Make logs for the HTTP response
- Check your Replit console logs for errors

### Email has wrong/missing information
- Check that your AI module is extracting data correctly
- Verify field mappings in Module 3 match your AI output

---

## Data Structure

### Original Submission (saved immediately)
```json
{
  "id": "abc123",
  "businessType": "Marketing Agency",
  "city": "Toronto",
  "province": "ON",
  "country": "Canada",
  "status": "pending",
  "createdAt": "2024-01-01T00:00:00Z",
  "updatedAt": "2024-01-01T00:00:00Z"
}
```

### After Make Enrichment
```json
{
  "id": "abc123",
  "businessType": "Marketing Agency",
  "city": "Toronto",
  "province": "ON",
  "country": "Canada",
  "status": "pending",
  "createdAt": "2024-01-01T00:00:00Z",
  "updatedAt": "2024-01-01T00:00:01Z",
  "enrichedData": {
    "businessName": "Example Marketing Inc.",
    "website": "https://example.com",
    "phone": "+1-555-0123",
    "email": "info@example.com",
    "address": "123 Main St, Toronto, ON",
    "description": "Full-service digital marketing agency",
    "industry": "Marketing & Advertising",
    "employeeCount": "50-100",
    "revenue": "$5M-$10M",
    "socialMedia": {
      "linkedin": "https://linkedin.com/company/example",
      "facebook": "https://facebook.com/example"
    }
  }
}
```

---

## Security Notes

- The API key is stored as an environment variable for security
- Only requests with valid API keys can update enriched data
- Your form submission endpoint is public (as intended for lead capture)
- Keep your Make scenario private and don't share the API key

---

## Next Steps

1. Set up your Make scenario following the steps above
2. Add `VITE_MAKE_WEBHOOK_URL` to your Replit secrets
3. Restart your app
4. Test with a real business submission
5. Review and refine your email templates based on results
