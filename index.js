const express = require("express");
const cron = require("node-cron");
const jwt = require("jsonwebtoken");
const twilio = require("twilio");
const { createTodos, updateTodos, deleteTodos } = require("./types");
const app = express();
const PORT = 3000;
// const accountSid = "your_twilio_account_sid";
// const authToken = "your_twilio_auth_token";
// const twilioClient = new twilio(accountSid, authToken);

app.use(express.json());
// Import models
const Task = require("./models/task");
const SubTask = require("./models/subtask");
const User = require("./models/user");

const authenticateToken = require("./authenticationToken");

// In-memory storage
const tasks = [];
const subTasks = [];
const users = [];

//dummy user
const dummyUser = {
  id: 1,
  username: "testuser",
  password: "testpassword",
};

app.post("/login", (req, res) => {
  const { username, password } = req.body;

  // Dummy authentication logic
  if (username === dummyUser.username && password === dummyUser.password) {
    // Generate a JWT token
    const token = jwt.sign({ user_id: dummyUser.id }, "your-secret-key", {
      expiresIn: "1h",
    });

    return res.json({ token });
  } else {
    return res.status(401).json({ error: "Invalid credentials" });
  }
});

app.use(authenticateToken);

app.get("/", async (req, res) => {
  res.json("Hello");
});

app.post("/tasks", authenticateToken, async (req, res) => {
  const originalData = req.body;
  //input validation
  const parsedData = createTodos.safeParse(originalData);
  if (!parsedData.success) {
    res.status(411).json({
      msg: "Wrong inputs sent",
    });
  }
  const { title, description, due_date } = originalData;

  // Create task in in-memory storage
  const newTask = new Task(title, description, due_date);
  tasks.push(newTask);

  res.status(201).json(newTask);
});

app.post("/subtasks", authenticateToken, async (req, res) => {
  const originalData = req.body;

  const { task_id } = originalData;
  const existingTask = tasks.find((task) => task.id === task_id);
  // Create subtask in in-memory storage
  const newSubTask = new SubTask(task_id);
  subTasks.push(newSubTask);

  // Update the corresponding task's status if needed
  if (existingTask.status !== "IN_PROGRESS") {
    existingTask.status = "IN_PROGRESS";
  }

  // Return the created subtask
  res.status(201).json(newSubTask);
});

app.get("/tasks", authenticateToken, async (req, res) => {
  // Extract filters from query parameters
  const { priority, due_date } = req.query;

  // Filter tasks based on priority and due_date
  let filteredTasks = tasks;

  if (priority !== undefined) {
    filteredTasks = filteredTasks.filter(
      (task) => task.priority === parseInt(priority, 10)
    );
  }

  if (due_date !== undefined) {
    filteredTasks = filteredTasks.filter((task) => task.due_date === due_date);
  }

  // Return the tasks
  res.status(200).json(filteredTasks);
});

app.get("/subtasks", authenticateToken, async (req, res) => {
  // Extract filters from query parameters
  const { task_id, status } = req.query;

  // Filter subtasks based on task_id and status
  let filteredSubTasks = subTasks;

  if (task_id !== undefined) {
    filteredSubTasks = filteredSubTasks.filter(
      (subTask) => subTask.task_id == task_id
    );
  }

  if (status !== undefined) {
    // Assuming status is a number (0 or 1)
    filteredSubTasks = filteredSubTasks.filter(
      (subTask) => subTask.status === parseInt(status, 10)
    );
  }

  // Return the subtasks
  res.status(200).json(filteredSubTasks);
});

app.put("/tasks/:taskId", authenticateToken, async (req, res) => {
  const taskId = parseInt(req.params.taskId, 10);
  const { due_date, status } = req.body;

  // Find the task to update
  const taskToUpdate = tasks.find((task) => task.id === taskId);

  if (!taskToUpdate) {
    return res.status(404).json({ error: "Task not found" });
  }

  // Validate and update input
  if (due_date !== undefined) {
    taskToUpdate.due_date = due_date;
  }

  if (
    status !== undefined &&
    ["TODO", "IN_PROGRESS", "DONE"].includes(status)
  ) {
    taskToUpdate.status = status;
  }

  // // Update the task in in-memory storage
  // taskToUpdate.updated_at = new Date();

  // Return the updated task
  res.status(200).json(taskToUpdate);
});

