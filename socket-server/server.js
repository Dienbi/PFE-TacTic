require('dotenv').config();
const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
const httpServer = createServer(app);

// Configure CORS for Socket.IO
const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Express middleware
app.use(cors());
app.use(express.json());

// Store connected RH users
const connectedRHUsers = new Map();

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  // RH user joins their room
  socket.on('rh:join', (userId) => {
    console.log(`RH user ${userId} joined`);
    connectedRHUsers.set(socket.id, userId);
    socket.join('rh-notifications');
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
    connectedRHUsers.delete(socket.id);
  });
});

// REST endpoint to emit notifications from Laravel
app.post('/emit/new-account-request', (req, res) => {
  const { accountRequest } = req.body;
  
  console.log('Emitting new account request notification:', accountRequest);
  
  // Emit to all RH users in the rh-notifications room
  io.to('rh-notifications').emit('new-account-request', {
    type: 'NEW_ACCOUNT_REQUEST',
    data: accountRequest,
    message: `Nouvelle demande de compte de ${accountRequest.prenom} ${accountRequest.nom}`,
    timestamp: new Date().toISOString()
  });
  
  res.json({ success: true, message: 'Notification sent' });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    connectedClients: io.engine.clientsCount,
    rhUsers: connectedRHUsers.size
  });
});

const PORT = process.env.SOCKET_PORT || 3001;

httpServer.listen(PORT, () => {
  console.log(`Socket.IO server running on port ${PORT}`);
});
