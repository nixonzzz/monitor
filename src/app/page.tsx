"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./page.module.css";

type Tab = "login" | "register";
type Step = "form" | "code";

export default function HomePage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("login");
  const [step, setStep] = useState<Step>("form");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (tab === "login") {
      router.push("/dashboard");
      return;
    }
    if (tab === "register") setStep("code");
  };

  const handleBack = () => {
    setStep("form");
    setCode("");
  };

  return (
    <div className={styles.rootWrap}>
    <main className={styles.root}>
      <div className={styles.card}>
        <h1 className={styles.logo}>Monitor</h1>

        <div className={styles.tabs}>
          <button
            type="button"
            className={`${styles.tab} ${tab === "login" ? styles.tabActive : ""}`}
            onClick={() => { setTab("login"); setStep("form"); }}
          >
            Вход
          </button>
          <button
            type="button"
            className={`${styles.tab} ${tab === "register" ? styles.tabActive : ""}`}
            onClick={() => { setTab("register"); setStep("form"); }}
          >
            Регистрация
          </button>
        </div>

        {step === "form" ? (
          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.field}>
              <span className={styles.fieldLabel}>Email</span>
              <input
                type="email"
                className={styles.input}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
            </div>
            <div className={styles.field}>
              <span className={styles.fieldLabel}>Имя пользователя</span>
              <input
                type="text"
                className={styles.input}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
              />
            </div>
            <div className={styles.field}>
              <span className={styles.fieldLabel}>Пароль</span>
              <input
                type="password"
                className={styles.input}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={tab === "login" ? "current-password" : "new-password"}
              />
            </div>
            <button type="submit" className={styles.btnPrimary}>
              Войти
            </button>
          </form>
        ) : (
          <div className={styles.codeBlock}>
            <div className={styles.field}>
              <span className={styles.fieldLabel}>Код</span>
              <input
                type="text"
                className={styles.input}
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder=""
                maxLength={6}
              />
            </div>
            <button type="button" className={styles.btnPrimary}>
              Подтвердить
            </button>
            <button type="button" className={styles.btnSecondary}>
              Отправить код повторно
            </button>
            <button type="button" className={styles.btnBack} onClick={handleBack}>
              Назад
            </button>
          </div>
        )}
      </div>
    </main>
    </div>
  );
}
