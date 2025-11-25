import { motion } from "framer-motion";
import { Check, X, Building2, Clock, ArrowLeft, RefreshCw, MapPin, Globe, Mail, Phone, ExternalLink } from "lucide-react";
import { useState, useEffect } from "react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

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
  city: string;
  province: string;
  country: string;
  email: string;
  phone?: string;
  website?: string;
  emailSubject: string;
  emailBody: string;
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

        {/* Generated Emails Section */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-2">
            <Mail className="w-6 h-6 text-blue-600" />
            AI-Generated Emails ({generatedEmails.length})
          </h2>
          
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
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center space-x-2 text-blue-600">
                        <Building2 className="w-5 h-5 flex-shrink-0" />
                        <h3 className="font-semibold text-lg text-slate-900">{email.businessName}</h3>
                      </div>
                      <Badge status={email.status} />
                    </div>
                    
                    <div className="space-y-3">
                      <div className="flex items-start space-x-2 text-slate-600">
                        <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                        <div className="text-sm">
                          <div>{email.city}, {email.province}</div>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2 text-slate-600">
                        <Globe className="w-4 h-4 flex-shrink-0" />
                        <span className="text-sm">{email.country}</span>
                      </div>

                      {email.email && (
                        <div className="flex items-center space-x-2 text-slate-600">
                          <Mail className="w-4 h-4 flex-shrink-0" />
                          <span className="text-sm truncate">{email.email}</span>
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

        {/* Submissions Section */}
        <section>
          <h2 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-2">
            <Building2 className="w-6 h-6 text-blue-600" />
            Business Submissions ({submissions.length})
          </h2>

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
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-2 text-blue-600">
                      <Building2 className="w-5 h-5 flex-shrink-0" />
                      <h3 className="font-semibold text-lg text-slate-900">{submission.businessType}</h3>
                    </div>
                    <Badge status={submission.status} />
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex items-start space-x-2 text-slate-600">
                      <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      <div className="text-sm">
                        <div>{submission.city}, {submission.province}</div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2 text-slate-600">
                      <Globe className="w-4 h-4 flex-shrink-0" />
                      <span className="text-sm">{submission.country}</span>
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

                <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-between gap-3">
                  <button
                    onClick={() => handleStatusChange(submission.id, "contacted")}
                    disabled={updating === submission.id}
                    className="flex-1 flex items-center justify-center py-2.5 rounded-lg bg-white border border-slate-200 text-slate-700 font-medium hover:bg-green-50 hover:text-green-700 hover:border-green-200 transition-all duration-200 shadow-sm group disabled:opacity-50"
                    title="Mark as Contacted"
                    data-testid={`btn-contacted-${submission.id}`}
                  >
                    <Check className="w-4 h-4 mr-2 group-hover:scale-110 transition-transform" />
                    Contacted
                  </button>
                  <button
                    onClick={() => handleStatusChange(submission.id, "rejected")}
                    disabled={updating === submission.id}
                    className="flex-1 flex items-center justify-center py-2.5 rounded-lg bg-white border border-slate-200 text-slate-700 font-medium hover:bg-red-50 hover:text-red-700 hover:border-red-200 transition-all duration-200 shadow-sm group disabled:opacity-50"
                    title="Reject"
                    data-testid={`btn-reject-${submission.id}`}
                  >
                    <X className="w-4 h-4 mr-2 group-hover:scale-110 transition-transform" />
                    Reject
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
        </section>

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
                  {/* Business Info */}
                  <div className="bg-slate-50 rounded-lg p-4 space-y-3">
                    <h3 className="font-semibold text-lg flex items-center gap-2">
                      <Building2 className="w-5 h-5 text-blue-600" />
                      {selectedEmail.businessName}
                    </h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                      <div className="flex items-start gap-2">
                        <MapPin className="w-4 h-4 mt-0.5 text-slate-500 flex-shrink-0" />
                        <div>
                          <div className="text-slate-600">{selectedEmail.address}</div>
                          <div className="text-slate-500">{selectedEmail.city}, {selectedEmail.province}</div>
                          <div className="text-slate-500">{selectedEmail.country}</div>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        {selectedEmail.email && (
                          <div className="flex items-center gap-2">
                            <Mail className="w-4 h-4 text-slate-500 flex-shrink-0" />
                            <a href={`mailto:${selectedEmail.email}`} className="text-blue-600 hover:underline text-sm" data-testid="link-email">
                              {selectedEmail.email}
                            </a>
                          </div>
                        )}
                        
                        {selectedEmail.phone && (
                          <div className="flex items-center gap-2">
                            <Phone className="w-4 h-4 text-slate-500 flex-shrink-0" />
                            <a href={`tel:${selectedEmail.phone}`} className="text-blue-600 hover:underline text-sm" data-testid="link-phone">
                              {selectedEmail.phone}
                            </a>
                          </div>
                        )}
                        
                        {selectedEmail.website && (
                          <div className="flex items-center gap-2">
                            <ExternalLink className="w-4 h-4 text-slate-500 flex-shrink-0" />
                            <a href={selectedEmail.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-sm" data-testid="link-website">
                              Visit Website
                            </a>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Email Content */}
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-semibold text-slate-700 mb-1 block">Subject</label>
                      <div className="bg-white border border-slate-200 rounded-lg p-3 text-slate-900" data-testid="text-email-subject">
                        {selectedEmail.emailSubject}
                      </div>
                    </div>
                    
                    <div>
                      <label className="text-sm font-semibold text-slate-700 mb-1 block">Email Body</label>
                      <div className="bg-white border border-slate-200 rounded-lg p-4 text-slate-700 whitespace-pre-wrap min-h-[200px]" data-testid="text-email-body">
                        {selectedEmail.emailBody}
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
                      onClick={() => {
                        window.open(`mailto:${selectedEmail.email}?subject=${encodeURIComponent(selectedEmail.emailSubject)}&body=${encodeURIComponent(selectedEmail.emailBody)}`, '_blank');
                      }}
                      className="flex-1 px-4 py-2 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                      data-testid="button-send-email"
                    >
                      <Mail className="w-4 h-4" />
                      Open in Email Client
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
