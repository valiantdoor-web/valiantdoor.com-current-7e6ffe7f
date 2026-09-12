(() => {
  "use strict";

  const href = "/clopay-canyon-ridge-garage-doors";

  const addLink = () => {
    const grid = document.querySelector(".global-services-grid");
    if (!grid) return false;
    if (grid.querySelector(`a[href="${href}"]`)) return true;

    const link = document.createElement("a");
    link.href = href;
    link.textContent = "Clopay Canyon Ridge Doors";
    if (window.location.pathname.replace(/\/+$/, "") === href) {
      link.setAttribute("aria-current", "page");
    }

    const newDoorLink = grid.querySelector('a[href="/new-garage-door-installation"]');
    if (newDoorLink) newDoorLink.insertAdjacentElement("afterend", link);
    else grid.prepend(link);
    return true;
  };

  if (addLink()) return;

  const observer = new MutationObserver(() => {
    if (addLink()) observer.disconnect();
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });
  window.setTimeout(() => observer.disconnect(), 5000);
})();
