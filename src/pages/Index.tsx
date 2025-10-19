"use client";

import Layout from "@/components/layout/Layout";
import ClockInOutButton from "@/components/ClockInOutButton";

const Index = () => {
  return (
    <Layout>
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
    </Layout>
  );
};

export default Index;