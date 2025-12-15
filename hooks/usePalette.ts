import { PaletteState, PaletteAction } from '../utils/types';
import { ACTION_TYPES } from '../utils/constants';
import { useReducer } from 'react';

export const INITIAL_STATE: PaletteState = {
  open: false,
  search: '',
  selected: 0,
  scoredActionItems: [],
  command: ''
};

export function paletteReducer(state: PaletteState, action: PaletteAction): PaletteState {
  switch (action.type) {
    case ACTION_TYPES.TOGGLE_PALETTE:
      return {
        ...state,
        search: '',
        selected: 0,
        open: !state.open,
        command: ''
      };
    case ACTION_TYPES.DISMISS_PALETTE:
      return {
        ...state,
        search: '',
        selected: 0,
        open: false,
        command: '',
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
        search: '',
        selected: 0,
      };
    default:
      return state;
  }
}

export default function usePalette() {
  const [state, dispatch] = useReducer(paletteReducer, INITIAL_STATE);
  return [state, dispatch] as const;
}