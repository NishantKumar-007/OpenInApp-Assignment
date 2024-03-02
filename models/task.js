class Task {
  constructor(title, description, due_date) {
    this.id = Date.now(); // Use a unique identifier
    this.title = title;
    this.description = description;
    this.due_date = due_date;
    this.priority = 0;
    this.status = "TODO";
    this.created_at = new Date();
    this.updated_at = null;
    this.deleted_at = null;
  }
}

module.exports = Task;
