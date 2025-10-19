"use client";

import { Link, useLocation, useNavigate } from "react-router-dom";
import { Clock, Users, BarChart, Settings, LogOut, CheckSquare, UserCircle2 } from "lucide-react"; // Adicionado CheckSquare e UserCircle2
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useSession } from "@/integrations/supabase/auth";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { EmployeeProfile } from "@/types/employee";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"; // Import Avatar components

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  roles?: ('employee' | 'admin')[]; // Optional roles for access control
}

const navItems: NavItem[] = [
  { href: "/", label: "Ponto", icon: Clock, roles: ['employee', 'admin'] },
  { href: "/ponto-approval", label: "Aprovação de Ponto", icon: CheckSquare, roles: ['admin'] }, // Novo item para admins
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
          .maybeSingle(); // Changed from .single() to .maybeSingle()

        if (error) {
          toast.error("Erro ao carregar perfil do usuário: " + error.message);
          setUserProfile(null);
        } else if (data) {
          // Combine with email from session
          setUserProfile({ ...data, email: session.user.email || 'N/A' });
        } else {
          // No profile found, set to null
          setUserProfile(null);
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
    <div className="flex h-full max-h-screen flex-col gap-2 bg-sidebar text-sidebar-foreground">
      <div className="flex h-16 items-center border-b border-sidebar-border px-4 lg:h-[60px] lg:px-6">
        <Link to="/" className="flex items-center gap-2 font-bold text-xl text-sidebar-primary" onClick={handleNavigationClick}>
          <span>Mais Que Papel</span>
        </Link>
      </div>
      <div className="flex-1 overflow-auto py-4">
        <nav className="grid items-start px-2 text-sm font-medium lg:px-4">
          {session && userProfile && (
            <div className="mb-6 p-3 flex items-center gap-3 border-b border-sidebar-border pb-4">
              <Avatar className="h-9 w-9">
                <AvatarImage src={userProfile.avatar_url || undefined} alt={`${userProfile.first_name} ${userProfile.last_name}`} />
                <AvatarFallback>
                  <UserCircle2 className="h-6 w-6 text-muted-foreground" />
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-semibold text-sidebar-primary">{userProfile.first_name} {userProfile.last_name}</p>
                <p className="text-xs text-sidebar-foreground capitalize">{userProfile.role === 'admin' ? 'Administrador' : 'Funcionário'}</p>
              </div>
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
                    "flex items-center gap-3 rounded-lg px-3 py-2 transition-all hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                    location.pathname === item.href ? "bg-sidebar-accent text-sidebar-accent-foreground font-semibold" : "text-sidebar-foreground"
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
        <div className="mt-auto p-4 border-t border-sidebar-border">
          <Button
            variant="ghost"
            className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10 transition-colors duration-200"
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