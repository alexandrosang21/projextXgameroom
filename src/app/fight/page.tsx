"use client";

import { motion } from "framer-motion";
import { Swords } from "lucide-react";
import Arena from "@/components/Arena";

export default function FightPage() {
  return (
      <main className="flex min-h-screen flex-col items-center justify-center p-4 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-900 via-[#0f172a] to-black text-white overflow-hidden relative">
          {/* Background decorative elements */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
              <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-red-500/10 blur-[100px]" />
              <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-blue-500/10 blur-[100px]" />
          </div>

          <div className="z-10 w-full h-screen flex flex-col items-center">
              <motion.div
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="absolute top-8 flex flex-col items-center text-center z-20"
              >
                  <div className="flex items-center gap-4 mb-2">
                      <Swords className="w-8 h-8 text-red-500" />
                      <h1 className="text-3xl font-black tracking-tight bg-gradient-to-r from-red-500 to-orange-500 bg-clip-text text-transparent italic">
                          CYBER DUEL
                      </h1>
                      <Swords className="w-8 h-8 text-red-500 scale-x-[-1]" />
                  </div>
              </motion.div>

              <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="w-full h-full"
              >
                  <Arena />
              </motion.div>
          </div>
      </main>
  );
}
