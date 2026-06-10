// background.js
// Relays messages from content script to the overlay within the same tab.

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "JSON_CAPTURED" && sender.tab?.id) {
    chrome.tabs.sendMessage(sender.tab.id, message);
  }
});
