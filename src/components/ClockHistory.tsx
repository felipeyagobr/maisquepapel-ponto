"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { History, Trash2, MapPin, Camera, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useClockReport } from "@/hooks/use-clock-report";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/integrations/supabase/auth";

const ClockHistory = () => {
  const { session } = useSession();
  const { clockEvents: history, isLoading, fetchClockEvents } = useClockReport(undefined); // Busca todo o histórico

  const clearHistory = async () => {
    if (!session?.user?.id) {
      toast.error("Você precisa estar logado para limpar o histórico.");
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
      window.dispatchEvent(new Event('supabaseDataChange')); // Notifica outros componentes
    } catch (error: any) {
      console.error("Erro ao limpar histórico:", error.message);
      toast.dismiss(loadingToastId);
      toast.error("Erro ao limpar histórico: " + error.message);
    }
  };

  if (isLoading) {
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

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <History className="h-5 w-5" /> Histórico de Ponto
        </CardTitle>
        {history.length > 0 && (
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
              {history.map((event) => (
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
  );
};

export default ClockHistory;