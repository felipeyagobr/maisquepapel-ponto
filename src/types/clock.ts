export interface ClockEvent {
  id: string;
  type: 'entrada' | 'saída';
  timestamp: string; // ISO string for easy sorting and display
  displayTime: string; // Formatted time for display
}