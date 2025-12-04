// Фоновая служба для отслеживания вкладок и хранения данных

class FilterStorage {
  constructor() {
    this.storage = chrome.storage.local;
    this.init();
  }

  async init() {
    // Инициализация хранилища при первом запуске
    const data = await this.storage.get('modrinthFilters');
    if (!data.modrinthFilters) {
      await this.storage.set({ modrinthFilters: {} });
    }
  }

  async saveFilters(tabId, url, filters) {
    const data = await this.storage.get('modrinthFilters');
    if (!data.modrinthFilters) data.modrinthFilters = {};
    
    // Сохраняем фильтры с временной меткой
    data.modrinthFilters[tabId] = {
      url,
      filters,
      timestamp: Date.now(),
      isModPage: false
    };
    
    await this.storage.set(data);
    return true;
  }

  async saveModPage(tabId, modUrl, filters) {
    const data = await this.storage.get('modrinthFilters');
    if (!data.modrinthFilters) data.modrinthFilters = {};
    
    data.modrinthFilters[tabId] = {
      url: modUrl,
      filters: filters || data.modrinthFilters[tabId]?.filters,
      timestamp: Date.now(),
      isModPage: true
    };
    
    await this.storage.set(data);
    return true;
  }

  async getFilters(tabId) {
    const data = await this.storage.get('modrinthFilters');
    return data.modrinthFilters?.[tabId] || null;
  }

  async deleteFilters(tabId) {
    const data = await this.storage.get('modrinthFilters');
    if (data.modrinthFilters && data.modrinthFilters[tabId]) {
      delete data.modrinthFilters[tabId];
      await this.storage.set(data);
    }
  }

  async cleanupOldEntries(maxAge = 7 * 24 * 60 * 60 * 1000) {
    const data = await this.storage.get('modrinthFilters');
    if (!data.modrinthFilters) return;
    
    const now = Date.now();
    Object.keys(data.modrinthFilters).forEach(tabId => {
      const entry = data.modrinthFilters[tabId];
      if (now - entry.timestamp > maxAge) {
        delete data.modrinthFilters[tabId];
      }
    });
    
    await this.storage.set(data);
  }
}

// Инициализация хранилища
const filterStorage = new FilterStorage();

// Очистка старых записей при запуске
filterStorage.cleanupOldEntries();

// Парсинг URL для извлечения фильтров
function parseFiltersFromUrl(url) {
  try {
    const urlObj = new URL(url);
    const params = urlObj.searchParams;
    const filters = {
      versions: [],
      loaders: [],
      categories: [],
      environment: [],
      openSource: false
    };

    // Парсим версии
    params.getAll('v').forEach(v => filters.versions.push(v));
    
    // Парсим лоадеры (g=categories:fabric и т.д.)
    params.getAll('g').forEach(g => {
      if (g.startsWith('categories:')) {
        const loader = g.replace('categories:', '');
        if (!filters.loaders.includes(loader)) {
          filters.loaders.push(loader);
        }
      }
    });
    
    // Парсим исключенные категории
    params.getAll('f').forEach(f => {
      if (f.startsWith('categories:')) {
        const category = f.replace('categories:', '');
        if (!filters.categories.includes(category)) {
          filters.categories.push(category);
        }
      }
    });
    
    // Парсим окружение (клиент/сервер)
    params.getAll('e').forEach(e => {
      if (e === 'client' || e === 'server') {
        if (!filters.environment.includes(e)) {
          filters.environment.push(e);
        }
      }
    });
    
    // Парсим опенсорс
    const openSourceParam = params.get('l');
    if (openSourceParam === 'open_source:true') {
      filters.openSource = true;
    }

    return filters;
  } catch (error) {
    console.error('Error parsing URL:', error);
    return null;
  }
}

// Обработка событий вкладок
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    const url = tab.url;
    
    if (url.includes('modrinth.com/mods') && url.includes('?')) {
      // Это страница с фильтрами
      const filters = parseFiltersFromUrl(url);
      if (filters) {
        filterStorage.saveFilters(tabId, url, filters);
      }
    } else if (url.includes('modrinth.com/mod/')) {
      // Это страница мода
      filterStorage.saveModPage(tabId, url);
    }
  }
});

// Обработка закрытия вкладок
chrome.tabs.onRemoved.addListener((tabId) => {
  // Удаляем данные через 5 минут после закрытия вкладки
  setTimeout(() => {
    filterStorage.deleteFilters(tabId);
  }, 5 * 60 * 1000);
});

// Обработка сообщений от popup и content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getFilters') {
    filterStorage.getFilters(request.tabId).then(filters => {
      sendResponse({ filters });
    });
    return true; // Указываем, что ответ будет асинхронным
  }
  
  if (request.action === 'navigateToFilters') {
    chrome.tabs.update(request.tabId, { url: request.url });
    sendResponse({ success: true });
  }
  
  if (request.action === 'clearFilters') {
    filterStorage.deleteFilters(request.tabId);
    sendResponse({ success: true });
  }
});
