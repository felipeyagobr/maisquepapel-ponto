"use client";

import { ColumnDef } from "@tanstack/react-table";
import { MoreHorizontal, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ClockEvent } from "@/types/clock";

interface PontoApprovalColumnsProps {
  onApprove: (pontoId: string) => void;
  onReject: (pontoId: string) => void;
}

export const createPontoApprovalColumns = ({ onApprove, onReject }: PontoApprovalColumnsProps): ColumnDef<ClockEvent>[] => [
  {
    accessorKey: "user_id",
    header: "Funcionário",
    cell: ({ row }) => {
      // TODO: Fetch employee name based on user_id
      // For now, display a placeholder or user ID
      return <span className="text-muted-foreground">{row.original.user_id.substring(0, 8)}...</span>;
    },
  },
  {
    accessorKey: "timestamp_solicitado",
    header: "Data/Hora",
    cell: ({ row }) => {
      const date = parseISO(row.original.timestamp_solicitado);
      return (
        <div className="flex flex-col">
          <span>{format(date, "dd/MM/yyyy", { locale: ptBR })}</span>
          <span className="text-muted-foreground text-xs">{format(date, "HH:mm:ss", { locale: ptBR })}</span>
        </div>
      );
    },
  },
  {
    accessorKey: "tipo_batida",
    header: "Tipo",
    cell: ({ row }) => {
      const tipo = row.original.tipo_batida;
      return (
        <Badge
          variant={tipo === 'entrada' ? "default" : "secondary"}
          className={tipo === 'entrada' ? "bg-green-500 hover:bg-green-600 text-white" : "bg-red-500 hover:bg-red-600 text-white"}
        >
          {tipo === 'entrada' ? "Entrada" : "Saída"}
        </Badge>
      );
    },
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const status = row.original.status;
      let badgeClass = "";
      let badgeText = "";

      switch (status) {
        case "pendente":
          badgeClass = "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
          badgeText = "Pendente";
          break;
        case "aprovado":
          badgeClass = "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
          badgeText = "Aprovado";
          break;
        case "rejeitado":
          badgeClass = "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
          badgeText = "Rejeitado";
          break;
        default:
          badgeClass = "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
          badgeText = "Desconhecido";
      }

      return (
        <Badge className={badgeClass}>
          {badgeText}
        </Badge>
      );
    },
  },
  {
    id: "actions",
    header: "Ações",
    cell: ({ row }) => {
      const ponto = row.original;

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
            {ponto.status === 'pendente' && (
              <>
                <DropdownMenuItem onClick={() => onApprove(ponto.id)}>
                  <CheckCircle2 className="mr-2 h-4 w-4 text-green-600" /> Aprovar
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onReject(ponto.id)} className="text-destructive">
                  <XCircle className="mr-2 h-4 w-4" /> Rejeitar
                </DropdownMenuItem>
                <DropdownMenuSeparator />
              </>
            )}
            {ponto.foto_url && (
              <DropdownMenuItem asChild>
                <a href={ponto.foto_url} target="_blank" rel="noopener noreferrer">
                  Ver Foto
                </a>
              </DropdownMenuItem>
            )}
            {ponto.latitude && ponto.longitude && (
              <DropdownMenuItem asChild>
                <a href={`https://www.google.com/maps/search/?api=1&query=${ponto.latitude},${ponto.longitude}`} target="_blank" rel="noopener noreferrer">
                  Ver Localização
                </a>
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];