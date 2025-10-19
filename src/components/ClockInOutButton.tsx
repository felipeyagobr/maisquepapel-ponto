"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { LogIn, LogOut, Camera, MapPin, Loader2 } from "lucide-react";
import CurrentDateTime from "./CurrentDateTime";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { ClockEvent } from "@/types/clock";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import CameraCapture from "./CameraCapture"; // Importa o novo componente CameraCapture
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/integrations/supabase/auth";

const ClockInOutButton = () => {
  const { session } = useSession();
  const [isClockedIn, setIsClockedIn] = useState<boolean>(false);
  const [lastActionTime, setLastActionTime] = useState<string | null>(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [photoData, setPhotoData] = useState<string | null>(null);
  const [locationData, setLocationData] = useState<{ latitude: number; longitude: number } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

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
        setIsClockedIn(lastPonto.tipo_batida === 'entrada');
        setLastActionTime(new Date(lastPonto.timestamp_solicitado).toLocaleTimeString("pt-BR", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }));
      } else {
        setIsClockedIn(false);
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

  const handleClockInOut = async () => {
    if (!session?.user?.id) {
      toast.error("Você precisa estar logado para registrar o ponto.");
      return;
    }

    setIsProcessing(true);
    const loadingToastId = toast.loading("Registrando ponto...");

    try {
      // 1. Obter Geolocalização
      const location = await getGeolocation();
      if (!location) {
        toast.dismiss(loadingToastId);
        toast.error("Não foi possível obter a localização. Ponto não registrado.");
        setIsProcessing(false);
        return;
      }
      setLocationData(location);

      // 2. Abrir Câmera para Foto
      setIsCameraOpen(true);
      toast.dismiss(loadingToastId); // Dispensa o toast de carregamento enquanto a câmera está aberta
    } catch (error: any) {
      console.error("Erro no processo de ponto:", error.message);
      toast.dismiss(loadingToastId);
      toast.error("Erro ao iniciar registro de ponto: " + error.message);
      setIsProcessing(false);
    }
  };

  const handlePhotoCapture = async (imageData: string) => {
    setIsCameraOpen(false);
    setPhotoData(imageData);
    setIsProcessing(true);
    const processingToastId = toast.loading("Salvando ponto e foto...");

    try {
      if (!session?.user?.id || !locationData || !imageData) { // Use imageData directly
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
        tipo_batida: isClockedIn ? 'saída' : 'entrada',
        timestamp_solicitado: now.toISOString(),
        latitude: locationData.latitude,
        longitude: locationData.longitude,
        foto_url: publicUrlData.publicUrl,
        status: 'pendente', // Status padrão
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
      setIsClockedIn(prev => !prev);
      setLastActionTime(now.toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }));

      toast.dismiss(processingToastId);
      toast.success(`Ponto registrado: ${isClockedIn ? 'Saída' : 'Entrada'} às ${now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}`);
      window.dispatchEvent(new Event('supabaseDataChange')); // Notificar outros componentes
    } catch (error: any) {
      console.error("Erro ao registrar ponto:", error.message);
      toast.dismiss(processingToastId);
      toast.error("Erro ao registrar ponto: " + error.message);
    } finally {
      setIsProcessing(false);
      setPhotoData(null);
      setLocationData(null);
    }
  };

  const handleCameraClose = () => {
    setIsCameraOpen(false);
    setPhotoData(null);
    setLocationData(null);
    setIsProcessing(false); // Redefine o estado de processamento se a câmera for fechada sem captura
    toast.info("Captura de foto cancelada.");
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <CurrentDateTime />
      <Button
        onClick={handleClockInOut}
        disabled={isProcessing || !session?.user?.id}
        className={cn(
          "mt-4 px-8 py-6 text-lg font-semibold rounded-full shadow-lg transition-all duration-300 hover:scale-105",
          isClockedIn ? "bg-red-600 hover:bg-red-700" : "bg-green-600 hover:bg-green-700",
          (isProcessing || !session?.user?.id) && "opacity-60 cursor-not-allowed"
        )}
      >
        {isProcessing ? (
          <Loader2 className="mr-2 h-6 w-6 animate-spin" />
        ) : isClockedIn ? (
          <LogOut className="mr-2 h-6 w-6" />
        ) : (
          <LogIn className="mr-2 h-6 w-6" />
        )}
        {isProcessing ? "Processando..." : (isClockedIn ? "Bater Saída" : "Bater Entrada")}
      </Button>
      <p className="text-sm text-muted-foreground mt-2">
        {isClockedIn ? "Você está atualmente DENTRO." : "Você está atualmente FORA."}
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