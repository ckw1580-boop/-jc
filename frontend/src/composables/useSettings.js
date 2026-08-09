import { reactive, watch } from 'vue'

const STORAGE_KEY = 's7-console-settings'
const defaultSettings = Object.freeze({
  theme: 'light',
  density: 'comfortable',
  refreshInterval: 1000,
})

function loadSettings() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')
    return {
      theme: ['light', 'dark'].includes(stored.theme) ? stored.theme : defaultSettings.theme,
      density: ['comfortable', 'compact'].includes(stored.density)
        ? stored.density
        : defaultSettings.density,
      refreshInterval: [500, 1000, 2000].includes(Number(stored.refreshInterval))
        ? Number(stored.refreshInterval)
        : defaultSettings.refreshInterval,
    }
  } catch {
    return { ...defaultSettings }
  }
}

const settings = reactive(loadSettings())

function applySettings() {
  document.documentElement.dataset.theme = settings.theme
  document.documentElement.dataset.density = settings.density
  document.documentElement.style.colorScheme = settings.theme
  const themeColor = document.querySelector('meta[name="theme-color"]')
  themeColor?.setAttribute('content', settings.theme === 'dark' ? '#11191b' : '#e9edef')
}

watch(
  settings,
  () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
    applySettings()
  },
  { deep: true, immediate: true },
)

export function useSettings() {
  function resetSettings() {
    Object.assign(settings, defaultSettings)
  }

  function toggleTheme() {
    settings.theme = settings.theme === 'light' ? 'dark' : 'light'
  }

  return { settings, resetSettings, toggleTheme }
}
