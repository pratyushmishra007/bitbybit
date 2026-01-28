/**
 * Discussion Forum Component
 * Allows students to ask questions and help each other
 */

"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { trackEvent } from "./Analytics";

interface Comment {
  id: string;
  userId: string;
  userName: string;
  userRole: string;
  content: string;
  createdAt: string;
  upvotes: number;
  isUpvoted?: boolean;
  isSolution?: boolean;
}

interface DiscussionForumProps {
  lessonId: string;
  courseId: string;
}

export default function DiscussionForum({ lessonId, courseId }: DiscussionForumProps) {
  const { data: session } = useSession();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [sortBy, setSortBy] = useState<"recent" | "popular">("recent");

  useEffect(() => {
    fetchComments();
  }, [lessonId, sortBy]);

  const fetchComments = async () => {
    try {
      const response = await fetch(
        `/api/discussions?lessonId=${lessonId}&sortBy=${sortBy}`
      );
      const data = await response.json();
      setComments(data.comments || []);
    } catch (error) {
      console.error("Failed to fetch comments:", error);
    } finally {
      setLoading(false);
    }
  };

  const postComment = async () => {
    if (!newComment.trim()) return;

    setPosting(true);
    try {
      const response = await fetch("/api/discussions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lessonId,
          courseId,
          content: newComment,
        }),
      });

      if (response.ok) {
        setNewComment("");
        fetchComments();
        trackEvent("discussion_posted", { lessonId });
      }
    } catch (error) {
      console.error("Failed to post comment:", error);
    } finally {
      setPosting(false);
    }
  };

  const upvoteComment = async (commentId: string) => {
    try {
      await fetch(`/api/discussions/${commentId}/upvote`, {
        method: "POST",
      });
      fetchComments();
      trackEvent("comment_upvoted", { commentId, lessonId });
    } catch (error) {
      console.error("Failed to upvote:", error);
    }
  };

  const markAsSolution = async (commentId: string) => {
    try {
      await fetch(`/api/discussions/${commentId}/solution`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lessonId }),
      });
      fetchComments();
      trackEvent("solution_marked", { commentId, lessonId });
    } catch (error) {
      console.error("Failed to mark solution:", error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="bg-[#1e1e1e] rounded-lg border border-gray-800 p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold text-gray-100">
          💬 Discussion ({comments.length})
        </h3>
        
        <div className="flex gap-2">
          <button
            onClick={() => setSortBy("recent")}
            className={`px-3 py-1 text-sm rounded-lg transition-colors ${
              sortBy === "recent"
                ? "bg-blue-600 text-white"
                : "bg-[#252526] text-gray-300 hover:bg-[#2d2d30]"
            }`}
          >
            Recent
          </button>
          <button
            onClick={() => setSortBy("popular")}
            className={`px-3 py-1 text-sm rounded-lg transition-colors ${
              sortBy === "popular"
                ? "bg-blue-600 text-white"
                : "bg-[#252526] text-gray-300 hover:bg-[#2d2d30]"
            }`}
          >
            Popular
          </button>
        </div>
      </div>

      {/* New Comment */}
      {session && (
        <div className="mb-6">
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Ask a question or share your thoughts..."
            className="w-full p-4 border border-gray-700 rounded-lg bg-[#252526] text-gray-100 placeholder-gray-500 focus:outline-none focus:border-blue-500 resize-none"
            rows={3}
          />
          <div className="flex justify-end mt-2">
            <button
              onClick={postComment}
              disabled={!newComment.trim() || posting}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {posting ? "Posting..." : "Post Comment"}
            </button>
          </div>
        </div>
      )}

      {/* Comments List */}
      <div className="space-y-4">
        {comments.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">💬</div>
            <p className="text-gray-400">
              No comments yet. Be the first to start the discussion!
            </p>
          </div>
        ) : (
          comments.map((comment) => (
            <div
              key={comment.id}
              className={`p-4 rounded-lg border transition-colors ${
                comment.isSolution
                  ? "bg-green-900/20 border-green-800"
                  : "bg-[#252526] border-gray-700"
              }`}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-linear-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold text-sm">
                    {comment.userName.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-100">
                        {comment.userName}
                      </span>
                      {comment.userRole === "teacher" && (
                        <span className="px-2 py-0.5 bg-purple-900 text-purple-300 text-xs rounded-full">
                          Teacher
                        </span>
                      )}
                      {comment.isSolution && (
                        <span className="px-2 py-0.5 bg-green-900 text-green-300 text-xs rounded-full">
                          ✓ Solution
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-gray-500">
                      {new Date(comment.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>

              <p className="text-gray-300 mb-3 whitespace-pre-wrap">
                {comment.content}
              </p>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => upvoteComment(comment.id)}
                  className={`flex items-center gap-1 px-3 py-1 rounded-lg text-sm transition-colors ${
                    comment.isUpvoted
                      ? "bg-blue-900 text-blue-300"
                      : "bg-[#1e1e1e] text-gray-300 hover:bg-gray-800 border border-gray-700"
                  }`}
                >
                  👍 {comment.upvotes}
                </button>

                {session && !comment.isSolution && (
                  <button
                    onClick={() => markAsSolution(comment.id)}
                    className="px-3 py-1 bg-green-900 text-green-300 rounded-lg text-sm hover:bg-green-800 transition-colors"
                  >
                    ✓ Mark as Solution
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
