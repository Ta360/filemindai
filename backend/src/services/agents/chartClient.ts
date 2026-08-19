import { env } from "../../config/env";
import { agentActivityRepo } from "../../database/repositories";
import type { AgentName } from "../../../../shared/types";

const AGENT_TITLES: Record<AgentName, string> = {
  google: "Google Agent — Topics Searched",
  youtube: "YouTube Agent — Videos Viewed by Channel/Person",
  instagram: "Instagram Agent — Media Viewed",
};

/** Pulls real topic->count aggregates and renders them via the Matplotlib microservice. Throws if the chart service is unreachable. */
export async function renderAgentChart(userId: string, agent: AgentName, kind: "bar" | "pie", days = 7): Promise<Buffer> {
  const counts = agentActivityRepo.topicCounts(userId, agent, days);
  const labels = counts.map((c) => c.topic);
  const values = counts.map((c) => c.count);

  const res = await fetch(`${env.chartServiceUrl}/chart/${kind}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title: AGENT_TITLES[agent], agent, labels, values }),
  });
  if (!res.ok) throw new Error(`CHART_SERVICE_HTTP_${res.status}`);
  const arrayBuffer = await res.arrayBuffer();
  return Buffer.from(arrayBuffer);
}
