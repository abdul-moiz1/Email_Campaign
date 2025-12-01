# Business Email Manager

## Overview

This is a full-stack web application built with React, Express, and Firebase that allows users to submit business information through an animated form and provides an admin dashboard to manage these submissions. The application uses a modern tech stack with TailwindCSS for styling, shadcn/ui components for the UI, and Firebase Firestore for data persistence.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework & Bundler**
- React 18 with TypeScript for type safety
- Vite as the build tool and development server
- Client-side routing using Wouter (lightweight React Router alternative)

**UI & Styling**
- TailwindCSS v4 with custom design tokens for consistent theming
- shadcn/ui component library (New York style variant) with Radix UI primitives
- Framer Motion for animations (noted as removed in dependencies but still imported in pages)
- Custom CSS animations using tw-animate-css
- Responsive design with mobile-first approach

**State Management**
- TanStack Query (React Query) for server state management and caching
- React Hook Form with Zod validation for form handling
- Local component state with React hooks

**Project Structure**
- `/client/src/pages/` - Page components (Home, Admin, Success, NotFound)
- `/client/src/components/ui/` - Reusable shadcn/ui components
- `/client/src/hooks/` - Custom React hooks
- `/client/src/lib/` - Utility functions and query client configuration

### Backend Architecture

**Server Framework**
- Express.js with TypeScript running on Node.js
- ESM modules (type: "module" in package.json)
- Separate entry points for development and production builds

**Development vs Production**
- Development: Vite middleware integration with HMR support
- Production: Static file serving from pre-built dist directory
- esbuild for server-side bundling in production

**API Design**
- RESTful endpoints under `/api` prefix
- JSON request/response format
- Zod schema validation for request payloads
- Error handling with appropriate HTTP status codes

**API Endpoints**
- `POST /api/submit` - Create new business submission, triggers Make.com webhook for AI enrichment
- `GET /api/submissions` - Retrieve all submissions
- `PATCH /api/submissions/:id/status` - Update submission status
- `GET /api/emails` - Retrieve all AI-generated emails from Firestore
- `POST /api/emails/send` - Send email via SendGrid to recipient

**Request/Response Logging**
- Custom middleware for request timing and response logging
- Filtered logging for API routes only (paths starting with `/api`)
- JSON response capture for debugging

### Data Storage Solutions

**Firebase Firestore**
- NoSQL document database for storing business submissions
- Firebase Admin SDK for server-side operations
- Collection: `submissions` with auto-generated document IDs

**Data Models**
- BusinessSubmission: Input form data (businessType, city, province, country)
- Submission: Stored record with additional fields (id, status, timestamps)
- Status enum: 'pending' | 'approved' | 'rejected' | 'contacted'

**Storage Layer Pattern**
- IStorage interface defining contract for data operations
- FirestoreStorage implementation encapsulating Firestore logic
- Easy to swap implementations if needed

**Database Schema (Firestore)**
```
submissions/
  {id}: {
    businessType: string,
    city: string,
    province: string,
    country: string,
    status: 'pending' | 'approved' | 'rejected' | 'contacted',
    createdAt: Timestamp,
    updatedAt: Timestamp
  }

CampaignData/
  {PlaceID}: {                      // Document ID is the Google Place ID
    BusinessName: string,           // Mixed-case field naming
    BusinessEmail?: string,
    Address: string,
    "Map Link"?: string,            // Field name with SPACE - access via data['Map Link']
    Phone?: string,
    Rating?: string,
    createdAt: Timestamp
  }

generatedEmails/
  {PlaceID}: {                      // Document ID is the Google Place ID (matches CampaignData)
    BusinessName: string,           // Mixed-case field naming
    Address: string,                // Full address (e.g., "street, city, province postal, country")
    BusinessEmail?: string,
    AIEmail: string,                // AI-generated email content
    MapLink?: string,               // Google Maps link (note: different from CampaignData's "Map Link")
    subject?: string,
    editedSubject?: string,
    editedBody?: string,
    status: 'not_generated' | 'generated' | 'edited' | 'sent',
    createdAt: Timestamp,
    updatedAt?: Timestamp
    // Note: No explicit campaignId field - the document ID IS the campaign ID (Place ID)
  }
```

**Campaign-Email Matching Architecture**
- CampaignData documents use Google Place IDs as document IDs
- generatedEmails documents also use Google Place IDs as document IDs
- The storage layer matches campaigns to emails by using the document ID as the campaign identifier
- Code fallback pattern: `data.campaignId || data['Campaign ID'] || doc.id`

