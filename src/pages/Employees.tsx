"use client";

import Layout from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import { DataTable } from "@/components/data-table/DataTable";
import { columns, Employee } from "./employees/columns";

const dummyEmployees: Employee[] = [
  {
    id: "1",
    name: "João Silva",
    email: "joao.silva@example.com",
    role: "Gerente",
    status: "active",
  },
  {
    id: "2",
    name: "Maria Souza",
    email: "maria.souza@example.com",
    role: "Atendente",
    status: "active",
  },
  {
    id: "3",
    name: "Pedro Santos",
    email: "pedro.santos@example.com",
    role: "Estoquista",
    status: "inactive",
  },
  {
    id: "4",
    name: "Ana Costa",
    email: "ana.costa@example.com",
    role: "Caixa",
    status: "active",
  },
];

const Employees = () => {
  return (
    <Layout>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Funcionários</h1>
        <Button className="flex items-center gap-2">
          <PlusCircle className="h-4 w-4" />
          Adicionar Funcionário
        </Button>
      </div>
      <div className="flex flex-1 flex-col rounded-lg border border-dashed shadow-sm p-4">
        <DataTable columns={columns} data={dummyEmployees} />
      </div>
    </Layout>
  );
};

export default Employees;