"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { LogIn, LogOut, Camera, MapPin, Loader2, UtensilsCrossed } from "lucide-react"; // Adicionado UtensilsCrossed
import CurrentDateTime from "./CurrentDateTime";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { ClockEvent } from "@/types/clock";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import CameraCapture from "./CameraCapture";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/integrations/supabase/auth";

const ClockInOutButton = () => {
  const { session } = useSession();
  const [isClockedIn, setIsClockedIn] = useState<boolean>(false);
  const [isOnLunch, setIsOnLunch] = useState<boolean>(false); // Novo estado para almoço
  const [lastActionTime, setLastActionTime] = useState<string | null>(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [photoData, setPhotoData] = useState<string | null>(null);
  const [locationData, setLocationData] = useState<{ latitude: number; longitude: number } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [pendingActionType, setPendingActionType] = useState<ClockEvent['tipo_batida'] | null>(null); // Novo estado para a ação pendente

  // Busca o status inicial do ponto e a última ação do Supabase
  useEffect(() => {
    const fetchInitialStatus = async () => {
      if (!session?.user?.id) return;

      const { data: lastPonto, error } = await supabase
        .from('pontos')
        .select('tipo_batida, timestamp_solicitado')
        .eq('user_id', session.user.id)
        .order('timestamp_solicitado', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error("Erro ao carregar status inicial do ponto:", error.message);
        toast.error("Erro ao carregar status inicial do ponto.");
        return;
      }

      if (lastPonto) {
        setIsClockedIn(lastPonto.tipo_batida === 'entrada' || lastPonto.tipo_batida === 'volta_almoco');
        setIsOnLunch(lastPonto.tipo_batida === 'saida_almoco');
        setLastActionTime(new Date(lastPonto.timestamp_solicitado).toLocaleTimeString("pt-BR", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }));
      } else {
        setIsClockedIn(false);
        setIsOnLunch(false);
        setLastActionTime(null);
      }
    };

    if (session) {
      fetchInitialStatus();
    }
  }, [session]);

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

  const handleAction = async (actionType: ClockEvent['tipo_batida']) => {
    if (!session?.user?.id) {
      toast.error("Você precisa estar logado para registrar o ponto.");
      return;
    }

    setIsProcessing(true);
    setPendingActionType(actionType);
    const loadingToastId = toast.loading("Registrando ponto...");

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

      setIsCameraOpen(true);
      toast.dismiss(loadingToastId);
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
    setIsProcessing(true);
    const processingToastId = toast.loading("Salvando ponto e foto...");

    try {
      if (!session?.user?.id || !locationData || !imageData || !pendingActionType) {
        throw new Error("Dados incompletos para registrar o ponto.");
      }

      // 1. Fazer Upload da Foto para o Supabase Storage
      const file = await fetch(imageData).then(res => res.blob());
      const fileName = `${session.user.id}/${Date.now()}.jpeg`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('clock-photos')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false,
          contentType: 'image/jpeg',
        });

      if (uploadError) {
        throw new Error("Erro ao fazer upload da foto: " + uploadError.message);
      }

      const { data: publicUrlData } = supabase.storage
        .from('clock-photos')
        .getPublicUrl(fileName);

      if (!publicUrlData?.publicUrl) {
        throw new Error("Não foi possível obter a URL pública da foto.");
      }

      // 2. Inserir Evento de Ponto no Supabase
      const now = new Date();
      const newPonto: Omit<ClockEvent, 'id' | 'created_at' | 'displayTime'> = {
        user_id: session.user.id,
        tipo_batida: pendingActionType,
        timestamp_solicitado: now.toISOString(),
        latitude: locationData.latitude,
        longitude: locationData.longitude,
        foto_url: publicUrlData.publicUrl,
        status: 'pendente',
        timestamp_aprovado: null,
        admin_id: null,
      };

      const { error: insertError } = await supabase
        .from('pontos')
        .insert(newPonto);

      if (insertError) {
        throw new Error("Erro ao registrar ponto no banco de dados: " + insertError.message);
      }

      // Atualizar estado local
      if (pendingActionType === 'entrada') {
        setIsClockedIn(true);
        setIsOnLunch(false);
      } else if (pendingActionType === 'saída') {
        setIsClockedIn(false);
        setIsOnLunch(false);
      } else if (pendingActionType === 'saida_almoco') {
        setIsOnLunch(true);
      } else if (pendingActionType === 'volta_almoco') {
        setIsOnLunch(false);
        setIsClockedIn(true); // Volta do almoço significa que ainda está 'dentro'
      }
      setLastActionTime(now.toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }));

      toast.dismiss(processingToastId);
      toast.success(`Ponto registrado: ${pendingActionType === 'entrada' ? 'Entrada' : pendingActionType === 'saída' ? 'Saída' : pendingActionType === 'saida_almoco' ? 'Saída para Almoço' : 'Volta do Almoço'} às ${now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}`);
      window.dispatchEvent(new Event('supabaseDataChange'));
    } catch (error: any) {
      console.error("Erro ao registrar ponto:", error.message);
      toast.dismiss(processingToastId);
      toast.error("Erro ao registrar ponto: " + error.message);
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

  const isDisabled = isProcessing || !session?.user?.id;

  return (
    <div className="flex flex-col items-center gap-4">
      <CurrentDateTime />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-sm">
        {!isClockedIn && !isOnLunch && ( // Estado inicial ou após saída
          <Button
            onClick={() => handleAction('entrada')}
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

        {isClockedIn && !isOnLunch && ( // Após entrada, antes do almoço
          <>
            <Button
              onClick={() => handleAction('saida_almoco')}
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
            <Button
              onClick={() => handleAction('saída')}
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
          </>
        )}

        {isOnLunch && ( // Durante o almoço
          <Button
            onClick={() => handleAction('volta_almoco')}
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
      </div>
      <p className="text-sm text-muted-foreground mt-2">
        {isClockedIn && !isOnLunch ? "Você está atualmente DENTRO." :
         isOnLunch ? "Você está em ALMOÇO." : "Você está atualmente FORA."}
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