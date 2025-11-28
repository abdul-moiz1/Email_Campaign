import { motion } from "framer-motion";
import { Check, X, Building2, Clock, ArrowLeft, RefreshCw, MapPin, Mail, ExternalLink, Send, Phone, Globe, Sparkles, Save, Star, Plus, Filter, CheckSquare, Square } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { productTypes, type ProductType, type EmailStatus } from "@shared/schema";

type FilterMode = 'all' | 'withEmail' | 'withoutEmail';

function extractCityCountry(address: string | undefined): string {
  if (!address) return '';
  const parts = address.split(',').map(p => p.trim());
  if (parts.length >= 2) {
    const country = parts[parts.length - 1];
    const cityPart = parts.length >= 3 ? parts[parts.length - 3] : parts[0];
    return `${cityPart}, ${country}`;
  }
  return address;
}

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
  const [selectedCampaign, setSelectedCampaign] = useState<CampaignWithEmail | null>(null);
  const [sending, setSending] = useState(false);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState<string | null>(null);
  const [showNoEmailAlert, setShowNoEmailAlert] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState<Record<string, string>>({});
  const [customProducts, setCustomProducts] = useState<Record<string, string>>({});
  const [showCustomInput, setShowCustomInput] = useState<Record<string, boolean>>({});
  const [editedSubject, setEditedSubject] = useState("");
  const [editedBody, setEditedBody] = useState("");
  const [filterMode, setFilterMode] = useState<FilterMode>('all');
  const [selectedCampaignIds, setSelectedCampaignIds] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  const filteredCampaigns = useMemo(() => {
    switch (filterMode) {
      case 'withEmail':
        return campaigns.filter(c => c.hasEmail && c.email && c.email.aiEmail && c.email.aiEmail.trim() !== '');
      case 'withoutEmail':
        return campaigns.filter(c => !c.hasEmail || !c.email || !c.email.aiEmail || c.email.aiEmail.trim() === '');
      default:
        return campaigns;
    }
  }, [campaigns, filterMode]);

  useEffect(() => {
    setSelectedCampaignIds(prev => {
      const currentCampaignIds = new Set(campaigns.map(c => c.id));
      const validIds = new Set(Array.from(prev).filter(id => currentCampaignIds.has(id)));
      return validIds.size !== prev.size ? validIds : prev;
    });
  }, [campaigns]);

  const handleSelectAll = () => {
    const allIds = new Set(filteredCampaigns.map(c => c.id));
    setSelectedCampaignIds(allIds);
  };

  const handleDeselectAll = () => {
    setSelectedCampaignIds(new Set());
  };

  const toggleCampaignSelection = (campaignId: string) => {
    setSelectedCampaignIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(campaignId)) {
        newSet.delete(campaignId);
      } else {
        newSet.add(campaignId);
      }
      return newSet;
    });
  };

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

  // Initialize edited fields when selectedCampaign changes
  useEffect(() => {
    if (selectedCampaign?.hasEmail && selectedCampaign?.email) {
      setEditedSubject(selectedCampaign.email.editedSubject || selectedCampaign.email.subject || "");
      setEditedBody(selectedCampaign.email.editedBody || selectedCampaign.email.aiEmail || "");
    } else if (selectedCampaign) {
      setEditedSubject("");
      setEditedBody("");
    }
  }, [selectedCampaign]);

  const getSelectedProduct = (campaignId: string): string => {
    const selected = selectedProducts[campaignId];
    if (selected === 'custom') {
      const customProduct = customProducts[campaignId]?.trim() || '';
      return customProduct;
    }
    return selected || '';
  };

  const isGenerateDisabled = (campaignId: string): boolean => {
    const selected = selectedProducts[campaignId];
    if (!selected) return true;
    if (selected === 'custom') {
      const customProduct = customProducts[campaignId]?.trim() || '';
      return customProduct.length === 0;
    }
    return false;
  };

  const handleGenerateEmail = async (campaign: CampaignWithEmail) => {
    const selectedProduct = getSelectedProduct(campaign.id);
    
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

  const getEmailBadge = (campaign: CampaignWithEmail) => {
    const hasEmailContent = campaign.hasEmail && campaign.email && campaign.email.aiEmail && campaign.email.aiEmail.trim() !== '';
    if (hasEmailContent) {
      return (
        <Badge variant="default" className="bg-green-100 text-green-700 border-green-200 flex-shrink-0" data-testid="badge-email">
          <Mail className="w-3 h-3 mr-1" />
          Email
        </Badge>
      );
    }
    return (
      <Badge variant="secondary" className="flex-shrink-0" data-testid="badge-no-email">
        No Email
      </Badge>
    );
  };

  const getDetailedStatusBadge = (status: EmailStatus) => {
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
              <div className="flex flex-col sm:flex-row gap-4 mb-6 items-start sm:items-center justify-between">
                <div className="flex gap-2 flex-wrap items-center">
                  <Select value={filterMode} onValueChange={(value: FilterMode) => setFilterMode(value)}>
                    <SelectTrigger className="w-[160px]" data-testid="select-filter-mode">
                      <Filter className="w-4 h-4 mr-2" />
                      <SelectValue placeholder="Filter" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Campaigns</SelectItem>
                      <SelectItem value="withEmail">With Email</SelectItem>
                      <SelectItem value="withoutEmail">No Email</SelectItem>
                    </SelectContent>
                  </Select>
                  <span className="text-sm text-slate-500">
                    Showing {filteredCampaigns.length} of {campaigns.length}
                  </span>
                </div>
                <div className="flex gap-2 flex-wrap">
                  <Button
                    onClick={handleSelectAll}
                    variant="outline"
                    size="sm"
                    disabled={filteredCampaigns.length === 0}
                    data-testid="button-select-all"
                  >
                    <CheckSquare className="w-4 h-4 mr-2" />
                    Select All ({filteredCampaigns.length})
                  </Button>
                  <Button
                    onClick={handleDeselectAll}
                    variant="outline"
                    size="sm"
                    disabled={selectedCampaignIds.size === 0}
                    data-testid="button-deselect-all"
                  >
                    <Square className="w-4 h-4 mr-2" />
                    Deselect All
                  </Button>
                  {selectedCampaignIds.size > 0 && (
                    <span className="text-sm text-slate-500 self-center">
                      {selectedCampaignIds.size} selected
                    </span>
                  )}
                </div>
              </div>
          
          {loading && campaigns.length === 0 ? (
            <div className="text-center py-20">
              <RefreshCw className="w-12 h-12 animate-spin text-slate-400 mx-auto mb-4" />
              <p className="text-slate-500">Loading campaigns...</p>
            </div>
          ) : filteredCampaigns.length === 0 ? (
            <div className="text-center py-20 text-slate-400 bg-white rounded-2xl border border-slate-100">
              <Building2 className="w-16 h-16 mx-auto mb-4 opacity-30" />
              <p className="text-xl">{campaigns.length === 0 ? 'No campaigns found' : 'No campaigns match the filter'}</p>
              <p className="text-sm mt-2">{campaigns.length === 0 ? 'Campaign data will appear here from the CampaignData collection' : 'Try changing the filter'}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredCampaigns.map((campaign, index) => (
                <motion.div
                  key={campaign.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className={`bg-white rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden border flex flex-col cursor-pointer ${selectedCampaignIds.has(campaign.id) ? 'border-blue-500 ring-2 ring-blue-200' : 'border-slate-100'}`}
                  onClick={() => setSelectedCampaign(campaign)}
                  data-testid={`card-campaign-${campaign.id}`}
                >
                  <div className="p-6 flex-1">
                    <div className="flex items-start justify-between mb-4 gap-2">
                      <div className="flex items-center space-x-2 min-w-0">
                        <div 
                          onClick={(e) => { e.stopPropagation(); toggleCampaignSelection(campaign.id); }}
                          className="flex-shrink-0"
                        >
                          <Checkbox 
                            checked={selectedCampaignIds.has(campaign.id)}
                            data-testid={`checkbox-campaign-${campaign.id}`}
                          />
                        </div>
                        <Building2 className="w-5 h-5 flex-shrink-0 text-blue-600" />
                        <h3 className="font-semibold text-lg text-slate-900 truncate">{campaign.businessName}</h3>
                      </div>
                      {getEmailBadge(campaign)}
                    </div>
                    
                    <div className="space-y-3">
                      {campaign.address && (
                        <div className="flex items-center space-x-2 text-slate-600">
                          <MapPin className="w-4 h-4 flex-shrink-0" />
                          <div className="text-sm truncate">
                            {extractCityCountry(campaign.address)}
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

                    <div className="mt-4 space-y-3" onClick={(e) => e.stopPropagation()}>
                      <div className="space-y-2">
                        <Select 
                          value={selectedProducts[campaign.id] || campaign.email?.selectedProduct || ""} 
                          onValueChange={(value) => {
                            setSelectedProducts({...selectedProducts, [campaign.id]: value});
                            if (value === 'custom') {
                              setShowCustomInput({...showCustomInput, [campaign.id]: true});
                            } else {
                              setShowCustomInput({...showCustomInput, [campaign.id]: false});
                            }
                          }}
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
                            <SelectItem value="custom">
                              <span className="flex items-center gap-1">
                                <Plus className="w-3 h-3" />
                                Custom Product...
                              </span>
                            </SelectItem>
                          </SelectContent>
                        </Select>

                        {showCustomInput[campaign.id] && (
                          <Input
                            placeholder="Enter custom product name..."
                            value={customProducts[campaign.id] || ''}
                            onChange={(e) => setCustomProducts({...customProducts, [campaign.id]: e.target.value})}
                            data-testid={`input-custom-product-${campaign.id}`}
                          />
                        )}
                      </div>

                      <div className="flex gap-2">
                        {campaign.hasEmail && hasEmailContent(campaign.email) ? (
                          <Button
                            onClick={(e) => { e.stopPropagation(); campaign.email && openEmailModal(campaign.email); }}
                            className="flex-1"
                            variant="default"
                            data-testid={`button-view-email-${campaign.id}`}
                          >
                            <Mail className="w-4 h-4 mr-2" />
                            View / Edit Email
                          </Button>
                        ) : (
                          <Button
                            onClick={(e) => { e.stopPropagation(); handleGenerateEmail(campaign); }}
                            disabled={generating === campaign.id || isGenerateDisabled(campaign.id)}
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

        <Dialog open={selectedCampaign !== null} onOpenChange={() => setSelectedCampaign(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogDescription className="sr-only">
              Campaign details for {selectedCampaign?.businessName}
            </DialogDescription>
            {selectedCampaign && (
              <>
                <DialogHeader>
                  <DialogTitle className="text-2xl font-bold flex items-center gap-2">
                    <Building2 className="w-6 h-6 text-blue-600" />
                    {selectedCampaign.businessName}
                  </DialogTitle>
                </DialogHeader>
                
                <div className="space-y-6 mt-4">
                  <div className="bg-slate-50 rounded-lg p-4 space-y-3">
                    {selectedCampaign.address && (
                      <div className="flex items-start gap-2">
                        <MapPin className="w-4 h-4 mt-0.5 text-slate-500 flex-shrink-0" />
                        <div className="text-slate-600 text-sm">{selectedCampaign.address}</div>
                      </div>
                    )}
                    
                    {selectedCampaign.businessEmail && (
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4 text-slate-500 flex-shrink-0" />
                        <a href={`mailto:${selectedCampaign.businessEmail}`} className="text-blue-600 hover:underline text-sm">
                          {selectedCampaign.businessEmail}
                        </a>
                      </div>
                    )}
                    
                    {selectedCampaign.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-slate-500 flex-shrink-0" />
                        <a href={`tel:${selectedCampaign.phone}`} className="text-slate-600 hover:underline text-sm">
                          {selectedCampaign.phone}
                        </a>
                      </div>
                    )}

                    {selectedCampaign.rating && (
                      <div className="flex items-center gap-2">
                        <Star className="w-4 h-4 text-yellow-500 flex-shrink-0" />
                        <span className="text-slate-600 text-sm">{selectedCampaign.rating} rating</span>
                      </div>
                    )}
                    
                    {selectedCampaign.mapLink && (
                      <div className="flex items-center gap-2">
                        <ExternalLink className="w-4 h-4 text-slate-500 flex-shrink-0" />
                        <a href={selectedCampaign.mapLink} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-sm">
                          View on Google Maps
                        </a>
                      </div>
                    )}

                    <div className="pt-2 border-t border-slate-200">
                      <div className="text-xs text-slate-400">
                        Added {new Date(selectedCampaign.createdAt).toLocaleDateString('en-US', { 
                          month: 'short', 
                          day: 'numeric', 
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>
                    </div>
                  </div>

                  {selectedCampaign.hasEmail && selectedCampaign.email ? (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-slate-700">Email Status</span>
                          {getDetailedStatusBadge(selectedCampaign.email.status)}
                        </div>
                        {selectedCampaign.email.status !== 'not_generated' && (
                          <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200" data-testid="badge-generated-by-ai">
                            <Sparkles className="w-3 h-3 mr-1" />
                            Generated by AI
                          </Badge>
                        )}
                      </div>
                      
                      <div className="space-y-4 border-t border-slate-200 pt-4">
                        <div>
                          <label className="text-sm font-semibold text-slate-700 mb-2 block">Email Subject</label>
                          <Input
                            value={editedSubject}
                            onChange={(e) => setEditedSubject(e.target.value)}
                            placeholder="Enter email subject..."
                            className="w-full"
                            data-testid="campaign-input-email-subject"
                          />
                        </div>
                        
                        <div>
                          <label className="text-sm font-semibold text-slate-700 mb-2 block">AI Generated Email</label>
                          <Textarea
                            value={editedBody}
                            onChange={(e) => setEditedBody(e.target.value)}
                            placeholder="AI generated email content..."
                            className="w-full min-h-[200px] resize-none"
                            data-testid="campaign-input-email-body"
                          />
                        </div>

                        <div className="flex gap-2">
                          <Button
                            onClick={async () => {
                              if (selectedCampaign.email) {
                                const emailId = selectedCampaign.email.id;
                                const currentSubject = editedSubject;
                                const currentBody = editedBody;
                                
                                setSaving(true);
                                try {
                                  const response = await fetch(`/api/emails/${emailId}/update`, {
                                    method: "PATCH",
                                    headers: {
                                      "Content-Type": "application/json",
                                    },
                                    body: JSON.stringify({
                                      subject: currentSubject,
                                      body: currentBody,
                                    }),
                                  });

                                  if (!response.ok) {
                                    const error = await response.json();
                                    throw new Error(error.message || "Failed to save email");
                                  }

                                  const result = await response.json();
                                  
                                  // Update campaigns list with fresh data
                                  setCampaigns(prev => prev.map(c => 
                                    c.email?.id === emailId 
                                      ? { ...c, email: result.email }
                                      : c
                                  ));
                                  
                                  // Update selectedCampaign with fresh email data
                                  setSelectedCampaign(prev => prev ? {
                                    ...prev,
                                    email: result.email
                                  } : null);
                                  
                                  // Also set selectedEmail so Send Email flow works
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
                              }
                            }}
                            disabled={saving || !editedSubject || !editedBody}
                            variant="secondary"
                            className="flex-1"
                            data-testid="campaign-button-save-email"
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
                            onClick={() => {
                              if (selectedCampaign.email) {
                                // Create updated email with current edited values
                                const updatedEmail = {
                                  ...selectedCampaign.email,
                                  editedSubject: editedSubject,
                                  editedBody: editedBody,
                                };
                                openEmailModal(updatedEmail);
                                setSelectedCampaign(null);
                              }
                            }}
                            className="flex-1"
                            data-testid="campaign-button-send-email"
                          >
                            <Send className="w-4 h-4 mr-2" />
                            Send Email
                          </Button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700">Select Product</label>
                        <Select 
                          value={selectedProducts[selectedCampaign.id] || ""} 
                          onValueChange={(value) => {
                            setSelectedProducts({...selectedProducts, [selectedCampaign.id]: value});
                            if (value === 'custom') {
                              setShowCustomInput({...showCustomInput, [selectedCampaign.id]: true});
                            } else {
                              setShowCustomInput({...showCustomInput, [selectedCampaign.id]: false});
                            }
                          }}
                        >
                          <SelectTrigger className="w-full" data-testid="modal-select-product">
                            <SelectValue placeholder="Select Product" />
                          </SelectTrigger>
                          <SelectContent>
                            {productTypes.map((product) => (
                              <SelectItem key={product} value={product}>
                                {product}
                              </SelectItem>
                            ))}
                            <SelectItem value="custom">
                              <span className="flex items-center gap-1">
                                <Plus className="w-3 h-3" />
                                Custom Product...
                              </span>
                            </SelectItem>
                          </SelectContent>
                        </Select>

                        {showCustomInput[selectedCampaign.id] && (
                          <Input
                            placeholder="Enter custom product name..."
                            value={customProducts[selectedCampaign.id] || ''}
                            onChange={(e) => setCustomProducts({...customProducts, [selectedCampaign.id]: e.target.value})}
                            data-testid="modal-input-custom-product"
                          />
                        )}
                      </div>

                      <Button
                        onClick={() => {
                          handleGenerateEmail(selectedCampaign);
                          setSelectedCampaign(null);
                        }}
                        disabled={generating === selectedCampaign.id || isGenerateDisabled(selectedCampaign.id)}
                        className="w-full"
                        data-testid="modal-button-generate"
                      >
                        {generating === selectedCampaign.id ? (
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
                  )}

                  <Button
                    onClick={() => setSelectedCampaign(null)}
                    variant="outline"
                    className="w-full"
                    data-testid="button-close-campaign-modal"
                  >
                    Close
                  </Button>
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>

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

                    <div className="pt-2 border-t border-slate-200 flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-500">Status: </span>
                        {getDetailedStatusBadge(selectedEmail.status)}
                      </div>
                      {selectedEmail.status !== 'not_generated' && (
                        <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200" data-testid="badge-generated-by-ai-modal">
                          <Sparkles className="w-3 h-3 mr-1" />
                          Generated by AI
                        </Badge>
                      )}
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
