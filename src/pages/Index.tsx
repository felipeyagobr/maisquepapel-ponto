"use client";

import Layout from "@/components/layout/Layout";
import ClockInOutButton from "@/components/ClockInOutButton";
import ClockHistory from "@/components/ClockHistory";
import DailyClockSummary from "@/components/DailyClockSummary";
import EmployeeScheduleDisplay from "@/components/EmployeeScheduleDisplay";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

const Index = () => {
  return (
    <Layout>
      <div className="grid gap-8 lg:grid-cols-2 xl:grid-cols-3">
        {/* Main Clocking Area */}
        <Card className="lg:col-span-2 xl:col-span-2 flex flex-col items-center justify-center p-8 text-center shadow-lg hover:shadow-xl transition-shadow duration-300 ease-in-out bg-gradient-to-br from-primary/5 to-primary/10 dark:from-primary/10 dark:to-primary/20">
          <CardHeader className="pb-6">
            <CardTitle className="text-4xl font-extrabold tracking-tight text-primary dark:text-primary-foreground mb-2">
              Bem-vindo ao Mais Que Papel!
            </CardTitle>
            <CardDescription className="text-lg text-muted-foreground mt-2">
              Este é o seu painel de controle. Vamos começar a gerenciar o ponto.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-6 w-full">
            <ClockInOutButton />
          </CardContent>
        </Card>

        {/* Daily Summary and Schedule */}
        <div className="flex flex-col gap-8">
          <DailyClockSummary />
          <EmployeeScheduleDisplay />
        </div>

        {/* Clock History (full width on smaller screens, below summary/schedule on larger) */}
        <div className="lg:col-span-2 xl:col-span-3">
          <ClockHistory />
        </div>
      </div>
    </Layout>
  );
};

export default Index;