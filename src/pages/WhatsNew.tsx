import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles } from "lucide-react";

const addons = [
  { title: "Email Marketing", desc: "Monthly email campaigns to nurture your audience and drive conversions.", icon: "📧", price: "From $299/mo" },
  { title: "Reels & Short-Form Video", desc: "Engaging vertical video content for Instagram Reels, TikTok, and Shorts.", icon: "🎬", price: "From $499/mo" },
  { title: "Paid Social Ads", desc: "Strategic ad campaigns with targeting, creative, and reporting.", icon: "📊", price: "From $599/mo" },
  { title: "Blog & SEO Content", desc: "Monthly blog posts optimized for search to drive organic traffic.", icon: "✍️", price: "From $399/mo" },
  { title: "Photography Sessions", desc: "Professional brand photography for your social content library.", icon: "📷", price: "From $799/session" },
  { title: "Community Management", desc: "Active engagement with your audience — comments, DMs, and more.", icon: "💬", price: "From $349/mo" },
];

export default function WhatsNew() {
  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-2">
        <Sparkles className="h-6 w-6 text-warning" />
        <h2 className="text-2xl font-bold text-foreground">What's New / Add-ons</h2>
      </div>
      <p className="text-muted-foreground">Supercharge your social presence with these add-on services.</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {addons.map((a) => (
          <Card key={a.title} className="hover:shadow-md transition-shadow">
            <CardContent className="pt-5 space-y-3">
              <span className="text-3xl">{a.icon}</span>
              <h3 className="font-semibold text-foreground">{a.title}</h3>
              <p className="text-sm text-muted-foreground">{a.desc}</p>
              <p className="text-sm font-medium text-primary">{a.price}</p>
              <Button variant="outline" size="sm">
                Learn More <ArrowRight className="h-3 w-3 ml-1" />
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
