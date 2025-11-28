import { motion } from "framer-motion";
import { Check, X, Building2, Clock, ArrowLeft, RefreshCw, MapPin, Mail, ExternalLink, Send, Phone, Globe, Sparkles, Save, Star } from "lucide-react";
import { useState, useEffect } from "react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogAction } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { productTypes, type ProductType, type EmailStatus } from "@shared/schema";

interface GeneratedEmail {
  id: string;
  campaignId?: string;
  businessName: string;
  address: string;
  businessEmail: string;
  phoneNumber?: string;
  website?: string;
  selectedProduct?: ProductType;
  subject?: string;
  aiEmail: string;
  editedSubject?: string;
  editedBody?: string;
  mapLink?: string;
  status: EmailStatus;
  createdAt: string;
  updatedAt?: string;
}

interface CampaignWithEmail {
  id: string;
  businessName: string;
  businessEmail?: string;
  address?: string;
  city?: string;
  mapLink?: string;
  phone?: string;
  rating?: number | string;
  createdAt: string;
  email?: GeneratedEmail;
  hasEmail: boolean;
}

interface Submission {
  id: string;
  businessType: string;
  city: string;
  province: string;
  country: string;
  status: 'pending' | 'approved' | 'rejected' | 'contacted';
  createdAt: string;
  updatedAt: string;
}

