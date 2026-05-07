import { cn } from "@/lib/utils";

const styles = {
  urgent: "bg-destructive/10 text-destructive border-destructive/20",
  upcoming: "bg-warning/10 text-warning-foreground border-warning/30",
  info: "bg-muted text-muted-foreground border-border",
} as const;

export const AlertPill = ({ level, children }: { level: keyof typeof styles; children: React.ReactNode }) => (
  <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full border text-xs font-medium", styles[level])}>
    {children}
  </span>
);