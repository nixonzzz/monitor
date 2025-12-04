import type { FormEvent } from "react";
import styles from "./TaskForm.module.css";

interface TaskFormProps {
  name: string;
  description: string;
  hours: number;
  minutes: number;
  onNameChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onHoursChange: (value: number) => void;
  onMinutesChange: (value: number) => void;
  onSubmit: (event: FormEvent) => void;
}

export function TaskForm({
  name,
  description,
  hours,
  minutes,
  onNameChange,
  onDescriptionChange,
  onHoursChange,
  onMinutesChange,
  onSubmit
}: TaskFormProps) {
  return (
    <section className={styles.card}>
      <h2 className={styles.title}>Новая задача</h2>
      <form onSubmit={onSubmit} className={styles.form}>
        <div className={styles.fieldRow}>
          <div className={styles.field}>
            <label className={styles.label}>Имя задачи *</label>
            <input
              className={styles.control}
              value={name}
              onChange={(e) => onNameChange(e.target.value)}
              placeholder="Например, Отчет по проекту"
              required
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Плановое время</label>
            <div className={styles.timeGroup}>
              <div className={styles.timeColumn}>
                <input
                  type="number"
                  min={0}
                  className={styles.timeInput}
                  value={hours}
                  onChange={(e) => onHoursChange(Number(e.target.value) || 0)}
                />
                <span className={styles.timeHint}>часы</span>
              </div>
              <span className="text-slate-500">:</span>
              <div className={styles.timeColumn}>
                <input
                  type="number"
                  min={0}
                  max={59}
                  className={styles.timeInput}
                  value={minutes}
                  onChange={(e) => {
                    const raw = Number(e.target.value) || 0;
                    const clamped = Math.min(Math.max(raw, 0), 59);
                    onMinutesChange(clamped);
                  }}
                />
                <span className="text-xs text-slate-400">минуты</span>
              </div>
            </div>
          </div>
        </div>

        <div className={styles.field}>
          <label className={styles.label}>Описание</label>
          <textarea
            className={styles.textarea}
            value={description}
            onChange={(e) => onDescriptionChange(e.target.value)}
            placeholder="Кратко опишите задачу"
          />
        </div>

        <div className={styles.actions}>
          <button type="submit" className={styles.submitButton}>
            Добавить задачу
          </button>
        </div>
      </form>
    </section>
  );
}


