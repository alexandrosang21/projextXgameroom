"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MousePointer2 } from "lucide-react";

interface GameProps {
  onFinish: (score: number) => void;
}

export default function Game({ onFinish }: GameProps) {
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(10);
  const [isActive, setIsActive] = useState(false);

  // Start game on mount
  useEffect(() => {
    setIsActive(true);
  }, []);

  // Timer logic
  useEffect(() => {
    if (!isActive) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 0) return 0;
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isActive]);

  // End game check
  useEffect(() => {
    if (timeLeft === 0 && isActive) {
      setIsActive(false);
      onFinish(score);
    }
  }, [timeLeft, isActive, onFinish, score]);

  const handleClick = useCallback(() => {
    if (isActive && timeLeft > 0) {
      setScore((prev) => prev + 1);
    }
  }, [isActive, timeLeft]);

  return (
    <div className="flex flex-col items-center justify-center w-full h-full max-w-md mx-auto p-4">
      <div className="flex justify-between w-full mb-8 text-2xl font-bold">
        <div className="flex flex-col items-center">
          <span className="text-slate-400 text-sm uppercase tracking-wider">Time</span>
          <span className={`text-4xl font-mono ${timeLeft <= 3 ? "text-red-500" : "text-white"}`}>
            {timeLeft}s
          </span>
        </div>
        <div className="flex flex-col items-center">
          <span className="text-slate-400 text-sm uppercase tracking-wider">Score</span>
          <span className="text-4xl font-mono text-primary">{score}</span>
        </div>
      </div>

      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={handleClick}
        className="relative w-64 h-64 rounded-full bg-gradient-to-br from-primary to-blue-600 shadow-[0_0_50px_rgba(59,130,246,0.5)] flex items-center justify-center cursor-pointer border-4 border-white/10 group overflow-hidden"
      >
        <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
        <div className="flex flex-col items-center z-10 pointer-events-none select-none">
          <MousePointer2 className="w-16 h-16 text-white mb-2" />
          <span className="text-2xl font-bold text-white uppercase tracking-widest">Click!</span>
        </div>
        
        {/* Ripple effect could go here, but keeping it simple for now */}
      </motion.button>

      <p className="mt-8 text-slate-400 text-center animate-pulse">
        Click as fast as you can!
      </p>
    </div>
  );
}
