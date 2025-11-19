"use client";

import { motion } from "framer-motion";
import { Music } from "lucide-react";
import Piano from "@/components/Piano";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-900 via-[#0f172a] to-black text-white overflow-hidden relative">
      
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-primary/20 blur-[100px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-secondary/20 blur-[100px]" />
      </div>

      <div className="z-10 w-full flex flex-col items-center">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center text-center mb-12"
        >
          <div className="mb-6 relative">
            <div className="absolute inset-0 bg-purple-500 blur-xl opacity-50" />
            <Music className="w-24 h-24 text-purple-400 relative z-10" />
          </div>
          
          <h1 className="text-5xl font-black mb-4 tracking-tight bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
            MULTIPLAYER<br />PIANO
          </h1>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full"
        >
          <Piano />
        </motion.div>
      </div>
      
      <footer className="absolute bottom-4 text-slate-600 text-sm">
        Built with Next.js, Socket.io & Tone.js
      </footer>
    </main>
  );
}
