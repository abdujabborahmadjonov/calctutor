"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { History, Moon, Sun } from "lucide-react";

import { getSetting, setSetting } from "@/lib/storage/history";

import { Button, buttonVariants } from "./ui/button";

export function AppHeader() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    void getSetting("theme").then((stored) => {
      const prefersDark = window.matchMedia(
        "(prefers-color-scheme: dark)",
      ).matches;
      const nextDark =
        stored?.value === "dark" || (stored?.value !== "light" && prefersDark);
      document.documentElement.classList.toggle("dark", nextDark);
      setDark(nextDark);
    });
  }, []);

  const toggleTheme = () => {
    const nextDark = !dark;
    document.documentElement.classList.toggle("dark", nextDark);
    setDark(nextDark);
    void setSetting("theme", nextDark ? "dark" : "light");
  };

  return (
    <header className="border-b bg-background/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="font-semibold tracking-tight">
          CalcTutor
        </Link>
        <nav
          className="flex items-center gap-1"
          aria-label="Primary navigation"
        >
          <Link
            href="/history"
            className={buttonVariants({ variant: "ghost", size: "sm" })}
          >
            <History />
            History
          </Link>
          <Link
            href="/about"
            className={buttonVariants({ variant: "ghost", size: "sm" })}
          >
            About
          </Link>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={dark ? "Use light theme" : "Use dark theme"}
            onClick={toggleTheme}
          >
            {dark ? <Sun /> : <Moon />}
          </Button>
        </nav>
      </div>
    </header>
  );
}
