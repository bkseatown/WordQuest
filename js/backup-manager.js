(function backupManagerModule(root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
    return;
  }
  root.CSBackupManager = factory();
})(typeof globalThis !== "undefined" ? globalThis : window, function createBackupManager() {
  "use strict";

  var META_KEY = "cs.backup.meta.v1";
  var VERSION = 1;
  var REMINDER_DAYS = 14;
  var TRACKED_PREFIXES = [
    "cs.",
    "cs_",
    "CS_",
    "wq_",
    "ws_",
    "th2_",
    "td_",
    "sp_"
  ];
  var TRACKED_EXACT = [
    "ws_theme_v1",
    "cs_role",
    "wq_v2_grade_band",
    "wq_v2_length"
  ];
  var EXCLUDED_KEYS = [
    META_KEY,
    "cs.google.auth.v1",
    "cs.google.token.v1",
    "cs_allow_dev",
    "wq_v2_cache_repair_build_v1"
  ];
  var DATA_KEY_PATTERN = /(students|student|support|evidence|session|schedule|class|lesson|caseload|record|fba|bip|goal|queue|block|assignment|profile|roster|meeting|weekly|insight)/i;
  var ui = {
    modal: null,
    status: null,
    lastLine: null,
    reminder: null,
    fileInput: null,
    mergeRadio: null,
    replaceRadio: null,
    driveFull: null,
    driveSettings: null
  };

  function nowIso() {
    return new Date().toISOString();
  }

  function safeParse(raw, fallback) {
    try {
      return raw ? JSON.parse(raw) : fallback;
    } catch (_err) {
      return fallback;
    }
  }

  function readMeta() {
    return safeParse(localStorage.getItem(META_KEY), {});
  }

  function saveMeta(meta) {
    try { localStorage.setItem(META_KEY, JSON.stringify(meta || {})); } catch (_err) {}
  }

  function isTrackedKey(key) {
    var normalized = String(key || "");
    if (!normalized || EXCLUDED_KEYS.indexOf(normalized) >= 0) return false;
    if (TRACKED_EXACT.indexOf(normalized) >= 0) return true;
    return TRACKED_PREFIXES.some(function (prefix) { return normalized.indexOf(prefix) === 0; });
  }

  function getTrackedKeys(kind) {
    var keys = [];
    try {
      for (var i = 0; i < localStorage.length; i += 1) {
        var key = localStorage.key(i);
        if (!isTrackedKey(key)) continue;
        if (kind === "settings" && DATA_KEY_PATTERN.test(key)) continue;
        keys.push(key);
      }
    } catch (_err) {}
    keys.sort();
    return keys;
  }

  function buildBackup(kind) {
    var mode = kind === "settings" ? "settings" : "full";
    var keys = getTrackedKeys(mode);
    var payload = {
      app: "Cornerstone MTSS",
      type: "cornerstone-backup",
      version: VERSION,
      kind: mode,
      exportedAt: nowIso(),
      origin: String(location && location.href || ""),
      keys: {},
      summary: {
        keyCount: keys.length
      }
    };
    keys.forEach(function (key) {
      try {
        payload.keys[key] = String(localStorage.getItem(key) || "");
      } catch (_err) {
        payload.keys[key] = "";
      }
    });
    return payload;
  }

  function downloadText(filename, text) {
    var blob = new Blob([text], { type: "application/json" });
    var url = URL.createObjectURL(blob);
    var anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  function fileNameFor(kind) {
    var stamp = new Date().toISOString().slice(0, 10);
    return "cornerstone-" + (kind === "settings" ? "settings" : "backup") + "-" + stamp + ".json";
  }

  function setStatus(message, tone) {
    if (!ui.status) return;
    ui.status.textContent = String(message || "");
    ui.status.setAttribute("data-tone", tone || "info");
  }

  function formatDate(iso) {
    var date = new Date(iso);
    if (isNaN(date.getTime())) return "Not yet";
    return date.toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit"
    });
  }

  function refreshMetaUI() {
    var meta = readMeta();
    if (ui.lastLine) {
      ui.lastLine.textContent = meta.lastBackupAt
        ? ("Last backup: " + formatDate(meta.lastBackupAt) + (meta.lastBackupKind ? " • " + meta.lastBackupKind : ""))
        : "No backup saved yet on this device.";
    }
    if (ui.reminder) {
      var overdue = false;
      if (meta.lastBackupAt) {
        overdue = ((Date.now() - new Date(meta.lastBackupAt).getTime()) / 86400000) >= REMINDER_DAYS;
      }
      ui.reminder.textContent = overdue
        ? "Backup reminder: it has been more than 14 days since the last backup."
        : "Local-first reminder: export a backup before switching devices or clearing browser data.";
      ui.reminder.setAttribute("data-state", overdue ? "due" : "ok");
    }
  }

  function markBackup(kind, destination) {
    var meta = readMeta();
    meta.lastBackupAt = nowIso();
    meta.lastBackupKind = String(kind || "full");
    meta.lastBackupDestination = String(destination || "download");
    saveMeta(meta);
    refreshMetaUI();
  }

  function clearTrackedData() {
    getTrackedKeys("full").forEach(function (key) {
      try { localStorage.removeItem(key); } catch (_err) {}
    });
  }

  function validateBackup(payload) {
    if (!payload || typeof payload !== "object") throw new Error("Backup file is not valid JSON.");
    if (payload.type !== "cornerstone-backup") throw new Error("This file is not a Cornerstone backup.");
    if (!payload.keys || typeof payload.keys !== "object" || Array.isArray(payload.keys)) {
      throw new Error("Backup file is missing key data.");
    }
  }

  function restoreBackup(payload, mode) {
    validateBackup(payload);
    var restoreMode = mode === "replace" ? "replace" : "merge";
    if (restoreMode === "replace") clearTrackedData();
    Object.keys(payload.keys).forEach(function (key) {
      if (!isTrackedKey(key)) return;
      try { localStorage.setItem(key, String(payload.keys[key] || "")); } catch (_err) {}
    });
    var meta = readMeta();
    meta.lastImportAt = nowIso();
    meta.lastImportMode = restoreMode;
    meta.lastImportCount = Object.keys(payload.keys).length;
    saveMeta(meta);
    refreshMetaUI();
    return {
      count: Object.keys(payload.keys).length,
      mode: restoreMode,
      kind: payload.kind || "full"
    };
  }

  function exportBackup(kind) {
    var payload = buildBackup(kind);
    downloadText(fileNameFor(kind), JSON.stringify(payload, null, 2));
    markBackup(kind, "download");
    setStatus((kind === "settings" ? "Settings backup downloaded." : "Full backup downloaded.") + " Keep this file on your device.", "success");
  }

  function uploadBackupToDrive(kind) {
    var workspace = root.CSGoogleWorkspace;
    if (!workspace || typeof workspace.uploadJsonFile !== "function") {
      setStatus("Google Drive upload is unavailable until Google is configured.", "warn");
      return Promise.resolve(false);
    }
    var payload = buildBackup(kind);
    setStatus("Connecting to Google Drive…", "info");
    var connectStep = workspace.isSignedIn && workspace.isSignedIn()
      ? Promise.resolve()
      : (typeof workspace.connect === "function" ? workspace.connect() : Promise.reject(new Error("Google sign-in unavailable.")));
    return connectStep
      .then(function () {
        return workspace.uploadJsonFile(fileNameFor(kind), payload, {
          description: "Cornerstone MTSS " + (kind === "settings" ? "settings backup" : "full backup")
        });
      })
      .then(function (file) {
        markBackup(kind, "google-drive");
        setStatus("Backup uploaded to Google Drive" + (file && file.webViewLink ? ". Open it from Drive on any device." : "."), "success");
        return file;
      })
      .catch(function (err) {
        setStatus(err && err.message ? err.message : "Google Drive upload failed.", "error");
        return false;
      });
  }

  function ensureModal() {
    if (ui.modal || typeof document === "undefined" || !document.body) return;
    var wrapper = document.createElement("div");
    wrapper.innerHTML = [
      '<div id="cs-backup-modal" class="cs-backup-modal hidden" aria-hidden="true" role="dialog" aria-modal="true" aria-labelledby="cs-backup-title">',
      '  <div class="cs-backup-modal__card">',
      '    <div class="cs-backup-modal__head">',
      '      <div>',
      '        <p class="cs-backup-modal__kicker">Backup & Restore</p>',
      '        <h2 id="cs-backup-title">Keep your data on your device and move it safely.</h2>',
      '      </div>',
      '      <button id="cs-backup-close" class="cs-backup-close" type="button" aria-label="Close backup panel">×</button>',
      '    </div>',
      '    <p class="cs-backup-modal__intro">Export a full backup or settings-only file. Import it later on the same device or a new device. Google Drive upload is optional.</p>',
      '    <div class="cs-backup-grid">',
      '      <section class="cs-backup-block">',
      '        <h3>Export</h3>',
      '        <p class="cs-backup-copy">Download a file you control. This is separate from browser storage.</p>',
      '        <div class="cs-backup-actions">',
      '          <button id="cs-backup-export-full" class="cs-backup-btn cs-backup-btn--primary" type="button">Export Full Backup</button>',
      '          <button id="cs-backup-export-settings" class="cs-backup-btn" type="button">Export Settings Only</button>',
      '        </div>',
      '      </section>',
      '      <section class="cs-backup-block">',
      '        <h3>Import</h3>',
      '        <p class="cs-backup-copy">Restore a backup file from this device or another device.</p>',
      '        <div class="cs-backup-restore-mode">',
      '          <label><input type="radio" name="cs-backup-restore-mode" id="cs-backup-merge" value="merge" checked> Merge into current data</label>',
      '          <label><input type="radio" name="cs-backup-restore-mode" id="cs-backup-replace" value="replace"> Replace current local data</label>',
      '        </div>',
      '        <div class="cs-backup-actions">',
      '          <button id="cs-backup-import" class="cs-backup-btn" type="button">Import Backup File</button>',
      '        </div>',
      '      </section>',
      '      <section class="cs-backup-block">',
      '        <h3>Google Drive</h3>',
      '        <p class="cs-backup-copy">Optional. Upload the same backup file to your Google Drive so you can import it on another device later.</p>',
      '        <div class="cs-backup-actions">',
      '          <button id="cs-backup-drive-full" class="cs-backup-btn" type="button">Upload Full Backup to Drive</button>',
      '          <button id="cs-backup-drive-settings" class="cs-backup-btn" type="button">Upload Settings to Drive</button>',
      '        </div>',
      '      </section>',
      '    </div>',
      '    <div class="cs-backup-meta">',
      '      <p id="cs-backup-last" class="cs-backup-last"></p>',
      '      <p id="cs-backup-reminder" class="cs-backup-reminder"></p>',
      '      <p id="cs-backup-status" class="cs-backup-status" data-tone="info">Ready.</p>',
      '    </div>',
      '    <input id="cs-backup-file" type="file" accept=".json,application/json" hidden>',
      '  </div>',
      '</div>'
    ].join("");
    document.body.appendChild(wrapper.firstChild);
    ui.modal = document.getElementById("cs-backup-modal");
    ui.status = document.getElementById("cs-backup-status");
    ui.lastLine = document.getElementById("cs-backup-last");
    ui.reminder = document.getElementById("cs-backup-reminder");
    ui.fileInput = document.getElementById("cs-backup-file");
    ui.mergeRadio = document.getElementById("cs-backup-merge");
    ui.replaceRadio = document.getElementById("cs-backup-replace");
    ui.driveFull = document.getElementById("cs-backup-drive-full");
    ui.driveSettings = document.getElementById("cs-backup-drive-settings");

    document.getElementById("cs-backup-close").addEventListener("click", closeModal);
    ui.modal.addEventListener("click", function (event) {
      if (event.target === ui.modal) closeModal();
    });
    document.getElementById("cs-backup-export-full").addEventListener("click", function () { exportBackup("full"); });
    document.getElementById("cs-backup-export-settings").addEventListener("click", function () { exportBackup("settings"); });
    document.getElementById("cs-backup-import").addEventListener("click", function () {
      if (ui.fileInput) ui.fileInput.click();
    });
    ui.fileInput.addEventListener("change", function () {
      var file = ui.fileInput && ui.fileInput.files && ui.fileInput.files[0];
      if (!file) return;
      var reader = new FileReader();
      reader.onload = function () {
        try {
          var payload = JSON.parse(String(reader.result || ""));
          var mode = ui.replaceRadio && ui.replaceRadio.checked ? "replace" : "merge";
          var restored = restoreBackup(payload, mode);
          setStatus("Imported " + restored.count + " saved app items. Refresh this page to load the restored state.", "success");
        } catch (err) {
          setStatus(err && err.message ? err.message : "Backup import failed.", "error");
        } finally {
          ui.fileInput.value = "";
        }
      };
      reader.onerror = function () {
        setStatus("Backup file could not be read.", "error");
        ui.fileInput.value = "";
      };
      reader.readAsText(file);
    });
    ui.driveFull.addEventListener("click", function () { uploadBackupToDrive("full"); });
    ui.driveSettings.addEventListener("click", function () { uploadBackupToDrive("settings"); });
    refreshMetaUI();
  }

  function openModal() {
    ensureModal();
    ui.modal.classList.remove("hidden");
    ui.modal.setAttribute("aria-hidden", "false");
    refreshMetaUI();
  }

  function closeModal() {
    if (!ui.modal) return;
    ui.modal.classList.add("hidden");
    ui.modal.setAttribute("aria-hidden", "true");
  }

  function bindTriggers() {
    ensureModal();
    var buttons = document.querySelectorAll("[data-backup-open], #td-import-export");
    buttons.forEach(function (button) {
      if (button.__csBackupBound) return;
      button.__csBackupBound = true;
      button.addEventListener("click", function (event) {
        event.preventDefault();
        openModal();
      });
    });
  }

  function init() {
    if (typeof document === "undefined") return;
    if (root.CSGoogleAuth && typeof root.CSGoogleAuth.init === "function") {
      try { root.CSGoogleAuth.init(); } catch (_err) {}
    }
    ensureModal();
    bindTriggers();
    refreshMetaUI();
  }

  return {
    META_KEY: META_KEY,
    init: init,
    openModal: openModal,
    buildBackup: buildBackup,
    restoreBackup: restoreBackup,
    exportBackup: exportBackup,
    uploadBackupToDrive: uploadBackupToDrive,
    getTrackedKeys: getTrackedKeys
  };
});
