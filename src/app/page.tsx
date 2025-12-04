"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import {
  addTask,
  removeTask,
  startTask,
  stopCurrentTask,
  Task
} from "../tasks/taskSlice";
import styles from "./page.module.css";
import { TaskForm } from "../components/task-form/TaskForm";
import { TaskList } from "../components/task-list/TaskList";

interface DisplayTask extends Task {
  totalElapsedMs: number;
  isOverdue: boolean;
  progress: number;
}

function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const hours = Math.floor(minutes / 60);
  const restMinutes = minutes % 60;

  const parts = [];
  if (hours > 0) parts.push(`${hours}ч`);
  if (restMinutes > 0 || hours > 0) parts.push(`${restMinutes}м`);
  parts.push(`${seconds.toString().padStart(2, "0")}с`);
  return parts.join(" ");
}

export default function HomePage() {
  const dispatch = useAppDispatch();
  const { items, currentTaskId } = useAppSelector((s) => s.tasks);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [hours, setHours] = useState(0);
  const [minutes, setMinutes] = useState(30);
  const [search, setSearch] = useState("");
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const tasks: DisplayTask[] = useMemo(() => {
    return items.map((t) => {
      const extra = t.startedAt ? now - t.startedAt : 0;
      const totalElapsedMs = t.elapsedMs + extra;
      const estimatedMs = t.estimatedMinutes * 60 * 1000;
      const progress = estimatedMs
        ? Math.min((totalElapsedMs / estimatedMs) * 100, 100)
        : 0;

      return {
        ...t,
        totalElapsedMs,
        isOverdue: estimatedMs > 0 && totalElapsedMs > estimatedMs,
        progress
      };
    });
  }, [items, now]);

  const filtered = useMemo(
    () =>
      tasks.filter((t) => {
        if (!search.trim()) return true;
        const q = search.toLowerCase();
        return (
          t.name.toLowerCase().includes(q) ||
          t.description.toLowerCase().includes(q)
        );
      }),
    [tasks, search]
  );

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    if (hours < 0 || minutes < 0) return;

    dispatch(
      addTask({
        name: name.trim(),
        description: description.trim(),
        hours,
        minutes
      })
    );

    setName("");
    setDescription("");
    setHours(0);
    setMinutes(30);
  };

  return (
    <main className={styles.page}>
      <div className={styles.pageInner}>
        <header className={styles.header}>
          <h1 className={styles.title}>
            Трекер задач
          </h1>
        </header>
        <TaskForm
          name={name}
          description={description}
          hours={hours}
          minutes={minutes}
          onNameChange={setName}
          onDescriptionChange={setDescription}
          onHoursChange={setHours}
          onMinutesChange={setMinutes}
          onSubmit={handleSubmit}
        />

        <TaskList
          tasks={filtered}
          currentTaskId={currentTaskId}
          search={search}
          onSearchChange={setSearch}
          onStart={(id) => dispatch(startTask(id))}
          onStop={() => dispatch(stopCurrentTask())}
          onRemove={(id) => dispatch(removeTask(id))}
          formatDuration={formatDuration}
        />
      </div>
    </main>
  );
}

