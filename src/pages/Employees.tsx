"use client";

import { useEffect, useState, useMemo } from "react";
import Layout from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { PlusCircle, Loader2 } from "lucide-react";
import { DataTable } from "@/components/data-table/DataTable";
import { createColumns } from "./employees/columns";
import { Dialog, DialogTrigger } from "@/components/ui/dialog";
import EmployeeForm from "@/components/EmployeeForm";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { EmployeeProfile } from "@/types/employee";
import { useSession } from "@/integrations/supabase/auth";
import { useNavigate } from "react-router-dom";

const Employees = () => {
  const [employees, setEmployees] = useState<EmployeeProfile[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<EmployeeProfile | undefined>(undefined);
  const [isLoadingEmployees, setIsLoadingEmployees] = useState(true);
  const [currentUserProfile, setCurrentUserProfile] = useState<EmployeeProfile | null>(null);
  const [isCurrentUserProfileLoading, setIsCurrentUserProfileLoading] = useState(true);

  const { session, isLoading: sessionLoading } = useSession();
  const navigate = useNavigate();

  // Effect to fetch current user's profile
  useEffect(() => {
    const fetchCurrentUserProfile = async () => {
      if (session?.user) {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, role, avatar_url, updated_at')
          .eq('id', session.user.id)
          .maybeSingle();

        if (error) {
          toast.error("Erro ao carregar perfil do usuário atual: " + error.message);
          setCurrentUserProfile(null);
        } else if (data) {
          setCurrentUserProfile({ ...data, email: session.user.email || 'N/A' });
        } else {
          setCurrentUserProfile(null);
        }
      }
      setIsCurrentUserProfileLoading(false);
    };

    if (!sessionLoading) {
      fetchCurrentUserProfile();
    }
  }, [session, sessionLoading]);

  const fetchEmployees = async () => {
    setIsLoadingEmployees(true);
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, role, avatar_url, updated_at');

    if (profilesError) {
      toast.error("Erro ao carregar perfis: " + profilesError.message);
      setIsLoadingEmployees(false);
      return;
    }

    const { data: users, error: usersError } = await supabase.auth.admin.listUsers();

    if (usersError) {
      toast.error("Erro ao carregar usuários de autenticação: " + usersError.message);
      setIsLoadingEmployees(false);
      return;
    }

    const usersMap = new Map(users.users.map(user => [user.id, user.email]));

    const combinedEmployees: EmployeeProfile[] = profiles.map(profile => ({
      ...profile,
      email: usersMap.get(profile.id) || 'N/A',
    }));

    setEmployees(combinedEmployees);
    setIsLoadingEmployees(false);
  };

  // Effect to fetch all employees if current user is admin
  useEffect(() => {
    if (!isCurrentUserProfileLoading) {
      if (currentUserProfile?.role === 'admin') {
        fetchEmployees();
      } else {
        toast.error("Acesso negado. Apenas administradores podem gerenciar funcionários.");
        navigate('/');
      }
    }
  }, [isCurrentUserProfileLoading, currentUserProfile, navigate]);

  const handleSaveSuccess = () => {
    fetchEmployees();
    setIsFormOpen(false);
    setEditingEmployee(undefined);
  };

  const handleEditClick = (employee: EmployeeProfile) => {
    setEditingEmployee(employee);
    setIsFormOpen(true);
  };

  const handleDeleteEmployee = async (id: string) => {
    const { error: authError } = await supabase.auth.admin.deleteUser(id);

    if (authError) {
      toast.error("Erro ao excluir usuário: " + authError.message);
    } else {
      toast.success("Funcionário excluído com sucesso!");
      fetchEmployees();
    }
  };

  const columns = useMemo(() => createColumns({
    onEdit: handleEditClick,
    onDelete: handleDeleteEmployee,
  }), [employees]);

  if (sessionLoading || isCurrentUserProfileLoading || isLoadingEmployees) {
    return (
      <Layout>
        <div className="flex flex-1 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  // Final check for admin role before rendering the main content
  if (!currentUserProfile || currentUserProfile.role !== 'admin') {
    return (
      <Layout>
        <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed shadow-sm p-8">
          <div className="flex flex-col items-center gap-1 text-center">
            <h3 className="text-2xl font-bold tracking-tight">
              Acesso Restrito
            </h3>
            <p className="text-sm text-muted-foreground">
              Você não tem permissão para acessar esta página.
            </p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Funcionários</h1>
        <Dialog open={isFormOpen} onOpenChange={(open) => {
          setIsFormOpen(open);
          if (!open) {
            setEditingEmployee(undefined);
          }
        }}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2" onClick={() => setEditingEmployee(undefined)}>
              <PlusCircle className="h-4 w-4" />
              Adicionar Funcionário
            </Button>
          </DialogTrigger>
          <EmployeeForm
            onSaveSuccess={handleSaveSuccess}
            onClose={() => setIsFormOpen(false)}
            initialData={editingEmployee}
          />
        </Dialog>
      </div>
      <div className="flex flex-1 flex-col rounded-lg border border-dashed shadow-sm p-4">
        <DataTable columns={columns} data={employees} />
      </div>
    </Layout>
  );
};

export default Employees;