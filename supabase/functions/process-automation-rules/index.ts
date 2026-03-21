import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { trigger_event, record, old_record } = await req.json();

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Fetch active rules for this trigger event
    const { data: rules, error: rulesErr } = await supabase
      .from("automation_rules")
      .select("*")
      .eq("trigger_event", trigger_event)
      .eq("is_active", true);

    if (rulesErr || !rules?.length) {
      return new Response(JSON.stringify({ processed: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const results: { rule_id: string; success: boolean; error?: string }[] = [];

    for (const rule of rules) {
      try {
        const conditions = rule.conditions_json || {};
        const config = rule.action_config_json || {};

        // Evaluate conditions
        if (!matchesConditions(conditions, record, old_record, trigger_event)) {
          continue;
        }

        // Execute action
        await executeAction(supabase, rule.action_type, config, record, trigger_event);
        results.push({ rule_id: rule.id, success: true });
      } catch (err) {
        results.push({ rule_id: rule.id, success: false, error: String(err) });
      }
    }

    return new Response(JSON.stringify({ processed: results.length, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function matchesConditions(
  conditions: Record<string, unknown>,
  record: Record<string, unknown>,
  oldRecord: Record<string, unknown> | null,
  triggerEvent: string
): boolean {
  // Check client_id condition
  if (conditions.client_id && record.client_id !== conditions.client_id) {
    return false;
  }

  // Check content_type condition
  if (conditions.content_type && record.content_type !== conditions.content_type) {
    return false;
  }

  // Check status condition (for status change triggers)
  if (conditions.status && record.status_column !== conditions.status && record.status !== conditions.status) {
    return false;
  }

  // Check from_status for status change triggers
  if (conditions.from_status && triggerEvent.includes("status_changed")) {
    const oldStatus = oldRecord?.status_column || oldRecord?.status;
    if (oldStatus !== conditions.from_status) {
      return false;
    }
  }

  // Check to_status for status change triggers
  if (conditions.to_status) {
    const newStatus = record.status_column || record.status;
    if (newStatus !== conditions.to_status) {
      return false;
    }
  }

  // Check priority condition
  if (conditions.priority && record.priority !== conditions.priority) {
    return false;
  }

  return true;
}

async function executeAction(
  supabase: ReturnType<typeof createClient>,
  actionType: string,
  config: Record<string, unknown>,
  record: Record<string, unknown>,
  triggerEvent: string
) {
  const table = triggerEvent.startsWith("request") ? "requests"
    : triggerEvent.startsWith("post") ? "posts"
    : "tasks";

  switch (actionType) {
    case "assign_user": {
      const userId = config.user_id as string;
      if (!userId) throw new Error("No user_id in config");
      const updateField = table === "requests" ? "assigned_to_user_id" : "assigned_to_user_id";
      await supabase.from(table).update({ [updateField]: userId }).eq("id", record.id);
      break;
    }

    case "notify_user": {
      const targetUserId = config.user_id as string;
      const message = (config.message as string) || `Automation triggered on ${table}`;
      if (!targetUserId) throw new Error("No user_id in config");

      const link = table === "requests" ? "/requests"
        : table === "tasks" ? "/team/tasks"
        : "/workflow";

      const notifKey = `automation:${record.id}:${actionType}:${targetUserId}`;
      await supabase.from("notifications").insert({
        user_id: targetUserId,
        title: "Automation",
        body: message,
        link,
        notification_key: notifKey,
      });
      break;
    }

    case "change_status": {
      const newStatus = config.status as string;
      if (!newStatus) throw new Error("No status in config");
      const statusField = table === "posts" ? "status_column" : "status";
      await supabase.from(table).update({ [statusField]: newStatus }).eq("id", record.id);
      break;
    }

    case "add_tag": {
      const tag = config.tag as string;
      if (!tag || table !== "posts") break;
      const currentTags = (record.tags as string[]) || [];
      if (!currentTags.includes(tag)) {
        await supabase.from("posts").update({ tags: [...currentTags, tag] }).eq("id", record.id);
      }
      break;
    }

    default:
      throw new Error(`Unknown action type: ${actionType}`);
  }
}
