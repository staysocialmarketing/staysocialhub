import { Link } from "react-router-dom";
import { Monitor } from "lucide-react";
import { HubTabs } from "./HubTabs";
import Projects from "@/pages/team/Projects";
import Tasks from "@/pages/team/Tasks";
import ThinkTank from "@/pages/team/ThinkTank";
import MeetingNotes from "@/pages/admin/MeetingNotes";
import CorporateStrategy from "@/pages/admin/CorporateStrategy";
import TeamDashboard from "@/pages/admin/TeamDashboard";

export default function TeamHub() {
  return (
    <HubTabs
      title="Team"
      lead="Projects, tasks, ideas and notes for the two humans and the agents."
      tabs={[
        { key: "tasks", label: "Tasks", element: <Tasks /> },
        { key: "projects", label: "Projects", element: <Projects /> },
        { key: "think-tank", label: "Think Tank", element: <ThinkTank /> },
        { key: "notes", label: "Meeting notes", element: <MeetingNotes /> },
        { key: "playbook", label: "Strategy playbook", element: <CorporateStrategy /> },
        { key: "success", label: "Team success", element: <TeamDashboard /> },
        {
          key: "office", label: "Agent office",
          element: (
            <div className="p-6">
              <p className="text-sm text-muted-foreground mb-3">The Agent Office is a full-screen view and opens on its own page.</p>
              <Link to="/agent-office-v2" className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"><Monitor className="h-4 w-4" /> Open the Agent Office</Link>
            </div>
          ),
        },
      ]}
    />
  );
}