**Firestore Field Naming Notes**
- Fields use mixed-case naming (e.g., "BusinessName", "AIEmail")
- Some fields have spaces (e.g., "Map Link" in CampaignData)
- Backend handles multiple field name variations for robustness

**UI Display Notes**
- Campaign cards show: business name, location, email, phone, simplified badge
- Simplified badge system on cards: "Email" (green) or "No Email" (gray) based on actual email content
- Detailed status badges ("Not Generated", "Generated", "Edited", "Sent") only shown in modals
- "Generated by AI" purple badge shown in campaign detail and email review modals
- Map link is only shown in the detail dialog (not on cards) - clickable link to Google Maps
- Cards with emails show "View / Edit Email" button instead of "Generate Email"
- Filter dropdown: All Campaigns / With Email / No Email / Sent
- Select All / Deselect All functionality respects current filter
- Checkbox selection on campaign cards with visual selection state (blue border)

**Multi-Email Handling**
- BusinessEmail field may contain multiple comma-separated email addresses
- `getAllValidEmails()` utility parses and validates email addresses
- Campaign cards show only the first valid email with "+X more" badge for additional emails
- Email modal displays all valid emails with checkboxes for recipient selection
- "Select All" toggle in modal to quickly select/deselect all recipients
- Send button shows count of selected recipients: "Send Email (X)"
- Emails only marked as "sent" when ALL selected recipients successfully receive the email
- Partial delivery shows warning toast but doesn't update status (allows retry)

**Configuration Note**
- Despite Drizzle ORM being configured (drizzle.config.ts with PostgreSQL dialect), the application currently uses Firebase Firestore exclusively
- The Drizzle setup appears to be boilerplate that isn't actively used

### Authentication and Authorization

**Current State**
- No authentication mechanism is currently implemented
- Admin dashboard is publicly accessible at `/admin` route
- No user management or role-based access control

**Security Considerations**
- API endpoints are unprotected and can be accessed by anyone
- Firebase Admin credentials are stored in environment variables (secure)
- No CSRF protection or rate limiting implemented

### External Dependencies

**Firebase Services**
- Firebase Admin SDK for server-side Firestore operations
- Credentials managed via environment variables:
  - `FIREBASE_PROJECT_ID`
  - `FIREBASE_CLIENT_EMAIL`
  - `FIREBASE_PRIVATE_KEY`

**SendGrid Integration**
- SendGrid API for transactional email sending
- Integrated via Replit connector blueprint (fresh credentials per call, no cached secrets)
- API key managed through Replit integration system
- Used for sending AI-generated emails from admin dashboard

**Make.com Webhook Integration**
- Webhook automation for AI-powered business data enrichment
- Triggered on new business submissions
- Generates personalized email content with enriched business information
- Environment variables:
  - `VITE_MAKE_WEBHOOK_URL` - Webhook endpoint URL
  - `MAKE_WEBHOOK_API_KEY` - API key for webhook authentication

**Database**
- Neon Database serverless driver configured but not actively used
- PostgreSQL connection string expected in `DATABASE_URL` environment variable
- Drizzle ORM configured but implementation uses Firebase instead

**UI Component Libraries**
- Radix UI primitives (30+ component primitives for accessibility)
- Lucide React icons for consistent iconography
- cmdk for command palette components
- Embla Carousel for carousel functionality
- Recharts for data visualization (pie charts, line charts)

**Form & Validation**
- Zod for runtime schema validation
- React Hook Form for form state management
- @hookform/resolvers for Zod integration

**Development Tools**
- Replit-specific plugins:
  - vite-plugin-runtime-error-modal for error overlays
  - vite-plugin-cartographer for code navigation
  - vite-plugin-dev-banner for development indicators
- Custom vite-plugin-meta-images for OpenGraph image URL updates

**Hosting Considerations**
- Application designed to run on Replit platform
- Meta image plugin updates OpenGraph tags with Replit deployment URLs
- Environment detection via `REPL_ID` variable

## Recent Features & Improvements

### Email Generation Auto-Polling (Dec 1, 2025)
- Implemented automatic polling (3-second intervals, 60-second timeout) when generating emails via Make.com webhook
- Dialog automatically updates when email is generated without requiring manual refresh
- Synchronized selectedCampaign state with campaigns array to keep dialog content fresh
- Toast notifications show clear status: "Generating email..." → "Email generated!" or timeout warning

### Email Status Analytics (Dec 1, 2025)
- Replaced Business Categories card with Email Status pie chart visualization
- Shows breakdown of generated vs not-generated emails
- Displays two segments: Generated (blue) and Not Generated (gray)
- Interactive tooltips show detailed email counts on hover
- Side legend shows both segments with color indicators
- Complements the Business Types pie chart for comprehensive dashboard overview