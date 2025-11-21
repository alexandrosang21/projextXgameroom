import { Suspense } from "react";
import TicTacToe from "@/components/TicTacToe";

export default function TicTacToePage() {
    return (
        <Suspense
            fallback={
                <div className="text-white text-center p-4">
                    Loading game...
                </div>
            }
        >
            <TicTacToe />
        </Suspense>
    );
}
