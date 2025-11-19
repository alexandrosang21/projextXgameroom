"use client";

import { useEffect, useState, useRef } from "react";
import * as Tone from "tone";
import { io, Socket } from "socket.io-client";
import { motion } from "framer-motion";

const NOTES = [
    { note: "C4", color: "bg-red-500", label: "C", key: "a" },
    { note: "D4", color: "bg-orange-500", label: "D", key: "s" },
    { note: "E4", color: "bg-yellow-500", label: "E", key: "d" },
    { note: "F4", color: "bg-green-500", label: "F", key: "f" },
    { note: "G4", color: "bg-teal-500", label: "G", key: "g" },
    { note: "A4", color: "bg-blue-500", label: "A", key: "h" },
    { note: "B4", color: "bg-indigo-500", label: "B", key: "j" },
    { note: "C5", color: "bg-purple-500", label: "C", key: "k" },
];

const SONGS = [
    {
        title: "Twinkle Twinkle",
        notes: [
            "C4",
            "C4",
            "G4",
            "G4",
            "A4",
            "A4",
            "G4",
            "F4",
            "F4",
            "E4",
            "E4",
            "D4",
            "D4",
            "C4",
        ],
    },
    {
        title: "Ode to Joy",
        notes: [
            "E4",
            "E4",
            "F4",
            "G4",
            "G4",
            "F4",
            "E4",
            "D4",
            "C4",
            "C4",
            "D4",
            "E4",
            "E4",
            "D4",
            "D4",
        ],
    },
    {
        title: "Happy Birthday",
        notes: [
            "C4",
            "C4",
            "D4",
            "C4",
            "F4",
            "E4",
            "C4",
            "C4",
            "D4",
            "C4",
            "G4",
            "F4",
        ],
    },
];

export default function Piano() {
    const [socket, setSocket] = useState<Socket | null>(null);
    const [activeNotes, setActiveNotes] = useState<string[]>([]);
    const [currentSong, setCurrentSong] = useState<number | null>(null);
    const [noteIndex, setNoteIndex] = useState(0);
    const synth = useRef<Tone.PolySynth | null>(null);
    const socketRef = useRef<Socket | null>(null);

    useEffect(() => {
        const initSocket = async () => {
            await fetch("/api/socket");

            const socketInstance = io({
                path: "/api/socket",
            });

            socketInstance.on("connect", () => {
                console.log("Connected to socket");
            });

            socketInstance.on("play-note", (data: { note: string }) => {
                playNote(data.note, false);
            });

            socketRef.current = socketInstance;
            setSocket(socketInstance);
        };

        initSocket();

        // Initialize Synth
        synth.current = new Tone.PolySynth(Tone.Synth).toDestination();

        return () => {
            if (socketRef.current) {
                socketRef.current.disconnect();
            }
            if (synth.current) {
                synth.current.dispose();
            }
        };
    }, []);

    // Keyboard listener
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.repeat) return;
            const mapped = NOTES.find((n) => n.key === e.key.toLowerCase());
            if (mapped) {
                playNote(mapped.note);
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [socket, currentSong, noteIndex]); // Re-bind when song state changes to capture latest state in playNote if needed

    const playNote = (note: string, emit: boolean = true) => {
        if (Tone.context.state !== "running") {
            Tone.start();
        }

        if (synth.current) {
            synth.current.triggerAttackRelease(note, "8n");
        }

        // Visual feedback
        setActiveNotes((prev) => [...prev, note]);
        setTimeout(() => {
            setActiveNotes((prev) => prev.filter((n) => n !== note));
        }, 200);

        if (emit && socket) {
            socket.emit("play-note", { note });
        }

        // Tutorial Logic
        if (currentSong !== null) {
            const targetNote = SONGS[currentSong].notes[noteIndex];
            if (note === targetNote) {
                setNoteIndex((prev) => {
                    const next = prev + 1;
                    if (next >= SONGS[currentSong].notes.length) {
                        // Song finished
                        setTimeout(() => {
                            setCurrentSong(null);
                            setNoteIndex(0);
                        }, 1000);
                        return 0;
                    }
                    return next;
                });
            }
        }
    };

    const startSong = (index: number) => {
        setCurrentSong(index);
        setNoteIndex(0);
    };

    return (
        <div className="flex flex-col items-center justify-center w-full h-full p-4">
            {/* Song Selection */}
            <div className="flex gap-4 mb-8 overflow-x-auto w-full max-w-4xl justify-center pb-2">
                {SONGS.map((song, idx) => (
                    <button
                        key={song.title}
                        onClick={() => startSong(idx)}
                        className={`px-4 py-2 rounded-full text-sm font-bold transition-all whitespace-nowrap
              ${
                  currentSong === idx
                      ? "bg-white text-slate-900 scale-105 shadow-[0_0_20px_rgba(255,255,255,0.3)]"
                      : "bg-white/10 text-white hover:bg-white/20"
              }`}
                    >
                        {song.title}
                    </button>
                ))}
                {currentSong !== null && (
                    <button
                        onClick={() => setCurrentSong(null)}
                        className="px-4 py-2 rounded-full text-sm font-bold bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-all"
                    >
                        Stop
                    </button>
                )}
            </div>

            <div className="grid grid-cols-4 gap-4 md:grid-cols-8 w-full max-w-4xl">
                {NOTES.map(({ note, color, label, key }) => {
                    const isTarget =
                        currentSong !== null &&
                        SONGS[currentSong].notes[noteIndex] === note;

                    return (
                        <motion.button
                            key={note}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => playNote(note)}
                            className={`
                h-48 rounded-xl shadow-lg flex flex-col items-center justify-end p-4
                text-white font-bold transition-all duration-100 relative overflow-hidden
                ${color}
                ${
                    activeNotes.includes(note)
                        ? "brightness-150 ring-4 ring-white/50 scale-95"
                        : "opacity-90"
                }
                ${
                    isTarget
                        ? "ring-4 ring-white animate-pulse brightness-125"
                        : ""
                }
              `}
                        >
                            {isTarget && (
                                <div className="absolute top-4 animate-bounce">
                                    <div className="w-2 h-2 bg-white rounded-full shadow-[0_0_10px_white]" />
                                </div>
                            )}
                            <span className="text-2xl mb-2">{label}</span>
                            <span className="text-xs uppercase opacity-60 border border-white/30 px-2 py-1 rounded">
                                Key: {key.toUpperCase()}
                            </span>
                        </motion.button>
                    );
                })}
            </div>

            <div className="mt-8 text-center h-12">
                {currentSong !== null ? (
                    <p className="text-xl font-medium text-white animate-in fade-in slide-in-from-bottom-4">
                        Play:{" "}
                        <span className="font-bold text-primary text-2xl mx-2">
                            {SONGS[currentSong].notes[noteIndex]}
                        </span>
                        <span className="text-slate-400 text-sm">
                            ({noteIndex + 1}/{SONGS[currentSong].notes.length})
                        </span>
                    </p>
                ) : (
                    <p className="text-slate-400">
                        Select a song above or just jam freely!
                    </p>
                )}
            </div>
        </div>
    );
}
