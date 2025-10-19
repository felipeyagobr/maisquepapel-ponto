"use client";

import { useEffect, useState, useMemo } from "react";
import Layout from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import { DataTable } from "@/components/data-table/DataTable";
import { createColumns, Employee } from "./employees/columns"; // Import createColumns
import { Dialog, DialogTrigger } from "@/components/ui/dialog";
import EmployeeForm from "@/components/EmployeeForm";
import { toast } from "sonner";

const Employees = () => {
  const [employees, setEmployees] = useState<Employee[]>(() => {
    if (typeof window !== 'undefined') {
      const storedEmployees = localStorage.getItem("employees");
      return storedEmployees ? JSON.parse(storedEmployees) : [];
    }
    return [];
  });
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | undefined>(undefined);

  useEffect(() => {
    localStorage.setItem("employees", JSON.stringify(employees));
  }, [employees]);

  const handleAddOrUpdateEmployee = (employeeData: Omit<Employee, 'id'>) => {
    if (editingEmployee) {
      // Update existing employee
      setEmployees((prevEmployees) =>
        prevEmployees.map((emp) =>
          emp.id === editingEmployee.id ? { ...emp, ...employeeData } : emp
        )
      );
      toast.success("Funcionário atualizado com sucesso!");
    } else {
      // Add new employee
      const newEmployee: Employee = {
        id: Date.now().toString(), // Simple unique ID
        ...employeeData,
      };
      setEmployees((prevEmployees) => [...prevEmployees, newEmployee]);
      toast.success("Funcionário adicionado com sucesso!");
    }
    setEditingEmployee(undefined); // Clear editing state
  };

  const handleEditClick = (employee: Employee) => {
    setEditingEmployee(employee);
    setIsFormOpen(true);
  };

  const handleDeleteEmployee = (id: string) => {
    setEmployees((prevEmployees) => prevEmployees.filter((emp) => emp.id !== id));
    toast.success("Funcionário excluído com sucesso!");
  };

  // Memoize columns to prevent unnecessary re-renders
  const columns = useMemo(() => createColumns({
    onEdit: handleEditClick,
    onDelete: handleDeleteEmployee,
  }), [employees]); // Recreate columns if employees change (to update actions)

  return (
    <Layout>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Funcionários</h1>
        <Dialog open={isFormOpen} onOpenChange={(open) => {
          setIsFormOpen(open);
          if (!open) {
            setEditingEmployee(undefined); // Clear editing state when dialog closes
          }
        }}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2" onClick={() => setEditingEmployee(undefined)}>
              <PlusCircle className="h-4 w-4" />
              Adicionar Funcionário
            </Button>
          </DialogTrigger>
          <EmployeeForm
            onSave={handleAddOrUpdateEmployee}
            onClose={() => setIsFormOpen(false)}
            initialData={editingEmployee}
          />
        </Dialog>
      </div>
      <div className="flex flex-1 flex-col rounded-lg border border-dashed shadow-sm p-4">
        <DataTable columns={columns} data={employees} />
      </div>
    </Layout>
  );
};

export default Employees;