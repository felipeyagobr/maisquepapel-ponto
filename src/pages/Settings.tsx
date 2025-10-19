"use client";

import Layout from "@/components/layout/Layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"; // Import Card components

const Settings = () => {
  return (
    <Layout>
      <h1 className="text-2xl font-bold mb-4">Configurações</h1>
      <Card className="flex flex-1 items-center justify-center p-8"> {/* Use Card here */}
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold tracking-tight">
            Ajuste as configurações do seu aplicativo
          </CardTitle>
          <CardDescription className="text-sm text-muted-foreground mt-2">
            Personalize as opções e preferências do sistema.
          </CardDescription>
        </CardHeader>
      </Card>
    </Layout>
  );
};

export default Settings;