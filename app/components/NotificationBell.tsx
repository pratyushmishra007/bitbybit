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

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string | null;
  link: string | null;
  metadata: Record<string, unknown>;
  is_read: boolean;
  created_at: string;
}

export default function NotificationBell() {
  const { data: session } = useSession();
  const router = useRouter();
  const [helpRequests, setHelpRequests] = useState<HelpRequest[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [userRole, setUserRole] = useState<string>("");
  const [activeTab, setActiveTab] = useState<"notifications" | "help">("notifications");
  const eventSourceRef = useRef<EventSource | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (session?.user) {
      fetchUserRole();
    }
  }, [session]);

  useEffect(() => {
    // For teachers/admins: connect to help request stream
    if (userRole === "teacher" || userRole === "admin") {
      connectToHelpRequests();
      setActiveTab("help");
    }

    // For all users: poll for notifications
    if (userRole) {
      fetchNotifications();
      // Poll every 30 seconds
      pollIntervalRef.current = setInterval(fetchNotifications, 30000);
    }

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
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

  const fetchNotifications = async () => {
    try {
      const response = await fetch("/api/notifications?limit=10");
      if (response.ok) {
        const text = await response.text();
        // Check if response is actually JSON
        if (text.startsWith("{") || text.startsWith("[")) {
          const data = JSON.parse(text);
          setNotifications(data.notifications || []);
          setUnreadCount(data.unreadCount || 0);
        }
        // Otherwise silently ignore - API might not be ready yet
      }
    } catch {
      // Silently fail - notifications are non-critical
    }
  };

  const connectToHelpRequests = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    try {
      const eventSource = new EventSource("/api/help-requests/stream");
      eventSourceRef.current = eventSource;

      eventSource.onopen = () => {
        console.log("🔔 Connected to help request stream");
      };

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.type === "update") {
            setHelpRequests(data.helpRequests || []);
          }
        } catch {
          // Ignore parse errors
        }
      };

      eventSource.onerror = (err) => {
        console.log("SSE connection error, will reconnect...");
        eventSource.close();
        eventSourceRef.current = null;
        
        // Exponential backoff: reconnect after 5 seconds, max 30 seconds
        setTimeout(() => {
          if (userRole === "teacher" || userRole === "admin") {
            connectToHelpRequests();
          }
        }, 5000);
      };
    } catch {
      // SSE not available, fall back to polling
      console.log("SSE not available, using polling");
      // Poll help requests every 15 seconds as fallback
      const pollHelp = async () => {
        try {
          const response = await fetch("/api/help-requests?status=pending");
          if (response.ok) {
            const data = await response.json();
            setHelpRequests(data.helpRequests || []);
          }
        } catch {
          // Silently fail
        }
      };
      pollHelp();
      setInterval(pollHelp, 15000);
    }
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

  const markAsRead = async (notificationId?: string) => {
    try {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(notificationId ? { notificationIds: [notificationId] } : { markAllRead: true }),
      });
      await fetchNotifications();
    } catch (error) {
      console.error("Error marking as read:", error);
    }
  };

  const deleteNotification = async (e: React.MouseEvent, notificationId: string) => {
    e.stopPropagation(); // Prevent triggering the parent click
    try {
      await fetch(`/api/notifications?id=${notificationId}`, {
        method: "DELETE",
      });
      // Remove from local state immediately for better UX
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      setUnreadCount(prev => {
        const wasUnread = notifications.find(n => n.id === notificationId)?.is_read === false;
        return wasUnread ? prev - 1 : prev;
      });
    } catch (error) {
      console.error("Error deleting notification:", error);
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    markAsRead(notification.id);
    if (notification.link) {
      setIsOpen(false);
      router.push(notification.link);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "assessment_result":
      case "assessment_graded":
        return "✅";
      case "assessment_published":
        return "📝";
      case "course_assigned":
      case "course_enrollment":
        return "📚";
      case "help_request_accepted":
        return "🤝";
      case "help_request_received":
        return "🙋";
      case "approval_approved":
        return "✓";
      case "approval_rejected":
        return "✗";
      case "contest_starting":
        return "⏰";
      case "achievement_unlocked":
        return "🏅";
      case "announcement":
        return "📢";
      case "level_up":
        return "🎉";
      case "certificate_earned":
        return "🏆";
      default:
        return "🔔";
    }
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  // Show for all logged-in users
  if (!userRole) {
    return null;
  }

  const isTeacher = userRole === "teacher" || userRole === "admin";
  const totalCount = unreadCount + (isTeacher ? helpRequests.length : 0);

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Icon Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-lg hover:bg-gray-700 transition-colors"
        title="Notifications"
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
        {totalCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center animate-pulse">
            {totalCount > 9 ? "9+" : totalCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 bg-white dark:bg-gray-800 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden z-50">
          {/* Tabs for teachers */}
          {isTeacher && (
            <div className="flex border-b border-gray-200 dark:border-gray-700">
              <button
                onClick={() => setActiveTab("notifications")}
                className={`flex-1 px-4 py-2 text-sm font-medium ${
                  activeTab === "notifications"
                    ? "text-blue-600 border-b-2 border-blue-600 bg-blue-50 dark:bg-blue-900/20"
                    : "text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700"
                }`}
              >
                Notifications {unreadCount > 0 && `(${unreadCount})`}
              </button>
              <button
                onClick={() => setActiveTab("help")}
                className={`flex-1 px-4 py-2 text-sm font-medium ${
                  activeTab === "help"
                    ? "text-blue-600 border-b-2 border-blue-600 bg-blue-50 dark:bg-blue-900/20"
                    : "text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700"
                }`}
              >
                Help Requests {helpRequests.length > 0 && `(${helpRequests.length})`}
              </button>
            </div>
          )}

          {/* Header for students */}
          {!isTeacher && (
            <div className="px-4 py-3 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                  Notifications
                </h3>
                {unreadCount > 0 && (
                  <button
                    onClick={() => markAsRead()}
                    className="text-xs text-blue-600 hover:underline"
                  >
                    Mark all read
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Content */}
          <div className="max-h-96 overflow-y-auto">
            {/* Notifications Tab */}
            {(activeTab === "notifications" || !isTeacher) && (
              <>
                {notifications.length === 0 ? (
                  <div className="px-4 py-8 text-center">
                    <p className="text-4xl mb-2">🔔</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">No notifications yet</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-200 dark:divide-gray-700">
                    {notifications.map((notification) => (
                      <div
                        key={notification.id}
                        onClick={() => handleNotificationClick(notification)}
                        className={`px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-colors group ${
                          !notification.is_read ? "bg-blue-50 dark:bg-blue-900/10" : ""
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <span className="text-xl">{getNotificationIcon(notification.type)}</span>
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm ${!notification.is_read ? "font-semibold" : ""} text-gray-900 dark:text-white`}>
                              {notification.title}
                            </p>
                            {notification.message && (
                              <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5 line-clamp-2">
                                {notification.message}
                              </p>
                            )}
                            <p className="text-xs text-gray-400 mt-1">{formatTime(notification.created_at)}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            {!notification.is_read && (
                              <span className="w-2 h-2 bg-blue-500 rounded-full shrink-0"></span>
                            )}
                            <button
                              onClick={(e) => deleteNotification(e, notification.id)}
                              className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded transition-all"
                              title="Remove notification"
                            >
                              <svg className="w-4 h-4 text-gray-400 hover:text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {/* Help Requests Tab (teachers only) */}
            {isTeacher && activeTab === "help" && (
              <>
                {helpRequests.length === 0 ? (
                  <div className="px-4 py-8 text-center">
                    <p className="text-4xl mb-2">✅</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">No pending help requests</p>
                    <p className="text-xs text-gray-400 mt-1">Students can raise their hand when stuck</p>
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
                            <div className="ml-10 space-y-1">
                              <p className="text-xs text-gray-700 dark:text-gray-300 font-medium">
                                📚 {request.lesson?.title || "Unknown lesson"}
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                {request.course?.title || "Unknown course"}
                              </p>
                              {request.message && (
                                <p className="text-xs text-gray-600 dark:text-gray-400 italic">
                                  &quot;{request.message}&quot;
                                </p>
                              )}
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
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
