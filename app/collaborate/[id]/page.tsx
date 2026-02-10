'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import CollaborativeEditor from '../../components/CollaborativeEditor';

interface SessionData {
  id: string;
  session_name: string;
  description?: string;
  language: string;
  is_active: boolean;
  is_locked: boolean;
  created_at: string;
  expires_at: string;
  creator: {
    id: string;
    name: string;
    email: string;
  };
}

interface Participant {
  id: string;
  user_id: string;
  role: string;
  can_edit: boolean;
  is_online: boolean;
  joined_at: string;
  user: {
    id: string;
    name: string;
    email: string;
    avatar?: string;
  };
}

interface JoinRequest {
  id: string;
  user_id: string;
  message?: string;
  requested_at: string;
  user: {
    id: string;
    name: string;
    email: string;
    avatar?: string;
  };
}

export default function CollaborateSessionPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session, status } = useSession();
  const [sessionData, setSessionData] = useState<SessionData | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [joinRequests, setJoinRequests] = useState<JoinRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [showParticipants, setShowParticipants] = useState(false);
  const [showJoinRequests, setShowJoinRequests] = useState(false);
  const [currentCode, setCurrentCode] = useState<string>('');
  const [executing, setExecuting] = useState(false);
  const [executionResult, setExecutionResult] = useState<any>(null);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [isParticipant, setIsParticipant] = useState(false);
  const [hasRequestedJoin, setHasRequestedJoin] = useState(false);
  const [pollingEnabled, setPollingEnabled] = useState(false); // Start as false, enable after successful fetch

  const sessionId = params.id as string;
  const isHost = sessionData?.creator?.id === session?.user?.id;
  
  // Find participant by user_id OR by user.id OR by email (handles ID mismatch cases)
  const myParticipant = participants.find(p => 
    p.user_id === session?.user?.id || 
    p.user?.id === session?.user?.id ||
    p.user?.email === session?.user?.email
  );
  const canEdit = myParticipant?.can_edit ?? false;
  
  // Debug logging for participant matching
  useEffect(() => {
    if (session?.user && participants.length > 0) {
      console.log('🔍 Participant lookup debug:', {
        sessionUserId: session.user.id,
        sessionUserEmail: session.user.email,
        participants: participants.map(p => ({ 
          user_id: p.user_id, 
          userId: p.user?.id,
          email: p.user?.email,
          can_edit: p.can_edit 
        })),
        myParticipant: myParticipant ? { 
          user_id: myParticipant.user_id, 
          can_edit: myParticipant.can_edit 
        } : null,
        isHost,
        canEdit: isHost || canEdit
      });
    }
  }, [session?.user, participants, myParticipant, isHost, canEdit]);

  // Memoized fetch functions to prevent infinite loops
  const fetchParticipants = useCallback(async () => {
    try {
      const response = await fetch(`/api/collaboration/sessions/${sessionId}`);
      if (response.ok) {
        const data = await response.json();
        setParticipants(data.participants || []);
      } else if (response.status === 403) {
        // Lost access - stop polling
        setPollingEnabled(false);
        setIsParticipant(false);
      }
    } catch (error) {
      console.error('Error fetching participants:', error);
    }
  }, [sessionId]);

  const fetchJoinRequests = useCallback(async () => {
    try {
      const response = await fetch(`/api/collaboration/join-requests?sessionId=${sessionId}`);
      if (response.ok) {
        const data = await response.json();
        setJoinRequests(data.requests || []);
      }
    } catch (error) {
      console.error('Error fetching join requests:', error);
    }
  }, [sessionId]);

  const fetchSession = useCallback(async () => {
    try {
      const response = await fetch(`/api/collaboration/sessions/${sessionId}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          setError('Session not found');
          setLoading(false);
        } else if (response.status === 403) {
          // User is not a participant - fetch basic session info for join request UI
          try {
            const basicResponse = await fetch(`/api/collaboration/sessions/${sessionId}/public`);
            if (basicResponse.ok) {
              const basicData = await basicResponse.json();
              setSessionData(basicData.session);
            }
          } catch (e) {
            console.error('Failed to fetch public session info:', e);
          }
          setIsParticipant(false);
          setPollingEnabled(false);
          setLoading(false);
        } else {
          setError('Failed to load session');
          setPollingEnabled(false);
          setLoading(false);
        }
        return;
      }

      const data = await response.json();
      setSessionData(data.session);
      setParticipants(data.participants || []);
      setIsParticipant(true);
      setPollingEnabled(true);
      setLoading(false);
      
      // Mark participant as online when they view the session
      if (session?.user?.id) {
        const myPart = data.participants?.find((p: Participant) => p.user_id === session.user.id);
        if (myPart?.id && !myPart.is_online) {
          await fetch(`/api/collaboration/participants/${myPart.id}/online`, {
            method: 'POST',
          }).catch(err => console.error('Failed to mark online:', err));
        }
      }
    } catch (error) {
      console.error('Error fetching session:', error);
      setError('An error occurred while loading the session');
      setPollingEnabled(false);
      setLoading(false);
    }
  }, [sessionId]);

  // Initial fetch - only runs once
  useEffect(() => {
    if (status === 'loading') return;
    
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
      return;
    }

    if (session?.user && sessionId) {
      fetchSession();
    }
  }, [session?.user?.id, status, sessionId, router, fetchSession]);

  // Monitor session changes - handle sign out and session expiry
  useEffect(() => {
    if (status === 'unauthenticated') {
      console.log('🚪 Session ended - cleaning up and redirecting');
      
      // Clean up: mark user as offline (don't remove from session completely)
      const cleanup = async () => {
        const participantId = myParticipant?.id;
        if (participantId) {
          try {
            await fetch(`/api/collaboration/participants/${participantId}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ isOnline: false }),
            });
            console.log('✅ Marked as offline in session');
            
            // Immediately update local state to reflect offline status
            setParticipants(prev => prev.map(p => 
              p.id === participantId ? { ...p, is_online: false } : p
            ));
          } catch (error) {
            console.error('Error marking offline:', error);
          }
        }
        
        // Clean up state and redirect after marking offline
        setPollingEnabled(false);
        setIsParticipant(false);
        router.push('/auth/signin');
      };
      
      cleanup();
    }
  }, [status, router, myParticipant]);

  // Polling - only if user is participant and polling is enabled
  useEffect(() => {
    if (!session?.user?.id || !sessionId || !isParticipant || !pollingEnabled) {
      console.log('⏸️ Polling disabled:', { isParticipant, pollingEnabled });
      return;
    }

    console.log('▶️ Polling enabled for participant');
    
    // Poll for updates every 10 seconds
    const interval = setInterval(() => {
      // Only poll if tab is visible
      if (document.visibilityState === 'visible') {
        fetchParticipants();
        // Check host status dynamically
        if (isHost) {
          fetchJoinRequests();
        }
      }
    }, 10000);

    // Also poll when tab becomes visible
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchParticipants();
        if (isHost) {
          fetchJoinRequests();
        }
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      console.log('⏹️ Clearing polling interval');
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [session?.user?.id, sessionId, isParticipant, pollingEnabled, isHost, fetchParticipants, fetchJoinRequests]);

  const handleApproveRequest = async (requestId: string, grantEdit: boolean = false) => {
    try {
      const response = await fetch(`/api/collaboration/join-requests/${requestId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve', grantEditAccess: grantEdit }),
      });

      if (response.ok) {
        fetchJoinRequests();
        fetchParticipants();
      }
    } catch (error) {
      console.error('Error approving request:', error);
    }
  };

  const handleRejectRequest = async (requestId: string) => {
    try {
      const response = await fetch(`/api/collaboration/join-requests/${requestId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reject' }),
      });

      if (response.ok) {
        fetchJoinRequests();
      }
    } catch (error) {
      console.error('Error rejecting request:', error);
    }
  };

  const handleApproveAll = async (grantEdit: boolean = false) => {
    try {
      const response = await fetch(`/api/collaboration/join-requests/${sessionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ grantEditAccess: grantEdit }),
      });

      if (response.ok) {
        fetchJoinRequests();
        fetchParticipants();
      }
    } catch (error) {
      console.error('Error approving all requests:', error);
    }
  };

  const handleTogglePermission = async (participantId: string, canEdit: boolean) => {
    try {
      const response = await fetch(`/api/collaboration/participants/${participantId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ canEdit: !canEdit }),
      });

      if (response.ok) {
        fetchParticipants();
      }
    } catch (error) {
      console.error('Error toggling permission:', error);
    }
  };

  const handleRemoveParticipant = async (participantId: string) => {
    try {
      const response = await fetch(`/api/collaboration/participants/${participantId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        fetchParticipants();
      }
    } catch (error) {
      console.error('Error removing participant:', error);
    }
  };

  const handleExecuteCode = async () => {
    if (!currentCode.trim()) return;

    setExecuting(true);
    try {
      const response = await fetch('/api/execute-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          language: sessionData?.language || 'javascript',
          code: currentCode,
        }),
      });

      const result = await response.json();
      setExecutionResult(result);
    } catch (error) {
      console.error('Error executing code:', error);
      setExecutionResult({ error: 'Failed to execute code' });
    } finally {
      setExecuting(false);
    }
  };

  const handleSave = (code: string) => {
    setCurrentCode(code);
  };

  const handlePullCode = async () => {
    if (!currentCode.trim()) {
      alert('No code to pull');
      return;
    }

    // Save to local storage as a backup
    localStorage.setItem(`pulled-code-${sessionId}`, currentCode);
    
    // Copy to clipboard
    try {
      await navigator.clipboard.writeText(currentCode);
      alert('✅ Code copied to clipboard and saved!');
    } catch (error) {
      alert('✅ Code saved! (Clipboard access denied)');
    }
  };

  const handleInviteStudent = async () => {
    if (!inviteEmail.trim()) {
      alert('Please enter student email');
      return;
    }

    try {
      // You can implement a direct invite API or just share the session link
      const sessionLink = `${window.location.origin}/collaborate/${sessionId}`;
      await navigator.clipboard.writeText(sessionLink);
      alert(`✅ Session link copied! Share with: ${inviteEmail}`);
      setInviteEmail('');
      setShowInviteModal(false);
    } catch (error) {
      alert('✅ Session link ready to share!');
      setShowInviteModal(false);
    }
  };

  const handleRequestJoin = async () => {
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
        setHasRequestedJoin(true);
        alert('✅ Join request sent! Waiting for host approval...');
        
        // Poll for approval every 2 seconds
        const pollInterval = setInterval(async () => {
          const checkResponse = await fetch(`/api/collaboration/sessions/${sessionId}`);
          if (checkResponse.ok) {
            // User has been approved! Reload the page
            clearInterval(pollInterval);
            window.location.reload();
          }
        }, 2000);
        
        // Stop polling after 5 minutes
        setTimeout(() => clearInterval(pollInterval), 300000);
      } else {
        const error = await response.json();
        alert(`❌ ${error.error || 'Failed to send join request'}`);
      }
    } catch (error) {
      console.error('Error requesting join:', error);
      alert('❌ Failed to send join request');
    }
  };

  const handleLeave = async () => {
    // Mark participant as offline
    if (myParticipant) {
      await handleRemoveParticipant(myParticipant.id);
    }
    router.push('/collaborate');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-linear-to-b from-blue-50 to-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading collaboration session...</p>
        </div>
      </div>
    );
  }

  // Non-participant UI - show request to join
  if (!isParticipant && sessionData) {
    return (
      <div className="min-h-screen bg-linear-to-b from-blue-50 to-white flex items-center justify-center">
        <div className="text-center max-w-md bg-white p-8 rounded-lg shadow-lg">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Join Collaboration Session</h2>
          <p className="text-gray-600 mb-6">
            You're not currently a participant in this session. Request access to join and collaborate with others.
          </p>
          {hasRequestedJoin ? (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
              <p className="text-yellow-800 text-sm">
                ⏳ Join request sent! Waiting for the host to approve your request.
              </p>
            </div>
          ) : (
            <button
              onClick={handleRequestJoin}
              className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors mb-3"
            >
              🖐️ Request to Join
            </button>
          )}
          <button
            onClick={() => router.push('/dashboard')}
            className="w-full px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (error || !sessionData) {
    return (
      <div className="min-h-screen bg-linear-to-b from-blue-50 to-white flex items-center justify-center">
        <div className="text-center max-w-md">
          <svg className="w-16 h-16 text-red-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Session Error</h2>
          <p className="text-gray-600 mb-6">{error || 'Something went wrong'}</p>
          <button
            onClick={handleLeave}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
          >
            Back to Sessions
          </button>
        </div>
      </div>
    );
  }

  if (!sessionData.is_active) {
    return (
      <div className="min-h-screen bg-linear-to-b from-blue-50 to-white flex items-center justify-center">
        <div className="text-center max-w-md">
          <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Session Ended</h2>
          <p className="text-gray-600 mb-6">This collaboration session is no longer active.</p>
          <button
            onClick={handleLeave}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
          >
            Back to Sessions
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex bg-linear-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Premium Header */}
        <div className="bg-white/80 backdrop-blur-xl border-b border-slate-200/60 shadow-sm">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              {/* Left Section - Session Info */}
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-linear-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                    </svg>
                  </div>
                  <div>
                    <h1 className="text-lg font-bold text-slate-900">{sessionData.session_name}</h1>
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <span className="flex items-center gap-1">
                        <div className={`w-1.5 h-1.5 rounded-full ${participants.filter(p => p.is_online).length > 0 ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`}></div>
                        {participants.filter(p => p.is_online).length} online
                      </span>
                      <span className="text-slate-300">•</span>
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-full font-mono font-medium">
                        {sessionData?.language}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Section - Actions & Status */}
              <div className="flex items-center gap-2">
                {!canEdit && (
                  <span className="px-3 py-1.5 bg-amber-50 border border-amber-200 text-amber-700 text-xs font-semibold rounded-lg flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                    </svg>
                    Read Only
                  </span>
                )}
                
                {/* Invite Button (Host only) */}
                {isHost && (
                  <button
                    onClick={() => setShowInviteModal(true)}
                    className="px-4 py-2 bg-linear-to-r from-violet-600 to-indigo-600 text-white text-sm font-semibold rounded-lg hover:from-violet-700 hover:to-indigo-700 transition-all shadow-lg shadow-violet-500/30 flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M8 9a3 3 0 100-6 3 3 0 000 6zM8 11a6 6 0 016 6H2a6 6 0 016-6zM16 7a1 1 0 10-2 0v1h-1a1 1 0 100 2h1v1a1 1 0 102 0v-1h1a1 1 0 100-2h-1V7z" />
                    </svg>
                    Invite
                  </button>
                )}

                {/* Pull Code (Students only) */}
                {!isHost && (
                  <button
                    onClick={handlePullCode}
                    className="px-4 py-2 bg-purple-600 text-white text-sm font-semibold rounded-lg hover:bg-purple-700 transition-all shadow-lg shadow-purple-500/30 flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                    </svg>
                    Pull Code
                  </button>
                )}

                {/* Execute Button */}
                <button
                  onClick={handleExecuteCode}
                  disabled={executing}
                  className="px-4 py-2 bg-linear-to-r from-emerald-600 to-teal-600 text-white text-sm font-semibold rounded-lg hover:from-emerald-700 hover:to-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-emerald-500/30 flex items-center gap-2"
                >
                  {executing ? (
                    <>
                      <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      Running...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                      </svg>
                      Run Code
                    </>
                  )}
                </button>

                {/* Participants Button */}
                <button
                  onClick={() => setShowParticipants(!showParticipants)}
                  className="px-4 py-2 bg-white border border-slate-200 text-slate-700 text-sm font-semibold rounded-lg hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                  </svg>
                  {participants.length}
                </button>

                {/* Join Requests (Host only) */}
                {isHost && joinRequests.length > 0 && (
                  <button
                    onClick={() => setShowJoinRequests(!showJoinRequests)}
                    className="relative px-4 py-2 bg-linear-to-r from-orange-500 to-red-500 text-white text-sm font-semibold rounded-lg hover:from-orange-600 hover:to-red-600 transition-all shadow-lg shadow-orange-500/30 flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
                    </svg>
                    {joinRequests.length} Request{joinRequests.length !== 1 ? 's' : ''}
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-white text-red-600 text-xs font-bold rounded-full flex items-center justify-center shadow-lg">
                      {joinRequests.length}
                    </span>
                  </button>
                )}

                {/* Leave Button */}
                <button
                  onClick={handleLeave}
                  className="px-4 py-2 bg-red-50 border border-red-200 text-red-700 text-sm font-semibold rounded-lg hover:bg-red-100 hover:border-red-300 transition-all flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  Leave
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Premium Execution Result Panel */}
        {executionResult && (
          <div className="bg-linear-to-br from-slate-800 via-slate-900 to-slate-800 border-b border-slate-700/50 shadow-xl">
            <div className="px-6 py-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  {executionResult.error ? (
                    <>
                      <div className="w-8 h-8 rounded-lg bg-linear-to-br from-red-500 to-rose-600 flex items-center justify-center shadow-lg shadow-red-500/40">
                        <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <span className="text-sm font-bold text-red-400">Execution Error</span>
                    </>
                  ) : (
                    <>
                      <div className="w-8 h-8 rounded-lg bg-linear-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/40">
                        <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <span className="text-sm font-bold text-emerald-400">Execution Output</span>
                    </>
                  )}
                </div>
                <button
                  onClick={() => setExecutionResult(null)}
                  className="px-3 py-1.5 bg-slate-700/50 hover:bg-slate-600/50 text-slate-300 hover:text-white text-xs font-semibold rounded-lg transition-all border border-slate-600/50 flex items-center gap-1.5"
                >
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                  Dismiss
                </button>
              </div>
              
              <div className="max-h-48 overflow-y-auto rounded-xl bg-slate-950/50 p-4 border border-slate-700/50 shadow-inner">
                {executionResult.error ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-xs text-red-400 font-semibold mb-2">
                      <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      Error Details
                    </div>
                    <pre className="text-red-300 text-xs font-mono whitespace-pre-wrap leading-relaxed">{executionResult.error}</pre>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {executionResult.stdout && (
                      <div>
                        <div className="flex items-center gap-2 text-xs text-emerald-400 font-semibold mb-2">
                          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                          Standard Output
                        </div>
                        <pre className="text-emerald-300 text-xs font-mono whitespace-pre-wrap leading-relaxed pl-5 border-l-2 border-emerald-500/50">{executionResult.stdout}</pre>
                      </div>
                    )}
                    {executionResult.stderr && (
                      <div>
                        <div className="flex items-center gap-2 text-xs text-yellow-400 font-semibold mb-2">
                          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                          Standard Error
                        </div>
                        <pre className="text-yellow-300 text-xs font-mono whitespace-pre-wrap leading-relaxed pl-5 border-l-2 border-yellow-500/50">{executionResult.stderr}</pre>
                      </div>
                    )}
                    {!executionResult.stdout && !executionResult.stderr && (
                      <div className="flex items-center justify-center py-4">
                        <span className="text-slate-400 text-xs font-medium">No output generated</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Editor */}
        <div className="flex-1 overflow-hidden">
          <CollaborativeEditor
            sessionId={sessionId}
            language={sessionData?.language || 'javascript'}
            isLocked={sessionData?.is_locked || false}
            canEdit={isHost || canEdit}
            onSave={handleSave}
          />
        </div>
      </div>

      {/* Premium Participants Panel */}
      {showParticipants && (
        <div className="w-80 bg-linear-to-br from-slate-50 to-blue-50 border-l border-slate-200 flex flex-col shadow-xl">
          <div className="p-4 border-b border-slate-200/60 bg-white/60 backdrop-blur-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-linear-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-md">
                  <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                  </svg>
                </div>
                <h3 className="font-bold text-slate-900 text-sm">Participants ({participants.length})</h3>
              </div>
              <button
                onClick={() => setShowParticipants(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-200/50 transition-all"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {participants.map((participant) => (
              <div
                key={participant.id}
                className="bg-white/80 backdrop-blur-sm rounded-xl p-3.5 shadow-md border border-slate-200/50 hover:shadow-lg transition-all"
              >
                <div className="flex items-start gap-3">
                  <div className="relative">
                    <div className="w-11 h-11 bg-linear-to-br from-blue-500 to-indigo-600 text-white rounded-xl flex items-center justify-center font-bold text-sm shadow-lg shadow-blue-500/30">
                      {participant.user.name?.charAt(0) || '?'}
                    </div>
                    {participant.is_online && (
                      <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-white shadow-sm"></div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-sm text-slate-900 truncate">
                        {participant.user.name}
                      </span>
                      {participant.role === 'host' && (
                        <span className="px-1.5 py-0.5 bg-linear-to-r from-amber-400 to-orange-500 text-white text-[10px] font-bold rounded uppercase shadow-sm">
                          Host
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5">
                      {participant.can_edit ? (
                        <span className="px-2 py-0.5 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold rounded-md flex items-center gap-1">
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                          </svg>
                          Edit
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 bg-amber-50 border border-amber-200 text-amber-700 text-xs font-semibold rounded-md flex items-center gap-1">
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                            <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                          </svg>
                          View
                        </span>
                      )}
                    </div>

                    {/* Host Controls */}
                    {isHost && participant.role !== 'host' && (
                      <div className="flex gap-1.5 mt-2.5">
                        <button
                          onClick={() => handleTogglePermission(participant.id, participant.can_edit)}
                          className="flex-1 px-2.5 py-1.5 text-xs bg-linear-to-r from-blue-500 to-indigo-600 text-white rounded-lg hover:from-blue-600 hover:to-indigo-700 transition-all font-semibold shadow-sm flex items-center justify-center gap-1"
                        >
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                            {participant.can_edit ? (
                              <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                            ) : (
                              <path d="M10 2a5 5 0 00-5 5v2a2 2 0 00-2 2v5a2 2 0 002 2h10a2 2 0 002-2v-5a2 2 0 00-2-2H7V7a3 3 0 015.905-.75 1 1 0 001.937-.5A5.002 5.002 0 0010 2z" />
                            )}
                          </svg>
                          {participant.can_edit ? 'Lock' : 'Unlock'}
                        </button>
                        <button
                          onClick={() => handleRemoveParticipant(participant.id)}
                          className="px-2.5 py-1.5 text-xs bg-red-50 border border-red-200 text-red-700 rounded-lg hover:bg-red-100 hover:border-red-300 transition-all font-semibold flex items-center gap-1"
                        >
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                          </svg>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Premium Join Requests Panel */}
      {showJoinRequests && isHost && (
        <div className="w-80 bg-linear-to-br from-orange-50 to-red-50 border-l border-orange-200 flex flex-col shadow-xl">
          <div className="p-4 border-b border-orange-200/60 bg-white/60 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-linear-to-br from-orange-500 to-red-600 flex items-center justify-center shadow-md">
                  <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
                  </svg>
                </div>
                <h3 className="font-bold text-slate-900 text-sm">Join Requests</h3>
              </div>
              <button
                onClick={() => setShowJoinRequests(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-200/50 transition-all"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
            {joinRequests.length > 0 && (
              <div className="flex gap-2">
                <button
                  onClick={() => handleApproveAll(false)}
                  className="flex-1 px-3 py-2 text-xs bg-linear-to-r from-emerald-500 to-teal-600 text-white rounded-lg hover:from-emerald-600 hover:to-teal-700 transition-all font-semibold shadow-md shadow-emerald-500/30 flex items-center justify-center gap-1.5"
                >
                  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                    <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                  </svg>
                  All View
                </button>
                <button
                  onClick={() => handleApproveAll(true)}
                  className="flex-1 px-3 py-2 text-xs bg-linear-to-r from-blue-500 to-indigo-600 text-white rounded-lg hover:from-blue-600 hover:to-indigo-700 transition-all font-semibold shadow-md shadow-blue-500/30 flex items-center justify-center gap-1.5"
                >
                  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                  </svg>
                  All Edit
                </button>
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {joinRequests.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-3">
                  <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                  </svg>
                </div>
                <p className="text-sm font-medium text-slate-600">No pending requests</p>
                <p className="text-xs text-slate-400 mt-1">You're all caught up!</p>
              </div>
            ) : (
              joinRequests.map((request) => (
                <div
                  key={request.id}
                  className="bg-white/80 backdrop-blur-sm rounded-xl p-3.5 shadow-md border border-orange-200/50 hover:shadow-lg transition-all"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-11 h-11 bg-linear-to-br from-orange-500 to-red-600 text-white rounded-xl flex items-center justify-center font-bold text-sm shadow-lg shadow-orange-500/30">
                      {request.user.name?.charAt(0) || '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="font-semibold text-sm text-slate-900 block truncate">
                        {request.user.name}
                      </span>
                      <span className="text-xs text-slate-500 block truncate">{request.user.email}</span>
                      {request.message && (
                        <p className="text-xs text-slate-600 mt-1.5 p-2 bg-slate-50 rounded-lg border border-slate-200">
                          <span className="font-medium text-slate-700">Message:</span> "{request.message}"
                        </p>
                      )}
                      <div className="flex gap-1.5 mt-2.5">
                        <button
                          onClick={() => handleApproveRequest(request.id, false)}
                          className="flex-1 px-2.5 py-1.5 text-xs bg-linear-to-r from-emerald-500 to-teal-600 text-white rounded-lg hover:from-emerald-600 hover:to-teal-700 transition-all font-semibold shadow-sm flex items-center justify-center gap-1"
                        >
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                            <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                          </svg>
                          View
                        </button>
                        <button
                          onClick={() => handleApproveRequest(request.id, true)}
                          className="flex-1 px-2.5 py-1.5 text-xs bg-linear-to-r from-blue-500 to-indigo-600 text-white rounded-lg hover:from-blue-600 hover:to-indigo-700 transition-all font-semibold shadow-sm flex items-center justify-center gap-1"
                        >
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                          </svg>
                          Edit
                        </button>
                        <button
                          onClick={() => handleRejectRequest(request.id)}
                          className="px-2.5 py-1.5 text-xs bg-red-50 border border-red-200 text-red-700 rounded-lg hover:bg-red-100 hover:border-red-300 transition-all font-semibold flex items-center gap-1"
                        >
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
      
      {/* Premium Invite Student Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
            {/* Header */}
            <div className="bg-linear-to-br from-violet-500 to-indigo-600 px-6 py-5">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-lg">
                  <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M8 9a3 3 0 100-6 3 3 0 000 6zM8 11a6 6 0 016 6H2a6 6 0 016-6zM16 7a1 1 0 10-2 0v1h-1a1 1 0 100 2h1v1a1 1 0 102 0v-1h1a1 1 0 100-2h-1V7z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Invite Students</h3>
                  <p className="text-xs text-violet-100">Share this session link</p>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="p-6">
              <p className="text-sm text-slate-600 mb-4">
                Students can join by requesting access. Share this link with them:
              </p>
              
              {/* Session Link */}
              <div className="bg-linear-to-br from-slate-50 to-blue-50 p-4 rounded-xl border border-slate-200 mb-4 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-linear-to-br from-blue-400/10 to-indigo-400/10 rounded-full blur-2xl"></div>
                <div className="relative">
                  <label className="block text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wide">Session URL</label>
                  <code className="text-xs text-slate-700 break-all font-mono bg-white px-3 py-2 rounded-lg border border-slate-200 block">
                    {typeof window !== 'undefined' ? `${window.location.origin}/collaborate/${sessionId}` : ''}
                  </code>
                </div>
              </div>

              {/* Optional Email Input */}
              <div className="mb-5">
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Student Email <span className="text-slate-400 font-normal text-xs">(optional)</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="w-4 h-4 text-slate-400" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                      <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                    </svg>
                  </div>
                  <input
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="student@example.com"
                    className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all text-sm"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2.5">
                <button
                  onClick={handleInviteStudent}
                  className="flex-1 px-4 py-2.5 bg-linear-to-r from-violet-600 to-indigo-600 text-white text-sm font-semibold rounded-lg hover:from-violet-700 hover:to-indigo-700 transition-all shadow-lg shadow-violet-500/30 flex items-center justify-center gap-2"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
                    <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" />
                  </svg>
                  Copy Link
                </button>
                <button
                  onClick={() => {
                    setShowInviteModal(false);
                    setInviteEmail('');
                  }}
                  className="px-4 py-2.5 border border-slate-300 text-slate-700 text-sm font-semibold rounded-lg hover:bg-slate-50 hover:border-slate-400 transition-all"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

