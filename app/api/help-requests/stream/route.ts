import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Server-Sent Events (SSE) for real-time notifications
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  // Get user role to determine what they should see
  const { data: user } = await supabase
    .from("users")
    .select("role")
    .eq("id", session.user.id)
    .single();

  if (!user || (user.role !== "teacher" && user.role !== "admin")) {
    return new Response("Only teachers can subscribe to notifications", { 
      status: 403 
    });
  }

  // Create readable stream for SSE
  const encoder = new TextEncoder();
  let intervalId: NodeJS.Timeout;
  let heartbeatId: NodeJS.Timeout;
  let isClosed = false;

  const stream = new ReadableStream({
    async start(controller) {
      console.log("🔔 Teacher connected to notification stream:", session.user.id);

      // Send initial connection message
      const initialData = `data: ${JSON.stringify({ 
        type: "connected", 
        message: "Connected to notifications" 
      })}\n\n`;
      
      try {
        controller.enqueue(encoder.encode(initialData));
      } catch (error) {
        console.error("Error sending initial message:", error);
        isClosed = true;
        return;
      }

      // Function to check for new help requests with timeout
      const checkForUpdates = async () => {
        if (isClosed) return;
        
        try {
          // Create an AbortController for timeout
          const abortController = new AbortController();
          const timeoutId = setTimeout(() => abortController.abort(), 5000); // 5 second timeout
          
          let query = supabase
            .from("help_requests")
            .select(`
              *,
              student:student_id(id, name, email, avatar)
            `)
            .eq("status", "pending")
            .order("created_at", { ascending: true })
            .limit(50);

          // Teachers and admins see all pending requests
          const { data: helpRequests, error } = await query;
          
          clearTimeout(timeoutId);

          if (error) {
            console.error("Error fetching help requests:", error);
            return;
          }

          // Calculate wait times
          const requestsWithWaitTime = helpRequests?.map((req) => ({
            ...req,
            waitTimeSeconds: Math.floor(
              (Date.now() - new Date(req.created_at).getTime()) / 1000
            ),
          })) || [];

          // Send update to client
          const message = `data: ${JSON.stringify({
            type: "update",
            count: requestsWithWaitTime.length,
            helpRequests: requestsWithWaitTime,
            timestamp: new Date().toISOString(),
          })}\n\n`;

          if (!isClosed) {
            try {
              controller.enqueue(encoder.encode(message));
            } catch (error) {
              console.error("Error in SSE update:", error);
              isClosed = true;
              clearInterval(intervalId);
              clearInterval(heartbeatId);
            }
          }
        } catch (error) {
          console.error("Error in SSE update:", error);
        }
      };

      // Send initial data
      await checkForUpdates();

      // Poll every 10 seconds for updates (reduced from 3s to lower load)
      intervalId = setInterval(checkForUpdates, 10000);

      // Send heartbeat every 30 seconds to keep connection alive
      heartbeatId = setInterval(() => {
        if (isClosed) {
          clearInterval(heartbeatId);
          return;
        }
        
        const heartbeat = `:heartbeat\n\n`;
        try {
          controller.enqueue(encoder.encode(heartbeat));
        } catch (error) {
          console.error("Heartbeat error:", error);
          isClosed = true;
          clearInterval(heartbeatId);
          clearInterval(intervalId);
        }
      }, 30000);

      // Cleanup when connection closes
      request.signal.addEventListener("abort", () => {
        console.log("🔕 Teacher disconnected from notification stream:", session.user.id);
        isClosed = true;
        clearInterval(intervalId);
        clearInterval(heartbeatId);
        try {
          controller.close();
        } catch (error) {
          // Controller already closed, ignore
        }
      });
    },

    cancel() {
      console.log("🔕 Stream cancelled for teacher:", session.user.id);
      isClosed = true;
      if (intervalId) {
        clearInterval(intervalId);
      }
      if (heartbeatId) {
        clearInterval(heartbeatId);
      }
    },
  });

  // Return SSE response
  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no", // Disable nginx buffering
    },
  });
}
