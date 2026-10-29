import type { Metadata } from "next";

import { PageHeader } from "@/components/page-header";
import { requirePermission } from "@/lib/auth";

import { loadTeamData } from "./data";
import { TeamClient } from "./team-client";

export const metadata: Metadata = { title: "Tim" };

export default async function TeamPage() {
  const user = await requirePermission("team");
  const data = await loadTeamData(user);

  return (
    <div className="w-full">
      <PageHeader
        title="Tim"
        description="Kelola garis atasan, area, dan akses untuk organisasi ini."
      />
      <TeamClient members={data.members} />
    </div>
  );
}
