const jwt = require('jsonwebtoken');
const Document = require('../models/Document');
const User = require('../models/User');

// Track active rooms: { roomId: { socketId: { userId, name, color, cursor } } }
const activeRooms = new Map();

const setupSocket = (io) => {
  // Auth middleware for socket
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) return next(new Error('Authentication required'));

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.userId).select('-password');
      if (!user) return next(new Error('User not found'));

      socket.user = user;
      next();
    } catch (error) {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`🔌 User connected: ${socket.user.name} (${socket.id})`);

    // Join document room
    socket.on('join-document', async ({ documentId }) => {
      try {
        const doc = await Document.findById(documentId)
          .populate('owner', 'name email color');

        if (!doc) {
          socket.emit('error', { message: 'Document not found' });
          return;
        }

        if (!doc.canAccess(socket.user._id)) {
          socket.emit('error', { message: 'Access denied' });
          return;
        }

        socket.join(documentId);
        socket.currentRoom = documentId;

        // Initialize room if needed
        if (!activeRooms.has(documentId)) {
          activeRooms.set(documentId, new Map());
        }

        const room = activeRooms.get(documentId);
        room.set(socket.id, {
          userId: socket.user._id.toString(),
          name: socket.user.name,
          color: socket.user.color,
          cursor: null,
        });

        // Send document content to joining user
        socket.emit('document-loaded', {
          content: doc.content,
          title: doc.title,
        });

        // Broadcast active users to room
        const activeUsers = Array.from(room.values());
        io.to(documentId).emit('active-users', activeUsers);

        console.log(`📄 ${socket.user.name} joined document: ${documentId}`);
      } catch (error) {
        console.error('Join document error:', error);
        socket.emit('error', { message: 'Failed to join document' });
      }
    });

    // Handle real-time content changes
    socket.on('document-change', async ({ documentId, content, delta }) => {
      try {
        // Broadcast change to others in room (not sender)
        socket.to(documentId).emit('document-updated', {
          content,
          delta,
          userId: socket.user._id.toString(),
          userName: socket.user.name,
        });
      } catch (error) {
        console.error('Document change error:', error);
      }
    });

    // Handle title changes
    socket.on('title-change', ({ documentId, title }) => {
      socket.to(documentId).emit('title-updated', {
        title,
        userId: socket.user._id.toString(),
      });
    });

    // Handle cursor position
    socket.on('cursor-move', ({ documentId, cursor }) => {
      const room = activeRooms.get(documentId);
      if (room && room.has(socket.id)) {
        const userInfo = room.get(socket.id);
        userInfo.cursor = cursor;
        room.set(socket.id, userInfo);

        socket.to(documentId).emit('cursor-updated', {
          userId: socket.user._id.toString(),
          name: socket.user.name,
          color: socket.user.color,
          cursor,
        });
      }
    });

    // Auto-save handler
    socket.on('auto-save', async ({ documentId, content, title }) => {
      try {
        const doc = await Document.findById(documentId);
        if (!doc || !doc.canEdit(socket.user._id)) return;

        doc.content = content;
        if (title) doc.title = title;
        doc.lastEditedBy = socket.user._id;
        doc.wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;
        await doc.save();

        socket.emit('save-confirmed', { savedAt: new Date() });
      } catch (error) {
        console.error('Auto-save error:', error);
        socket.emit('save-error', { message: 'Failed to save' });
      }
    });

    // Manual save version
    socket.on('save-version', async ({ documentId, label }) => {
      try {
        const doc = await Document.findById(documentId);
        if (!doc || !doc.canEdit(socket.user._id)) return;

        doc.versions.push({
          content: doc.content,
          savedBy: socket.user._id,
          label: label || `Version ${doc.versions.length + 1}`,
        });

        if (doc.versions.length > 20) {
          doc.versions = doc.versions.slice(-20);
        }

        await doc.save();
        socket.emit('version-saved', { versionCount: doc.versions.length });
      } catch (error) {
        console.error('Save version error:', error);
      }
    });

    // Leave document room
    socket.on('leave-document', ({ documentId }) => {
      leaveRoom(socket, documentId, io);
    });

    // Disconnect handler
    socket.on('disconnect', () => {
      console.log(`🔌 User disconnected: ${socket.user.name} (${socket.id})`);
      if (socket.currentRoom) {
        leaveRoom(socket, socket.currentRoom, io);
      }
    });
  });
};

function leaveRoom(socket, documentId, io) {
  const room = activeRooms.get(documentId);
  if (room) {
    room.delete(socket.id);
    if (room.size === 0) {
      activeRooms.delete(documentId);
    } else {
      const activeUsers = Array.from(room.values());
      io.to(documentId).emit('active-users', activeUsers);
      io.to(documentId).emit('user-left', {
        userId: socket.user._id.toString(),
        name: socket.user.name,
      });
    }
  }
  socket.leave(documentId);
}

module.exports = setupSocket;
