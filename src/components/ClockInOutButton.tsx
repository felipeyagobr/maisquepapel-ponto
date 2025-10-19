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
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/integrations/supabase/auth";

const ClockInOutButton = () => {
  const { session } = useSession();
  const [isClockedIn, setIsClockedIn] = useState<boolean>(false); // Indica se o funcionário está 'dentro' (não saiu para o dia nem para o almoço)
  const [isOnLunch, setIsOnLunch] = useState<boolean>(false); // Indica se o funcionário está em almoço
  const [hasClockedInToday, setHasClockedInToday] = useState<boolean>(false); // Indica se já houve uma entrada hoje
  const [hasClockedOutToday, setHasClockedOutToday] = useState<boolean>(false); // Indica se já houve uma saída hoje
  const [lastActionTime, setLastActionTime] = useState<string | null>(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [photoData, setPhotoData] = useState<string | null>(null);
  const [locationData, setLocationData] = useState<{ latitude: number; longitude: number } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [pendingActionType, setPendingActionType] = useState<ClockEvent['tipo_batida'] | null>(null);

  // Busca o status inicial do ponto e a última ação do Supabase
  useEffect(() => {
    const fetchInitialStatus = async () => {
      if (!session?.user?.id) {
        setIsClockedIn(false);
        setIsOnLunch(false);
        setHasClockedInToday(false);
        setHasClockedOutToday(false);
        setLastActionTime(null);
        return;
      }

      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date();
      todayEnd.setHours(23, 59, 59, 999);

      const { data: dailyPontos, error } = await supabase
        .from('pontos')
        .select('tipo_batida, timestamp_solicitado')
        .eq('user_id', session.user.id)
        .gte('timestamp_solicitado', todayStart.toISOString())
        .lte('timestamp_solicitado', todayEnd.toISOString())
        .order('timestamp_solicitado', { ascending: true }); // Ordena por tempo para processar a sequência

      if (error) {
        console.error("Erro ao carregar status inicial do ponto:", error.message);
        toast.error("Erro ao carregar status inicial do ponto.");
        return;
      }

      let currentIsClockedIn = false;
      let currentIsOnLunch = false;
      let currentHasClockedInToday = false;
      let currentHasClockedOutToday = false;
      let latestActionTime: string | null = null;

      if (dailyPontos && dailyPontos.length > 0) {
        currentHasClockedInToday = dailyPontos.some(p => p.tipo_batida === 'entrada');
        currentHasClockedOutToday = dailyPontos.some(p => p.tipo_batida === 'saída');

        const lastEvent = dailyPontos[dailyPontos.length - 1];
        latestActionTime = new Date(lastEvent.timestamp_solicitado).toLocaleTimeString("pt-BR", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        });

        if (lastEvent.tipo_batida === 'entrada' || lastEvent.tipo_batida === 'volta_almoco') {
          currentIsClockedIn = true;
          currentIsOnLunch = false;
        } else if (lastEvent.tipo_batida === 'saida_almoco') {
          currentIsClockedIn = true; // Ainda é considerado 'dentro', mas em almoço
          currentIsOnLunch = true;
        } else if (lastEvent.tipo_batida === 'saída') {
          currentIsClockedIn = false;
          currentIsOnLunch = false;
        }
      }

      setIsClockedIn(currentIsClockedIn);
      setIsOnLunch(currentIsOnLunch);
      setHasClockedInToday(currentHasClockedInToday);
      setHasClockedOutToday(currentHasClockedOutToday);
      setLastActionTime(latestActionTime);
    };

    if (session) {
      fetchInitialStatus();
      // Também escuta por evento customizado para refetch de dados em tempo real
      window.addEventListener('supabaseDataChange', fetchInitialStatus);
      return () => window.removeEventListener('supabaseDataChange', fetchInitialStatus);
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

      // Atualizar estado local (será re-buscado pelo useEffect, mas para feedback imediato)
      // O useEffect com o listener 'supabaseDataChange' fará o trabalho de re-sincronizar o estado
      // após a inserção no banco de dados.
      setLastActionTime(now.toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }));

      toast.dismiss(processingToastId);
      toast.success(`Ponto registrado: ${pendingActionType === 'entrada' ? 'Entrada' : pendingActionType === 'saída' ? 'Saída' : pendingActionType === 'saida_almoco' ? 'Saída para Almoço' : 'Volta do Almoço'} às ${now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}`);
      window.dispatchEvent(new Event('supabaseDataChange')); // Notifica outros componentes para refetch
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
        {/* Bater Entrada */}
        {!hasClockedInToday && (
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

        {/* Sair para Almoço */}
        {isClockedIn && !isOnLunch && hasClockedInToday && !hasClockedOutToday && (
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
        )}

        {/* Voltar do Almoço */}
        {isOnLunch && hasClockedInToday && !hasClockedOutToday && (
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

        {/* Bater Saída */}
        {isClockedIn && !isOnLunch && hasClockedInToday && !hasClockedOutToday && (
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