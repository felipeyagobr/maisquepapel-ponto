"use client";

import { Link, useLocation, useNavigate } from "react-router-dom";
import { Clock, Users, BarChart, Settings, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useSession } from "@/integrations/supabase/auth";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { EmployeeProfile } from "@/types/employee";
import { toast } from "sonner";

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  roles?: ('employee' | 'admin')[]; // Optional roles for access control
}

const navItems: NavItem[] = [
  { href: "/", label: "Ponto", icon: Clock, roles: ['employee', 'admin'] },
  { href: "/employees", label: "Funcionários", icon: Users, roles: ['admin'] }, // Only for admins
  { href: "/reports", label: "Relatórios", icon: BarChart, roles: ['employee', 'admin'] },
  { href: "/settings", label: "Configurações", icon: Settings, roles: ['employee', 'admin'] },
];

interface SidebarProps {
  onClose?: () => void; // Optional prop to close the sidebar
}

const Sidebar = ({ onClose }: SidebarProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { session, isLoading: sessionLoading } = useSession();
  const [userProfile, setUserProfile] = useState<EmployeeProfile | null>(null);
  const [isProfileLoading, setIsProfileLoading] = useState(true);

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (session?.user) {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, role, avatar_url, updated_at')
          .eq('id', session.user.id)
          .single();

        if (error) {
          toast.error("Erro ao carregar perfil do usuário: " + error.message);
          setUserProfile(null);
        } else if (data) {
          // Combine with email from session
          setUserProfile({ ...data, email: session.user.email || 'N/A' });
        }
      }
      setIsProfileLoading(false);
    };

    if (!sessionLoading) {
      fetchUserProfile();
    }
  }, [session, sessionLoading]);

  const handleNavigationClick = () => {
    if (onClose) {
      onClose();
    }
  };

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error("Erro ao sair: " + error.message);
    } else {
      toast.info("Você foi desconectado.");
      navigate('/login'); // Redirect to login page after logout
      if (onClose) {
        onClose();
      }
    }
  };

  const currentUserRole = userProfile?.role;

  return (
    <div className="flex h-full max-h-screen flex-col gap-2">
      <div className="flex h-14 items-center border-b px-4 lg:h-[60px] lg:px-6">
        <Link to="/" className="flex items-center gap-2 font-semibold" onClick={handleNavigationClick}>
          <span className="text-lg">Mais Que Papel</span>
        </Link>
      </div>
      <div className="flex-1 overflow-auto py-2">
        <nav className="grid items-start px-2 text-sm font-medium lg:px-4">
          {session && userProfile && (
            <div className="mb-4 p-2 border-b pb-4">
              <p className="font-semibold text-primary">{userProfile.first_name} {userProfile.last_name}</p>
              <p className="text-xs text-muted-foreground capitalize">{userProfile.role === 'admin' ? 'Administrador' : 'Funcionário'}</p>
            </div>
          )}
          {navItems.map((item) => {
            // Render item only if user is logged in and has the required role
            if (session && currentUserRole && item.roles?.includes(currentUserRole)) {
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary",
                    location.pathname === item.href && "bg-muted text-primary" // Active state styling
                  )}
                  onClick={handleNavigationClick} // Close sidebar on click
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            }
            return null;
          })}
        </nav>
      </div>
      {session && (
        <div className="mt-auto p-4 border-t">
          <Button
            variant="ghost"
            className="w-full justify-start text-destructive hover:text-destructive"
            onClick={handleLogout}
          >
            <LogOut className="mr-2 h-4 w-4" />
            Sair
          </Button>
        </div>
      )}
    </div>
  );
};

export default Sidebar;