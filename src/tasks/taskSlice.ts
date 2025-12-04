import { createSlice, nanoid, PayloadAction } from "@reduxjs/toolkit";

export interface Task {
  id: string;
  name: string;
  description: string;
  estimatedMinutes: number;
  elapsedMs: number;
  startedAt: number | null;
}

interface TasksState {
  items: Task[];
  currentTaskId: string | null;
}

const initialState: TasksState = {
  items: [],
  currentTaskId: null
};

interface AddTaskPayload {
  name: string;
  description: string;
  hours: number;
  minutes: number;
}

const tasksSlice = createSlice({
  name: "tasks",
  initialState,
  reducers: {
    addTask: (state, action: PayloadAction<AddTaskPayload>) => {
      const { name, description, hours, minutes } = action.payload;
      const estimatedMinutes = hours * 60 + minutes;

      state.items.push({
        id: nanoid(),
        name,
        description,
        estimatedMinutes,
        elapsedMs: 0,
        startedAt: null
      });
    },
    removeTask: (state, action: PayloadAction<string>) => {
      const id = action.payload;
      state.items = state.items.filter((t) => t.id !== id);
      if (state.currentTaskId === id) {
        state.currentTaskId = null;
      }
    },
    startTask: (state, action: PayloadAction<string>) => {
      const id = action.payload;
      const now = Date.now();

      if (state.currentTaskId) {
        const current = state.items.find((t) => t.id === state.currentTaskId);
        if (current && current.startedAt) {
          current.elapsedMs += now - current.startedAt;
          current.startedAt = null;
        }
      }

      const next = state.items.find((t) => t.id === id);
      if (next) {
        next.startedAt = now;
        state.currentTaskId = id;
      }
    },
    stopCurrentTask: (state) => {
      if (!state.currentTaskId) return;
      const now = Date.now();
      const current = state.items.find((t) => t.id === state.currentTaskId);
      if (current && current.startedAt) {
        current.elapsedMs += now - current.startedAt;
        current.startedAt = null;
      }
      state.currentTaskId = null;
    }
  }
});

export const { addTask, removeTask, startTask, stopCurrentTask } =
  tasksSlice.actions;

export default tasksSlice.reducer;


