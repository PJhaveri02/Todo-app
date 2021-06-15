import mongoose from 'mongoose';

const Schema = mongoose.Schema;

const todoSchema = new Schema(
  {
    title: { type: String, required: true },
    userID: String,
    description: String,
    isComplete: Boolean,
    dueDate: { type: Date, required: true },
  },
  {
    timestamps: {},
  }
);

const Todo = mongoose.model('Todo', todoSchema);

export { Todo };
