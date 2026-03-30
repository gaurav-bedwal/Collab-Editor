const express = require('express');
const { v4: uuidv4 } = require('uuid');
const Document = require('../models/Document');
const User = require('../models/User');
const auth = require('../middleware/auth');

const router = express.Router();

// GET /api/documents - Get all documents for user
router.get('/', auth, async (req, res) => {
  try {
    const docs = await Document.find({
      $or: [
        { owner: req.user._id },
        { 'collaborators.user': req.user._id },
      ],
    })
      .populate('owner', 'name email color')
      .populate('collaborators.user', 'name email color')
      .sort({ updatedAt: -1 })
      .select('-content -versions');

    res.json({ documents: docs });
  } catch (error) {
    console.error('Get documents error:', error);
    res.status(500).json({ message: 'Failed to fetch documents' });
  }
});

// POST /api/documents - Create new document
router.post('/', auth, async (req, res) => {
  try {
    const { title } = req.body;
    const doc = await Document.create({
      title: title || 'Untitled Document',
      owner: req.user._id,
      content: '',
    });

    await doc.populate('owner', 'name email color');
    res.status(201).json({ document: doc });
  } catch (error) {
    console.error('Create document error:', error);
    res.status(500).json({ message: 'Failed to create document' });
  }
});

// GET /api/documents/:id - Get single document
router.get('/:id', auth, async (req, res) => {
  try {
    const doc = await Document.findById(req.params.id)
      .populate('owner', 'name email color')
      .populate('collaborators.user', 'name email color')
      .populate('versions.savedBy', 'name email');

    if (!doc) {
      return res.status(404).json({ message: 'Document not found' });
    }

    if (!doc.canAccess(req.user._id)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json({ document: doc });
  } catch (error) {
    console.error('Get document error:', error);
    res.status(500).json({ message: 'Failed to fetch document' });
  }
});

// PUT /api/documents/:id - Update document
router.put('/:id', auth, async (req, res) => {
  try {
    const doc = await Document.findById(req.params.id);
    if (!doc) return res.status(404).json({ message: 'Document not found' });
    if (!doc.canEdit(req.user._id)) return res.status(403).json({ message: 'Edit access denied' });

    const { title, content } = req.body;
    if (title !== undefined) doc.title = title;
    if (content !== undefined) {
      doc.content = content;
      doc.wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;
    }
    doc.lastEditedBy = req.user._id;
    await doc.save();

    res.json({ document: doc });
  } catch (error) {
    console.error('Update document error:', error);
    res.status(500).json({ message: 'Failed to update document' });
  }
});

// DELETE /api/documents/:id - Delete document
router.delete('/:id', auth, async (req, res) => {
  try {
    const doc = await Document.findById(req.params.id);
    if (!doc) return res.status(404).json({ message: 'Document not found' });
    const ownerId = doc.owner._id ? doc.owner._id : doc.owner;
    if (ownerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only the owner can delete this document' });
    }

    await doc.deleteOne();
    res.json({ message: 'Document deleted successfully' });
  } catch (error) {
    console.error('Delete document error:', error);
    res.status(500).json({ message: 'Failed to delete document' });
  }
});

// POST /api/documents/:id/share - Share document
router.post('/:id/share', auth, async (req, res) => {
  try {
    const { email, role } = req.body;
    const doc = await Document.findById(req.params.id).populate('collaborators.user', 'name email color');
    
    if (!doc) return res.status(404).json({ message: 'Document not found' });
    const ownerId = doc.owner._id ? doc.owner._id : doc.owner;
    if (ownerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only owner can share' });
    }

    if (email) {
      const targetUser = await User.findOne({ email: email.toLowerCase() });
      if (!targetUser) return res.status(404).json({ message: 'User not found' });
      if (targetUser._id.toString() === req.user._id.toString()) {
        return res.status(400).json({ message: 'Cannot share with yourself' });
      }

      const existing = doc.collaborators.find(c => c.user._id.toString() === targetUser._id.toString());
      if (existing) {
        existing.role = role || 'viewer';
      } else {
        doc.collaborators.push({ user: targetUser._id, role: role || 'viewer' });
      }
    }

    // Generate share token if not exists
    if (!doc.shareToken) {
      doc.shareToken = uuidv4();
    }

    await doc.save();
    await doc.populate('collaborators.user', 'name email color');

    res.json({ document: doc, shareToken: doc.shareToken });
  } catch (error) {
    console.error('Share document error:', error);
    res.status(500).json({ message: 'Failed to share document' });
  }
});

// DELETE /api/documents/:id/collaborators/:userId - Remove collaborator
router.delete('/:id/collaborators/:userId', auth, async (req, res) => {
  try {
    const doc = await Document.findById(req.params.id);
    if (!doc) return res.status(404).json({ message: 'Document not found' });
    const ownerId = doc.owner._id ? doc.owner._id : doc.owner;
    if (ownerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only owner can remove collaborators' });
    }

    doc.collaborators = doc.collaborators.filter(
      c => c.user.toString() !== req.params.userId
    );
    await doc.save();
    await doc.populate('collaborators.user', 'name email color');

    res.json({ document: doc });
  } catch (error) {
    res.status(500).json({ message: 'Failed to remove collaborator' });
  }
});

// POST /api/documents/:id/versions - Save version
router.post('/:id/versions', auth, async (req, res) => {
  try {
    const { label } = req.body;
    const doc = await Document.findById(req.params.id);
    if (!doc) return res.status(404).json({ message: 'Document not found' });
    if (!doc.canEdit(req.user._id)) return res.status(403).json({ message: 'Edit access denied' });

    doc.versions.push({
      content: doc.content,
      savedBy: req.user._id,
      label: label || `Version ${doc.versions.length + 1}`,
    });

    // Keep max 20 versions
    if (doc.versions.length > 20) {
      doc.versions = doc.versions.slice(-20);
    }

    await doc.save();
    res.json({ message: 'Version saved', versionCount: doc.versions.length });
  } catch (error) {
    res.status(500).json({ message: 'Failed to save version' });
  }
});

// POST /api/documents/:id/versions/:versionIndex/restore - Restore version
router.post('/:id/versions/:versionIndex/restore', auth, async (req, res) => {
  try {
    const doc = await Document.findById(req.params.id);
    if (!doc) return res.status(404).json({ message: 'Document not found' });
    if (!doc.canEdit(req.user._id)) return res.status(403).json({ message: 'Edit access denied' });

    const versionIndex = parseInt(req.params.versionIndex);
    if (versionIndex < 0 || versionIndex >= doc.versions.length) {
      return res.status(400).json({ message: 'Invalid version index' });
    }

    const version = doc.versions[versionIndex];
    doc.content = version.content;
    doc.lastEditedBy = req.user._id;
    await doc.save();

    res.json({ document: doc, message: 'Version restored' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to restore version' });
  }
});

module.exports = router;
