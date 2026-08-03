import React, { useEffect, useRef, useState } from 'react';
import jsQR from 'jsqr';
import { Camera, X, QrCode, AlertCircle, Search } from 'lucide-react';

interface QRCodeExpenseScannerProps {
  onScanSuccess: (cadetNumber: string, warName?: string, userId?: string) => void;
  onClose: () => void;
  theme?: 'dark' | 'light';
}

export const QRCodeExpenseScanner: React.FC<QRCodeExpenseScannerProps> = ({
  onScanSuccess,
  onClose,
  theme = 'dark',
}) => {
  const [activeTab, setActiveTab] = useState<'camera' | 'manual'>('camera');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [manualInput, setManualInput] = useState<string>('');

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameIdRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const isDark = theme === 'dark';

  // Parser do QR Code da SCAER
  const processDecodedQRCode = (decodedText: string) => {
    // Formato esperado: SCAER_CADET_ID:23/001:MORO:usr_id
    if (decodedText.startsWith('SCAER_CADET_ID:')) {
      const parts = decodedText.split(':');
      const cadetNumber = parts[1];
      const warName = parts[2];
      const userId = parts[3];
      onScanSuccess(cadetNumber, warName, userId);
    } else {
      onScanSuccess(decodedText.trim());
    }
  };

  // 1. Inicializar Câmera e Loop do Scanner jsQR
  useEffect(() => {
    if (activeTab !== 'camera') {
      stopCamera();
      return;
    }

    let isSubscribed = true;

    async function startCamera() {
      try {
        setCameraError(null);
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } },
        });

        if (!isSubscribed) return;
        streamRef.current = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.setAttribute('playsinline', 'true');
          await videoRef.current.play();

          requestAnimationFrame(scanVideoFrame);
        }
      } catch (err: any) {
        console.warn('Câmera indisponível ou permissão negada:', err);
        setCameraError('Permissão para câmera negada ou dispositivo indisponível. Utilize a busca manual.');
        setActiveTab('manual');
      }
    }

    startCamera();

    return () => {
      isSubscribed = false;
      stopCamera();
    };
  }, [activeTab]);

  const stopCamera = () => {
    if (animFrameIdRef.current) {
      cancelAnimationFrame(animFrameIdRef.current);
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  };

  const scanVideoFrame = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (video && canvas && video.readyState === video.HAVE_ENOUGH_DATA) {
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (ctx) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: 'dontInvert',
        });

        if (code && code.data) {
          stopCamera();
          processDecodedQRCode(code.data);
          return;
        }
      }
    }

    animFrameIdRef.current = requestAnimationFrame(scanVideoFrame);
  };

  // Busca Manual
  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualInput.trim()) {
      processDecodedQRCode(manualInput.trim());
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in">
      <div className={`w-full max-w-md rounded-3xl border p-6 sm:p-8 shadow-2xl space-y-6 relative ${
        isDark ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
      }`}>
        
        {/* Botão Fechar */}
        <button 
          onClick={() => { stopCamera(); onClose(); }}
          className="absolute top-4 right-4 p-2 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition-all"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center space-x-3">
          <div className="p-3 rounded-2xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <QrCode className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-extrabold">Leitor de Cédula Digital</h3>
            <p className="text-xs text-slate-400">Escaneie o QR Code do Cadete para lançar gastos</p>
          </div>
        </div>

        {/* Seleção de Modo (Câmera vs Digitar Nº) */}
        <div className={`flex items-center space-x-1 p-1 rounded-2xl border text-xs font-bold ${
          isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-100 border-slate-200'
        }`}>
          <button
            onClick={() => setActiveTab('camera')}
            className={`flex-1 py-2.5 rounded-xl transition-all flex items-center justify-center space-x-1.5 ${
              activeTab === 'camera'
                ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20 font-extrabold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Camera className="w-4 h-4" />
            <span>Câmera ao Vivo</span>
          </button>

          <button
            onClick={() => setActiveTab('manual')}
            className={`flex-1 py-2.5 rounded-xl transition-all flex items-center justify-center space-x-1.5 ${
              activeTab === 'manual'
                ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20 font-extrabold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Search className="w-4 h-4" />
            <span>Digitar Nº</span>
          </button>
        </div>

        {/* MODO 1: CÂMERA AO VIVO */}
        {activeTab === 'camera' && (
          <div className="space-y-4">
            <div className="relative rounded-2xl overflow-hidden bg-slate-950 border-2 border-cyan-500/40 aspect-square flex items-center justify-center shadow-2xl">
              <video ref={videoRef} className="w-full h-full object-cover" />
              <canvas ref={canvasRef} className="hidden" />

              {/* Mira do QR Code */}
              <div className="absolute inset-12 border-2 border-dashed border-cyan-400/80 rounded-2xl pointer-events-none animate-pulse flex items-center justify-center">
                <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-lg shadow-cyan-400/50 animate-bounce" />
              </div>
            </div>

            <p className="text-[11px] text-center text-slate-400">
              Aproxime o QR Code da Cédula do Cadete no centro do leitor
            </p>
          </div>
        )}

        {/* MODO 2: DIGITAR NÚMERO */}
        {activeTab === 'manual' && (
          <form onSubmit={handleManualSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300">Número de Ordem ou Nome do Cadete</label>
              <input
                type="text"
                placeholder="Ex: 23/001 ou MORO"
                value={manualInput}
                onChange={(e) => setManualInput(e.target.value)}
                className={`w-full border rounded-2xl px-4 py-3 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-cyan-500/50 ${
                  isDark ? 'bg-slate-950 border-slate-800 text-slate-100' : 'bg-slate-50 border-slate-300 text-slate-900'
                }`}
                required
              />
            </div>

            <button
              type="submit"
              className="w-full py-3 rounded-2xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-extrabold text-xs transition-all shadow-lg shadow-cyan-500/20"
            >
              Confirmar Cadete para Lançamento
            </button>
          </form>
        )}

        {cameraError && (
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs flex items-center space-x-2 font-medium">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{cameraError}</span>
          </div>
        )}

      </div>
    </div>
  );
};
