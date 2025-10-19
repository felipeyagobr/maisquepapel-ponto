import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Employees from "./pages/Employees";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";
import PontoApproval from "./pages/PontoApproval"; // Import the new PontoApproval page
import NotFound from "./pages/NotFound";
import Login from "./pages/Login";
import { SessionContextProvider } from "./integrations/supabase/auth";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <SessionContextProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<Index />} />
            <Route path="/employees" element={<Employees />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/ponto-approval" element={<PontoApproval />} /> {/* New Ponto Approval route */}
            <Route path="/settings" element={<Settings />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </SessionContextProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;