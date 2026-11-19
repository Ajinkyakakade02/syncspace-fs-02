import { useEffect, useState, useRef, useCallback } from 'react';
import * as Y from 'yjs';
import * as syncProtocol from 'y-protocols/sync';
import * as awarenessProtocol from 'y-protocols/awareness';
import * as encoding from 'lib0/encoding';
import * as decoding from 'lib0/decoding';
import { User, Role, ConnectionStatus, CollaboratorPresence } from '../types';
import { pageService } from '../services/page.service';

const MESSAGE_SYNC = 0;
const MESSAGE_AWARENESS = 1;

export function useCollaboration({
  pageId,
  generation,
  user,
}: {
  pageId: string;
  generation: number;
  user: User | null;
}) {
  const [ydoc, setYdoc] = useState<Y.Doc | null>(null);
  const [awareness, setAwareness] = useState<awarenessProtocol.Awareness | null>(null);
  const [status, setStatus] = useState<ConnectionStatus>('connecting');
  const [remoteUsers, setRemoteUsers] = useState<CollaboratorPresence[]>([]);
  const [canEdit, setCanEdit] = useState<boolean>(true);
  const [userRole, setUserRole] = useState<Role>('EDITOR');

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const isDestroyedRef = useRef(false);

  const getWsBaseUrl = () => {
    const configured = import.meta.env.VITE_WS_URL;
    if (configured) return configured;
    const loc = window.location;
    const proto = loc.protocol === 'https:' ? 'wss:' : 'ws:';
    // If running in development with vite on 5173, backend is on 4000
    if (loc.port === '5173') {
      return `${proto}//${loc.hostname}:4000/collaboration`;
    }
    return `${proto}//${loc.host}/collaboration`;
  };

  const connect = useCallback(async () => {
    if (!pageId || !user) return;

    setStatus('connecting');

    try {
      // 1. Fetch short-lived single-use collaboration ticket
      const ticketData = await pageService.getCollaborationTicket(pageId);
      if (isDestroyedRef.current) return;

      setCanEdit(ticketData.canEdit);
      setUserRole(ticketData.role);

      // 2. Initialize fresh Y.Doc & Awareness
      const doc = new Y.Doc();
      const aware = new awarenessProtocol.Awareness(doc);
      setYdoc(doc);
      setAwareness(aware);

      // Set user presence
      aware.setLocalStateField('user', {
        id: user.id,
        name: user.name,
        color: user.cursorColor || '#3b82f6',
        role: ticketData.role,
        canEdit: ticketData.canEdit,
      });

      // 3. Connect to WebSocket server
      const wsUrl = `${getWsBaseUrl()}?ticket=${encodeURIComponent(ticketData.ticket)}&pageId=${pageId}&gen=${generation}`;
      const ws = new WebSocket(wsUrl);
      ws.binaryType = 'arraybuffer';
      wsRef.current = ws;

      ws.onopen = () => {
        if (isDestroyedRef.current) {
          ws.close();
          return;
        }
        setStatus('connected');
        reconnectAttemptsRef.current = 0;

        // Send SyncStep1 from client to server to begin Yjs handshake
        const encoder = encoding.createEncoder();
        encoding.writeVarUint(encoder, MESSAGE_SYNC);
        syncProtocol.writeSyncStep1(encoder, doc);
        ws.send(encoding.toUint8Array(encoder));

        // Send local awareness state
        const awarenessEncoder = encoding.createEncoder();
        encoding.writeVarUint(awarenessEncoder, MESSAGE_AWARENESS);
        encoding.writeVarUint8Array(
          awarenessEncoder,
          awarenessProtocol.encodeAwarenessUpdate(aware, [doc.clientID])
        );
        ws.send(encoding.toUint8Array(awarenessEncoder));
      };

      ws.onmessage = (event) => {
        try {
          const buffer = event.data as ArrayBuffer;
          const uint8 = new Uint8Array(buffer);
          const decoder = decoding.createDecoder(uint8);
          const messageType = decoding.readVarUint(decoder);

          if (messageType === MESSAGE_SYNC) {
            const encoder = encoding.createEncoder();
            encoding.writeVarUint(encoder, MESSAGE_SYNC);

            // Read sync message from server and apply to doc
            syncProtocol.readSyncMessage(decoder, encoder, doc, 'remote-server');

            // If sync response was created (e.g., syncStep2 in reply to server's syncStep1), send it back
            if (encoding.length(encoder) > 1) {
              ws.send(encoding.toUint8Array(encoder));
            }
          } else if (messageType === MESSAGE_AWARENESS) {
            awarenessProtocol.applyAwarenessUpdate(
              aware,
              decoding.readVarUint8Array(decoder),
              'remote-server'
            );
          }
        } catch (err) {
          console.error('Error handling WebSocket message in Yjs client:', err);
        }
      };

      // Listen to local doc updates and broadcast to server
      const handleDocUpdate = (update: Uint8Array, origin: any) => {
        if (origin !== 'remote-server' && ws.readyState === WebSocket.OPEN && ticketData.canEdit) {
          const encoder = encoding.createEncoder();
          encoding.writeVarUint(encoder, MESSAGE_SYNC);
          syncProtocol.writeUpdate(encoder, update);
          ws.send(encoding.toUint8Array(encoder));
        }
      };
      doc.on('update', handleDocUpdate);

      // Listen to awareness changes to update remote collaborator presence list
      const handleAwarenessUpdate = ({ added, updated, removed }: any, origin: any) => {
        // Broadcast awareness to server if local client changed
        if (origin !== 'remote-server' && ws.readyState === WebSocket.OPEN) {
          const changedClients = added.concat(updated, removed);
          const encoder = encoding.createEncoder();
          encoding.writeVarUint(encoder, MESSAGE_AWARENESS);
          encoding.writeVarUint8Array(
            encoder,
            awarenessProtocol.encodeAwarenessUpdate(aware, changedClients)
          );
          ws.send(encoding.toUint8Array(encoder));
        }

        // Update list of active remote collaborators
        const states = aware.getStates();
        const users: CollaboratorPresence[] = [];
        states.forEach((state: any, clientID: number) => {
          if (clientID !== doc.clientID && state?.user) {
            users.push({
              id: state.user.id,
              name: state.user.name,
              color: state.user.color,
              role: state.user.role,
              canEdit: state.user.canEdit,
            });
          }
        });
        setRemoteUsers(users);
      };
      aware.on('update', handleAwarenessUpdate);

      ws.onclose = () => {
        if (isDestroyedRef.current) return;
        setStatus('reconnecting');
        // Exponential backoff reconnect
        const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 10000);
        reconnectAttemptsRef.current += 1;
        reconnectTimeoutRef.current = setTimeout(connect, delay);
      };

      ws.onerror = (err) => {
        console.warn('Collaboration WebSocket error:', err);
        setStatus('error');
      };
    } catch (err) {
      console.error('Failed to initiate collaboration session:', err);
      setStatus('error');
      if (!isDestroyedRef.current) {
        reconnectTimeoutRef.current = setTimeout(connect, 3000);
      }
    }
  }, [pageId, generation, user]);

  useEffect(() => {
    isDestroyedRef.current = false;
    connect();

    return () => {
      isDestroyedRef.current = true;
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      if (awareness) {
        awareness.destroy();
      }
      if (ydoc) {
        ydoc.destroy();
      }
    };
  }, [pageId, generation]);

  const reconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
    }
    connect();
  }, [connect]);

  return {
    ydoc,
    awareness,
    status,
    remoteUsers,
    canEdit,
    userRole,
    reconnect,
  };
}
