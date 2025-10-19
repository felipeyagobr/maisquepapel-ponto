"use client";

import { useEffect, useState, useMemo } from "react";
import Layout from "@/components/layout/Layout";
import { Loader2, CheckCircle2 } from "lucide-react"; // Adicionado CheckCircle2
import { DataTable } from "@/components/data-table/DataTable";
import { createPontoApprovalColumns } from "./ponto-approval/columns";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/integrations/supabase/auth";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { ClockEvent } from "@/types/clock";
import { EmployeeProfile } from "@/types/employee"; // Import EmployeeProfile

const PontoApproval = () => {
  const [pendingPontos, setPendingPontos] = useState<ClockEvent[]>([]);
  const [isLoadingPontos, setIsLoadingPontos] = useState(true);
  const [currentUserProfile, setCurrentUserProfile] = useState<EmployeeProfile | null>(null);
  const [isCurrentUserProfileLoading, setIsCurrentUserProfileLoading] = useState(true);
  const [employeeNames, setEmployeeNames] = useState<Map<string, string>>(new Map()); // Map to store employee names

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

  const fetchPendingPontos = async () => {
    setIsLoadingPontos(true);
    if (!session?.user?.id) {
      setPendingPontos([]);
      setIsLoadingPontos(false);
      return;
    }

    try {
      const { data: pontos, error: pontosError } = await supabase
        .from('pontos')
        .select('*')
        .eq('status', 'pendente')
        .order('timestamp_solicitado', { ascending: true });

      if (pontosError) {
        throw new Error(pontosError.message);
      }

      setPendingPontos(pontos);

      // Fetch employee names for the pending pontos
      const userIds = Array.from(new Set(pontos.map(p => p.user_id)));
      if (userIds.length > 0) {
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('id, first_name, last_name')
          .in('id', userIds);

        if (profilesError) {
          console.error("Erro ao buscar perfis de funcionários:", profilesError.message);
          // Continue without names if there's an error
        } else {
          const namesMap = new Map<string, string>();
          profiles.forEach(profile => {
            namesMap.set(profile.id, `${profile.first_name || ''} ${profile.last_name || ''}`.trim());
          });
          setEmployeeNames(namesMap);
        }
      }

    } catch (error: any) {
      toast.error("Erro ao carregar pontos pendentes: " + error.message);
      setPendingPontos([]);
    } finally {
      setIsLoadingPontos(false);
    }
  };

  useEffect(() => {
    if (!isCurrentUserProfileLoading && currentUserProfile?.role === 'admin') {
      fetchPendingPontos();
    } else if (!isCurrentUserProfileLoading && currentUserProfile?.role !== 'admin') {
      toast.error("Acesso negado. Apenas administradores podem aprovar pontos.");
      navigate('/');
    }
  }, [isCurrentUserProfileLoading, currentUserProfile, navigate]);

  const handlePontoAction = async (pontoId: string, status: 'aprovado' | 'rejeitado') => {
    if (!session?.user?.id) {
      toast.error("Sessão não encontrada. Por favor, faça login novamente.");
      return;
    }

    const actionText = status === 'aprovado' ? "Aprovando" : "Rejeitando";
    const loadingToastId = toast.loading(`${actionText} ponto...`);

    try {
      const { error } = await supabase
        .from('pontos')
        .update({
          status: status,
          timestamp_aprovado: new Date().toISOString(),
          admin_id: session.user.id,
        })
        .eq('id', pontoId);

      if (error) {
        throw new Error(error.message);
      }

      toast.dismiss(loadingToastId);
      toast.success(`Ponto ${status} com sucesso!`);
      fetchPendingPontos(); // Refetch to update the list
      window.dispatchEvent(new Event('supabaseDataChange')); // Notify other components
    } catch (error: any) {
      toast.dismiss(loadingToastId);
      toast.error(`Erro ao ${actionText.toLowerCase()} ponto: ` + error.message);
    }
  };

  const columns = useMemo(() => {
    const baseColumns = createPontoApprovalColumns({
      onApprove: (id) => handlePontoAction(id, 'aprovado'),
      onReject: (id) => handlePontoAction(id, 'rejeitado'),
      employeeNames: employeeNames, // Passar employeeNames aqui
    });

    // Override the 'user_id' column to display employee name
    return baseColumns.map(col => {
      if (col.id === 'user_id') { // Usar col.id em vez de col.accessorKey
        return {
          ...col,
          cell: ({ row }) => {
            const employeeName = employeeNames.get(row.original.user_id);
            return employeeName || row.original.user_id.substring(0, 8) + '...';
          },
        };
      }
      return col;
    });
  }, [pendingPontos, employeeNames, session?.user?.id]); // Re-memoize if pendingPontos or employeeNames change

  if (sessionLoading || isCurrentUserProfileLoading || isLoadingPontos) {
    return (
      <Layout>
        <div className="flex flex-1 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

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
        <h1 className="text-2xl font-bold">Aprovação de Ponto</h1>
      </div>
      <Card className="flex-1">
        <CardContent className="p-4">
          {pendingPontos.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-60 text-center text-muted-foreground">
              <CheckCircle2 className="h-12 w-12 mb-4 text-green-500" />
              <p className="text-lg font-semibold">Nenhum ponto pendente para aprovação.</p>
              <p className="text-sm">Todos os registros estão em dia!</p>
            </div>
          ) : (
            <DataTable columns={columns} data={pendingPontos} />
          )}
        </CardContent>
      </Card>
    </Layout>
  );
};

export default PontoApproval;