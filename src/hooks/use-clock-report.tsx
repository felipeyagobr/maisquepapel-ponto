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

export function useClockReport(dateRange: DateRange | undefined, employeeId?: string): ClockReport {
  const { session } = useSession();
  const [clockEvents, setClockEvents] = useState<ClockEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchClockEvents = async () => {
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
        .eq('user_id', targetUserId)
        .order('timestamp_solicitado', { ascending: false });

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
    window.addEventListener('supabaseDataChange', fetchClockEvents);
    return () => window.removeEventListener('supabaseDataChange', fetchClockEvents);
  }, [session, dateRange, employeeId]);

  const { totalMinutesWorked, dailySummaries } = useMemo(() => {
    if (isLoading || !clockEvents.length) {
      return { totalMinutesWorked: 0, dailySummaries: [] };
    }

    const sortedHistory = [...clockEvents].sort((a, b) =>
      parseISO(a.timestamp_solicitado).getTime() - parseISO(b.timestamp_solicitado).getTime()
    );

    const dailyWorkMinutes: { [key: string]: number } = {};
    let totalWorkMinutes = 0;

    for (let i = 0; i < sortedHistory.length; i++) {
      const currentEvent = sortedHistory[i];
      const dateKey = parseISO(currentEvent.timestamp_solicitado).toISOString().split('T')[0];

      if (currentEvent.tipo_batida === 'entrada') {
        let workSegmentStart = parseISO(currentEvent.timestamp_solicitado);
        let lunchStart: Date | null = null;
        let lunchEnd: Date | null = null;

        for (let j = i + 1; j < sortedHistory.length; j++) {
          const nextEvent = sortedHistory[j];
          const nextEventDateKey = parseISO(nextEvent.timestamp_solicitado).toISOString().split('T')[0];

          // Process events only within the same day
          if (dateKey !== nextEventDateKey) {
            break;
          }

          if (nextEvent.tipo_batida === 'saida_almoco' && !lunchStart) {
            // Calculate work duration before lunch
            const durationBeforeLunch = differenceInMinutes(parseISO(nextEvent.timestamp_solicitado), workSegmentStart);
            if (durationBeforeLunch > 0) {
              dailyWorkMinutes[dateKey] = (dailyWorkMinutes[dateKey] || 0) + durationBeforeLunch;
            }
            lunchStart = parseISO(nextEvent.timestamp_solicitado);
          } else if (nextEvent.tipo_batida === 'volta_almoco' && lunchStart && !lunchEnd) {
            lunchEnd = parseISO(nextEvent.timestamp_solicitado);
            workSegmentStart = parseISO(nextEvent.timestamp_solicitado); // New work segment starts after lunch
          } else if (nextEvent.tipo_batida === 'saída') {
            // Calculate work duration after lunch (or if no lunch was taken)
            const durationAfterLunch = differenceInMinutes(parseISO(nextEvent.timestamp_solicitado), workSegmentStart);
            if (durationAfterLunch > 0) {
              dailyWorkMinutes[dateKey] = (dailyWorkMinutes[dateKey] || 0) + durationAfterLunch;
            }
            i = j; // Move index to the 'saída' event
            break;
          }
          // If we reach the end of the day without a 'saída', the last segment is considered open.
          // For simplicity, we only calculate completed segments.
          if (j === sortedHistory.length - 1) {
            i = j; // Ensure we don't re-process this 'entrada'
          }
        }
      }
    }

    // Sum up all daily work minutes for total
    for (const dateKey in dailyWorkMinutes) {
      totalWorkMinutes += dailyWorkMinutes[dateKey];
    }

    const aggregatedDailySummaries: DailySummary[] = Object.keys(dailyWorkMinutes)
      .sort()
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