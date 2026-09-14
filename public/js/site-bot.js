/*
 * Housecall Pro chat loader for the standalone /business-card page.
 * Shared pages load the same widget through global-chrome.js.
 */
(function () {
  "use strict";

  if (document.getElementById("housecall-pro-chat-bubble") || document.getElementById("proChatIframe")) return;

  var script = document.createElement("script");
  script.id = "housecall-pro-chat-bubble";
  script.src = "https://chat.housecallpro.com/proChat.js";
  script.type = "text/javascript";
  script.setAttribute("data-color", "#bcaa34");
  script.setAttribute("data-organization", "544de216-f35f-4c0b-835a-7950591bbd80");
  script.defer = true;

  var add = function () { document.body.appendChild(script); };
  if (document.body) add();
  else document.addEventListener("DOMContentLoaded", add, { once: true });
})();
