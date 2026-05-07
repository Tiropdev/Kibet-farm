import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "./pages/NotFound.tsx";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/farm/ProtectedRoute";
import { AppLayout } from "@/components/farm/AppLayout";
import Dashboard from "./pages/Dashboard";
import CowsList from "./pages/cows/CowsList";
import CowForm from "./pages/cows/CowForm";
import CowProfile from "./pages/cows/CowProfile";
import Alerts from "./pages/Alerts";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";
import AddRecord from "./pages/AddRecord";
import BulkMilk from "./pages/BulkMilk";
import CalendarView from "./pages/CalendarView";
import Backup from "./pages/Backup";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<ProtectedRoute><AppLayout><Dashboard /></AppLayout></ProtectedRoute>} />
            <Route path="/cows" element={<ProtectedRoute><AppLayout><CowsList /></AppLayout></ProtectedRoute>} />
            <Route path="/cows/new" element={<ProtectedRoute><AppLayout><CowForm /></AppLayout></ProtectedRoute>} />
            <Route path="/cows/:id" element={<ProtectedRoute><AppLayout><CowProfile /></AppLayout></ProtectedRoute>} />
            <Route path="/cows/:id/edit" element={<ProtectedRoute><AppLayout><CowForm /></AppLayout></ProtectedRoute>} />
            <Route path="/alerts" element={<ProtectedRoute><AppLayout><Alerts /></AppLayout></ProtectedRoute>} />
            <Route path="/reports" element={<ProtectedRoute><AppLayout><Reports /></AppLayout></ProtectedRoute>} />
            <Route path="/activity" element={<ProtectedRoute><AppLayout><Reports /></AppLayout></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute><AppLayout><Settings /></AppLayout></ProtectedRoute>} />
            <Route path="/backup" element={<ProtectedRoute><AppLayout><Backup /></AppLayout></ProtectedRoute>} />
            <Route path="/add" element={<ProtectedRoute><AppLayout><AddRecord /></AppLayout></ProtectedRoute>} />
            <Route path="/milk/bulk" element={<ProtectedRoute><AppLayout><BulkMilk /></AppLayout></ProtectedRoute>} />
            <Route path="/calendar" element={<ProtectedRoute><AppLayout><CalendarView /></AppLayout></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
