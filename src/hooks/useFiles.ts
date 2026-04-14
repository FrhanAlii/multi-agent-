import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

export interface UserFile {
  id: string;
  file_name: string;
  file_type: string;
  file_size: number;
  file_url: string;
  file_path: string;
  uploaded_at: string;
  metadata: any;
}

export function useFiles() {
  const { user } = useAuth();
  const [files, setFiles] = useState<UserFile[]>([]);
  const [uploading, setUploading] = useState(false);

  const fetchFiles = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("user_files")
      .select("*")
      .eq("user_id", user.id)
      .order("uploaded_at", { ascending: false });
    if (data) setFiles(data as UserFile[]);
  }, [user]);

  useEffect(() => { fetchFiles(); }, [fetchFiles]);

  const uploadFile = useCallback(async (file: File) => {
    if (!user) return;
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "txt";
      const path = `${user.id}/${Date.now()}_${file.name}`;

      const { error: uploadError } = await supabase.storage
        .from("user-files")
        .upload(path, file);
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from("user-files").getPublicUrl(path);

      const { error: dbError } = await supabase.from("user_files").insert({
        user_id: user.id,
        file_name: file.name,
        file_type: ext,
        file_size: file.size,
        file_path: path,
        file_url: urlData.publicUrl,
        metadata: { contentType: file.type },
      });
      if (dbError) throw dbError;

      toast({ title: "File uploaded", description: file.name });
      await fetchFiles();
    } catch (e: any) {
      toast({ title: "Upload failed", description: e.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  }, [user, fetchFiles]);

  const deleteFile = useCallback(async (fileId: string, filePath: string) => {
    if (!user) return;
    try {
      await supabase.storage.from("user-files").remove([filePath]);
      await supabase.from("user_files").delete().eq("id", fileId);
      toast({ title: "File deleted" });
      await fetchFiles();
    } catch (e: any) {
      toast({ title: "Delete failed", description: e.message, variant: "destructive" });
    }
  }, [user, fetchFiles]);

  return { files, uploading, uploadFile, deleteFile, fetchFiles };
}
