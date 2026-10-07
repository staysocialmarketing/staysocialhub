import { useAuth } from "@/contexts/AuthContext";
import { HubTabs } from "./HubTabs";
import AdminClients from "@/pages/admin/AdminClients";
import ClientDeliverables from "@/pages/client/ClientDeliverables";
import AdminSocialLogins from "@/pages/admin/AdminSocialLogins";
import ContentGenerator from "@/pages/client/ContentGenerator";
import AdminMarketplace from "@/pages/admin/AdminMarketplace";
import AdminPlans from "@/pages/admin/AdminPlans";

export default function ClientsHub() {
  const { isSSAdmin } = useAuth();
  return (
    <HubTabs
      title="Clients"
      lead="Every client, what they have, and the tools that serve them."
      tabs={[
        { key: "clients", label: "Clients", element: <AdminClients /> },
        { key: "deliverables", label: "Deliverables", element: <ClientDeliverables /> },
        { key: "logins", label: "Social logins", element: <AdminSocialLogins /> },
        { key: "generator", label: "Content generator", element: <ContentGenerator /> },
        { key: "marketplace", label: "Marketplace", element: <AdminMarketplace /> },
        { key: "plans", label: "Plans", element: <AdminPlans />, show: isSSAdmin },
      ]}
    />
  );
}
