import { motion } from "framer-motion";
import { Check, X, Building2, Clock, ArrowLeft, RefreshCw, MapPin, Mail, ExternalLink, Send } from "lucide-react";
import { useState, useEffect } from "react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogAction } from "@/components/ui/alert-dialog";

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
  aiEmail: string;
  mapLink?: string;
  status: 'pending' | 'approved' | 'sent';
  createdAt: string;
}

export default function Admin() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [generatedEmails, setGeneratedEmails] = useState<GeneratedEmail[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingEmails, setLoadingEmails] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [selectedEmail, setSelectedEmail] = useState<GeneratedEmail | null>(null);
  const [sending, setSending] = useState(false);
  const [showNoEmailAlert, setShowNoEmailAlert] = useState(false);
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

  const handleSendEmail = async () => {
    if (!selectedEmail) return;

    // Check if recipient email exists
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
          subject: "Personalized Business Opportunity",
          body: selectedEmail.aiEmail,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to send email");
      }

      const result = await response.json();
      
      // Update local state to reflect sent status
      setGeneratedEmails(generatedEmails.map(e => 
        e.id === selectedEmail.id ? { ...e, status: 'sent' } : e
      ));
      
      toast({
        title: "Email sent successfully",
        description: `Email sent to ${selectedEmail.businessEmail}`,
      });
      
      // Close modal
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
          <div className="flex gap-2">
            <button
              onClick={() => {
                fetchSubmissions();
                fetchGeneratedEmails();
              }}
              disabled={loading || loadingEmails}
              className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-white border border-slate-200 text-slate-600 font-medium hover:bg-slate-50 hover:text-slate-900 transition-colors shadow-sm disabled:opacity-50"
              data-testid="button-refresh"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${(loading || loadingEmails) ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <Link 
              href="/" 
              className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-white border border-slate-200 text-slate-600 font-medium hover:bg-slate-50 hover:text-slate-900 transition-colors shadow-sm" 
              data-testid="link-back-form"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Form
            </Link>
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
                  onClick={() => setSelectedEmail(email)}
                  className="bg-white rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden border border-slate-100 cursor-pointer flex flex-col"
                  data-testid={`card-email-${email.id}`}
                >
                  <div className="p-6 flex-1">
                    <div className="flex items-center space-x-2 text-blue-600 mb-4">
                      <Building2 className="w-5 h-5 flex-shrink-0" />
                      <h3 className="font-semibold text-lg text-slate-900">{email.businessName}</h3>
                    </div>
                    
                    <div className="space-y-3">
                      <div className="flex items-center space-x-2 text-slate-600">
                        <MapPin className="w-4 h-4 flex-shrink-0" />
                        <div className="text-sm">
                          {(() => {
                            try {
                              const parts = email.address.split(',').map(p => p.trim());
                              if (parts.length >= 3) {
                                // Extract city (third from end), province (second from end - first word), country (last)
                                const country = parts[parts.length - 1];
                                const provinceSection = parts[parts.length - 2].split(' ');
                                const province = provinceSection[0]; // First word is usually province code
                                const city = parts[parts.length - 3];
                                return `${city}, ${province}, ${country}`;
                              }
                            } catch (e) {
                              // Fallback to full address if parsing fails
                            }
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
                  </div>

                  <div className="p-4 bg-blue-50 border-t border-blue-100 text-center">
                    <p className="text-sm text-blue-700 font-medium">Click to review email</p>
                  </div>
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

        {/* No Email Alert Dialog */}
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

        {/* Email Review Modal */}
        <Dialog open={selectedEmail !== null} onOpenChange={() => setSelectedEmail(null)}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            {selectedEmail && (
              <>
                <DialogHeader>
                  <DialogTitle className="text-2xl font-bold flex items-center gap-2">
                    <Mail className="w-6 h-6 text-blue-600" />
                    Email Review
                  </DialogTitle>
                </DialogHeader>
                
                <div className="space-y-6 mt-4">
                  {/* Email at the top */}
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

                  {/* Business Info */}
                  <div className="bg-slate-50 rounded-lg p-4 space-y-3">
                    <h3 className="font-semibold text-lg flex items-center gap-2">
                      <Building2 className="w-5 h-5 text-blue-600" />
                      {selectedEmail.businessName}
                    </h3>
                    
                    <div className="space-y-2">
                      <div className="flex items-start gap-2">
                        <MapPin className="w-4 h-4 mt-0.5 text-slate-500 flex-shrink-0" />
                        <div className="text-slate-600 text-sm">
                          {selectedEmail.address}
                        </div>
                      </div>
                      
                      {selectedEmail.mapLink && (
                        <div className="flex items-center gap-2">
                          <ExternalLink className="w-4 h-4 text-slate-500 flex-shrink-0" />
                          <a href={selectedEmail.mapLink} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-sm" data-testid="link-map">
                            View on Map
                          </a>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* AI Generated Email Content */}
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-semibold text-slate-700 mb-1 block">AI Generated Email</label>
                      <div className="bg-white border border-slate-200 rounded-lg p-4 text-slate-700 whitespace-pre-wrap min-h-[200px]" data-testid="text-email-body">
                        {selectedEmail.aiEmail}
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-3 pt-4 border-t">
                    <button
                      onClick={() => setSelectedEmail(null)}
                      className="flex-1 px-4 py-2 rounded-lg border border-slate-200 text-slate-700 font-medium hover:bg-slate-50 transition-colors"
                      data-testid="button-close-modal"
                    >
                      Close
                    </button>
                    <button
                      onClick={handleSendEmail}
                      disabled={sending || selectedEmail?.status === 'sent'}
                      className="flex-1 px-4 py-2 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                      data-testid="button-send-email"
                    >
                      {sending ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          Sending...
                        </>
                      ) : selectedEmail?.status === 'sent' ? (
                        <>
                          <Check className="w-4 h-4" />
                          Email Sent
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4" />
                          Send Email
                        </>
                      )}
                    </button>
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
