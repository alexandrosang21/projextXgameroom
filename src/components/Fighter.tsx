"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Shield, Zap, Sword } from "lucide-react";

interface FighterProps {
  role: "P1" | "P2";
  name: string;
  isSelf: boolean;
  health: number;
  energy: number;
  action: string | null; // 'ATTACK', 'BLOCK', 'HIT', 'DIE'
}

export default function Fighter({ role, name, isSelf, health, energy, action }: FighterProps) {
  const isP1 = role === "P1";
  const direction = isP1 ? 1 : -1;

  // Animation variants
  const variants = {
    idle: {
      y: [0, -10, 0],
      transition: { duration: 2, repeat: Infinity, ease: "easeInOut" as const },
    },
    attack: {
      x: [0, 50 * direction, 0],
      rotate: [0, 15 * direction, 0],
      transition: { duration: 0.2 },
    },
    block: {
      scale: 0.9,
      x: -10 * direction,
      transition: { duration: 0.1 },
    },
    hit: {
      x: [-10 * direction, 10 * direction, -5 * direction, 0],
      opacity: [1, 0.5, 1],
      transition: { duration: 0.3 },
    },
    die: {
      rotate: -90 * direction,
      y: 100,
      opacity: 0,
      transition: { duration: 1 },
    },
  };

  const currentVariant = action === "DIE" ? "die" 
    : action === "HIT" ? "hit"
    : action === "ATTACK" ? "attack"
    : action === "BLOCK" ? "block"
    : "idle";

  return (
    <div className={`relative flex flex-col items-center ${isP1 ? "order-1" : "order-2"}`}>
      {/* HUD */}
      <div className="mb-4 w-48 text-center">
        <div className={`text-sm font-bold mb-1 ${isSelf ? "text-green-400" : "text-red-400"}`}>
          {name} {isSelf && "(YOU)"}
        </div>
        
        {/* Health Bar */}
        <div className="relative">
          <div className="h-4 w-full bg-slate-800 rounded-full overflow-hidden border border-slate-600 relative">
            <motion.div 
              className="h-full bg-gradient-to-r from-red-600 to-red-400"
              initial={{ width: "100%" }}
              animate={{ width: `${health}%` }}
              transition={{ type: "spring", stiffness: 100 }}
            />
          </div>
          <div className="absolute top-0 left-1 text-[10px] font-bold text-white drop-shadow-md leading-4">HP {health}</div>
        </div>

        {/* Energy Bar */}
        <div className="mt-1 relative">
          <div className="h-2 w-full bg-slate-900 rounded-full overflow-hidden">
            <motion.div 
              className="h-full bg-yellow-400"
              initial={{ width: "0%" }}
              animate={{ width: `${energy}%` }}
            />
          </div>
          <div className="absolute top-[-2px] right-1 text-[8px] font-bold text-yellow-100 opacity-80">ENERGY</div>
        </div>
      </div>

      {/* Character */}
      <motion.div
        variants={variants}
        animate={currentVariant}
        className={`
          relative w-32 h-32 md:w-48 md:h-48 rounded-2xl 
          flex items-center justify-center
          ${isP1 ? "bg-blue-600" : "bg-orange-600"}
          shadow-[0_0_50px_rgba(0,0,0,0.5)]
          border-4 ${isSelf ? "border-white" : "border-transparent"}
        `}
      >
        {/* Eyes/Face */}
        <div className="absolute top-1/3 flex gap-4">
          <div className="w-4 h-4 bg-white rounded-full shadow-[0_0_10px_white]" />
          <div className="w-4 h-4 bg-white rounded-full shadow-[0_0_10px_white]" />
        </div>

        {/* Action Effects */}
        <AnimatePresence>
          {action === "BLOCK" && (
            <motion.div
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1.2 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex items-center justify-center"
            >
              <Shield className="w-full h-full text-cyan-400 opacity-50" />
            </motion.div>
          )}
          
          {action === "SPECIAL" && (
            <motion.div
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 2 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex items-center justify-center"
            >
              <Zap className="w-full h-full text-yellow-400" />
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* Weapon/Hand */}
        <div className={`absolute bottom-4 ${isP1 ? "-right-4" : "-left-4"}`}>
          <Sword className={`w-12 h-12 text-white ${isP1 ? "" : "scale-x-[-1]"}`} />
        </div>
      </motion.div>

      {/* Floor Shadow */}
      <div className="w-32 h-4 bg-black/50 rounded-full blur-md mt-4" />
    </div>
  );
}
