document.addEventListener('DOMContentLoaded', async () => {
  const elements = {
    statusMessage: document.getElementById('statusMessage'),
    filtersInfo: document.getElementById('filtersInfo'),
    loading: document.getElementById('loading'),
    actions: document.getElementById('actions'),
    versions: document.getElementById('versions'),
    loaders: document.getElementById('loaders'),
    categories: document.getElementById('categories'),
    environment: document.getElementById('environment'),
    openSourceSection: document.getElementById('openSourceSection'),
    openSource: document.getElementById('openSource'),
    returnBtn: document.getElementById('returnBtn'),
    clearBtn: document.getElementById('clearBtn')
  };

  // Получаем текущую вкладку
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  
  if (!tab || !tab.url.includes('modrinth.com')) {
    setStatus('Modrinth не найден', 'Не на странице Modrinth');
    hideLoading();
    return;
  }

  // Получаем сохраненные фильтры для вкладки
  const response = await chrome.runtime.sendMessage({
    action: 'getFilters',
    tabId: tab.id
  });

  hideLoading();

  if (!response.filters) {
    setStatus('Фильтры не найдены', 'Перейдите на страницу списка модов для сохранения фильтров');
    return;
  }

  const { filters, url, isModPage } = response.filters;

  if (isModPage) {
    setStatus('Найдена страница мода', 'Готов к возврату');
    showFilters(filters);
    
    if (filters) {
      elements.returnBtn.disabled = false;
      elements.returnBtn.onclick = () => {
        chrome.runtime.sendMessage({
          action: 'navigateToFilters',
          tabId: tab.id,
          url: url
        });
        window.close();
      };
    }
  } else if (filters) {
    setStatus('Фильтры найдены', `Сохранено ${Object.keys(filters).length} фильтров`);
    showFilters(filters);
  }

  elements.clearBtn.onclick = async () => {
    await chrome.runtime.sendMessage({
      action: 'clearFilters',
      tabId: tab.id
    });
    setStatus('Фильтры очищены', 'Данные удалены');
    elements.filtersInfo.style.display = 'none';
    elements.actions.style.display = 'none';
  };

  elements.actions.style.display = 'flex';

  function setStatus(title, message) {
    elements.statusMessage.textContent = title;
    if (message) {
      const subMessage = document.createElement('div');
      subMessage.style.fontSize = '12px';
      subMessage.style.opacity = '0.8';
      subMessage.style.marginTop = '4px';
      subMessage.textContent = message;
      elements.statusMessage.appendChild(subMessage);
    }
  }

  function hideLoading() {
    elements.loading.style.display = 'none';
  }

  function showFilters(filters) {
    elements.filtersInfo.style.display = 'flex';
    
    // Отображаем версии
    if (filters.versions && filters.versions.length > 0) {
      elements.versions.innerHTML = '';
      filters.versions.forEach(version => {
        const tag = createFilterTag(version);
        elements.versions.appendChild(tag);
      });
    }
    
    // Отображаем лоадеры
    if (filters.loaders && filters.loaders.length > 0) {
      elements.loaders.innerHTML = '';
      filters.loaders.forEach(loader => {
        const tag = createFilterTag(loader);
        elements.loaders.appendChild(tag);
      });
    }
    
    // Отображаем категории
    if (filters.categories && filters.categories.length > 0) {
      elements.categories.innerHTML = '';
      filters.categories.forEach(category => {
        const tag = createFilterTag(category);
        elements.categories.appendChild(tag);
      });
    }
    
    // Отображаем окружение
    if (filters.environment && filters.environment.length > 0) {
      elements.environment.innerHTML = '';
      filters.environment.forEach(env => {
        const tag = createFilterTag(env === 'client' ? 'Клиент' : 'Сервер');
        elements.environment.appendChild(tag);
      });
    }
    
    // Отображаем open source
    if (filters.openSource) {
      elements.openSourceSection.style.display = 'block';
      elements.openSource.innerHTML = '';
      const tag = createFilterTag('Открытый исходный код');
      elements.openSource.appendChild(tag);
    }
  }

  function createFilterTag(text) {
    const tag = document.createElement('div');
    tag.className = 'filter-tag';
    tag.textContent = text;
    return tag;
  }
});
