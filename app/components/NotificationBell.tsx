"use client";

import { useEffect, useState, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

interface HelpRequest {
  id: string;
  student_id: string;
  lesson_id: string;
  course_id: string;
  class_id: string;
  message: string | null;
  code_snapshot: string | null;
  language: string;
  status: string;
  created_at: string;
  waitTimeSeconds: number;
  student: {
    id: string;
    name: string;
    email: string;
  };
  lesson: {
    id: string;
    title: string;
  };
  course: {
    id: string;
    title: string;
  };
  class: {
    id: string;
    name: string;
  };
}

export default function NotificationBell() {
  const { data: session } = useSession();
  const router = useRouter();
  const [helpRequests, setHelpRequests] = useState<HelpRequest[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [userRole, setUserRole] = useState<string>("");
  const eventSourceRef = useRef<EventSource | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (session?.user) {
      fetchUserRole();
    }
  }, [session]);

  useEffect(() => {
    if (userRole === "teacher" || userRole === "admin") {
      connectToNotifications();
    }

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, [userRole]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  const fetchUserRole = async () => {
    try {
      const response = await fetch("/api/auth/role");
      const data = await response.json();
      if (data.role) {
        setUserRole(data.role);
      }
    } catch (error) {
      console.error("Error fetching user role:", error);
    }
  };

  const connectToNotifications = () => {
    // Close existing connection if any
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    // Create new SSE connection
    const eventSource = new EventSource("/api/help-requests/stream");
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      console.log("🔔 Connected to notification stream");
    };

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        if (data.type === "update") {
          setHelpRequests(data.helpRequests || []);
        } else if (data.type === "connected") {
          console.log("✅ Notification stream connected");
        }
      } catch (error) {
        console.error("Error parsing notification:", error);
      }
    };

    eventSource.onerror = (error) => {
      console.error("❌ Notification stream error:", error);
      eventSource.close();
      
      // Reconnect after 5 seconds
      setTimeout(() => {
        if (userRole === "teacher" || userRole === "admin") {
          connectToNotifications();
        }
      }, 5000);
    };
  };

  const handleAcceptRequest = async (requestId: string) => {
    try {
      const response = await fetch(`/api/help-requests/${requestId}/respond`, {
        method: "POST",
      });

      if (response.ok) {
        const data = await response.json();
        console.log("✅ Help request accepted:", data);
        
        // Redirect to collaboration session
        if (data.collaborationSession?.id) {
          setIsOpen(false);
          router.push(`/collaborate/${data.collaborationSession.id}`);
        }
      } else {
        console.error("Failed to accept help request");
      }
    } catch (error) {
      console.error("Error accepting help request:", error);
    }
  };

  const formatWaitTime = (seconds: number) => {
    if (seconds < 60) return `${Math.floor(seconds)}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
    return `${Math.floor(seconds / 3600)}h`;
  };

  // Only show for teachers and admins
  if (userRole !== "teacher" && userRole !== "admin") {
    return null;
  }

  const pendingCount = helpRequests.length;

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Icon Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-lg hover:bg-gray-700 transition-colors"
        title="Help requests"
      >
        <svg
          className="w-6 h-6 text-gray-300"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>

        {/* Notification Badge */}
        {pendingCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center animate-pulse">
            {pendingCount > 9 ? "9+" : pendingCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 bg-white dark:bg-gray-800 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden z-50">
          {/* Header */}
          <div className="px-4 py-3 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <svg className="w-4 h-4 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M7 11.5V14m0-2.5v-6a1.5 1.5 0 113 0m-3 6a1.5 1.5 0 00-3 0v2a7.5 7.5 0 0015 0v-5a1.5 1.5 0 00-3 0m-6-3V11m0-5.5v-1a1.5 1.5 0 013 0v1m0 0V11m0-5.5a1.5 1.5 0 013 0v3m0 0V11" />
                </svg>
                Help Requests
              </h3>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {pendingCount} pending
              </span>
            </div>
          </div>

          {/* Help Requests List */}
          <div className="max-h-96 overflow-y-auto">
            {helpRequests.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <svg className="w-12 h-12 text-gray-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-sm text-gray-500 dark:text-gray-400">No pending help requests</p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                  Students can raise their hand when they need help
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {helpRequests.map((request) => (
                  <div
                    key={request.id}
                    className="px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        {/* Student Info */}
                        <div className="flex items-center gap-2 mb-1">
                          <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                            {request.student?.name?.charAt(0) || "?"}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                              {request.student?.name || "Unknown Student"}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                              {request.class?.name || "No class"}
                            </p>
                          </div>
                        </div>

                        {/* Lesson Info */}
                        <div className="ml-10 space-y-1">
                          <p className="text-xs text-gray-700 dark:text-gray-300 font-medium">
                            📚 {request.lesson?.title || "Unknown lesson"}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {request.course?.title || "Unknown course"}
                          </p>
                          {request.message && (
                            <p className="text-xs text-gray-600 dark:text-gray-400 italic">
                              "{request.message}"
                            </p>
                          )}
                          
                          {/* Wait Time */}
                          <div className="flex items-center gap-2 mt-2">
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              ⏳ Waiting for {formatWaitTime(request.waitTimeSeconds)}
                            </span>
                            {request.language && (
                              <span className="text-xs px-2 py-0.5 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded">
                                {request.language}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Action Button */}
                      <button
                        onClick={() => handleAcceptRequest(request.id)}
                        className="flex-shrink-0 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-medium rounded transition-colors"
                      >
                        Help
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {helpRequests.length > 0 && (
            <div className="px-4 py-2 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => {
                  setIsOpen(false);
                  router.push("/teacher/help-requests");
                }}
                className="w-full text-center text-xs text-blue-600 dark:text-blue-400 hover:underline"
              >
                View all help requests →
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
