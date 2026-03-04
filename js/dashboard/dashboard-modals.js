(function dashboardModalsModule() {
  "use strict";

  function create() {
    var registry = {};

    function register(name, modal, onClose) {
      if (!name || !modal) return;
      registry[String(name)] = {
        modal: modal,
        onClose: typeof onClose === "function" ? onClose : null
      };
    }

    function hide(name) {
      var key = String(name || "");
      var entry = registry[key];
      if (!entry || !entry.modal) return;
      entry.modal.classList.add("hidden");
      if (entry.onClose) entry.onClose();
    }

    function hideAll(exceptName) {
      var except = exceptName ? String(exceptName) : "";
      Object.keys(registry).forEach(function (name) {
        if (name === except) return;
        hide(name);
      });
    }

    function show(name, options) {
      var key = String(name || "");
      var entry = registry[key];
      if (!entry || !entry.modal) return;
      hideAll(key);
      if (options && options.openingClass) entry.modal.classList.add(String(options.openingClass));
      entry.modal.classList.remove("hidden");
      if (options && options.openingClass && Number(options.openingMs) > 0) {
        setTimeout(function () {
          if (entry.modal) entry.modal.classList.remove(String(options.openingClass));
        }, Number(options.openingMs));
      }
    }

    function bindBackdropClose(name) {
      var key = String(name || "");
      var entry = registry[key];
      if (!entry || !entry.modal) return;
      entry.modal.addEventListener("click", function (event) {
        if (event.target === entry.modal) hide(key);
      });
    }

    function closeOnEscape() {
      document.addEventListener("keydown", function (event) {
        if (event.key !== "Escape") return;
        hideAll();
      });
    }

    return {
      register: register,
      show: show,
      hide: hide,
      hideAll: hideAll,
      bindBackdropClose: bindBackdropClose,
      closeOnEscape: closeOnEscape
    };
  }

  window.CSDashboardModals = { create: create };
})();
