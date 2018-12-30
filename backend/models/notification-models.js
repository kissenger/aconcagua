const mongoose = require('mongoose');

const notificationSchema = mongoose.Schema({
  userId: {type: String, required: true},
  pathId: {type: String, required: true},
  pathType: {type: String, required: true},
  verb: {type: String, required: true},
  message: {type: String, required: true},
  isRead: {type: Boolean, default: false}
})

const Notification = mongoose.model('notification', notificationSchema);

module.exports = {
  Notification: Notification
};
