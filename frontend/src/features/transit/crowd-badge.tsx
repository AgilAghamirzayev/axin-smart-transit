import { Badge } from "@/components/ui/badge";
import type { CrowdLevel } from "./types";
export const crowdLabels: Record<CrowdLevel, string> = {
  LOW: "Aşağı sıxlıq", MEDIUM: "Orta sıxlıq", HIGH: "Yüksək sıxlıq", UNKNOWN: "Məlumat yoxdur",
};
export function CrowdBadge({ level }: { level: CrowdLevel }) {
  return <Badge variant="outline" className={"crowd-badge crowd-" + level.toLowerCase()}>
    <span className="size-1.5 rounded-full bg-current" />{crowdLabels[level]}
  </Badge>;
}
