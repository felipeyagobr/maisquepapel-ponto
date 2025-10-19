"use client";

import { useState, useEffect, useMemo } from "react";
import { DateRange } from "react-day-picker";
import { isWithinInterval, parseISO, differenceInMinutes, startOfDay, endOfDay } from "date-fns";
import { ClockEvent } from "@/types/clock";

interface DailySummary {
  date: string; // YYYY-MM-DD
  totalMinutes: number;
  totalHours: string;
}

interface ClockReport {
  totalMinutesWorked: number;
  totalHoursWorked: string;
  dailySummaries: DailySummary[];
  isLoading: boolean;
}

const formatMinutesToHours = (totalMinutes: number): string => {
  if (totalMinutes < 0) return "0h 0m";
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}h ${minutes}m`;
};

export function useClockReport(dateRange: DateRange | undefined): ClockReport {
  const [clockHistory, setClockHistory] = useState<ClockEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Function to load history from localStorage
  const loadHistory = () => {
    if (typeof window !== 'undefined') {
      const storedHistory = localStorage.getItem("clockHistory");
      setClockHistory(storedHistory ? JSON.parse(storedHistory) : []);
    }
    setIsLoading(false);
  };

  // Effect to load history when component mounts
  useEffect(() => {
    loadHistory();
  }, []);

  // Effect to listen for changes in localStorage from other components
  useEffect(() => {
    window.addEventListener('localStorageChange', loadHistory);
    return () => window.removeEventListener('localStorageChange', loadHistory);
  }, []);

  const { totalMinutesWorked, dailySummaries } = useMemo(() => {
    if (isLoading || !clockHistory.length) {
      return { totalMinutesWorked: 0, dailySummaries: [] };
    }

    let filteredHistory = clockHistory;
    if (dateRange?.from && dateRange?.to) {
      const start = startOfDay(dateRange.from);
      const end = endOfDay(dateRange.to);
      filteredHistory = clockHistory.filter(event =>
        isWithinInterval(parseISO(event.timestamp), { start, end })
      );
    } else if (dateRange?.from) { // If only 'from' date is selected, consider it a single day
      const start = startOfDay(dateRange.from);
      const end = endOfDay(dateRange.from);
      filteredHistory = clockHistory.filter(event =>
        isWithinInterval(parseISO(event.timestamp), { start, end })
      );
    }

    // Sort history by timestamp in ascending order for processing
    const sortedHistory = [...filteredHistory].sort((a, b) =>
      parseISO(a.timestamp).getTime() - parseISO(b.timestamp).getTime()
    );

    const dailyWorkMinutes: { [key: string]: number } = {};
    let totalWorkMinutes = 0;

    for (let i = 0; i < sortedHistory.length; i++) {
      const currentEvent = sortedHistory[i];
      if (currentEvent.type === 'entrada') {
        // Look for the next 'saída' event
        let nextSaidaIndex = -1;
        for (let j = i + 1; j < sortedHistory.length; j++) {
          if (sortedHistory[j].type === 'saída') {
            nextSaidaIndex = j;
            break;
          }
        }

        if (nextSaidaIndex !== -1) {
          const entradaTime = parseISO(currentEvent.timestamp);
          const saidaTime = parseISO(sortedHistory[nextSaidaIndex].timestamp);

          const duration = differenceInMinutes(saidaTime, entradaTime);
          if (duration > 0) {
            totalWorkMinutes += duration;

            const dateKey = entradaTime.toISOString().split('T')[0]; // YYYY-MM-DD
            dailyWorkMinutes[dateKey] = (dailyWorkMinutes[dateKey] || 0) + duration;
          }
          i = nextSaidaIndex; // Skip to the 'saída' event
        }
      }
    }

    const aggregatedDailySummaries: DailySummary[] = Object.keys(dailyWorkMinutes)
      .sort() // Sort by date
      .map(dateKey => ({
        date: dateKey,
        totalMinutes: dailyWorkMinutes[dateKey],
        totalHours: formatMinutesToHours(dailyWorkMinutes[dateKey]),
      }));

    return {
      totalMinutesWorked: totalWorkMinutes,
      dailySummaries: aggregatedDailySummaries,
    };
  }, [clockHistory, dateRange, isLoading]);

  const totalHoursWorked = formatMinutesToHours(totalMinutesWorked);

  return {
    totalMinutesWorked,
    totalHoursWorked,
    dailySummaries,
    isLoading,
  };
}