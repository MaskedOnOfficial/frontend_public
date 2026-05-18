import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import jsQR from "jsqr";
import api from "../lib/api";
import { getApiErrorMessage } from "../lib/errors";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Camera, CheckCircle2, XCircle, AlertTriangle,
  Star, Loader2, RotateCcw, ScanLine,
} from "lucide-react";
import type { Ticket as TicketType } from "../types";

type ScanResult =
  | { type: "success"; ticket: TicketType; already_checked_in: false }
  | { type: "already"; ticket: TicketType; already_checked_in: true }
  | { type: "error"; message: string };

export default function ScanTicketPage() {
  const { partyId } = useParams<{ partyId: string }>();

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanningRef = useRef(true); // prevent double-scans

  const [cameraError, setCameraError] = useState("");
  const [scanning, setScanning] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);

  // Start camera
  const startCamera = useCallback(async () => {
    setCameraError("");
    scanningRef.current = true;
    setResult(null);
    setScanning(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch {
      setCameraError("Camera access denied. Please allow camera permission and try again.");
      setScanning(false);
    }
  }, []);

  // Stop camera
  const stopCamera = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }, []);

  // Submit scanned token to backend
  const submitToken = useCallback(async (token: string) => {
    if (submitting) return;
    scanningRef.current = false;
    setScanning(false);
    setSubmitting(true);
    stopCamera();
    try {
      const res = await api.post(`/parties/${partyId}/scan-ticket`, { token });
      const { ticket, already_checked_in } = res.data.data as {
        ticket: TicketType;
        already_checked_in: boolean;
      };
      setResult(already_checked_in
        ? { type: "already", ticket, already_checked_in: true }
        : { type: "success", ticket, already_checked_in: false }
      );
    } catch (err) {
      setResult({ type: "error", message: getApiErrorMessage(err, "Invalid QR code") });
    } finally {
      setSubmitting(false);
    }
  }, [partyId, submitting, stopCamera]);

  // QR scan loop
  useEffect(() => {
    const tick = () => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas || !scanningRef.current || video.readyState < video.HAVE_ENOUGH_DATA) {
        animFrameRef.current = requestAnimationFrame(tick);
        return;
      }

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) { animFrameRef.current = requestAnimationFrame(tick); return; }

      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imageData.data, imageData.width, imageData.height, { inversionAttempts: "dontInvert" });

      if (code && code.data && /^[0-9a-f]{64}$/.test(code.data)) {
        submitToken(code.data);
        return;
      }

      animFrameRef.current = requestAnimationFrame(tick);
    };

    animFrameRef.current = requestAnimationFrame(tick);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [submitToken]);

  useEffect(() => {
    startCamera();
    return () => { stopCamera(); };
  }, [startCamera, stopCamera]);

  const handleScanAgain = () => {
    setResult(null);
    setScanning(true);
    scanningRef.current = true;
    startCamera();
    // Restart scan loop
    const tick = () => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas || !scanningRef.current || video.readyState < video.HAVE_ENOUGH_DATA) {
        animFrameRef.current = requestAnimationFrame(tick);
        return;
      }
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) { animFrameRef.current = requestAnimationFrame(tick); return; }
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imageData.data, imageData.width, imageData.height, { inversionAttempts: "dontInvert" });
      if (code && code.data && /^[0-9a-f]{64}$/.test(code.data)) {
        submitToken(code.data);
        return;
      }
      animFrameRef.current = requestAnimationFrame(tick);
    };
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    animFrameRef.current = requestAnimationFrame(tick);
  };

  return (
    <div className="min-h-screen bg-bg pb-28 md:pb-0 premium-shell">
      <div className="max-w-md mx-auto px-4 py-6">

        {/* Back */}
        <motion.div initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} className="mb-6">
          <Link
            to={`/parties/${partyId}`}
            className="flex items-center gap-1.5 text-text-dim hover:text-text text-sm font-semibold transition"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Event
          </Link>
        </motion.div>

        <h1 className="text-2xl font-black text-text mb-1">Scan Guest Ticket</h1>
        <p className="text-sm text-text-dim mb-6">Point camera at the guest's QR code to check them in.</p>

        {/* Camera viewfinder */}
        <div className="relative rounded-2xl overflow-hidden bg-black border border-border aspect-square max-w-sm mx-auto mb-6">
          <video
            ref={videoRef}
            className="absolute inset-0 w-full h-full object-cover"
            playsInline
            muted
            autoPlay
          />
          <canvas ref={canvasRef} className="hidden" />

          {/* Scanner overlay */}
          {scanning && !cameraError && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              {/* Corner brackets */}
              <div className="relative w-52 h-52">
                <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-primary rounded-tl-lg" />
                <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-primary rounded-tr-lg" />
                <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-primary rounded-bl-lg" />
                <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-primary rounded-br-lg" />
                {/* Scan line animation */}
                <motion.div
                  className="absolute left-1 right-1 h-0.5 bg-primary/80 rounded-full shadow-lg shadow-primary/50"
                  animate={{ top: ["10%", "85%", "10%"] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                />
              </div>
              <div className="absolute bottom-3 left-0 right-0 flex justify-center">
                <span className="flex items-center gap-1.5 text-[10px] font-bold text-white/80 bg-black/40 px-3 py-1 rounded-full backdrop-blur-sm">
                  <ScanLine className="w-3 h-3" />
                  Scanning for QR code...
                </span>
              </div>
            </div>
          )}

          {/* Camera error state */}
          {cameraError && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center">
              <Camera className="w-10 h-10 text-text-dim" />
              <p className="text-sm text-text-dim">{cameraError}</p>
              <button
                onClick={startCamera}
                className="btn-primary-luxe px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2"
              >
                <RotateCcw className="w-4 h-4" /> Retry
              </button>
            </div>
          )}

          {/* Submitting overlay */}
          {submitting && (
            <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center gap-3 backdrop-blur-sm">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
              <p className="text-sm text-white font-bold">Verifying...</p>
            </div>
          )}
        </div>

        {/* Result card */}
        <AnimatePresence>
          {result && (
            <motion.div
              initial={{ opacity: 0, y: 16, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ type: "spring", stiffness: 300, damping: 28 }}
            >
              {result.type === "success" && (
                <div className="glass-panel rounded-2xl p-5 border border-success/30 bg-success/5">
                  <div className="flex items-center gap-2 mb-4">
                    <CheckCircle2 className="w-6 h-6 text-success" />
                    <span className="text-lg font-black text-success">Checked In!</span>
                  </div>
                  <GuestCard ticket={result.ticket} />
                  <button
                    onClick={handleScanAgain}
                    className="mt-4 btn-primary-luxe w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold"
                  >
                    <ScanLine className="w-4 h-4" /> Scan Next Guest
                  </button>
                </div>
              )}

              {result.type === "already" && (
                <div className="glass-panel rounded-2xl p-5 border border-warning/30 bg-warning/5">
                  <div className="flex items-center gap-2 mb-4">
                    <AlertTriangle className="w-6 h-6 text-warning" />
                    <span className="text-lg font-black text-warning">Already Checked In</span>
                  </div>
                  <p className="text-sm text-text-dim mb-4">
                    This QR code was already used. The guest has been checked in previously.
                  </p>
                  <GuestCard ticket={result.ticket} />
                  <button
                    onClick={handleScanAgain}
                    className="mt-4 btn-secondary-luxe w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold"
                  >
                    <ScanLine className="w-4 h-4" /> Scan Again
                  </button>
                </div>
              )}

              {result.type === "error" && (
                <div className="glass-panel rounded-2xl p-5 border border-error/30 bg-error/5">
                  <div className="flex items-center gap-2 mb-3">
                    <XCircle className="w-6 h-6 text-error" />
                    <span className="text-lg font-black text-error">Invalid Ticket</span>
                  </div>
                  <p className="text-sm text-text-dim mb-4">{result.message}</p>
                  <button
                    onClick={handleScanAgain}
                    className="btn-primary-luxe w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold"
                  >
                    <ScanLine className="w-4 h-4" /> Try Again
                  </button>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function GuestCard({ ticket }: { ticket: TicketType }) {
  return (
    <div className="flex items-center gap-3 bg-surface-light rounded-xl p-3 border border-border">
      {ticket.guest_avatar_url ? (
        <img
          src={ticket.guest_avatar_url}
          alt=""
          className="w-12 h-12 rounded-full object-cover border border-border shrink-0"
        />
      ) : (
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary/30 to-accent/30 border border-primary/20 flex items-center justify-center text-sm font-bold text-primary shrink-0">
          {(ticket.guest_display_name ?? "G").charAt(0).toUpperCase()}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="font-bold text-text truncate">{ticket.guest_display_name}</p>
        <p className="text-xs text-text-dim truncate">@{ticket.guest_username}</p>
      </div>
      {ticket.guest_social_rating > 0 && (
        <div className="flex items-center gap-1 shrink-0">
          <Star className="w-4 h-4 text-warning fill-warning" />
          <span className="text-sm font-bold text-warning">{ticket.guest_social_rating.toFixed(1)}</span>
        </div>
      )}
    </div>
  );
}
