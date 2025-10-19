"use client";

import Layout from "@/components/layout/Layout";

const Settings = () => {
  return (
    <Layout>
      <h1 className="text-2xl font-bold mb-4">Configurações</h1>
      <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed shadow-sm p-8">
        <div className="flex flex-col items-center gap-1 text-center">
          <h3 className="text-2xl font-bold tracking-tight">
            Ajuste as configurações do seu aplicativo
          </h3>
          <p className="text-sm text-muted-foreground">
            Personalize as opções e preferências do sistema.
          </p>
        </div>
      </div>
    </Layout>
  );
};

export default Settings;