"use client";

import { useEffect, useState, useMemo } from "react";
import Layout from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { PlusCircle, Loader2 } from "lucide-react";
import { DataTable } from "@/components/data-table/DataTable";
import { createColumns } from "./employees/columns";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"; // Import Dialog components
import EmployeeForm from "@/components/EmployeeForm";
import EmployeeScheduleForm from "@/components/EmployeeScheduleForm"; // Import the new schedule form
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { EmployeeProfile } from "@/types/employee";
import { useSession } from "@/integrations/supabase/auth";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";

const Employees = () => {
  const [employees, setEmployees] = useState<EmployeeProfile[]>([]);
  const [isEmployeeFormOpen, setIsEmployeeFormOpen] = useState(false);
  const [isScheduleFormOpen, setIsScheduleFormOpen] = useState(false); // New state for schedule form
  const [editingEmployee, setEditingEmployee] = useState<EmployeeProfile | undefined>(undefined);
  const [managingScheduleEmployee, setManagingScheduleEmployee] = useState<EmployeeProfile | undefined>(undefined); // New state for schedule management
  const [isLoadingEmployees, setIsLoadingEmployees] = useState(true);
  const [currentUserProfile, setCurrentUserProfile] = useState<EmployeeProfile | null>(null);
  const [isCurrentUserProfileLoading, setIsCurrentUserProfileLoading] = useState(true);

  const { session, isLoading: sessionLoading } = useSession();
  const navigate = useNavigate();

  console.log("Employees component rendered. isEmployeeFormOpen:", isEmployeeFormOpen); // Log 1

  // URL da Edge Function (substitua 'dpmlhdbqzejijhnabges' pelo seu Project ID do Supabase)
  const MANAGE_USERS_EDGE_FUNCTION_URL = `https://dpmlhdbqzejijhnabges.supabase.co/functions/v1/manage-users`;

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
    if (!session?.access_token) {
      toast.error("Sessão não encontrada. Por favor, faça login novamente.");
      setIsLoadingEmployees(false);
      return;
    }

    try {
      const response = await fetch(MANAGE_USERS_EDGE_FUNCTION_URL, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao carregar funcionários.');
      }

      const data: EmployeeProfile[] = await response.json();
      setEmployees(data);
    } catch (error: any) {
      toast.error("Erro ao carregar funcionários: " + error.message);
    } finally {
      setIsLoadingEmployees(false);
    }
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
  }, [isCurrentUserProfileLoading, currentUserProfile, navigate, session?.access_token]);

  const handleEmployeeSaveSuccess = () => {
    fetchEmployees();
    setIsEmployeeFormOpen(false);
    setEditingEmployee(undefined);
  };

  const handleScheduleSaveSuccess = () => {
    // No need to refetch employees, just close the dialog
    setIsScheduleFormOpen(false);
    setManagingScheduleEmployee(undefined);
    toast.success("Expediente salvo com sucesso!");
  };

  const handleEditClick = (employee: EmployeeProfile) => {
    setEditingEmployee(employee);
    setIsEmployeeFormOpen(true);
  };

  const handleManageScheduleClick = (employee: EmployeeProfile) => {
    setManagingScheduleEmployee(employee);
    setIsScheduleFormOpen(true);
  };

  const handleDeleteEmployee = async (id: string) => {
    if (!session?.access_token) {
      toast.error("Sessão não encontrada. Por favor, faça login novamente.");
      return;
    }

    try {
      const response = await fetch(MANAGE_USERS_EDGE_FUNCTION_URL, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: id }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao excluir funcionário.');
      }

      toast.success("Funcionário excluído com sucesso!");
      fetchEmployees();
    } catch (error: any) {
      toast.error("Erro ao excluir funcionário: " + error.message);
    }
  };

  const columns = useMemo(() => createColumns({
    onEdit: handleEditClick,
    onDelete: handleDeleteEmployee,
    onManageSchedule: handleManageScheduleClick, // Pass the new handler
  }), [employees, session?.access_token]);

  const handleAddEmployeeClick = () => {
    console.log("Add Employee button clicked!"); // Log 2
    setEditingEmployee(undefined);
    setIsEmployeeFormOpen(true);
  };

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
        <Dialog open={isEmployeeFormOpen} onOpenChange={(open) => {
          console.log("Dialog onOpenChange:", open); // Log 3
          setIsEmployeeFormOpen(open);
          if (!open) {
            setEditingEmployee(undefined);
          }
        }}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2" onClick={handleAddEmployeeClick}>
              <PlusCircle className="h-4 w-4" />
              Adicionar Funcionário
            </Button>
          </DialogTrigger>
          <EmployeeForm
            onSaveSuccess={handleEmployeeSaveSuccess}
            onClose={() => setIsEmployeeFormOpen(false)}
            initialData={editingEmployee}
          />
        </Dialog>

        {/* Dialog for Employee Schedule Form */}
        <Dialog open={isScheduleFormOpen} onOpenChange={(open) => {
          setIsScheduleFormOpen(open);
          if (!open) {
            setManagingScheduleEmployee(undefined);
          }
        }}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Gerenciar Expediente</DialogTitle>
              <DialogDescription>
                Defina os horários de trabalho para {managingScheduleEmployee?.first_name} {managingScheduleEmployee?.last_name}.
              </DialogDescription>
            </DialogHeader>
            {managingScheduleEmployee && (
              <EmployeeScheduleForm
                employee={managingScheduleEmployee}
                onSaveSuccess={handleScheduleSaveSuccess}
              />
            )}
          </DialogContent>
        </Dialog>
      </div>
      <Card className="flex-1">
        <CardContent className="p-4">
          <DataTable columns={columns} data={employees} />
        </CardContent>
      </Card>
    </Layout>
  );
};

export default Employees;