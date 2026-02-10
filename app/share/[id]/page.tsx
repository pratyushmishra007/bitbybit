"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Editor from "@monaco-editor/react";
import { useSession } from "next-auth/react";

interface SharedCodeData {
  id: string;
  share_id: string;
  user_id?: string;
  code: string;
  language: string;
  title?: string;
  views: number;
  created_at: string;
}

interface Discussion {
  id: string;
  share_id: string;
  user_id: string;
  comment: string;
  parent_id?: string;
  created_at: string;
  user?: {
    name: string;
    email: string;
  };
}

export default function SharedCodePage() {
  const params = useParams();
  const shareId = params.id as string;
  const { data: session } = useSession();

  const [codeData, setCodeData] = useState<SharedCodeData | null>(null);
  const [discussions, setDiscussions] = useState<Discussion[]>([]);
  const [newComment, setNewComment] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (shareId) {
      fetchSharedCode();
      fetchDiscussions();
    }
  }, [shareId]);

  const fetchSharedCode = async () => {
    try {
      const response = await fetch(`/api/share?id=${shareId}`);
      const data = await response.json();
      if (data.success) {
        setCodeData(data.code);
      }
    } catch (error) {
      console.error("Error fetching code:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchDiscussions = async () => {
    try {
      const response = await fetch(`/api/discussions?shareId=${shareId}`);
      const data = await response.json();
      if (data.success) {
        setDiscussions(data.discussions);
      }
    } catch (error) {
      console.error("Error fetching discussions:", error);
    }
  };

  const handlePostComment = async () => {
    if (!newComment.trim() || !session) return;

    try {
      const response = await fetch("/api/discussions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shareId,
          comment: newComment,
        }),
      });

      if (response.ok) {
        setNewComment("");
        fetchDiscussions();
      }
    } catch (error) {
      console.error("Error posting comment:", error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  if (!codeData) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-white text-xl">Code not found</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Header */}
      <header className="bg-slate-800 border-b border-slate-700 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">{codeData.title}</h1>
            <p className="text-sm text-gray-400 mt-1">
              Shared {new Date(codeData.created_at).toLocaleDateString()} • {codeData.views} views
            </p>
          </div>
          <a
            href="/"
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg font-semibold text-white transition-all"
          >
            Back to Home
          </a>
        </div>
      </header>

      <div className="max-w-7xl mx-auto p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Code Editor */}
          <div className="lg:col-span-2">
            <div className="bg-slate-800 rounded-xl overflow-hidden border border-slate-700">
              <div className="bg-slate-900 px-4 py-2 border-b border-slate-700">
                <span className="text-sm text-gray-400">
                  Language: <span className="text-purple-400">{codeData.language}</span>
                </span>
              </div>
              <Editor
                height="600px"
                language={codeData.language}
                value={codeData.code}
                theme="vs-dark"
                options={{
                  readOnly: true,
                  minimap: { enabled: false },
                  fontSize: 14,
                  lineNumbers: "on",
                  scrollBeyondLastLine: false,
                }}
              />
            </div>
          </div>

          {/* Discussion Panel */}
          <div className="lg:col-span-1">
            <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
              <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                Discussion
                <span className="text-sm font-normal text-gray-400">({discussions.length})</span>
              </h2>

              {/* Comment Input */}
              {session ? (
                <div className="mb-6">
                  <textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Share your thoughts..."
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-3 text-white text-sm resize-none focus:outline-none focus:ring-2 focus:ring-purple-500"
                    rows={3}
                  />
                  <button
                    onClick={handlePostComment}
                    disabled={!newComment.trim()}
                    className="mt-2 w-full px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-slate-600 disabled:cursor-not-allowed rounded-lg font-semibold text-white transition-all"
                  >
                    Post Comment
                  </button>
                </div>
              ) : (
                <div className="mb-6 p-4 bg-slate-700/50 rounded-lg border border-slate-600">
                  <p className="text-sm text-gray-400 text-center">
                    <a href="/auth/signin" className="text-purple-400 hover:text-purple-300 underline">
                      Sign in
                    </a>{" "}
                    to join the discussion
                  </p>
                </div>
              )}

              {/* Comments List */}
              <div className="space-y-4 max-h-125 overflow-y-auto">
                {discussions.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-8">
                    No comments yet. Be the first to share your thoughts!
                  </p>
                ) : (
                  discussions.map((discussion) => (
                    <div
                      key={discussion.id}
                      className="bg-slate-700/50 rounded-lg p-4 border border-slate-600"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 bg-linear-to-br from-purple-600 to-pink-600 rounded-full flex items-center justify-center text-sm font-bold">
                          {discussion.user?.name?.[0]?.toUpperCase() || discussion.user?.email?.[0]?.toUpperCase() || "?"}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-white">
                            {discussion.user?.name || discussion.user?.email || "Anonymous"}
                          </p>
                          <p className="text-xs text-gray-400 mt-1">
                            {new Date(discussion.created_at).toLocaleString()}
                          </p>
                          <p className="text-sm text-gray-200 mt-2">
                            {discussion.comment}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
