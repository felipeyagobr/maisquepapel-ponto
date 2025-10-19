"use client";

import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/integrations/supabase/auth";
import { EmployeeProfile, Expediente } from "@/types/employee";
import { Loader2, CalendarDays } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch"; // Import Switch component

const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;

const formSchema = z.object({
  weekday_start_time: z.string().regex(timeRegex, "Formato de hora inválido (HH:MM)"),
  weekday_end_time: z.string().regex(timeRegex, "Formato de hora inválido (HH:MM)"),
  
  saturday_enabled: z.boolean().default(false),
  saturday_start_time: z.string().regex(timeRegex, "Formato de hora inválido (HH:MM)").optional(),
  saturday_end_time: z.string().regex(timeRegex, "Formato de hora inválido (HH:MM)").optional(),

  sunday_enabled: z.boolean().default(false),
  sunday_start_time: z.string().regex(timeRegex, "Formato de hora inválido (HH:MM)").optional(),
  sunday_end_time: z.string().regex(timeRegex, "Formato de hora inválido (HH:MM)").optional(),
}).superRefine((data, ctx) => {
  // Custom validation for Saturday
  if (data.saturday_enabled) {
    if (!data.saturday_start_time) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Hora de início é obrigatória para sábado.",
        path: ["saturday_start_time"],
      });
    }
    if (!data.saturday_end_time) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Hora de fim é obrigatória para sábado.",
        path: ["saturday_end_time"],
      });
    }
  }
  // Custom validation for Sunday
  if (data.sunday_enabled) {
    if (!data.sunday_start_time) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Hora de início é obrigatória para domingo.",
        path: ["sunday_start_time"],
      });
    }
    if (!data.sunday_end_time) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Hora de fim é obrigatória para domingo.",
        path: ["sunday_end_time"],
      });
    }
  }
});

interface EmployeeScheduleFormProps {
  employee: EmployeeProfile;
  onSaveSuccess: () => void;
}

