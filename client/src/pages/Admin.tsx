import { motion } from "framer-motion";
import { Check, X, Mail, Building2, Clock, ArrowLeft } from "lucide-react";
import { useState } from "react";
import { Link } from "wouter";

// Mock Data
const INITIAL_DRAFTS = [
  {
    id: 1,
    businessName: "Acme Corp",
    email: "contact@acmecorp.com",
    body: "Hello, we are interested in your enterprise tier services for our upcoming project launch in Q4.",
    status: "pending",
  },
  {
    id: 2,
    businessName: "Zenith Design",
    email: "hello@zenith.design",
    body: "Looking to partner on the new UX research initiative. Please let us know your availability.",
    status: "approved",
  },
  {
    id: 3,
    businessName: "Global Logistics",
    email: "support@globallog.io",
    body: "Inquiry regarding the API rate limits and custom integration support.",
    status: "rejected",
  },
  {
    id: 4,
    businessName: "Starlight Coffee",
    email: "manager@starlight.coffee",
    body: "We'd like to order bulk beans for our 5 new locations opening next month.",
    status: "pending",
  },
];

export default function Admin() {
  const [drafts, setDrafts] = useState(INITIAL_DRAFTS);

  const handleStatusChange = (id: number, newStatus: string) => {
    setDrafts(drafts.map(d => d.id === id ? { ...d, status: newStatus } : d));
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
            <p className="text-slate-500 text-lg">Review and manage email drafts</p>
          </div>
          <Link href="/">
            <a className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-white border border-slate-200 text-slate-600 font-medium hover:bg-slate-50 hover:text-slate-900 transition-colors shadow-sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Form
            </a>
          </Link>
        </motion.div>

        {drafts.length === 0 ? (
          <div className="text-center py-20 text-slate-400">
            <p className="text-xl">No drafts available</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {drafts.map((draft, index) => (
              <motion.div
                key={draft.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-white rounded-2xl shadow-sm hover:shadow-xl transition-shadow duration-300 overflow-hidden border border-slate-100 flex flex-col"
                data-testid={`card-draft-${draft.id}`}
              >
                <div className="p-6 flex-1">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-2 text-blue-600">
                      <Building2 className="w-5 h-5" />
                      <h3 className="font-semibold text-lg text-slate-900">{draft.businessName}</h3>
                    </div>
                    <Badge status={draft.status} />
                  </div>
                  
                  <div className="flex items-center space-x-2 text-slate-400 mb-4 text-sm">
                    <Mail className="w-4 h-4" />
                    <span>{draft.email}</span>
                  </div>

                  <div className="bg-slate-50 rounded-xl p-4 text-slate-600 text-sm leading-relaxed h-32 overflow-y-auto border border-slate-100 custom-scrollbar">
                    {draft.body}
                  </div>
                </div>

                <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-between gap-3">
                  <button
                    onClick={() => handleStatusChange(draft.id, "approved")}
                    className="flex-1 flex items-center justify-center py-2.5 rounded-lg bg-white border border-slate-200 text-slate-700 font-medium hover:bg-green-50 hover:text-green-700 hover:border-green-200 transition-all duration-200 shadow-sm group"
                    title="Approve"
                    data-testid={`btn-approve-${draft.id}`}
                  >
                    <Check className="w-4 h-4 mr-2 group-hover:scale-110 transition-transform" />
                    Approve
                  </button>
                  <button
                    onClick={() => handleStatusChange(draft.id, "rejected")}
                    className="flex-1 flex items-center justify-center py-2.5 rounded-lg bg-white border border-slate-200 text-slate-700 font-medium hover:bg-red-50 hover:text-red-700 hover:border-red-200 transition-all duration-200 shadow-sm group"
                    title="Reject"
                    data-testid={`btn-reject-${draft.id}`}
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
    approved: "bg-green-100 text-green-700 border-green-200",
    rejected: "bg-red-100 text-red-700 border-red-200",
    sent: "bg-blue-100 text-blue-700 border-blue-200",
  };

  const icons = {
    pending: <Clock className="w-3 h-3 mr-1" />,
    approved: <Check className="w-3 h-3 mr-1" />,
    rejected: <X className="w-3 h-3 mr-1" />,
    sent: <Mail className="w-3 h-3 mr-1" />,
  };

  // @ts-ignore
  const currentStyle = styles[status] || styles.pending;
  // @ts-ignore
  const currentIcon = icons[status] || icons.pending;

  return (
    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border flex items-center capitalize ${currentStyle}`}>
      {currentIcon}
      {status}
    </span>
  );
}
