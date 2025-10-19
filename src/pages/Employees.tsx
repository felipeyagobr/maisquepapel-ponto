"use client";

import { useEffect, useState } from "react";
import Layout from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import { DataTable } from "@/components/data-table/DataTable";
import { columns, Employee } from "./employees/columns";
import { Dialog, DialogTrigger } from "@/components/ui/dialog";
import EmployeeForm from "@/components/EmployeeForm"; // Import the new form component
import { toast } from "sonner";

const Employees = () => {
  const [employees, setEmployees] = useState<Employee[]>(() => {
    // Carrega funcionários do localStorage ao inicializar
    if (typeof window !== 'undefined') {
      const storedEmployees = localStorage.getItem("employees");
      return storedEmployees ? JSON.parse(storedEmployees) : [];
    }
    return [];
  });
  const [isFormOpen, setIsFormOpen] = useState(false);

  // Salva funcionários no localStorage sempre que a lista é atualizada
  useEffect(() => {
    localStorage.setItem("employees", JSON.stringify(employees));
  }, [employees]);

  const handleAddEmployee = (newEmployeeData: Omit<Employee, 'id'>) => {
    const newEmployee: Employee = {
      id: Date.now().toString(), // ID único simples
      ...newEmployeeData,
    };
    setEmployees((prevEmployees) => [...prevEmployees, newEmployee]);
    toast.success("Funcionário adicionado com sucesso!");
  };

  return (
    <Layout>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Funcionários</h1>
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <PlusCircle className="h-4 w-4" />
              Adicionar Funcionário
            </Button>
          </DialogTrigger>
          <EmployeeForm onSave={handleAddEmployee} onClose={() => setIsFormOpen(false)} />
        </Dialog>
      </div>
      <div className="flex flex-1 flex-col rounded-lg border border-dashed shadow-sm p-4">
        <DataTable columns={columns} data={employees} />
      </div>
    </Layout>
  );
};

export default Employees;