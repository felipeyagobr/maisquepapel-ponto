"use client";

import React, { useRef, useCallback, useState } from "react";
import Webcam from "react-webcam";
import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import { Camera, RefreshCcw, Check, X } from "lucide-react";
import { toast } from "sonner";

interface CameraCaptureProps {
  onCapture: (imageData: string) => void;
  onClose: () => void;
}

const videoConstraints = {
  width: 720,
  height: 720,
  facingMode: "user", // 'user' para câmera frontal, 'environment' para câmera traseira
};

const CameraCapture = ({ onCapture, onClose }: CameraCaptureProps) => {
  const webcamRef = useRef<Webcam>(null);
  const [imgSrc, setImgSrc] = useState<string | null>(null);
  const [isCameraReady, setIsCameraReady] = useState(false);

  const capture = useCallback(() => {
    if (webcamRef.current) {
      const imageSrc = webcamRef.current.getScreenshot();
      if (imageSrc) {
        setImgSrc(imageSrc);
      } else {
        toast.error("Não foi possível capturar a imagem.");
      }
    }
  }, [webcamRef]);

  const retakePhoto = () => {
    setImgSrc(null);
  };

  const handleUserMedia = useCallback(() => {
    setIsCameraReady(true);
  }, []);

  const handleUserMediaError = useCallback((error: string | DOMException) => {
    console.error("Erro ao acessar a câmera:", error);
    toast.error("Erro ao acessar a câmera. Verifique as permissões.");
    onClose(); // Fecha o diálogo se o acesso à câmera falhar
  }, [onClose]);

  return (
    <div className="flex flex-col items-center gap-4 p-4">
      {imgSrc ? (
        <img src={imgSrc} alt="Captured" className="w-full h-auto rounded-md object-cover" />
      ) : (
        <div className="relative w-full aspect-square bg-gray-200 dark:bg-gray-800 rounded-md overflow-hidden flex items-center justify-center">
          {!isCameraReady && (
            <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
              Aguardando acesso à câmera...
            </div>
          )}
          <Webcam
            audio={false}
            ref={webcamRef}
            screenshotFormat="image/jpeg"
            videoConstraints={videoConstraints}
            onUserMedia={handleUserMedia}
            onUserMediaError={handleUserMediaError}
            className="w-full h-full object-cover"
          />
        </div>
      )}

      <DialogFooter className="flex flex-col sm:flex-row sm:justify-end gap-2 w-full">
        {imgSrc ? (
          <>
            <Button variant="outline" onClick={retakePhoto} className="w-full sm:w-auto">
              <RefreshCcw className="mr-2 h-4 w-4" /> Tirar Outra
            </Button>
            <Button onClick={() => onCapture(imgSrc)} className="w-full sm:w-auto">
              <Check className="mr-2 h-4 w-4" /> Confirmar Foto
            </Button>
          </>
        ) : (
          <Button onClick={capture} disabled={!isCameraReady} className="w-full sm:w-auto">
            <Camera className="mr-2 h-4 w-4" /> Tirar Foto
          </Button>
        )}
        <Button variant="secondary" onClick={onClose} className="w-full sm:w-auto">
          <X className="mr-2 h-4 w-4" /> Cancelar
        </Button>
      </DialogFooter>
    </div>
  );
};

export default CameraCapture;