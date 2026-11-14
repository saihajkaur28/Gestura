(function () {
  const ID = "gestura-floating-root";

  function mountFloatingButton() {
    if (document.getElementById(ID)) return;
    const root = document.createElement("div");
    root.id = ID;
    root.innerHTML = `
      <button type="button" class="gestura-fab" aria-label="Open Gestura accessibility panel">
        Gestura
      </button>
    `;
    const style = document.createElement("style");
    style.textContent = `
      #${ID} {
        position: fixed;
        right: 16px;
        bottom: 88px;
        z-index: 2147483646;
        font-family: "Segoe UI", system-ui, sans-serif;
      }
      #${ID} .gestura-fab {
        appearance: none;
        border: 1px solid #3ee0f0;
        background: #0b1b2b;
        color: #f4fbff;
        border-radius: 999px;
        padding: 10px 16px;
        font-size: 13px;
        letter-spacing: 0.04em;
        cursor: pointer;
      }
      #${ID} .gestura-fab:focus-visible {
        outline: 3px solid #3ee0f0;
        outline-offset: 3px;
      }
    `;
    document.documentElement.appendChild(style);
    document.documentElement.appendChild(root);
    root.querySelector("button").addEventListener("click", () => {
      chrome.runtime.sendMessage(
        GesturaMessages.envelope(GesturaMessages.TYPES.OPEN_SIDEPANEL)
      );
    });
  }

  window.GesturaMountFloatingButton = mountFloatingButton;
})();
