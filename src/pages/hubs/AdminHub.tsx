import { useAuth } from "@/contexts/AuthContext";
import { HubTabs } from "./HubTabs";
import AdminUsers from "@/pages/admin/AdminUsers";
import AdminWorkspace from "@/pages/admin/AdminWorkspace";
import AdminAutomations from "@/pages/admin/AdminAutomations";
import AdminVersions from "@/pages/admin/AdminVersions";
import PremiereExpenses from "@/pages/premiere/PremiereExpenses";

export default function AdminHub() {
  const { isSSAdmin, isSSManager } = useAuth();
  return (
    <HubTabs
      title="Admin"
      lead="Users, the workspace, automations and the books."
      tabs={[
        { key: "users", label: "Users", element: <AdminUsers />, show: isSSAdmin || isSSManager },
        { key: "automations", label: "Automations", element: <AdminAutomations /> },
        { key: "workspace", label: "Workspace", element: <AdminWorkspace />, show: isSSAdmin },
        { key: "versions", label: "Versions", element: <AdminVersions />, show: isSSAdmin },
        { key: "premiere", label: "Premiere expenses", element: <PremiereExpenses /> },
      ]}
    />
  );
}
