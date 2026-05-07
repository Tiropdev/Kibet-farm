import { Beef } from "lucide-react";
import { cn } from "@/lib/utils";

export const CowAvatar = ({ src, name, size = "md" }: { src?: string | null; name: string; size?: "sm" | "md" | "lg" }) => {
  const sizes = { sm: "w-9 h-9 text-xs", md: "w-12 h-12 text-sm", lg: "w-20 h-20 text-lg" };
  if (src) {
    return <img src={src} alt={name} className={cn("rounded-2xl object-cover bg-muted", sizes[size])} />;
  }
  return (
    <div className={cn("rounded-2xl bg-primary-soft text-primary flex items-center justify-center font-display font-semibold", sizes[size])}>
      <Beef className="w-1/2 h-1/2 opacity-70" />
    </div>
  );
};