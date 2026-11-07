"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

export default function TaskBoard({ roomId }: { roomId: string }) {
  const [participantId, setParticipantId] = useState<string | null>(null);
  const [guestName, setGuestName] = useState<string>("Loading...");
  const [isEditingName, setIsEditingName] = useState(false);

  // 1. Silent Authentication & Identity Persistence
  useEffect(() => {
    const initializeParticipant = async () => {
      // Check if this browser already has an identity for this specific room
      const storageKey = `study_room_${roomId}_participant`;
      const savedId = localStorage.getItem(storageKey);

      if (savedId) {
        // Fetch existing user to get their current name
        const { data } = await supabase
          .from("participants")
          .select("guest_name")
          .eq("id", savedId)
          .single();

        if (data) {
          setParticipantId(savedId);
          setGuestName(data.guest_name);
          return;
        }
      }

      // If no saved ID, or the DB row was deleted, create a new identity
      const randomName = `Guest-${Math.floor(Math.random() * 1000)}`;
      const { data, error } = await supabase
        .from("participants")
        .insert([{ room_id: roomId, guest_name: randomName }])
        .select()
        .single();

      if (!error && data) {
        localStorage.setItem(storageKey, data.id);
        setParticipantId(data.id);
        setGuestName(data.guest_name);
      }
    };

    initializeParticipant();
  }, [roomId]);

  // 2. Handle Name Updates
  const updateName = async (newName: string) => {
    if (!participantId || !newName.trim()) return;
    
    setGuestName(newName);
    setIsEditingName(false);

    await supabase
      .from("participants")
      .update({ guest_name: newName })
      .eq("id", participantId);
  };

  if (!participantId) {
    return <div className="mt-12 text-slate-400 font-mono text-sm">Joining room...</div>;
  }

  return (
    <div className="w-full max-w-4xl mx-auto mt-12 grid grid-cols-1 md:grid-cols-3 gap-8">
      {/* User's Personal Column */}
      <div className="col-span-1 flex flex-col bg-white/40 p-6 rounded-2xl border border-gray-200">
        
        {/* Editable Name Header */}
        <div className="mb-6">
          {isEditingName ? (
            <input
              type="text"
              defaultValue={guestName}
              autoFocus
              onBlur={(e) => updateName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && updateName(e.currentTarget.value)}
              className="bg-white border border-slate-300 rounded px-2 py-1 text-lg font-serif text-slate-800 w-full outline-none focus:border-slate-500"
            />
          ) : (
            <h2 
              onClick={() => setIsEditingName(true)}
              className="text-lg font-serif text-slate-800 cursor-pointer hover:bg-white/50 px-2 py-1 -ml-2 rounded transition-colors inline-block"
              title="Click to edit name"
            >
              {guestName}
            </h2>
          )}
          <p className="text-xs text-slate-400 font-mono mt-1">Your Tasks</p>
        </div>

        {/* Task Input (Placeholder for now) */}
        <input 
          type="text" 
          placeholder="Add a new task..." 
          className="w-full bg-white/60 border border-slate-200 rounded-lg px-4 py-2 text-sm outline-none focus:border-slate-400 focus:bg-white transition-all mb-4"
        />

        {/* Task List (Placeholder for now) */}
        <div className="flex-1 space-y-2">
          <p className="text-sm text-slate-400 italic">No tasks yet.</p>
        </div>

      </div>

      {/* Other Participants Column (Placeholder) */}
      <div className="col-span-1 md:col-span-2 flex flex-col p-6 rounded-2xl border border-dashed border-slate-200">
        <h2 className="text-lg font-serif text-slate-500 mb-6 px-2">Room Activity</h2>
        <div className="flex items-center justify-center h-full text-slate-400 text-sm">
          Other users' tasks will appear here...
        </div>
      </div>
    </div>
  );
}