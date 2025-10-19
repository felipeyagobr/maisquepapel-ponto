"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { LogIn, LogOut, Camera, MapPin, Loader2, UtensilsCrossed } from "lucide-react";
import CurrentDateTime from "./CurrentDateTime";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { ClockEvent } from "@/types/clock";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import CameraCapture from "./CameraCapture";
import { useSession } from "@/integrations/supabase/auth";
import { useClockStatus } from "@/hooks/use-clock-status"; // Import the new hook

const ClockInOutButton = () => {
  const { session } = useSession();
  const {
    isClockedIn,
    isOnLunch,
    hasClockedInToday,
    hasClockedOutToday,
    lastActionTime,
    isLoadingStatus,
    handleClockAction: performClockAction, // Renomeado para evitar conflito
  } = useClockStatus();

  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [photoData, setPhotoData] = useState<string | null>(null);
  const [locationData, setLocationData] = useState<{ latitude: number; longitude: number } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [pendingActionType, setPendingActionType] = useState<ClockEvent['tipo_batida'] | null>(null);

  const getGeolocation = async (): Promise<{ latitude: number; longitude: number } | null> => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        toast.error("Geolocalização não é suportada pelo seu navegador.");
        resolve(null);
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        },
        (error) => {
          console.error("Erro ao obter geolocalização:", error);
          toast.error("Erro ao obter geolocalização. Verifique as permissões.");
          resolve(null);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        }
      );
    });
  };

  const handleInitiateAction = async (actionType: ClockEvent['tipo_batida']) => {
    if (!session?.user?.id) {
      toast.error("Você precisa estar logado para registrar o ponto.");
      return;
    }

    setIsProcessing(true);
    setPendingActionType(actionType);
    const loadingToastId = toast.loading("Obtendo localização...");

    try {
      const location = await getGeolocation();
      if (!location) {
        toast.dismiss(loadingToastId);
        toast.error("Não foi possível obter a localização. Ponto não registrado.");
        setIsProcessing(false);
        setPendingActionType(null);
        return;
      }
      setLocationData(location);

      toast.dismiss(loadingToastId);
      setIsCameraOpen(true);
    } catch (error: any) {
      console.error("Erro no processo de ponto:", error.message);
      toast.dismiss(loadingToastId);
      toast.error("Erro ao iniciar registro de ponto: " + error.message);
      setIsProcessing(false);
      setPendingActionType(null);
    }
  };

  const handlePhotoCapture = async (imageData: string) => {
    setIsCameraOpen(false);
    setPhotoData(imageData);
    setIsProcessing(true); // Keep processing state true while action is performed

    try {
      if (!pendingActionType || !locationData || !imageData) {
        throw new Error("Dados incompletos para registrar o ponto.");
      }
      await performClockAction(pendingActionType, imageData, locationData);
    } catch (error) {
      // Error handled by useClockStatus hook, just reset local state
    } finally {
      setIsProcessing(false);
      setPhotoData(null);
      setLocationData(null);
      setPendingActionType(null);
    }
  };

  const handleCameraClose = () => {
    setIsCameraOpen(false);
    setPhotoData(null);
    setLocationData(null);
    setIsProcessing(false);
    setPendingActionType(null);
    toast.info("Captura de foto cancelada.");
  };

  const isDisabled = isProcessing || isLoadingStatus || !session?.user?.id;

  return (
    <div className="flex flex-col items-center gap-4">
      <CurrentDateTime />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-sm">
        {/* Bater Entrada */}
        {!hasClockedInToday && (
          <Button
            onClick={() => handleInitiateAction('entrada')}
            disabled={isDisabled}
            className={cn(
              "px-8 py-6 text-lg font-semibold rounded-lg shadow-lg transition-all duration-300 hover:scale-105",
              "bg-green-600 hover:bg-green-700",
              isDisabled && "opacity-60 cursor-not-allowed"
            )}
          >
            {isProcessing && pendingActionType === 'entrada' ? (
              <Loader2 className="mr-2 h-6 w-6 animate-spin" />
            ) : (
              <LogIn className="mr-2 h-6 w-6" />
            )}
            {isProcessing && pendingActionType === 'entrada' ? "Processando..." : "Bater Entrada"}
          </Button>
        )}

        {/* Sair para Almoço */}
        {isClockedIn && !isOnLunch && hasClockedInToday && !hasClockedOutToday && (
          <Button
            onClick={() => handleInitiateAction('saida_almoco')}
            disabled={isDisabled}
            className={cn(
              "px-8 py-6 text-lg font-semibold rounded-lg shadow-lg transition-all duration-300 hover:scale-105",
              "bg-yellow-600 hover:bg-yellow-700 text-white",
              isDisabled && "opacity-60 cursor-not-allowed"
            )}
          >
            {isProcessing && pendingActionType === 'saida_almoco' ? (
              <Loader2 className="mr-2 h-6 w-6 animate-spin" />
            ) : (
              <UtensilsCrossed className="mr-2 h-6 w-6" />
            )}
            {isProcessing && pendingActionType === 'saida_almoco' ? "Processando..." : "Sair para Almoço"}
          </Button>
        )}

        {/* Voltar do Almoço */}
        {isOnLunch && hasClockedInToday && !hasClockedOutToday && (
          <Button
            onClick={() => handleInitiateAction('volta_almoco')}
            disabled={isDisabled}
            className={cn(
              "col-span-full px-8 py-6 text-lg font-semibold rounded-lg shadow-lg transition-all duration-300 hover:scale-105",
              "bg-blue-600 hover:bg-blue-700",
              isDisabled && "opacity-60 cursor-not-allowed"
            )}
          >
            {isProcessing && pendingActionType === 'volta_almoco' ? (
              <Loader2 className="mr-2 h-6 w-6 animate-spin" />
            ) : (
              <LogIn className="mr-2 h-6 w-6" />
            )}
            {isProcessing && pendingActionType === 'volta_almoco' ? "Processando..." : "Voltar do Almoço"}
          </Button>
        )}

        {/* Bater Saída */}
        {isClockedIn && !isOnLunch && hasClockedInToday && !hasClockedOutToday && (
          <Button
            onClick={() => handleInitiateAction('saída')}
            disabled={isDisabled}
            className={cn(
              "px-8 py-6 text-lg font-semibold rounded-lg shadow-lg transition-all duration-300 hover:scale-105",
              "bg-red-600 hover:bg-red-700",
              isDisabled && "opacity-60 cursor-not-allowed"
            )}
          >
            {isProcessing && pendingActionType === 'saída' ? (
              <Loader2 className="mr-2 h-6 w-6 animate-spin" />
            ) : (
              <LogOut className="mr-2 h-6 w-6" />
            )}
            {isProcessing && pendingActionType === 'saída' ? "Processando..." : "Bater Saída"}
          </Button>
        )}
      </div>
      <p className="text-sm text-muted-foreground mt-2">
        {hasClockedOutToday ? "Você já bateu a saída hoje." :
         isOnLunch ? "Você está em ALMOÇO." :
         isClockedIn ? "Você está atualmente DENTRO." : "Você está atualmente FORA."}
      </p>
      {lastActionTime && (
        <p className="text-sm text-muted-foreground">
          Último registro: {lastActionTime}
        </p>
      )}

      <Dialog open={isCameraOpen} onOpenChange={handleCameraClose}>
        <DialogContent className="sm:max-w-[500px] p-0">
          <DialogHeader className="p-6 pb-0">
            <DialogTitle>Capturar Foto para Ponto</DialogTitle>
            <DialogDescription>
              Por favor, tire uma foto para registrar seu ponto.
            </DialogDescription>
          </DialogHeader>
          <CameraCapture onCapture={handlePhotoCapture} onClose={handleCameraClose} />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ClockInOutButton;