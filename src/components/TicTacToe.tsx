"use client";

import { useEffect, useState, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useSearchParams } from "next/navigation";

import * as Tone from "tone";

interface TicTacToeState {
    board: (string | null)[];
    xIsNext: boolean;
    winner: string | null;
    players: {
        X: string | null;
        O: string | null;
    };
}

export default function TicTacToe() {
    const searchParams = useSearchParams();
    const [socket, setSocket] = useState<Socket | null>(null);
    const [gameState, setGameState] = useState<TicTacToeState>({
        board: Array(9).fill(null),
        xIsNext: true,
        winner: null,
        players: { X: null, O: null },
    });
    const [myRole, setMyRole] = useState<"X" | "O" | "SPECTATOR">("SPECTATOR");
    const [score, setScore] = useState({ X: 0, O: 0 });
    const [showDebug, setShowDebug] = useState(false);
    const socketRef = useRef<Socket | null>(null);
    const lastWinnerRef = useRef<string | null>(null);

    useEffect(() => {
        if (searchParams?.get("debug") !== null) {
            setShowDebug(true);
        }
    }, [searchParams]);

    useEffect(() => {
        let isMounted = true;

        const initSocket = async () => {
            await fetch("/api/socket");

            if (!isMounted) return;

            const socketInstance = io({
                path: "/api/socket-io",
                addTrailingSlash: false,
            });

            socketInstance.on("connect", () => {
                console.log("Connected to TicTacToe");
                socketInstance.emit("join-tictactoe");
            });

            socketInstance.on("tictactoe-init", (data) => {
                setMyRole(data.role);
                setGameState(data.state);
            });

            socketInstance.on("tictactoe-update", (state: TicTacToeState) => {
                setGameState(state);

                // Play sound on move (if board changed and no winner yet)
                // Note: This is a simple heuristic. For better precision, we could send a specific event.
                // But checking if board has more moves than before works.
                // Actually, simpler: just play a short blip on every update that isn't a reset.

                // Check for win to update score
                if (
                    state.winner &&
                    state.winner !== "DRAW" &&
                    state.winner !== lastWinnerRef.current
                ) {
                    setScore((prev) => ({
                        ...prev,
                        [state.winner as "X" | "O"]:
                            prev[state.winner as "X" | "O"] + 1,
                    }));
                    lastWinnerRef.current = state.winner;

                    // Play win sound
                    const synth = new Tone.Synth().toDestination();
                    synth.triggerAttackRelease("C5", "8n");
                    setTimeout(
                        () => synth.triggerAttackRelease("E5", "8n"),
                        150
                    );
                    setTimeout(
                        () => synth.triggerAttackRelease("G5", "8n"),
                        300
                    );
                } else if (!state.winner) {
                    lastWinnerRef.current = null;
                }
            });

            socketRef.current = socketInstance;
            setSocket(socketInstance);
        };

        initSocket();

        return () => {
            isMounted = false;
            if (socketRef.current) {
                socketRef.current.disconnect();
            }
        };
    }, []);

    const handleClick = async (index: number) => {
        if (!socket || gameState.winner || gameState.board[index]) return;
        if (gameState.xIsNext && myRole !== "X") return;
        if (!gameState.xIsNext && myRole !== "O") return;

        // Play click sound immediately for feedback
        await Tone.start();
        const synth = new Tone.Synth().toDestination();
        synth.triggerAttackRelease("C4", "32n");

        socket.emit("tictactoe-move", index);
    };

    const handleReset = () => {
        if (socket) {
            socket.emit("tictactoe-reset");
        }
    };

    const getStatusMessage = () => {
        if (gameState.winner) {
            return gameState.winner === "DRAW"
                ? "It's a Draw!"
                : `Winner: ${gameState.winner}`;
        }
        if (!gameState.players.X || !gameState.players.O) {
            return "Waiting for players...";
        }
        return `Next Player: ${gameState.xIsNext ? "X" : "O"}`;
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-slate-900 text-white font-sans relative">
            {/* Back to Hub */}
            <Link
                href="/"
                className="absolute top-4 left-4 z-50 flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
            >
                <ArrowLeft className="w-6 h-6" />
                <span className="font-bold">HUB</span>
            </Link>
            <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
                Tic Tac Toe
            </h1>

            {/* Scoreboard */}
            <div className="flex gap-8 mb-8 text-2xl font-bold bg-slate-800/50 p-4 rounded-xl border border-slate-700">
                <div className="flex flex-col items-center">
                    <span className="text-blue-400">Player X</span>
                    <span className="text-4xl">{score.X}</span>
                </div>
                <div className="flex flex-col items-center">
                    <span className="text-purple-400">Player O</span>
                    <span className="text-4xl">{score.O}</span>
                </div>
            </div>

            <div className="mb-4 text-xl font-mono">
                You are:{" "}
                <span className="font-bold text-yellow-400">{myRole}</span>
            </div>

            <div className="mb-8 text-2xl font-bold animate-pulse">
                {getStatusMessage()}
            </div>

            <div className="grid grid-cols-3 gap-4 bg-slate-800 p-4 rounded-xl shadow-2xl">
                {gameState.board.map((cell, index) => (
                    <motion.button
                        key={index}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleClick(index)}
                        className={`
              w-24 h-24 bg-slate-700 rounded-lg flex items-center justify-center text-5xl font-bold
              transition-colors duration-200
              ${
                  !cell &&
                  !gameState.winner &&
                  ((gameState.xIsNext && myRole === "X") ||
                      (!gameState.xIsNext && myRole === "O"))
                      ? "hover:bg-slate-600 cursor-pointer"
                      : "cursor-default"
              }
              ${cell === "X" ? "text-blue-400" : "text-purple-400"}
            `}
                    >
                        {cell}
                    </motion.button>
                ))}
            </div>

            {gameState.winner && (
                <motion.button
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    onClick={handleReset}
                    className="mt-8 px-8 py-3 bg-gradient-to-r from-green-500 to-emerald-600 rounded-full font-bold shadow-lg hover:scale-105 transition-transform"
                >
                    Play Again
                </motion.button>
            )}

            {showDebug && (
                <button
                    onClick={() => socket?.emit("tictactoe-restart")}
                    className="mt-4 text-xs text-red-500/50 hover:text-red-500 underline"
                >
                    Force Hard Reset (Debug)
                </button>
            )}

            <div className="mt-8 text-slate-500 text-sm">
                Players: {gameState.players.X ? "X (Connected)" : "X (Waiting)"}{" "}
                vs {gameState.players.O ? "O (Connected)" : "O (Waiting)"}
            </div>
        </div>
    );
}
