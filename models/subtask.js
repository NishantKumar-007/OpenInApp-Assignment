class SubTask {
  constructor(task_id) {
    this.id = Date.now(); // Use a unique identifier
    this.task_id = task_id;
    this.status = 0;
    this.created_at = new Date();
    this.updated_at = null;
    this.deleted_at = null;
  }
}

module.exports = SubTask;
