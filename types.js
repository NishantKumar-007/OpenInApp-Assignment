const zod = require("zod");

const createTodos = zod.object({
  title: zod.string(),
  description: zod.string(),
  due_date: zod.string(),
});

const updateTodos = zod.object({
  id: zod.string(),
});

const deleteTodos = zod.object({
  id: zod.string(),
});

module.exports = {
  createTodos: createTodos,
  updateTodos: updateTodos,
  deleteTodos: deleteTodos,
};
