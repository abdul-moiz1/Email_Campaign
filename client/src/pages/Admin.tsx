import { motion } from "framer-motion";
import { Check, X, Building2, Clock, ArrowLeft, RefreshCw, MapPin, Mail, ExternalLink, Send, Phone, Sparkles, Save, Star, Plus, Search, LogOut, PieChart as PieChartIcon, Users, BarChart3 } from "lucide-react";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, LineChart, Line, XAxis, YAxis } from "recharts";
import { productTypes, type ProductType, type EmailStatus } from "@shared/schema";

type FilterMode = 'all' | 'withEmail' | 'withoutEmail' | 'sent';

type EmailIssue = 'missing' | 'invalid_format' | 'contains_url' | 'starts_with_at' | null;

function getEmailIssue(email: string | undefined): EmailIssue {
  if (!email || email.trim() === '') return 'missing';
  
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  const emails = email.split(',').map(e => e.trim());
  const hasValidEmail = emails.some(e => emailRegex.test(e));
  
  if (hasValidEmail) return null;
  
  if (email.includes('/') || email.includes('http')) return 'contains_url';
  if (email.startsWith('@')) return 'starts_with_at';
  
  return 'invalid_format';
}

function getEmailIssueLabel(issue: EmailIssue): string {
  switch (issue) {
    case 'missing': return 'No Email';
    case 'invalid_format': return 'Invalid Format';
    case 'contains_url': return 'Contains URL';
    case 'starts_with_at': return 'Starts with @';
    default: return '';
  }
}

// Dynamic color palette for business types (avoiding status-like colors: green, red, amber/yellow)
const dynamicColorPalette = [
  '#3b82f6', // blue
  '#8b5cf6', // purple
  '#06b6d4', // cyan
  '#ec4899', // pink
  '#14b8a6', // teal
  '#6366f1', // indigo
  '#0ea5e9', // sky
  '#a855f7', // violet
  '#f472b6', // rose
  '#2dd4bf', // emerald-teal
];

// Get a consistent color for a business type
function getBusinessTypeColor(businessType: string, allTypes: string[]): string {
  const index = allTypes.indexOf(businessType);
  if (index === -1) return '#94a3b8'; // fallback gray
  return dynamicColorPalette[index % dynamicColorPalette.length];
}

// Get the business type from campaign (use actual stored value or 'Other')
function getBusinessType(campaign: { businessType?: string }): string {
  return campaign.businessType?.trim() || 'Other';
}

