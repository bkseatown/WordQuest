(function dashboardModalsModule() {
  "use strict";

  function create() {
    var registry = {};
    var activeName = "";

    function listVisibleNames() {
      return Object.keys(registry).filter(function (name) {
        var entry = registry[name];
        return !!(entry && entry.modal && !entry.modal.classList.contains("hidden"));
      });
    }

    function enforceSingleVisible() {
      var visible = listVisibleNames();
      if (visible.length <= 1) {
        if (!visible.length) activeName = "";
        return;
      }
      var keep = visible.indexOf(activeName) >= 0 ? activeName : visible[visible.length - 1];
      visible.forEach(function (name) {
        if (name === keep) return;
        var entry = registry[name];
        if (!entry || !entry.modal) return;
        entry.modal.classList.add("hidden");
        if (entry.onClose) entry.onClose();
      });
      activeName = keep;
    }

    function syncBodyState() {
      enforceSingleVisible();
      var hasVisible = listVisibleNames().length > 0;
      document.body.classList.toggle("td-modal-open", hasVisible);
    }

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
      if (activeName === key) activeName = "";
      if (entry.onClose) entry.onClose();
      syncBodyState();
    }

    function hideAll(exceptName) {
      var except = exceptName ? String(exceptName) : "";
      Object.keys(registry).forEach(function (name) {
        if (name === except) return;
        hide(name);
      });
      if (!except) activeName = "";
      syncBodyState();
    }

    function show(name, options) {
      var key = String(name || "");
      var entry = registry[key];
      if (!entry || !entry.modal) return;
      hideAll(key);
      if (options && options.openingClass) entry.modal.classList.add(String(options.openingClass));
      entry.modal.classList.remove("hidden");
      activeName = key;
      if (options && options.openingClass && Number(options.openingMs) > 0) {
        setTimeout(function () {
          if (entry.modal) entry.modal.classList.remove(String(options.openingClass));
        }, Number(options.openingMs));
      }
      syncBodyState();
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
      getActive: function () { return activeName; },
      getVisibleNames: listVisibleNames,
      bindBackdropClose: bindBackdropClose,
      closeOnEscape: closeOnEscape
    };
  }

  window.CSDashboardModals = { create: create };
})();
