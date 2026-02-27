(function coachRibbonModule(root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
    return;
  }
  root.CSCoachRibbon = factory();
})(typeof window !== "undefined" ? window : this, function coachRibbonFactory() {
  "use strict";

  var registry = {};
  var activeId = "";

  function sanitizeText(value) {
    return String(value || "").replace(/\s+/g, " ").trim();
  }

  function resolveMessage(messageOrKey) {
    if (!messageOrKey) return null;
    if (typeof messageOrKey === "string" && registry[messageOrKey]) {
      var fromKey = registry[messageOrKey];
      return {
        key: messageOrKey,
        text: sanitizeText(fromKey.text || ""),
        tone: sanitizeText(fromKey.tone || ""),
        actionLabel: sanitizeText(fromKey.actionLabel || ""),
        actionId: sanitizeText(fromKey.actionId || "")
      };
    }
    if (typeof messageOrKey === "object") {
      return {
        key: sanitizeText(messageOrKey.key || ""),
        text: sanitizeText(messageOrKey.text || ""),
        tone: sanitizeText(messageOrKey.tone || ""),
        actionLabel: sanitizeText(messageOrKey.actionLabel || ""),
        actionId: sanitizeText(messageOrKey.actionId || "")
      };
    }
    return null;
  }

  function applyMessage(instance, messageOrKey) {
    if (!instance || !instance.textEl) return;
    var next = resolveMessage(messageOrKey);
    if (!next || !next.text) return;

    if (instance.state.lastText === next.text && instance.state.lastActionId === next.actionId) return;
    instance.state.lastText = next.text;
    instance.state.lastActionId = next.actionId;
    instance.state.activeKey = next.key || "";

    instance.mountEl.classList.add("is-updating");
    instance.textEl.textContent = next.text;
    if (instance.chipEl) {
      if (next.tone) {
        instance.chipEl.textContent = next.tone;
        instance.chipEl.classList.remove("hidden");
      } else {
        instance.chipEl.textContent = "";
        instance.chipEl.classList.add("hidden");
      }
    }
    if (instance.actionEl) {
      if (next.actionLabel && next.actionId) {
        instance.actionEl.textContent = next.actionLabel;
        instance.actionEl.setAttribute("data-action-id", next.actionId);
        instance.actionEl.classList.remove("hidden");
      } else {
        instance.actionEl.textContent = "";
        instance.actionEl.removeAttribute("data-action-id");
        instance.actionEl.classList.add("hidden");
      }
    }
    window.setTimeout(function () {
      instance.mountEl.classList.remove("is-updating");
    }, 240);
  }

  function setCoachMessage(key, payload) {
    var safeKey = sanitizeText(key);
    if (!safeKey || !payload || typeof payload !== "object") return;
    registry[safeKey] = {
      text: sanitizeText(payload.text || ""),
      tone: sanitizeText(payload.tone || ""),
      actionLabel: sanitizeText(payload.actionLabel || ""),
      actionId: sanitizeText(payload.actionId || "")
    };
  }

  function updateCoachRibbon(state) {
    if (!activeId || !state) return;
    var entry = registry[activeId];
    if (!entry || typeof entry.getMessageFn !== "function") return;
    applyMessage(entry.instance, entry.getMessageFn(state));
  }

  function initCoachRibbon(options) {
    var opts = options || {};
    var mountEl = opts.mountEl instanceof HTMLElement ? opts.mountEl : null;
    if (!mountEl) return null;

    var textEl = mountEl.querySelector(".cs-coach-text");
    var chipEl = mountEl.querySelector(".cs-coach-chip");
    var actionEl = mountEl.querySelector(".cs-coach-action");
    if (!(textEl instanceof HTMLElement)) return null;

    mountEl.setAttribute("aria-live", "polite");
    mountEl.setAttribute("role", "status");

    var instance = {
      mountEl: mountEl,
      textEl: textEl,
      chipEl: chipEl instanceof HTMLElement ? chipEl : null,
      actionEl: actionEl instanceof HTMLElement ? actionEl : null,
      onActionFn: typeof opts.onActionFn === "function" ? opts.onActionFn : null,
      getMessageFn: typeof opts.getMessageFn === "function" ? opts.getMessageFn : null,
      state: { lastText: "", lastActionId: "", activeKey: "" }
    };

    if (instance.actionEl && instance.onActionFn) {
      instance.actionEl.addEventListener("click", function () {
        var actionId = sanitizeText(instance.actionEl.getAttribute("data-action-id") || "");
        if (!actionId) return;
        instance.onActionFn(actionId);
      });
    }

    var id = "ribbon-" + Date.now() + "-" + Math.floor(Math.random() * 9999);
    registry[id] = {
      instance: instance,
      getMessageFn: instance.getMessageFn
    };
    activeId = id;

    if (instance.getMessageFn) {
      applyMessage(instance, instance.getMessageFn({}));
    }

    return {
      id: id,
      mountEl: mountEl,
      set: function setMessage(messageOrKey) {
        applyMessage(instance, messageOrKey);
      },
      update: function update(state) {
        if (!instance.getMessageFn) return;
        applyMessage(instance, instance.getMessageFn(state || {}));
      }
    };
  }

  return {
    initCoachRibbon: initCoachRibbon,
    setCoachMessage: setCoachMessage,
    updateCoachRibbon: updateCoachRibbon
  };
});
