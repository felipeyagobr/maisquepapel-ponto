"use client";

import Layout from "@/components/layout/Layout";
import ClockInOutButton from "@/components/ClockInOutButton";
import ClockHistory from "@/components/ClockHistory";
import DailyClockSummary from "@/components/DailyClockSummary"; // Import the new component
import EmployeeScheduleDisplay from "@/components/EmployeeScheduleDisplay"; // Import the new schedule display component
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"; // Import Card components

const Index = () => {
  return (
    <Layout>
      <div className="grid gap-6 lg:grid-cols-2 lg:gap-8">
        {/* Main Clocking Area */}
        <Card className="flex flex-col items-center justify-center p-8 text-center">
          <CardHeader>
            <CardTitle className="text-3xl font-bold tracking-tight">
              Bem-vindo ao Mais Que Papel!
            </CardTitle>
            <CardDescription className="text-md text-muted-foreground mt-2">
              Este é o seu painel de controle. Vamos começar a gerenciar o ponto.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4">
            <ClockInOutButton />
          </CardContent>
        </Card>

        {/* Daily Summary, Schedule, and History */}
        <div className="flex flex-col gap-6">
          <DailyClockSummary />
          <EmployeeScheduleDisplay /> {/* Add the new component here */}
          <ClockHistory />
        </div>
      </div>
    </Layout>
  );
};

export default Index;