'use client';

import { useEffect, useRef, useState } from 'react';
import Editor from '@monaco-editor/react';
import { useSession } from 'next-auth/react';

interface Participant {
  id: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
  role: string;
  is_online: boolean;
  cursor_position?: {
    line: number;
    column: number;
  };
}

interface CollaborativeEditorProps {
  sessionId: string;
  language?: string;
  isLocked?: boolean;
  onSave?: (code: string) => void;
}

export default function CollaborativeEditor({
  sessionId,
  language = 'javascript',
  isLocked = false,
  onSave,
}: CollaborativeEditorProps) {
  const { data: session } = useSession();
  const [code, setCode] = useState('// Start coding...\n');
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const editorRef = useRef<any>(null);
  const syncIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastSyncedCodeRef = useRef<string>('');

  // Fetch initial code from server
  useEffect(() => {
    const fetchInitialCode = async () => {
      try {
        const response = await fetch(`/api/collaboration/sessions/${sessionId}/code`);
        if (response.ok) {
          const data = await response.json();
          if (data.code) {
            setCode(data.code);
            lastSyncedCodeRef.current = data.code;
          }
        }
      } catch (error) {
        console.error('Error fetching initial code:', error);
      }
    };

    fetchInitialCode();
  }, [sessionId]);

  // Join session and fetch participants
  useEffect(() => {
    if (!session?.user?.id) return;

    const joinSession = async () => {
      try {
        const response = await fetch(`/api/collaboration/sessions/${sessionId}`, {
          method: 'POST',
        });

        if (response.ok) {
          console.log('✅ Joined collaboration session');
          fetchParticipants();
        }
      } catch (error) {
        console.error('Error joining session:', error);
      }
    };

    const fetchParticipants = async () => {
      try {
        const response = await fetch(`/api/collaboration/sessions/${sessionId}`);
        if (response.ok) {
          const data = await response.json();
          setParticipants(data.participants || []);
        }
      } catch (error) {
        console.error('Error fetching participants:', error);
      }
    };

    joinSession();

    // Poll for participants and sync code every 2 seconds
    syncIntervalRef.current = setInterval(() => {
      fetchParticipants();
      syncCodeWithServer();
    }, 2000);

    // Leave session on unmount
    return () => {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
      }

      fetch(`/api/collaboration/sessions/${sessionId}`, {
        method: 'DELETE',
      }).catch(console.error);
    };
  }, [sessionId, session?.user?.id]);

  // Sync code with server (poll-based collaboration)
  const syncCodeWithServer = async () => {
    if (isSyncing) return;
    
    try {
      setIsSyncing(true);
      const response = await fetch(`/api/collaboration/sessions/${sessionId}/code`);
      if (response.ok) {
        const data = await response.json();
        if (data.code && data.code !== lastSyncedCodeRef.current) {
          // Only update if code changed on server and we're not actively typing
          const currentCode = editorRef.current?.getValue() || '';
          if (currentCode === lastSyncedCodeRef.current) {
            setCode(data.code);
            lastSyncedCodeRef.current = data.code;
          }
        }
      }
    } catch (error) {
      console.error('Error syncing code:', error);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleEditorChange = async (value: string | undefined) => {
    if (!value || isLocked) return;

    setCode(value);
    
    // Debounce server updates
    if (syncIntervalRef.current) {
      clearTimeout(syncIntervalRef.current as any);
    }
    
    syncIntervalRef.current = setTimeout(async () => {
      try {
        await fetch(`/api/collaboration/sessions/${sessionId}/code`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code: value }),
        });
        lastSyncedCodeRef.current = value;
      } catch (error) {
        console.error('Error updating code:', error);
      }
    }, 500) as any;
  };

  const handleEditorDidMount = (editor: any) => {
    editorRef.current = editor;

    // Track cursor position changes
    editor.onDidChangeCursorPosition((e: any) => {
      updateCursorPosition(e.position.lineNumber, e.position.column);
    });
  };

  const updateCursorPosition = async (line: number, column: number) => {
    if (!session?.user?.id) return;

    try {
      await fetch(`/api/collaboration/sessions/${sessionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cursorPosition: { line, column },
        }),
      });
    } catch (error) {
      console.error('Error updating cursor:', error);
    }
  };

  const handleSave = async () => {
    if (!code || isSaving) return;

    setIsSaving(true);
    try {
      // Create snapshot
      await fetch('/api/collaboration/snapshots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          codeContent: code,
          language,
          snapshotType: 'auto',
        }),
      });

      setLastSaved(new Date());
      if (onSave) {
        onSave(code);
      }
    } catch (error) {
      console.error('Error saving:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const onlineParticipants = participants.filter(p => p.is_online);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          {/* Participants */}
          <div className="flex items-center gap-2">
            <div className="flex -space-x-2">
              {onlineParticipants.slice(0, 5).map((participant) => (
                <div
                  key={participant.id}
                  className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xs font-semibold border-2 border-white"
                  title={participant.user.name}
                >
                  {participant.user.name.charAt(0).toUpperCase()}
                </div>
              ))}
              {onlineParticipants.length > 5 && (
                <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 text-xs font-semibold border-2 border-white">
                  +{onlineParticipants.length - 5}
                </div>
              )}
            </div>
            <span className="text-sm text-gray-600">
              {onlineParticipants.length} online
            </span>
          </div>

          {/* Lock indicator */}
          {isLocked && (
            <div className="flex items-center gap-1 text-orange-600 bg-orange-50 px-2 py-1 rounded">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
              </svg>
              <span className="text-xs font-medium">Read Only</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          {/* Last saved */}
          {lastSaved && (
            <span className="text-xs text-gray-500">
              Saved {lastSaved.toLocaleTimeString()}
            </span>
          )}

          {/* Save button */}
          <button
            onClick={handleSave}
            disabled={isSaving || isLocked}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSaving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1">
        <Editor
          height="100%"
          language={language}
          value={code}
          onChange={handleEditorChange}
          onMount={handleEditorDidMount}
          theme="vs-light"
          options={{
            readOnly: isLocked,
            minimap: { enabled: true },
            fontSize: 14,
            lineNumbers: 'on',
            scrollBeyondLastLine: false,
            automaticLayout: true,
            tabSize: 2,
            wordWrap: 'on',
          }}
        />
      </div>
    </div>
  );
}
