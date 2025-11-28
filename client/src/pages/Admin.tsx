import { motion } from "framer-motion";
import { Check, X, Building2, Clock, ArrowLeft, RefreshCw, MapPin, Mail, ExternalLink, Send, Phone, Globe, Sparkles, Save, ChevronDown } from "lucide-react";
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
import { productTypes, type ProductType, type EmailStatus } from "@shared/schema";

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

interface GeneratedEmail {
  id: string;
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

export default function Admin() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [generatedEmails, setGeneratedEmails] = useState<GeneratedEmail[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingEmails, setLoadingEmails] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [selectedEmail, setSelectedEmail] = useState<GeneratedEmail | null>(null);
  const [sending, setSending] = useState(false);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState<string | null>(null);
  const [showNoEmailAlert, setShowNoEmailAlert] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState<Record<string, ProductType>>({});
  const [editedSubject, setEditedSubject] = useState("");
  const [editedBody, setEditedBody] = useState("");
  const { toast } = useToast();

  const fetchSubmissions = async () => {
    try {
      setLoading(true);
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
      setLoading(false);
    }
  };

  const fetchGeneratedEmails = async () => {
    try {
      setLoadingEmails(true);
      const response = await fetch("/api/emails/generated");
      
      if (!response.ok) {
        throw new Error("Failed to fetch generated emails");
      }
      
      const data = await response.json();
      setGeneratedEmails(data);
    } catch (error: any) {
      console.error("Fetch emails error:", error);
      toast({
        title: "Error loading emails",
        description: error.message || "Please check your Firebase configuration.",
        variant: "destructive",
      });
    } finally {
      setLoadingEmails(false);
    }
  };

  useEffect(() => {
    fetchSubmissions();
    fetchGeneratedEmails();
  }, []);

  const handleStatusChange = async (id: string, newStatus: string) => {
    setUpdating(id);
    
    try {
      const response = await fetch(`/api/submissions/${id}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        throw new Error("Failed to update status");
      }

      const updated = await response.json();
      
      setSubmissions(submissions.map(s => s.id === id ? updated : s));
      
      toast({
        title: "Status updated",
        description: `Submission marked as ${newStatus}.`,
      });
    } catch (error: any) {
      console.error("Update error:", error);
      toast({
        title: "Update failed",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setUpdating(null);
    }
  };

  const handleGenerateEmail = async (email: GeneratedEmail) => {
    const selectedProduct = selectedProducts[email.id];
    
    if (!selectedProduct) {
      toast({
        title: "Select a product",
        description: "Please select a product before generating the email.",
        variant: "destructive",
      });
      return;
    }

    setGenerating(email.id);
    
    try {
      const response = await fetch("/api/emails/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          emailId: email.id,
          businessName: email.businessName,
          businessEmail: email.businessEmail || undefined,
          phoneNumber: email.phoneNumber || undefined,
          selectedProduct,
          address: email.address,
          website: email.website || undefined,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to generate email");
      }

      const result = await response.json();
      
      setGeneratedEmails(generatedEmails.map(e => 
        e.id === email.id ? result.email : e
      ));
      
      toast({
        title: "Email generated",
        description: "AI-generated email is ready for review.",
      });
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
      
      setGeneratedEmails(generatedEmails.map(e => 
        e.id === selectedEmail.id ? result.email : e
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

      setGeneratedEmails(generatedEmails.map(e => 
        e.id === selectedEmail.id ? { ...e, status: 'sent' as EmailStatus } : e
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

  const getStatusBadge = (status: EmailStatus) => {
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
      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border flex items-center ${styles[status]}`} data-testid={`badge-status-${status}`}>
        {icons[status]}
        {labels[status]}
      </span>
    );
  };

