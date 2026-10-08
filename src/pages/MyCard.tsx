import React, { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Upload, Camera, FileText, Check, Loader2, Building, Mail, Phone, User, X, ScanFace, FileUp, Trash2, Pencil, Search, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { apiClient } from "@/api/client";

interface BusinessCardData {
  id?: number;
  name: string;
  email: string;
  phone: string;
  company: string;
  job_title: string;
  created_at?: string;
}

const fetchCards = async () => {
  return apiClient("/directory/business-cards/");
};

const scanCard = async (file: File) => {
  const formData = new FormData();
  formData.append("image", file);
  
  return apiClient("/directory/business-cards/scan/", {
    method: "POST",
    data: formData,
  });
};

const saveCard = async (data: BusinessCardData) => {
  return apiClient("/directory/business-cards/", {
    method: "POST",
    data,
  });
};

const updateCard = async (id: number, data: BusinessCardData) => {
  return apiClient(`/directory/business-cards/${id}/`, {
    method: "PUT",
    data,
  });
};

const deleteCard = async (id: number) => {
  return apiClient(`/directory/business-cards/${id}/`, {
    method: "DELETE",
  });
};

export default function MyCard() {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const streamRef = useRef<MediaStream | null>(null);
  const consecutiveErrorsRef = useRef(0);
  
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isManualScanning, setIsManualScanning] = useState(false); // Used for file upload scanning
  const [isCapturing, setIsCapturing] = useState(false);
  const [formData, setFormData] = useState<BusinessCardData>({
    name: "", email: "", phone: "", company: "", job_title: "",
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [emailData, setEmailData] = useState({ subject: "", body: "", to: "", name: "" });
  const [isSendingEmail, setIsSendingEmail] = useState(false);

  const openEmailModal = (card: BusinessCardData) => {
    setEmailData({
      to: card.email,
      name: card.name,
      subject: `Following up from our recent connection`,
      body: `Hi ${card.name ? card.name.split(' ')[0] : 'there'},\n\nIt was great connecting with you recently. I wanted to follow up regarding our conversation.\n\nBest regards,\n[Your Name]`
    });
    setIsEmailModalOpen(true);
  };

  const handleSendEmail = async () => {
    setIsSendingEmail(true);
    try {
      await apiClient("/integrations/emails/send-contact-email/", {
        method: "POST",
        data: {
          to: emailData.to,
          subject: emailData.subject,
          body: emailData.body.replace(/\n/g, '<br>'),
        }
      });
      toast.success("Email sent successfully!");
      setIsEmailModalOpen(false);
    } catch (error) {
      toast.error("Failed to send email. Ensure your Gmail is connected.");
    } finally {
      setIsSendingEmail(false);
    }
  };

  const getWhatsAppLink = (phone: string) => {
    const cleanPhone = phone.replace(/\D/g, '');
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    if (isMobile) {
      // On mobile, wa.me opens the native app seamlessly
      return `https://wa.me/${cleanPhone}`;
    } else {
      // On desktop, this skips the landing page and opens WhatsApp Web directly
      return `https://web.whatsapp.com/send?phone=${cleanPhone}`;
    }
  };

  const { data: cards, isLoading: isLoadingCards } = useQuery({
    queryKey: ["business-cards"],
    queryFn: fetchCards,
  });

  const saveMutation = useMutation({
    mutationFn: saveCard,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["business-cards"] });
      toast.success("Business card saved successfully");
      setIsFormOpen(false);
      setFormData({ name: "", email: "", phone: "", company: "", job_title: "" });
    },
    onError: () => toast.error("Failed to save business card"),
  });

  const updateMutation = useMutation({
    mutationFn: (data: BusinessCardData) => updateCard(data.id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["business-cards"] });
      toast.success("Business card updated successfully");
      setIsFormOpen(false);
      setFormData({ name: "", email: "", phone: "", company: "", job_title: "" });
    },
    onError: () => toast.error("Failed to update business card"),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteCard,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["business-cards"] });
      toast.success("Business card deleted successfully");
    },
    onError: () => toast.error("Failed to delete business card"),
  });

  // --- Manual Camera Scan Logic ---
  const startCamera = async () => {
    try {
      setIsCameraOpen(true);
      consecutiveErrorsRef.current = 0; // reset errors
      const mediaStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      streamRef.current = mediaStream;
      
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
          videoRef.current.play();
        }
      }, 100);
    } catch (err) {
      toast.error("Camera access denied or unavailable.");
      setIsCameraOpen(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsCameraOpen(false);
  };

  const handleManualCapture = () => {
    if (isCapturing) return;
    
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext('2d');
      if (context) {
        canvasRef.current.width = videoRef.current.videoWidth;
        canvasRef.current.height = videoRef.current.videoHeight;
        context.drawImage(videoRef.current, 0, 0, canvasRef.current.width, canvasRef.current.height);
        
        canvasRef.current.toBlob(async (blob) => {
          if (blob) {
            const file = new File([blob], "capture.jpg", { type: "image/jpeg" });
            setIsCapturing(true);
            try {
              const result = await scanCard(file);
              consecutiveErrorsRef.current = 0; // Success, reset error count
              
              if (result.email || result.phone || result.name || result.company || result.job_title) {
                stopCamera();
                setFormData({
                  name: result.name || "",
                  email: result.email || "",
                  phone: result.phone || "",
                  company: result.company || "",
                  job_title: result.job_title || "",
                });
                setIsFormOpen(true);
                toast.success("Business card successfully scanned!");
              } else {
                toast.error("Could not find enough details. Please try capturing again.");
              }
            } catch (error) {
              toast.error("Failed to scan card. Please try again or use manual upload.");
            } finally {
              setIsCapturing(false);
            }
          }
        }, 'image/jpeg');
      }
    }
  };

  useEffect(() => {
    return () => stopCamera();
  }, []);

  // --- Manual File Upload Logic ---
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processManualFile(e.target.files[0]);
    }
  };

  const processManualFile = async (file: File) => {
    setIsManualScanning(true);
    setIsFormOpen(true);
    try {
      const result = await scanCard(file);
      setFormData({
        name: result.name || "",
        email: result.email || "",
        phone: result.phone || "",
        company: result.company || "",
        job_title: result.job_title || "",
      });
      toast.success("Card scanned successfully. Please verify details.");
    } catch (error) {
      toast.error("Failed to extract data. Please fill manually.");
    } finally {
      setIsManualScanning(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const filteredCards = cards?.filter((card: BusinessCardData) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      (card.name || "").toLowerCase().includes(query) ||
      (card.email || "").toLowerCase().includes(query) ||
      (card.phone || "").toLowerCase().includes(query) ||
      (card.company || "").toLowerCase().includes(query) ||
      (card.job_title || "").toLowerCase().includes(query)
    );
  });

  // Pagination Logic
  const totalCards = filteredCards?.length || 0;
  const totalPages = Math.ceil(totalCards / itemsPerPage);
  
  // Ensure current page is valid when filtering changes total pages
  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages);
    } else if (totalPages === 0 && currentPage !== 1) {
      setCurrentPage(1);
    }
  }, [totalPages, currentPage]);

  const indexOfLastCard = currentPage * itemsPerPage;
  const indexOfFirstCard = indexOfLastCard - itemsPerPage;
  const currentCards = filteredCards?.slice(indexOfFirstCard, indexOfLastCard);

  const getPageNumbers = () => {
    const pages = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 4) {
        for (let i = 1; i <= 5; i++) {
          pages.push(i);
        }
        pages.push('ellipsis');
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 3) {
        pages.push(1);
        pages.push('ellipsis');
        for (let i = totalPages - 4; i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        pages.push(1);
        pages.push('ellipsis');
        pages.push(currentPage - 1);
        pages.push(currentPage);
        pages.push(currentPage + 1);
        pages.push('ellipsis');
        pages.push(totalPages);
      }
    }
    return pages;
  };

  return (
    <div className="min-h-screen bg-[#fafafa] relative overflow-hidden animate-fade-in">
      {/* Background Gradient */}
      <div className="absolute top-0 left-0 w-full h-[300px] bg-gradient-to-b from-[#f0f3ff] to-transparent pointer-events-none" />

      <div className="p-4 md:p-8 max-w-[1200px] mx-auto space-y-8 relative z-10">
        
        {/* Header Block */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white/60 backdrop-blur-xl p-6 rounded-3xl border border-white/50 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-indigo-50 flex items-center justify-center shadow-sm">
              <ScanFace className="h-6 w-6 text-indigo-600" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-900">My Cards</h1>
              <p className="text-slate-500 mt-1 text-sm font-medium">Scan, save, and manage your business connections easily.</p>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            <div className="relative w-full sm:w-64 shrink-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search anything..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-11 bg-white border-slate-200 rounded-xl focus-visible:ring-indigo-500 w-full"
              />
            </div>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              ref={fileInputRef}
              onChange={handleFileChange}
            />
            <Button variant="outline" onClick={() => fileInputRef.current?.click()} className="h-11 rounded-xl bg-white hover:bg-slate-50 border-slate-200 text-slate-700 shadow-sm font-bold gap-2">
              <FileUp className="h-4 w-4" />
              Upload Image
            </Button>
            <Button onClick={startCamera} className="h-11 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white shadow-lg shadow-indigo-200 transition-all hover:scale-105 font-bold gap-2">
              <Camera className="h-4 w-4" />
              Scan Card
            </Button>
          </div>
        </div>

        {/* Camera Modal */}
        <Dialog open={isCameraOpen} onOpenChange={(open) => !open && stopCamera()}>
          <DialogContent className="sm:max-w-[800px] p-0 overflow-hidden bg-black border-none rounded-2xl w-[95vw] max-w-[95vw]">
            <div className="relative w-full aspect-[3/4] sm:aspect-[4/3] max-h-[85vh] bg-black flex flex-col justify-end">
              <video 
                ref={videoRef} 
                className="absolute inset-0 w-full h-full object-cover" 
                playsInline 
                muted
              />
              
              {/* Dynamic Scanner Overlay */}
              <div className="absolute inset-0 border-[20px] sm:border-[40px] border-black/50 pointer-events-none flex items-center justify-center z-10">
                <div className="w-full h-full border-2 border-indigo-500/80 rounded-xl relative shadow-[inset_0_0_20px_rgba(99,102,241,0.2)] overflow-hidden">
                  {/* Scanner laser effect */}
                  <div className="absolute left-0 right-0 h-1 bg-indigo-400 shadow-[0_0_15px_rgba(129,140,248,1)] animate-pulse rounded-full opacity-70" style={{
                    animation: 'scan-laser 3s infinite linear'
                  }}></div>
                </div>
              </div>

              {/* Capture Button */}
              <div className="absolute bottom-8 left-0 right-0 flex justify-center z-20">
                <Button 
                  onClick={handleManualCapture} 
                  disabled={isCapturing}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-6 rounded-full flex items-center gap-3 shadow-2xl border-2 border-indigo-400 transition-all hover:scale-105 disabled:opacity-70 disabled:hover:scale-100"
                >
                  {isCapturing ? (
                    <>
                      <Loader2 className="h-6 w-6 animate-spin text-white" />
                      <span className="font-bold text-lg tracking-wide">Scanning...</span>
                    </>
                  ) : (
                    <>
                      <Camera className="h-6 w-6" />
                      <span className="font-bold text-lg tracking-wide">Capture Image</span>
                    </>
                  )}
                </Button>
              </div>

              <Button 
                size="icon" 
                variant="ghost" 
                className="absolute top-2 right-2 text-white hover:bg-white/20 rounded-full z-30 bg-black/40"
                onClick={stopCamera}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
            
            {/* Hidden Canvas for capture */}
            <canvas ref={canvasRef} className="hidden" />
          </DialogContent>
        </Dialog>

        {/* Edit Details Modal */}
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogContent className="sm:max-w-[450px] rounded-3xl p-0 overflow-hidden border-0 shadow-2xl">
            <div className="bg-gradient-to-r from-indigo-500 to-violet-600 p-6 text-white text-center">
              <DialogTitle className="text-xl font-bold">Review Contact Details</DialogTitle>
              <p className="text-white/80 text-sm mt-1">Make sure the extracted details are correct.</p>
            </div>
            
            {isManualScanning ? (
              <div className="flex flex-col items-center justify-center p-12 space-y-4 bg-white">
                <div className="h-16 w-16 rounded-2xl bg-indigo-50 flex items-center justify-center relative">
                  <ScanFace className="h-8 w-8 text-indigo-600 absolute" />
                  <Loader2 className="h-16 w-16 text-indigo-200 animate-spin absolute" />
                </div>
                <p className="text-sm font-medium text-slate-500">Extracting details using OCR...</p>
              </div>
            ) : (
              <div className="grid gap-4 p-6 bg-white">
                <div className="grid gap-1">
                  <Label className="text-xs font-bold text-slate-500 uppercase">Full Name</Label>
                  <Input className="bg-slate-50 border-slate-200 rounded-xl h-11 focus-visible:ring-indigo-500" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-1">
                    <Label className="text-xs font-bold text-slate-500 uppercase">Company</Label>
                    <Input className="bg-slate-50 border-slate-200 rounded-xl h-11 focus-visible:ring-indigo-500" value={formData.company} onChange={(e) => setFormData({...formData, company: e.target.value})} />
                  </div>
                  <div className="grid gap-1">
                    <Label className="text-xs font-bold text-slate-500 uppercase">Job Title</Label>
                    <Input className="bg-slate-50 border-slate-200 rounded-xl h-11 focus-visible:ring-indigo-500" value={formData.job_title} onChange={(e) => setFormData({...formData, job_title: e.target.value})} />
                  </div>
                </div>
                <div className="grid gap-1">
                  <Label className="text-xs font-bold text-slate-500 uppercase">Email Address</Label>
                  <Input className="bg-slate-50 border-slate-200 rounded-xl h-11 focus-visible:ring-indigo-500" type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} />
                </div>
                <div className="grid gap-1">
                  <Label className="text-xs font-bold text-slate-500 uppercase">Phone Number</Label>
                  <Input className="bg-slate-50 border-slate-200 rounded-xl h-11 focus-visible:ring-indigo-500" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} />
                </div>
              </div>
            )}
            
            <DialogFooter className="p-4 bg-slate-50/50 border-t border-slate-100 flex gap-2">
              <Button variant="outline" onClick={() => setIsFormOpen(false)} disabled={isManualScanning} className="rounded-xl border-slate-200 hover:bg-slate-100 text-slate-600 font-bold h-11">Cancel</Button>
              <Button onClick={() => formData.id ? updateMutation.mutate(formData) : saveMutation.mutate(formData)} disabled={isManualScanning || saveMutation.isPending || updateMutation.isPending} className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold h-11 px-8">
                {(saveMutation.isPending || updateMutation.isPending) ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
                {formData.id ? "Update Card" : "Save Card"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Email Send Modal */}
        <Dialog open={isEmailModalOpen} onOpenChange={setIsEmailModalOpen}>
          <DialogContent className="sm:max-w-[500px] rounded-3xl p-0 overflow-hidden border-0 shadow-[0_20px_50px_rgba(0,0,0,0.1)]">
            <div className="relative p-8 overflow-hidden bg-white">
              {/* Premium Background Accent */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>
              <div className="absolute bottom-0 left-0 w-40 h-40 bg-blue-500/5 rounded-full blur-2xl -ml-10 -mb-10 pointer-events-none"></div>
              
              <div className="relative z-10 flex items-center gap-4 mb-8">
                <div className="h-12 w-12 rounded-2xl bg-indigo-50 flex items-center justify-center shrink-0 border border-indigo-100/50 shadow-sm">
                  <Mail className="h-6 w-6 text-indigo-600" />
                </div>
                <div>
                  <DialogTitle className="text-2xl font-extrabold text-slate-900 tracking-tight">Compose Email</DialogTitle>
                  <p className="text-slate-500 text-sm font-medium mt-0.5">Sending to <span className="text-indigo-600 font-semibold">{emailData.name}</span></p>
                </div>
              </div>
              
              <div className="relative z-10 space-y-5">
                <div className="grid gap-2">
                  <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Subject</Label>
                  <Input 
                    className="bg-white border-slate-200 rounded-xl h-12 focus-visible:ring-indigo-500 font-medium text-slate-800 shadow-sm" 
                    value={emailData.subject} 
                    onChange={(e) => setEmailData({...emailData, subject: e.target.value})} 
                  />
                </div>
                <div className="grid gap-2">
                  <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Message Body</Label>
                  <textarea 
                    className="flex min-h-[200px] w-full rounded-xl border border-slate-200 bg-white px-4 py-4 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-50 resize-none font-medium text-slate-700 shadow-sm leading-relaxed"
                    value={emailData.body}
                    onChange={(e) => setEmailData({...emailData, body: e.target.value})}
                  />
                </div>
              </div>
            </div>
            
            <DialogFooter className="p-5 bg-slate-50 border-t border-slate-100 flex gap-3 sm:justify-end">
              <Button variant="outline" onClick={() => setIsEmailModalOpen(false)} className="rounded-xl border-slate-200 hover:bg-slate-100 text-slate-600 font-bold h-12 px-6">Cancel</Button>
              <Button onClick={handleSendEmail} disabled={isSendingEmail || !emailData.subject || !emailData.body} className="rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold h-12 px-8 shadow-md hover:shadow-lg transition-all">
                {isSendingEmail ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Mail className="mr-2 h-5 w-5" />}
                {isSendingEmail ? "Sending..." : "Send Email"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Content Area */}
        {isLoadingCards ? (
          <div className="flex justify-center p-20">
            <Loader2 className="h-10 w-10 animate-spin text-indigo-500" />
          </div>
        ) : (
          <div className="space-y-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {currentCards && currentCards.length > 0 ? (
                currentCards.map((card: BusinessCardData) => (
                  <div key={card.id} className="bg-white rounded-3xl border border-slate-200/60 shadow-sm overflow-hidden hover:shadow-md transition-all hover:-translate-y-1 relative group cursor-pointer" onClick={() => { setFormData(card); setIsFormOpen(true); }}>
                  <div className="absolute top-4 right-4 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                    <Button variant="outline" size="icon" className="h-8 w-8 rounded-full bg-white/90 shadow-sm hover:bg-indigo-50 hover:text-indigo-600 border-transparent transition-colors" onClick={(e) => { e.stopPropagation(); setFormData(card); setIsFormOpen(true); }}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="icon" className="h-8 w-8 rounded-full bg-white/90 shadow-sm hover:bg-red-50 hover:text-red-600 border-transparent transition-colors" onClick={(e) => { e.stopPropagation(); if(window.confirm('Are you sure you want to delete this card?')) deleteMutation.mutate(card.id!); }}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="h-2 bg-gradient-to-r from-indigo-500 to-violet-500"></div>
                  <div className="p-4">
                    <div className="flex items-start gap-3 mb-4">
                      <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center shrink-0 border border-slate-200 text-lg font-bold text-indigo-600">
                        {card.name ? card.name.charAt(0).toUpperCase() : <User className="h-4 w-4 text-slate-400" />}
                      </div>
                      <div className="overflow-hidden">
                        <h3 className="font-bold text-base text-slate-900 leading-tight truncate">{card.name || 'Unnamed Contact'}</h3>
                        <div className="text-xs font-medium mt-1 flex items-center gap-1.5 w-full">
                          <span className="text-indigo-600 truncate max-w-[45%]">{card.job_title || 'Professional'}</span>
                          <span className="text-slate-300 shrink-0">•</span> 
                          <span className="text-slate-500 truncate max-w-[45%]">{card.company || 'Unknown Company'}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-3 pt-4 mb-4 border-t border-slate-100">
                      {card.email && (
                        <div className="flex items-center gap-3 text-sm text-slate-600 font-medium">
                          <Mail className="h-4 w-4 text-slate-400 shrink-0" />
                          <span className="truncate">{card.email}</span>
                        </div>
                      )}
                      {card.phone && (
                        <div className="flex items-center gap-3 text-sm text-slate-600 font-medium">
                          <Phone className="h-4 w-4 text-slate-400 shrink-0" />
                          <span className="truncate">{card.phone}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2 pt-4 border-t border-slate-100">
                      {card.email && (
                        <Button 
                          variant="outline" 
                          className="flex-1 h-10 bg-indigo-50 hover:bg-indigo-100 border-transparent hover:border-indigo-200 text-indigo-700 font-bold transition-all"
                          onClick={(e) => { e.stopPropagation(); openEmailModal(card); }}
                        >
                          <Mail className="h-4 w-4 mr-2" />
                          Email
                        </Button>
                      )}
                      {card.phone && (
                        <a 
                          href={getWhatsAppLink(card.phone)} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="flex-1 flex items-center justify-center h-10 bg-emerald-50 hover:bg-emerald-100 border border-transparent hover:border-emerald-200 text-emerald-700 rounded-xl font-bold transition-all text-sm"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MessageCircle className="h-4 w-4 mr-2" />
                          WhatsApp
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              ))
            ) : searchQuery ? (
                <div className="col-span-full text-center py-24 bg-white/60 backdrop-blur-sm rounded-3xl border border-dashed border-slate-300 shadow-sm">
                  <div className="mx-auto w-20 h-20 bg-white rounded-2xl flex items-center justify-center shadow-sm border border-slate-100 mb-6 relative">
                    <Search className="h-10 w-10 text-slate-400" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mb-2">No matching cards found</h3>
                  <p className="text-slate-500 font-medium">Try adjusting your search query.</p>
                </div>
              ) : (
                <div className="col-span-full text-center py-24 bg-white/60 backdrop-blur-sm rounded-3xl border border-dashed border-slate-300 shadow-sm">
                  <div className="mx-auto w-20 h-20 bg-white rounded-2xl flex items-center justify-center shadow-sm border border-slate-100 mb-6 relative">
                    <div className="absolute inset-0 bg-indigo-50 rounded-2xl scale-110 -z-10 rotate-3"></div>
                    <ScanFace className="h-10 w-10 text-indigo-400" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mb-2">Your network is empty</h3>
                  <p className="text-slate-500 mb-8 max-w-sm mx-auto font-medium">Build your digital rolodex. Use your camera to instantly scan and save a business card.</p>
                  <Button onClick={startCamera} className="h-12 rounded-xl px-8 bg-slate-900 hover:bg-slate-800 text-white font-bold shadow-md">
                    <Camera className="mr-2 h-4 w-4" />
                    Scan First Card
                  </Button>
                </div>
              )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white/50 p-4 rounded-2xl border border-slate-200/60 shadow-sm">
                <div className="text-sm text-slate-500 font-medium">
                  Showing {indexOfFirstCard + 1} to {Math.min(indexOfLastCard, totalCards)} of {totalCards} cards
                </div>
                
                <div className="flex items-center gap-4">
                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious 
                          href="#" 
                          onClick={(e) => {
                            e.preventDefault();
                            if (currentPage > 1) setCurrentPage(p => p - 1);
                          }}
                          className={currentPage === 1 ? "pointer-events-none opacity-50" : ""}
                        />
                      </PaginationItem>
                      
                      {getPageNumbers().map((pageNum, idx) => (
                        <PaginationItem key={idx}>
                          {pageNum === 'ellipsis' ? (
                            <PaginationEllipsis />
                          ) : (
                            <PaginationLink
                              href="#"
                              isActive={currentPage === pageNum}
                              onClick={(e) => {
                                e.preventDefault();
                                setCurrentPage(pageNum as number);
                              }}
                            >
                              {pageNum}
                            </PaginationLink>
                          )}
                        </PaginationItem>
                      ))}

                      <PaginationItem>
                        <PaginationNext 
                          href="#" 
                          onClick={(e) => {
                            e.preventDefault();
                            if (currentPage < totalPages) setCurrentPage(p => p + 1);
                          }}
                          className={currentPage === totalPages ? "pointer-events-none opacity-50" : ""}
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>

                  {/* Removed Items Per Page Selector (Fixed at 10) */}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes scan-laser {
          0% { top: 0%; }
          50% { top: 98%; }
          100% { top: 0%; }
        }
      `}} />
    </div>
  );
}
