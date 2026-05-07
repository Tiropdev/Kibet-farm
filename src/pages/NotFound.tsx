import { Link, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Beef, Home } from "lucide-react";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  const location = useLocation();
  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="text-center max-w-md animate-fade-in">
        <div className="mx-auto w-20 h-20 rounded-2xl bg-gradient-hero flex items-center justify-center shadow-elevated mb-6">
          <Beef className="w-10 h-10 text-primary-foreground" />
        </div>
        <h1 className="font-display text-6xl font-bold text-primary">404</h1>
        <p className="mt-2 font-display text-xl font-semibold">Looks like this cow wandered off</p>
        <p className="mt-2 text-sm text-muted-foreground">The page <code className="px-1.5 py-0.5 rounded bg-muted text-xs">{location.pathname}</code> doesn't exist on Kibet Farm Yard.</p>
        <Button asChild className="mt-6 rounded-full">
          <Link to="/"><Home className="w-4 h-4 mr-2" /> Back to Dashboard</Link>
        </Button>
        <div className="mt-8 text-[11px] text-muted-foreground">Kibet Farm v1.0</div>
      </div>
    </div>
  );
};

export default NotFound;
