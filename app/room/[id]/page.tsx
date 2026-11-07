import Timer from "@/components/Timer";
import TaskBoard from "@/components/TaskBoard";

export default async function RoomPage({ params }: { params: Promise<{ id: string }> }) {
  // Await the params to resolve the dynamic URL segment
  const { id } = await params;

  return (
    <div className="flex h-screen items-center justify-center bg-[#FAFAF9]">
      <div className="text-center">
        <h1 className="text-2xl font-serif text-[#64748B]">Study Room</h1>
        <p className="text-gray-500 font-mono mt-2">{id}</p>

        {/* The Timer Component */}
        <Timer roomId={id} />

        {/* The Task Board */}
      <TaskBoard roomId={id} />

      </div>
    </div>
  );
}