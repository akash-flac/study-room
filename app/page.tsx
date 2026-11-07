"use client"; // This tells Next.js to run this code in the browser, allowing button clicks

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase"; // Adjust path if your lib folder is elsewhere

export default function Home() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  async function createRoom() {
    setIsLoading(true);
    
    // 1. Insert a new row into Postgres. The UUID is generated automatically by the DB.
    const { data, error } = await supabase
      .from("rooms")
      .insert([{ status: "idle" }])
      .select()
      .single();

    if (error) {
      console.error("Failed to create room:", error);
      setIsLoading(false);
      return;
    }

    // 2. Redirect the user to their newly created room URL
    router.push(`/room/${data.id}`);
  }

  return (
    <main className="flex h-screen flex-col items-center justify-center bg-[#FAFAF9]">
      <h1 className="text-4xl font-serif text-gray-900 mb-8">Co-Study Room</h1>
      <button
        onClick={createRoom}
        disabled={isLoading}
        className="px-6 py-3 bg-[#64748B] text-white rounded-md hover:bg-slate-600 transition-colors disabled:opacity-50"
      >
        {isLoading ? "Creating Room..." : "Create a Room"}
      </button>
    </main>
  );
}