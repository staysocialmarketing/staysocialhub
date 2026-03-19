
import { useState, useCallback, useRef, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ArrowLeft, Brain, Building2, Mic2, Users, ShoppingBag, FileText, FolderOpen, X, Plus, Upload, Link2, Save } from "lucide-react";
import CaptureTab from "@/components/brain/CaptureTab";
import InterviewTab from "@/components/brain/InterviewTab";
import { toast } from "sonner";

// Tag input component
function TagInput({ value = [], onChange, placeholder }: { value: string[]; onChange: (v: string[]) => void; placeholder?: string }) {
  const [input, setInput] = useState("");
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if ((e.key === "Enter" || e.key === ",") && input.trim()) {
      e.preventDefault();
      if (!value.includes(input.trim())) {
        onChange([...value, input.trim()]);
      }
      setInput("");
    }
    if (e.key === "Backspace" && !input && value.length) {
      onChange(value.slice(0, -1));
    }
  };
  return (
    <div className="flex flex-wrap gap-1.5 items-center border border-input rounded-md px-3 py-2 bg-background min-h-[40px]">
      {value.map((tag, i) => (
        <Badge key={i} variant="secondary" className="gap-1 text-xs">
          {tag}
          <button type="button" onClick={() => onChange(value.filter((_, j) => j !== i))} className="ml-0.5 hover:text-destructive">
            <X className="h-3 w-3" />
          </button>
        </Badge>
      ))}
      <input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={value.length === 0 ? placeholder : ""}
        className="flex-1 min-w-[120px] bg-transparent outline-none text-sm placeholder:text-muted-foreground"
      />
    </div>
  );
}

// Field label
function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{children}</label>;
}

type BrandTwinData = {
  brand_basics_json: Record<string, any>;
  brand_voice_json: Record<string, any>;
  audience_json: Record<string, any>;
  offers_json: Record<string, any>;
  content_rules_json: Record<string, any>;
  source_material_json: Record<string, any>;
};

const defaultData: BrandTwinData = {
  brand_basics_json: {},
  brand_voice_json: {},
  audience_json: {},
  offers_json: {},
  content_rules_json: {},
  source_material_json: { files: [], links: [], examples: [], notes: "" },
};

