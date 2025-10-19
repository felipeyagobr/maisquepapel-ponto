"use client";

import React from "react";
import {
  ResponsiveContainer,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  Bar,
} from "recharts";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

interface DailySummary {
  date: string; // YYYY-MM-DD
  totalMinutes: number;
  totalHours: string; // e.g., "8h 30m"
}

interface DailyHoursChartProps {
  dailySummaries: DailySummary[];
}

const DailyHoursChart = ({ dailySummaries }: DailyHoursChartProps) => {
  // Converter "8h 30m" para um número decimal (8.5) para o gráfico
  const chartData = dailySummaries.map((summary) => {
    const [hoursStr, minutesStr] = summary.totalHours.split(' ');
    const hours = parseInt(hoursStr.replace('h', '')) || 0;
    const minutes = parseInt(minutesStr.replace('m', '')) || 0;
    const totalDecimalHours = hours + (minutes / 60);

    return {
      date: format(parseISO(summary.date), "dd/MM", { locale: ptBR }),
      "Horas Trabalhadas": parseFloat(totalDecimalHours.toFixed(2)), // Arredondar para 2 casas decimais
    };
  });

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Horas Trabalhadas por Dia</CardTitle>
      </CardHeader>
      <CardContent>
        {chartData.length === 0 ? (
          <div className="flex items-center justify-center h-60 text-muted-foreground">
            Nenhum dado de horas trabalhadas para o período.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="date" tickFormatter={(value) => value} className="text-xs" />
              <YAxis
                label={{ value: "Horas", angle: -90, position: "insideLeft", className: "text-sm" }}
                tickFormatter={(value) => `${value}h`}
                className="text-xs"
              />
              <Tooltip
                formatter={(value: number) => [`${value.toFixed(2)}h`, "Horas Trabalhadas"]}
                labelFormatter={(label) => `Data: ${label}`}
                contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', borderRadius: '0.5rem' }}
                itemStyle={{ color: 'hsl(var(--foreground))' }}
              />
              <Legend wrapperStyle={{ paddingTop: '10px' }} />
              <Bar dataKey="Horas Trabalhadas" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
};

export default DailyHoursChart;