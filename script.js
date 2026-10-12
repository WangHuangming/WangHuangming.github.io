(() => {
  'use strict';

  const root = document.documentElement;
  const languageToggle = document.querySelector('#language-toggle');
  const menuToggle = document.querySelector('#menu-toggle');
  const navigation = document.querySelector('#nav-links');
  const copyButton = document.querySelector('#copy-email');
  const copyStatus = document.querySelector('#copy-status');
  const email = 'giogiolol233@gmail.com';
  const desktop = window.matchMedia('(min-width: 761px)');
  let language = 'en';
  let copyRequest = 0;

  function updateMenuLabel() {
    if (!menuToggle) return;
    const isOpen = menuToggle.getAttribute('aria-expanded') === 'true';
    menuToggle.setAttribute('aria-label', language === 'zh'
      ? (isOpen ? '关闭导航菜单' : '打开导航菜单')
      : (isOpen ? 'Close navigation menu' : 'Open navigation menu'));
  }

  function setMenuOpen(isOpen, restoreFocus = false) {
    if (!menuToggle || !navigation) return;
    menuToggle.setAttribute('aria-expanded', String(isOpen));
    navigation.classList.toggle('is-open', isOpen);
    updateMenuLabel();
    if (restoreFocus) menuToggle.focus();
  }

  function setLanguage(nextLanguage) {
    language = nextLanguage === 'zh' ? 'zh' : 'en';
    root.lang = language === 'zh' ? 'zh-CN' : 'en';
    document.querySelectorAll('[data-en][data-zh]').forEach((element) => {
      const translation = element.dataset[language];
      if (element.matches('meta[name="description"]')) {
        element.setAttribute('content', translation);
      } else if (element.children.length === 0) {
        element.textContent = translation;
      }
    });
    document.querySelectorAll('[data-en-label][data-zh-label]').forEach((element) => {
      element.setAttribute('aria-label', element.dataset[`${language}Label`]);
    });
    if (languageToggle) {
      languageToggle.textContent = language === 'zh' ? 'EN' : '中文';
      languageToggle.setAttribute('aria-label', language === 'zh' ? '切换到英文' : 'Switch to Chinese');
    }
    updateMenuLabel();
    copyRequest += 1;
    if (copyStatus) copyStatus.textContent = '';
    try {
      localStorage.setItem('portfolio-language', language);
    } catch {
      // Language switching still works when storage is unavailable.
    }
  }

  languageToggle?.addEventListener('click', () => {
    setLanguage(language === 'en' ? 'zh' : 'en');
  });
  menuToggle?.addEventListener('click', () => {
    setMenuOpen(menuToggle.getAttribute('aria-expanded') !== 'true');
  });
  navigation?.addEventListener('click', (event) => {
    if (event.target.closest('a')) setMenuOpen(false);
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && menuToggle?.getAttribute('aria-expanded') === 'true') {
      setMenuOpen(false, true);
    }
  });
  desktop.addEventListener('change', (event) => {
    if (event.matches) setMenuOpen(false);
  });

  copyButton?.addEventListener('click', async () => {
    const request = ++copyRequest;
    if (copyStatus) copyStatus.textContent = '';
    try {
      await navigator.clipboard.writeText(email);
      if (request === copyRequest && copyStatus) {
        copyStatus.textContent = language === 'zh' ? '邮箱地址已复制。' : 'Email address copied.';
      }
    } catch {
      if (request === copyRequest && copyStatus) {
        copyStatus.textContent = language === 'zh'
          ? `无法自动复制，请手动复制：${email}`
          : `Unable to copy automatically. Please copy manually: ${email}`;
      }
    }
  });

  try {
    if (localStorage.getItem('portfolio-language') === 'zh') language = 'zh';
  } catch {
    // Default to English when storage is unavailable.
  }
  setLanguage(language);
  setMenuOpen(false);
  root.classList.add('js');
})();
