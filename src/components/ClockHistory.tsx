"use client";

import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { History, Trash2 } from "lucide-react";
import { toast } from "sonner"; // Import toast for notifications

interface ClockEvent {
  id: string;
  type: 'entrada' | 'saída';
  timestamp: string; // ISO string
  displayTime: string; // Formatted time for display
}

const ClockHistory = () => {
  const [history, setHistory] = useState<ClockEvent[]>([]);

  // Effect to load history from localStorage when component mounts
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedHistory = localStorage.getItem("clockHistory");
      setHistory(storedHistory ? JSON.parse(storedHistory) : []);
    }
  }, []);

  // Effect to listen for changes in localStorage from other components (e.g., ClockInOutButton)
  useEffect(() => {
    const handleStorageChange = () => {
      if (typeof window !== 'undefined') {
        const storedHistory = localStorage.getItem("clockHistory");
        setHistory(storedHistory ? JSON.parse(storedHistory) : []);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);


  const clearHistory = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem("clockHistory");
      localStorage.removeItem("isClockedIn"); // Also clear clock-in status for consistency
      setHistory([]);
      toast.info("Histórico de ponto limpo.");
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <History className="h-5 w-5" /> Histórico de Ponto
        </CardTitle>
        {history.length > 0 && (
          <Button variant="ghost" size="sm" onClick={clearHistory} className="text-muted-foreground hover:text-destructive">
            <Trash2 className="h-4 w-4 mr-1" /> Limpar
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {history.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Nenhum registro de ponto ainda.
          </p>
        ) : (
          <ScrollArea className="h-60 w-full rounded-md border p-4">
            <ul className="space-y-2">
              {history.map((event) => (
                <li key={event.id} className="flex items-center justify-between text-sm">
                  <span className="font-medium">
                    {new Date(event.timestamp).toLocaleDateString("pt-BR", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                    })}
                  </span>
                  <span className="flex items-center gap-2">
                    <Badge
                      variant={event.type === 'entrada' ? "default" : "secondary"}
                      className={event.type === 'entrada' ? "bg-green-500 hover:bg-green-600 text-white" : "bg-red-500 hover:bg-red-600 text-white"}
                    >
                      {event.type === 'entrada' ? "Entrada" : "Saída"}
                    </Badge>
                    <span className="text-muted-foreground">{event.displayTime}</span>
                  </span>
                </li>
              ))}
            </ul>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
};

export default ClockHistory;