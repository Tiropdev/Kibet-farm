import { CowStatus, STATUS_BADGE, STATUS_LABELS } from "@/lib/farm";
import { cn } from "@/lib/utils";

export const StatusBadge = ({ status, className }: { status: CowStatus; className?: string }) => (
  <span className={cn("inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium", STATUS_BADGE[status], className)}>
    {STATUS_LABELS[status]}
  </span>
);