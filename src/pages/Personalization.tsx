import { useState } from "react";
import { usePersonalization, type PersonalizationSettings } from "@/hooks/usePersonalization";
import { Loader2, RotateCcw, Save } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-6">
      <h3 className="text-sm font-semibold text-foreground mb-3">{title}</h3>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function SelectField({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  return (
    <div>
      <label className="text-xs text-muted mb-1 block">{label}</label>
      <select value={value} onChange={e => onChange(e.target.value)} className="w-full bg-secondary rounded-lg px-3 py-2 text-sm text-foreground border-none outline-none focus:ring-2 focus:ring-primary/20">
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-foreground/80">{label}</span>
      <button
        onClick={() => onChange(!checked)}
        className={`w-9 h-5 rounded-full transition-colors relative ${checked ? "bg-primary" : "bg-border"}`}
      >
        <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${checked ? "left-4" : "left-0.5"}`} />
      </button>
    </div>
  );
}

function InputField({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div>
      <label className="text-xs text-muted mb-1 block">{label}</label>
      <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className="w-full bg-secondary rounded-lg px-3 py-2 text-sm text-foreground border-none outline-none focus:ring-2 focus:ring-primary/20" />
    </div>
  );
}

export default function Personalization() {
  const { settings, setSettings, loading, saving, save, reset, defaults } = usePersonalization();

  const update = (key: keyof PersonalizationSettings, value: any) => {
    setSettings({ ...settings, [key]: value });
  };

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;

  return (
    <div className="max-w-[800px] mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Personalization</h1>
          <p className="text-sm text-muted mt-1">Customize your AI assistant experience</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => { reset(); }} className="flex items-center gap-2 px-4 py-2 text-sm bg-secondary dark:bg-white/[0.08] rounded-xl hover:bg-secondary/80 dark:hover:bg-white/[0.14] glass-subtle transition-colors text-foreground">
            <RotateCcw className="w-4 h-4" /> Reset
          </button>
          <button onClick={() => save(settings)} disabled={saving} className="flex items-center gap-2 px-4 py-2 text-sm bg-primary text-primary-foreground rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-card rounded-xl border border-border glass p-5">
          <Section title="👤 User Profile">
            <InputField label="Full Name" value={settings.user_name} onChange={v => update("user_name", v)} placeholder="Your name" />
            <InputField label="Role / Position" value={settings.user_role} onChange={v => update("user_role", v)} placeholder="e.g. Product Manager" />
            <InputField label="Department" value={settings.user_department} onChange={v => update("user_department", v)} placeholder="e.g. Engineering" />
            <InputField label="Goals / Focus Areas" value={settings.user_goals} onChange={v => update("user_goals", v)} placeholder="What you want to achieve" />
          </Section>
          <Section title="🎨 Chatbot Personality">
            <SelectField label="Response Style" value={settings.response_style} onChange={v => update("response_style", v)} options={[
              { value: "professional", label: "Professional" }, { value: "casual", label: "Casual" },
              { value: "friendly", label: "Friendly" }, { value: "technical", label: "Technical" }, { value: "creative", label: "Creative" },
            ]} />
            <SelectField label="Tone" value={settings.tone} onChange={v => update("tone", v)} options={[
              { value: "formal", label: "Formal" }, { value: "informal", label: "Informal" }, { value: "balanced", label: "Balanced" },
            ]} />
            <SelectField label="Detail Level" value={settings.detail_level} onChange={v => update("detail_level", v)} options={[
              { value: "brief", label: "Brief" }, { value: "moderate", label: "Moderate" }, { value: "detailed", label: "Detailed" },
            ]} />
          </Section>
        </div>

        <div className="bg-card rounded-xl border border-border glass p-5">
          <Section title="📚 Knowledge Preferences">
            <InputField label="Industry / Domain" value={settings.domain} onChange={v => update("domain", v)} placeholder="e.g. Finance, Marketing" />
            <InputField label="Preferred Language" value={settings.preferred_language} onChange={v => update("preferred_language", v)} />
          </Section>
          <Section title="📤 Output Preferences">
            <SelectField label="Response Format" value={settings.response_format} onChange={v => update("response_format", v)} options={[
              { value: "text", label: "Text" }, { value: "structured", label: "Structured" }, { value: "with_examples", label: "With Examples" },
            ]} />
            <Toggle label="Include code examples" checked={settings.include_code_examples} onChange={v => update("include_code_examples", v)} />
            <Toggle label="Include visualizations" checked={settings.include_visualizations} onChange={v => update("include_visualizations", v)} />
            <SelectField label="Summary Mode" value={settings.summary_mode} onChange={v => update("summary_mode", v)} options={[
              { value: "always", label: "Always" }, { value: "never", label: "Never" }, { value: "when_complex", label: "When Complex" },
            ]} />
          </Section>
          <Section title="🤖 Agent Behavior">
            <SelectField label="Show Thinking Steps" value={settings.show_thinking_steps} onChange={v => update("show_thinking_steps", v)} options={[
              { value: "always", label: "Always" }, { value: "never", label: "Never" }, { value: "when_complex", label: "When Complex" },
            ]} />
            <Toggle label="Tool transparency" checked={settings.tool_transparency} onChange={v => update("tool_transparency", v)} />
            <Toggle label="Email generation" checked={settings.enable_email_generation} onChange={v => update("enable_email_generation", v)} />
            <Toggle label="CSV analysis" checked={settings.enable_csv_analysis} onChange={v => update("enable_csv_analysis", v)} />
            <Toggle label="PDF search" checked={settings.enable_pdf_search} onChange={v => update("enable_pdf_search", v)} />
          </Section>
        </div>

        <div className="bg-card rounded-xl border border-border glass p-5 md:col-span-2">
          <Section title="✍️ Custom Instructions">
            <textarea
              value={settings.custom_instructions}
              onChange={e => update("custom_instructions", e.target.value)}
              placeholder="Add custom instructions for the AI assistant..."
              rows={4}
              className="w-full bg-secondary rounded-lg px-3 py-2 text-sm text-foreground border-none outline-none focus:ring-2 focus:ring-primary/20 resize-none"
            />
          </Section>
          <Section title="🖥️ Display Settings">
            <div className="grid grid-cols-3 gap-3">
              <SelectField label="Theme" value={settings.theme} onChange={v => update("theme", v)} options={[
                { value: "light", label: "Light" }, { value: "dark", label: "Dark" }, { value: "auto", label: "Auto" },
              ]} />
              <SelectField label="Font Size" value={settings.font_size} onChange={v => update("font_size", v)} options={[
                { value: "small", label: "Small" }, { value: "normal", label: "Normal" }, { value: "large", label: "Large" },
              ]} />
              <SelectField label="Message Density" value={settings.message_density} onChange={v => update("message_density", v)} options={[
                { value: "compact", label: "Compact" }, { value: "normal", label: "Normal" }, { value: "spacious", label: "Spacious" },
              ]} />
            </div>
          </Section>
        </div>
      </div>
    </div>
  );
}
