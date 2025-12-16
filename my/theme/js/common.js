// Google Translate Widget Global
// Multi-language dropdown under a single Lang button.
// Site default language is English (en). We treat English as original text; any other selection triggers Google Translate.
// Stored state: localStorage.siteLang = language code (e.g. 'en', 'zh-CN', 'fr', ...)
// Include this script after navigation markup.

(function() {
  const STATE_KEY = 'siteLang'; // localStorage key
  const BASE_LANG = 'en';    // Original/default site language is English
  // Supported languages list (Google Translate codes). Keep Chinese last.
  const LANG_LIST = [
    { code: 'en', label: 'English' },
    { code: 'es', label: 'Español' },
    { code: 'fr', label: 'Français' },
    { code: 'de', label: 'Deutsch' },
    { code: 'ja', label: '日本語' },
    { code: 'ko', label: '한국어' },
    { code: 'ru', label: 'Русский' },
    { code: 'pt', label: 'Português' },
    { code: 'it', label: 'Italiano' },
    { code: 'ar', label: 'العربية' },
    { code: 'hi', label: 'हिन्दी' },
    { code: 'ms', label: 'Melayu' },
    { code: 'vi', label: 'Tiếng Việt' },
    { code: 'th', label: 'ภาษาไทย' },
    { code: 'zh-CN', label: '中文' },
  ];
  // Icon shown before language label
  const BUTTON_ICON = '🌐';
  const DEFAULT_BUTTON_TEXT = 'Language'; // fallback if label lookup fails
  let translateScriptLoading = false;
  let translatorReady = false;
  const readyQueue = [];

  function getState() {
    return localStorage.getItem(STATE_KEY) || BASE_LANG;
  }
  function setState(v, explicit) {
    localStorage.setItem(STATE_KEY, v);
    if(explicit) localStorage.setItem(STATE_KEY + '_explicit', '1');
  }

  function appendMenuItem() {
    const container = document.querySelector('#menus .menus_items');
    if(!container) return;
    if(document.getElementById('langToggleItem')) return;
    const wrapper = document.createElement('div');
    wrapper.className = 'menus_item lang-menu-wrapper';
    wrapper.id = 'langToggleItem';

    const button = document.createElement('a');
    button.className = 'site-page lang-toggle notranslate';
    button.href = 'javascript:void(0)';
    button.setAttribute('translate','no');
    // Label will be set dynamically
    button.textContent = BUTTON_ICON + ' ' + DEFAULT_BUTTON_TEXT;
    wrapper.appendChild(button);

    const panel = document.createElement('div');
    panel.className = 'lang-dropdown';
    panel.style.display = 'none';
    const list = document.createElement('ul');
    list.className = 'lang-list';
    LANG_LIST.forEach(l => {
      const li = document.createElement('li');
      li.className = 'lang-item';
      li.dataset.code = l.code;
      li.innerHTML = `<span class="lang-label">${l.label}</span>`;
      list.appendChild(li);
    });
    panel.appendChild(list);
    wrapper.appendChild(panel);
    container.appendChild(wrapper);
  }

  function getLabelFor(code){
    const nCode = normalizeLang(code);
    // 1. 精确匹配 (含区域)
    let item = LANG_LIST.find(l => normalizeLang(l.code) === nCode);
    if(item) return item.label;
    // 2. 基础前缀匹配 (处理 zh -> zh-CN 这种)
    const base = nCode.split('-')[0];
    item = LANG_LIST.find(l => l.code.split('-')[0] === base);
    if(item) return item.label;
    return DEFAULT_BUTTON_TEXT;
  }

  function updateButtonLabel(){
    const btn = document.querySelector('#langToggleItem .lang-toggle');
    if(!btn) return;
    const current = normalizeLang(getState());
    const label = getLabelFor(current);
    // Ensure notranslate stays, and consistent spacing
    btn.textContent = BUTTON_ICON + ' ' + label;
  }

  function highlightActiveLanguage() {
    const state = normalizeLang(getState());
    document.querySelectorAll('#langToggleItem .lang-item').forEach(li => {
      if(normalizeLang(li.dataset.code) === state) {
        li.classList.add('active');
      } else {
        li.classList.remove('active');
      }
    });
  }

  function toggleDropdown(forceClose) {
    const panel = document.querySelector('#langToggleItem .lang-dropdown');
    if(!panel) return;
    if(forceClose === true) {
      panel.style.display = 'none';
      return;
    }
    panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
    if(panel.style.display === 'block') highlightActiveLanguage();
  }

  function normalizeLang(code) {
    if(!code) return BASE_LANG;
    const lower = code.toLowerCase();
    // Treat en/en-* variants as base
    if(lower === BASE_LANG || lower.startsWith(BASE_LANG + '-')) return BASE_LANG;
    return code;
  }

  // 设置 Google Translate 使用的 cookie
  function setTranslateCookie(targetLang) {
    const cookieBase = 'googtrans=' + encodeURIComponent('/' + BASE_LANG + '/' + targetLang) + '; path=/';
    document.cookie = cookieBase;
    // 兼容含子域场景
    const host = window.location.hostname;
    if(host.indexOf('.') !== -1) {
      document.cookie = cookieBase + '; domain=' + host;
    }
  }
  function clearTranslateCookie() {
    // 通过过期方式清除
    document.cookie = 'googtrans=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
    const host = window.location.hostname;
    if(host.indexOf('.') !== -1) {
      document.cookie = 'googtrans=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=' + host;
    }
    // 设成原语言->原语言也能避免部分情况下残留
    setTranslateCookie(BASE_LANG);
  }

  function injectHiddenContainer() {
    if(!document.getElementById('google_translate_element')) {
      const div = document.createElement('div');
      div.id = 'google_translate_element';
      div.style.display = 'none';
      document.body.appendChild(div);
    }
  }

  function injectHideStyles() {
    if(document.getElementById('gt-hide-style')) return;
    const style = document.createElement('style');
    style.id = 'gt-hide-style';
    style.textContent = `
      /* 隐藏 Google 提示/横幅/Logo */
      .goog-logo-link, .goog-te-gadget-icon { display:none !important; }
      .goog-te-banner-frame.skiptranslate, .goog-te-banner-frame { display:none !important; }
      #google_translate_element, .goog-te-gadget { display:none !important; height:0 !important; }
      /* 隐藏 tooltip 与菜单 */
      #goog-gt-tt, .goog-te-spinner-pos, .goog-te-balloon-frame { display:none !important; }
      /* 顶部被 banner 推下来的补偿去掉 */
      body { top: 0 !important; }
      /* 仅隐藏 Google 注入在 body 最前面的那个占位块，不影响正文 (有些版本会生成一个 .skiptranslate 容器) */
      body > .skiptranslate { display:none !important; }
      /* 防止某些 iframe 闪烁 (慎用匹配) */
      iframe.goog-te-menu-frame { display:none !important; }
      /* 按钮里的 notranslate 强制保持原样 */
      #langToggleItem .notranslate { unicode-bidi: plaintext; }
    `;
    document.head.appendChild(style);
  }

  function loadGoogleTranslateScript(cb){
    if(typeof google !== 'undefined' && google.translate && google.translate.TranslateElement){
      translatorReady = true;
      cb && cb();
      drainReadyQueue();
      return;
    }
    if(cb) readyQueue.push(cb);
    if(translateScriptLoading) return;
    translateScriptLoading = true;
    const s = document.createElement('script');
    s.src = 'https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
    s.async = true;
    document.head.appendChild(s);
  }

  function drainReadyQueue(){
    while(readyQueue.length) {
      try { readyQueue.shift()(); } catch(e) { console.error(e); }
    }
  }

  // Google callback
  window.googleTranslateElementInit = function(){
    try {
      new google.translate.TranslateElement({
        pageLanguage: BASE_LANG,
        autoDisplay: false
      }, 'google_translate_element');
    } catch(e) {
      console.error('Translate init error', e);
    }
    translatorReady = true;
    drainReadyQueue();
    // If initial stored language is NOT the base English, trigger translation
    const st = normalizeLang(getState());
    if(st !== BASE_LANG) {
      translateTo(st);
    }
  };

  function translateTo(lang){
    function exec(){
      const combo = document.querySelector('select.goog-te-combo');
      if(combo) {
        if(combo.value !== lang) {
          combo.value = lang;
          combo.dispatchEvent(new Event('change'));
        }
      } else {
        // 如果 select 还未出现，稍后再试
        setTimeout(exec, 300);
      }
    }
    exec();
  }

  function applyLanguage(langCode, explicit){
    let code = normalizeLang(langCode);
    // 若不是列表里的支持代码，尝试用前缀匹配一个可用的（例如 zh => zh-CN）
    const supported = LANG_LIST.map(l => l.code);
    if(!supported.includes(code)){
      const base = code.split('-')[0];
      const fallback = LANG_LIST.find(l => l.code.split('-')[0] === base);
      if(fallback) code = fallback.code; // 使用规范代码存储
    }
    setState(code, explicit);
    updateButtonLabel();
    if(code === BASE_LANG) {
      clearTranslateCookie();
      // 直接刷新还原最干净
      location.reload();
      return;
    }
    setTranslateCookie(code);
    loadGoogleTranslateScript(function(){
      translateTo(code);
    });
  }

  function bindToggle(){
    const wrapper = document.getElementById('langToggleItem');
    const panel = wrapper && wrapper.querySelector('.lang-dropdown');
    const btn = wrapper && wrapper.querySelector('.lang-toggle');
    if(!wrapper || !panel || !btn) return;
    // Hover 显示/离开隐藏
    wrapper.addEventListener('mouseenter', function(){
      panel.style.display = 'block';
      highlightActiveLanguage();
    });
    wrapper.addEventListener('mouseleave', function(){
      panel.style.display = 'none';
    });
    // 防止点击跳转
    btn.addEventListener('click', function(e){ e.preventDefault(); });
    // 选择语言
    panel.addEventListener('click', function(e){
      const li = e.target.closest('.lang-item');
      if(!li) return;
      applyLanguage(li.dataset.code, true); // 用户显式选择
    });
  }

  function applySavedLanguage(){
    const state = normalizeLang(getState());
    highlightActiveLanguage();
    updateButtonLabel();
    if(state === BASE_LANG){
      clearTranslateCookie();
      return;
    }
    setTranslateCookie(state);
    loadGoogleTranslateScript(function(){
      translateTo(state);
    });
  }

  function detectBrowserLanguage(){
    // 仅在用户尚未显式选择的情况下 / only if user hasn't explicitly chosen
    if(localStorage.getItem(STATE_KEY + '_explicit') === '1') return;
    const current = normalizeLang(getState());
  if(current !== BASE_LANG) return; // already not default
    const langs = (navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language || navigator.userLanguage || '']).map(l => (l||'').toLowerCase());
    if(!langs.length) return;
    const codes = LANG_LIST.map(l => l.code.toLowerCase());
    function pick(){
      for(const raw of langs){
        if(!raw) continue;
        if(raw.startsWith(BASE_LANG)) return null; // keep base (English)
        // exact
        if(codes.includes(raw)) return raw;
        // prefix
        const base = raw.split('-')[0];
        if(codes.includes(base)) return base;
      }
      return null;
    }
    const target = pick();
    if(target && target !== BASE_LANG.toLowerCase()) {
      applyLanguage(target, false); // auto select, not explicit
    }
  }

  document.addEventListener('DOMContentLoaded', function(){
    appendMenuItem();
    injectHiddenContainer();
    injectHideStyles();
    injectDropdownStyles();
    bindToggle();
    applySavedLanguage();
    detectBrowserLanguage();
    updateButtonLabel(); // ensure label correct even if nothing else triggers
  });
  
  function injectDropdownStyles(){
    if(document.getElementById('gt-lang-style')) return;
    const style = document.createElement('style');
    style.id = 'gt-lang-style';
    style.textContent = `
      #langToggleItem { position: relative; }
      #langToggleItem .lang-toggle { cursor: pointer; }
      #langToggleItem .lang-dropdown { position: absolute; right:0; top:100%; background:#fff; border:1px solid #ddd; border-radius:6px; padding:6px 0; min-width:140px; box-shadow:0 4px 18px rgba(0,0,0,.12); z-index:9999; }
      #langToggleItem .lang-list { list-style:none; margin:0; padding:0; max-height:360px; overflow:auto; }
      #langToggleItem .lang-item { padding:6px 14px; font-size:14px; line-height:1.2; white-space:nowrap; cursor:pointer; display:flex; align-items:center; }
      #langToggleItem .lang-item:hover { background:#f0f3f7; }
      #langToggleItem .lang-item.active { background:#2962ff; color:#fff; }
      #langToggleItem .lang-item.active:hover { background:#2962ff; }
      @media (max-width:600px){ #langToggleItem .lang-dropdown { left:auto; right:0; } }
    `;
    document.head.appendChild(style);
  }
})();