export default function Admin() {
  const [campaigns, setCampaigns] = useState<CampaignWithEmail[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingSubmissions, setLoadingSubmissions] = useState(true);
  const [selectedEmail, setSelectedEmail] = useState<GeneratedEmail | null>(null);
  const [sending, setSending] = useState(false);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState<string | null>(null);
  const [showNoEmailAlert, setShowNoEmailAlert] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState<Record<string, ProductType>>({});
  const [editedSubject, setEditedSubject] = useState("");
  const [editedBody, setEditedBody] = useState("");
  const { toast } = useToast();

  const fetchCampaigns = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/campaigns");
      
      if (!response.ok) {
        throw new Error("Failed to fetch campaigns");
      }
      
      const data = await response.json();
      setCampaigns(data);
    } catch (error: any) {
      console.error("Fetch error:", error);
      toast({
        title: "Error loading campaigns",
        description: error.message || "Please check your Firebase configuration.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchSubmissions = async () => {
    try {
      setLoadingSubmissions(true);
      const response = await fetch("/api/submissions");
      
      if (!response.ok) {
        throw new Error("Failed to fetch submissions");
      }
      
      const data = await response.json();
      setSubmissions(data);
    } catch (error: any) {
      console.error("Fetch error:", error);
      toast({
        title: "Error loading submissions",
        description: error.message || "Please check your Firebase configuration.",
        variant: "destructive",
      });
    } finally {
      setLoadingSubmissions(false);
    }
  };

  useEffect(() => {
    fetchCampaigns();
    fetchSubmissions();
  }, []);

  const handleGenerateEmail = async (campaign: CampaignWithEmail) => {
    const selectedProduct = selectedProducts[campaign.id];
    
    if (!selectedProduct) {
      toast({
        title: "Select a product",
        description: "Please select a product before generating the email.",
        variant: "destructive",
      });
      return;
    }

    setGenerating(campaign.id);
    
    try {
      const response = await fetch(`/api/campaigns/${campaign.id}/generate-email`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          businessName: campaign.businessName,
          businessEmail: campaign.businessEmail || undefined,
          phone: campaign.phone || undefined,
          address: campaign.address || undefined,
          mapLink: campaign.mapLink || undefined,
          rating: campaign.rating || undefined,
          product: selectedProduct,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to generate email");
      }
      
      toast({
        title: "Email generation started",
        description: "The email is being generated. Please refresh in a moment to see the result.",
      });

      // Wait a moment then refresh to get the updated data
      setTimeout(() => {
        fetchCampaigns();
      }, 3000);
    } catch (error: any) {
      console.error("Generate error:", error);
      toast({
        title: "Generation failed",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setGenerating(null);
    }
  };

  const handleSaveEmail = async () => {
    if (!selectedEmail) return;

    setSaving(true);
    
    try {
      const response = await fetch(`/api/emails/${selectedEmail.id}/update`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          subject: editedSubject,
          body: editedBody,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to save email");
      }

      const result = await response.json();
      
      // Update the campaigns list with the new email data
      setCampaigns(campaigns.map(c => 
        c.email?.id === selectedEmail.id 
          ? { ...c, email: result.email }
          : c
      ));
      
      setSelectedEmail(result.email);
      
      toast({
        title: "Email saved",
        description: "Your changes have been saved.",
      });
    } catch (error: any) {
      console.error("Save error:", error);
      toast({
        title: "Save failed",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSendEmail = async () => {
    if (!selectedEmail) return;

    if (!selectedEmail.businessEmail || selectedEmail.businessEmail.trim() === '') {
      setShowNoEmailAlert(true);
      return;
    }

    setSending(true);
    
    try {
      const response = await fetch("/api/emails/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          emailId: selectedEmail.id,
          recipientEmail: selectedEmail.businessEmail,
          subject: editedSubject || selectedEmail.subject || "Business Opportunity",
          body: editedBody || selectedEmail.aiEmail,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to send email");
      }

      // Update the campaigns list
      setCampaigns(campaigns.map(c => 
        c.email?.id === selectedEmail.id 
          ? { ...c, email: { ...c.email!, status: 'sent' as EmailStatus } }
          : c
      ));
      
      toast({
        title: "Email sent successfully",
        description: `Email sent to ${selectedEmail.businessEmail}`,
      });
      
      setSelectedEmail(null);
    } catch (error: any) {
      console.error("Send email error:", error);
      toast({
        title: "Failed to send email",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  const openEmailModal = (email: GeneratedEmail) => {
    setSelectedEmail(email);
    setEditedSubject(email.editedSubject || email.subject || "");
    setEditedBody(email.editedBody || email.aiEmail || "");
  };

  const getEmailStatusBadge = (status: EmailStatus) => {
    const styles = {
      not_generated: "bg-slate-100 text-slate-600 border-slate-200",
      generated: "bg-blue-100 text-blue-700 border-blue-200",
      edited: "bg-amber-100 text-amber-700 border-amber-200",
      sent: "bg-green-100 text-green-700 border-green-200",
    };

    const labels = {
      not_generated: "Not Generated",
      generated: "Generated",
      edited: "Edited",
      sent: "Sent",
    };

    const icons = {
      not_generated: <Clock className="w-3 h-3 mr-1" />,
      generated: <Sparkles className="w-3 h-3 mr-1" />,
      edited: <Save className="w-3 h-3 mr-1" />,
      sent: <Check className="w-3 h-3 mr-1" />,
    };

    return (
      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border flex items-center ${styles[status]}`} data-testid={`badge-email-status-${status}`}>
        {icons[status]}
        {labels[status]}
      </span>
    );
  };

  const hasEmailContent = (email: GeneratedEmail | undefined) => {
    return email && email.aiEmail && email.aiEmail.trim() !== '';
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-10">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-10 text-center md:text-left flex flex-col md:flex-row md:items-end justify-between gap-4"
        >
          <div>
            <h1 className="text-4xl font-bold text-slate-900 tracking-tight mb-2">Admin Dashboard</h1>
            <p className="text-slate-500 text-lg">Manage campaigns and AI-generated emails</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button
              onClick={() => {
                fetchCampaigns();
                fetchSubmissions();
              }}
              disabled={loading || loadingSubmissions}
              variant="outline"
              data-testid="button-refresh"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${(loading || loadingSubmissions) ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button asChild variant="outline">
              <Link href="/" data-testid="link-back-form">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Form
              </Link>
            </Button>
          </div>
        </motion.div>

        <Tabs defaultValue="campaigns" className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-2" data-testid="tabs-admin">
            <TabsTrigger value="campaigns" data-testid="tab-campaigns" className="flex items-center gap-2">
              <Building2 className="w-4 h-4" />
              Campaigns ({campaigns.length})
            </TabsTrigger>
            <TabsTrigger value="submissions" data-testid="tab-submissions" className="flex items-center gap-2">
              <Mail className="w-4 h-4" />
              Submissions ({submissions.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="campaigns" className="space-y-6">
            <section>
          
          {loading && campaigns.length === 0 ? (
            <div className="text-center py-20">
              <RefreshCw className="w-12 h-12 animate-spin text-slate-400 mx-auto mb-4" />
              <p className="text-slate-500">Loading campaigns...</p>
            </div>
          ) : campaigns.length === 0 ? (
            <div className="text-center py-20 text-slate-400 bg-white rounded-2xl border border-slate-100">
              <Building2 className="w-16 h-16 mx-auto mb-4 opacity-30" />
              <p className="text-xl">No campaigns found</p>
              <p className="text-sm mt-2">Campaign data will appear here from the CampaignData collection</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {campaigns.map((campaign, index) => (
                <motion.div
                  key={campaign.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="bg-white rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden border border-slate-100 flex flex-col"
                  data-testid={`card-campaign-${campaign.id}`}
                >
                  <div className="p-6 flex-1">
                    <div className="flex items-start justify-between mb-4 gap-2">
                      <div className="flex items-center space-x-2 text-blue-600 min-w-0">
                        <Building2 className="w-5 h-5 flex-shrink-0" />
                        <h3 className="font-semibold text-lg text-slate-900 truncate">{campaign.businessName}</h3>
                      </div>
                      {campaign.hasEmail && campaign.email ? (
                        getEmailStatusBadge(campaign.email.status)
                      ) : (
                        <Badge variant="secondary" className="flex-shrink-0" data-testid="badge-no-email">
                          No Email
                        </Badge>
                      )}
                    </div>
                    
                    <div className="space-y-3">
                      {(campaign.city || campaign.address) && (
                        <div className="flex items-center space-x-2 text-slate-600">
                          <MapPin className="w-4 h-4 flex-shrink-0" />
                          <div className="text-sm truncate">
                            {campaign.city || campaign.address}
                          </div>
                        </div>
                      )}

                      {campaign.businessEmail && (
                        <div className="flex items-center space-x-2 text-slate-600">
                          <Mail className="w-4 h-4 flex-shrink-0" />
                          <span className="text-sm truncate">{campaign.businessEmail}</span>
                        </div>
                      )}

                      {campaign.phone && (
                        <div className="flex items-center space-x-2 text-slate-600">
                          <Phone className="w-4 h-4 flex-shrink-0" />
                          <span className="text-sm">{campaign.phone}</span>
                        </div>
                      )}

                      {campaign.rating && (
                        <div className="flex items-center space-x-2 text-slate-600">
                          <Star className="w-4 h-4 flex-shrink-0 text-yellow-500" />
                          <span className="text-sm">{campaign.rating}</span>
                        </div>
                      )}

                      {campaign.mapLink && (
                        <div className="flex items-center space-x-2">
                          <ExternalLink className="w-4 h-4 flex-shrink-0 text-slate-500" />
                          <a 
                            href={campaign.mapLink} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="text-sm text-blue-600 hover:underline"
                            data-testid={`link-map-${campaign.id}`}
                          >
                            View on Map
                          </a>
                        </div>
                      )}

                      <div className="pt-3 border-t border-slate-100">
                        <div className="text-xs text-slate-400">
                          Added {new Date(campaign.createdAt).toLocaleDateString('en-US', { 
                            month: 'short', 
                            day: 'numeric', 
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 space-y-3">
                      <Select 
                        value={selectedProducts[campaign.id] || campaign.email?.selectedProduct || ""} 
                        onValueChange={(value) => setSelectedProducts({...selectedProducts, [campaign.id]: value as ProductType})}
                      >
                        <SelectTrigger className="w-full" data-testid={`select-product-${campaign.id}`}>
                          <SelectValue placeholder="Select Product" />
                        </SelectTrigger>
                        <SelectContent>
                          {productTypes.map((product) => (
                            <SelectItem key={product} value={product}>
                              {product}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <div className="flex gap-2">
                        {campaign.hasEmail && hasEmailContent(campaign.email) ? (
                          <Button
                            onClick={() => campaign.email && openEmailModal(campaign.email)}
                            className="flex-1"
                            variant="default"
                            data-testid={`button-view-email-${campaign.id}`}
                          >
                            <Mail className="w-4 h-4 mr-2" />
                            View / Edit Email
                          </Button>
                        ) : (
                          <Button
                            onClick={() => handleGenerateEmail(campaign)}
                            disabled={generating === campaign.id || !selectedProducts[campaign.id]}
                            className="flex-1"
                            variant="default"
                            data-testid={`button-generate-${campaign.id}`}
                          >
                            {generating === campaign.id ? (
                              <>
                                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                                Generating...
                              </>
                            ) : (
                              <>
                                <Sparkles className="w-4 h-4 mr-2" />
                                Generate Email
                              </>
                            )}
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
            </section>
          </TabsContent>

          <TabsContent value="submissions" className="space-y-6">
            <section>

        {loadingSubmissions && submissions.length === 0 ? (
          <div className="text-center py-20">
            <RefreshCw className="w-12 h-12 animate-spin text-slate-400 mx-auto mb-4" />
            <p className="text-slate-500">Loading submissions...</p>
          </div>
        ) : submissions.length === 0 ? (
          <div className="text-center py-20 text-slate-400 bg-white rounded-2xl border border-slate-100">
            <Mail className="w-16 h-16 mx-auto mb-4 opacity-30" />
            <p className="text-xl">No submissions yet</p>
            <p className="text-sm mt-2">New business inquiries will appear here</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {submissions.map((submission, index) => (
              <motion.div
                key={submission.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-white rounded-2xl shadow-sm hover:shadow-xl transition-shadow duration-300 overflow-hidden border border-slate-100 flex flex-col"
                data-testid={`card-submission-${submission.id}`}
              >
                <div className="p-6 flex-1">
                  <div className="flex items-center space-x-2 text-blue-600 mb-4">
                    <Building2 className="w-5 h-5 flex-shrink-0" />
                    <h3 className="font-semibold text-lg text-slate-900">{submission.businessType}</h3>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2 text-slate-600">
                      <MapPin className="w-4 h-4 flex-shrink-0" />
                      <div className="text-sm">
                        {submission.city}, {submission.province}, {submission.country}
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-100">
                      <div className="text-xs text-slate-400">
                        Submitted {new Date(submission.createdAt).toLocaleDateString('en-US', { 
                          month: 'short', 
                          day: 'numeric', 
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
            </section>
          </TabsContent>
        </Tabs>

        <AlertDialog open={showNoEmailAlert} onOpenChange={setShowNoEmailAlert}>
          <AlertDialogContent data-testid="alert-no-email">
            <AlertDialogHeader>
              <AlertDialogTitle>No Recipient Email</AlertDialogTitle>
              <AlertDialogDescription>
                This campaign does not have a recipient email address. Please add an email address before sending.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogAction data-testid="button-close-alert">OK</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <Dialog open={selectedEmail !== null} onOpenChange={() => setSelectedEmail(null)}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogDescription className="sr-only">
              Review and edit AI-generated email for {selectedEmail?.businessName}
            </DialogDescription>
            {selectedEmail && (
              <>
                <DialogHeader>
                  <DialogTitle className="text-2xl font-bold flex items-center gap-2">
                    <Mail className="w-6 h-6 text-blue-600" />
                    Email Review
                  </DialogTitle>
                </DialogHeader>
                
                <div className="space-y-6 mt-4">
                  {selectedEmail.businessEmail && (
                    <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                      <div className="flex items-center gap-2">
                        <Mail className="w-5 h-5 text-blue-600 flex-shrink-0" />
                        <div>
                          <div className="text-xs text-blue-600 font-medium mb-1">Contact Email</div>
                          <a href={`mailto:${selectedEmail.businessEmail}`} className="text-blue-700 hover:underline font-semibold text-lg" data-testid="link-email">
                            {selectedEmail.businessEmail}
                          </a>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="bg-slate-50 rounded-lg p-4 space-y-3">
                    <h3 className="font-semibold text-lg flex items-center gap-2">
                      <Building2 className="w-5 h-5 text-blue-600" />
                      {selectedEmail.businessName}
                    </h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {selectedEmail.address && (
                        <div className="flex items-start gap-2">
                          <MapPin className="w-4 h-4 mt-0.5 text-slate-500 flex-shrink-0" />
                          <div className="text-slate-600 text-sm">
                            {selectedEmail.address}
                          </div>
                        </div>
                      )}
                      
                      {selectedEmail.phoneNumber && (
                        <div className="flex items-center gap-2">
                          <Phone className="w-4 h-4 text-slate-500 flex-shrink-0" />
                          <span className="text-slate-600 text-sm">{selectedEmail.phoneNumber}</span>
                        </div>
                      )}
                      
                      {selectedEmail.website && (
                        <div className="flex items-center gap-2">
                          <Globe className="w-4 h-4 text-slate-500 flex-shrink-0" />
                          <a href={selectedEmail.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-sm">
                            {selectedEmail.website}
                          </a>
                        </div>
                      )}
                      
                      {selectedEmail.mapLink && (
                        <div className="flex items-center gap-2">
                          <ExternalLink className="w-4 h-4 text-slate-500 flex-shrink-0" />
                          <a href={selectedEmail.mapLink} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-sm" data-testid="link-map">
                            View on Map
                          </a>
                        </div>
                      )}
                    </div>

                    {selectedEmail.selectedProduct && (
                      <div className="pt-2 border-t border-slate-200">
                        <span className="text-xs text-slate-500">Product: </span>
                        <span className="text-sm font-medium text-slate-700">{selectedEmail.selectedProduct}</span>
                      </div>
                    )}

                    <div className="pt-2 border-t border-slate-200 flex items-center gap-2">
                      <span className="text-xs text-slate-500">Status: </span>
                      {getEmailStatusBadge(selectedEmail.status)}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-semibold text-slate-700 mb-2 block">Email Subject</label>
                      <Input
                        value={editedSubject}
                        onChange={(e) => setEditedSubject(e.target.value)}
                        placeholder="Enter email subject..."
                        className="w-full"
                        data-testid="input-email-subject"
                      />
                    </div>
                    
                    <div>
                      <label className="text-sm font-semibold text-slate-700 mb-2 block">Email Body</label>
                      <Textarea
                        value={editedBody}
                        onChange={(e) => setEditedBody(e.target.value)}
                        placeholder="Enter email body..."
                        className="w-full min-h-[250px] resize-none"
                        data-testid="input-email-body"
                      />
                    </div>
                  </div>

                  <div className="flex gap-3 pt-4 border-t">
                    <Button
                      onClick={() => setSelectedEmail(null)}
                      variant="outline"
                      className="flex-1"
                      data-testid="button-close-modal"
                    >
                      Close
                    </Button>
                    <Button
                      onClick={handleSaveEmail}
                      disabled={saving || !editedSubject || !editedBody}
                      variant="secondary"
                      className="flex-1"
                      data-testid="button-save-email"
                    >
                      {saving ? (
                        <>
                          <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4 mr-2" />
                          Save Changes
                        </>
                      )}
                    </Button>
                    <Button
                      onClick={handleSendEmail}
                      disabled={sending || selectedEmail.status === 'sent' || !hasEmailContent(selectedEmail)}
                      className="flex-1"
                      data-testid="button-send-email"
                    >
                      {sending ? (
                        <>
                          <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                          Sending...
                        </>
                      ) : selectedEmail.status === 'sent' ? (
                        <>
                          <Check className="w-4 h-4 mr-2" />
                          Email Sent
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4 mr-2" />
                          Send Email
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