app.put("/subtasks/:subTaskId", authenticateToken, async (req, res) => {
  const subTaskId = parseInt(req.params.subTaskId, 10);
  const { status } = req.body;

  // Find the subtask to update
  const subTaskToUpdate = subTasks.find((subTask) => subTask.id === subTaskId);

  if (!subTaskToUpdate) {
    return res.status(404).json({ error: "Subtask not found" });
  }

  // Validate and update input
  if (status !== undefined && [0, 1].includes(status)) {
    subTaskToUpdate.status = status;
  }

  // Update the subtask in in-memory storage
  subTaskToUpdate.updated_at = new Date();

  // Return the updated subtask
  res.status(200).json(subTaskToUpdate);
});

app.delete("/tasks/:taskId", authenticateToken, (req, res) => {
  const taskId = parseInt(req.params.taskId, 10);

  // Find the task to delete
  const taskToDelete = tasks.find((task) => task.id === taskId);

  if (!taskToDelete) {
    return res.status(404).json({ error: "Task not found" });
  }

  // Soft delete the task in in-memory storage
  taskToDelete.deleted_at = new Date();

  // Update corresponding subtasks if needed
  const correspondingSubTasks = subTasks.filter(
    (subTask) => subTask.task_id === taskId
  );
  correspondingSubTasks.forEach((subTask) => {
    subTask.deleted_at = new Date();
  });

  // Return success message
  res.status(200).json({ message: "Task deleted successfully" });
});

app.delete("/subtasks/:subTaskId", authenticateToken, (req, res) => {
  const subTaskId = parseInt(req.params.subTaskId, 10);

  // Find the subtask to delete
  const subTaskToDelete = subTasks.find((subTask) => subTask.id === subTaskId);

  if (!subTaskToDelete) {
    return res.status(404).json({ error: "Subtask not found" });
  }

  // Soft delete the subtask in in-memory storage
  subTaskToDelete.deleted_at = new Date();

  // Return success message
  res.status(200).json({ message: "Subtask deleted successfully" });
});

cron.schedule("* * * * *", () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  tasks.forEach((task) => {
    const dueDate = new Date(task.due_date);
    dueDate.setHours(0, 0, 0, 0);

    const timeDiff = dueDate.getTime() - today.getTime();
    const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));

    if (daysDiff === 0) {
      task.priority = 0;
    } else if (daysDiff > 0 && daysDiff <= 2) {
      task.priority = 1;
    } else if (daysDiff > 2 && daysDiff <= 4) {
      task.priority = 2;
    } else if (daysDiff > 4) {
      task.priority = 3;
    }
  });
  console.log("cron job ran");
});

/* ------------------------------------------------- logic for calling using twillio -----------------*/
// cron.schedule("0 9 * * *", () => {
//   // Sort tasks based on priority and due_date
//   const sortedTasks = tasks.sort((a, b) => {
//     if (a.priority === b.priority) {
//       return new Date(a.due_date) - new Date(b.due_date);
//     }
//     return a.priority - b.priority;
//   });

//   // Iterate through sorted tasks
//   for (const task of sortedTasks) {
//     // Find the user associated with the task
//     const user = users.find((u) => u.priority === task.priority);

//     // Check if the task is overdue
//     const today = new Date();
//     today.setHours(0, 0, 0, 0);
//     const dueDate = new Date(task.due_date);
//     dueDate.setHours(0, 0, 0, 0);

//     if (dueDate < today) {
//       // Make a voice call using Twilio
//       console.log("call initiated");
//       // Exit the loop after making the call
//       break;
//     }
//   }
// });
/* ------------------------------------------------------------------- */
app.listen(PORT, () => {
  console.log("server started on port " + PORT);
});
