"use client";

import { useState, useEffect, useMemo } from "react";
import { DateRange } from "react-day-picker";
import { isWithinInterval, parseISO, differenceInMinutes, startOfDay, endOfDay } from "date-fns";
import { ClockEvent } from "@/types/clock";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/integrations/supabase/auth";
import { toast } from "sonner";

interface DailySummary {
  date: string; // YYYY-MM-DD
  totalMinutes: number;
  totalHours: string;
}

interface ClockReport {
  clockEvents: ClockEvent[]; // Adiciona os eventos brutos para uso em outros componentes
  totalMinutesWorked: number;
  totalHoursWorked: string;
  dailySummaries: DailySummary[];
  isLoading: boolean;
  fetchClockEvents: () => void; // Adiciona função para refetch manual
}

const formatMinutesToHours = (totalMinutes: number): string => {
  if (totalMinutes < 0) return "0h 0m";
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}h ${minutes}m`;
};

// Constantes para a lógica do almoço
const LUNCH_THRESHOLD_MINUTES = 360; // 6 horas
const LUNCH_DEDUCTION_MINUTES = 60; // 1 hora

export function useClockReport(dateRange: DateRange | undefined, employeeId?: string): ClockReport {
  const { session } = useSession();
  const [clockEvents, setClockEvents] = useState<ClockEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchClockEvents = async () => {
    // Determine the user ID to fetch reports for
    const targetUserId = employeeId || session?.user?.id;

    if (!targetUserId) {
      setClockEvents([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      let query = supabase
        .from('pontos')
        .select('*')
        .eq('user_id', targetUserId) // Use targetUserId here
        .order('timestamp_solicitado', { ascending: false }); // Busca em ordem decrescente para exibição

      if (dateRange?.from && dateRange?.to) {
        const start = startOfDay(dateRange.from).toISOString();
        const end = endOfDay(dateRange.to).toISOString();
        query = query.gte('timestamp_solicitado', start).lte('timestamp_solicitado', end);
      } else if (dateRange?.from) {
        const start = startOfDay(dateRange.from).toISOString();
        const end = endOfDay(dateRange.from).toISOString();
        query = query.gte('timestamp_solicitado', start).lte('timestamp_solicitado', end);
      }

      const { data, error } = await query;

      if (error) {
        throw new Error(error.message);
      }

      const formattedEvents: ClockEvent[] = data.map(event => ({
        ...event,
        displayTime: new Date(event.timestamp_solicitado).toLocaleTimeString("pt-BR", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }),
      }));
      setClockEvents(formattedEvents);
    } catch (error: any) {
      console.error("Erro ao buscar eventos de ponto:", error.message);
      toast.error("Erro ao carregar histórico de ponto: " + error.message);
      setClockEvents([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchClockEvents();
    // Escuta por evento customizado para refetch de dados quando um ponto é registrado
    window.addEventListener('supabaseDataChange', fetchClockEvents);
    return () => window.removeEventListener('supabaseDataChange', fetchClockEvents);
  }, [session, dateRange, employeeId]); // Adiciona employeeId como dependência

  const { totalMinutesWorked, dailySummaries } = useMemo(() => {
    if (isLoading || !clockEvents.length) {
      return { totalMinutesWorked: 0, dailySummaries: [] };
    }

    // Ordena o histórico por timestamp em ordem crescente para cálculos de processamento
    const sortedHistory = [...clockEvents].sort((a, b) =>
      parseISO(a.timestamp_solicitado).getTime() - parseISO(b.timestamp_solicitado).getTime()
    );

    const dailyWorkMinutes: { [key: string]: number } = {};
    let totalWorkMinutes = 0;

    for (let i = 0; i < sortedHistory.length; i++) {
      const currentEvent = sortedHistory[i];
      if (currentEvent.tipo_batida === 'entrada') {
        // Procura pelo próximo evento de 'saída'
        let nextSaidaIndex = -1;
        for (let j = i + 1; j < sortedHistory.length; j++) {
          // Garante que a 'saída' seja no mesmo dia da 'entrada' para cálculo diário
          const entradaDay = parseISO(currentEvent.timestamp_solicitado).toISOString().split('T')[0];
          const saidaDay = parseISO(sortedHistory[j].timestamp_solicitado).toISOString().split('T')[0];

          if (sortedHistory[j].tipo_batida === 'saída' && entradaDay === saidaDay) {
            nextSaidaIndex = j;
            break;
          }
        }

        if (nextSaidaIndex !== -1) {
          const entradaTime = parseISO(currentEvent.timestamp_solicitado);
          const saidaTime = parseISO(sortedHistory[nextSaidaIndex].timestamp_solicitado);

          const duration = differenceInMinutes(saidaTime, entradaTime);
          if (duration > 0) {
            const dateKey = entradaTime.toISOString().split('T')[0]; // YYYY-MM-DD
            dailyWorkMinutes[dateKey] = (dailyWorkMinutes[dateKey] || 0) + duration;
          }
          i = nextSaidaIndex; // Pula para o evento de 'saída'
        }
      }
    }

    // Aplicar a lógica de dedução do almoço
    for (const dateKey in dailyWorkMinutes) {
      if (dailyWorkMinutes[dateKey] >= LUNCH_THRESHOLD_MINUTES) {
        dailyWorkMinutes[dateKey] = Math.max(0, dailyWorkMinutes[dateKey] - LUNCH_DEDUCTION_MINUTES);
      }
      totalWorkMinutes += dailyWorkMinutes[dateKey];
    }

    const aggregatedDailySummaries: DailySummary[] = Object.keys(dailyWorkMinutes)
      .sort() // Ordena por data
      .map(dateKey => ({
        date: dateKey,
        totalMinutes: dailyWorkMinutes[dateKey],
        totalHours: formatMinutesToHours(dailyWorkMinutes[dateKey]),
      }));

    return {
      totalMinutesWorked: totalWorkMinutes,
      dailySummaries: aggregatedDailySummaries,
    };
  }, [clockEvents, dateRange, isLoading]);

  const totalHoursWorked = formatMinutesToHours(totalMinutesWorked);

  return {
    clockEvents,
    totalMinutesWorked,
    totalHoursWorked,
    dailySummaries,
    isLoading,
    fetchClockEvents,
  };
}