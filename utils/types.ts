import { ReactNode } from "react";

export interface ActionItem {
    id?: number | string;
    title: string;
    url?: string;
    domain?: string;
    path?: string;
    action? : string;
    icon? : ReactNode
  }
  
  export type SupportedKey = 'ArrowUp' | 'ArrowDown' | 'Enter' | 'Escape' | 'Tab' | 'Backspace';
  
  export type HintConfig = {
    text?: string;
    icon: ReactNode
  };
  
  export type PaletteState = {
    open: boolean;
    search: string;
    selected: number;
    scoredActionItems: ActionItem[];
    command: string;
  };
  
  export type PaletteAction =
    | { type: 'TOGGLE_PALETTE' }
    | { type: 'DISMISS_PALETTE' }
    | { type: 'SET_FILTER'; payload: string }
    | { type: 'SET_SELECTED'; payload: number }
    | { type: 'SET_SCORED_ITEMS'; payload: ActionItem[] }
    | { type: 'SET_COMMAND'; payload: string };