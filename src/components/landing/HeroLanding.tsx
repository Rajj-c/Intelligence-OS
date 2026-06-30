import { useEffect, useRef, useState } from "react";
import { ArrowRight, Brain, Github, Linkedin, Twitter, X } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";

const VIDEO_URL =
  "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260328_115001_bcdaa3b4-03de-47e7-ad63-ae3e392c32d4.mp4";

export default function HeroLanding() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const rafRef = useRef<number | null>(null);
  const fadingOutRef = useRef(false);
  const [showPopup, setShowPopup] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const FADE_MS = 500;
    const FADE_OUT_BEFORE_END = 0.55;

    const cancelAnim = () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };

    const fadeTo = (target: number) => {
      cancelAnim();
      const start = performance.now();
      const from = parseFloat(video.style.opacity || "0");
      const step = (now: number) => {
        const t = Math.min(1, (now - start) / FADE_MS);
        const val = from + (target - from) * t;
        video.style.opacity = String(val);
        if (t < 1) rafRef.current = requestAnimationFrame(step);
        else rafRef.current = null;
      };
      rafRef.current = requestAnimationFrame(step);
    };

    const onLoaded = () => {
      video.style.opacity = "0";
      video.play().catch(() => {});
      fadeTo(1);
    };

    const onTimeUpdate = () => {
      if (!video.duration) return;
      const remaining = video.duration - video.currentTime;
      if (remaining <= FADE_OUT_BEFORE_END && !fadingOutRef.current) {
        fadingOutRef.current = true;
        fadeTo(0);
      }
    };

    const onEnded = () => {
      video.style.opacity = "0";
      setTimeout(() => {
        video.currentTime = 0;
        video.play().catch(() => {});
        fadingOutRef.current = false;
        fadeTo(1);
      }, 100);
    };

    video.addEventListener("loadeddata", onLoaded);
    video.addEventListener("timeupdate", onTimeUpdate);
    video.addEventListener("ended", onEnded);
    return () => {
      cancelAnim();
      video.removeEventListener("loadeddata", onLoaded);
      video.removeEventListener("timeupdate", onTimeUpdate);
      video.removeEventListener("ended", onEnded);
    };
  }, []);

  return (
    <div className="relative min-h-screen bg-black overflow-hidden flex flex-col">
      {/* Background video */}
      <video
        ref={videoRef}
        src={VIDEO_URL}
        autoPlay
        muted
        playsInline
        className="absolute inset-0 w-full h-full object-cover translate-y-[17%]"
        style={{ opacity: 0 }}
      />
      {/* Dark gradient overlay for legibility */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/30 to-black/80 z-[1]" />

      {/* Nav */}
      <nav className="relative z-20 pl-6 pr-6 py-6">
        <div className="rounded-full px-6 py-3 flex items-center justify-between max-w-5xl mx-auto liquid-glass">
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-2">
              <Brain size={24} className="text-white" />
              <span className="text-white font-semibold text-lg tracking-tight">TalentOS</span>
            </div>
            <div className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-white/80 hover:text-white transition-colors text-sm font-medium">Features</a>
              <a href="#intelligence" className="text-white/80 hover:text-white transition-colors text-sm font-medium">Intelligence</a>
              <a href="#enterprise" className="text-white/80 hover:text-white transition-colors text-sm font-medium">Enterprise</a>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/login" className="text-white text-sm font-medium hover:text-white/80 transition-colors">Sign Up</Link>
            <button
              onClick={() => setShowPopup(true)}
              className="liquid-glass rounded-full px-6 py-2 text-white text-sm font-medium hover:bg-white/5 transition-all cursor-pointer"
            >
              Launch App
            </button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 py-12 text-center -translate-y-[20%]">
        <div className="liquid-glass rounded-full px-4 py-1.5 text-white/80 text-xs font-medium mb-8 inline-flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 pulse-ring" />
          AI Talent Intelligence · Now in Enterprise Beta
        </div>
        <h1
          className="text-5xl md:text-6xl lg:text-7xl text-white mb-8 tracking-tight"
          style={{ fontFamily: "'Instrument Serif', serif" }}
        >
          Hire <em className="italic text-white/90">beyond</em> keywords.
        </h1>

        <div className="max-w-xl w-full space-y-4">
          <form
            onSubmit={(e) => e.preventDefault()}
            className="liquid-glass rounded-full pl-6 pr-2 py-2 flex items-center gap-3"
          >
            <input
              type="email"
              placeholder="work@company.com"
              className="flex-1 bg-transparent outline-none text-white placeholder:text-white/40 text-base"
            />
            <button
              onClick={() => setShowPopup(true)}
              type="button"
              aria-label="Request access"
              className="bg-white rounded-full p-3 text-black hover:scale-105 transition-transform"
            >
              <ArrowRight size={20} />
            </button>
          </form>
          <p className="text-white text-sm leading-relaxed px-4">
            Discover hidden talent using semantic intelligence, predictive AI, and explainable
            candidate ranking — trusted by recruiting teams at Fortune 500 companies.
          </p>
          <div className="flex justify-center pt-2">
            <button
              onClick={() => setShowPopup(true)}
              className="liquid-glass rounded-full px-8 py-3 text-white text-sm font-medium hover:bg-white/5 transition-colors cursor-pointer"
            >
              Explore the Platform →
            </button>
          </div>
        </div>
      </div>

      {/* Social */}
      <div className="relative z-10 flex justify-center gap-4 pb-12">
        {[
          { icon: Linkedin, label: "LinkedIn" },
          { icon: Twitter, label: "Twitter" },
          { icon: Github, label: "GitHub" },
        ].map(({ icon: Icon, label }) => (
          <button
            key={label}
            aria-label={label}
            className="liquid-glass rounded-full p-4 text-white/80 hover:text-white hover:bg-white/5 transition-all"
          >
            <Icon size={20} />
          </button>
        ))}
      </div>

      {/* Launch Popup using Luminous Card Design */}
      <AnimatePresence>
        {showPopup && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="luminous-card-container relative"
            >
              {/* Close Button */}
              <button
                onClick={() => setShowPopup(false)}
                className="absolute top-6 right-6 text-white/50 hover:text-white z-50 p-2 rounded-full hover:bg-white/5 transition-colors"
                aria-label="Close modal"
              >
                <X size={18} />
              </button>

              <input type="checkbox" className="luminous-toggle-input" id="luminousToggle" defaultChecked />
              <label htmlFor="luminousToggle" className="luminous-card cursor-default">
                <div className="luminous-light-layer">
                  <div className="luminous-slit"></div>
                  <div className="luminous-lumen">
                    <div className="min"></div>
                    <div className="mid"></div>
                    <div className="hi"></div>
                  </div>
                  <div className="luminous-darken">
                    <div className="sl"></div>
                    <div className="ll"></div>
                    <div className="slt"></div>
                    <div className="srt"></div>
                  </div>
                </div>
                <div className="luminous-content">
                  <div className="luminous-icon">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="3.2rem"
                      height="3.2rem"
                      viewBox="0 0 1024 1024"
                    >
                      <path
                        fill="url(#iconGradient)"
                        d="M488.1 414.7V303.4L300.9 428l83.6 55.8zm254.1 137.7v-79.8l-59.8 39.9zM512 64C264.6 64 64 264.6 64 512s200.6 448 448 448s448-200.6 448-448S759.4 64 512 64m278 533c0 1.1-.1 2.1-.2 3.1c0 .4-.1.7-.2 1a14.2 14.2 0 0 1-.8 3.2c-.2.6-.4 1.2-.6 1.7c-.2.4-.4.8-.5 1.2c-.3.5-.5 1.1-.8 1.6c-.2.4-.4.7-.7 1.1c-.3.5-.7 1-1 1.5c-.3.4-.5.7-.8 1c-.4.4-.8.9-1.2 1.3c-.3.3-.6.6-1 .9c-.4.4-.9.8-1.4 1.1c-.4.3-.7.6-1.1.8c-.1.1-.3.2-.4.3L525.2 786c-4 2.7-8.6 4-13.2 4c-4.7 0-9.3-1.4-13.3-4L244.6 616.9c-.1-.1-.3-.2-.4-.3l-1.1-.8c-.5-.4-.9-.7-1.3-1.1c-.3-.3-.6-.6-1-.9c-.4-.4-.8-.8-1.2-1.3a7 7 0 0 1-.8-1c-.4-.5-.7-1-1-1.5c-.2-.4-.5-.7-.7-1.1c-.3-.5-.6-1.1-.8-1.6c-.2-.4-.4-.8-.5-1.2c-.2-.6-.4-1.2-.6-1.7c-.1-.4-.3-.8-.4-1.2c-.2-.7-.3-1.3-.4-2c-.1-.3-.1-.7-.2-1c-.1-1-.2-2.1-.2-3.1V427.9c0-1 .1-2.1.2-3.1c.1-.3.1-.7.2-1a14.2 14.2 0 0 1 .8-3.2c.2-.6.4-1.2.6-1.7c.2-.4.4-.8.5-1.2c.2-.5.5-1.1.8-1.6c.2-.4.4-.7.7-1.1c.6-.9 1.2-1.7 1.8-2.5c.4-.4.8-.9 1.2-1.3c.3-.3.6-.6 1-.9c.4-.4.9-.8 1.3-1.1s.7-.6 1.1-.8c.1-.1.3-.2.4-.3L498.7 239c8-5.3 18.5-5.3 26.5 0l254.1 169.1c.1.1.3.2.4.3l1.1.8l1.4 1.1c.3.3.6.6 1 .9c.4.4.8.8 1.2 1.3c.7.8 1.3 1.6 1.8 2.5c.2.4.5.7.7 1.1c.3.5.6 1 .8 1.6c.2.4.4.8.5 1.2c.2.6.4 1.2.6 1.7c.1.4.3.8.4 1.2c.2.7.3 1.3.4 2c.1.3.1.7.2 1c.1 1 .2 2.1.2 3.1zm-254.1 13.3v111.3L723.1 597l-83.6-55.8zM281.8 472.6v79.8l59.8-39.9zM512 456.1l-84.5 56.4l84.5 56.4l84.5-56.4zM723.1 428L535.9 303.4v111.3l103.6 69.1zM384.5 541.2L300.9 597l187.2 124.6V610.3z"
                        filter="url(#strong-inner)"
                      ></path>
                      <defs>
                        <linearGradient id="iconGradient" x1="0" x2="0" y1="-1" y2="0.8">
                          <stop offset="0%" stopColor="#3B82F6"></stop>
                          <stop offset="100%" stopColor="#06B6D4"></stop>
                        </linearGradient>
                        <filter id="strong-inner">
                          <feFlood floodColor="#fff2"></feFlood>
                          <feComposite operator="out" in2="SourceGraphic"></feComposite>
                          <feMorphology operator="dilate" radius="8"></feMorphology>
                          <feGaussianBlur stdDeviation="32"></feGaussianBlur>
                          <feComposite operator="atop" in2="SourceGraphic"></feComposite>
                        </filter>
                      </defs>
                    </svg>
                  </div>
                  <div className="luminous-bottom space-y-4">
                    <div className="luminous-title">Talent Intelligence OS</div>
                    <p className="luminous-description">
                      Sign up or sign in to save your candidates, jobs, and matches, or continue directly as a guest.
                    </p>
                    
                    <div className="flex flex-col gap-2 mt-4">
                      <Link
                        to="/login"
                        className="w-full h-10 rounded-xl bg-gradient-to-r from-primary to-cyan hover:opacity-95 text-white font-medium text-xs flex items-center justify-center shadow-md transition-all active:scale-98"
                      >
                        Sign In / Sign Up
                      </Link>
                      <Link
                        to="/dashboard"
                        className="w-full h-10 rounded-xl bg-white/10 hover:bg-white/15 text-white border border-white/10 font-medium text-xs flex items-center justify-center transition-all active:scale-98"
                      >
                        Continue without Sign In
                      </Link>
                    </div>

                    <div className="luminous-toggle mt-2">
                      <div className="luminous-handle"></div>
                      <span className="luminous-toggle-label">Toggle Effect</span>
                    </div>
                  </div>
                </div>
              </label>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