  const hasEmailContent = (email: GeneratedEmail) => {
    return email.aiEmail && email.aiEmail.trim() !== '';
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
            <p className="text-slate-500 text-lg">Review submissions and AI-generated emails</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button
              onClick={() => {
                fetchSubmissions();
                fetchGeneratedEmails();
              }}
              disabled={loading || loadingEmails}
              variant="outline"
              data-testid="button-refresh"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${(loading || loadingEmails) ? 'animate-spin' : ''}`} />
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

        <Tabs defaultValue="emails" className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-2" data-testid="tabs-admin">
            <TabsTrigger value="emails" data-testid="tab-emails" className="flex items-center gap-2">
              <Mail className="w-4 h-4" />
              Emails ({generatedEmails.length})
            </TabsTrigger>
            <TabsTrigger value="submissions" data-testid="tab-submissions" className="flex items-center gap-2">
              <Building2 className="w-4 h-4" />
              Submissions ({submissions.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="emails" className="space-y-6">
            <section>
          
          {loadingEmails && generatedEmails.length === 0 ? (
            <div className="text-center py-20">
              <RefreshCw className="w-12 h-12 animate-spin text-slate-400 mx-auto mb-4" />
              <p className="text-slate-500">Loading emails...</p>
            </div>
          ) : generatedEmails.length === 0 ? (
            <div className="text-center py-20 text-slate-400 bg-white rounded-2xl border border-slate-100">
              <Mail className="w-16 h-16 mx-auto mb-4 opacity-30" />
              <p className="text-xl">No AI-generated emails yet</p>
              <p className="text-sm mt-2">Generated emails from Make.com will appear here</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {generatedEmails.map((email, index) => (
                <motion.div
                  key={email.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="bg-white rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden border border-slate-100 flex flex-col"
                  data-testid={`card-email-${email.id}`}
                >
                  <div className="p-6 flex-1">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center space-x-2 text-blue-600">
                        <Building2 className="w-5 h-5 flex-shrink-0" />
                        <h3 className="font-semibold text-lg text-slate-900">{email.businessName}</h3>
                      </div>
                      {getStatusBadge(email.status)}
                    </div>
                    
                    <div className="space-y-3">
                      <div className="flex items-center space-x-2 text-slate-600">
                        <MapPin className="w-4 h-4 flex-shrink-0" />
                        <div className="text-sm">
                          {(() => {
                            try {
                              const parts = email.address.split(',').map(p => p.trim());
                              if (parts.length >= 3) {
                                const country = parts[parts.length - 1];
                                const provinceSection = parts[parts.length - 2].split(' ');
                                const province = provinceSection[0];
                                const city = parts[parts.length - 3];
                                return `${city}, ${province}, ${country}`;
                              }
                            } catch (e) {}
                            return email.address;
                          })()}
                        </div>
                      </div>

                      {email.businessEmail && (
                        <div className="flex items-center space-x-2 text-slate-600">
                          <Mail className="w-4 h-4 flex-shrink-0" />
                          <span className="text-sm truncate">{email.businessEmail}</span>
                        </div>
                      )}

                      {email.phoneNumber && (
                        <div className="flex items-center space-x-2 text-slate-600">
                          <Phone className="w-4 h-4 flex-shrink-0" />
                          <span className="text-sm">{email.phoneNumber}</span>
                        </div>
                      )}

                      {email.website && (
                        <div className="flex items-center space-x-2 text-slate-600">
                          <Globe className="w-4 h-4 flex-shrink-0" />
                          <a href={email.website} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline truncate">
                            {email.website}
                          </a>
                        </div>
                      )}

                      <div className="pt-3 border-t border-slate-100">
                        <div className="text-xs text-slate-400">
                          Generated {new Date(email.createdAt).toLocaleDateString('en-US', { 
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
                        value={selectedProducts[email.id] || email.selectedProduct || ""} 
                        onValueChange={(value) => setSelectedProducts({...selectedProducts, [email.id]: value as ProductType})}
                      >
                        <SelectTrigger className="w-full" data-testid={`select-product-${email.id}`}>
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
                        <Button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleGenerateEmail(email);
                          }}
                          disabled={generating === email.id || !selectedProducts[email.id]}
                          className="flex-1"
                          variant="default"
                          data-testid={`button-generate-${email.id}`}
                        >
                          {generating === email.id ? (
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
                      </div>
                    </div>
                  </div>

                  {hasEmailContent(email) && (
                    <div 
                      className="p-4 bg-blue-50 border-t border-blue-100 text-center cursor-pointer hover:bg-blue-100 transition-colors"
                      onClick={() => openEmailModal(email)}
                    >
                      <p className="text-sm text-blue-700 font-medium">Click to review & edit email</p>
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          )}
            </section>
          </TabsContent>

          <TabsContent value="submissions" className="space-y-6">
            <section>

        {loading && submissions.length === 0 ? (
          <div className="text-center py-20">
            <RefreshCw className="w-12 h-12 animate-spin text-slate-400 mx-auto mb-4" />
            <p className="text-slate-500">Loading submissions...</p>
          </div>
        ) : submissions.length === 0 ? (
          <div className="text-center py-20 text-slate-400">
            <Building2 className="w-16 h-16 mx-auto mb-4 opacity-30" />
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
                This email card does not have a recipient email address. Please add an email address before sending.
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
                      <div className="flex items-start gap-2">
                        <MapPin className="w-4 h-4 mt-0.5 text-slate-500 flex-shrink-0" />
                        <div className="text-slate-600 text-sm">
                          {selectedEmail.address}
                        </div>
                      </div>
                      
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

function Badge({ status }: { status: string }) {
  const styles = {
    pending: "bg-amber-100 text-amber-700 border-amber-200",
    contacted: "bg-green-100 text-green-700 border-green-200",
    approved: "bg-blue-100 text-blue-700 border-blue-200",
    rejected: "bg-red-100 text-red-700 border-red-200",
  };

  const icons = {
    pending: <Clock className="w-3 h-3 mr-1" />,
    contacted: <Check className="w-3 h-3 mr-1" />,
    approved: <Check className="w-3 h-3 mr-1" />,
    rejected: <X className="w-3 h-3 mr-1" />,
  };

  // @ts-ignore
  const currentStyle = styles[status] || styles.pending;
  // @ts-ignore
  const currentIcon = icons[status] || icons.pending;

  return (
    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border flex items-center capitalize ${currentStyle}`} data-testid={`badge-status-${status}`}>
      {currentIcon}
      {status}
    </span>
  );
}
