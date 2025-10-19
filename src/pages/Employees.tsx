"use client";

import Layout from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";

const Employees = () => {
  return (
    <Layout>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Funcionários</h1>
        <Button className="flex items-center gap-2">
          <PlusCircle className="h-4 w-4" />
          Adicionar Funcionário
        </Button>
      </div>
      <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed shadow-sm p-8">
        <div className="flex flex-col items-center gap-1 text-center">
          <h3 className="text-2xl font-bold tracking-tight">
            Gerencie seus funcionários aqui
          </h3>
          <p className="text-sm text-muted-foreground">
            Adicione, edite ou remova funcionários da sua papelaria.
          </p>
        </div>
      </div>
    </Layout>
  );
};

export default Employees;