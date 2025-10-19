"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, CalendarDays } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/integrations/supabase/auth";
import { Expediente } from "@/types/employee";
import { toast } from "sonner";

const dayNames = [
  "Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira",
  "Quinta-feira", "Sexta-feira", "Sábado"
];

const EmployeeScheduleDisplay = () => {
  const { session, isLoading: sessionLoading } = useSession();
  const [schedules, setSchedules] = useState<Expediente[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchSchedules = async () => {
      if (!session?.user?.id) {
        setSchedules([]);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('expedientes')
          .select('*')
          .eq('user_id', session.user.id)
          .order('day_of_week', { ascending: true });

        if (error) {
          throw new Error(error.message);
        }

        setSchedules(data || []);
      } catch (error: any) {
        console.error("Erro ao carregar expediente:", error.message);
        toast.error("Erro ao carregar seu expediente: " + error.message);
        setSchedules([]);
      } finally {
        setIsLoading(false);
      }
    };

    if (!sessionLoading) {
      fetchSchedules();
    }
  }, [session, sessionLoading]);

  if (isLoading) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <CalendarDays className="h-5 w-5" /> Meu Expediente
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
      <CardHeader>
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <CalendarDays className="h-5 w-5" /> Meu Expediente
        </CardTitle>
      </CardHeader>
      <CardContent>
        {schedules.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Nenhum expediente configurado para você.
          </p>
        ) : (
          <ul className="space-y-2">
            {schedules.map((schedule) => (
              <li key={schedule.id} className="flex justify-between text-sm border-b pb-2 last:border-b-0 last:pb-0">
                <span className="font-medium">{dayNames[schedule.day_of_week]}</span>
                <span>{schedule.start_time.substring(0, 5)} - {schedule.end_time.substring(0, 5)}</span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
};

export default EmployeeScheduleDisplay;