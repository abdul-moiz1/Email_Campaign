import { motion } from "framer-motion";
import { Check, X, Building2, Clock, ArrowLeft, RefreshCw, MapPin, Globe } from "lucide-react";
import { useState, useEffect } from "react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";

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
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
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

  useEffect(() => {
    fetchSubmissions();
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
            <h1 className="text-4xl font-bold text-slate-900 tracking-tight mb-2">Business Inquiries</h1>
            <p className="text-slate-500 text-lg">Review and manage incoming submissions</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={fetchSubmissions}
              disabled={loading}
              className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-white border border-slate-200 text-slate-600 font-medium hover:bg-slate-50 hover:text-slate-900 transition-colors shadow-sm disabled:opacity-50"
              data-testid="button-refresh"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <Link href="/">
              <a className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-white border border-slate-200 text-slate-600 font-medium hover:bg-slate-50 hover:text-slate-900 transition-colors shadow-sm" data-testid="link-back-form">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Form
              </a>
            </Link>
          </div>
        </motion.div>

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
