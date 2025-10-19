"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Clock } from "lucide-react";
import CurrentDateTime from "./CurrentDateTime";

const ClockInOutButton = () => {
  // For now, this button will just display a message.
  // We'll add actual clock-in/out logic later.
  const handleClockInOut = () => {
    console.log("Botão de bater ponto clicado!");
    // Implementar lógica de bater ponto aqui
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <CurrentDateTime />
      <Button
        onClick={handleClockInOut}
        className="mt-4 px-8 py-6 text-lg font-semibold rounded-full shadow-lg transition-all duration-300 hover:scale-105"
      >
        <Clock className="mr-2 h-6 w-6" />
        Bater Ponto
      </Button>
      <p className="text-sm text-muted-foreground mt-2">
        Clique para registrar sua entrada/saída.
      </p>
    </div>
  );
};

export default ClockInOutButton;