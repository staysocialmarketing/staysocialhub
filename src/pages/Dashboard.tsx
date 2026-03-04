import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import {
  CheckSquare,
  MessageSquarePlus,
  FileEdit,
  Users,
  Sparkles,
  ArrowRight,
  Calendar,
} from "lucide-react";

export default function Dashboard() {
  const { profile, isClientAdmin, isSSRole } = useAuth();
  const navigate = useNavigate();

  const { data: pendingApprovals = 0 } = useQuery({
    queryKey: ["pending-approvals-count", profile?.client_id],
    queryFn: async () => {
      if (!profile?.client_id && !isSSRole) return 0;
      let query = supabase
        .from("posts")
        .select("id", { count: "exact", head: true })
        .eq("status_column", "client_approval");
      if (profile?.client_id) query = query.eq("client_id", profile.client_id);
      const { count } = await query;
      return count || 0;
    },
    enabled: !!profile,
  });

  const { data: openRequests = 0 } = useQuery({
    queryKey: ["open-requests-count", profile?.client_id],
    queryFn: async () => {
      if (!profile?.client_id && !isSSRole) return 0;
      let query = supabase
        .from("requests")
        .select("id", { count: "exact", head: true })
        .eq("status", "open");
      if (profile?.client_id) query = query.eq("client_id", profile.client_id);
      const { count } = await query;
      return count || 0;
    },
    enabled: !!profile,
  });

  const { data: clientPlan } = useQuery({
    queryKey: ["client-plan", profile?.client_id],
    queryFn: async () => {
      if (!profile?.client_id) return null;
      const { data } = await supabase
        .from("clients")
        .select("name, plans(name, includes_json)")
        .eq("id", profile.client_id)
        .single();
      return data;
    },
    enabled: !!profile?.client_id,
  });

  const { data: scheduledPosts = [] } = useQuery({
    queryKey: ["scheduled-posts", profile?.client_id],
    queryFn: async () => {
      let query = supabase
        .from("posts")
        .select("id, title, platform, scheduled_at")
        .gt("scheduled_at", new Date().toISOString())
        .order("scheduled_at", { ascending: true })
        .limit(5);
      if (profile?.client_id) query = query.eq("client_id", profile.client_id);
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!profile,
  });

  const addons = [
    { title: "Email Marketing", description: "Monthly email campaigns to your audience", icon: "📧" },
    { title: "Reels Package", description: "Short-form video content creation", icon: "🎬" },
    { title: "Ad Management", description: "Paid social media advertising", icon: "📊" },
  ];

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">
          Welcome back{profile?.name ? `, ${profile.name.split(' ')[0]}` : ""}
        </h2>
        <p className="text-muted-foreground mt-1">
          Here's what's happening with your social content.
        </p>
      </div>

      {/* Plan Info */}
      {clientPlan && (
        <Card>
          <CardContent className="flex items-center justify-between py-4">
            <div>
              <p className="text-sm text-muted-foreground">Current Plan</p>
              <p className="font-semibold text-foreground">
                {(clientPlan as any).plans?.name || "No plan assigned"}
              </p>
            </div>
            <Badge variant="secondary">Active</Badge>
          </CardContent>
        </Card>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate("/approvals")}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Awaiting Approval</CardTitle>
            <CheckSquare className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">{pendingApprovals}</div>
            <p className="text-xs text-muted-foreground mt-1">Content ready for your review</p>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate("/requests")}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Open Requests</CardTitle>
            <MessageSquarePlus className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">{openRequests}</div>
            <p className="text-xs text-muted-foreground mt-1">Requests being worked on</p>
          </CardContent>
        </Card>

        {isClientAdmin && (
          <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate("/requests")}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Team</CardTitle>
              <Users className="h-4 w-4 text-info" />
            </CardHeader>
            <CardContent>
              <Button variant="outline" size="sm" className="mt-1">
                <Users className="h-3 w-3 mr-1" />
                Add an Assistant
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Next Scheduled Posts */}
      {scheduledPosts.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Calendar className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold text-foreground">Next Scheduled Posts</h3>
          </div>
          <Card>
            <CardContent className="p-0">
              <ul className="divide-y divide-border">
                {scheduledPosts.map((post: any) => (
                  <li
                    key={post.id}
                    className="flex items-center justify-between px-4 py-3 hover:bg-accent/50 cursor-pointer transition-colors"
                    onClick={() => navigate(`/approvals/${post.id}`)}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium text-muted-foreground min-w-[80px]">
                        {format(new Date(post.scheduled_at), "MMM d")}
                      </span>
                      <span className="text-sm font-medium text-foreground">{post.title}</span>
                    </div>
                    {post.platform && (
                      <Badge variant="secondary" className="text-xs">
                        {post.platform.split(",")[0].trim()}
                      </Badge>
                    )}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      )}
      <div>
        <h3 className="text-lg font-semibold text-foreground mb-3">Quick Actions</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Button
            variant="outline"
            className="h-auto py-4 flex flex-col items-start gap-1"
            onClick={() => navigate("/requests?type=social_post")}
          >
            <FileEdit className="h-5 w-5 text-primary" />
            <span className="font-medium">Request a Social Post</span>
          </Button>
          <Button
            variant="outline"
            className="h-auto py-4 flex flex-col items-start gap-1"
            onClick={() => navigate("/requests?type=email_campaign")}
          >
            <MessageSquarePlus className="h-5 w-5 text-primary" />
            <span className="font-medium">Request an Email Campaign</span>
          </Button>
          <Button
            variant="outline"
            className="h-auto py-4 flex flex-col items-start gap-1"
            onClick={() => navigate("/approvals")}
          >
            <CheckSquare className="h-5 w-5 text-primary" />
            <span className="font-medium">Review Content</span>
          </Button>
        </div>
      </div>

      {/* What's New */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="h-5 w-5 text-warning" />
          <h3 className="text-lg font-semibold text-foreground">What's New / Add-ons</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {addons.map((addon) => (
            <Card key={addon.title} className="hover:shadow-md transition-shadow">
              <CardContent className="pt-5">
                <span className="text-2xl">{addon.icon}</span>
                <h4 className="font-semibold text-foreground mt-2">{addon.title}</h4>
                <p className="text-sm text-muted-foreground mt-1">{addon.description}</p>
                <Button variant="link" size="sm" className="px-0 mt-2 text-primary">
                  Learn more <ArrowRight className="h-3 w-3 ml-1" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
