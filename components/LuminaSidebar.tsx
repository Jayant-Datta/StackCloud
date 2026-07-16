"use client";

import React, { useEffect, useRef } from "react";
import gsap from "gsap";
import { Aperture, Zap, ShieldCheck } from "lucide-react";

const LuminaSidebar = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const spotlightRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const textRefs = useRef<(HTMLDivElement | null)[]>([]);

  // 1. Mouse Spotlight Logic
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!containerRef.current || !spotlightRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    
    // Updates the spotlight position instantly
    spotlightRef.current.style.background = `radial-gradient(circle 250px at ${x}% ${y}%, rgba(255,255,255,0.18), transparent 70%)`;
  };

  // 2. Canvas Particles (Motes) Logic
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    
    let animationFrameId: number;

    const resize = () => {
      canvas.width = canvas.parentElement?.clientWidth || window.innerWidth;
      canvas.height = canvas.parentElement?.clientHeight || window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    // Initialize Particles
    const particles: { x: number; y: number; r: number; speed: number; drift: number; o: number }[] = [];
    for (let i = 0; i < 30; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        r: Math.random() * 1.8 + 0.6,
        speed: Math.random() * 0.35 + 0.1,
        drift: Math.random() * 0.6 - 0.3,
        o: Math.random() * 0.5 + 0.2,
      });
    }

    const tick = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach((p) => {
        p.y -= p.speed;
        p.x += p.drift * 0.2;
        // Loop particles back to the bottom
        if (p.y < -5) {
          p.y = canvas.height + 5;
          p.x = Math.random() * canvas.width;
        }
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${p.o})`;
        ctx.fill();
      });
      animationFrameId = requestAnimationFrame(tick);
    };
    tick();

    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  // 3. GSAP Entrance Animations
  useEffect(() => {
    // gsap.context ensures animations clean themselves up properly in React Strict Mode
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ delay: 0.1 });
      
      textRefs.current.forEach((el, index) => {
        if (el) {
          // Staggers the entrance: fades in and slides up
          tl.to(el, { opacity: 1, y: 0, duration: 0.7, ease: "power2.out" }, index === 0 ? 0 : "-=0.4");
        }
      });
      
      // Infinite breathing animation for the icons
      gsap.to(".pulse-icon", {
        opacity: 0.6,
        yoyo: true,
        repeat: -1,
        duration: 1.5,
        ease: "sine.inOut",
        stagger: 0.5
      });
    });

    return () => ctx.revert();
  }, []);

  return (
    <section 
      ref={containerRef}
      onMouseMove={handleMouseMove}
      className="hidden lg:flex flex-1 relative bg-gradient-to-br from-[#f7a8bd] via-[#e14e7a] to-[#9c2c53] overflow-hidden p-12 flex-col justify-center"
    >
      {/* Canvas for Particles */}
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />
      
      {/* Spotlight layer */}
      <div ref={spotlightRef} className="absolute inset-0 pointer-events-none transition-colors duration-75" style={{ background: 'radial-gradient(circle 250px at 50% 30%, rgba(255,255,255,0.18), transparent 70%)' }} />

      {/* Embedded CSS for the Shimmer effect */}
      <style>{`
        @keyframes shimmer {
          0% { background-position: 200% center; }
          100% { background-position: -200% center; }
        }
        .animate-shimmer {
          background: linear-gradient(90deg, #ffe3ec 0%, #ffffff 50%, #ffe3ec 100%);
          background-size: 200% auto;
          color: transparent;
          -webkit-background-clip: text;
          background-clip: text;
          animation: shimmer 4s linear infinite;
        }
      `}</style>

      {/* Content Container */}
      <div className="relative z-10 max-w-sm flex flex-col justify-center">
        
        {/* Logo */}
        <div 
          ref={el => { textRefs.current[0] = el }} 
          className="flex items-center gap-3 opacity-0 translate-y-4"
        >
          <div className="bg-white/20 p-2 rounded-xl backdrop-blur-sm">
            <Aperture className="w-6 h-6 text-white stroke-[2.5px]" />
          </div>
          <span className="text-[22px] font-semibold text-white tracking-tight">Lumina.</span>
        </div>

        {/* Headline */}
        <div 
          ref={el => { textRefs.current[1] = el }}
          className="mt-6 text-4xl font-semibold text-white leading-[1.2] opacity-0 translate-y-4"
        >
          Your digital world, <br />
          <span className="animate-shimmer italic font-light">illuminated.</span>
        </div>

        {/* Subtext */}
        <div 
          ref={el => { textRefs.current[2] = el }}
          className="mt-4 text-[15px] text-white/85 leading-relaxed opacity-0 translate-y-4"
        >
          Experience a brilliantly simple way to store, organize, and access your files.
        </div>

        {/* Feature Pills */}
        <div 
          ref={el => { textRefs.current[3] = el }}
          className="mt-8 flex flex-col gap-3 opacity-0 translate-y-4"
        >
          <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md px-4 py-3 rounded-xl border border-white/10 w-max shadow-sm">
            <Zap className="w-4 h-4 text-white pulse-icon" />
            <span className="text-[14px] font-medium text-white tracking-wide">Lightning fast uploads</span>
          </div>
          
          <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md px-4 py-3 rounded-xl border border-white/10 w-max shadow-sm">
            <ShieldCheck className="w-4 h-4 text-white pulse-icon" />
            <span className="text-[14px] font-medium text-white tracking-wide">Military-grade encryption</span>
          </div>
        </div>
      </div>
    </section>
  );
};

export default LuminaSidebar;