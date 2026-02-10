'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import Editor, { Monaco } from '@monaco-editor/react';
import { useSession } from 'next-auth/react';
import * as Y from 'yjs';
import { SupabaseProvider } from '../../lib/yjs-supabase-provider';

// Dynamic imports for browser-only modules
let MonacoBinding: any = null;
let IndexeddbPersistence: any = null;

interface RemoteUser {
  id: string;
  name: string;
  color: string;
  cursor: { line: number; column: number } | null;
}

interface CollaborativeEditorProps {
  sessionId: string;
  language?: string;
  isLocked?: boolean;
  canEdit?: boolean;
  onSave?: (code: string) => void;
}

export default function CollaborativeEditor({
  sessionId,
  language = 'javascript',
  isLocked = false,
  canEdit = true,
  onSave,
}: CollaborativeEditorProps) {
  const { data: session, status } = useSession();
  const [isConnected, setIsConnected] = useState(false);
  const [remoteUsers, setRemoteUsers] = useState<RemoteUser[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [modulesLoaded, setModulesLoaded] = useState(false);
  
  // Refs for Yjs components
  const editorRef = useRef<any>(null);
  const monacoRef = useRef<Monaco | null>(null);
  const ydocRef = useRef<Y.Doc | null>(null);
  const providerRef = useRef<SupabaseProvider | null>(null);
  const bindingRef = useRef<any>(null);
  const indexeddbRef = useRef<any>(null);
  const hasJoinedRef = useRef(false);

  // Load browser-only modules
  useEffect(() => {
    const loadModules = async () => {
      if (typeof window !== 'undefined') {
        const [yMonaco, yIndexeddb] = await Promise.all([
          import('y-monaco'),
          import('y-indexeddb'),
        ]);
        MonacoBinding = yMonaco.MonacoBinding;
        IndexeddbPersistence = yIndexeddb.IndexeddbPersistence;
        setModulesLoaded(true);
      }
    };
    loadModules();
  }, []);

  // Initialize Yjs document and provider
  useEffect(() => {
    if (!session?.user?.id || !sessionId || !modulesLoaded) return;

    const initYjs = async () => {
      setIsLoading(true);
      
      // Create Yjs document
      const ydoc = new Y.Doc();
      ydocRef.current = ydoc;

      // Set up IndexedDB persistence for offline support
      const indexeddbProvider = new IndexeddbPersistence(`collab-${sessionId}`, ydoc);
      indexeddbRef.current = indexeddbProvider;

      // Wait for IndexedDB to sync
      await new Promise<void>((resolve) => {
        indexeddbProvider.on('synced', () => {
          console.log('📦 IndexedDB synced');
          resolve();
        });
        // Timeout after 2 seconds if no local data
        setTimeout(resolve, 2000);
      });

      // Fetch initial code from server if document is empty
      const ytext = ydoc.getText('monaco');
      if (ytext.length === 0) {
        try {
          const response = await fetch(`/api/collaboration/sessions/${sessionId}/code`);
          if (response.ok) {
            const data = await response.json();
            if (data.code && data.code !== '// Start coding...\n') {
              ytext.insert(0, data.code);
            } else {
              ytext.insert(0, '// Start coding...\n');
            }
          }
        } catch (error) {
          console.error('Error fetching initial code:', error);
          ytext.insert(0, '// Start coding...\n');
        }
      }

      // Create Supabase provider for real-time sync
      const provider = new SupabaseProvider(sessionId, ydoc, {
        id: session.user.id,
        name: session.user.name || session.user.email || 'Anonymous',
      });
      providerRef.current = provider;

      // Listen for awareness changes to update remote users
      const unsubscribe = provider.onAwarenessChange(() => {
        const states = provider.getRemoteStates();
        const users: RemoteUser[] = [];
        states.forEach((state) => {
          users.push({
            id: state.id,
            name: state.name,
            color: state.color,
            cursor: state.cursor,
          });
        });
        setRemoteUsers(users);
      });

      // Check connection status
      const checkConnection = setInterval(() => {
        setIsConnected(provider.isConnected());
      }, 1000);

      // Join the session via API
      try {
        const response = await fetch(`/api/collaboration/sessions/${sessionId}`, {
          method: 'POST',
        });
        if (response.ok) {
          console.log('✅ Joined collaboration session');
          hasJoinedRef.current = true;
        }
      } catch (error) {
        console.error('Error joining session:', error);
      }

      setIsLoading(false);

      // Cleanup function
      return () => {
        clearInterval(checkConnection);
        unsubscribe();
      };
    };

    const cleanup = initYjs();

    return () => {
      cleanup.then((fn) => fn?.());
      
      // Cleanup Yjs components
      if (bindingRef.current) {
        bindingRef.current.destroy();
        bindingRef.current = null;
      }
      if (providerRef.current) {
        providerRef.current.destroy();
        providerRef.current = null;
      }
      if (indexeddbRef.current) {
        indexeddbRef.current.destroy();
        indexeddbRef.current = null;
      }
      if (ydocRef.current) {
        ydocRef.current.destroy();
        ydocRef.current = null;
      }
      
      // Leave session via API
      if (hasJoinedRef.current) {
        fetch(`/api/collaboration/sessions/${sessionId}`, {
          method: 'DELETE',
        }).catch(console.error);
        hasJoinedRef.current = false;
      }
    };
  }, [session?.user?.id, sessionId, modulesLoaded]);

  // Handle Monaco editor mount
  const handleEditorDidMount = useCallback((editor: any, monaco: Monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    if (!ydocRef.current || !providerRef.current || !MonacoBinding) {
      console.error('Yjs not initialized or MonacoBinding not loaded');
      return;
    }

    const ytext = ydocRef.current.getText('monaco');

    // Create Monaco binding
    const binding = new MonacoBinding(
      ytext,
      editor.getModel()!,
      new Set([editor]),
      providerRef.current.getAwareness()
    );
    bindingRef.current = binding;

    // Update cursor position in awareness
    editor.onDidChangeCursorPosition((e: any) => {
      if (providerRef.current) {
        providerRef.current.updateCursor({
          line: e.position.lineNumber,
          column: e.position.column,
        });
      }
    });

    // Notify parent of code changes
    ytext.observe(() => {
      if (onSave) {
        onSave(ytext.toString());
      }
    });

    console.log('✅ Monaco binding created');
  }, [onSave]);

  // Handle save
  const handleSave = async () => {
    if (!ydocRef.current || isSaving) return;

    setIsSaving(true);
    try {
      const ytext = ydocRef.current.getText('monaco');
      const code = ytext.toString();

      // Save to server
      await fetch(`/api/collaboration/sessions/${sessionId}/code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });

      // Create snapshot
      await fetch('/api/collaboration/snapshots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          codeContent: code,
          language,
          snapshotType: 'manual',
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

  // Auto-save every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (ydocRef.current && !isSaving && isConnected) {
        const ytext = ydocRef.current.getText('monaco');
        const code = ytext.toString();
        
        // Save to server in background
        fetch(`/api/collaboration/sessions/${sessionId}/code`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code }),
        }).catch(console.error);
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [sessionId, isSaving, isConnected]);

  if (isLoading || !modulesLoaded) {
    return (
      <div className="flex flex-col h-full items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
        <p className="text-gray-600">Initializing collaborative editor...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          {/* Connection status */}
          <div className={`flex items-center gap-2 px-2 py-1 rounded ${
            isConnected ? 'bg-green-50 text-green-700' : 'bg-yellow-50 text-yellow-700'
          }`}>
            <div className={`w-2 h-2 rounded-full ${
              isConnected ? 'bg-green-500 animate-pulse' : 'bg-yellow-500'
            }`}></div>
            <span className="text-xs font-medium">
              {isConnected ? 'Live' : 'Connecting...'}
            </span>
          </div>

          {/* Participants */}
          <div className="flex items-center gap-2">
            <div className="flex -space-x-2">
              {/* Current user */}
              <div
                className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-semibold border-2 border-white z-10"
                title="You"
              >
                {session?.user?.name?.charAt(0).toUpperCase() || 'Y'}
              </div>
              {/* Remote users */}
              {remoteUsers.slice(0, 4).map((user) => (
                <div
                  key={user.id}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-semibold border-2 border-white"
                  style={{ backgroundColor: user.color }}
                  title={user.name}
                >
                  {user.name.charAt(0).toUpperCase()}
                </div>
              ))}
              {remoteUsers.length > 4 && (
                <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 text-xs font-semibold border-2 border-white">
                  +{remoteUsers.length - 4}
                </div>
              )}
            </div>
            <span className="text-sm text-gray-600">
              {remoteUsers.length + 1} online
            </span>
          </div>

          {/* Lock indicator */}
          {(isLocked || !canEdit) && (
            <div className="flex items-center gap-1 text-orange-600 bg-orange-50 px-2 py-1 rounded">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
              </svg>
              <span className="text-xs font-medium">{isLocked ? 'Locked' : 'View Only'}</span>
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
            disabled={isSaving || isLocked || !canEdit}
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
          onMount={handleEditorDidMount}
          theme="vs-light"
          options={{
            readOnly: isLocked || !canEdit,
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
