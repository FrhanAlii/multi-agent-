import { useState } from "react";
import { User, Bell, Puzzle, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export default function SettingsPage() {
  const { user } = useAuth();
  const [fullName, setFullName] = useState(user?.user_metadata?.full_name || "");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const handleSaveProfile = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("profiles").update({ full_name: fullName } as any).eq("id", user.id);
      if (error) throw error;
      toast({ title: "Profile updated" });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!user || !e.target.files?.[0]) return;
    const file = e.target.files[0];
    if (file.size > 2 * 1024 * 1024) {
      toast({ title: "File too large", description: "Max 2MB", variant: "destructive" });
      return;
    }
    setUploading(true);
    try {
      const path = `${user.id}/avatar.${file.name.split(".").pop()}`;
      const { error: uploadError } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(path);
      await supabase.from("profiles").update({ avatar_url: publicUrl } as any).eq("id", user.id);
      toast({ title: "Avatar updated" });
    } catch (e: any) {
      toast({ title: "Error uploading avatar", description: e.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const initials = fullName ? fullName.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase() : "U";

  return (
    <div className="max-w-[800px] mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        <p className="text-sm text-muted mt-1">Manage your account preferences.</p>
      </div>
      <div className="bg-card rounded-2xl p-6 shadow-card mb-4">
        <div className="flex items-center gap-3 mb-5">
          <User className="w-5 h-5 text-primary" />
          <h3 className="text-base font-semibold text-foreground">Profile</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-medium text-muted mb-1 block">Full Name</label>
            <input value={fullName} onChange={(e) => setFullName(e.target.value)}
              className="w-full bg-secondary rounded-xl px-4 py-2.5 text-sm text-foreground border-none outline-none focus:ring-2 focus:ring-primary/20" />
          </div>
          <div>
            <label className="text-xs font-medium text-muted mb-1 block">Email</label>
            <input value={user?.email || ""} disabled
              className="w-full bg-secondary rounded-xl px-4 py-2.5 text-sm text-muted border-none outline-none" />
          </div>
        </div>
        <div className="mt-4">
          <label className="text-xs font-medium text-muted mb-1 block">Avatar</label>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-primary/15 flex items-center justify-center text-primary text-xl font-bold">{initials}</div>
            <label className="text-sm font-medium text-primary hover:underline cursor-pointer">
              {uploading ? <Loader2 className="w-4 h-4 animate-spin inline" /> : "Change Avatar"}
              <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
            </label>
          </div>
        </div>
        <button onClick={handleSaveProfile} disabled={saving}
          className="mt-4 gradient-primary text-primary-foreground rounded-xl px-6 py-2.5 text-sm font-semibold flex items-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          Save Changes
        </button>
      </div>

      <div className="bg-card rounded-2xl p-6 shadow-card mb-4">
        <div className="flex items-center gap-3 mb-5">
          <Bell className="w-5 h-5 text-primary" />
          <h3 className="text-base font-semibold text-foreground">Notifications</h3>
        </div>
        {["Email notifications", "Push notifications", "Task reminders", "Team updates"].map((label) => (
          <div key={label} className="flex items-center justify-between py-3 border-b border-border last:border-0">
            <span className="text-sm text-foreground">{label}</span>
            <button className="w-11 h-6 rounded-full bg-primary relative transition-colors">
              <div className="w-4 h-4 rounded-full bg-primary-foreground absolute right-1 top-1 transition-transform" />
            </button>
          </div>
        ))}
      </div>

      <div className="bg-card rounded-2xl p-6 shadow-card">
        <div className="flex items-center gap-3 mb-5">
          <Puzzle className="w-5 h-5 text-primary" />
          <h3 className="text-base font-semibold text-foreground">Integrations</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {["Slack", "GitHub", "Figma", "Notion"].map((name) => (
            <div key={name} className="bg-secondary rounded-xl p-4 flex items-center justify-between">
              <span className="text-sm font-medium text-foreground">{name}</span>
              <button className="text-xs font-semibold text-primary border border-primary/30 rounded-full px-3 py-1 hover:bg-primary/5 transition-colors">Connect</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
