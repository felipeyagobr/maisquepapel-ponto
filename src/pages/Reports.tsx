"use client";

import { useState } from "react";
import Layout from "@/components/layout/Layout";
import { DateRangePicker } from "@/components/DateRangePicker";
import { DateRange } from "react-day-picker";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const Reports = () => {
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);

  return (
    <Layout>
      <h1 className="text-2xl font-bold mb-4">Relatórios</h1>
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <DateRangePicker date={dateRange} setDate={setDateRange} />
        </div>
        <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed shadow-sm p-8 min-h-[200px]">
          <div className="flex flex-col items-center gap-1 text-center">
            <h3 className="text-2xl font-bold tracking-tight">
              Visualize seus relatórios de ponto
            </h3>
            <p className="text-sm text-muted-foreground mb-2">
              Acompanhe as horas trabalhadas e a produtividade da sua equipe.
            </p>
            {dateRange?.from && dateRange?.to && (
              <p className="text-sm text-primary">
                Relatórios de:{" "}
                {format(dateRange.from, "dd/MM/yyyy", { locale: ptBR })} até{" "}
                {format(dateRange.to, "dd/MM/yyyy", { locale: ptBR })}
              </p>
            )}
            {(!dateRange?.from || !dateRange?.to) && (
              <p className="text-sm text-muted-foreground">
                Selecione um intervalo de datas para filtrar.
              </p>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Reports;