importScripts("../shared/messages.js");

const { TYPES, isGesturaMessage, envelope } = GesturaMessages;

const tabState = new Map();

chrome.action.onClicked.addListener(async (tab) => {
  if (!tab || tab.id == null) return;
  await chrome.sidePanel.open({ tabId: tab.id });
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!isGesturaMessage(message)) return;
  const tabId = sender.tab && sender.tab.id;

  if (message.type === TYPES.OPEN_SIDEPANEL) {
    const id = tabId;
    if (id != null) {
      chrome.sidePanel.open({ tabId: id });
    }
    sendResponse({ ok: true });
    return true;
  }

  if (message.type === TYPES.PING) {
    sendResponse(envelope(TYPES.PONG, { ok: true }));
    return true;
  }

  if (tabId != null) {
    const current = tabState.get(tabId) || {};
    if (message.type === TYPES.PAGE_CONTEXT) current.context = message.payload;
    if (message.type === TYPES.CAPTIONS_UPDATED) current.captions = message.payload;
    if (message.type === TYPES.PLAYBACK) current.playback = message.payload;
    tabState.set(tabId, current);
    chrome.runtime.sendMessage(message).catch(() => {});
  }

  return undefined;
});
