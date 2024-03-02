class User {
  constructor(phone_number, priority) {
    this.id = Date.now(); // Use a unique identifier
    this.phone_number = phone_number;
    this.priority = priority || 0;
  }
}

module.exports = User;
