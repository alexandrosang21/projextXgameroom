"use client";

import { motion } from "framer-motion";
import { Swords, Music, Gamepad2 } from "lucide-react";
import Link from "next/link";

export default function Dashboard() {
    return (
        <main className="flex min-h-screen flex-col items-center justify-center p-4 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-900 via-[#0f172a] to-black text-white overflow-hidden relative">
            {/* Background decorative elements */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-purple-500/10 blur-[100px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-blue-500/10 blur-[100px]" />
            </div>

            <div className="z-10 w-full max-w-4xl flex flex-col items-center">
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center mb-16"
                >
                    <div className="flex items-center justify-center gap-4 mb-4">
                        <Gamepad2 className="w-12 h-12 text-white" />
                    </div>
                    <h1 className="text-5xl font-black tracking-tight bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent mb-4">
                        GAME HUB
                    </h1>
                    <p className="text-slate-400 text-lg">
                        Choose your arena and challenge the world
                    </p>
                </motion.div>

                <div className="grid md:grid-cols-3 gap-8 w-full px-4">
                    {/* Cyber Duel Card */}
                    <Link href="/fight" className="group">
                        <motion.div
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            className="relative h-80 rounded-3xl bg-gradient-to-br from-red-900/50 to-orange-900/50 border border-red-500/20 p-8 flex flex-col items-center justify-center text-center cursor-pointer overflow-hidden group-hover:border-red-500/50 transition-colors"
                        >
                            <div className="absolute inset-0 bg-gradient-to-br from-red-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                            <div className="relative z-10 bg-red-500/20 p-6 rounded-full mb-6 group-hover:scale-110 transition-transform duration-300">
                                <Swords className="w-12 h-12 text-red-400" />
                            </div>

                            <h2 className="relative z-10 text-3xl font-black italic text-white mb-2 group-hover:text-red-400 transition-colors">
                                CYBER DUEL
                            </h2>
                            <p className="relative z-10 text-red-200/60 font-medium">
                                1v1 Real-time Combat
                            </p>
                        </motion.div>
                    </Link>

                    {/* Piano Multiplayer Card */}
                    <Link href="/piano" className="group">
                        <motion.div
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            className="relative h-80 rounded-3xl bg-gradient-to-br from-purple-900/50 to-pink-900/50 border border-purple-500/20 p-8 flex flex-col items-center justify-center text-center cursor-pointer overflow-hidden group-hover:border-purple-500/50 transition-colors"
                        >
                            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                            <div className="relative z-10 bg-purple-500/20 p-6 rounded-full mb-6 group-hover:scale-110 transition-transform duration-300">
                                <Music className="w-12 h-12 text-purple-400" />
                            </div>

                            <h2 className="relative z-10 text-3xl font-black italic text-white mb-2 group-hover:text-purple-400 transition-colors">
                                PIANO MULTIPLAYER
                            </h2>
                            <p className="relative z-10 text-purple-200/60 font-medium">
                                Jam with friends
                            </p>
                        </motion.div>
                    </Link>

                    {/* Tic Tac Toe Card */}
                    <Link href="/tictactoe" className="group">
                        <motion.div
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            className="relative h-80 rounded-3xl bg-gradient-to-br from-blue-900/50 to-cyan-900/50 border border-blue-500/20 p-8 flex flex-col items-center justify-center text-center cursor-pointer overflow-hidden group-hover:border-blue-500/50 transition-colors"
                        >
                            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                            <div className="relative z-10 bg-blue-500/20 p-6 rounded-full mb-6 group-hover:scale-110 transition-transform duration-300">
                                <Gamepad2 className="w-12 h-12 text-blue-400" />
                            </div>

                            <h2 className="relative z-10 text-3xl font-black italic text-white mb-2 group-hover:text-blue-400 transition-colors">
                                TIC TAC TOE
                            </h2>
                            <p className="relative z-10 text-blue-200/60 font-medium">
                                Classic Strategy
                            </p>
                        </motion.div>
                    </Link>
                </div>
            </div>

            {/* Debug: Disconnect All */}
            <div className="absolute bottom-4 right-4 z-50">
                <button
                    onClick={async () => {
                        await fetch("/api/socket");
                        // We need a socket to emit, but we might not be connected on the home page if we just landed here.
                        // However, usually we connect on game pages.
                        // Let's just make a temp connection or assume if we are here we might not be connected.
                        // Actually, the cleanest way is to have a global socket or just a simple fetch endpoint that triggers it?
                        // But we are using socket events.
                        // Let's just instantiate a temp socket to send the command.
                        const { io } = await import("socket.io-client");
                        const socket = io({
                            path: "/api/socket-io",
                            addTrailingSlash: false,
                        });
                        socket.on("connect", () => {
                            socket.emit("disconnect-all");
                            setTimeout(() => socket.disconnect(), 100);
                        });
                    }}
                    className="px-4 py-2 bg-red-900/50 text-red-400 text-xs rounded hover:bg-red-900 transition-colors"
                >
                    DEBUG: Disconnect All
                </button>
            </div>
        </main>
    );
}
