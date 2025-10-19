"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { History, Trash2, MapPin, Camera, Loader2, UtensilsCrossed } from "lucide-react";
import { toast } from "sonner";
import { useClockReport } from "@/hooks/use-clock-report";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/integrations/supabase/auth";
import { EmployeeProfile } from "@/types/employee"; // Import EmployeeProfile

const ClockHistory = () => {
  const { session, isLoading: sessionLoading } = useSession();
  const { clockEvents: history, isLoading, fetchClockEvents } = useClockReport(undefined);
  const [currentUserProfile, setCurrentUserProfile] = useState<EmployeeProfile | null>(null);
  const [isCurrentUserProfileLoading, setIsCurrentUserProfileLoading] = useState(true);

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
          console.error("Erro ao carregar perfil do usuário atual:", error.message);
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

  const clearHistory = async () => {
    if (!session?.user?.id || currentUserProfile?.role !== 'admin') {
      toast.error("Acesso negado. Apenas administradores podem limpar o histórico.");
      return;
    }

    const loadingToastId = toast.loading("Limpando histórico...");
    try {
      const { error } = await supabase
        .from('pontos')
        .delete()
        .eq('user_id', session.user.id);

      if (error) {
        throw new Error(error.message);
      }

      toast.dismiss(loadingToastId);
      toast.info("Histórico de ponto limpo.");
      window.dispatchEvent(new Event('supabaseDataChange'));
    } catch (error: any) {
      console.error("Erro ao limpar histórico:", error.message);
      toast.dismiss(loadingToastId);
      toast.error("Erro ao limpar histórico: " + error.message);
    }
  };

  if (isLoading || isCurrentUserProfileLoading) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <History className="h-5 w-5" /> Histórico de Ponto
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-40">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  const getBadgeProps = (tipo_batida: string) => {
    switch (tipo_batida) {
      case 'entrada':
        return { text: "Entrada", className: "bg-green-500 hover:bg-green-600 text-white" };
      case 'saída':
        return { text: "Saída", className: "bg-red-500 hover:bg-red-600 text-white" };
      case 'saida_almoco':
        return { text: "Saída Almoço", className: "bg-yellow-500 hover:bg-yellow-600 text-white" };
      case 'volta_almoco':
        return { text: "Volta Almoço", className: "bg-blue-500 hover:bg-blue-600 text-white" };
      default:
        return { text: "Desconhecido", className: "bg-gray-500 hover:bg-gray-600 text-white" };
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <History className="h-5 w-5" /> Histórico de Ponto
        </CardTitle>
        {history.length > 0 && currentUserProfile?.role === 'admin' && ( // Renderiza o botão apenas para admins
          <Button variant="ghost" size="sm" onClick={clearHistory} className="text-muted-foreground hover:text-destructive">
            <Trash2 className="h-4 w-4 mr-1" /> Limpar
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {history.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Nenhum registro de ponto ainda.
          </p>
        ) : (
          <ScrollArea className="h-60 w-full rounded-md border p-4">
            <ul className="space-y-3">
              {history.map((event) => {
                const badgeProps = getBadgeProps(event.tipo_batida);
                return (
                  <li key={event.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between text-sm border-b pb-2 last:border-b-0 last:pb-0">
                    <div className="flex items-center gap-2 mb-1 sm:mb-0">
                      <span className="font-medium">
                        {format(parseISO(event.timestamp_solicitado), "dd/MM/yyyy", { locale: ptBR })}
                      </span>
                      <span className="text-muted-foreground">{event.displayTime}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="default"
                        className={badgeProps.className}
                      >
                        {badgeProps.text}
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
                );
              })}
            </ul>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
};

export default ClockHistory;