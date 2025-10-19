"use client";

import Layout from "@/components/layout/Layout";

const Reports = () => {
  return (
    <Layout>
      <h1 className="text-2xl font-bold mb-4">Relatórios</h1>
      <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed shadow-sm p-8">
        <div className="flex flex-col items-center gap-1 text-center">
          <h3 className="text-2xl font-bold tracking-tight">
            Visualize seus relatórios de ponto
          </h3>
          <p className="text-sm text-muted-foreground">
            Acompanhe as horas trabalhadas e a produtividade da sua equipe.
          </p>
        </div>
      </div>
    </Layout>
  );
};

export default Reports;