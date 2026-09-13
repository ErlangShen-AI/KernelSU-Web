(function () {
  'use strict';

  var data = window.KernelSU.data;
  var ui = window.KernelSU.ui;

  var SCROLL_THRESHOLD = 200;
  var LONG_PRESS_DELAY = 500;
  var ROW_BUFFER = 3;
  var MIN_BATCH = 5;

  var state = {
    tab: 0,
    uiStyle: 1,
    themeMode: 0,
    managerTag: null,
    managerCode: null,
    settings: { cu: 1, cmu: 0, sc: 0, ku: 0, sh: 0, sl: 1, ar: 0, du: 0, wd: 0, aj: 0 }
  };

  var modules = data.installedModules;
  var repositories = data.repositoryModules;
  var currentRepository = null;

  function byId(id) { return ui.byId(id); }

  var tabPages = [byId('page-home'), byId('page-superuser'), byId('page-modules'), byId('page-settings')];
  var subPages = [byId('page-about'), byId('page-app-profile'), byId('page-su-log'),
    byId('page-install'), byId('page-module-repository'), byId('page-module-detail')];
  var subPageByName = {
    about: byId('page-about'),
    'app-profile': byId('page-app-profile'),
    'su-log': byId('page-su-log'),
    install: byId('page-install'),
    'module-repository': byId('page-module-repository'),
    'module-detail': byId('page-module-detail')
  };
  var navItems = Array.prototype.slice.call(document.querySelectorAll('.nav-item'));

  // 列表分页尺寸由 CSS 令牌与视口高度推导，不依赖固定像素
  function listMetrics() {
    var tokens = getComputedStyle(document.documentElement);
    function px(name) { return parseFloat(tokens.getPropertyValue(name)) || 0; }
    return {
      row: px('--row-height') + px('--row-gap'),
      chrome: px('--top-bar-height') + px('--control-height') + px('--search-gap') * 2
    };
  }

  function batchSize() {
    var metrics = listMetrics();
    return Math.ceil((window.innerHeight - metrics.chrome) / metrics.row) + ROW_BUFFER;
  }

  function switchTab(index) {
    state.tab = index;
    byId('fab').classList.toggle('is-visible', index === 2);
    tabPages.forEach(function (page, i) { page.classList.toggle('is-active', i === index); });
    navItems.forEach(function (item, i) {
      item.classList.toggle('is-active', i === index);
      var icon = item.querySelector('.icon');
      if (icon) icon.classList.toggle('is-filled', i === index);
    });
    if (index === 1) setTimeout(fillSuperuserList, 50);
  }

  function openPage(name) {
    tabPages.forEach(function (page) { page.classList.remove('is-active'); });
    subPages.forEach(function (page) { page.classList.remove('is-active'); });
    var page = subPageByName[name];
    if (page) page.classList.add('is-active');
  }

  function goBack() {
    subPages.forEach(function (page) { page.classList.remove('is-active'); });
    tabPages.forEach(function (page, i) { page.classList.toggle('is-active', i === state.tab); });
  }

  function heroTile(label, value, tabIndex) {
    return '<div class="hero-tile" data-action="switch-tab" data-index="' + tabIndex + '">' +
      '<div class="hero-tile-label">' + label + '</div>' +
      '<div class="hero-tile-value">' + value + '</div></div>';
  }

  function statCard(label, value, tabIndex) {
    return '<div class="stat-card" data-action="switch-tab" data-index="' + tabIndex + '">' +
      '<div class="stat-label">' + label + '</div>' +
      '<div class="stat-value">' + value + '</div></div>';
  }

  function actionCard(title, description, url) {
    return '<div class="card card--action" data-action="open-external" data-url="' + url + '">' +
      '<div class="card-title">' + title + '</div>' +
      '<div class="card-description">' + description + '</div></div>';
  }

  function renderHome() {
    var version = '版本：' + (state.managerCode || data.fallbackManagerCode) + '-1';
    var info = ui.infoRow('管理器版本', data.device.ver) +
      ui.infoRow('内核版本', data.device.kernel) +
      ui.infoRow('设备型号', data.device.model) +
      ui.infoRow('系统指纹', data.device.fp) +
      ui.infoRow('SELinux 状态', data.device.selinux) +
      ui.infoRow('Seccomp 状态', data.device.seccomp);
    var cards = '<div class="card"><div class="info-list">' + info + '</div></div>' +
      actionCard('支持开发', 'KernelSU 将保持免费开源，向开发者捐赠以表示支持', 'https://patreon.com/weishu') +
      actionCard('了解 KernelSU', '了解如何安装 KernelSU 以及如何开发模块', 'https://kernelsu.org/guide/what-is-kernelsu.html');

    if (state.uiStyle === 1) {
      byId('home-content').innerHTML = '<div class="home">' +
        '<div class="hero">' +
        '<div class="hero-main" data-action="open-page" data-page="install">' +
        '<div class="hero-decoration">' + ui.icon('check_circle', 'hero-decoration-icon') + '</div>' +
        '<div class="hero-content">' +
        '<div class="hero-title">工作中 <span class="chip chip--primary">LKM</span></div>' +
        '<div class="hero-subtitle">' + version + '</div>' +
        '</div></div>' +
        '<div class="hero-side">' + heroTile('超级用户', '7', 1) + heroTile('模块', '10', 2) + '</div>' +
        '</div>' + cards + '</div>';
    } else {
      byId('home-content').innerHTML = '<div class="home">' +
        '<div class="status-card" data-action="open-page" data-page="install">' +
        '<div class="status-card-body">' + ui.icon('check_circle', 'status-icon') +
        '<div class="status-text">' +
        '<div class="status-title">工作中 <span class="chip chip--primary">LKM</span></div>' +
        '<div class="status-subtitle">' + version + '</div>' +
        '</div></div></div>' +
        '<div class="stat-row">' + statCard('超级用户', '7', 1) + statCard('模块', '10', 2) + '</div>' +
        cards + '</div>';
    }
  }

  function superuserRow() {
    var row = document.createElement('div');
    row.className = 'list-row';
    row.setAttribute('data-action', 'open-app-profile');
    row.innerHTML = '<div class="app-row">' +
      '<div class="app-avatar"><img src="img/yuanshen.png" alt=""></div>' +
      '<div class="app-info">' +
      '<div class="app-name">' + data.superuserApp.label + '</div>' +
      '<div class="app-package">' + data.superuserApp.pkg + '</div>' +
      '</div></div>';
    return row;
  }

  // 首行与末行需要单独处理圆角，中间行保持默认形状
  function decorateSuperuserRows() {
    var rows = byId('superuser-list').children;
    if (!rows.length) return;
    if (rows.length === 1) {
      rows[0].className = 'list-row list-row--single';
      return;
    }
    rows[0].className = 'list-row list-row--first';
    rows[rows.length - 1].className = 'list-row list-row--last';
  }

  function appendSuperuserRows(count) {
    var list = byId('superuser-list');
    if (list.children.length) list.lastElementChild.className = 'list-row';
    var fragment = document.createDocumentFragment();
    for (var i = 0; i < count; i++) fragment.appendChild(superuserRow());
    list.appendChild(fragment);
    decorateSuperuserRows();
  }

  function fillSuperuserList() {
    var missing = batchSize() - byId('superuser-list').children.length;
    if (missing > 0) appendSuperuserRows(missing);
  }

  function moduleCard(module, index) {
    return '<div class="module-card" data-action="open-module" data-index="' + index + '">' +
      '<div class="module-body">' +
      '<div class="module-header">' +
      '<div class="module-title-group">' +
      '<div class="module-name">' + module.n + '</div>' +
      '<div class="module-meta">版本：' + module.v + '</div>' +
      '<div class="module-meta">作者：' + module.a + '</div>' +
      '</div>' +
      '<div class="module-switch"><div class="switch' + (module.e ? ' is-on' : '') +
      '" data-action="toggle-module" data-index="' + index + '"></div></div>' +
      '</div>' +
      '<div class="spacer-8"></div>' +
      '<div class="module-description">' + module.d + '</div>' +
      '</div></div>';
  }

  function renderModules() {
    byId('module-list').innerHTML = '<div class="module-list">' +
      modules.map(moduleCard).join('') + '</div>';
  }

  function renderModuleBadge() {
    var enabled = modules.filter(function (module) { return module.e; }).length;
    var badge = byId('module-badge');
    badge.textContent = enabled;
    badge.classList.toggle('is-hidden', enabled === 0);
  }

  function toggleModule(index) {
    modules[index].e = modules[index].e ? 0 : 1;
    renderModules();
    renderModuleBadge();
  }

  function detailLine(label, value) {
    return '<div class="detail-line"><span class="detail-label">' + label + '</span><span>' + value + '</span></div>';
  }

  function openModuleDialog(index) {
    var module = modules[index];
    ui.openDialog(module.n,
      '<div class="detail-block">' +
      detailLine('版本', module.v) + detailLine('作者', module.a) +
      detailLine('状态', module.e ? '已启用' : '已禁用') +
      '<div class="detail-description">' + module.d + '</div></div>',
      [
        { label: '关闭', onSelect: ui.closeDialog },
        {
          label: module.e ? '禁用' : '启用',
          primary: true,
          onSelect: function () { toggleModule(index); ui.closeDialog(); }
        }
      ]);
  }

  var settingGroups = [
    [
      { type: 'switch', key: 'cu', icon: 'system_update', title: '检查更新', description: '在应用启动后自动检查' },
      { type: 'switch', key: 'cmu', icon: 'update', title: '检查模块更新', description: '在应用启动后自动检查' }
    ],
    [
      { type: 'select', key: 'ui', icon: 'dashboard', title: '界面风格', description: '选择应用界面风格' },
      { type: 'arrow', action: 'open-theme', icon: 'palette', title: '主题设置' }
    ],
    [
      { type: 'arrow', action: 'show-template-toast', icon: 'fence', title: 'App Profile 模板' }
    ],
    [
      { type: 'select', key: 'sc', icon: 'remove_moderator', title: '传统 SU 命令', description: '允许通过 /system/bin/su 获取 Root' },
      { type: 'switch', key: 'ku', icon: 'remove_circle', title: '内核卸载模块', description: '在内核给应用卸载模块' },
      { type: 'switch', key: 'sh', icon: 'policy', title: '隐藏 SELinux', description: '阻止应用检测 SELinux' },
      { type: 'switch', key: 'sl', icon: 'article', title: 'SU 日志', description: '记录 Root 事件' },
      { type: 'switch', key: 'ar', icon: 'adb', title: 'ADB Root', description: '以 Root 运行 adbd' }
    ],
    [
      { type: 'switch', key: 'du', icon: 'folder_delete', title: '默认卸载模块', description: '全局默认值' },
      { type: 'switch', key: 'wd', icon: 'developer_mode', title: 'WebView 调试', description: '调试 WebUI' },
      { type: 'switch', key: 'aj', icon: 'bolt', title: '自动越狱', description: '开机自动 Magica 提权' }
    ],
    [
      { type: 'arrow', action: 'open-page', page: 'su-log', icon: 'bug_report', title: '发送日志' },
      { type: 'arrow', action: 'open-about', icon: 'contact_page', title: '关于' }
    ]
  ];

  function settingRow(item) {
    if (item.type === 'switch') return ui.switchRow(item, !!state.settings[item.key]);
    if (item.type === 'select') return ui.selectRow(item);
    return ui.arrowRow(item);
  }

  function renderSettings() {
    byId('settings-content').innerHTML = '<div class="settings-body">' +
      settingGroups.map(function (group) {
        return '<div class="group">' + group.map(settingRow).join('') + '</div>';
      }).join('') + '</div>';
  }

  function toggleSwitch(key, element) {
    state.settings[key] = state.settings[key] ? 0 : 1;
    element.querySelector('.switch').classList.toggle('is-on', !!state.settings[key]);
  }

  function selectOptions(key) {
    return key === 'ui' ? data.labels.uiStyles : data.labels.legacySuModes;
  }

  function openSelect(key) {
    var options = selectOptions(key);
    var current = key === 'ui' ? state.uiStyle : state.settings[key];
    ui.openPopup(options.map(function (label, index) {
      return {
        label: label,
        checked: index === current,
        onSelect: function () { selectOption(key, index, label); }
      };
    }));
  }

  function selectOption(key, index, label) {
    if (key === 'ui') {
      state.uiStyle = index;
      renderHome();
    } else {
      state.settings[key] = index;
    }
    ui.closePopup();
    ui.toast('已选择 ' + label);
  }

  function selectTheme(index) {
    state.themeMode = index;
    applyTheme();
    ui.closeDialog();
    ui.toast(data.labels.themeModes[index]);
  }

  function openThemeDialog() {
    ui.openDialog('主题设置',
      '<div><div class="theme-heading">主题模式</div><div class="theme-options">' +
      data.labels.themeModes.map(function (label, index) {
        var selected = state.themeMode === index;
        return '<button class="theme-option' + (selected ? ' is-selected' : '') +
          '" data-action="theme-option" data-index="' + index + '">' +
          ui.icon(selected ? 'radio_button_checked' : 'radio_button_unchecked') + label + '</button>';
      }).join('') + '</div></div>',
      [{ label: '关闭', onSelect: ui.closeDialog }]);
  }

  function applyTheme() {
    var dark = state.themeMode === 0
      ? window.matchMedia('(prefers-color-scheme:dark)').matches
      : state.themeMode === 2;
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
  }

  window.matchMedia('(prefers-color-scheme:dark)').addEventListener('change', function () {
    if (state.themeMode === 0) applyTheme();
  });

  function openAbout() {
    byId('about-version').textContent = (state.managerTag || data.fallbackManagerTag) +
      ' (' + (state.managerCode || data.fallbackManagerCode) + ')';
    byId('about-device').textContent = data.device.model + ' • ' + data.device.os +
      ' • ' + data.device.cores + '核 ' + data.device.mem;
    openPage('about');
  }

  function openAppProfile() {
    byId('profile-summary').innerHTML =
      '<div class="profile-summary">' +
      '<div class="app-avatar profile-avatar"><img src="img/yuanshen.png" alt=""></div>' +
      '<div><div class="profile-name">' + data.superuserApp.label + '</div>' +
      '<div class="profile-package">' + data.superuserApp.pkg + '</div></div></div>';
    byId('profile-settings').innerHTML =
      '<div class="profile-row"><span class="profile-label">超级用户权限</span>' +
      '<span class="profile-value profile-value--granted">已授权</span></div>' +
      '<div class="profile-row"><span class="profile-label">挂载命名空间</span><span class="profile-value">继承</span></div>' +
      '<div class="profile-row"><span class="profile-label">卸载模块</span><span class="profile-value">否</span></div>' +
      '<div class="profile-row"><span class="profile-label">Groups</span><span class="profile-value">—</span></div>' +
      '<div class="profile-row"><span class="profile-label">Capabilities</span><span class="profile-value">—</span></div>';
    openPage('app-profile');
  }

  function openOptionPopup(labels) {
    ui.openPopup(labels.map(function (label) {
      return {
        label: label,
        onSelect: function () { ui.closePopup(); ui.toast(label + '…'); }
      };
    }));
  }

  function slug(name) { return name.toLowerCase().replace(/\s/g, '-'); }

  function starCount(count) { return count > 999 ? (count / 1000).toFixed(1) + 'k' : count; }

  function repositoryCard(module) {
    return '<div class="repository-card" data-action="open-repository-detail" data-name="' + module.n + '">' +
      '<div class="repository-body">' +
      '<div class="repository-name">' + module.n + '</div>' +
      '<div class="repository-id">ID: ' + slug(module.n) + '</div>' +
      '<div class="repository-author">作者: ' + module.a + '</div>' +
      '<div class="spacer-8"></div>' +
      '<div class="repository-description">' + module.d + '</div>' +
      '</div>' +
      '<div class="repository-footer">' +
      '<span class="repository-stars">⭐ ' + starCount(module.s) + '</span>' +
      '<span class="repository-date">' + module.u + '</span>' +
      '<span class="repository-download" data-action="toast" data-message="下载 ' + module.n + '…">下载</span>' +
      '</div></div>';
  }

  function renderRepositoryList() {
    var list = byId('repository-list');
    if (!list) return;
    if (!repositories.length) {
      list.innerHTML = '<div class="repository-empty">没有找到匹配的模块</div>';
      return;
    }
    list.innerHTML = repositories.map(repositoryCard).join('');
  }

  function openRepositoryDetail(name) {
    var module = repositories.filter(function (item) { return item.n === name; })[0];
    if (!module) return;
    currentRepository = module;
    byId('module-detail-title').textContent = module.n;
    byId('module-detail-body').innerHTML =
      '<div class="repository-header">' +
      '<div class="app-avatar repository-icon">' + module.n[0] + '</div>' +
      '<div><div class="repository-title">' + module.n + '</div>' +
      '<div class="repository-subtitle">' + module.a + '</div></div></div>' +
      '<div class="group">' +
      '<div class="repository-tabs">' +
      '<div class="repository-tab is-active" data-action="detail-tab" data-index="0">简介</div>' +
      '<div class="repository-tab" data-action="detail-tab" data-index="1">版本</div>' +
      '<div class="repository-tab" data-action="detail-tab" data-index="2">信息</div>' +
      '</div>' +
      '<div class="repository-tab-body">' + module.d + '</div>' +
      '</div>' +
      '<div class="repository-actions">' +
      '<button class="repository-action--primary" data-action="toast" data-message="下载 ' + module.n + '…">下载</button>' +
      '<button class="repository-action--secondary" data-action="go-back">返回</button>' +
      '</div>';
    openPage('module-detail');
  }

  function selectDetailTab(index) {
    var module = currentRepository;
    if (!module) return;
    var tabs = byId('module-detail-body').querySelectorAll('.repository-tab');
    for (var i = 0; i < tabs.length; i++) tabs[i].classList.toggle('is-active', i === index);
    var body = byId('module-detail-body').querySelector('.repository-tab-body');
    if (index === 0) {
      body.innerHTML = module.d;
    } else if (index === 1) {
      body.innerHTML = '最新版本: v' + (Math.floor(Math.random() * 5 + 1)) + '.' +
        Math.floor(Math.random() * 20) + '.' + Math.floor(Math.random() * 10) +
        '<br>更新时间: ' + module.u;
    } else {
      body.innerHTML = '作者: ' + module.a + '<br>⭐ 星标: ' + module.s +
        '<br>ID: ' + slug(module.n) + '<br>协议: GPL-3.0';
    }
  }

  var pressTimer = null;

  function startLongPress() {
    pressTimer = setTimeout(function () { window.open(data.cloudGameUrl, '_blank'); }, LONG_PRESS_DELAY);
  }

  function cancelLongPress() { clearTimeout(pressTimer); }

  function pressRow(target) { return target.closest ? target.closest('.app-row') : null; }

  byId('superuser-list').addEventListener('scroll', function () {
    if (this.scrollHeight - this.scrollTop - this.clientHeight < SCROLL_THRESHOLD) {
      appendSuperuserRows(Math.max(batchSize(), MIN_BATCH));
    }
  }, { passive: true });

  byId('superuser-list').addEventListener('pointerdown', function (event) {
    if (pressRow(event.target)) startLongPress();
  });
  byId('superuser-list').addEventListener('pointerup', cancelLongPress);
  byId('superuser-list').addEventListener('pointercancel', cancelLongPress);
  byId('superuser-list').addEventListener('pointermove', function (event) {
    if (event.pointerType === 'touch') cancelLongPress();
  });
  byId('superuser-list').addEventListener('pointerout', function (event) {
    var row = pressRow(event.target);
    if (row && !row.contains(event.relatedTarget)) cancelLongPress();
  });

  var actions = {
    'switch-tab': function (element) { switchTab(Number(element.dataset.index)); },
    'open-page': function (element) { openPage(element.dataset.page); },
    'go-back': function () { goBack(); },
    'close-popup-on-self': function (element, event) { if (event.target === element) ui.closePopup(); },
    'close-dialog-on-self': function (element, event) { if (event.target === element) ui.closeDialog(); },
    'open-reboot-menu': function () { openOptionPopup(data.labels.reboot); },
    'open-superuser-sort': function () { openOptionPopup(data.labels.superuserSort); },
    'open-superuser-filter': function () { openOptionPopup(data.labels.superuserFilter); },
    'open-module-sort': function () { openOptionPopup(data.labels.moduleSort); },
    'open-select': function (element) { openSelect(element.dataset.key); },
    'open-theme': function () { openThemeDialog(); },
    'show-template-toast': function () { ui.toast('App Profile 模板'); },
    'open-about': function () { openAbout(); },
    'pick-module-file': function () { byId('module-file-input').click(); },
    'open-external': function (element) { window.open(element.dataset.url, '_blank'); },
    'toast': function (element) { ui.toast(element.dataset.message); },
    'toggle-switch': function (element) { toggleSwitch(element.dataset.key, element); },
    'toggle-module': function (element) { toggleModule(Number(element.dataset.index)); },
    'open-module': function (element) { openModuleDialog(Number(element.dataset.index)); },
    'open-app-profile': function () { openAppProfile(); },
    'open-repository-detail': function (element) { openRepositoryDetail(element.dataset.name); },
    'detail-tab': function (element) { selectDetailTab(Number(element.dataset.index)); },
    'theme-option': function (element) { selectTheme(Number(element.dataset.index)); },
    'popup-item': function (element) { ui.runPopupItem(Number(element.dataset.index)); },
    'dialog-action': function (element) { ui.runDialogAction(Number(element.dataset.index)); }
  };

  document.addEventListener('click', function (event) {
    var element = event.target.closest ? event.target.closest('[data-action]') : null;
    if (!element) return;
    var handler = actions[element.dataset.action];
    if (handler) handler(element, event);
  });

  (async function () {
    try {
      var response = await fetch(data.releaseEndpoint);
      if (!response.ok) throw new Error('release request failed');
      var release = await response.json();
      var parsed = (release.tag_name || '').match(/(\d+)\.(\d+)\.(\d+)/);
      if (parsed) {
        state.managerTag = release.tag_name;
        state.managerCode = Number(parsed[1]) * 10000 + Number(parsed[2]) * 100 + Number(parsed[3]);
        data.device.ver = release.tag_name + ' (' + state.managerCode + ')';
      }
    } catch (error) {
      state.managerTag = null;
    }
    setTimeout(function () {
      if (state.managerTag) renderHome();
    }, 500);
  })();

  if (byId('repository-list')) renderRepositoryList();

  renderHome();
  fillSuperuserList();
  renderModules();
  renderSettings();
  renderModuleBadge();
  applyTheme();
})();