export default function ClientBrain() {
  const { clientId } = useParams<{ clientId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [data, setData] = useState<BrandTwinData>(defaultData);
  const [dirty, setDirty] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const { data: client } = useQuery({
    queryKey: ["client", clientId],
    queryFn: async () => {
      const { data } = await supabase.from("clients").select("id, name").eq("id", clientId!).single();
      return data;
    },
    enabled: !!clientId,
  });

  const { data: brandTwin, isLoading } = useQuery({
    queryKey: ["brand-twin", clientId],
    queryFn: async () => {
      const { data, error } = await supabase.from("brand_twin" as any).select("*").eq("client_id", clientId!).maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!clientId,
  });

  useEffect(() => {
    if (brandTwin) {
      setData({
        brand_basics_json: (brandTwin as any).brand_basics_json || {},
        brand_voice_json: (brandTwin as any).brand_voice_json || {},
        audience_json: (brandTwin as any).audience_json || {},
        offers_json: (brandTwin as any).offers_json || {},
        content_rules_json: (brandTwin as any).content_rules_json || {},
        source_material_json: (brandTwin as any).source_material_json || { files: [], links: [], examples: [], notes: "" },
      });
    }
  }, [brandTwin]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = { client_id: clientId, ...data };
      if (brandTwin) {
        const { error } = await supabase.from("brand_twin" as any).update(data).eq("client_id", clientId!);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("brand_twin" as any).insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["brand-twin", clientId] });
      setDirty(false);
      toast.success("Brand Twin saved");
    },
    onError: () => toast.error("Failed to save"),
  });

  const updateField = useCallback((section: keyof BrandTwinData, key: string, value: any) => {
    setData((prev) => ({
      ...prev,
      [section]: { ...prev[section], [key]: value },
    }));
    setDirty(true);
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length || !clientId) return;
    setUploading(true);
    try {
      const uploaded: { name: string; url: string }[] = [];
      for (const file of Array.from(files)) {
        if (file.size > 10 * 1024 * 1024) {
          toast.error(`${file.name} exceeds 10MB limit`);
          continue;
        }
        const path = `brain/${clientId}/${Date.now()}-${file.name}`;
        const { error } = await supabase.storage.from("creative-assets").upload(path, file);
        if (error) { toast.error(`Failed to upload ${file.name}`); continue; }
        const { data: urlData } = supabase.storage.from("creative-assets").getPublicUrl(path);
        uploaded.push({ name: file.name, url: urlData.publicUrl });
      }
      if (uploaded.length) {
        const currentFiles = data.source_material_json.files || [];
        updateField("source_material_json", "files", [...currentFiles, ...uploaded]);
      }
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const addLink = () => {
    const url = prompt("Enter URL");
    if (!url?.trim()) return;
    const currentLinks = data.source_material_json.links || [];
    updateField("source_material_json", "links", [...currentLinks, url.trim()]);
  };

  const addExample = () => {
    const desc = prompt("Enter description or URL for approved example");
    if (!desc?.trim()) return;
    const current = data.source_material_json.examples || [];
    updateField("source_material_json", "examples", [...current, desc.trim()]);
  };

  if (isLoading) {
    return <div className="p-6 flex items-center justify-center min-h-[400px]"><p className="text-muted-foreground">Loading…</p></div>;
  }

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/admin/clients")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-muted-foreground">{client?.name}</p>
          <h1 className="text-xl md:text-2xl font-bold text-foreground flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            Stay Social Brain
          </h1>
        </div>
        <Button onClick={() => saveMutation.mutate()} disabled={!dirty || saveMutation.isPending} className="gap-1.5">
          <Save className="h-4 w-4" />
          {saveMutation.isPending ? "Saving…" : "Save"}
        </Button>
      </div>

      <Tabs defaultValue="brand-twin" className="w-full">
        <TabsList className="w-full grid grid-cols-2">
          <TabsTrigger value="brand-twin">Brand Twin</TabsTrigger>
          <TabsTrigger value="capture">Capture</TabsTrigger>
        </TabsList>

        <TabsContent value="brand-twin" className="mt-4 space-y-3">
          <p className="text-sm text-muted-foreground">Brand Twin — Client Intelligence Profile</p>

          <Accordion type="multiple" defaultValue={["basics", "voice", "audience", "offers", "rules", "source"]} className="space-y-3">
            {/* 1. Brand Basics */}
            <AccordionItem value="basics" className="border rounded-lg px-4">
              <AccordionTrigger className="hover:no-underline">
                <span className="flex items-center gap-2 text-sm font-semibold"><Building2 className="h-4 w-4 text-primary" />Brand Basics</span>
              </AccordionTrigger>
              <AccordionContent>
                <div className="grid gap-4 md:grid-cols-2 pb-2">
                  {[
                    ["business_name", "Business Name"],
                    ["industry", "Industry"],
                    ["region", "Region / Market"],
                    ["website", "Website"],
                    ["primary_contact", "Primary Contact"],
                  ].map(([key, label]) => (
                    <div key={key} className="space-y-1.5">
                      <FieldLabel>{label}</FieldLabel>
                      <Input
                        value={data.brand_basics_json[key] || ""}
                        onChange={(e) => updateField("brand_basics_json", key, e.target.value)}
                        placeholder={label}
                      />
                    </div>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* 2. Brand Voice */}
            <AccordionItem value="voice" className="border rounded-lg px-4">
              <AccordionTrigger className="hover:no-underline">
                <span className="flex items-center gap-2 text-sm font-semibold"><Mic2 className="h-4 w-4 text-primary" />Brand Voice</span>
              </AccordionTrigger>
              <AccordionContent>
                <div className="grid gap-4 pb-2">
                  {[
                    ["tone", "Tone / Personality"],
                    ["writing_style", "Writing Style"],
                    ["messaging_style", "Messaging Style"],
                    ["cta_style", "CTA Style"],
                  ].map(([key, label]) => (
                    <div key={key} className="space-y-1.5">
                      <FieldLabel>{label}</FieldLabel>
                      <Input
                        value={data.brand_voice_json[key] || ""}
                        onChange={(e) => updateField("brand_voice_json", key, e.target.value)}
                        placeholder={label}
                      />
                    </div>
                  ))}
                  <div className="space-y-1.5">
                    <FieldLabel>Key Phrases to Use</FieldLabel>
                    <TagInput value={data.brand_voice_json.key_phrases || []} onChange={(v) => updateField("brand_voice_json", "key_phrases", v)} placeholder="Type phrase + Enter" />
                  </div>
                  <div className="space-y-1.5">
                    <FieldLabel>Phrases to Avoid</FieldLabel>
                    <TagInput value={data.brand_voice_json.avoid_phrases || []} onChange={(v) => updateField("brand_voice_json", "avoid_phrases", v)} placeholder="Type phrase + Enter" />
                  </div>
                  <div className="space-y-1.5">
                    <FieldLabel>Brand Positioning Summary</FieldLabel>
                    <Textarea
                      value={data.brand_voice_json.positioning || ""}
                      onChange={(e) => updateField("brand_voice_json", "positioning", e.target.value)}
                      placeholder="What does this brand stand for?"
                      rows={3}
                    />
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* 3. Audience */}
            <AccordionItem value="audience" className="border rounded-lg px-4">
              <AccordionTrigger className="hover:no-underline">
                <span className="flex items-center gap-2 text-sm font-semibold"><Users className="h-4 w-4 text-primary" />Audience</span>
              </AccordionTrigger>
              <AccordionContent>
                <div className="grid gap-4 md:grid-cols-2 pb-2">
                  <div className="space-y-1.5">
                    <FieldLabel>Primary Audience</FieldLabel>
                    <Input value={data.audience_json.primary || ""} onChange={(e) => updateField("audience_json", "primary", e.target.value)} placeholder="Who is the main audience?" />
                  </div>
                  <div className="space-y-1.5">
                    <FieldLabel>Secondary Audience</FieldLabel>
                    <Input value={data.audience_json.secondary || ""} onChange={(e) => updateField("audience_json", "secondary", e.target.value)} placeholder="Secondary audience" />
                  </div>
                </div>
                <div className="grid gap-4 mt-4 pb-2">
                  {[
                    ["pain_points", "Pain Points"],
                    ["objections", "Objections"],
                    ["desired_outcomes", "Desired Outcomes"],
                  ].map(([key, label]) => (
                    <div key={key} className="space-y-1.5">
                      <FieldLabel>{label}</FieldLabel>
                      <Textarea
                        value={data.audience_json[key] || ""}
                        onChange={(e) => updateField("audience_json", key, e.target.value)}
                        placeholder={label}
                        rows={2}
                      />
                    </div>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* 4. Offers */}
            <AccordionItem value="offers" className="border rounded-lg px-4">
              <AccordionTrigger className="hover:no-underline">
                <span className="flex items-center gap-2 text-sm font-semibold"><ShoppingBag className="h-4 w-4 text-primary" />Offers</span>
              </AccordionTrigger>
              <AccordionContent>
                <div className="grid gap-4 pb-2">
                  <div className="space-y-1.5">
                    <FieldLabel>Main Services</FieldLabel>
                    <TagInput value={data.offers_json.main_services || []} onChange={(v) => updateField("offers_json", "main_services", v)} placeholder="Add service + Enter" />
                  </div>
                  <div className="space-y-1.5">
                    <FieldLabel>Key Offers</FieldLabel>
                    <TagInput value={data.offers_json.key_offers || []} onChange={(v) => updateField("offers_json", "key_offers", v)} placeholder="Add offer + Enter" />
                  </div>
                  <div className="space-y-1.5">
                    <FieldLabel>Priority Services</FieldLabel>
                    <TagInput value={data.offers_json.priority_services || []} onChange={(v) => updateField("offers_json", "priority_services", v)} placeholder="Add priority service + Enter" />
                  </div>
                  <div className="space-y-1.5">
                    <FieldLabel>Seasonal Focus</FieldLabel>
                    <Textarea value={data.offers_json.seasonal_focus || ""} onChange={(e) => updateField("offers_json", "seasonal_focus", e.target.value)} placeholder="Current seasonal focus" rows={2} />
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* 5. Content Rules */}
            <AccordionItem value="rules" className="border rounded-lg px-4">
              <AccordionTrigger className="hover:no-underline">
                <span className="flex items-center gap-2 text-sm font-semibold"><FileText className="h-4 w-4 text-primary" />Content Rules</span>
              </AccordionTrigger>
              <AccordionContent>
                <div className="grid gap-4 pb-2">
                  <div className="space-y-1.5">
                    <FieldLabel>Platforms Used</FieldLabel>
                    <TagInput value={data.content_rules_json.platforms || []} onChange={(v) => updateField("content_rules_json", "platforms", v)} placeholder="e.g. Instagram, LinkedIn" />
                  </div>
                  <div className="space-y-1.5">
                    <FieldLabel>Preferred Content Types</FieldLabel>
                    <TagInput value={data.content_rules_json.content_types || []} onChange={(v) => updateField("content_rules_json", "content_types", v)} placeholder="e.g. Carousel, Reel" />
                  </div>
                  <div className="space-y-1.5">
                    <FieldLabel>Posting Goals</FieldLabel>
                    <Input value={data.content_rules_json.posting_goals || ""} onChange={(e) => updateField("content_rules_json", "posting_goals", e.target.value)} placeholder="e.g. 3x/week on Instagram" />
                  </div>
                  <div className="space-y-1.5">
                    <FieldLabel>Compliance / Restrictions</FieldLabel>
                    <Textarea value={data.content_rules_json.compliance || ""} onChange={(e) => updateField("content_rules_json", "compliance", e.target.value)} placeholder="Legal or compliance notes" rows={2} />
                  </div>
                  <div className="space-y-1.5">
                    <FieldLabel>Do / Don't Rules</FieldLabel>
                    <Textarea value={data.content_rules_json.do_dont || ""} onChange={(e) => updateField("content_rules_json", "do_dont", e.target.value)} placeholder="Always do… Never do…" rows={3} />
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* 6. Source Material */}
            <AccordionItem value="source" className="border rounded-lg px-4">
              <AccordionTrigger className="hover:no-underline">
                <span className="flex items-center gap-2 text-sm font-semibold"><FolderOpen className="h-4 w-4 text-primary" />Source Material</span>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-4 pb-2">
                  {/* Files */}
                  <div className="space-y-2">
                    <FieldLabel>Uploaded Files</FieldLabel>
                    <div className="flex flex-wrap gap-2">
                      {(data.source_material_json.files || []).map((f: any, i: number) => (
                        <Badge key={i} variant="outline" className="gap-1.5 text-xs py-1">
                          <a href={f.url} target="_blank" rel="noopener noreferrer" className="hover:underline">{f.name}</a>
                          <button onClick={() => {
                            const files = [...(data.source_material_json.files || [])];
                            files.splice(i, 1);
                            updateField("source_material_json", "files", files);
                          }}><X className="h-3 w-3 hover:text-destructive" /></button>
                        </Badge>
                      ))}
                    </div>
                    <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleFileUpload} />
                    <Button variant="outline" size="sm" className="text-xs gap-1" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                      <Upload className="h-3.5 w-3.5" />{uploading ? "Uploading…" : "Upload Files"}
                    </Button>
                  </div>

                  {/* Links */}
                  <div className="space-y-2">
                    <FieldLabel>Links</FieldLabel>
                    <div className="space-y-1">
                      {(data.source_material_json.links || []).map((link: string, i: number) => (
                        <div key={i} className="flex items-center gap-2 text-sm">
                          <Link2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          <a href={link} target="_blank" rel="noopener noreferrer" className="truncate text-primary hover:underline">{link}</a>
                          <button onClick={() => {
                            const links = [...(data.source_material_json.links || [])];
                            links.splice(i, 1);
                            updateField("source_material_json", "links", links);
                          }}><X className="h-3 w-3 hover:text-destructive" /></button>
                        </div>
                      ))}
                    </div>
                    <Button variant="outline" size="sm" className="text-xs gap-1" onClick={addLink}>
                      <Plus className="h-3.5 w-3.5" />Add Link
                    </Button>
                  </div>

                  {/* Approved Examples */}
                  <div className="space-y-2">
                    <FieldLabel>Approved Examples</FieldLabel>
                    <div className="space-y-1">
                      {(data.source_material_json.examples || []).map((ex: string, i: number) => (
                        <div key={i} className="flex items-center gap-2 text-sm">
                          <span className="truncate">{ex}</span>
                          <button onClick={() => {
                            const examples = [...(data.source_material_json.examples || [])];
                            examples.splice(i, 1);
                            updateField("source_material_json", "examples", examples);
                          }}><X className="h-3 w-3 hover:text-destructive" /></button>
                        </div>
                      ))}
                    </div>
                    <Button variant="outline" size="sm" className="text-xs gap-1" onClick={addExample}>
                      <Plus className="h-3.5 w-3.5" />Add Example
                    </Button>
                  </div>

                  {/* Internal Notes */}
                  <div className="space-y-1.5">
                    <FieldLabel>Internal Notes</FieldLabel>
                    <Textarea
                      value={data.source_material_json.notes || ""}
                      onChange={(e) => updateField("source_material_json", "notes", e.target.value)}
                      placeholder="Internal notes about this client's content…"
                      rows={4}
                    />
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </TabsContent>

        <TabsContent value="capture" className="mt-4">
          {clientId && <CaptureTab clientId={clientId} />}
        </TabsContent>
      </Tabs>
    </div>
  );
}
