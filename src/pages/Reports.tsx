"use client";

import { useState } from "react";
import Layout from "@/components/layout/Layout";
import { DateRangePicker } from "@/components/DateRangePicker";
import { DateRange } from "react-day-picker";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useClockReport } from "@/hooks/use-clock-report";
import { Loader2, Clock } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

const Reports = () => {
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const { totalHoursWorked, dailySummaries, isLoading } = useClockReport(dateRange);

  return (
    <Layout>
      <h1 className="text-2xl font-bold mb-4">Relatórios de Ponto</h1>
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <DateRangePicker date={dateRange} setDate={setDateRange} />
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total de Horas Trabalhadas
              </CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center h-10">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                </div>
              ) : (
                <div className="text-2xl font-bold">{totalHoursWorked}</div>
              )}
              <p className="text-xs text-muted-foreground">
                {dateRange?.from && dateRange?.to
                  ? `No período de ${format(dateRange.from, "dd/MM/yyyy", { locale: ptBR })} a ${format(dateRange.to, "dd/MM/yyyy", { locale: ptBR })}`
                  : "Selecione um período para ver o total."}
              </p>
            </CardContent>
          </Card>
          {/* Add more summary cards here if needed */}
        </div>

        <Card className="flex-1">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Registros Diários</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center h-40">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : dailySummaries.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nenhum registro de ponto encontrado para o período selecionado.
              </p>
            ) : (
              <ScrollArea className="h-[300px] w-full rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead className="text-right">Horas Trabalhadas</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dailySummaries.map((summary) => (
                      <TableRow key={summary.date}>
                        <TableCell className="font-medium">
                          {format(parseISO(summary.date), "dd/MM/yyyy", { locale: ptBR })}
                        </TableCell>
                        <TableCell className="text-right">{summary.totalHours}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default Reports;