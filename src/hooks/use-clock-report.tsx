"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
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
  clockEvents: ClockEvent[];
  totalMinutesWorked: number;
  totalHoursWorked: string;
  dailySummaries: DailySummary[];
  isLoading: boolean;
  fetchClockEvents: () => void;
}

const formatMinutesToHours = (totalMinutes: number): string => {
  if (totalMinutes < 0) return "0h 0m";
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}h ${minutes}m`;
};

export function useClockReport(dateRange: DateRange | undefined, employeeId?: string, isAdminViewingAll?: boolean): ClockReport {
  const { session, isLoading: sessionLoading } = useSession();
  const [clockEvents, setClockEvents] = useState<ClockEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchClockEvents = useCallback(async () => {
    const targetUserId = employeeId || session?.user?.id;

    if (!targetUserId && !isAdminViewingAll) {
      setClockEvents([]);
      setIsLoading(false); // Garante que o loading é false se não há nada para buscar
      return;
    }

    setIsLoading(true); 
    try {
      let query = supabase
        .from('pontos')
        .select('*')
        .order('timestamp_solicitado', { ascending: true });

      if (targetUserId) {
        query = query.eq('user_id', targetUserId);
      }

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

      let enrichedEvents = data;
      let employeeNamesMap = new Map<string, string>();

      if (isAdminViewingAll && data.length > 0) {
        const uniqueUserIds = Array.from(new Set(data.map(event => event.user_id)));
        const { data: profilesData, error: profilesError } = await supabase
            .from('profiles')
            .select('id, first_name, last_name')
            .in('id', uniqueUserIds);

        if (profilesError) {
            console.error("Erro ao buscar perfis para o relatório de ponto:", profilesError.message);
        } else {
            profilesData.forEach(profile => {
                employeeNamesMap.set(profile.id, `${profile.first_name || ''} ${profile.last_name || ''}`.trim());
            });
        }
      }

      const formattedEvents: ClockEvent[] = enrichedEvents.map(event => ({
        ...event,
        displayTime: new Date(event.timestamp_solicitado).toLocaleTimeString("pt-BR", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }),
        employeeName: employeeNamesMap.get(event.user_id) || undefined,
      }));
      setClockEvents(formattedEvents);
    } catch (error: any) {
      console.error("Erro ao buscar eventos de ponto:", error.message);
      toast.error("Erro ao carregar histórico de ponto: " + error.message);
      setClockEvents([]);
    } finally {
      setIsLoading(false);
    }
  }, [session, dateRange, employeeId, isAdminViewingAll]); // Removido sessionLoading daqui, pois o useEffect já o monitora

  useEffect(() => {
    // Só busca dados se a sessão não estiver carregando E (o usuário estiver logado OU for um admin visualizando todos).
    if (!sessionLoading && (session?.user?.id || isAdminViewingAll)) {
      fetchClockEvents();
    } else if (!sessionLoading && !session?.user?.id && !isAdminViewingAll) {
      // Se a sessão carregou, mas não há usuário logado e não é um admin visualizando todos,
      // então não há dados para buscar, e o estado de carregamento deve ser false.
      setClockEvents([]);
      setIsLoading(false);
    }

    window.addEventListener('supabaseDataChange', fetchClockEvents);
    return () => window.removeEventListener('supabaseDataChange', fetchClockEvents);
  }, [session, sessionLoading, employeeId, isAdminViewingAll, fetchClockEvents]); // Adicionado session, employeeId, isAdminViewingAll

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

          if (dateKey !== nextEventDateKey) {
            break;
          }

          if (nextEvent.tipo_batida === 'saida_almoco' && !lunchStart) {
            const durationBeforeLunch = differenceInMinutes(parseISO(nextEvent.timestamp_solicitado), workSegmentStart);
            if (durationBeforeLunch > 0) {
              dailyWorkMinutes[dateKey] = (dailyWorkMinutes[dateKey] || 0) + durationBeforeLunch;
            }
            lunchStart = parseISO(nextEvent.timestamp_solicitado);
          } else if (nextEvent.tipo_batida === 'volta_almoco' && lunchStart && !lunchEnd) {
            lunchEnd = parseISO(nextEvent.timestamp_solicitado);
            workSegmentStart = parseISO(nextEvent.timestamp_solicitado);
          } else if (nextEvent.tipo_batida === 'saída') {
            const durationAfterLunch = differenceInMinutes(parseISO(nextEvent.timestamp_solicitado), workSegmentStart);
            if (durationAfterLunch > 0) {
              dailyWorkMinutes[dateKey] = (dailyWorkMinutes[dateKey] || 0) + durationAfterLunch;
            }
            i = j;
            break;
          }
          if (j === sortedHistory.length - 1) {
            i = j;
          }
        }
      }
    }

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