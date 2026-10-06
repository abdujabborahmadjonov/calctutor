"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import {
  BookMarked,
  History,
  LineChart,
  Moon,
  Sparkles,
  Sun,
} from "lucide-react";

import { getSetting, setSetting } from "@/lib/storage/history";

import { cn } from "@/lib/utils";

import { Button, buttonVariants } from "./ui/button";

const LINKS = [
  { href: "/", label: "Solve", icon: Sparkles },
  { href: "/graph", label: "Graph", icon: LineChart },
  { href: "/topics", label: "Topics", icon: BookMarked },
  { href: "/history", label: "History", icon: History },
];

export function AppHeader() {
  const [dark, setDark] = useState(false);
  const pathname = usePathname();

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
    <header className="sticky top-0 z-40 border-b bg-background/75 backdrop-blur-xl print:hidden">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6">
        <Link
          href="/"
          className="flex items-center gap-2 font-semibold tracking-tight"
        >
          <span
            aria-hidden
            className="grid size-8 place-items-center rounded-xl bg-brand text-base text-white shadow-md shadow-primary/30"
          >
            ∑
          </span>
          <span className="text-lg">CalcTutor</span>
        </Link>
        <nav
          className="flex items-center gap-0.5"
          aria-label="Primary navigation"
        >
          {LINKS.map(({ href, label, icon: Icon }) => {
            const active =
              href === "/" ? pathname === "/" : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                // The text label is hidden on phones; keep the link named.
                aria-label={label}
                className={cn(
                  buttonVariants({ variant: "ghost", size: "sm" }),
                  "rounded-full",
                  active && "bg-accent text-accent-foreground",
                )}
              >
                <Icon />
                <span className="hidden sm:inline">{label}</span>
              </Link>
            );
          })}
          <Link
            href="/about"
            className={cn(
              buttonVariants({ variant: "ghost", size: "sm" }),
              "hidden rounded-full md:inline-flex",
            )}
          >
            About
          </Link>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="rounded-full"
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