function isValidEmail(email: string | undefined): boolean {
  if (!email) return false;
  if (email.includes('/') || email.includes('http') || email.startsWith('@')) return false;
  
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

function getAllValidEmails(email: string | undefined): string[] {
  if (!email) return [];
  if (email.includes('/') || email.includes('http') || email.startsWith('@')) return [];
  
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  const emails = email.split(',').map(e => e.trim());
  return emails.filter(e => emailRegex.test(e));
}

function extractCityCountry(address: string | undefined): string {
  if (!address) return '';
  const parts = address.split(',').map(p => p.trim());
  // Format is: street, city, province postal, country
  // Extract city (index 1) and country (last index)
  if (parts.length >= 3) {
    const city = parts[1];
    const country = parts[parts.length - 1];
    return `${city}, ${country}`;
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
  businessType?: string;
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
  const [businessTypeFilter, setBusinessTypeFilter] = useState<string>('all');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [emailIssuesTypeSearch, setEmailIssuesTypeSearch] = useState('');
  const [selectedCampaignIds, setSelectedCampaignIds] = useState<Set<string>>(new Set());
  const [sendingAll, setSendingAll] = useState(false);
  const [markingAsSent, setMarkingAsSent] = useState(false);
  const [hasInitiallyLoaded, setHasInitiallyLoaded] = useState(false);
  const [selectedRecipients, setSelectedRecipients] = useState<Set<string>>(new Set());
  const [manualEmail, setManualEmail] = useState('');
  const [savingEmail, setSavingEmail] = useState(false);
  const loadTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();

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

  // Get unique business types from campaigns
  const uniqueBusinessTypes = useMemo(() => {
    const types = new Set<string>();
    campaigns.forEach(c => {
      types.add(getBusinessType(c));
    });
    return Array.from(types).sort();
  }, [campaigns]);

  // Dynamic business type stats based on actual data
  const businessTypeStats = useMemo(() => {
    const counts: Record<string, number> = { all: campaigns.length };
    
    campaigns.forEach(c => {
      const type = getBusinessType(c);
      counts[type] = (counts[type] || 0) + 1;
    });
    
    return counts;
  }, [campaigns]);

  // Dynamic pie chart data based on actual business types
  const pieChartData = useMemo(() => {
    return Object.entries(businessTypeStats)
      .filter(([key]) => key !== 'all')
      .map(([type, value]) => ({
        name: type,
        value,
        color: getBusinessTypeColor(type, uniqueBusinessTypes),
      }))
      .filter(item => item.value > 0)
      .sort((a, b) => b.value - a.value);
  }, [businessTypeStats, uniqueBusinessTypes]);

  const chartConfig: ChartConfig = useMemo(() => {
    const config: ChartConfig = {};
    pieChartData.forEach(item => {
      config[item.name] = {
        label: item.name,
        color: item.color,
      };
    });
    return config;
  }, [pieChartData]);

  const emailStats = useMemo(() => {
    const withEmail = campaigns.filter(c => c.hasEmail && c.email && c.email.aiEmail && c.email.aiEmail.trim() !== '').length;
    const sent = campaigns.filter(c => c.hasEmail && c.email && c.email.status === 'sent').length;
    return { withEmail, sent, total: campaigns.length };
  }, [campaigns]);

  const emailIssuesCampaigns = useMemo(() => {
    let result = campaigns.filter(c => getEmailIssue(c.businessEmail) !== null);
    
    if (emailIssuesTypeSearch.trim()) {
      const keyword = emailIssuesTypeSearch.toLowerCase().trim();
      result = result.filter(c => 
        getBusinessType(c).toLowerCase().includes(keyword)
      );
    }
    
    return result;
  }, [campaigns, emailIssuesTypeSearch]);

  const validEmailCampaigns = useMemo(() => {
    let result = campaigns.filter(c => getEmailIssue(c.businessEmail) === null);
    
    if (filterMode === 'withEmail') {
      result = result.filter(c => c.hasEmail && c.email && c.email.aiEmail && c.email.aiEmail.trim() !== '');
    } else if (filterMode === 'withoutEmail') {
      result = result.filter(c => !c.hasEmail || !c.email || !c.email.aiEmail || c.email.aiEmail.trim() === '');
    } else if (filterMode === 'sent') {
      result = result.filter(c => c.hasEmail && c.email && c.email.status === 'sent');
    }
    
    if (businessTypeFilter !== 'all') {
      result = result.filter(c => getBusinessType(c) === businessTypeFilter);
    }
    
    if (searchKeyword.trim()) {
      const keyword = searchKeyword.toLowerCase().trim();
      result = result.filter(c => 
        c.businessName.toLowerCase().includes(keyword) ||
        (c.address && c.address.toLowerCase().includes(keyword)) ||
        (c.businessEmail && c.businessEmail.toLowerCase().includes(keyword)) ||
        (c.city && c.city.toLowerCase().includes(keyword)) ||
        (c.businessType && c.businessType.toLowerCase().includes(keyword))
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
    const allIds = new Set(validEmailCampaigns.map(c => c.id));
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
    if (user) {
      fetchCampaigns();
      fetchSubmissions();
    }
    
    return () => {
      if (loadTimeoutRef.current) {
        clearTimeout(loadTimeoutRef.current);
      }
    };
  }, [user]);

  useEffect(() => {
    if (selectedCampaign?.hasEmail && selectedCampaign?.email) {
      setEditedSubject(selectedCampaign.email.editedSubject || selectedCampaign.email.subject || "");
      setEditedBody(selectedCampaign.email.editedBody || selectedCampaign.email.aiEmail || "");
    } else if (selectedCampaign) {
      setEditedSubject("");
      setEditedBody("");
    }
    
    if (selectedCampaign?.businessEmail) {
      const validEmails = getAllValidEmails(selectedCampaign.businessEmail);
      if (validEmails.length > 0) {
        setSelectedRecipients(new Set(validEmails));
      } else {
        setSelectedRecipients(new Set());
      }
    } else {
      setSelectedRecipients(new Set());
    }
  }, [selectedCampaign]);

  // Sync selectedCampaign with campaigns array when campaigns updates
  useEffect(() => {
    if (selectedCampaign && campaigns.length > 0) {
      const updatedCampaign = campaigns.find(c => c.id === selectedCampaign.id);
      if (updatedCampaign && updatedCampaign !== selectedCampaign) {
        // Only update if the email content has changed
        const currentEmailContent = selectedCampaign.email?.aiEmail || '';
        const newEmailContent = updatedCampaign.email?.aiEmail || '';
        if (currentEmailContent !== newEmailContent) {
          setSelectedCampaign(updatedCampaign);
        }
      }
    }
  }, [campaigns]);

  // Compute email trends data by business type (only count campaigns with generated emails)
  const { emailTrendsByType, topEmailTypes } = useMemo(() => {
    const grouped: { [date: string]: { [type: string]: number } } = {};
    
    // Count business types by volume to get top types
    const typeVolume: { [type: string]: number } = {};
    
    campaigns.forEach((campaign) => {
      // Only count campaigns that have generated emails
      const hasEmail = campaign.hasEmail && campaign.email && campaign.email.aiEmail && campaign.email.aiEmail.trim() !== '';
      if (!hasEmail) return;
      
      try {
        let dateObj: Date;
        const createdAt = campaign.createdAt as any;
        
        if (createdAt instanceof Date) {
          dateObj = createdAt;
        } else if (typeof createdAt === 'object' && createdAt !== null && typeof createdAt.toDate === 'function') {
          dateObj = createdAt.toDate();
        } else if (typeof createdAt === 'string') {
          dateObj = new Date(createdAt);
        } else {
          dateObj = new Date();
        }
        
        const dateKey = `${dateObj.getMonth() + 1}/${dateObj.getDate()}`;
        const businessType = getBusinessType(campaign);
        
        if (!grouped[dateKey]) {
          grouped[dateKey] = {};
        }
        grouped[dateKey][businessType] = (grouped[dateKey][businessType] || 0) + 1;
        typeVolume[businessType] = (typeVolume[businessType] || 0) + 1;
      } catch (err) {
        console.error('Error parsing date:', campaign.createdAt, err);
      }
    });
    
    // Get top 5 business types by volume
    const topTypes = Object.entries(typeVolume)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([type]) => type);
    
    const data = Object.entries(grouped)
      .map(([date, typeCounts]) => {
        const entry: { date: string; [key: string]: string | number } = { date };
        topTypes.forEach(type => {
          entry[type] = typeCounts[type] || 0;
        });
        return entry;
      })
      .sort((a, b) => {
        const [aM, aD] = a.date.split('/').map(Number);
        const [bM, bD] = b.date.split('/').map(Number);
        return aM - bM || aD - bD;
      });
    
    return { emailTrendsByType: data, topEmailTypes: topTypes };
  }, [campaigns]);

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
        title: "Generating email...",
        description: "Please wait while the AI generates your email.",
      });

      // Poll for the generated email every 3 seconds, up to 60 seconds
      const maxAttempts = 20;
      const pollInterval = 3000;
      let attempts = 0;
      
      const pollForEmail = async (): Promise<boolean> => {
        attempts++;
        try {
          const campaignsResponse = await authenticatedFetch('/api/campaigns');
          if (campaignsResponse.ok) {
            const updatedCampaigns = await campaignsResponse.json();
            const updatedCampaign = updatedCampaigns.find((c: CampaignWithEmail) => c.id === campaign.id);
            
            // Check if email has been generated (has content)
            if (updatedCampaign?.email?.aiEmail && updatedCampaign.email.aiEmail.trim() !== '') {
              setCampaigns(updatedCampaigns);
              // Update selectedCampaign to show the new email in the dialog
              setSelectedCampaign(updatedCampaign);
              // Also update the edited fields
              setEditedSubject(updatedCampaign.email.editedSubject || updatedCampaign.email.subject || '');
              setEditedBody(updatedCampaign.email.editedBody || updatedCampaign.email.aiEmail || '');
              return true;
            }
          }
        } catch (err) {
          console.error("Poll error:", err);
        }
        return false;
      };

      // Start polling
      const poll = async () => {
        const found = await pollForEmail();
        if (found) {
          setGenerating(null);
          toast({
            title: "Email generated!",
            description: "Your AI-generated email is ready.",
          });
        } else if (attempts < maxAttempts) {
          setTimeout(poll, pollInterval);
        } else {
          setGenerating(null);
          toast({
            title: "Generation taking longer than expected",
            description: "The email may still be generating. Try refreshing in a moment.",
            variant: "destructive",
          });
          fetchCampaigns();
        }
      };

      // Wait 3 seconds before first poll
      setTimeout(poll, pollInterval);
      
    } catch (error: any) {
      console.error("Generate error:", error);
      setGenerating(null);
      toast({
        title: "Generation failed",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
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

    const recipientsToSend = Array.from(selectedRecipients);
    if (recipientsToSend.length === 0) {
      setShowNoEmailAlert(true);
      return;
    }

    setSending(true);
    let successCount = 0;
    let failCount = 0;
    
    try {
      for (const recipientEmail of recipientsToSend) {
        try {
          const response = await authenticatedFetch("/api/emails/send", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              emailId: selectedEmail.id,
              recipientEmail: recipientEmail,
              subject: editedSubject || selectedEmail.subject || "Business Opportunity",
              body: editedBody || selectedEmail.aiEmail,
              businessName: selectedEmail.businessName,
            }),
          });

          if (response.ok) {
            successCount++;
          } else {
            failCount++;
          }
        } catch {
          failCount++;
        }
      }

      if (failCount === 0 && successCount > 0) {
        setCampaigns(campaigns.map(c => 
          c.email?.id === selectedEmail.id 
            ? { ...c, email: { ...c.email!, status: 'sent' as EmailStatus } }
            : c
        ));
        toast({
          title: "Email sent successfully",
          description: `Email sent to ${successCount} recipient${successCount > 1 ? 's' : ''}`,
        });
        setSelectedEmail(null);
        setSelectedCampaign(null);
      } else if (successCount > 0 && failCount > 0) {
        toast({
          title: "Partial delivery",
          description: `${successCount} sent, ${failCount} failed. Email not marked as sent - please retry failed recipients.`,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Failed to send email",
          description: "All delivery attempts failed. Please try again.",
          variant: "destructive",
        });
      }
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

      setCampaigns(campaigns.map(c => 
        c.email?.id === selectedEmail.id 
          ? { ...c, email: result.email }
          : c
      ));
      
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
    const hasEmailContent = campaign.email && campaign.email.aiEmail && campaign.email.aiEmail.trim() !== '';
    
    if (hasEmailContent && campaign.email?.status === 'sent') {
      return (
        <Badge variant="default" className="bg-emerald-100 text-emerald-700 border-emerald-200 flex-shrink-0" data-testid="badge-email-sent">
          <Check className="w-3 h-3 mr-1" />
          Email Sent
        </Badge>
      );
    }
    
    if (hasEmailContent) {
      return (
        <Badge variant="default" className="bg-blue-100 text-blue-700 border-blue-200 flex-shrink-0" data-testid="badge-email-generated">
          <Mail className="w-3 h-3 mr-1" />
          Email Generated
        </Badge>
      );
    }
    
    return (
      <Badge variant="secondary" className="flex-shrink-0 bg-slate-100 text-slate-500" data-testid="badge-no-email">
        No Email
      </Badge>
    );
  };

  const getBusinessTypeBadge = (campaign: CampaignWithEmail) => {
    const type = getBusinessType(campaign);
    const color = getBusinessTypeColor(type, uniqueBusinessTypes);
    
    return (
      <Badge 
        variant="outline" 
        className="flex-shrink-0 text-xs"
        style={{ 
          backgroundColor: `${color}15`,
          borderColor: `${color}40`,
          color: color
        }}
        data-testid={`badge-type-${type.toLowerCase().replace(/\s+/g, '-')}`}
      >
        {type}
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

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <RefreshCw className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-2xl font-semibold text-slate-900">Dashboard</h1>
              <p className="text-slate-500 text-sm mt-0.5">Manage your business campaigns and outreach</p>
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

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6"
        >
          <Card className="bg-white border-slate-200">
            <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">Total Businesses</CardTitle>
              <Building2 className="w-4 h-4 text-slate-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900" data-testid="stat-total">{campaigns.length}</div>
              <p className="text-xs text-slate-500 mt-1">In your database</p>
            </CardContent>
          </Card>

          <Card className="bg-white border-slate-200">
            <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">Emails Generated</CardTitle>
              <Mail className="w-4 h-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900" data-testid="stat-with-email">{emailStats.withEmail}</div>
              <p className="text-xs text-slate-500 mt-1">Ready to send</p>
            </CardContent>
          </Card>

          <Card className="bg-white border-slate-200">
            <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">Emails Sent</CardTitle>
              <Send className="w-4 h-4 text-emerald-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900" data-testid="stat-sent">{emailStats.sent}</div>
              <p className="text-xs text-slate-500 mt-1">Successfully delivered</p>
            </CardContent>
          </Card>

          <Card className="bg-white border-slate-200">
            <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">Conversion Rate</CardTitle>
              <BarChart3 className="w-4 h-4 text-violet-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900" data-testid="stat-rate">
                {campaigns.length > 0 ? Math.round((emailStats.sent / campaigns.length) * 100) : 0}%
              </div>
              <p className="text-xs text-slate-500 mt-1">Sent vs total</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6"
        >
          <Card className="lg:col-span-1 bg-white border-slate-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-medium text-slate-900 flex items-center gap-2">
                <PieChartIcon className="w-4 h-4 text-slate-500" />
                Business Types
              </CardTitle>
            </CardHeader>
            <CardContent>
              {pieChartData.length > 0 ? (
                <div className="h-[180px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieChartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={65}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {pieChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <ChartTooltip 
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload;
                            return (
                              <div className="bg-white border border-slate-200 rounded-lg px-3 py-2 shadow-lg">
                                <p className="text-sm font-medium" style={{ color: data.color }}>{data.name}</p>
                                <p className="text-sm text-slate-600">{data.value} businesses</p>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-[180px] flex items-center justify-center text-slate-400 text-sm">
                  No data to display
                </div>
              )}
              <div className="mt-2 flex flex-wrap gap-2 justify-center">
                {pieChartData.slice(0, 4).map((item) => (
                  <div key={item.name} className="flex items-center gap-1.5 text-xs text-slate-600">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                    <span>{item.name}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2 bg-white border-slate-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-medium text-slate-900 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-slate-500" />
                Business Trends by Type
              </CardTitle>
            </CardHeader>
            <CardContent>
              {campaigns.length > 0 && topEmailTypes.length > 0 ? (
                <>
                  <div className="h-[180px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={emailTrendsByType}
                        margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
                      >
                        <XAxis 
                          dataKey="date" 
                          stroke="#cbd5e1"
                          style={{ fontSize: '11px' }}
                        />
                        <YAxis 
                          stroke="#cbd5e1"
                          style={{ fontSize: '11px' }}
                        />
                        <ChartTooltip 
                          content={({ active, payload, label }) => {
                            if (active && payload && payload.length) {
                              return (
                                <div className="bg-white border border-slate-200 rounded-lg px-3 py-2 shadow-lg">
                                  <p className="text-sm font-medium text-slate-900 mb-1">{label}</p>
                                  {payload.map((entry: any, index: number) => (
                                    <p key={index} className="text-xs" style={{ color: entry.color }}>
                                      {entry.dataKey}: {entry.value}
                                    </p>
                                  ))}
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        {topEmailTypes.map((type) => (
                          <Line 
                            key={type}
                            type="monotone" 
                            dataKey={type}
                            stroke={getBusinessTypeColor(type, uniqueBusinessTypes)}
                            dot={{ fill: getBusinessTypeColor(type, uniqueBusinessTypes), r: 3 }}
                            activeDot={{ r: 5 }}
                            strokeWidth={2}
                          />
                        ))}
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-3 justify-center">
                    {topEmailTypes.map((type) => (
                      <div key={type} className="flex items-center gap-1.5 text-xs text-slate-600">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: getBusinessTypeColor(type, uniqueBusinessTypes) }} />
                        <span>{type}</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="h-[180px] flex items-center justify-center text-slate-400 text-sm">
                  No data to display
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        <Tabs defaultValue="campaigns" className="space-y-4">
          <TabsList data-testid="tabs-admin">
            <TabsTrigger value="campaigns" data-testid="tab-campaigns" className="gap-2">
              <Building2 className="w-4 h-4" />
              <span>Businesses</span>
              <span className="text-xs text-muted-foreground ml-1">{campaigns.filter(c => getEmailIssue(c.businessEmail) === null).length}</span>
            </TabsTrigger>
            <TabsTrigger value="email-issues" data-testid="tab-email-issues" className="gap-2">
              <X className="w-4 h-4" />
              <span>Email Issues</span>
              {emailIssuesCampaigns.length > 0 && (
                <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full ml-1">{emailIssuesCampaigns.length}</span>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="campaigns" className="space-y-4 mt-0">
            <Card className="bg-white border-slate-200">
              <CardHeader className="pb-3">
                <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                      placeholder="Search businesses..."
                      value={searchKeyword}
                      onChange={(e) => setSearchKeyword(e.target.value)}
                      className="pl-9 w-[200px] sm:w-[280px]"
                      data-testid="input-search-keyword"
                    />
                  </div>
                  <div className="flex items-center gap-3 flex-wrap">
                    <Select value={filterMode} onValueChange={(value: FilterMode) => setFilterMode(value)}>
                      <SelectTrigger className="w-[150px]" data-testid="select-filter-mode">
                        <SelectValue placeholder="Filter" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="withEmail">With Email</SelectItem>
                        <SelectItem value="withoutEmail">No Email</SelectItem>
                        <SelectItem value="sent">Sent</SelectItem>
                      </SelectContent>
                    </Select>
                    <span className="text-sm text-slate-500">
                      {validEmailCampaigns.length} of {campaigns.filter(c => getEmailIssue(c.businessEmail) === null).length}
                    </span>
                    {selectedCampaignIds.size > 0 && (
                      <span className="text-sm text-blue-600 font-medium">{selectedCampaignIds.size} selected</span>
                    )}
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
              </CardHeader>
              <CardContent className="p-0">
                {loading && campaigns.length === 0 ? (
                  <div className="text-center py-20">
                    <RefreshCw className="w-10 h-10 animate-spin text-slate-400 mx-auto mb-3" />
                    <p className="text-slate-500">Loading businesses...</p>
                  </div>
                ) : validEmailCampaigns.length === 0 ? (
                  <div className="text-center py-16">
                    <Building2 className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                    <p className="text-lg text-slate-500">{campaigns.filter(c => getEmailIssue(c.businessEmail) === null).length === 0 ? 'No businesses found' : 'No businesses match the filter'}</p>
                    <p className="text-sm text-slate-400 mt-1">{campaigns.filter(c => getEmailIssue(c.businessEmail) === null).length === 0 ? 'Business data will appear here' : 'Try changing the filter'}</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-slate-100/80 hover:bg-slate-100/80 border-b border-slate-200">
                          <TableHead className="w-[50px] pl-4">
                            <div className="flex items-center justify-center">
                              <Checkbox 
                                checked={selectedCampaignIds.size === validEmailCampaigns.length && validEmailCampaigns.length > 0}
                                onCheckedChange={(checked) => {
                                  if (checked) handleSelectAll();
                                  else handleDeselectAll();
                                }}
                                className="border-slate-400"
                                data-testid="checkbox-select-all"
                              />
                            </div>
                          </TableHead>
                          <TableHead className="font-semibold text-slate-700">Business Name</TableHead>
                          <TableHead className="font-semibold text-slate-700 hidden md:table-cell">Location</TableHead>
                          <TableHead className="font-semibold text-slate-700 hidden lg:table-cell">Email</TableHead>
                          <TableHead className="font-semibold text-slate-700 hidden sm:table-cell">Type</TableHead>
                          <TableHead className="font-semibold text-slate-700">Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {validEmailCampaigns.map((campaign) => (
                          <TableRow 
                            key={campaign.id}
                            className={`cursor-pointer transition-all duration-200 border-b border-slate-100 ${selectedCampaignIds.has(campaign.id) ? 'bg-blue-50 hover:bg-blue-100' : 'hover:bg-slate-50/80 hover:shadow-sm'}`}
                            onClick={() => setSelectedCampaign(campaign)}
                            data-testid={`row-campaign-${campaign.id}`}
                          >
                            <TableCell className="w-[50px] pl-4 py-4" onClick={(e) => e.stopPropagation()}>
                              <div className="flex items-center justify-center">
                                <Checkbox 
                                  checked={selectedCampaignIds.has(campaign.id)}
                                  onCheckedChange={() => toggleCampaignSelection(campaign.id)}
                                  data-testid={`checkbox-campaign-${campaign.id}`}
                                />
                              </div>
                            </TableCell>
                            <TableCell className="py-4">
                              <div className="font-medium text-slate-900 max-w-[200px] truncate">{campaign.businessName}</div>
                              <div className="text-xs text-slate-500 sm:hidden mt-0.5">
                                {extractCityCountry(campaign.address)}
                              </div>
                            </TableCell>
                            <TableCell className="hidden md:table-cell py-4">
                              <div className="flex items-center gap-1.5 text-slate-500 text-sm">
                                <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                                <span className="truncate max-w-[150px]">{extractCityCountry(campaign.address) || '-'}</span>
                              </div>
                            </TableCell>
                            <TableCell className="hidden lg:table-cell py-4">
                              {isValidEmail(campaign.businessEmail) ? (
                                <div className="flex items-center gap-1.5 text-sm">
                                  <Mail className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                                  <span className="text-slate-500 truncate max-w-[160px]">
                                    {getFirstValidEmail(campaign.businessEmail)}
                                  </span>
                                  {getAllValidEmails(campaign.businessEmail).length > 1 && (
                                    <Badge variant="secondary" className="text-xs px-1.5 py-0 bg-blue-100 text-blue-700 border-0" data-testid={`badge-more-emails-${campaign.id}`}>
                                      +{getAllValidEmails(campaign.businessEmail).length - 1}
                                    </Badge>
                                  )}
                                </div>
                              ) : (
                                <div className="flex items-center gap-1.5">
                                  <Badge 
                                    variant="outline" 
                                    className="text-xs bg-amber-50 text-amber-700 border-amber-200"
                                    data-testid={`badge-email-issue-${campaign.id}`}
                                  >
                                    {getEmailIssueLabel(getEmailIssue(campaign.businessEmail))}
                                  </Badge>
                                  {campaign.businessEmail && campaign.businessEmail.trim() !== '' && (
                                    <span className="text-slate-400 text-xs truncate max-w-[100px]" title={campaign.businessEmail}>
                                      {campaign.businessEmail}
                                    </span>
                                  )}
                                </div>
                              )}
                            </TableCell>
                            <TableCell className="hidden sm:table-cell py-4">
                              {getBusinessTypeBadge(campaign)}
                            </TableCell>
                            <TableCell className="py-4">
                              {getEmailBadge(campaign)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="email-issues" className="space-y-4 mt-0">
            <Card className="bg-white border-slate-200">
              <CardHeader className="pb-3">
                <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-amber-100 rounded-lg">
                      <X className="w-4 h-4 text-amber-600" />
                    </div>
                    <div>
                      <CardTitle className="text-base font-medium text-slate-900">Businesses with Email Issues</CardTitle>
                      <p className="text-sm text-slate-500 mt-0.5">These businesses have missing or invalid email addresses</p>
                    </div>
                  </div>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                      placeholder="Search by type..."
                      value={emailIssuesTypeSearch}
                      onChange={(e) => setEmailIssuesTypeSearch(e.target.value)}
                      className="pl-9 w-[180px]"
                      data-testid="input-email-issues-type-search"
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {loading && emailIssuesCampaigns.length === 0 ? (
                  <div className="text-center py-16">
                    <RefreshCw className="w-10 h-10 animate-spin text-slate-400 mx-auto mb-3" />
                    <p className="text-slate-500">Loading...</p>
                  </div>
                ) : emailIssuesCampaigns.length === 0 ? (
                  <div className="text-center py-16">
                    <Check className="w-12 h-12 mx-auto mb-3 text-emerald-400" />
                    <p className="text-lg text-slate-500">All businesses have valid emails</p>
                    <p className="text-sm text-slate-400 mt-1">No email issues found</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-amber-50/50 hover:bg-amber-50/50 border-b border-amber-100">
                          <TableHead className="font-semibold text-slate-700">Business Name</TableHead>
                          <TableHead className="font-semibold text-slate-700 hidden md:table-cell">Location</TableHead>
                          <TableHead className="font-semibold text-slate-700">Issue</TableHead>
                          <TableHead className="font-semibold text-slate-700 hidden sm:table-cell">Type</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {emailIssuesCampaigns.map((campaign) => (
                          <TableRow 
                            key={campaign.id} 
                            className="cursor-pointer transition-all duration-200 border-b border-slate-100 hover:bg-amber-50/30 hover:shadow-sm"
                            onClick={() => setSelectedCampaign(campaign)}
                            data-testid={`row-email-issue-${campaign.id}`}
                          >
                            <TableCell className="py-4">
                              <div className="flex items-center gap-2">
                                <Building2 className="w-4 h-4 text-amber-600 flex-shrink-0" />
                                <span className="font-medium text-slate-900 max-w-[200px] truncate">{campaign.businessName}</span>
                              </div>
                            </TableCell>
                            <TableCell className="hidden md:table-cell py-4">
                              <div className="flex items-center gap-1.5 text-slate-500 text-sm">
                                <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                                <span className="truncate max-w-[150px]">{extractCityCountry(campaign.address) || '-'}</span>
                              </div>
                            </TableCell>
                            <TableCell className="py-4">
                              <div className="flex items-center gap-2">
                                <Badge 
                                  variant="outline" 
                                  className="text-xs bg-amber-50 text-amber-700 border-amber-200"
                                >
                                  {getEmailIssueLabel(getEmailIssue(campaign.businessEmail))}
                                </Badge>
                                {campaign.businessEmail && campaign.businessEmail.trim() !== '' && (
                                  <span className="text-slate-400 text-xs truncate max-w-[120px] hidden lg:inline" title={campaign.businessEmail}>
                                    {campaign.businessEmail}
                                  </span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="hidden sm:table-cell py-4">
                              {getBusinessTypeBadge(campaign)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
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
                  <DialogTitle className="text-xl font-bold flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-blue-600" />
                    {selectedCampaign.businessName}
                  </DialogTitle>
                </DialogHeader>
                
                <div className="space-y-5 mt-3">
                  <div className="bg-slate-50 rounded-lg p-4 space-y-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      {getBusinessTypeBadge(selectedCampaign)}
                      {getEmailBadge(selectedCampaign)}
                    </div>
                    
                    {selectedCampaign.address && (
                      <div className="flex items-start gap-2">
                        <MapPin className="w-4 h-4 mt-0.5 text-slate-500 flex-shrink-0" />
                        <div className="text-slate-600 text-sm">{selectedCampaign.address}</div>
                      </div>
                    )}
                    
                    {(() => {
                      const validEmails = getAllValidEmails(selectedCampaign.businessEmail);
                      const emailIssue = getEmailIssue(selectedCampaign.businessEmail);
                      
                      if (emailIssue !== null) {
                        return (
                          <div className="space-y-3 border border-amber-200 bg-amber-50 rounded-lg p-3">
                            <div className="flex items-center gap-2">
                              <Mail className="w-4 h-4 text-amber-600 flex-shrink-0" />
                              <span className="text-sm font-medium text-amber-800">Email Issue</span>
                              <Badge variant="outline" className="text-xs bg-amber-100 text-amber-700 border-amber-300">
                                {getEmailIssueLabel(emailIssue)}
                              </Badge>
                            </div>
                            {selectedCampaign.businessEmail && selectedCampaign.businessEmail.trim() !== '' && (
                              <div className="text-xs text-amber-700 pl-6 break-all">
                                Current value: {selectedCampaign.businessEmail}
                              </div>
                            )}
                            <div className="pl-6 space-y-2">
                              <label className="text-sm font-medium text-slate-700">Enter valid email address:</label>
                              <div className="flex gap-2">
                                <Input
                                  type="email"
                                  value={manualEmail}
                                  onChange={(e) => setManualEmail(e.target.value)}
                                  placeholder="example@company.com"
                                  className="flex-1 bg-white"
                                  data-testid="input-manual-email"
                                />
                                <Button
                                  onClick={async () => {
                                    if (!manualEmail.trim()) {
                                      toast({
                                        title: "Email required",
                                        description: "Please enter an email address.",
                                        variant: "destructive",
                                      });
                                      return;
                                    }
                                    
                                    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
                                    if (!emailRegex.test(manualEmail.trim())) {
                                      toast({
                                        title: "Invalid email",
                                        description: "Please enter a valid email address.",
                                        variant: "destructive",
                                      });
                                      return;
                                    }
                                    
                                    setSavingEmail(true);
                                    try {
                                      const response = await authenticatedFetch(`/api/campaigns/${selectedCampaign.id}/email`, {
                                        method: 'PATCH',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({ email: manualEmail.trim() }),
                                      });
                                      
                                      if (!response.ok) {
                                        throw new Error('Failed to update email');
                                      }
                                      
                                      setCampaigns(prev => prev.map(c => 
                                        c.id === selectedCampaign.id 
                                          ? { ...c, businessEmail: manualEmail.trim() } 
                                          : c
                                      ));
                                      
                                      setSelectedCampaign(prev => 
                                        prev ? { ...prev, businessEmail: manualEmail.trim() } : null
                                      );
                                      
                                      setManualEmail('');
                                      
                                      toast({
                                        title: "Email updated",
                                        description: "Business email has been saved successfully.",
                                      });
                                    } catch (error) {
                                      toast({
                                        title: "Failed to save",
                                        description: "Could not update the email. Please try again.",
                                        variant: "destructive",
                                      });
                                    } finally {
                                      setSavingEmail(false);
                                    }
                                  }}
                                  disabled={savingEmail}
                                  size="sm"
                                  data-testid="button-save-manual-email"
                                >
                                  {savingEmail ? (
                                    <RefreshCw className="w-4 h-4 animate-spin" />
                                  ) : (
                                    <Save className="w-4 h-4" />
                                  )}
                                </Button>
                              </div>
                            </div>
                          </div>
                        );
                      }
                      
                      if (validEmails.length === 0) return null;
                      
                      return (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <div className="flex items-center gap-2">
                              <Mail className="w-4 h-4 text-slate-500 flex-shrink-0" />
                              <span className="text-sm font-medium text-slate-700">
                                Recipients {validEmails.length > 1 && `(${validEmails.length} available)`}
                              </span>
                            </div>
                            {validEmails.length > 1 && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  if (selectedRecipients.size === validEmails.length) {
                                    setSelectedRecipients(new Set([validEmails[0]]));
                                  } else {
                                    setSelectedRecipients(new Set(validEmails));
                                  }
                                }}
                                data-testid="button-toggle-all-recipients"
                              >
                                {selectedRecipients.size === validEmails.length ? 'Select Primary Only' : 'Select All'}
                              </Button>
                            )}
                          </div>
                          <div className="space-y-1.5 pl-6">
                            {validEmails.map((email, idx) => (
                              <div key={email} className="flex items-center gap-2">
                                <Checkbox
                                  id={`recipient-${idx}`}
                                  checked={selectedRecipients.has(email)}
                                  onCheckedChange={(checked) => {
                                    const newSet = new Set(selectedRecipients);
                                    if (checked) {
                                      newSet.add(email);
                                    } else {
                                      newSet.delete(email);
                                      if (newSet.size === 0) {
                                        newSet.add(validEmails[0]);
                                      }
                                    }
                                    setSelectedRecipients(newSet);
                                  }}
                                  data-testid={`checkbox-recipient-${idx}`}
                                />
                                <label
                                  htmlFor={`recipient-${idx}`}
                                  className="text-sm text-blue-600 hover:underline cursor-pointer"
                                >
                                  {email}
                                  {idx === 0 && <span className="text-slate-400 ml-1">(primary)</span>}
                                </label>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })()}
                    
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
                                  
                                  setCampaigns(prev => prev.map(c => 
                                    c.email?.id === emailId 
                                      ? { ...c, email: result.email }
                                      : c
                                  ));
                                  
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
                                const recipientsToSend = Array.from(selectedRecipients);
                                
                                if (recipientsToSend.length === 0) {
                                  toast({
                                    title: "Cannot send email",
                                    description: "No recipients selected.",
                                    variant: "destructive",
                                  });
                                  return;
                                }
                                
                                setSending(true);
                                let successCount = 0;
                                let failCount = 0;
                                
                                try {
                                  for (const recipientEmail of recipientsToSend) {
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

                                      if (response.ok) {
                                        successCount++;
                                      } else {
                                        failCount++;
                                      }
                                    } catch {
                                      failCount++;
                                    }
                                  }

                                  if (failCount === 0 && successCount > 0) {
                                    setCampaigns(prev => prev.map(c => 
                                      c.email?.id === email.id 
                                        ? { ...c, email: { ...c.email!, status: 'sent' as EmailStatus } }
                                        : c
                                    ));
                                    
                                    setSelectedCampaign(null);
                                    
                                    toast({
                                      title: "Email sent successfully",
                                      description: `Email sent to ${successCount} recipient${successCount > 1 ? 's' : ''}`,
                                    });
                                  } else if (successCount > 0 && failCount > 0) {
                                    toast({
                                      title: "Partial delivery",
                                      description: `${successCount} sent, ${failCount} failed. Please retry failed recipients.`,
                                      variant: "destructive",
                                    });
                                  } else {
                                    toast({
                                      title: "Failed to send email",
                                      description: "All delivery attempts failed. Please try again.",
                                      variant: "destructive",
                                    });
                                  }
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
                            disabled={sending || selectedRecipients.size === 0}
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
                                Send Email{selectedRecipients.size > 1 ? ` (${selectedRecipients.size})` : ''}
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
                            setShowCustomInput({...showCustomInput, [selectedCampaign.id]: value === 'custom'});
                          }}
                        >
                          <SelectTrigger className="w-full" data-testid="campaign-select-product">
                            <SelectValue placeholder="Choose a product to pitch..." />
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

                        {showCustomInput[selectedCampaign.id] && (
                          <Input
                            placeholder="Enter custom product name..."
                            value={customProducts[selectedCampaign.id] || ''}
                            onChange={(e) => setCustomProducts({...customProducts, [selectedCampaign.id]: e.target.value})}
                            data-testid="campaign-input-custom-product"
                          />
                        )}
                      </div>

                      <Button
                        onClick={() => handleGenerateEmail(selectedCampaign)}
                        disabled={generating === selectedCampaign.id || isGenerateDisabled(selectedCampaign.id)}
                        className="w-full"
                        data-testid="campaign-button-generate"
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
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>

        <Dialog open={selectedEmail !== null && selectedCampaign === null} onOpenChange={() => setSelectedEmail(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogDescription className="sr-only">
              Email preview for {selectedEmail?.businessName}
            </DialogDescription>
            {selectedEmail && (
              <>
                <DialogHeader>
                  <DialogTitle className="text-xl font-bold flex items-center gap-2">
                    <Mail className="w-5 h-5 text-blue-600" />
                    Email for {selectedEmail.businessName}
                  </DialogTitle>
                </DialogHeader>
                
                <div className="space-y-4 mt-3">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-slate-700">Status</span>
                      {getDetailedStatusBadge(selectedEmail.status)}
                    </div>
                    <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                      <Sparkles className="w-3 h-3 mr-1" />
                      AI Generated
                    </Badge>
                  </div>

                  <div className="space-y-4 border-t border-slate-200 pt-4">
                    <div>
                      <label className="text-sm font-semibold text-slate-700 mb-2 block">Subject</label>
                      <Input
                        value={editedSubject}
                        onChange={(e) => setEditedSubject(e.target.value)}
                        placeholder="Enter email subject..."
                        data-testid="input-email-subject"
                      />
                    </div>
                    
                    <div>
                      <label className="text-sm font-semibold text-slate-700 mb-2 block">Email Body</label>
                      <Textarea
                        value={editedBody}
                        onChange={(e) => setEditedBody(e.target.value)}
                        placeholder="Email content..."
                        className="min-h-[200px] resize-none"
                        data-testid="input-email-body"
                      />
                    </div>

                    <div className="flex gap-2">
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
                      <Button
                        onClick={handleSendEmail}
                        disabled={sending || selectedRecipients.size === 0}
                        className="flex-1"
                        data-testid="button-send-email"
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
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
