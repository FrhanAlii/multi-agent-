import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

export interface PersonalizationSettings {
  response_style: string;
  tone: string;
  detail_level: string;
  domain: string;
  preferred_language: string;
  time_zone: string;
  response_format: string;
  include_code_examples: boolean;
  include_visualizations: boolean;
  summary_mode: string;
  show_thinking_steps: string;
  tool_transparency: boolean;
  max_tokens: number;
  enable_email_generation: boolean;
  enable_sql_queries: boolean;
  enable_csv_analysis: boolean;
  enable_pdf_search: boolean;
  custom_instructions: string;
  theme: string;
  font_size: string;
  message_density: string;
  sidebar_position: string;
  user_name: string;
  user_role: string;
  user_department: string;
  user_goals: string;
}

const defaults: PersonalizationSettings = {
  response_style: "professional",
  tone: "balanced",
  detail_level: "moderate",
  domain: "",
  preferred_language: "English",
  time_zone: "UTC",
  response_format: "text",
  include_code_examples: true,
  include_visualizations: true,
  summary_mode: "when_complex",
  show_thinking_steps: "always",
  tool_transparency: true,
  max_tokens: 4096,
  enable_email_generation: true,
  enable_sql_queries: true,
  enable_csv_analysis: true,
  enable_pdf_search: true,
  custom_instructions: "",
  theme: "light",
  font_size: "normal",
  message_density: "normal",
  sidebar_position: "left",
  user_name: "",
  user_role: "",
  user_department: "",
  user_goals: "",
};

export function usePersonalization() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<PersonalizationSettings>(defaults);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("personalization_settings")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      if (data) {
        const { id, user_id, updated_at, ...rest } = data;
        setSettings({ ...defaults, ...rest });
      }
      setLoading(false);
    })();
  }, [user]);

  const save = useCallback(async (newSettings: PersonalizationSettings) => {
    if (!user) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("personalization_settings")
        .upsert({ user_id: user.id, ...newSettings }, { onConflict: "user_id" });
      if (error) throw error;
      setSettings(newSettings);
      toast({ title: "Settings saved" });
    } catch (e: any) {
      toast({ title: "Error saving", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }, [user]);

  const reset = useCallback(() => { setSettings(defaults); }, []);

  return { settings, setSettings, loading, saving, save, reset, defaults };
}
