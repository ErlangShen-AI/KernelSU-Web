window.KernelSU = window.KernelSU || {};

KernelSU.ui = (function () {
  'use strict';

  var TOAST_DURATION = 2000;

  var elements = {};
  function byId(id) {
    if (!elements[id]) elements[id] = document.getElementById(id);
    return elements[id];
  }

  var toastTimer = null;
  function toast(message) {
    var element = byId('toast');
    element.textContent = message;
    element.classList.add('is-visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { element.classList.remove('is-visible'); }, TOAST_DURATION);
  }

  var popupHandlers = [];
  function openPopup(items) {
    popupHandlers = items.map(function (item) { return item.onSelect; });
    byId('popup').innerHTML = items.map(function (item, index) {
      var check = item.checked === undefined ? '' :
        '<span class="icon popup-check">' + (item.checked ? 'check' : '') + '</span>';
      return '<button class="popup-item" data-action="popup-item" data-index="' + index + '">' + check + item.label + '</button>';
    }).join('');
    byId('popup-overlay').classList.add('is-open');
  }

  function closePopup() { byId('popup-overlay').classList.remove('is-open'); }

  function runPopupItem(index) {
    var handler = popupHandlers[index];
    if (handler) handler(); else closePopup();
  }

  var dialogHandlers = [];
  function openDialog(title, body, actions) {
    dialogHandlers = actions.map(function (action) { return action.onSelect; });
    byId('dialog').innerHTML = '<h3>' + title + '</h3><div class="dialog-body">' + body + '</div>' +
      '<div class="dialog-actions">' + actions.map(function (action, index) {
        return '<button class="' + (action.primary ? 'dialog-button--primary' : 'dialog-button--secondary') +
          '" data-action="dialog-action" data-index="' + index + '">' + action.label + '</button>';
      }).join('') + '</div>';
    byId('dialog-overlay').classList.add('is-open');
  }

  function closeDialog() { byId('dialog-overlay').classList.remove('is-open'); }

  function runDialogAction(index) {
    var handler = dialogHandlers[index];
    if (handler) handler(); else closeDialog();
  }

  function icon(name, className) {
    return '<span class="icon' + (className ? ' ' + className : '') + '">' + name + '</span>';
  }

  function infoRow(label, value) {
    return '<div class="info-row"><div class="info-label">' + label + '</div><div class="info-value">' + value + '</div></div>';
  }

  function settingText(title, description) {
    return '<div class="setting-text"><div class="setting-title">' + title + '</div>' +
      (description ? '<div class="setting-description">' + description + '</div>' : '') + '</div>';
  }

  function switchRow(item, checked) {
    return '<div class="setting-row" data-action="toggle-switch" data-key="' + item.key + '">' +
      icon(item.icon, 'setting-icon') + settingText(item.title, item.description) +
      '<div class="switch' + (checked ? ' is-on' : '') + '"></div></div>';
  }

  function selectRow(item) {
    return '<div class="setting-row" data-action="open-select" data-key="' + item.key + '">' +
      icon(item.icon, 'setting-icon') + settingText(item.title, item.description) +
      icon('chevron_right', 'row-chevron') + '</div>';
  }

  function arrowRow(item) {
    var action = item.action === 'open-page'
      ? ' data-action="open-page" data-page="' + item.page + '"'
      : ' data-action="' + item.action + '"';
    return '<div class="setting-row"' + action + '>' +
      icon(item.icon, 'setting-icon') + settingText(item.title, item.description) +
      icon('chevron_right', 'row-chevron') + '</div>';
  }

  return {
    byId: byId,
    icon: icon,
    toast: toast,
    openPopup: openPopup,
    closePopup: closePopup,
    runPopupItem: runPopupItem,
    openDialog: openDialog,
    closeDialog: closeDialog,
    runDialogAction: runDialogAction,
    infoRow: infoRow,
    switchRow: switchRow,
    selectRow: selectRow,
    arrowRow: arrowRow
  };
})();
