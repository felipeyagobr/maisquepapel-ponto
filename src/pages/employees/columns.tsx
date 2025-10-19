"use client";

import { ColumnDef } from "@tanstack/react-table";
import { MoreHorizontal } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EmployeeProfile } from "@/types/employee"; // Import the new EmployeeProfile type

interface ColumnsProps {
  onEdit: (employee: EmployeeProfile) => void;
  onDelete: (id: string) => void;
  onManageSchedule: (employee: EmployeeProfile) => void; // Nova prop para gerenciar expediente
}

export const createColumns = ({ onEdit, onDelete, onManageSchedule }: ColumnsProps): ColumnDef<EmployeeProfile>[] => [
  {
    accessorKey: "name", // This will be a virtual column for display
    header: "Nome",
    cell: ({ row }) => {
      const employee = row.original;
      return `${employee.first_name || ''} ${employee.last_name || ''}`.trim();
    },
  },
  {
    accessorKey: "email",
    header: "Email",
  },
  {
    accessorKey: "role",
    header: "Cargo",
    cell: ({ row }) => {
      const role = row.getValue("role");
      return (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
          role === "admin" ? "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200" : "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
        }`}>
          {role === "admin" ? "Administrador" : "Funcionário"}
        </span>
      );
    },
  },
  {
    id: "actions",
    header: "Ações",
    cell: ({ row }) => {
      const employee = row.original;

      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Abrir menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Ações</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => onEdit(employee)}>
              Editar Perfil
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onManageSchedule(employee)}> {/* Nova opção */}
              Gerenciar Expediente
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onDelete(employee.id)} className="text-destructive">
              Excluir
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];