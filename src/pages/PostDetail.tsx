import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  ArrowLeft, ChevronLeft, ChevronRight, Calendar, Hash, MessageSquare, Image as ImageIcon,
  Check, FileEdit, AlertTriangle, Save, Upload, Sparkles, X, Trash2,
} from "lucide-react";
import type { Database } from "@/integrations/supabase/types";
import { compressImage } from "@/lib/imageUtils";
import { cn } from "@/lib/utils";
import { PlatformBadge } from "@/components/PlatformBadge";
import ApprovalActions from "@/components/ApprovalActions";
import ImageLightbox from "@/components/ImageLightbox";

type ApprovalType = Database["public"]["Enums"]["approval_type"];
type PostImage = Database["public"]["Tables"]["post_images"]["Row"];

const PLATFORM_LABELS: Record<string, string> = {
  instagram: "Instagram",
  facebook: "Facebook",
  linkedin: "LinkedIn",
  google: "Google",
  email: "Email",
  tiktok: "TikTok",
};


export default function PostDetail() {
  const { postId } = useParams<{ postId: string }>();
  const navigate = useNavigate();
  const { profile, isSSRole, isSSAdmin, isClientAdmin, isClientAssistant } = useAuth();
  const queryClient = useQueryClient();

  const [commentText, setCommentText] = useState("");
  const [internalNotes, setInternalNotes] = useState<string | null>(null);
  const [approvalDialog, setApprovalDialog] = useState<ApprovalType | null>(null);
  const [activePlatformTabState, setActivePlatformTab] = useState("");
  const [approvalNote, setApprovalNote] = useState("");
  const [lightboxVersion, setLightboxVersion] = useState<any>(null);
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [designCompleteDialog, setDesignCompleteDialog] = useState(false);

  // Fetch post
  const { data: post, isLoading } = useQuery({
    queryKey: ["post-detail", postId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("posts")
        .select("*, clients(name, assistants_can_approve)")
        .eq("id", postId!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!postId,
  });

  // Fetch versions
  const { data: versions = [] } = useQuery({
    queryKey: ["post-versions", postId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("post_versions")
        .select("*, users:created_by_user_id(name)")
        .eq("post_id", postId!)
        .order("version_number", { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!postId,
  });

  // Fetch comments
  const { data: comments = [] } = useQuery({
    queryKey: ["post-comments", postId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("comments")
        .select("*, users:user_id(name, email)")
        .eq("post_id", postId!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!postId,
  });

  // Fetch approvals
  const { data: approvals = [] } = useQuery({
    queryKey: ["post-approvals", postId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("approvals")
        .select("*, users:user_id(name, email)")
        .eq("post_id", postId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!postId,
  });

  // Fetch post images
  const { data: postImages = [] } = useQuery({
    queryKey: ["post-images", postId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("post_images")
        .select("id, post_id, storage_path, url, platform, position, alt_text, created_at")
        .eq("post_id", postId!)
        .order("position", { ascending: true });
      if (error) throw error;
      return (data || []) as PostImage[];
    },
    enabled: !!postId,
  });

  // Add comment
  const addComment = useMutation({
    mutationFn: async () => {
      if (!profile) throw new Error("Not logged in");
      const { error } = await supabase.from("comments").insert({
        post_id: postId!,
        user_id: profile.id,
        body: commentText,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["post-comments", postId] });
      setCommentText("");
      toast.success("Comment added");
    },
    onError: () => toast.error("Failed to add comment"),
  });

  // Save internal notes
  const saveNotes = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("posts")
        .update({ internal_notes: internalNotes } as any)
        .eq("id", postId!);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["post-detail", postId] });
      toast.success("Internal notes saved");
    },
    onError: () => toast.error("Failed to save notes"),
  });

  // Submit approval
  const submitApproval = useMutation({
    mutationFn: async () => {
      if (!profile || !approvalDialog) throw new Error("Missing data");
      const { error: approvalError } = await supabase.from("approvals").insert({
        post_id: postId!,
        user_id: profile.id,
        type: approvalDialog,
        note: approvalNote || null,
      });
      if (approvalError) throw approvalError;

      const newStatus = approvalDialog === "request_changes" ? "request_changes" : "approved";
      const { error: updateError } = await supabase
        .from("posts")
        .update({ status_column: newStatus })
        .eq("id", postId!);
      if (updateError) throw updateError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["post-detail", postId] });
      queryClient.invalidateQueries({ queryKey: ["post-approvals", postId] });
      queryClient.invalidateQueries({ queryKey: ["posts"] });
      setApprovalDialog(null);
      setApprovalNote("");
      toast.success(
        approvalDialog === "request_changes"
          ? "Changes requested"
          : "Post approved!"
      );
    },
    onError: () => toast.error("Failed to submit approval"),
  });

  // Mark design complete → send to Corey for review
  const COREY_USER_ID = "6cd3d0da-0cbc-4bd5-b428-9f997218f5c2";
  const markDesignComplete = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("posts")
        .update({
          status_column: "corey_review" as any,
          reviewer_user_id: COREY_USER_ID,
        })
        .eq("id", postId!);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["post-detail", postId] });
      queryClient.invalidateQueries({ queryKey: ["posts"] });
      setDesignCompleteDialog(false);
      toast.success("Sent to Corey for review!");
    },
    onError: () => toast.error("Failed to update post status"),
  });

  // Delete post
  const deletePost = useMutation({
    mutationFn: async () => {
      if (post?.status_column === "published" || post?.status_column === "sent") {
        throw new Error("Cannot delete a published or sent post.");
      }
      // Remove all images from storage and post_images table
      for (const img of postImages) {
        await supabase.storage.from("creative-assets").remove([img.storage_path]);
        await supabase.from("post_images").delete().eq("id", img.id);
      }
      const { error } = await supabase.from("posts").delete().eq("id", postId!);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Post deleted");
      navigate("/approvals");
    },
    onError: (e: Error) => toast.error(e.message || "Failed to delete post"),
  });

  // Upload new version
  const [uploadingImage, setUploadingImage] = useState(false);
  const [deletingImageId, setDeletingImageId] = useState<string | null>(null);
  const [activeImageIdx, setActiveImageIdx] = useState(0);
  const [swipeStartX, setSwipeStartX] = useState(0);
  const [uploadingVersion, setUploadingVersion] = useState(false);

  // Upload images to post_images table
  const uploadImages = async (files: FileList) => {
    if (!profile || !postId) return;
    setUploadingImage(true);
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const compressed = await compressImage(file);
        const ext = compressed.name.split(".").pop();
        const fileName = `${crypto.randomUUID()}.${ext}`;
        const storagePath = `post-images/${postId}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from("creative-assets")
          .upload(storagePath, compressed);
        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from("creative-assets")
          .getPublicUrl(storagePath);

        const nextPosition = postImages.length + i;

        const { error: insertError } = await supabase
          .from("post_images")
          .insert({
            post_id: postId,
            storage_path: storagePath,
            url: urlData.publicUrl,
            position: nextPosition,
            created_by_user_id: profile.id,
          });
        if (insertError) throw insertError;

        // Dual-write: keep creative_url pointing to the first (primary) image
        if (nextPosition === 0) {
          await supabase.from("posts")
            .update({ creative_url: urlData.publicUrl })
            .eq("id", postId);
        }
      }
      queryClient.invalidateQueries({ queryKey: ["post-images", postId] });
      queryClient.invalidateQueries({ queryKey: ["post-detail", postId] });
      toast.success(files.length > 1 ? `${files.length} images uploaded` : "Image uploaded");
    } catch {
      toast.error("Failed to upload image");
    } finally {
      setUploadingImage(false);
    }
  };

  // Delete an image from post_images
  const deleteImage = async (img: Pick<PostImage, "id" | "storage_path" | "url">) => {
    setDeletingImageId(img.id);
    try {
      await supabase.storage.from("creative-assets").remove([img.storage_path]);

      const { error } = await supabase
        .from("post_images")
        .delete()
        .eq("id", img.id);
      if (error) throw error;

      // Dual-write: if this was the primary image, update creative_url to next or null
      if (post?.creative_url === img.url) {
        const remaining = postImages.filter(i => i.id !== img.id);
        const nextUrl = remaining.length > 0 ? remaining[0].url : null;
        await supabase.from("posts")
          .update({ creative_url: nextUrl })
          .eq("id", postId!);
      }

      queryClient.invalidateQueries({ queryKey: ["post-images", postId] });
      queryClient.invalidateQueries({ queryKey: ["post-detail", postId] });
      toast.success("Image removed");
    } catch {
      toast.error("Failed to remove image");
    } finally {
      setDeletingImageId(null);
    }
  };

  const uploadNewVersion = async (file: File, caption?: string, hashtags?: string) => {
    if (!profile || !postId) return;
    setUploadingVersion(true);
    try {
      const compressed = await compressImage(file);
      const ext = compressed.name.split(".").pop();
      const path = `${postId}/v${versions.length + 1}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("creative-assets")
        .upload(path, compressed);
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("creative-assets")
        .getPublicUrl(path);

      const { error: versionError } = await supabase.from("post_versions").insert({
        post_id: postId,
        version_number: versions.length + 1,
        creative_url: urlData.publicUrl,
        caption: caption || null,
        hashtags: hashtags || null,
        created_by_user_id: profile.id,
      });
      if (versionError) throw versionError;

      // Update post with latest version data
      await supabase.from("posts").update({
        creative_url: urlData.publicUrl,
        ...(caption ? { caption } : {}),
        ...(hashtags ? { hashtags } : {}),
      }).eq("id", postId);

      queryClient.invalidateQueries({ queryKey: ["post-versions", postId] });
      queryClient.invalidateQueries({ queryKey: ["post-detail", postId] });
      toast.success(`Version ${versions.length + 1} uploaded`);
    } catch {
      toast.error("Failed to upload version");
    } finally {
      setUploadingVersion(false);
    }
  };

  if (isLoading) {
    return <div className="p-6"><p className="text-muted-foreground">Loading post...</p></div>;
  }

  if (!post) {
    return <div className="p-6"><p className="text-muted-foreground">Post not found.</p></div>;
  }

  const latestApproval = approvals[0];
  const canApprove = isClientAdmin || (isClientAssistant && (post as any).clients?.assistants_can_approve);
  const isApprovalStatus = post.status_column === "client_approval";

  const platformContent = (post as any).platform_content as Record<string, any> | null;
  const platformTabs = platformContent && Object.keys(platformContent).length > 0
    ? Object.keys(platformContent)
    : [];
  const effectiveTab = activePlatformTabState && platformTabs.includes(activePlatformTabState)
    ? activePlatformTabState
    : platformTabs[0] ?? "";

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/approvals")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1 min-w-0">
          <h2 className="text-2xl font-bold text-foreground truncate">{post.title}</h2>
          <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
            <span className="text-sm text-muted-foreground">{(post as any).clients?.name}</span>
            {post.platform ? (
              post.platform.split(",").map((p: string) => (
                <PlatformBadge key={p} platform={p.trim()} />
              ))
            ) : (
              <span className="text-sm text-muted-foreground">No platform</span>
            )}
          </div>
        </div>
        {isSSAdmin && (
          <Button
            variant="outline"
            size="sm"
            className="border-destructive text-destructive hover:bg-destructive/10"
            onClick={() => setDeleteDialog(true)}
          >
            <Trash2 className="h-4 w-4 mr-1.5" />
            Delete
          </Button>
        )}
        {latestApproval && (
          <Badge
            className={
              latestApproval.type === "approve"
                ? "bg-green-100 text-green-800"
                : latestApproval.type === "approve_with_notes"
                ? "bg-blue-100 text-blue-800"
                : "bg-orange-100 text-orange-800"
            }
          >
            {latestApproval.type === "approve"
              ? "Approved"
              : latestApproval.type === "approve_with_notes"
              ? "Approved w/ Notes"
              : "Changes Requested"}
          </Badge>
        )}
      </div>

      {((isSSAdmin && post.status_column === "corey_review") ||
        ((isClientAdmin || isClientAssistant) && post.status_column === "client_approval")) && (
        <ApprovalActions
          postId={post.id}
          postTitle={post.title}
          currentStatus={post.status_column}
          contentType={post.content_type}
        />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Creative — multi-image manager */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base">Creative</CardTitle>
              {isSSRole && (
                <label className="cursor-pointer">
                  <input
                    type="file"
                    className="hidden"
                    accept="image/*,video/*"
                    multiple
                    disabled={uploadingImage}
                    onChange={(e) => {
                      if (e.target.files?.length) uploadImages(e.target.files);
                      e.target.value = "";
                    }}
                  />
                  <Button variant="outline" size="sm" asChild disabled={uploadingImage}>
                    <span>
                      <Upload className="h-3 w-3 mr-1" />
                      {uploadingImage ? "Uploading..." : "Add Image"}
                    </span>
                  </Button>
                </label>
              )}
            </CardHeader>
            <CardContent className="p-4 pt-0">
              {postImages.length > 0 ? (
                isSSRole ? (
                  /* SS: editable grid with delete controls */
                  <div className={cn(
                    "gap-2",
                    postImages.length === 1 ? "flex" : "grid grid-cols-2"
                  )}>
                    {postImages.map((img, idx) => (
                      <div key={img.id} className="relative group">
                        <img
                          src={img.url}
                          alt={img.alt_text ?? ""}
                          className={cn(
                            "rounded-lg object-cover w-full",
                            postImages.length === 1 ? "max-h-[500px] object-contain" : "aspect-square"
                          )}
                        />
                        <button
                          type="button"
                          onClick={() => deleteImage(img)}
                          disabled={deletingImageId === img.id}
                          className="absolute top-1.5 right-1.5 h-6 w-6 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-50"
                        >
                          <X className="h-3 w-3" />
                        </button>
                        {idx === 0 && postImages.length > 1 && (
                          <span className="absolute bottom-1.5 left-1.5 text-[10px] bg-black/60 text-white px-1.5 py-0.5 rounded">
                            Primary
                          </span>
                        )}
                        {img.platform && (
                          <span className="absolute top-1.5 left-1.5 text-[10px] bg-black/60 text-white px-1.5 py-0.5 rounded capitalize">
                            {img.platform}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  /* Client: swipeable gallery */
                  <div
                    className="relative select-none"
                    onTouchStart={(e) => setSwipeStartX(e.touches[0].clientX)}
                    onTouchEnd={(e) => {
                      const delta = swipeStartX - e.changedTouches[0].clientX;
                      if (delta > 50) setActiveImageIdx(i => Math.min(postImages.length - 1, i + 1));
                      if (delta < -50) setActiveImageIdx(i => Math.max(0, i - 1));
                    }}
                  >
                    <img
                      src={postImages[Math.min(activeImageIdx, postImages.length - 1)]?.url}
                      alt={postImages[Math.min(activeImageIdx, postImages.length - 1)]?.alt_text ?? ""}
                      className="w-full rounded-lg object-contain max-h-[500px]"
                    />
                    {postImages.length > 1 && (
                      <>
                        <button
                          type="button"
                          onClick={() => setActiveImageIdx(i => Math.max(0, i - 1))}
                          disabled={activeImageIdx === 0}
                          className="absolute left-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-black/50 text-white flex items-center justify-center transition-opacity disabled:opacity-20 hover:bg-black/70"
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setActiveImageIdx(i => Math.min(postImages.length - 1, i + 1))}
                          disabled={activeImageIdx === postImages.length - 1}
                          className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-black/50 text-white flex items-center justify-center transition-opacity disabled:opacity-20 hover:bg-black/70"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </button>
                        <span className="absolute top-2 right-2 text-xs bg-black/60 text-white px-2 py-0.5 rounded-full">
                          {activeImageIdx + 1} / {postImages.length}
                        </span>
                        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                          {postImages.map((_, i) => (
                            <button
                              key={i}
                              type="button"
                              onClick={() => setActiveImageIdx(i)}
                              className={cn(
                                "h-1.5 rounded-full transition-all",
                                i === activeImageIdx ? "w-4 bg-white" : "w-1.5 bg-white/50 hover:bg-white/80"
                              )}
                            />
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                )
              ) : post.creative_url ? (
                /* Legacy single image — not yet in post_images */
                <img src={post.creative_url} alt="" className="w-full rounded-lg object-contain max-h-[500px]" />
              ) : (
                <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
                  <ImageIcon className="h-12 w-12 text-muted-foreground/30" />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Caption & Hashtags */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Caption</CardTitle>
              {isSSRole && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate(`/client/generate?post_id=${postId}`)}
                >
                  <Sparkles className="h-3 w-3 mr-1" />
                  Generate with AI
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {platformTabs.length > 0 ? (
                <div className="space-y-3">
                  {/* Platform tab pills */}
                  <div className="flex flex-wrap gap-1.5">
                    {platformTabs.map(tabKey => (
                      <button
                        key={tabKey}
                        type="button"
                        onClick={() => setActivePlatformTab(tabKey)}
                        className={cn(
                          "px-2.5 py-1 rounded-md text-xs font-medium transition-colors",
                          effectiveTab === tabKey
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground hover:bg-muted/70"
                        )}
                      >
                        {PLATFORM_LABELS[tabKey] ?? tabKey}
                      </button>
                    ))}
                  </div>
                  {/* Tab content — extract active tab data once */}
                  {(() => {
                    const tabData = platformContent?.[effectiveTab] ?? {};
                    if (effectiveTab === "email") {
                      return (
                        <div className="space-y-3">
                          {tabData.subject && (
                            <div>
                              <p className="text-xs text-muted-foreground font-medium mb-1">Subject</p>
                              <p className="text-sm text-foreground">{tabData.subject}</p>
                            </div>
                          )}
                          {tabData.preview_text && (
                            <div>
                              <p className="text-xs text-muted-foreground font-medium mb-1">Preview Text</p>
                              <p className="text-sm text-foreground">{tabData.preview_text}</p>
                            </div>
                          )}
                          {tabData.body && (
                            <>
                              <Separator />
                              <p className="text-xs text-muted-foreground font-medium mb-1">Body</p>
                              <p className="text-sm text-foreground whitespace-pre-wrap">{tabData.body}</p>
                            </>
                          )}
                          {!tabData.subject && !tabData.body && (
                            <p className="text-sm text-muted-foreground">No email content yet</p>
                          )}
                        </div>
                      );
                    }
                    return (
                      <div>
                        <p className="text-sm text-foreground whitespace-pre-wrap">
                          {tabData.caption || "No caption yet"}
                        </p>
                        {tabData.hashtags && (
                          <>
                            <Separator className="my-3" />
                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                              <Hash className="h-3 w-3" />
                              {tabData.hashtags}
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })()}
                </div>
              ) : (
                /* Fallback: no platform_content */
                <>
                  <p className="text-sm text-foreground whitespace-pre-wrap">{post.caption || "No caption yet"}</p>
                  {post.hashtags && (
                    <>
                      <Separator className="my-3" />
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Hash className="h-3 w-3" />
                        {post.hashtags}
                      </div>
                    </>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {/* Version History */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Version History</CardTitle>
              {isSSRole && (
                <label className="cursor-pointer">
                  <input
                    type="file"
                    className="hidden"
                    accept="image/*,video/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) uploadNewVersion(file);
                    }}
                    disabled={uploadingVersion}
                  />
                  <Button variant="outline" size="sm" asChild>
                    <span>
                      <Upload className="h-3 w-3 mr-1" />
                      {uploadingVersion ? "Uploading..." : "New Version"}
                    </span>
                  </Button>
                </label>
              )}
            </CardHeader>
            <CardContent>
              {versions.length === 0 ? (
                <p className="text-sm text-muted-foreground">No versions yet</p>
              ) : (
                <div className="space-y-3">
                  {versions.map((v: any) => (
                    <div key={v.id} className="flex items-start gap-3 p-2 rounded-md hover:bg-muted/50 cursor-pointer" onClick={() => setLightboxVersion(v)}>
                      <div className="h-12 w-12 rounded bg-muted flex items-center justify-center shrink-0 overflow-hidden">
                        {v.creative_url ? (
                          <img src={v.creative_url} alt="" className="h-12 w-12 object-cover" />
                        ) : (
                          <ImageIcon className="h-4 w-4 text-muted-foreground/40" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">Version {v.version_number}</p>
                        <p className="text-xs text-muted-foreground">
                          {v.users?.name || "Team"} · {new Date(v.created_at).toLocaleDateString()}
                        </p>
                        {v.caption && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{v.caption}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Comments */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Comments ({comments.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {comments.length === 0 && (
                <p className="text-sm text-muted-foreground">No comments yet</p>
              )}
              {comments.map((c: any) => (
                <div key={c.id} className="flex gap-3">
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary shrink-0">
                    {(c.users?.name || c.users?.email || "?")[0].toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-baseline gap-2">
                      <span className="text-sm font-medium">{c.users?.name || c.users?.email}</span>
                      <span className="text-xs text-muted-foreground">{new Date(c.created_at).toLocaleString()}</span>
                    </div>
                    <p className="text-sm text-foreground mt-1">{c.body}</p>
                  </div>
                </div>
              ))}
              <Separator />
              <div className="flex gap-2">
                <Textarea
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="Write a comment..."
                  className="min-h-[60px]"
                />
                <Button
                  onClick={() => addComment.mutate()}
                  disabled={!commentText.trim() || addComment.isPending}
                  size="sm"
                  className="self-end"
                >
                  Send
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Details */}
          <Card>
            <CardHeader><CardTitle className="text-base">Details</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span>
                  {post.scheduled_at
                    ? new Date(post.scheduled_at).toLocaleDateString()
                    : "Not scheduled"}
                </span>
              </div>
              {(post as any).due_at && (
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>Due: {new Date((post as any).due_at).toLocaleDateString()}</span>
                </div>
              )}
              <div>
                <Label className="text-muted-foreground text-xs">Status</Label>
                <Badge variant="secondary" className="mt-1">{post.status_column.replace(/_/g, " ")}</Badge>
              </div>
              {isSSRole && (post as any).assigned_to_user_id && (
                <div>
                  <Label className="text-muted-foreground text-xs">Assigned to</Label>
                  <p className="mt-1">{(post as any).assigned_to_user_id}</p>
                </div>
              )}
              {isSSRole && (post as any).reviewer_user_id && (
                <div>
                  <Label className="text-muted-foreground text-xs">Reviewer</Label>
                  <p className="mt-1">{(post as any).reviewer_user_id}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Design Complete Panel */}
          {isSSRole && post.status_column === "design" && (
            <Card className="border-primary">
              <CardHeader><CardTitle className="text-base">Design Review</CardTitle></CardHeader>
              <CardContent>
                <Button
                  className="w-full"
                  onClick={() => setDesignCompleteDialog(true)}
                >
                  <Check className="h-4 w-4 mr-2" />
                  Design Complete — Send for Review
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Approval Panel */}
          {canApprove && isApprovalStatus && (
            <Card className="border-primary">
              <CardHeader><CardTitle className="text-base">Approval</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                <Button
                  className="w-full"
                  onClick={() => setApprovalDialog("approve")}
                >
                  <Check className="h-4 w-4 mr-2" />
                  Approve
                </Button>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => setApprovalDialog("approve_with_notes")}
                >
                  <FileEdit className="h-4 w-4 mr-2" />
                  Approve with Notes
                </Button>
                <Button
                  variant="secondary"
                  className="w-full"
                  onClick={() => setApprovalDialog("request_changes")}
                >
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  Request Changes
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Approval History */}
          {approvals.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-base">Approval History</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {approvals.map((a: any) => (
                  <div key={a.id} className="text-sm">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className={
                          a.type === "approve"
                            ? "border-green-500 text-green-700"
                            : a.type === "approve_with_notes"
                            ? "border-blue-500 text-blue-700"
                            : "border-orange-500 text-orange-700"
                        }
                      >
                        {a.type === "approve" ? "Approved" : a.type === "approve_with_notes" ? "Approved w/ Notes" : "Changes Requested"}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {a.users?.name || a.users?.email} · {new Date(a.created_at).toLocaleDateString()}
                    </p>
                    {a.note && <p className="text-xs mt-1 text-foreground">{a.note}</p>}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Internal Notes (SS only) */}
          {isSSRole && (
            <Card className="border-dashed">
              <CardHeader><CardTitle className="text-base">Internal Notes</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                <Textarea
                  value={internalNotes ?? (post as any).internal_notes ?? ""}
                  onChange={(e) => setInternalNotes(e.target.value)}
                  placeholder="Team-only notes..."
                  className="min-h-[80px]"
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => saveNotes.mutate()}
                  disabled={saveNotes.isPending}
                >
                  <Save className="h-3 w-3 mr-1" />
                  Save Notes
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <ImageLightbox
        open={!!lightboxVersion}
        onOpenChange={(o) => { if (!o) setLightboxVersion(null); }}
        imageUrl={lightboxVersion?.creative_url ?? null}
        title={lightboxVersion ? `Version ${lightboxVersion.version_number}` : undefined}
      >
        <div className="text-sm space-y-1">
          <p className="text-white/60">
            Uploaded by {lightboxVersion?.users?.name || "Team"} · {lightboxVersion && new Date(lightboxVersion.created_at).toLocaleString()}
          </p>
          {lightboxVersion?.caption && <p className="text-white/90">{lightboxVersion.caption}</p>}
          {lightboxVersion?.hashtags && <p className="text-white/60">#{lightboxVersion.hashtags}</p>}
        </div>
      </ImageLightbox>

      {/* Design Complete Confirmation Dialog */}
      <Dialog open={designCompleteDialog} onOpenChange={setDesignCompleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send to Corey for Review</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Send to Corey for review?
          </p>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDesignCompleteDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => markDesignComplete.mutate()}
              disabled={markDesignComplete.isPending}
            >
              {markDesignComplete.isPending ? "Sending..." : "Confirm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Post Confirmation Dialog */}
      <Dialog open={deleteDialog} onOpenChange={setDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Post</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete this post? This cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeleteDialog(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deletePost.mutate()}
              disabled={deletePost.isPending}
            >
              {deletePost.isPending ? "Deleting..." : "Delete Post"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Approval Confirmation Dialog */}
      <Dialog open={!!approvalDialog} onOpenChange={() => setApprovalDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {approvalDialog === "approve"
                ? "Approve Post"
                : approvalDialog === "approve_with_notes"
                ? "Approve with Notes"
                : "Request Changes"}
            </DialogTitle>
          </DialogHeader>
          {approvalDialog !== "approve" && (
            <div className="space-y-2">
              <Label>{approvalDialog === "request_changes" ? "What changes are needed?" : "Notes"}</Label>
              <Textarea
                value={approvalNote}
                onChange={(e) => setApprovalNote(e.target.value)}
                placeholder={
                  approvalDialog === "request_changes"
                    ? "Describe the changes you'd like..."
                    : "Add your notes..."
                }
              />
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setApprovalDialog(null)}>
              Cancel
            </Button>
            <Button
              onClick={() => submitApproval.mutate()}
              disabled={
                submitApproval.isPending ||
                (approvalDialog !== "approve" && !approvalNote.trim())
              }
            >
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

