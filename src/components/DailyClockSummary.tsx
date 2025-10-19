"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Clock, Loader2, MapPin, Camera } from "lucide-react";
import { useClockReport } from "@/hooks/use-clock-report";
import { DateRange } from "react-day-picker";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

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

const DailyClockSummary = () => {
  const today: DateRange = {
    from: new Date(),
    to: new Date(),
  };
  const { totalHoursWorked, clockEvents, isLoading } = useClockReport(today);

  return (
    <Card className="w-full shadow-md hover:shadow-lg transition-shadow duration-300 ease-in-out">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-xl font-semibold flex items-center gap-2 text-primary dark:text-primary-foreground">
          <Clock className="h-6 w-6" /> Ponto de Hoje
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-6 border-b pb-4">
          <p className="text-sm text-muted-foreground mb-1">Total de Horas Trabalhadas Hoje:</p>
          {isLoading ? (
            <div className="flex items-center justify-center h-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : (
            <p className="text-3xl font-bold text-primary dark:text-primary-foreground">
              {totalHoursWorked}
            </p>
          )}
        </div>

        <h3 className="text-lg font-semibold mb-3 text-foreground">Registros do Dia:</h3>
        {isLoading ? (
          <div className="flex items-center justify-center h-40">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : clockEvents.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Nenhum registro de ponto para hoje.
          </p>
        ) : (
          <ScrollArea className="h-40 w-full rounded-md border p-4 bg-muted/20 dark:bg-muted/10">
            <ul className="space-y-3">
              {clockEvents.map((event) => {
                const badgeProps = getBadgeProps(event.tipo_batida);
                return (
                  <li key={event.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between text-sm border-b border-border/50 pb-2 last:border-b-0 last:pb-0">
                    <div className="flex items-center gap-2 mb-1 sm:mb-0">
                      <span className="font-medium text-foreground">
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
                          className="text-blue-500 hover:text-blue-700 transition-colors duration-200"
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
                          className="text-blue-500 hover:text-blue-700 transition-colors duration-200"
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

export default DailyClockSummary;