export const THEMES = {
  SYSTEM: "system",
  LIGHT: "light",
  DARK: "dark",
  LIGHT_CONTRAST: "light-contrast",
  DARK_CONTRAST: "dark-contrast",
  WARM_LIGHT: "warm-light",
} as const;

export type Theme = (typeof THEMES)[keyof typeof THEMES];
export type ResolvedTheme = Exclude<Theme, typeof THEMES.SYSTEM>;

export const THEME_OPTIONS: { value: Theme; label: string; description: string }[] = [
  { value: THEMES.SYSTEM, label: "Follow system", description: "Match your OS appearance setting." },
  { value: THEMES.LIGHT, label: "Light", description: "Always use the light theme." },
  { value: THEMES.DARK, label: "Dark", description: "Always use the dark theme." },
  { value: THEMES.LIGHT_CONTRAST, label: "Light contrast", description: "High-contrast light theme." },
  { value: THEMES.DARK_CONTRAST, label: "Dark contrast", description: "High-contrast dark theme." },
  { value: THEMES.WARM_LIGHT, label: "Warm light", description: "Cream surface with warm amber undertones." },
];

export const THEME_STORAGE_KEY = "tablyt:theme";
export const DEFAULT_THEME: Theme = THEMES.SYSTEM;

const THEME_CLASSES: ResolvedTheme[] = [
  THEMES.LIGHT,
  THEMES.DARK,
  THEMES.LIGHT_CONTRAST,
  THEMES.DARK_CONTRAST,
  THEMES.WARM_LIGHT,
];

export async function getTheme(): Promise<Theme> {
  const stored = await chrome.storage.local.get(THEME_STORAGE_KEY);
  const value = stored[THEME_STORAGE_KEY] as Theme | undefined;
  return value && (Object.values(THEMES) as string[]).includes(value) ? value : DEFAULT_THEME;
}

export async function setTheme(theme: Theme): Promise<void> {
  await chrome.storage.local.set({ [THEME_STORAGE_KEY]: theme });
}

function systemPrefersDark(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

export function resolveTheme(theme: Theme): ResolvedTheme {
  if (theme === THEMES.SYSTEM) {
    return systemPrefersDark() ? THEMES.DARK : THEMES.LIGHT;
  }
  return theme;
}

export function applyTheme(el: HTMLElement, resolved: ResolvedTheme): void {
  for (const cls of THEME_CLASSES) el.classList.remove(cls);
  el.classList.add(resolved);
  el.style.colorScheme = resolved === THEMES.DARK || resolved === THEMES.DARK_CONTRAST ? "dark" : "light";
}

export function subscribeTheme(callback: (resolved: ResolvedTheme) => void): () => void {
  let current: Theme = DEFAULT_THEME;

  const emit = () => callback(resolveTheme(current));

  getTheme().then((t) => {
    current = t;
    emit();
  });

  const storageListener = (
    changes: { [key: string]: chrome.storage.StorageChange },
    area: chrome.storage.AreaName
  ) => {
    if (area !== "local" || !(THEME_STORAGE_KEY in changes)) return;
    current = (changes[THEME_STORAGE_KEY].newValue as Theme) || DEFAULT_THEME;
    emit();
  };
  chrome.storage.onChanged.addListener(storageListener);

  const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
  const mediaListener = () => {
    if (current === THEMES.SYSTEM) emit();
  };
  mediaQuery.addEventListener("change", mediaListener);

  return () => {
    chrome.storage.onChanged.removeListener(storageListener);
    mediaQuery.removeEventListener("change", mediaListener);
  };
}
