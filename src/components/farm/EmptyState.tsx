import { ReactNode } from "react";

export const EmptyState = ({ icon, title, description, action }: { icon: ReactNode; title: string; description?: string; action?: ReactNode }) => (
  <div className="farm-card p-10 text-center">
    <div className="mx-auto w-14 h-14 rounded-2xl bg-primary-soft text-primary flex items-center justify-center mb-4">
      {icon}
    </div>
    <h3 className="font-display font-semibold text-lg">{title}</h3>
    {description && <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">{description}</p>}
    {action && <div className="mt-5 flex justify-center">{action}</div>}
  </div>
);