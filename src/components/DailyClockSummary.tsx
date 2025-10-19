"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Clock, Loader2 } from "lucide-react";
import { useClockReport } from "@/hooks/use-clock-report";
import { DateRange } from "react-day-picker";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ClockEvent } from "@/types/clock";

const DailyClockSummary = () => {
  const today: DateRange = {
    from: new Date(),
    to: new Date(),
  };
  const { totalHoursWorked, dailySummaries, isLoading } = useClockReport(today);
  const [currentDayEvents, setCurrentDayEvents] = useState<ClockEvent[]>([]);

  // Function to load all history and filter for today's events
  const loadCurrentDayEvents = () => {
    if (typeof window !== 'undefined') {
      const storedHistory = localStorage.getItem("clockHistory");
      const allEvents: ClockEvent[] = storedHistory ? JSON.parse(storedHistory) : [];
      
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date();
      todayEnd.setHours(23, 59, 59, 999);

      const filteredEvents = allEvents.filter(event => {
        const eventDate = parseISO(event.timestamp);
        return eventDate >= todayStart && eventDate <= todayEnd;
      });
      
      // Sort events by timestamp in ascending order for display
      const sortedEvents = filteredEvents.sort((a, b) => 
        parseISO(a.timestamp).getTime() - parseISO(b.timestamp).getTime()
      );
      setCurrentDayEvents(sortedEvents);
    }
  };

  useEffect(() => {
    loadCurrentDayEvents();
    // Listen for changes in localStorage from other components
    window.addEventListener('localStorageChange', loadCurrentDayEvents);
    return () => window.removeEventListener('localStorageChange', loadCurrentDayEvents);
  }, []);

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
            <ul className="space-y-2">
              {currentDayEvents.map((event) => (
                <li key={event.id} className="flex items-center justify-between text-sm">
                  <span className="font-medium">
                    {event.displayTime}
                  </span>
                  <Badge
                    variant={event.type === 'entrada' ? "default" : "secondary"}
                    className={event.type === 'entrada' ? "bg-green-500 hover:bg-green-600 text-white" : "bg-red-500 hover:bg-red-600 text-white"}
                  >
                    {event.type === 'entrada' ? "Entrada" : "Saída"}
                  </Badge>
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