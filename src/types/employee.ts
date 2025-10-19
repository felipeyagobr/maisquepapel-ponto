export interface EmployeeProfile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string; // From auth.users
  role: 'employee' | 'admin';
  avatar_url: string | null;
  updated_at: string | null;
}

// For form submission, before ID is assigned or email is confirmed
export interface EmployeeFormValues {
  name: string; // Combined first_name and last_name for form
  email: string;
  role: 'employee' | 'admin';
}