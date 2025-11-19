"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Trophy, RotateCcw, Copy, Check } from "lucide-react";
import confetti from "canvas-confetti";

interface ResultsProps {
  score: number;
  onRestart: () => void;
}

export default function Results({ score, onRestart }: ResultsProps) {
  const [highScore, setHighScore] = useState(0);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    // Load high score
    const stored = localStorage.getItem("speed-clicker-highscore");
    const currentHigh = stored ? parseInt(stored) : 0;
    
    if (score > currentHigh) {
      localStorage.setItem("speed-clicker-highscore", score.toString());
      setHighScore(score);
      // Trigger confetti for new high score
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#3b82f6', '#10b981', '#f59e0b']
      });
    } else {
      setHighScore(currentHigh);
    }
  }, [score]);

  const handleCopy = async () => {
    const text = `⚡ Speed Clicker ⚡\nI scored ${score} clicks in 10 seconds!\nCan you beat me?`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center w-full h-full max-w-md mx-auto p-4 text-center">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="mb-8"
      >
        <Trophy className={`w-24 h-24 mx-auto mb-4 ${score >= highScore ? "text-yellow-400" : "text-slate-600"}`} />
        <h2 className="text-3xl font-bold mb-2">Time's Up!</h2>
        <div className="text-6xl font-black text-primary mb-2">{score}</div>
        <p className="text-slate-400 uppercase tracking-wider text-sm">Clicks</p>
      </motion.div>

      <div className="bg-white/5 rounded-xl p-4 w-full mb-8 border border-white/10">
        <div className="flex justify-between items-center mb-2">
          <span className="text-slate-400">High Score</span>
          <span className="text-xl font-bold text-yellow-400">{highScore}</span>
        </div>
        {score >= highScore && score > 0 && (
          <div className="text-sm text-green-400 font-medium">
            New Personal Best! 🎉
          </div>
        )}
      </div>

      <div className="flex gap-4 w-full">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onRestart}
          className="flex-1 bg-white text-slate-900 font-bold py-4 rounded-xl flex items-center justify-center gap-2 hover:bg-slate-200 transition-colors"
        >
          <RotateCcw className="w-5 h-5" />
          Play Again
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleCopy}
          className="flex-1 bg-white/10 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 hover:bg-white/20 transition-colors border border-white/10"
        >
          {copied ? <Check className="w-5 h-5 text-green-400" /> : <Copy className="w-5 h-5" />}
          {copied ? "Copied!" : "Share"}
        </motion.button>
      </div>
    </div>
  );
}
