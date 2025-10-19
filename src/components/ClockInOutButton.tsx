"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { LogIn, LogOut } from "lucide-react";
import CurrentDateTime from "./CurrentDateTime";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { ClockEvent } from "@/types/clock"; // Import ClockEvent

const ClockInOutButton = () => {
  const [isClockedIn, setIsClockedIn] = useState<boolean>(() => {
    // Initialize from localStorage or default to false
    if (typeof window !== 'undefined') {
      const storedStatus = localStorage.getItem("isClockedIn");
      return storedStatus === "true";
    }
    return false;
  });

  const [clockHistory, setClockHistory] = useState<ClockEvent[]>(() => {
    // Initialize history from localStorage
    if (typeof window !== 'undefined') {
      const storedHistory = localStorage.getItem("clockHistory");
      return storedHistory ? JSON.parse(storedHistory) : [];
    }
    return [];
  });

  // Derive lastActionTime from clockHistory for consistency
  const lastActionTime = clockHistory.length > 0 ? clockHistory[0].displayTime : null;

  useEffect(() => {
    // Persist state to localStorage
    localStorage.setItem("isClockedIn", String(isClockedIn));
    localStorage.setItem("clockHistory", JSON.stringify(clockHistory));
    // Dispatch a custom event to notify other components (like ClockHistory or Reports)
    window.dispatchEvent(new Event('localStorageChange'));
  }, [isClockedIn, clockHistory]);

  const handleClockInOut = () => {
    const now = new Date();
    const formattedTime = now.toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    const newEvent: ClockEvent = {
      id: Date.now().toString(), // Unique ID for each event
      type: isClockedIn ? 'saída' : 'entrada',
      timestamp: now.toISOString(),
      displayTime: formattedTime,
    };

    setClockHistory(prevHistory => [newEvent, ...prevHistory]); // Add new event to the beginning
    setIsClockedIn(prev => !prev); // Toggle clock-in status

    if (newEvent.type === 'saída') {
      toast.success(`Ponto registrado: Saída às ${formattedTime}`);
    } else {
      toast.info(`Ponto registrado: Entrada às ${formattedTime}`);
    }
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <CurrentDateTime />
      <Button
        onClick={handleClockInOut}
        className={cn(
          "mt-4 px-8 py-6 text-lg font-semibold rounded-full shadow-lg transition-all duration-300 hover:scale-105",
          isClockedIn ? "bg-red-600 hover:bg-red-700" : "bg-green-600 hover:bg-green-700"
        )}
      >
        {isClockedIn ? (
          <LogOut className="mr-2 h-6 w-6" />
        ) : (
          <LogIn className="mr-2 h-6 w-6" />
        )}
        {isClockedIn ? "Bater Saída" : "Bater Entrada"}
      </Button>
      <p className="text-sm text-muted-foreground mt-2">
        {isClockedIn ? "Você está atualmente DENTRO." : "Você está atualmente FORA."}
      </p>
      {lastActionTime && (
        <p className="text-sm text-muted-foreground">
          Último registro: {lastActionTime}
        </p>
      )}
    </div>
  );
};

export default ClockInOutButton;