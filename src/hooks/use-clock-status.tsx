"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/integrations/supabase/auth";
import { toast } from "sonner";
import { ClockEvent } from "@/types/clock";
import { startOfDay, endOfDay } from "date-fns";

interface ClockStatus {
  isClockedIn: boolean;
  isOnLunch: boolean;
  hasClockedInToday: boolean;
  hasClockedOutToday: boolean;
  lastActionTime: string | null;
  isLoadingStatus: boolean;
  handleClockAction: (actionType: ClockEvent['tipo_batida'], photoData: string | null, locationData: { latitude: number; longitude: number } | null) => Promise<void>;
}

export function useClockStatus(): ClockStatus {
  const { session } = useSession();
  const [isClockedIn, setIsClockedIn] = useState<boolean>(false);
  const [isOnLunch, setIsOnLunch] = useState<boolean>(false);
  const [hasClockedInToday, setHasClockedInToday] = useState<boolean>(false);
  const [hasClockedOutToday, setHasClockedOutToday] = useState<boolean>(false);
  const [lastActionTime, setLastActionTime] = useState<string | null>(null);
  const [isLoadingStatus, setIsLoadingStatus] = useState(true);

  const fetchClockStatus = useCallback(async () => {
    if (!session?.user?.id) {
      setIsClockedIn(false);
      setIsOnLunch(false);
      setHasClockedInToday(false);
      setHasClockedOutToday(false);
      setLastActionTime(null);
      setIsLoadingStatus(false);
      return;
    }

    setIsLoadingStatus(true);
    const todayStart = startOfDay(new Date()).toISOString();
    const todayEnd = endOfDay(new Date()).toISOString();

    const { data: dailyPontos, error } = await supabase
      .from('pontos')
      .select('tipo_batida, timestamp_solicitado')
      .eq('user_id', session.user.id)
      .gte('timestamp_solicitado', todayStart)
      .lte('timestamp_solicitado', todayEnd)
      .order('timestamp_solicitado', { ascending: true });

    if (error) {
      console.error("Erro ao carregar status inicial do ponto:", error.message);
      toast.error("Erro ao carregar status inicial do ponto.");
      setIsLoadingStatus(false);
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
        currentIsClockedIn = true;
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
    setIsLoadingStatus(false);
  }, [session]);

  useEffect(() => {
    if (session) {
      fetchClockStatus();
      window.addEventListener('supabaseDataChange', fetchClockStatus);
      return () => window.removeEventListener('supabaseDataChange', fetchClockStatus);
    }
  }, [session, fetchClockStatus]);

  const handleClockAction = useCallback(async (actionType: ClockEvent['tipo_batida'], photoData: string | null, locationData: { latitude: number; longitude: number } | null) => {
    if (!session?.user?.id) {
      toast.error("Você precisa estar logado para registrar o ponto.");
      return;
    }
    if (!locationData || !photoData) {
      toast.error("Dados de localização ou foto ausentes. Ponto não registrado.");
      return;
    }

    const processingToastId = toast.loading("Salvando ponto e foto...");

    try {
      // 1. Fazer Upload da Foto para o Supabase Storage
      const file = await fetch(photoData).then(res => res.blob());
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
      const newPonto: Omit<ClockEvent, 'id' | 'created_at' | 'displayTime' | 'employeeName'> = {
        user_id: session.user.id,
        tipo_batida: actionType,
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

      toast.dismiss(processingToastId);
      toast.success(`Ponto registrado: ${actionType === 'entrada' ? 'Entrada' : actionType === 'saída' ? 'Saída' : actionType === 'saida_almoco' ? 'Saída para Almoço' : 'Volta do Almoço'} às ${now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}`);
      window.dispatchEvent(new Event('supabaseDataChange')); // Notifica outros componentes para refetch
    } catch (error: any) {
      console.error("Erro ao registrar ponto:", error.message);
      toast.dismiss(processingToastId);
      toast.error("Erro ao registrar ponto: " + error.message);
      throw error; // Re-throw to allow component to handle processing state
    }
  }, [session]);

  return {
    isClockedIn,
    isOnLunch,
    hasClockedInToday,
    hasClockedOutToday,
    lastActionTime,
    isLoadingStatus,
    handleClockAction,
  };
}