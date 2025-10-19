export interface EmployeeProfile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string; // From auth.users
  role: 'employee' | 'admin';
  avatar_url: string | null;
  updated_at: string | null;
}

// Para submissão de formulário, antes do ID ser atribuído ou email ser confirmado
export interface EmployeeFormValues {
  name: string; // Combined first_name and last_name for form
  email: string;
  role: 'employee' | 'admin';
}

export interface Expediente {
  id: string;
  user_id: string;
  day_of_week: number; // 0 for Sunday, 1 for Monday, ..., 6 for Saturday
  start_time: string; // e.g., "09:00:00"
  end_time: string;   // e.g., "18:00:00"
  created_at: string;
  updated_at: string;
}