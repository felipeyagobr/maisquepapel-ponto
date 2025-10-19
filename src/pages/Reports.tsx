"use client";

import { useState, useEffect } from "react";
import Layout from "@/components/layout/Layout";
import { DateRangePicker } from "@/components/DateRangePicker";
import { DateRange } from "react-day-picker";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useClockReport } from "@/hooks/use-clock-report";
import { Loader2, Clock, History, MapPin, Camera, Users } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/integrations/supabase/auth";
import { EmployeeProfile } from "@/types/employee";
import { toast } from "sonner";

const Reports = () => {
  const { session, isLoading: sessionLoading } = useSession();
  const [currentUserProfile, setCurrentUserProfile] = useState<EmployeeProfile | null>(null);
  const [isCurrentUserProfileLoading, setIsCurrentUserProfileLoading] = useState(true);
  const [allEmployees, setAllEmployees] = useState<EmployeeProfile[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | undefined>(undefined);

  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const { totalHoursWorked, dailySummaries, clockEvents, isLoading } = useClockReport(dateRange, selectedEmployeeId);

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
          // Set initial selected employee to current user if not admin
          if (data.role === 'employee') {
            setSelectedEmployeeId(data.id);
          }
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

  // Effect to fetch all employees if current user is admin
  useEffect(() => {
    const fetchAllEmployees = async () => {
      if (currentUserProfile?.role === 'admin' && session?.access_token) {
        const MANAGE_USERS_EDGE_FUNCTION_URL = `https://dpmlhdbqzejijhnabges.supabase.co/functions/v1/manage-users`;
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
          setAllEmployees(data);
          // Set initial selected employee to the first one or current user if admin
          if (!selectedEmployeeId && data.length > 0) {
            setSelectedEmployeeId(data[0].id);
          }
        } catch (error: any) {
          toast.error("Erro ao carregar lista de funcionários: " + error.message);
        }
      }
    };

    if (!isCurrentUserProfileLoading && currentUserProfile?.role === 'admin') {
      fetchAllEmployees();
    }
  }, [isCurrentUserProfileLoading, currentUserProfile, session?.access_token, selectedEmployeeId]);

  if (sessionLoading || isCurrentUserProfileLoading) {
    return (
      <Layout>
        <div className="flex flex-1 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <h1 className="text-2xl font-bold mb-4">Relatórios de Ponto</h1>
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <DateRangePicker date={dateRange} setDate={setDateRange} />
          {currentUserProfile?.role === 'admin' && (
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Users className="h-4 w-4 text-muted-foreground" />
              <Select
                onValueChange={(value) => setSelectedEmployeeId(value === "all" ? undefined : value)}
                value={selectedEmployeeId || (currentUserProfile?.role === 'admin' ? "all" : currentUserProfile?.id)}
              >
                <SelectTrigger className="w-full sm:w-[200px]">
                  <SelectValue placeholder="Selecionar Funcionário" />
                </SelectTrigger>
                <SelectContent>
                  {/* Option to view all employees' reports (if applicable, or just current user's) */}
                  {currentUserProfile?.role === 'admin' && (
                    <SelectItem value="all">Todos os Funcionários</SelectItem>
                  )}
                  {allEmployees.map((employee) => (
                    <SelectItem key={employee.id} value={employee.id}>
                      {employee.first_name} {employee.last_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total de Horas Trabalhadas
              </CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center h-10">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                </div>
              ) : (
                <div className="text-2xl font-bold">{totalHoursWorked}</div>
              )}
              <p className="text-xs text-muted-foreground">
                {dateRange?.from && dateRange?.to
                  ? `No período de ${format(dateRange.from, "dd/MM/yyyy", { locale: ptBR })} a ${format(dateRange.to, "dd/MM/yyyy", { locale: ptBR })}`
                  : "Selecione um período para ver o total."}
              </p>
            </CardContent>
          </Card>
          {/* Add more summary cards here if needed */}
        </div>

        <Card className="flex-1">
          <CardHeader>
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <History className="h-5 w-5" /> Registros Diários
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center h-40">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : dailySummaries.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nenhum registro de ponto encontrado para o período selecionado.
              </p>
            ) : (
              <ScrollArea className="h-[300px] w-full rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead className="text-right">Horas Trabalhadas</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dailySummaries.map((summary) => (
                      <TableRow key={summary.date}>
                        <TableCell className="font-medium">
                          {format(parseISO(summary.date), "dd/MM/yyyy", { locale: ptBR })}
                        </TableCell>
                        <TableCell className="text-right">{summary.totalHours}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            )}
          </CardContent>
        </Card>

        <Card className="flex-1">
          <CardHeader>
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <History className="h-5 w-5" /> Eventos de Ponto Detalhados
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center h-40">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : clockEvents.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nenhum evento de ponto encontrado para o período selecionado.
              </p>
            ) : (
              <ScrollArea className="h-[300px] w-full rounded-md border p-4">
                <ul className="space-y-3">
                  {clockEvents.map((event) => (
                    <li key={event.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between text-sm border-b pb-2 last:border-b-0 last:pb-0">
                      <div className="flex items-center gap-2 mb-1 sm:mb-0">
                        <span className="font-medium">
                          {format(parseISO(event.timestamp_solicitado), "dd/MM/yyyy", { locale: ptBR })}
                        </span>
                        <span className="text-muted-foreground">{event.displayTime}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={event.tipo_batida === 'entrada' ? "default" : "secondary"}
                          className={event.tipo_batida === 'entrada' ? "bg-green-500 hover:bg-green-600 text-white" : "bg-red-500 hover:bg-red-600 text-white"}
                        >
                          {event.tipo_batida === 'entrada' ? "Entrada" : "Saída"}
                        </Badge>
                        {event.latitude && event.longitude && (
                          <a
                            href={`https://www.google.com/maps/search/?api=1&query=${event.latitude},${event.longitude}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-500 hover:text-blue-700"
                            title="Ver Localização"
                          >
                            <MapPin className="h-4 w-4" />
                          </a>
                        )}
                        {event.foto_url && (
                          <a
                            href={event.foto_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-500 hover:text-blue-700"
                            title="Ver Foto"
                          >
                            <Camera className="h-4 w-4" />
                          </a>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default Reports;