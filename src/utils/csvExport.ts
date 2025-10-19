import { ClockEvent } from "@/types/clock";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

export const exportClockEventsToCsv = (events: ClockEvent[], filename: string = "relatorio_ponto.csv") => {
  if (events.length === 0) {
    console.warn("Nenhum evento para exportar.");
    return;
  }

  const headers = [
    "ID do Evento",
    "Funcionário",
    "Data",
    "Hora",
    "Tipo de Batida",
    "Status",
    "Latitude",
    "Longitude",
    "URL da Foto",
    "ID do Administrador",
    "Timestamp Aprovado",
    "Criado Em",
  ];

  const csvRows = [];
  csvRows.push(headers.join(",")); // Add headers to the CSV

  for (const event of events) {
    const formattedDate = format(parseISO(event.timestamp_solicitado), "dd/MM/yyyy", { locale: ptBR });
    const formattedTime = format(parseISO(event.timestamp_solicitado), "HH:mm:ss", { locale: ptBR });
    const formattedApprovedTimestamp = event.timestamp_aprovado 
      ? format(parseISO(event.timestamp_aprovado), "dd/MM/yyyy HH:mm:ss", { locale: ptBR }) 
      : "";
    const formattedCreatedAt = format(parseISO(event.created_at), "dd/MM/yyyy HH:mm:ss", { locale: ptBR });

    const row = [
      `"${event.id}"`, // Wrap ID in quotes to prevent Excel issues
      `"${event.employeeName || event.user_id}"`, // Use employeeName if available, else user_id
      `"${formattedDate}"`,
      `"${formattedTime}"`,
      `"${event.tipo_batida}"`,
      `"${event.status}"`,
      event.latitude !== null ? event.latitude.toString() : "",
      event.longitude !== null ? event.longitude.longitude.toString() : "",
      `"${event.foto_url || ""}"`,
      `"${event.admin_id || ""}"`,
      `"${formattedApprovedTimestamp}"`,
      `"${formattedCreatedAt}"`,
    ];
    csvRows.push(row.join(","));
  }

  const csvString = csvRows.join("\n");
  const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
};