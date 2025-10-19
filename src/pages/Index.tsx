"use client";

import Layout from "@/components/layout/Layout";
import ClockInOutButton from "@/components/ClockInOutButton";
import ClockHistory from "@/components/ClockHistory"; // Import the new component

const Index = () => {
  return (
    <Layout>
      <div className="grid gap-6 lg:grid-cols-2 lg:gap-8">
        <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed shadow-sm p-8">
          <div className="flex flex-col items-center gap-4 text-center">
            <h3 className="text-2xl font-bold tracking-tight">
              Bem-vindo ao Mais Que Papel!
            </h3>
            <p className="text-sm text-muted-foreground">
              Este é o seu painel de controle. Vamos começar a gerenciar o ponto.
            </p>
            <ClockInOutButton />
          </div>
        </div>
        <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed shadow-sm p-8">
          <ClockHistory />
        </div>
      </div>
    </Layout>
  );
};

export default Index;