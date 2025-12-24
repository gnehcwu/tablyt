import { ReactNode } from "react";

export interface ActionItem {
  id?: number | string;
  title: string;
  url?: string;
  domain?: string;
  path?: string;
  icon?: ReactNode;
  action?: string;
  actionMode?: string;
}

export type SupportedKey = "ArrowUp" | "ArrowDown" | "Enter" | "Escape" | "Tab" | "Backspace" | "!";

export type HintConfig = {
  text?: string;
  icon: ReactNode;
};