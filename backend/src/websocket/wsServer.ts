import { Server as HttpServer } from 'http';
import WebSocket, { WebSocketServer } from 'ws';
import url from 'url';
import * as syncProtocol from 'y-protocols/sync';
import * as awarenessProtocol from 'y-protocols/awareness';
import * as encoding from 'lib0/encoding';
import * as decoding from 'lib0/decoding';
import { logger } from '../config/logger.js';
import { verifyCollabTicket } from '../utils/jwt.js';
import {
  CollabManager,
  CollabRoom,
  ClientConnectionInfo,
  MESSAGE_SYNC,
  MESSAGE_AWARENESS,
} from '../collaboration/collabServer.js';

export const createWebSocketServer = (httpServer: HttpServer) => {
  const wss = new WebSocketServer({ noServer: true });

  // Handle HTTP upgrade requests on /collaboration
  httpServer.on('upgrade', (request, socket, head) => {
    try {
      const parsedUrl = url.parse(request.url || '', true);
      const pathname = parsedUrl.pathname;

      if (pathname !== '/collaboration') {
        socket.write('HTTP/1.1 404 Not Found\r\n\r\n');
        socket.destroy();
        return;
      }

      const ticketToken = parsedUrl.query.ticket as string;
      if (!ticketToken) {
        logger.warn('WebSocket upgrade rejected: No ticket parameter');
        socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
        socket.destroy();
        return;
      }

      let ticket;
      try {
        ticket = verifyCollabTicket(ticketToken);
      } catch (err: any) {
        logger.warn({ err: err.message }, 'WebSocket upgrade rejected: Invalid or expired ticket');
        socket.write('HTTP/1.1 403 Forbidden\r\n\r\n');
        socket.destroy();
        return;
      }

      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request, ticket);
      });
    } catch (err) {
      logger.error({ err }, 'Error during WebSocket upgrade');
      socket.destroy();
    }
  });

  wss.on('connection', async (ws: WebSocket, _request: any, ticket: any) => {
    logger.info(
      { userId: ticket.userId, pageId: ticket.pageId, role: ticket.role, generation: ticket.generation },
      'WebSocket client connected with valid ticket'
    );

    const clientInfo: ClientConnectionInfo = {
      ws,
      ticket,
      isAlive: true,
      subscribedRooms: new Set(),
    };

    let currentRoom: CollabRoom | null = null;

    try {
      currentRoom = await CollabManager.getOrCreateRoom(ticket.pageId, ticket.generation);
      currentRoom.addClient(ws, clientInfo);

      // Initialize awareness state for this user
      currentRoom.awareness.setLocalStateField('user', {
        id: ticket.userId,
        name: ticket.name,
        color: ticket.cursorColor,
        role: ticket.role,
        canEdit: ticket.canEdit,
      });
    } catch (err) {
      logger.error({ err, pageId: ticket.pageId }, 'Failed to initialize collaboration room for client');
      ws.close(1011, 'Failed to join room');
      return;
    }

    ws.on('pong', () => {
      clientInfo.isAlive = true;
    });

    ws.on('message', (data: WebSocket.RawData, isBinary: boolean) => {
      try {
        if (!isBinary) return;

        const buffer = Buffer.isBuffer(data) ? data : Buffer.from(data as any);
        const uint8 = new Uint8Array(buffer);
        const decoder = decoding.createDecoder(uint8);
        const messageType = decoding.readVarUint(decoder);

        if (!currentRoom) return;

        if (messageType === MESSAGE_SYNC) {
          const syncMessageType = decoding.readVarUint(decoder);

          // Role enforcement check: If client attempts to send an update or syncStep2, verify canEdit
          if (syncMessageType === syncProtocol.messageYjsUpdate || syncMessageType === syncProtocol.messageYjsSyncStep2) {
            if (!ticket.canEdit) {
              logger.warn(
                { userId: ticket.userId, role: ticket.role, pageId: ticket.pageId },
                'Rejected Yjs modification attempt from read-only user'
              );
              return;
            }
          }

          // Rewind decoder back to process the full sync message
          const syncDecoder = decoding.createDecoder(uint8);
          decoding.readVarUint(syncDecoder); // discard messageType

          const encoder = encoding.createEncoder();
          encoding.writeVarUint(encoder, MESSAGE_SYNC);

          // Read and process sync message on the room's Y.Doc
          syncProtocol.readSyncMessage(syncDecoder, encoder, currentRoom.doc, ws);

          // If a response was generated (e.g. syncStep2 in response to syncStep1), reply to sender
          if (encoding.length(encoder) > 1) {
            ws.send(encoding.toUint8Array(encoder), { binary: true });
          }
        } else if (messageType === MESSAGE_AWARENESS) {
          // Awareness updates (cursor movements, selections, online status)
          awarenessProtocol.applyAwarenessUpdate(
            currentRoom.awareness,
            decoding.readVarUint8Array(decoder),
            ws
          );
        }
      } catch (err) {
        logger.error({ err, pageId: ticket.pageId }, 'Error processing WebSocket collaboration message');
      }
    });

    const cleanupClient = () => {
      if (currentRoom) {
        currentRoom.removeClient(ws, clientInfo);
      }
    };

    ws.on('close', (code, reason) => {
      logger.debug(
        { userId: ticket.userId, pageId: ticket.pageId, code, reason: reason.toString() },
        'WebSocket client disconnected'
      );
      cleanupClient();
    });

    ws.on('error', (err) => {
      logger.error({ err, userId: ticket.userId }, 'WebSocket client error');
      cleanupClient();
    });
  });

  // Heartbeat ping interval (every 30 seconds)
  const pingInterval = setInterval(() => {
    wss.clients.forEach((ws) => {
      // @ts-expect-error isAlive tracker
      if (ws.isAlive === false) {
        return ws.terminate();
      }
      // @ts-expect-error isAlive tracker
      ws.isAlive = false;
      ws.ping();
    });
  }, 30000);

  wss.on('close', () => {
    clearInterval(pingInterval);
  });

  return wss;
};
