export interface ClockEvent {
  id: string;
  user_id: string; // Adiciona user_id para Supabase
  tipo_batida: 'entrada' | 'saída';
  timestamp_solicitado: string; // String ISO para o banco de dados
  latitude: number | null;
  longitude: number | null;
  foto_url: string | null;
  status: 'pendente' | 'aprovado' | 'rejeitado'; // Status para fluxo de aprovação
  timestamp_aprovado: string | null;
  admin_id: string | null;
  created_at: string; // Do banco de dados
  displayTime: string; // Hora formatada para exibição (apenas no lado do cliente)
}