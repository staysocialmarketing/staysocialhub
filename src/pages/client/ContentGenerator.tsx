import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Sparkles, Copy, Check, BookmarkPlus, Send, Loader2, History, Trash2, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import ClientSelectWithCreate from "@/components/ClientSelectWithCreate";
import ReactMarkdown from "react-markdown";
import { cn } from "@/lib/utils";

const CONTENT_TYPES = [
  { value: "caption", label: "Social Caption", desc: "Instagram, Facebook, LinkedIn" },
  { value: "email", label: "Email Copy", desc: "Marketing emails" },
  { value: "blog_intro", label: "Blog Intro", desc: "Opening paragraph" },
  { value: "ad_copy", label: "Ad Copy", desc: "Short advertising text" },
  { value: "hook", label: "Hooks", desc: "Attention-grabbing openers" },
  { value: "hashtags", label: "Hashtags", desc: "Relevant hashtag sets" },
  { value: "story_ideas", label: "Story Ideas", desc: "Instagram/TikTok stories" },
];

const TONE_OPTIONS = [
  { value: "", label: "Use brand voice" },
  { value: "professional", label: "Professional" },
  { value: "casual", label: "Casual & Friendly" },
  { value: "witty", label: "Witty & Playful" },
  { value: "bold", label: "Bold & Confident" },
  { value: "empathetic", label: "Warm & Empathetic" },
  { value: "educational", label: "Educational" },
  { value: "urgent", label: "Urgent / FOMO" },
];

