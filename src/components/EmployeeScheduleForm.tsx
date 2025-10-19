"use client";

import React, { useState, useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
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
import { Loader2, PlusCircle, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const dayNames = [
  "Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira",
  "Quinta-feira", "Sexta-feira", "Sábado"
];

const scheduleSchema = z.object({
  day_of_week: z.number().min(0).max(6),
  start_time: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Formato de hora inválido (HH:MM)"),
  end_time: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Formato de hora inválido (HH:MM)"),
});

const formSchema = z.object({
  schedules: z.array(scheduleSchema),
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
      schedules: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "schedules",
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
        form.reset({ schedules: [] });
      } else {
        const formattedSchedules = data.map(s => ({
          ...s,
          start_time: s.start_time.substring(0, 5), // Format to HH:MM
          end_time: s.end_time.substring(0, 5),     // Format to HH:MM
        }));
        form.reset({ schedules: formattedSchedules });
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
      // Fetch existing schedules to determine what to insert, update, or delete
      const { data: existingSchedules, error: fetchError } = await supabase
        .from('expedientes')
        .select('id, day_of_week')
        .eq('user_id', employee.id);

      if (fetchError) throw new Error(fetchError.message);

      const existingMap = new Map(existingSchedules.map(s => [s.day_of_week, s.id]));
      const updates = [];
      const inserts = [];
      const daysToKeep = new Set<number>();

      for (const schedule of values.schedules) {
        const fullStartTime = `${schedule.start_time}:00`;
        const fullEndTime = `${schedule.end_time}:00`;

        if (existingMap.has(schedule.day_of_week)) {
          // Update existing schedule
          updates.push(
            supabase
              .from('expedientes')
              .update({ start_time: fullStartTime, end_time: fullEndTime, updated_at: new Date().toISOString() })
              .eq('id', existingMap.get(schedule.day_of_week)!)
          );
          daysToKeep.add(schedule.day_of_week);
        } else {
          // Insert new schedule
          inserts.push(
            supabase
              .from('expedientes')
              .insert({
                user_id: employee.id,
                day_of_week: schedule.day_of_week,
                start_time: fullStartTime,
                end_time: fullEndTime,
              })
          );
          daysToKeep.add(schedule.day_of_week);
        }
      }

      // Delete schedules that are no longer in the form
      const deletes = existingSchedules
        .filter(s => !daysToKeep.has(s.day_of_week))
        .map(s => supabase.from('expedientes').delete().eq('id', s.id));

      const allOperations = [...updates, ...inserts, ...deletes];
      const results = await Promise.all(allOperations);

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
            {fields.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nenhum expediente configurado. Clique em "Adicionar Dia" para começar.
              </p>
            )}
            {fields.map((field, index) => (
              <div key={field.id} className="flex flex-col sm:flex-row items-end gap-4 border-b pb-4 last:border-b-0 last:pb-0">
                <FormField
                  control={form.control}
                  name={`schedules.${index}.day_of_week`}
                  render={({ field: dayField }) => (
                    <FormItem className="w-full sm:w-1/3">
                      <FormLabel>Dia da Semana</FormLabel>
                      <FormControl>
                        <select
                          {...dayField}
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                          onChange={(e) => dayField.onChange(parseInt(e.target.value))}
                          value={dayField.value}
                        >
                          <option value="">Selecione o dia</option>
                          {dayNames.map((name, dayIndex) => (
                            <option key={dayIndex} value={dayIndex}>
                              {name}
                            </option>
                          ))}
                        </select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name={`schedules.${index}.start_time`}
                  render={({ field }) => (
                    <FormItem className="w-full sm:w-1/3">
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
                  name={`schedules.${index}.end_time`}
                  render={({ field }) => (
                    <FormItem className="w-full sm:w-1/3">
                      <FormLabel>Fim</FormLabel>
                      <FormControl>
                        <Input type="time" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  onClick={() => remove(index)}
                  className="mt-2 sm:mt-0"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              onClick={() => append({ day_of_week: 1, start_time: "09:00", end_time: "18:00" })}
              className="w-full"
            >
              <PlusCircle className="mr-2 h-4 w-4" /> Adicionar Dia
            </Button>
            <Button type="submit" className="w-full">Salvar Expedientes</Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};

export default EmployeeScheduleForm;