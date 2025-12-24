import { ACTION_TYPES } from "../utils/constants";
import { useReducer } from "react";

export type PaletteState = {
  open: boolean;
  search: string;
  selected: number;
  scoredActionItems: ActionItem[];
  command: string;
  loading: boolean;
};

export type PaletteAction =
  | { type: typeof ACTION_TYPES.TOGGLE_PALETTE }
  | { type: typeof ACTION_TYPES.DISMISS_PALETTE }
  | { type: typeof ACTION_TYPES.SET_FILTER; payload: string }
  | { type: typeof ACTION_TYPES.SET_SELECTED; payload: number }
  | { type: typeof ACTION_TYPES.SET_SCORED_ITEMS; payload: ActionItem[] }
  | { type: typeof ACTION_TYPES.SET_COMMAND; payload: string }
  | { type: typeof ACTION_TYPES.SET_LOADING, payload: boolean };

export const INITIAL_STATE: PaletteState = {
  open: false,
  search: "",
  selected: 0,
  scoredActionItems: [],
  command: "",
  loading: false
};

export function paletteReducer(state: PaletteState, action: PaletteAction): PaletteState {
  switch (action.type) {
    case ACTION_TYPES.TOGGLE_PALETTE:
      return {
        ...state,
        search: "",
        selected: 0,
        open: !state.open,
        command: "",
      };
    case ACTION_TYPES.DISMISS_PALETTE:
      return {
        ...state,
        search: "",
        selected: 0,
        open: false,
        command: "",
      };
    case ACTION_TYPES.SET_FILTER:
      return {
        ...state,
        search: action.payload,
        selected: 0,
      };
    case ACTION_TYPES.SET_SELECTED:
      return {
        ...state,
        selected: action.payload,
      };
    case ACTION_TYPES.SET_SCORED_ITEMS:
      return {
        ...state,
        scoredActionItems: action.payload,
      };
    case ACTION_TYPES.SET_COMMAND:
      return {
        ...state,
        command: action.payload,
        search: "",
        selected: 0,
        loading: action.payload === ACTION_MODE.HISTORY,
      };
    case ACTION_TYPES.SET_LOADING:
      return {
        ...state,
        loading: action.payload,
      };
    default:
      return state;
  }
}

export default function usePalette() {
  const [state, dispatch] = useReducer(paletteReducer, INITIAL_STATE);
  return [state, dispatch] as const;
}