export default function ContentGenerator() {
  const { profile, isSSRole } = useAuth();
  const queryClient = useQueryClient();

  const [contentType, setContentType] = useState("caption");
  const [topic, setTopic] = useState("");
  const [tone, setTone] = useState("");
  const [clientId, setClientId] = useState(profile?.client_id || "");
  const [output, setOutput] = useState("");
  const [copied, setCopied] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);

  // Fetch history
  const effectiveClientId = isSSRole ? clientId : profile?.client_id;
  const { data: history } = useQuery({
    queryKey: ["generated-content", effectiveClientId],
    queryFn: async () => {
      if (!effectiveClientId) return [];
      const { data, error } = await supabase
        .from("generated_content")
        .select("id, content_type, prompt, output, created_at")
        .eq("client_id", effectiveClientId)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data || [];
    },
    enabled: !!effectiveClientId,
  });

  // Generate mutation
  const generate = useMutation({
    mutationFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-content`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            content_type: contentType,
            topic: topic.trim() || undefined,
            tone_override: tone || undefined,
            client_id: isSSRole ? clientId : undefined,
          }),
        }
      );

      if (!resp.ok) {
        const errData = await resp.json().catch(() => ({}));
        throw new Error(errData.error || "Generation failed");
      }

      return resp.json();
    },
    onSuccess: (data) => {
      setOutput(data.output || "");
      queryClient.invalidateQueries({ queryKey: ["generated-content"] });
      toast.success("Content generated!");
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  // Save to captures
  const saveCapture = useMutation({
    mutationFn: async () => {
      if (!output || !effectiveClientId) return;
      const { error } = await supabase.from("brain_captures").insert({
        client_id: effectiveClientId,
        created_by_user_id: profile!.id,
        content: output,
        type: "note",
        notes: `Generated ${contentType}${topic ? ` about: ${topic}` : ""}`,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Saved to Brain captures!");
      queryClient.invalidateQueries({ queryKey: ["brain-captures"] });
    },
    onError: () => toast.error("Failed to save"),
  });

  const handleCopy = async () => {
    await navigator.clipboard.writeText(output);
    setCopied(true);
    toast.success("Copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  const loadFromHistory = (item: any) => {
    setOutput(item.output);
    setContentType(item.content_type);
    setTopic(item.prompt === "(auto-generated)" ? "" : item.prompt);
    setHistoryOpen(false);
  };

  const canGenerate = isSSRole ? !!clientId : !!profile?.client_id;

  return (
    <div className="p-4 md:p-6 space-y-5 max-w-3xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          Content Generator
        </h1>
        <p className="text-sm text-muted-foreground">
          AI-powered content creation tailored to your brand.
        </p>
      </div>

      {/* Input Form */}
      <Card>
        <CardContent className="p-4 space-y-4">
          {/* Client picker for SS */}
          {isSSRole && (
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Client</Label>
              <ClientSelectWithCreate value={clientId} onChange={setClientId} />
            </div>
          )}

          {/* Content type */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Content Type</Label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {CONTENT_TYPES.map((ct) => (
                <button
                  key={ct.value}
                  onClick={() => setContentType(ct.value)}
                  className={cn(
                    "rounded-xl border px-3 py-2 text-left transition-all text-xs",
                    contentType === ct.value
                      ? "border-primary bg-primary/5 text-primary"
                      : "border-border hover:border-primary/40"
                  )}
                >
                  <div className="font-medium">{ct.label}</div>
                  <div className="text-muted-foreground text-[10px]">{ct.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Topic */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Topic / Prompt <span className="text-muted-foreground">(optional)</span></Label>
            <Input
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g. New spring collection launch, client testimonials..."
              className="text-sm"
            />
          </div>

          {/* Tone */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Tone</Label>
            <Select value={tone} onValueChange={setTone}>
              <SelectTrigger className="text-sm">
                <SelectValue placeholder="Use brand voice" />
              </SelectTrigger>
              <SelectContent>
                {TONE_OPTIONS.map((t) => (
                  <SelectItem key={t.value} value={t.value || "brand"}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Generate button */}
          <Button
            onClick={() => generate.mutate()}
            disabled={generate.isPending || !canGenerate}
            className="w-full rounded-xl"
          >
            {generate.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Generate Content
              </>
            )}
          </Button>

          {!canGenerate && isSSRole && (
            <p className="text-xs text-muted-foreground text-center">Select a client to generate content</p>
          )}
        </CardContent>
      </Card>

      {/* Output */}
      {output && (
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <Badge variant="secondary" className="text-xs">
                {CONTENT_TYPES.find(c => c.value === contentType)?.label || contentType}
              </Badge>
              <div className="flex gap-1.5">
                <Button variant="ghost" size="sm" onClick={handleCopy} className="h-8 px-2 text-xs">
                  {copied ? <Check className="h-3.5 w-3.5 mr-1" /> : <Copy className="h-3.5 w-3.5 mr-1" />}
                  {copied ? "Copied" : "Copy"}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => saveCapture.mutate()}
                  disabled={saveCapture.isPending}
                  className="h-8 px-2 text-xs"
                >
                  <BookmarkPlus className="h-3.5 w-3.5 mr-1" />
                  Save to Brain
                </Button>
              </div>
            </div>
            <div className="prose prose-sm dark:prose-invert max-w-none rounded-xl bg-muted/30 p-4 text-sm">
              <ReactMarkdown>{output}</ReactMarkdown>
            </div>
          </CardContent>
        </Card>
      )}

      {/* History */}
      {history && history.length > 0 && (
        <Collapsible open={historyOpen} onOpenChange={setHistoryOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="w-full justify-between text-sm text-muted-foreground">
              <span className="flex items-center gap-2">
                <History className="h-4 w-4" />
                Recent Generations ({history.length})
              </span>
              <ChevronDown className={cn("h-4 w-4 transition-transform", historyOpen && "rotate-180")} />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <ScrollArea className="max-h-64">
              <div className="space-y-2 pt-2">
                {history.map((item: any) => (
                  <button
                    key={item.id}
                    onClick={() => loadFromHistory(item)}
                    className="w-full text-left rounded-xl border p-3 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                        {CONTENT_TYPES.find(c => c.value === item.content_type)?.label || item.content_type}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(item.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {item.output.slice(0, 120)}...
                    </p>
                  </button>
                ))}
              </div>
            </ScrollArea>
          </CollapsibleContent>
        </Collapsible>
      )}
    </div>
  );
}
