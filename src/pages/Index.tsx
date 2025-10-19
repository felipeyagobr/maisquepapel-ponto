"use client";

import Layout from "@/components/layout/Layout";

const Index = () => {
  return (
    <Layout>
      <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed shadow-sm p-8">
        <div className="flex flex-col items-center gap-1 text-center">
          <h3 className="text-2xl font-bold tracking-tight">
            Bem-vindo ao Mais Que Papel!
          </h3>
          <p className="text-sm text-muted-foreground">
            Este é o seu painel de controle. Vamos começar a gerenciar o ponto.
          </p>
          {/* Aqui adicionaremos o botão de bater ponto e outras informações */}
        </div>
      </div>
    </Layout>
  );
};

export default Index;