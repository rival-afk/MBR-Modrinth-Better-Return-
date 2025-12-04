// Content script для страниц со списком модов

// Отправляем сообщение о том, что мы на странице фильтров
if (window.location.href.includes('modrinth.com/mods')) {
  chrome.runtime.sendMessage({
    action: 'pageLoaded',
    pageType: 'filters',
    url: window.location.href
  });
}

// Добавляем обработчик кнопки "Назад" на странице мода
if (window.location.href.includes('modrinth.com/mod/')) {
  // Ждем загрузки страницы
  setTimeout(() => {
    // Находим кнопку "Назад" в истории браузера
    // или добавляем свою функциональность
    chrome.runtime.sendMessage({
      action: 'pageLoaded',
      pageType: 'mod',
      url: window.location.href
    });
  }, 1000);
}

// Перехватываем клик по кнопке "Назад" браузера
window.addEventListener('popstate', (event) => {
  if (window.location.href.includes('modrinth.com/mod/')) {
    // Если мы на странице мода и нажали "Назад", проверяем сохраненные фильтры
    chrome.runtime.sendMessage({
      action: 'checkBackNavigation',
      currentUrl: window.location.href
    });
  }
});
