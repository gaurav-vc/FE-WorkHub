import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Building, MapPin, Mail, Phone, Briefcase, Lock, User as UserIcon, Calendar, Edit2, X, Upload } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { getCurrentProfile, updateCurrentProfile } from "@/api/collaboration";
import { changePassword } from "@/api/auth";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ProfileModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ProfileModal({ open, onOpenChange }: ProfileModalProps) {
  const { logout } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"profile" | "security">("profile");

  // Password change state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isChanging, setIsChanging] = useState(false);

  // Edit profile state
  const [isEditing, setIsEditing] = useState(false);
  const [editDob, setEditDob] = useState("");
  const [editPhoto, setEditPhoto] = useState<File | null>(null);
  const [removePhoto, setRemovePhoto] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setLoading(true);
      setActiveTab("profile");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      getCurrentProfile()
        .then((data) => {
          setProfile(data);
          setEditDob(data.dob || "");
          setEditPhoto(null);
          setRemovePhoto(false);
          setIsEditing(false);
          setLoading(false);
        })
        .catch((err) => {
          console.error("Failed to load profile", err);
          setLoading(false);
        });
    }
  }, [open]);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match.");
      return;
    }
    if (!currentPassword || !newPassword) {
      toast.error("Please fill in all fields.");
      return;
    }

    try {
      setIsChanging(true);
      await changePassword({ current_password: currentPassword, new_password: newPassword });
      toast.success("Password changed successfully. Please log in again.");
      onOpenChange(false);
      logout(); // Force login with new password
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Failed to change password.");
    } finally {
      setIsChanging(false);
    }
  };

  const handleSaveProfile = async () => {
    try {
      setIsSaving(true);
      const formData = new FormData();
      if (editDob !== (profile.dob || "")) formData.append("dob", editDob);
      if (editPhoto) formData.append("photo", editPhoto);
      if (removePhoto) formData.append("remove_photo", "true");

      await updateCurrentProfile(formData);
      toast.success("Profile updated successfully");
      
      // Refresh profile data
      const data = await getCurrentProfile();
      setProfile(data);
      setEditDob(data.dob || "");
      setEditPhoto(null);
      setRemovePhoto(false);
      setIsEditing(false);
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Failed to update profile.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] p-0 overflow-hidden bg-background">
        <div className="flex flex-col md:flex-row h-full min-h-[500px]">
          {/* Sidebar Tabs */}
          <div className="w-full md:w-48 bg-muted/30 border-r border-border p-4 flex flex-col gap-2 shrink-0">
            <DialogHeader className="mb-4 text-left">
              <DialogTitle className="text-xl">Settings</DialogTitle>
            </DialogHeader>
            <button
              onClick={() => setActiveTab("profile")}
              className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                activeTab === "profile" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted"
              )}
            >
              <UserIcon className="h-4 w-4" />
              Profile
            </button>
            <button
              onClick={() => setActiveTab("security")}
              className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                activeTab === "security" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted"
              )}
            >
              <Lock className="h-4 w-4" />
              Security
            </button>
          </div>

          {/* Content Area */}
          <div className="flex-1 p-6 md:p-8 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <span className="text-sm text-muted-foreground animate-pulse">Loading...</span>
              </div>
            ) : profile ? (
              <>
                {activeTab === "profile" && (
                  <div className="flex flex-col gap-8 animate-in fade-in slide-in-from-right-4 duration-300 relative">
                    <div className="absolute top-0 right-0 flex gap-2">
                      {isEditing ? (
                        <>
                          <Button variant="outline" size="sm" onClick={() => setIsEditing(false)}>Cancel</Button>
                          <Button size="sm" onClick={handleSaveProfile} disabled={isSaving}>
                            {isSaving ? "Saving..." : "Save Changes"}
                          </Button>
                        </>
                      ) : (
                        <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                          <Edit2 className="h-4 w-4 mr-2" />
                          Edit Profile
                        </Button>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-6 mt-4">
                      <div className="relative group">
                        <Avatar className="h-24 w-24 border-4 border-muted shrink-0">
                          {(!removePhoto && profile.photo_url) || editPhoto ? (
                            <img src={editPhoto ? URL.createObjectURL(editPhoto) : profile.photo_url} alt={profile.full_name} className="object-cover w-full h-full" />
                          ) : (
                            <AvatarFallback className="text-3xl bg-primary/10 text-primary font-bold">
                              {profile.full_name?.substring(0, 2).toUpperCase() || profile.username.substring(0, 2).toUpperCase()}
                            </AvatarFallback>
                          )}
                        </Avatar>
                        {isEditing && (
                          <div className="absolute inset-0 bg-black/50 rounded-full flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <label className="cursor-pointer text-white text-xs text-center flex flex-col items-center p-1">
                              <Upload className="h-4 w-4 mb-1" />
                              Upload
                              <input type="file" className="hidden" accept="image/*" onChange={(e) => {
                                if (e.target.files && e.target.files[0]) {
                                  setEditPhoto(e.target.files[0]);
                                  setRemovePhoto(false);
                                }
                              }} />
                            </label>
                          </div>
                        )}
                      </div>
                      <div className="space-y-1">
                        <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
                          {profile.full_name}
                          {isEditing && ((profile.photo_url && !removePhoto) || editPhoto) && (
                            <Badge variant="outline" className="cursor-pointer text-xs hover:bg-destructive hover:text-white transition-colors" onClick={() => { setRemovePhoto(true); setEditPhoto(null); }}>
                              <X className="h-3 w-3 mr-1" /> Remove Photo
                            </Badge>
                          )}
                        </h2>
                        <p className="text-sm text-muted-foreground font-medium capitalize">{profile.role}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-4 bg-muted/20 p-5 rounded-xl border border-border/50">
                        <h3 className="text-sm font-semibold text-foreground/80 mb-2 uppercase tracking-wider">Contact Info</h3>
                        <div className="flex items-center gap-3 text-sm">
                          <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                          <span className="truncate">{profile.email}</span>
                        </div>
                        {profile.phone && (
                          <div className="flex items-center gap-3 text-sm">
                            <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                            <span>{profile.phone}</span>
                          </div>
                        )}
                        {profile.location && (
                          <div className="flex items-center gap-3 text-sm">
                            <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
                            <span>{profile.location}</span>
                          </div>
                        )}
                        {(profile.dob || isEditing) && (
                          <div className="flex items-center gap-3 text-sm">
                            <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                            {isEditing ? (
                              <Input type="date" className="h-8 py-1 max-w-[150px]" value={editDob} onChange={(e) => setEditDob(e.target.value)} />
                            ) : (
                              <span>{profile.dob}</span>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="space-y-4 bg-muted/20 p-5 rounded-xl border border-border/50">
                        <h3 className="text-sm font-semibold text-foreground/80 mb-2 uppercase tracking-wider">Organization</h3>
                        <div className="flex items-center gap-3 text-sm">
                          <Building className="h-4 w-4 text-muted-foreground shrink-0" />
                          <span className="truncate">
                            {profile.organization || "No Organization"}
                            {profile.site ? ` • ${profile.site}` : ""}
                          </span>
                        </div>
                        {profile.department && profile.department !== "General" && (
                          <div className="flex items-center gap-3 text-sm">
                            <Briefcase className="h-4 w-4 text-muted-foreground shrink-0" />
                            <span className="truncate">Department: {profile.department}</span>
                          </div>
                        )}
                        {profile.reporting_to && (
                          <div className="flex items-center gap-3 text-sm">
                            <UserIcon className="h-4 w-4 text-muted-foreground shrink-0" />
                            <span className="truncate">Reports to: {profile.reporting_to}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {profile.skills && profile.skills.length > 0 && (
                      <div className="w-full space-y-3">
                        <h3 className="text-sm font-semibold text-foreground/80 uppercase tracking-wider">Skills</h3>
                        <div className="flex flex-wrap gap-2">
                          {profile.skills.map((skill: string, i: number) => (
                            <Badge key={i} variant="secondary" className="px-3 py-1 font-medium">{skill}</Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === "security" && (
                  <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-right-4 duration-300">
                    <div className="space-y-2">
                      <h2 className="text-2xl font-bold text-foreground">Change Password</h2>
                      <p className="text-sm text-muted-foreground">
                        Update your password to keep your account secure. You will be asked to log in again after changing it.
                      </p>
                    </div>

                    <form onSubmit={handlePasswordChange} className="space-y-4 max-w-sm mt-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Current Password</label>
                        <Input
                          type="password"
                          placeholder="••••••••"
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">New Password</label>
                        <Input
                          type="password"
                          placeholder="••••••••"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Confirm New Password</label>
                        <Input
                          type="password"
                          placeholder="••••••••"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          required
                        />
                      </div>
                      <Button type="submit" className="w-full mt-4" disabled={isChanging}>
                        {isChanging ? "Changing..." : "Change Password"}
                      </Button>
                    </form>
                  </div>
                )}
              </>
            ) : (
              <div className="flex items-center justify-center h-full">
                <span className="text-sm text-destructive">Failed to load profile details.</span>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
