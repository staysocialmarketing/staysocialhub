import { useSearchParams } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Profile from "@/pages/Profile";
import SocialLogins from "@/pages/client/SocialLogins";
import Plan from "@/pages/Plan";
import ClientDeliverables from "@/pages/client/ClientDeliverables";

/**
 * Brand profile: the client's account in one place. Profile, social logins, plan and
 * deliverables used to be four sidebar items; they are tabs here (?tab=profile|logins|plan|deliverables).
 */
const TABS = ["profile", "logins", "plan", "deliverables"] as const;
type Tab = (typeof TABS)[number];

export default function BrandProfile() {
  const [params, setParams] = useSearchParams();
  const raw = params.get("tab");
  const tab: Tab = (TABS as readonly string[]).includes(raw || "") ? (raw as Tab) : "profile";

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-foreground tracking-tight">Brand profile</h1>
        <p className="text-sm text-muted-foreground">Your details, your logins, your plan and the files we have made for you.</p>
      </div>
      <Tabs value={tab} onValueChange={(v) => setParams({ tab: v })}>
        <TabsList className="grid w-full grid-cols-4 max-w-xl">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="logins">Social logins</TabsTrigger>
          <TabsTrigger value="plan">Plan</TabsTrigger>
          <TabsTrigger value="deliverables">Deliverables</TabsTrigger>
        </TabsList>
        <TabsContent value="profile" className="-mx-4 sm:-mx-6"><Profile /></TabsContent>
        <TabsContent value="logins" className="-mx-4 sm:-mx-6"><SocialLogins /></TabsContent>
        <TabsContent value="plan" className="-mx-4 sm:-mx-6"><Plan /></TabsContent>
        <TabsContent value="deliverables" className="-mx-4 sm:-mx-6"><ClientDeliverables /></TabsContent>
      </Tabs>
    </div>
  );
}
