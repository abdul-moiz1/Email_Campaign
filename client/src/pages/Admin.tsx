import { motion } from "framer-motion";
import { Check, X, Building2, Clock, ArrowLeft, RefreshCw, MapPin, Mail, ExternalLink, Send, Phone, Globe, Sparkles, Save, Star, Plus, Filter, CheckSquare, Square, Search, LogOut } from "lucide-react";
import { useState, useEffect, useMemo, useRef } from "react";
import { Link, useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { authenticatedFetch } from "@/lib/queryClient";
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
type BusinessTypeFilter = 'all' | 'restaurant' | 'dental' | 'retail' | 'medical' | 'automotive' | 'other';

const businessTypeKeywords: Record<Exclude<BusinessTypeFilter, 'all' | 'other'>, string[]> = {
  restaurant: ['restaurant', 'cafe', 'coffee', 'pizza', 'food', 'dining', 'bistro', 'grill', 'kitchen', 'bakery', 'bar', 'pub', 'sushi', 'thai', 'chinese', 'indian', 'mexican', 'italian', 'deli', 'superstore', 'grocery'],
  dental: ['dental', 'dentist', 'orthodont', 'teeth', 'oral', 'smile'],
  retail: ['store', 'shop', 'boutique', 'mart', 'outlet', 'retail', 'mall'],
  medical: ['medical', 'clinic', 'hospital', 'health', 'doctor', 'physician', 'pharmacy', 'physio', 'chiro'],
  automotive: ['auto', 'car', 'vehicle', 'tire', 'mechanic', 'repair', 'motor', 'garage'],
};

function detectBusinessType(businessName: string): BusinessTypeFilter {
  const lowerName = businessName.toLowerCase();
  for (const [type, keywords] of Object.entries(businessTypeKeywords)) {
    if (keywords.some(keyword => lowerName.includes(keyword))) {
      return type as BusinessTypeFilter;
    }
  }
  return 'other';
}

function isValidEmail(email: string | undefined): boolean {
  if (!email) return false;
  // More robust email validation that excludes URLs and other non-email patterns
  // Must not contain slashes, must have @ not at start, domain must look like domain
  if (email.includes('/') || email.includes('http') || email.startsWith('@')) return false;
  
  // Handle multiple comma-separated emails - check if at least one is valid
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  const emails = email.split(',').map(e => e.trim());
  return emails.some(e => emailRegex.test(e));
}

function getFirstValidEmail(email: string | undefined): string | undefined {
  if (!email) return undefined;
  if (email.includes('/') || email.includes('http') || email.startsWith('@')) return undefined;
  
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  const emails = email.split(',').map(e => e.trim());
  return emails.find(e => emailRegex.test(e));
}

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
  const { user, loading: authLoading, logout } = useAuth();
  const [, setLocation] = useLocation();
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
  const [businessTypeFilter, setBusinessTypeFilter] = useState<BusinessTypeFilter>('all');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [selectedCampaignIds, setSelectedCampaignIds] = useState<Set<string>>(new Set());
  const [sendingAll, setSendingAll] = useState(false);
  const [markingAsSent, setMarkingAsSent] = useState(false);
  const [hasInitiallyLoaded, setHasInitiallyLoaded] = useState(false);
  const loadTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      setLocation("/login");
    }
  }, [authLoading, user, setLocation]);

  const handleLogout = async () => {
    try {
      await logout();
      setLocation("/login");
    } catch (error) {
      toast({
        title: "Logout failed",
        description: "Please try again.",
        variant: "destructive",
      });
    }
  };

  const filteredCampaigns = useMemo(() => {
    let result = campaigns;
    
    switch (filterMode) {
      case 'withEmail':
        result = result.filter(c => c.hasEmail && c.email && c.email.aiEmail && c.email.aiEmail.trim() !== '');
        break;
      case 'withoutEmail':
        result = result.filter(c => !c.hasEmail || !c.email || !c.email.aiEmail || c.email.aiEmail.trim() === '');
        break;
    }
    
    if (businessTypeFilter !== 'all') {
      result = result.filter(c => detectBusinessType(c.businessName) === businessTypeFilter);
    }
    
    // Keyword search filter
    if (searchKeyword.trim()) {
      const keyword = searchKeyword.toLowerCase().trim();
      result = result.filter(c => 
        c.businessName.toLowerCase().includes(keyword) ||
        (c.address && c.address.toLowerCase().includes(keyword)) ||
        (c.businessEmail && c.businessEmail.toLowerCase().includes(keyword)) ||
        (c.city && c.city.toLowerCase().includes(keyword))
      );
    }
    
    return result;
  }, [campaigns, filterMode, businessTypeFilter, searchKeyword]);

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
      const response = await authenticatedFetch("/api/campaigns");
      
      if (!response.ok) {
        throw new Error("Failed to fetch campaigns");
      }
      
      const data = await response.json();
      setCampaigns(data);
      // Mark as initially loaded after first successful fetch
      if (!hasInitiallyLoaded && !loadTimeoutRef.current) {
        loadTimeoutRef.current = setTimeout(() => setHasInitiallyLoaded(true), 500);
      }
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
      const response = await authenticatedFetch("/api/submissions");
      
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
    // Only fetch data when user is authenticated
    if (user) {
      fetchCampaigns();
      fetchSubmissions();
    }
    
    // Cleanup timeout on unmount
    return () => {
      if (loadTimeoutRef.current) {
        clearTimeout(loadTimeoutRef.current);
      }
    };
  }, [user]);

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
      const response = await authenticatedFetch(`/api/campaigns/${campaign.id}/generate-email`, {
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
      const response = await authenticatedFetch(`/api/emails/${selectedEmail.id}/update`, {
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
      const response = await authenticatedFetch("/api/emails/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          emailId: selectedEmail.id,
          recipientEmail: selectedEmail.businessEmail,
          subject: editedSubject || selectedEmail.subject || "Business Opportunity",
          body: editedBody || selectedEmail.aiEmail,
          businessName: selectedEmail.businessName,
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

  const handleMarkAsSent = async () => {
    if (!selectedEmail) return;

    setMarkingAsSent(true);
    
    try {
      const response = await authenticatedFetch(`/api/emails/${selectedEmail.id}/mark-sent`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to mark email as sent");
      }

      const result = await response.json();

      // Update the campaigns list
      setCampaigns(campaigns.map(c => 
        c.email?.id === selectedEmail.id 
          ? { ...c, email: result.email }
          : c
      ));
      
      // Update the selected email state
      setSelectedEmail(result.email);
      
      toast({
        title: "Email marked as sent",
        description: "The email status has been updated.",
      });
    } catch (error: any) {
      console.error("Mark as sent error:", error);
      toast({
        title: "Failed to mark email as sent",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setMarkingAsSent(false);
    }
  };

  const openEmailModal = (email: GeneratedEmail) => {
    setSelectedEmail(email);
    setEditedSubject(email.editedSubject || email.subject || "");
    setEditedBody(email.editedBody || email.aiEmail || "");
  };

  const handleSendAllEmails = async () => {
    // Get all selected campaigns that have valid email content and valid recipient email
    const campaignsToSend = campaigns.filter(c => 
      selectedCampaignIds.has(c.id) && 
      c.hasEmail && 
      c.email && 
      c.email.aiEmail && 
      c.email.aiEmail.trim() !== '' &&
      isValidEmail(c.businessEmail)
    );

    if (campaignsToSend.length === 0) {
      toast({
        title: "No emails to send",
        description: "Select campaigns that have generated emails and valid recipient addresses.",
        variant: "destructive",
      });
      return;
    }

    setSendingAll(true);
    let successCount = 0;
    let failCount = 0;

    for (const campaign of campaignsToSend) {
      try {
        const response = await authenticatedFetch("/api/emails/send", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            emailId: campaign.email!.id,
            recipientEmail: getFirstValidEmail(campaign.businessEmail),
            subject: campaign.email!.editedSubject || campaign.email!.subject || "Business Opportunity",
            body: campaign.email!.editedBody || campaign.email!.aiEmail,
            businessName: campaign.businessName,
          }),
        });

        if (response.ok) {
          successCount++;
          // Update status in state
          setCampaigns(prev => prev.map(c => 
            c.id === campaign.id 
              ? { ...c, email: { ...c.email!, status: 'sent' as EmailStatus } }
              : c
          ));
        } else {
          failCount++;
        }
      } catch {
        failCount++;
      }
    }

    setSendingAll(false);
    setSelectedCampaignIds(new Set());

    toast({
      title: "Bulk send complete",
      description: `${successCount} emails sent successfully${failCount > 0 ? `, ${failCount} failed` : ''}.`,
      variant: failCount > 0 ? "destructive" : "default",
    });
  };

  // Count selected campaigns that can be sent (have email content and valid recipient)
  const sendableSelectedCount = useMemo(() => {
    return campaigns.filter(c => 
      selectedCampaignIds.has(c.id) && 
      c.hasEmail && 
      c.email && 
      c.email.aiEmail && 
      c.email.aiEmail.trim() !== '' &&
      isValidEmail(c.businessEmail)
    ).length;
  }, [campaigns, selectedCampaignIds]);

  const getEmailBadge = (campaign: CampaignWithEmail) => {
    const validStatuses: EmailStatus[] = ['not_generated', 'generated', 'edited', 'sent'];
    
    if (campaign.email && campaign.email.status && validStatuses.includes(campaign.email.status)) {
      const status = campaign.email.status;
      
      const styles: Record<EmailStatus, string> = {
        not_generated: "bg-slate-100 text-slate-600 border-slate-200",
        generated: "bg-blue-100 text-blue-700 border-blue-200",
        edited: "bg-amber-100 text-amber-700 border-amber-200",
        sent: "bg-green-100 text-green-700 border-green-200",
      };

      const labels: Record<EmailStatus, string> = {
        not_generated: "Not Generated",
        generated: "Generated",
        edited: "Edited",
        sent: "Sent",
      };

      const icons: Record<EmailStatus, React.ReactNode> = {
        not_generated: <Clock className="w-3 h-3 mr-1" />,
        generated: <Sparkles className="w-3 h-3 mr-1" />,
        edited: <Save className="w-3 h-3 mr-1" />,
        sent: <Check className="w-3 h-3 mr-1" />,
      };

      return (
        <Badge variant="default" className={`${styles[status]} flex-shrink-0`} data-testid={`badge-${status}`}>
          {icons[status]}
          {labels[status]}
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

  // Show loading while checking auth
  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <RefreshCw className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  // Don't render if not authenticated (will redirect)
  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-slate-900">Admin Dashboard</h1>
              <p className="text-slate-500 text-sm mt-0.5">Manage campaigns and AI-generated emails</p>
            </div>
            <div className="flex items-center gap-2">
              {user && (
                <span className="text-sm text-slate-500 hidden sm:inline">{user.email}</span>
              )}
              <Button
                onClick={handleLogout}
                variant="ghost"
                size="icon"
                title="Logout"
                data-testid="button-logout"
              >
                <LogOut className="w-4 h-4" />
              </Button>
              <Button
                onClick={() => {
                  fetchCampaigns();
                  fetchSubmissions();
                }}
                disabled={loading || loadingSubmissions}
                variant="ghost"
                size="icon"
                data-testid="button-refresh"
              >
                <RefreshCw className={`w-4 h-4 ${(loading || loadingSubmissions) ? 'animate-spin' : ''}`} />
              </Button>
              <Button asChild variant="ghost" size="icon">
                <Link href="/" data-testid="link-back-form">
                  <ArrowLeft className="w-4 h-4" />
                </Link>
              </Button>
            </div>
          </div>
        </motion.div>

        <Tabs defaultValue="campaigns" className="space-y-4">
          <TabsList data-testid="tabs-admin">
            <TabsTrigger value="campaigns" data-testid="tab-campaigns" className="gap-2">
              <Building2 className="w-4 h-4" />
              <span>Campaigns</span>
              <span className="text-xs text-muted-foreground ml-1">{campaigns.length}</span>
            </TabsTrigger>
            <TabsTrigger value="submissions" data-testid="tab-submissions" className="gap-2">
              <Mail className="w-4 h-4" />
              <span>Submissions</span>
              <span className="text-xs text-muted-foreground ml-1">{submissions.length}</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="campaigns" className="space-y-4 mt-0">
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
              <div className="flex items-center gap-2 flex-wrap">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    placeholder="Search campaigns..."
                    value={searchKeyword}
                    onChange={(e) => setSearchKeyword(e.target.value)}
                    className="pl-9 w-[200px] sm:w-[260px] h-9"
                    data-testid="input-search-keyword"
                  />
                </div>
                <Select value={filterMode} onValueChange={(value: FilterMode) => setFilterMode(value)}>
                  <SelectTrigger className="w-[130px] h-9" data-testid="select-filter-mode">
                    <SelectValue placeholder="Filter" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="withEmail">With Email</SelectItem>
                    <SelectItem value="withoutEmail">No Email</SelectItem>
                  </SelectContent>
                </Select>
                <span className="text-xs text-slate-400 hidden sm:inline">
                  {filteredCampaigns.length} of {campaigns.length}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Select 
                  value={selectedCampaignIds.size === filteredCampaigns.length && filteredCampaigns.length > 0 ? "all" : selectedCampaignIds.size === 0 ? "none" : "some"}
                  onValueChange={(value) => {
                    if (value === "all") handleSelectAll();
                    else if (value === "none") handleDeselectAll();
                  }}
                >
                  <SelectTrigger className="w-[120px] h-9" data-testid="select-bulk-actions">
                    <SelectValue>
                      {selectedCampaignIds.size > 0 ? `${selectedCampaignIds.size} selected` : "Select"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all" data-testid="button-select-all">Select All</SelectItem>
                    <SelectItem value="none" data-testid="button-deselect-all">Clear Selection</SelectItem>
                    <SelectItem value="some" disabled className="hidden">Partial</SelectItem>
                  </SelectContent>
                </Select>
                {sendableSelectedCount > 0 && (
                  <Button
                    onClick={handleSendAllEmails}
                    disabled={sendingAll}
                    size="sm"
                    data-testid="button-send-all"
                  >
                    {sendingAll ? (
                      <>
                        <RefreshCw className="w-4 h-4 mr-1.5 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4 mr-1.5" />
                        Send ({sendableSelectedCount})
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>
          
          {loading && campaigns.length === 0 ? (
            <div className="text-center py-20">
              <RefreshCw className="w-12 h-12 animate-spin text-slate-400 mx-auto mb-4" />
              <p className="text-slate-500">Loading campaigns...</p>
            </div>
          ) : filteredCampaigns.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-lg border border-slate-200">
              <Building2 className="w-12 h-12 mx-auto mb-3 text-slate-300" />
              <p className="text-lg text-slate-500">{campaigns.length === 0 ? 'No campaigns found' : 'No campaigns match the filter'}</p>
              <p className="text-sm text-slate-400 mt-1">{campaigns.length === 0 ? 'Campaign data will appear here' : 'Try changing the filter'}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredCampaigns.map((campaign, index) => (
                <motion.div
                  key={campaign.id}
                  initial={hasInitiallyLoaded ? false : { opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={hasInitiallyLoaded ? { duration: 0 } : { delay: index * 0.03 }}
                  className={`bg-white rounded-lg border transition-all duration-200 flex flex-col cursor-pointer hover:shadow-md hover:-translate-y-0.5 ${selectedCampaignIds.has(campaign.id) ? 'border-blue-500 ring-1 ring-blue-100' : 'border-slate-200 hover:border-slate-300'}`}
                  onClick={() => setSelectedCampaign(campaign)}
                  data-testid={`card-campaign-${campaign.id}`}
                >
                  <div className="p-4 flex-1">
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <div 
                          onClick={(e) => { e.stopPropagation(); toggleCampaignSelection(campaign.id); }}
                          className="flex-shrink-0"
                        >
                          <Checkbox 
                            checked={selectedCampaignIds.has(campaign.id)}
                            data-testid={`checkbox-campaign-${campaign.id}`}
                          />
                        </div>
                        <h3 className="font-medium text-slate-900 truncate">{campaign.businessName}</h3>
                      </div>
                      {getEmailBadge(campaign)}
                    </div>
                    
                    <div className="space-y-2 text-sm">
                      {campaign.address && (
                        <div className="flex items-center gap-2 text-slate-500">
                          <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                          <span className="truncate">{extractCityCountry(campaign.address)}</span>
                        </div>
                      )}

                      {isValidEmail(campaign.businessEmail) && (
                        <div className="flex items-center gap-2 text-slate-500">
                          <Mail className="w-3.5 h-3.5 flex-shrink-0" />
                          <span className="truncate">{campaign.businessEmail}</span>
                        </div>
                      )}

                      {campaign.phone && (
                        <div className="flex items-center gap-2 text-slate-500">
                          <Phone className="w-3.5 h-3.5 flex-shrink-0" />
                          <span>{campaign.phone}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="p-4 pt-0 space-y-3 border-t border-slate-100" onClick={(e) => e.stopPropagation()}>
                    {!(campaign.hasEmail && hasEmailContent(campaign.email)) && (
                      <>
                        <Select 
                          value={selectedProducts[campaign.id] || campaign.email?.selectedProduct || ""} 
                          onValueChange={(value) => {
                            setSelectedProducts({...selectedProducts, [campaign.id]: value});
                            setShowCustomInput({...showCustomInput, [campaign.id]: value === 'custom'});
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
                                Custom...
                              </span>
                            </SelectItem>
                          </SelectContent>
                        </Select>

                        {showCustomInput[campaign.id] && (
                          <Input
                            placeholder="Enter custom product..."
                            value={customProducts[campaign.id] || ''}
                            onChange={(e) => setCustomProducts({...customProducts, [campaign.id]: e.target.value})}
                            data-testid={`input-custom-product-${campaign.id}`}
                          />
                        )}
                      </>
                    )}

                    {campaign.hasEmail && hasEmailContent(campaign.email) ? (
                      <Button
                        onClick={(e) => { e.stopPropagation(); campaign.email && openEmailModal(campaign.email); }}
                        className="w-full"
                        size="sm"
                        data-testid={`button-view-email-${campaign.id}`}
                      >
                        <Mail className="w-4 h-4 mr-2" />
                        View Email
                      </Button>
                    ) : (
                      <Button
                        onClick={(e) => { e.stopPropagation(); handleGenerateEmail(campaign); }}
                        disabled={generating === campaign.id || isGenerateDisabled(campaign.id)}
                        className="w-full"
                        size="sm"
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
                </motion.div>
              ))}
            </div>
          )}
          </TabsContent>

          <TabsContent value="submissions" className="space-y-4 mt-0">
            {loadingSubmissions && submissions.length === 0 ? (
              <div className="text-center py-16">
                <RefreshCw className="w-10 h-10 animate-spin text-slate-400 mx-auto mb-3" />
                <p className="text-slate-500">Loading submissions...</p>
              </div>
            ) : submissions.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-lg border border-slate-200">
                <Mail className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                <p className="text-lg text-slate-500">No submissions yet</p>
                <p className="text-sm text-slate-400 mt-1">New business inquiries will appear here</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {submissions.map((submission, index) => (
                  <motion.div
                    key={submission.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.03 }}
                    className="bg-white rounded-lg border border-slate-200 p-4 hover:border-slate-300 transition-colors"
                    data-testid={`card-submission-${submission.id}`}
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <Building2 className="w-4 h-4 text-blue-600 flex-shrink-0" />
                      <h3 className="font-medium text-slate-900">{submission.businessType}</h3>
                    </div>
                    
                    <div className="flex items-center gap-2 text-slate-500 text-sm mb-3">
                      <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                      <span>{submission.city}, {submission.province}, {submission.country}</span>
                    </div>

                    <div className="text-xs text-slate-400">
                      {new Date(submission.createdAt).toLocaleDateString('en-US', { 
                        month: 'short', 
                        day: 'numeric', 
                        year: 'numeric'
                      })}
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
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
                                  const response = await authenticatedFetch(`/api/emails/${emailId}/update`, {
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
                            disabled={saving || !editedBody.trim()}
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
                            onClick={async () => {
                              if (selectedCampaign.email) {
                                const email = selectedCampaign.email;
                                const recipientEmail = email.businessEmail;
                                
                                if (!recipientEmail || !isValidEmail(recipientEmail)) {
                                  toast({
                                    title: "Cannot send email",
                                    description: "No valid email address for this business.",
                                    variant: "destructive",
                                  });
                                  return;
                                }
                                
                                setSending(true);
                                try {
                                  const response = await authenticatedFetch("/api/emails/send", {
                                    method: "POST",
                                    headers: {
                                      "Content-Type": "application/json",
                                    },
                                    body: JSON.stringify({
                                      emailId: email.id,
                                      recipientEmail: recipientEmail,
                                      subject: editedSubject || email.subject || "Business Opportunity",
                                      body: editedBody || email.aiEmail,
                                      businessName: selectedCampaign.businessName,
                                    }),
                                  });

                                  if (!response.ok) {
                                    const error = await response.json();
                                    throw new Error(error.message || "Failed to send email");
                                  }

                                  // Update the campaigns list
                                  setCampaigns(prev => prev.map(c => 
                                    c.email?.id === email.id 
                                      ? { ...c, email: { ...c.email!, status: 'sent' as EmailStatus } }
                                      : c
                                  ));
                                  
                                  // Close the dialog after successful send
                                  setSelectedCampaign(null);
                                  
                                  toast({
                                    title: "Email sent successfully",
                                    description: `Email sent to ${recipientEmail}`,
                                  });
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
                              }
                            }}
                            disabled={sending}
                            className="flex-1"
                            data-testid="campaign-button-send-email"
                          >
                            {sending ? (
                              <>
                                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                                Sending...
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
                  {isValidEmail(selectedEmail.businessEmail) && (
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
                  {!isValidEmail(selectedEmail.businessEmail) && (
                    <div className="bg-amber-50 rounded-lg p-4 border border-amber-200">
                      <div className="flex items-center gap-2">
                        <Mail className="w-5 h-5 text-amber-600 flex-shrink-0" />
                        <div>
                          <div className="text-xs text-amber-600 font-medium mb-1">Contact Email</div>
                          <span className="text-amber-700 font-medium">No valid email address</span>
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

                  <div className="flex flex-wrap gap-3 pt-4 border-t">
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
                      disabled={saving || !editedBody.trim()}
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
                    {selectedEmail.status !== 'sent' && hasEmailContent(selectedEmail) && (
                      <Button
                        onClick={handleMarkAsSent}
                        disabled={markingAsSent}
                        variant="outline"
                        className="flex-1"
                        data-testid="button-mark-as-sent"
                      >
                        {markingAsSent ? (
                          <>
                            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                            Marking...
                          </>
                        ) : (
                          <>
                            <Check className="w-4 h-4 mr-2" />
                            Mark as Sent
                          </>
                        )}
                      </Button>
                    )}
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
