
class Notification {

  constructor(userId, pathId, pathType, verb, message, isRead) {
    this.userId = userId;
    this.pathId = pathId;
    this.pathType = pathType;
    this.verb = verb;
    this.message = message;
    this.isRead = isRead;
  }
}

module.exports = {
  Notification
};
