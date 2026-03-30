const mongoose = require('mongoose');

const versionSchema = new mongoose.Schema({
  content: { type: String, default: '' },
  savedAt: { type: Date, default: Date.now },
  savedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  label: { type: String, default: '' },
});

const collaboratorSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  role: { type: String, enum: ['viewer', 'editor'], default: 'viewer' },
  addedAt: { type: Date, default: Date.now },
});

const documentSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true,
    maxlength: 200,
    default: 'Untitled Document',
  },
  content: {
    type: String,
    default: '',
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  collaborators: [collaboratorSchema],
  versions: {
    type: [versionSchema],
    default: [],
  },
  isPublic: {
    type: Boolean,
    default: false,
  },
  shareToken: {
    type: String,
    default: null,
  },
  lastEditedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  wordCount: {
    type: Number,
    default: 0,
  },
}, { timestamps: true });

// Index for faster queries
documentSchema.index({ owner: 1, updatedAt: -1 });
documentSchema.index({ 'collaborators.user': 1 });
documentSchema.index({ shareToken: 1 });

documentSchema.methods.canAccess = function (userId) {
  if (this.isPublic) return true;
  if (!userId) return false;
  
  // Handle both populated and unpopulated owner
  const ownerId = this.owner._id ? this.owner._id : this.owner;
  if (ownerId.toString() === userId.toString()) return true;
  
  return this.collaborators.some(c => {
    const collId = c.user._id ? c.user._id : c.user;
    return collId.toString() === userId.toString();
  });
};

documentSchema.methods.canEdit = function (userId) {
  if (!userId) return false;
  
  // Handle both populated and unpopulated owner
  const ownerId = this.owner._id ? this.owner._id : this.owner;
  if (ownerId.toString() === userId.toString()) return true;
  
  const collab = this.collaborators.find(c => {
    const collId = c.user._id ? c.user._id : c.user;
    return collId.toString() === userId.toString();
  });
  return collab && collab.role === 'editor';
};

module.exports = mongoose.model('Document', documentSchema);
