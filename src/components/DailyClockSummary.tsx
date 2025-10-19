"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Clock, Loader2, MapPin, Camera } from "lucide-react";
import { useClockReport } from "@/hooks/use-clock-report";
import { DateRange } from "react-day-picker";
import { format, parseISO } from "date-fns"; // Adicionado parseISO
import { ptBR } from "date-fns/locale";
import { ClockEvent } from "@/types/clock";
import { useSession } from "@/integrations/supabase/auth";
import { supabase } from "@/integrations/supabase/client";

const DailyClockSummary = () => {
  const { session } = useSession();
  const today: DateRange = {
    from: new Date(),
    to: new Date(),
  };
  const { totalHoursWorked, dailySummaries, isLoading } = useClockReport(today);
  const [currentDayEvents, setCurrentDayEvents] = useState<ClockEvent[]>([]);

  const fetchCurrentDayEvents = async () => {
    if (!session?.user?.id) {
      setCurrentDayEvents([]);
      return;
    }

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    try {
      const { data, error } = await supabase
        .from('pontos')
        .select('*')
        .eq('user_id', session.user.id)
        .gte('timestamp_solicitado', todayStart.toISOString())
        .lte('timestamp_solicitado', todayEnd.toISOString())
        .order('timestamp_solicitado', { ascending: true }); // Ordena em ordem crescente para exibição cronológica

      if (error) {
        throw new Error(error.message);
      }

      const formattedEvents: ClockEvent[] = data.map(event => ({
        ...event,
        // Usar parseISO e format para consistência com date-fns
        displayTime: format(parseISO(event.timestamp_solicitado), "HH:mm:ss", { locale: ptBR }),
      }));
      setCurrentDayEvents(formattedEvents);
    } catch (error: any) {
      console.error("Erro ao buscar eventos do dia:", error.message);
      toast.error("Erro ao carregar registros do dia: " + error.message);
      setCurrentDayEvents([]);
    }
  };

  useEffect(() => {
    fetchCurrentDayEvents();
    window.addEventListener('supabaseDataChange', fetchCurrentDayEvents);
    return () => window.removeEventListener('supabaseDataChange', fetchCurrentDayEvents);
  }, [session]);

  const todaySummary = dailySummaries.find(
    (summary) => summary.date === format(new Date(), "yyyy-MM-dd")
  );

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <Clock className="h-5 w-5" /> Ponto de Hoje
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <p className="text-sm text-muted-foreground">Total de Horas Trabalhadas Hoje:</p>
          {isLoading ? (
            <div className="flex items-center justify-center h-8">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
            </div>
          ) : (
            <p className="text-2xl font-bold text-primary">
              {todaySummary ? todaySummary.totalHours : "0h 0m"}
            </p>
          )}
        </div>

        <h3 className="text-md font-semibold mb-2">Registros do Dia:</h3>
        {isLoading ? (
          <div className="flex items-center justify-center h-40">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : currentDayEvents.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Nenhum registro de ponto para hoje.
          </p>
        ) : (
          <ScrollArea className="h-40 w-full rounded-md border p-4">
            <ul className="space-y-3">
              {currentDayEvents.map((event) => (
                <li key={event.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between text-sm border-b pb-2 last:border-b-0 last:pb-0">
                  <span className="font-medium">
                    {event.displayTime}
                  </span>
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

export default DailyClockSummary;