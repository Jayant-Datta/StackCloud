"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { FolderOpen, Sparkles, Plus, Loader2 } from "lucide-react";
import { useDropzone , Accept } from "react-dropzone";
import { toast } from "sonner";
import { usePathname } from "next/navigation";
import { uploadFile } from "@/lib/appwrite/file.action";
import { MAX_FILE_SIZE } from "@/lib/constants";

// 1. Helper function to restrict file types based on the current route
const getAcceptedFiles = (type: string): Accept | undefined =>  {
  switch (type.toLowerCase()) {
    case "documents":
      return { "application/pdf": [".pdf"] };
    case "images":
      return {
        "image/jpeg": [".jpeg", ".jpg"],
        "image/png": [".png"],
        "image/svg+xml": [".svg"],
      };
    case "media":
      return {
        "video/mp4": [".mp4"],
        "audio/mpeg": [".mp3"],
      };
    case "others":
    default:
      return undefined; // Accepts any file type
  }
};

const LuminaEmptyState = ({
  type,
  ownerId,
  accountId,
}: {
  type: string;
  ownerId: string;
  accountId: string;
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const spotRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const path = usePathname();

  useEffect(() => {
    const timer = setTimeout(() => setIsMounted(true), 100);
    return () => clearTimeout(timer);
  }, []);

  // 2. Dropzone Upload Logic
 const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      setIsUploading(true);
      
      try {
        const uploadedFiles = acceptedFiles.map(async (file) => {
          if (file.size > MAX_FILE_SIZE) {
            toast.error(`Failed to upload ${file.name}`, {
              description: `${file.name} is too large. Max file size is 50 MB.`,
            });
            return;
          }
          
          const uploadedFile = await uploadFile({ file, ownerId, accountId, path });
          if (uploadedFile) {
              toast.success(`${file.name} uploaded successfully`);
          }
          return uploadedFile;
        });

        await Promise.all(uploadedFiles);
      } catch (error) {
        console.error("Upload Error:", error);
        toast.error("Something went wrong during upload.");
      } finally {
        // FIXED: This will now always run, even if the upload crashes
        setIsUploading(false);
      }
    },
    [accountId, ownerId, path]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: getAcceptedFiles(type),
  });

  // Spotlight Logic
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!containerRef.current || !spotRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = (((e.clientX - rect.left) / rect.width) * 100).toFixed(1);
    const y = (((e.clientY - rect.top) / rect.height) * 100).toFixed(1);
    spotRef.current.style.background = `radial-gradient(circle 240px at ${x}% ${y}%, rgba(225, 78, 122, 0.16), transparent 70%)`;
  };

  const handleMouseLeave = () => {
    if (!spotRef.current) return;
    spotRef.current.style.background = `radial-gradient(circle 200px at 50% 50%, rgba(247, 168, 189, 0.15), transparent 70%)`;
  };

  // Canvas Particles Logic
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !containerRef.current) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let particleSpeedMultiplier = isDragActive ? 4.5 : 1;

    const resize = () => {
      canvas.width = containerRef.current?.clientWidth || 0;
      canvas.height = containerRef.current?.clientHeight || 0;
    };
    resize();
    window.addEventListener("resize", resize);

    const particles = Array.from({ length: 24 }).map(() => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      radius: Math.random() * 2 + 0.6,
      baseSpeed: Math.random() * 0.25 + 0.08,
      drift: Math.random() * 0.4 - 0.2,
      opacity: Math.random() * 0.4 + 0.1,
    }));

    const tick = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach((p) => {
        p.y -= p.baseSpeed * particleSpeedMultiplier;
        p.x += p.drift * 0.2;

        if (p.y < -5) {
          p.y = canvas.height + 5;
          p.x = Math.random() * canvas.width;
        }

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(225, 78, 122, ${p.opacity})`;
        ctx.fill();
      });
      animationFrameId = requestAnimationFrame(tick);
    };
    tick();

    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(animationFrameId);
    };
  }, [isDragActive]);

  return (
    // 3. Apply getRootProps to the main container
    <div
      {...getRootProps()}
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={`relative w-full h-[480px] rounded-2xl border-2 border-dashed transition-all duration-500 overflow-hidden flex flex-col items-center justify-center cursor-pointer group mt-4 outline-none ${
        isDragActive
          ? "scale-[1.01] border-[#e14e7a] bg-[#fcedf0]/40 shadow-[0_20px_40px_rgba(225,78,122,0.15)]"
          : "border-gray-200 bg-slate-50/50 hover:border-[#f15a75]/60"
      }`}
    >
      {/* 4. Hidden input required for Dropzone */}
      <input {...getInputProps()} />

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-10px) rotate(2deg); }
        }
        .animate-float { animation: float 4s ease-in-out infinite; }
        
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        .animate-text-shimmer {
          background-size: 200% 100%;
          animation: shimmer 4s linear infinite;
        }
      `}</style>

      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none opacity-40 transition-opacity duration-500 group-hover:opacity-75"
      />

      <div
        ref={spotRef}
        className="absolute inset-0 pointer-events-none transition-opacity duration-500"
        style={{
          background: "radial-gradient(circle 200px at 50% 50%, rgba(247, 168, 189, 0.15), transparent 70%)",
        }}
      />

      <div className="relative z-10 flex flex-col items-center text-center max-w-md px-6">
        
        <div className="animate-float relative w-28 h-28 flex items-center justify-center mb-6 pointer-events-none">
          <div className="absolute inset-0 bg-gradient-to-tr from-[#e14e7a]/20 to-[#f7a8bd]/30 rounded-full blur-xl scale-90 group-hover:scale-110 transition-transform duration-500" />
          <div className="absolute inset-2 bg-white/65 backdrop-blur-md border border-white rounded-2xl shadow-sm" />
          <FolderOpen className="relative z-10 w-10 h-10 text-[#e14e7a] group-hover:scale-110 transition-transform duration-300" />
          <Sparkles className="absolute top-2 right-2 w-5 h-5 text-pink-400 animate-pulse z-20" />
        </div>

        <h3
          className={`text-xl font-bold text-slate-800 tracking-tight transition-all duration-700 pointer-events-none ${
            isMounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          }`}
        >
          Your {type} gallery,{" "}
          <span className="italic bg-gradient-to-r from-[#e14e7a] via-[#f7a8bd] to-[#9c2c53] bg-clip-text text-transparent animate-text-shimmer">
            waiting to shine.
          </span>
        </h3>

        <p
          className={`text-sm text-slate-400 mt-2.5 leading-relaxed transition-all duration-700 delay-150 pointer-events-none ${
            isMounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          }`}
        >
          This space is currently empty. Bring it to life by dragging your files right here, or click below to browse.
        </p>

        <div
          className={`mt-8 transition-all duration-700 delay-300 ${
            isMounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          }`}
        >
          <div className="inline-flex items-center gap-2 bg-white border border-gray-100 group-hover:border-[#f7a8bd] text-slate-600 group-hover:text-[#e14e7a] px-6 py-3 rounded-xl text-sm font-semibold transition-all duration-300 shadow-sm group-hover:shadow-md pointer-events-none">
            {isUploading ? (
               <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
               <Plus className="w-5 h-5" />
            )}
            <span>{isUploading ? "Uploading..." : "Select Files"}</span>
          </div>
          <span className="block text-[11px] text-slate-400 mt-3 font-medium uppercase tracking-wider pointer-events-none">
            or drop files here
          </span>
        </div>
      </div>

      <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-gradient-to-tr from-[#f7a8bd]/10 to-transparent rounded-full blur-2xl pointer-events-none" />
      <div className="absolute -top-10 -right-10 w-40 h-40 bg-gradient-to-bl from-[#e14e7a]/10 to-transparent rounded-full blur-2xl pointer-events-none" />
    </div>
  );
};

export default LuminaEmptyState;