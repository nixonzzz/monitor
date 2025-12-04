import styles from "./TaskList.module.css";

interface TaskView {
  id: string;
  name: string;
  description: string;
  estimatedMinutes: number;
  totalElapsedMs: number;
  isOverdue: boolean;
  progress: number;
  startedAt: number | null;
}

interface TaskListProps {
  tasks: TaskView[];
  currentTaskId: string | null;
  search: string;
  onSearchChange: (value: string) => void;
  onStart: (id: string) => void;
  onStop: () => void;
  onRemove: (id: string) => void;
  formatDuration: (ms: number) => string;
}

export function TaskList({
  tasks,
  currentTaskId,
  search,
  onSearchChange,
  onStart,
  onStop,
  onRemove,
  formatDuration
}: TaskListProps) {
  return (
    <section className={styles.section}>
      <div className={styles.header}>
        <h2 className={styles.title}>Список задач</h2>
        <input
          className={styles.search}
          placeholder="Поиск по имени или описанию..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>

      {tasks.length === 0 ? (
        <div className={styles.empty}>
          {search
            ? "Задачи не найдены. Попробуйте изменить запрос."
            : "Задач пока нет. Добавьте первую задачу выше."}
        </div>
      ) : (
        <ul className="space-y-3">
          {tasks.map((task) => {
            const isCurrent = currentTaskId === task.id && !!task.startedAt;
            const estimatedMs = task.estimatedMinutes * 60 * 1000;

            return (
              <li key={task.id} className={styles.item}>
                <div className={styles.row}>
                  <div className="space-y-2">
                    <div className={styles.titleRow}>
                      <h3 className={styles.name}>{task.name}</h3>
                      {isCurrent && (
                        <span className={styles.badgeCurrent}>В работе</span>
                      )}
                      {task.isOverdue && (
                        <span className={styles.badgeOverdue}>Просрочена</span>
                      )}
                    </div>
                    {task.description && (
                      <p className={styles.description}>
                        {task.description}
                      </p>
                    )}

                    <div className="space-y-1">
                      <div className={styles.meta}>
                        <span>
                          План:{" "}
                          <span className="font-semibold">
                            {task.estimatedMinutes} мин
                          </span>
                        </span>
                        <span>
                          Потрачено:{" "}
                          <span className="font-semibold">
                            {formatDuration(task.totalElapsedMs)}
                          </span>
                        </span>
                        {estimatedMs > 0 && (
                          <span>
                            Осталось:{" "}
                            <span className="font-semibold">
                              {task.isOverdue
                                ? "время вышло"
                                : formatDuration(
                                    Math.max(
                                      estimatedMs - task.totalElapsedMs,
                                      0
                                    )
                                  )}
                            </span>
                          </span>
                        )}
                      </div>
                      {estimatedMs > 0 && (
                        <div className={styles.progressTrack}>
                          <div
                            className={
                              task.isOverdue
                                ? styles.progressBarOverdue
                                : styles.progressBar
                            }
                            style={{ width: `${task.progress}%` }}
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  <div className={styles.actions}>
                    {isCurrent ? (
                      <button onClick={onStop} className={styles.buttonStop}>
                        Остановить
                      </button>
                    ) : (
                      <button
                        onClick={() => onStart(task.id)}
                        className={styles.buttonStart}
                      >
                        Старт
                      </button>
                    )}
                    <button
                      onClick={() => onRemove(task.id)}
                      className={styles.buttonDelete}
                    >
                      Удалить
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}


