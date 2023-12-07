// @author Mataro Langeaert, Pieter Vanderschueren, Arno Genicot, Toon Neyens
// @date 2023-12-02

import { AuthenticationHandler } from './authentication-handler.mjs';
import { ChatClient } from './chat-client.mjs';
import { readFileSync } from 'fs';
import WebSocket from 'ws';
import Debug from 'debug';

const debug = Debug('chatter:websocket-client');

const isLocalExecution = process.argv.includes('--local');
/**
 * When debug enabled, use localhost as IP and port 8000
 * When debug disabled, use CONFIDENTIAL as IP and port 8000
 */
const ws =
  debug.enabled || isLocalExecution
    ? new WebSocket('wss://127.0.0.1:8000/', {
        ca: readFileSync('./src/certificates/certificate-authority/rootCA.crt'),
      })
    : new WebSocket('wss://CONFIDENTIAL:8000/', {
        ca: readFileSync('./src/certificates/certificate-authority/rootCA.crt'),
      });

ws.on('open', () => {
  debug('WebSocket connection opened successfully.');
  ChatClient.heartbeat(ws);
  console.clear();
  AuthenticationHandler.authenticateUser(ws).catch((error) => {
    console.error(error);
  });
});

ws.on('error', (error) => {
  throw error;
});

ws.on('close', (code, reason) => {
  debug('WebSocket connection closed: %d, %s', code, reason);
  console.log('Connection to server is lost: %d, %s', code, reason);
  process.exit(0);
});
ws.on('message', (data) => ChatClient.onServerRawMessage(ws, data));
ws.on('ping', () => ChatClient.heartbeat(ws));
