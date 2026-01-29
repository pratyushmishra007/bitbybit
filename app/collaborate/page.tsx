'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

interface Class {
  id: string;
  name: string;
  code: string;
}

interface Session {
  id: string;
  session_name: string;
  description?: string;
  language: string;
  is_active: boolean;
  is_locked: boolean;
  max_participants: number;
  created_at: string;
  expires_at: string;
  creator: {
    id: string;
    name: string;
    email: string;
  };
  class: {
    name: string;
    code: string;
  };
  online_participants: number;
  total_participants: number;
  is_participant: boolean;
  has_pending_request: boolean;
  can_edit?: boolean;
}

interface JoinRequest {
  id: string;
  user_id: string;
  session_id: string;
  message?: string;
  requested_at: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
}

export default function CollaborationPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [joinRequests, setJoinRequests] = useState<{ [sessionId: string]: JoinRequest[] }>({});
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [userRole, setUserRole] = useState<string>('');
  const [selectedSession, setSelectedSession] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    sessionName: '',
    description: '',
    classId: '',
    language: 'javascript',
    maxParticipants: 10,
    expiresInHours: 24,
  });

  useEffect(() => {
    // Wait for session to load
    if (status === 'loading') return;
    
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
      return;
    }

    if (session?.user) {
      fetchUserRole();
      fetchSessions();
      fetchClasses();
    }
  }, [session, status]);

  // Monitor session changes - handle sign out and session expiry
  useEffect(() => {
    if (status === 'unauthenticated') {
      console.log('🚪 Session ended - redirecting to sign in');
      router.push('/auth/signin');
    }
  }, [status, router]);

  // Poll for updates every 10 seconds (reduced from 5), only when tab is visible
  useEffect(() => {
    if (!session?.user?.id) return;

    const pollSessions = () => {
      if (document.visibilityState === 'visible') {
        fetchSessions();
      }
    };

    const interval = setInterval(pollSessions, 10000); // Changed to 10 seconds

    // Poll immediately when tab becomes visible
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchSessions();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [session?.user?.id]); // Use primitive value, not object

  const fetchUserRole = async () => {
    try {
      const response = await fetch('/api/auth/role');
      if (response.ok) {
        const data = await response.json();
        setUserRole(data.role || 'student');
      }
    } catch (error) {
      console.error('Error fetching role:', error);
      setUserRole('student'); // Default to student on error
    }
  };

  const fetchSessions = async () => {
    try {
      console.log('🔍 Fetching collaboration sessions...');
      const response = await fetch('/api/collaboration/sessions?activeOnly=true');
      console.log('📡 Sessions response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('📚 Sessions data:', data);
        
        // Filter out expired sessions on client side
        const now = new Date();
        const activeSessions = (data.sessions || []).filter((session: Session) => {
          const expiresAt = new Date(session.expires_at);
          return session.is_active && expiresAt > now;
        });
        
        console.log('✅ Active sessions:', activeSessions.length, 'of', data.sessions?.length || 0);
        setSessions(activeSessions);
      } else {
        const errorData = await response.json();
        console.error('❌ Failed to fetch sessions:', errorData);
      }
    } catch (error) {
      console.error('💥 Error fetching sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchClasses = async () => {
    try {
      const response = await fetch('/api/teacher/classes');
      if (response.ok) {
        const data = await response.json();
        setClasses(data.classes || []);
      }
    } catch (error) {
      console.error('Error fetching classes:', error);
    }
  };

  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isCreating) return; // Prevent duplicate submissions
    setIsCreating(true);

    try {
      const response = await fetch('/api/collaboration/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        const data = await response.json();
        setShowCreateModal(false);
        setFormData({ // Reset form
          sessionName: '',
          description: '',
          classId: '',
          language: 'javascript',
          maxParticipants: 10,
          expiresInHours: 24,
        });
        router.push(`/collaborate/${data.session.id}`);
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to create session');
      }
    } catch (error) {
      console.error('Error creating session:', error);
      alert('An error occurred while creating the session');
    } finally {
      setIsCreating(false);
    }
  };

  const joinSession = (sessionId: string) => {
    router.push(`/collaborate/${sessionId}`);
  };

  const handleRequestJoin = async (sessionId: string) => {
    try {
      const response = await fetch('/api/collaboration/join-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          message: 'Requesting to join collaboration session',
        }),
      });

      if (response.ok) {
        alert('✅ Join request sent! Waiting for host approval...');
        fetchSessions(); // Refresh to update pending status
      } else {
        const error = await response.json();
        alert(`❌ ${error.error || 'Failed to send join request'}`);
      }
    } catch (error) {
      console.error('Error requesting join:', error);
      alert('❌ Failed to send join request');
    }
  };

  const fetchJoinRequests = async (sessionId: string) => {
    try {
      const response = await fetch(`/api/collaboration/join-requests?sessionId=${sessionId}`);
      if (response.ok) {
        const data = await response.json();
        setJoinRequests((prev) => ({ ...prev, [sessionId]: data.requests || [] }));
      }
    } catch (error) {
      console.error('Error fetching join requests:', error);
    }
  };

  const handleApproveRequest = async (sessionId: string, requestId: string, grantEdit: boolean) => {
    try {
      const response = await fetch(`/api/collaboration/join-requests/${requestId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ grantEdit }),
      });

      if (response.ok) {
        alert(`✅ Request approved with ${grantEdit ? 'write' : 'read'} access`);
        fetchJoinRequests(sessionId);
        fetchSessions();
      }
    } catch (error) {
      console.error('Error approving request:', error);
    }
  };

  const handleRejectRequest = async (sessionId: string, requestId: string) => {
    try {
      const response = await fetch(`/api/collaboration/join-requests/${requestId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        alert('✅ Request rejected');
        fetchJoinRequests(sessionId);
      }
    } catch (error) {
      console.error('Error rejecting request:', error);
    }
  };

  const toggleRequestsPanel = (sessionId: string) => {
    if (selectedSession === sessionId) {
      setSelectedSession(null);
    } else {
      setSelectedSession(sessionId);
      fetchJoinRequests(sessionId);
    }
  };

  const canCreateSession = userRole === 'admin' || userRole === 'teacher';

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-gray-900">Code Collaboration</h1>
            <p className="text-gray-600 mt-2">Work together on code in real-time</p>
          </div>

          {canCreateSession && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
              </svg>
              Create Session
            </button>
          )}
        </div>

        {/* Sessions Grid */}
        {sessions.length === 0 ? (
          <div className="text-center py-16">
            <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
            </svg>
            <h3 className="text-xl font-semibold text-gray-700 mb-2">No Active Sessions</h3>
            <p className="text-gray-500">
              {canCreateSession
                ? 'Create a new collaboration session to get started'
                : 'No collaboration sessions are currently available'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sessions.map((sess) => {
              const isCreator = sess.creator.id === session?.user?.id;
              const sessionRequests = joinRequests[sess.id] || [];
              
              return (
                <div
                  key={sess.id}
                  className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
                >
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 text-lg mb-1">
                        {sess.session_name}
                      </h3>
                      <p className="text-sm text-gray-500">{sess.class?.name}</p>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {sess.is_locked && (
                        <svg className="w-5 h-5 text-orange-500" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                        </svg>
                      )}
                      {sess.is_participant && (
                        <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full font-medium">
                          Joined
                        </span>
                      )}
                      {sess.can_edit && (
                        <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full font-medium">
                          Editor
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Description */}
                  {sess.description && (
                    <p className="text-sm text-gray-600 mb-4 line-clamp-2">{sess.description}</p>
                  )}

                  {/* Metadata */}
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" />
                      </svg>
                      <span>{sess.creator.name}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                      </svg>
                      <span>Expires {new Date(sess.expires_at).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                      <span className="text-gray-600">
                        {sess.online_participants} / {sess.max_participants} online
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded font-mono">
                        {sess.language}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  {sess.is_participant ? (
                    <button
                      onClick={() => joinSession(sess.id)}
                      className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
                    >
                      Enter Session
                    </button>
                  ) : sess.has_pending_request ? (
                    <div className="w-full px-4 py-2 bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-lg font-semibold text-center">
                      ⏳ Request Pending
                    </div>
                  ) : (
                    <button
                      onClick={() => handleRequestJoin(sess.id)}
                      className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-colors"
                    >
                      🖐️ Request to Join
                    </button>
                  )}

                  {/* Join Requests Panel (for creators only) */}
                  {isCreator && sessionRequests.length > 0 && (
                    <div className="mt-4">
                      <button
                        onClick={() => toggleRequestsPanel(sess.id)}
                        className="w-full px-4 py-2 bg-orange-50 border border-orange-200 text-orange-800 rounded-lg font-semibold hover:bg-orange-100 transition-colors flex items-center justify-between"
                      >
                        <span>🔔 {sessionRequests.length} Pending Request{sessionRequests.length !== 1 ? 's' : ''}</span>
                        <svg 
                          className={`w-5 h-5 transition-transform ${selectedSession === sess.id ? 'rotate-180' : ''}`}
                          fill="currentColor" 
                          viewBox="0 0 20 20"
                        >
                          <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                      </button>
                      
                      {selectedSession === sess.id && (
                        <div className="mt-3 space-y-2 max-h-48 overflow-y-auto">
                          {sessionRequests.map((req) => (
                            <div key={req.id} className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                              <div className="flex items-start justify-between mb-2">
                                <div>
                                  <p className="font-medium text-gray-900 text-sm">{req.user.name}</p>
                                  <p className="text-xs text-gray-500">{req.user.email}</p>
                                </div>
                              </div>
                              <div className="flex gap-2">
                                <button
                                  onClick={() => handleApproveRequest(sess.id, req.id, false)}
                                  className="flex-1 px-3 py-1.5 text-xs bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
                                >
                                  ✓ Read Only
                                </button>
                                <button
                                  onClick={() => handleApproveRequest(sess.id, req.id, true)}
                                  className="flex-1 px-3 py-1.5 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                                >
                                  ✓ Can Edit
                                </button>
                                <button
                                  onClick={() => handleRejectRequest(sess.id, req.id)}
                                  className="px-3 py-1.5 text-xs bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                                >
                                  ✕
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create Session Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Create Collaboration Session</h2>

            <form onSubmit={handleCreateSession} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Session Name *
                </label>
                <input
                  type="text"
                  value={formData.sessionName}
                  onChange={(e) => setFormData({ ...formData, sessionName: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Class *
                </label>
                <select
                  value={formData.classId}
                  onChange={(e) => setFormData({ ...formData, classId: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  <option value="">Select a class</option>
                  {classes.map((cls) => (
                    <option key={cls.id} value={cls.id}>
                      {cls.name} ({cls.code})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Language
                  </label>
                  <select
                    value={formData.language}
                    onChange={(e) => setFormData({ ...formData, language: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="javascript">JavaScript</option>
                    <option value="python">Python</option>
                    <option value="java">Java</option>
                    <option value="cpp">C++</option>
                    <option value="csharp">C#</option>
                    <option value="typescript">TypeScript</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Max Participants
                  </label>
                  <input
                    type="number"
                    value={formData.maxParticipants}
                    onChange={(e) => setFormData({ ...formData, maxParticipants: parseInt(e.target.value) })}
                    min="2"
                    max="20"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Expires In (hours)
                </label>
                <input
                  type="number"
                  value={formData.expiresInHours}
                  onChange={(e) => setFormData({ ...formData, expiresInHours: parseInt(e.target.value) })}
                  min="1"
                  max="168"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  disabled={isCreating}
                  className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isCreating ? 'Creating...' : 'Create Session'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