const EmployeeScheduleForm = ({ employee, onSaveSuccess }: EmployeeScheduleFormProps) => {
  const { session } = useSession();
  const [isLoading, setIsLoading] = useState(true);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      weekday_start_time: "09:00",
      weekday_end_time: "18:00",
      saturday_enabled: false,
      saturday_start_time: "09:00",
      saturday_end_time: "13:00",
      sunday_enabled: false,
      sunday_start_time: "09:00",
      sunday_end_time: "13:00",
    },
  });

  useEffect(() => {
    const fetchSchedules = async () => {
      setIsLoading(true);
      if (!session?.user?.id) {
        toast.error("Sessão não encontrada. Por favor, faça login novamente.");
        setIsLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('expedientes')
        .select('*')
        .eq('user_id', employee.id)
        .order('day_of_week', { ascending: true });

      if (error) {
        toast.error("Erro ao carregar expedientes: " + error.message);
        form.reset(); // Reset to default values on error
      } else {
        const schedulesMap = new Map<number, Expediente>();
        data.forEach(s => schedulesMap.set(s.day_of_week, s));

        let weekdayStart = "09:00";
        let weekdayEnd = "18:00";

        // Try to find a weekday schedule to set default for Mon-Fri
        for (let i = 1; i <= 5; i++) { // Monday to Friday
          if (schedulesMap.has(i)) {
            const s = schedulesMap.get(i)!;
            weekdayStart = s.start_time.substring(0, 5);
            weekdayEnd = s.end_time.substring(0, 5);
            break; // Take the first one found
          }
        }

        const saturdaySchedule = schedulesMap.get(6);
        const sundaySchedule = schedulesMap.get(0);

        form.reset({
          weekday_start_time: weekdayStart,
          weekday_end_time: weekdayEnd,
          saturday_enabled: !!saturdaySchedule,
          saturday_start_time: saturdaySchedule ? saturdaySchedule.start_time.substring(0, 5) : "09:00",
          saturday_end_time: saturdaySchedule ? saturdaySchedule.end_time.substring(0, 5) : "13:00",
          sunday_enabled: !!sundaySchedule,
          sunday_start_time: sundaySchedule ? sundaySchedule.start_time.substring(0, 5) : "09:00",
          sunday_end_time: sundaySchedule ? sundaySchedule.end_time.substring(0, 5) : "13:00",
        });
      }
      setIsLoading(false);
    };

    fetchSchedules();
  }, [employee.id, session, form]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!session?.user?.id) {
      toast.error("Sessão não encontrada. Por favor, faça login novamente.");
      return;
    }

    const loadingToastId = toast.loading("Salvando expedientes...");

    try {
      // Delete all existing schedules for this employee first
      const { error: deleteError } = await supabase
        .from('expedientes')
        .delete()
        .eq('user_id', employee.id);

      if (deleteError) throw new Error(deleteError.message);

      const inserts = [];

      // Insert Monday to Friday schedules
      for (let day = 1; day <= 5; day++) { // Monday (1) to Friday (5)
        inserts.push(
          supabase
            .from('expedientes')
            .insert({
              user_id: employee.id,
              day_of_week: day,
              start_time: `${values.weekday_start_time}:00`,
              end_time: `${values.weekday_end_time}:00`,
            })
        );
      }

      // Insert Saturday schedule if enabled
      if (values.saturday_enabled && values.saturday_start_time && values.saturday_end_time) {
        inserts.push(
          supabase
            .from('expedientes')
            .insert({
              user_id: employee.id,
              day_of_week: 6, // Saturday
              start_time: `${values.saturday_start_time}:00`,
              end_time: `${values.saturday_end_time}:00`,
            })
        );
      }

      // Insert Sunday schedule if enabled
      if (values.sunday_enabled && values.sunday_start_time && values.sunday_end_time) {
        inserts.push(
          supabase
            .from('expedientes')
            .insert({
              user_id: employee.id,
              day_of_week: 0, // Sunday
              start_time: `${values.sunday_start_time}:00`,
              end_time: `${values.sunday_end_time}:00`,
            })
        );
      }

      const results = await Promise.all(inserts);

      const hasErrors = results.some(r => r.error);
      if (hasErrors) {
        const errorMessage = results.map(r => r.error?.message).filter(Boolean).join("; ");
        throw new Error(errorMessage || "Erro desconhecido ao salvar expedientes.");
      }

      toast.dismiss(loadingToastId);
      toast.success("Expedientes salvos com sucesso!");
      onSaveSuccess();
    } catch (error: any) {
      toast.dismiss(loadingToastId);
      toast.error("Erro ao salvar expedientes: " + error.message);
    }
  };

  if (isLoading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Gerenciar Expediente de {employee.first_name}</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-40">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Gerenciar Expediente de {employee.first_name}</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Horário de Segunda a Sexta */}
            <div className="space-y-4 border-b pb-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <CalendarDays className="h-5 w-5" /> Segunda a Sexta-feira
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="weekday_start_time"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Início</FormLabel>
                      <FormControl>
                        <Input type="time" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="weekday_end_time"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Fim</FormLabel>
                      <FormControl>
                        <Input type="time" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Horário de Sábado */}
            <div className="space-y-4 border-b pb-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <CalendarDays className="h-5 w-5" /> Sábado
                </h3>
                <FormField
                  control={form.control}
                  name="saturday_enabled"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                      <div className="space-y-0.5">
                        <FormLabel>Trabalha no Sábado?</FormLabel>
                        <FormDescription>
                          Habilite para definir o horário de trabalho de sábado.
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
              {form.watch("saturday_enabled") && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                  <FormField
                    control={form.control}
                    name="saturday_start_time"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Início (Sábado)</FormLabel>
                        <FormControl>
                          <Input type="time" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="saturday_end_time"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Fim (Sábado)</FormLabel>
                        <FormControl>
                          <Input type="time" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}
            </div>

            {/* Horário de Domingo */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <CalendarDays className="h-5 w-5" /> Domingo
                </h3>
                <FormField
                  control={form.control}
                  name="sunday_enabled"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                      <div className="space-y-0.5">
                        <FormLabel>Trabalha no Domingo?</FormLabel>
                        <FormDescription>
                          Habilite para definir o horário de trabalho de domingo.
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
              {form.watch("sunday_enabled") && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                  <FormField
                    control={form.control}
                    name="sunday_start_time"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Início (Domingo)</FormLabel>
                        <FormControl>
                          <Input type="time" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="sunday_end_time"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Fim (Domingo)</FormLabel>
                        <FormControl>
                          <Input type="time" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}
            </div>

            <Button type="submit" className="w-full">Salvar Expedientes</Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};

export default EmployeeScheduleForm;