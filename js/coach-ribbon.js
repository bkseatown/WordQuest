(function coachRibbonModule(root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
    return;
  }
  root.CSCoachRibbon = factory();
})(typeof window !== "undefined" ? window : this, function coachRibbonFactory() {
  "use strict";

  var COACH_VOICE_KEY = "cs_coach_voice_enabled";
  var COACH_TTS_MANIFEST = "audio/tts/packs/ava-multi/coach/coach-tts.json";
  var REPLAY_GUARD_MS = 5000;

  function sanitizeText(value) {
    return String(value || "").replace(/\s+/g, " ").trim();
  }

  function isDemoMode() {
    try {
      var params = new URLSearchParams(window.location.search || "");
      return params.get("demo") === "1";
    } catch (_e) {
      return false;
    }
  }

  function isDevMode() {
    try {
      var params = new URLSearchParams(window.location.search || "");
      if (String(params.get("env") || "").toLowerCase() === "dev") return true;
      return localStorage.getItem("cs_allow_dev") === "1";
    } catch (_e) {
      return false;
    }
  }

  function resolveMessage(messageOrKey, messageRegistry) {
    if (!messageOrKey) return null;
    if (typeof messageOrKey === "string") {
      var fromKey = messageRegistry[messageOrKey];
      if (!fromKey) return null;
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

  function safeLoadVoicePref(isDemo) {
    if (isDemo) return false;
    try {
      return localStorage.getItem(COACH_VOICE_KEY) === "true";
    } catch (_e) {
      return false;
    }
  }

  function safeSaveVoicePref(enabled, isDemo) {
    if (isDemo) return;
    try {
      localStorage.setItem(COACH_VOICE_KEY, enabled ? "true" : "false");
    } catch (_e) {
      // no-op
    }
  }

  function ensureVoiceToggle(instance) {
    if (instance.voiceToggleEl) return;
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "cs-coach-voice-toggle";
    btn.setAttribute("aria-label", "Coach voice (Ava)");
    btn.setAttribute("title", "Coach voice (Ava)");
    btn.setAttribute("aria-pressed", instance.state.voiceEnabled ? "true" : "false");
    btn.innerHTML = '<span class="cs-coach-voice-icon" aria-hidden="true">🔊</span><span class="cs-coach-voice-label">Ava</span>';
    instance.mountEl.appendChild(btn);
    btn.addEventListener("click", function () {
      instance.state.voiceEnabled = !instance.state.voiceEnabled;
      safeSaveVoicePref(instance.state.voiceEnabled, instance.state.isDemo);
      btn.setAttribute("aria-pressed", instance.state.voiceEnabled ? "true" : "false");
      btn.classList.toggle("is-on", instance.state.voiceEnabled);
      if (instance.state.voiceEnabled) {
        playClipForKey(instance, "coach.enabled");
      } else if (instance.state.audioEl) {
        try {
          instance.state.audioEl.pause();
          instance.state.audioEl.currentTime = 0;
        } catch (_e) {
          // no-op
        }
      }
    });
    btn.classList.toggle("is-on", instance.state.voiceEnabled);
    instance.voiceToggleEl = btn;
  }

  function getManifest(instance) {
    if (instance.state.manifest) return Promise.resolve(instance.state.manifest);
    if (instance.state.manifestPromise) return instance.state.manifestPromise;
    instance.state.manifestPromise = fetch(COACH_TTS_MANIFEST, { cache: "no-store" })
      .then(function (res) {
        if (!res.ok) throw new Error("coach manifest missing");
        return res.json();
      })
      .then(function (json) {
        instance.state.manifest = json && typeof json === "object" ? json : null;
        return instance.state.manifest;
      })
      .catch(function (_err) {
        if (isDevMode()) {
          console.debug("[coach-ribbon] coach manifest load failed");
        }
        return null;
      })
      .finally(function () {
        instance.state.manifestPromise = null;
      });
    return instance.state.manifestPromise;
  }

  function playClipForKey(instance, clipKey) {
    var safeKey = sanitizeText(clipKey);
    if (!safeKey || !instance.state.voiceEnabled) return;
    var now = Date.now();
    if (instance.state.lastPlayedKey === safeKey && (now - instance.state.lastPlayedAt) < REPLAY_GUARD_MS) return;

    getManifest(instance).then(function (manifest) {
      if (!manifest || !manifest.clips) return;
      var src = sanitizeText(manifest.clips[safeKey] || "");
      if (!src) return;

      try {
        if (!instance.state.audioEl) {
          instance.state.audioEl = new Audio();
          instance.state.audioEl.preload = "none";
          instance.state.audioEl.volume = 0.9;
          instance.state.audioEl.addEventListener("error", function () {
            if (isDevMode()) {
              console.debug("[coach-ribbon] coach clip play failed", instance.state.pendingClipKey || "unknown");
            }
          });
        }
        var audio = instance.state.audioEl;
        audio.pause();
        audio.currentTime = 0;
        instance.state.pendingClipKey = safeKey;
        audio.src = src;
        var playPromise = audio.play();
        if (playPromise && typeof playPromise.catch === "function") {
          playPromise.catch(function () {
            if (isDevMode()) {
              console.debug("[coach-ribbon] coach clip play blocked", safeKey);
            }
          });
        }
        instance.state.lastPlayedKey = safeKey;
        instance.state.lastPlayedAt = now;
      } catch (_e) {
        if (isDevMode()) {
          console.debug("[coach-ribbon] coach clip playback error", safeKey);
        }
      }
    });
  }

  function applyMessage(instance, messageOrKey) {
    if (!instance || !instance.textEl) return;
    var next = resolveMessage(messageOrKey, instance.messageRegistry);
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

    if (instance.state.voiceEnabled && next.key) {
      playClipForKey(instance, next.key);
    }

    window.setTimeout(function () {
      instance.mountEl.classList.remove("is-updating");
    }, 240);
  }

  function setCoachMessage(key, payload) {
    var safeKey = sanitizeText(key);
    if (!safeKey || !payload || typeof payload !== "object") return;
    globalMessageRegistry[safeKey] = {
      text: sanitizeText(payload.text || ""),
      tone: sanitizeText(payload.tone || ""),
      actionLabel: sanitizeText(payload.actionLabel || ""),
      actionId: sanitizeText(payload.actionId || "")
    };
  }

  function updateCoachRibbon(state) {
    if (!Array.isArray(instances) || !state) return;
    instances.forEach(function (entry) {
      if (!entry || typeof entry.getMessageFn !== "function") return;
      applyMessage(entry, entry.getMessageFn(state));
    });
  }

  var instances = [];
  var globalMessageRegistry = {};

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
      voiceToggleEl: null,
      onActionFn: typeof opts.onActionFn === "function" ? opts.onActionFn : null,
      getMessageFn: typeof opts.getMessageFn === "function" ? opts.getMessageFn : null,
      messageRegistry: globalMessageRegistry,
      state: {
        lastText: "",
        lastActionId: "",
        activeKey: "",
        isDemo: isDemoMode(),
        voiceEnabled: false,
        manifest: null,
        manifestPromise: null,
        audioEl: null,
        pendingClipKey: "",
        lastPlayedKey: "",
        lastPlayedAt: 0
      }
    };

    instance.state.voiceEnabled = safeLoadVoicePref(instance.state.isDemo);

    ensureVoiceToggle(instance);

    if (instance.actionEl && instance.onActionFn) {
      instance.actionEl.addEventListener("click", function () {
        var actionId = sanitizeText(instance.actionEl.getAttribute("data-action-id") || "");
        if (!actionId) return;
        instance.onActionFn(actionId);
      });
    }

    instances.push(instance);

    if (instance.getMessageFn) {
      applyMessage(instance, instance.getMessageFn({}));
    }

    return {
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
