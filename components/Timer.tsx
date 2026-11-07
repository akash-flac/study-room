"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

export default function Timer({ roomId }: { roomId: string }) {
  const [timeLeft, setTimeLeft] = useState(1500); 
  const [status, setStatus] = useState<"idle" | "running" | "paused">("idle");
  const [endTime, setEndTime] = useState<Date | null>(null);

  // 1. Setup WebSockets and Fetch Initial State
  useEffect(() => {
    // Fetch the room's current state when a user first loads the page
    const fetchInitialState = async () => {
      const { data, error } = await supabase.from("rooms").select("*").eq("id", roomId).single();
      if (error || !data) return;
      syncStateWithDatabase(data);
    };

    fetchInitialState();

    // Subscribe to Postgres changes via WebSockets
    const channel = supabase
      .channel(`room-${roomId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "rooms", filter: `id=eq.${roomId}` },
        (payload) => {
          syncStateWithDatabase(payload.new);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId]);

  // Helper to parse the database payload into React state
  const syncStateWithDatabase = (dbRow: any) => {
    setStatus(dbRow.status);
    
    if (dbRow.status === "running" && dbRow.timer_end_time) {
      const targetTime = new Date(dbRow.timer_end_time);
      setEndTime(targetTime);
      
      // Calculate remaining seconds right now based on the server's end time
      const distance = Math.round((targetTime.getTime() - Date.now()) / 1000);
      setTimeLeft(distance > 0 ? distance : 0);
    } else {
      setEndTime(null);
      setTimeLeft(dbRow.remaining_seconds || 1500);
    }
  };

  // 2. The Diffing Engine (Replaces the basic -1 interval)
  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (status === "running" && endTime) {
      interval = setInterval(() => {
        const distance = Math.round((endTime.getTime() - Date.now()) / 1000);
        
        if (distance <= 0) {
          setTimeLeft(0);
          setStatus("idle");
          clearInterval(interval);
        } else {
          setTimeLeft(distance);
        }
      }, 1000);
    }

    return () => clearInterval(interval);
  }, [status, endTime]);

  // 3. Database Mutations (Buttons write to Postgres, not React)
  const handleStart = async () => {
    // Calculate the absolute end time
    const targetEndTime = new Date(Date.now() + timeLeft * 1000).toISOString();
    
    await supabase.from("rooms").update({
      status: "running",
      timer_end_time: targetEndTime,
      remaining_seconds: timeLeft,
    }).eq("id", roomId);
  };

  const handlePause = async () => {
    await supabase.from("rooms").update({
      status: "paused",
      timer_end_time: null,
      remaining_seconds: timeLeft, // Save the frozen time
    }).eq("id", roomId);
  };

  const handleReset = async () => {
    await supabase.from("rooms").update({
      status: "idle",
      timer_end_time: null,
      remaining_seconds: 1500, // Reset to 25 mins
    }).eq("id", roomId);
  };

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const displayTime = `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;

  return (
    <div className="flex flex-col items-center p-8 bg-white/50 rounded-2xl border border-gray-200 shadow-sm mt-12 w-full max-w-md mx-auto">
      <div className="text-[5rem] leading-none font-serif text-slate-800 tracking-tighter mb-8">
        {displayTime}
      </div>

      <div className="flex gap-4">
        <button 
          onClick={handleStart}
          disabled={status === "running"}
          className="px-6 py-2 bg-slate-500 text-white font-medium rounded-lg hover:bg-slate-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Start
        </button>
        <button 
          onClick={handlePause}
          disabled={status !== "running"}
          className="px-6 py-2 bg-white text-slate-600 border border-slate-200 font-medium rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Pause
        </button>
        <button 
          onClick={handleReset}
          className="px-6 py-2 bg-white text-slate-600 border border-slate-200 font-medium rounded-lg hover:bg-slate-50 transition-colors"
        >
          Reset
        </button>
      </div>
    </div>
  );
}