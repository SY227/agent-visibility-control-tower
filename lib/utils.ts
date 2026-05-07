import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function clamp(value: number, min = 0, max = 100) {
  return Math.min(max, Math.max(min, value));
}

export function dedupe<T>(items: T[]) {
  return [...new Set(items)];
}

export function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

export function truncate(value: string, length: number) {
  if (value.length <= length) return value;
  return `${value.slice(0, length - 1).trim()}…`;
}

export function sentence(value: string) {
  const trimmed = normalizeWhitespace(value);
  if (!trimmed) return "";
  return /[.!?]$/.test(trimmed) ? trimmed : `${trimmed}.`;
}

export function safeUrlLabel(input: string) {
  return input.replace(/^https?:\/\//i, "").replace(/\/$/, "");
}

export function scoreTone(score: number): "success" | "sage" | "amber" | "critical" {
  if (score >= 85) return "success";
  if (score >= 70) return "sage";
  if (score >= 50) return "amber";
  return "critical";
}

export function scoreLabel(score: number) {
  if (score >= 90) return "Excellent";
  if (score >= 76) return "Strong";
  if (score >= 61) return "Mixed";
  if (score >= 41) return "Emerging";
  return "Weak";
}

export function tryParseJson<T>(value: string): T | null {
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

export function first<T>(items: T[]) {
  return items[0];
}

export function toTitleCase(value: string) {
  return value
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

export function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}
