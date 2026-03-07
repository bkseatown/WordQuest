/**
 * google-workspace.js - Calendar, Drive, Docs, Sheets, Slides, and YouTube helpers
 *
 * Depends on: window.CSGoogleAuth
 * Exports: window.CSGoogleWorkspace
 */

(function googleWorkspaceModule(root) {
  "use strict";

  var CAL_BASE = "https://www.googleapis.com/calendar/v3";
  var DRIVE_BASE = "https://www.googleapis.com/drive/v3";
  var YT_BASE = "https://www.googleapis.com/youtube/v3";

  var SCOPES = {
    calendarReadonly: "https://www.googleapis.com/auth/calendar.events.readonly",
    driveFile: "https://www.googleapis.com/auth/drive.file",
    documents: "https://www.googleapis.com/auth/documents",
    spreadsheets: "https://www.googleapis.com/auth/spreadsheets",
    presentations: "https://www.googleapis.com/auth/presentations",
    youtubeReadonly: "https://www.googleapis.com/auth/youtube.readonly"
  };

  function getAuth() {
    return root.CSGoogleAuth || null;
  }

  function getConfig() {
    return root.CSGoogleAuthConfig || {};
  }

  function getToken() {
    var auth = getAuth();
    return auth && auth.getAccessToken ? auth.getAccessToken() : "";
  }

  function isSignedIn() {
    var auth = getAuth();
    return !!(auth && auth.isSignedIn && auth.isSignedIn());
  }

  function ensureSignedIn() {
    if (!isSignedIn()) return Promise.reject(new Error("Sign in with Google first."));
    return Promise.resolve();
  }

  function parseJsonSafe(response) {
    return response.text().then(function (text) {
      try {
        return text ? JSON.parse(text) : {};
      } catch (_err) {
        return { raw: text };
      }
    });
  }

  function apiFetch(url, options) {
    var token = getToken();
    if (!token) return Promise.reject(new Error("Google access token missing. Sign in again."));
    options = options || {};
    var headers = Object.assign({}, options.headers || {}, {
      Authorization: "Bearer " + token
    });
    return fetch(url, Object.assign({}, options, { headers: headers })).then(function (response) {
      if (response.status === 401) {
        throw new Error("Google session expired. Sign in again.");
      }
      if (response.status === 403) {
        throw new Error("Google API access denied. Enable the API and include the required scopes in js/google-auth-config.js.");
      }
      if (!response.ok) {
        return parseJsonSafe(response).then(function (payload) {
          var message = payload && payload.error && payload.error.message;
          throw new Error(message || ("Google API error " + response.status));
        });
      }
      return parseJsonSafe(response);
    });
  }

  function toIsoStart(date) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0).toISOString();
  }

  function toIsoEnd(date) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999).toISOString();
  }

  function pad2(value) {
    return value < 10 ? "0" + value : String(value);
  }

  function formatLocalTime(iso) {
    var date = new Date(iso);
    if (isNaN(date.getTime())) return "";
    var hours = date.getHours();
    var suffix = hours >= 12 ? "PM" : "AM";
    var hour12 = hours % 12 || 12;
    return hour12 + ":" + pad2(date.getMinutes()) + " " + suffix;
  }

  function inferArea(summary) {
    var lower = String(summary || "").toLowerCase();
    if (!lower) return "ela";
    if (lower.indexOf("math") >= 0 || lower.indexOf("bridges") >= 0 || lower.indexOf("numeracy") >= 0) return "math";
    if (lower.indexOf("writing") >= 0 || lower.indexOf("step up") >= 0) return "writing";
    if (lower.indexOf("humanities") >= 0 || lower.indexOf("history") >= 0) return "humanities";
    if (lower.indexOf("fundations") >= 0 || lower.indexOf("just words") >= 0 || lower.indexOf("ufli") >= 0 || lower.indexOf("heggerty") >= 0 || lower.indexOf("intervention") >= 0 || lower.indexOf("pullout") >= 0) return "intervention";
    return "ela";
  }

  function inferProgramId(summary, area) {
    var lower = String(summary || "").toLowerCase();
    if (lower.indexOf("el ") >= 0 || lower.indexOf("el education") >= 0) return "el-education";
    if (lower.indexOf("fishtank") >= 0) return "fishtank-ela";
    if (lower.indexOf("ufli") >= 0) return "ufli";
    if (lower.indexOf("fundations") >= 0) return "fundations";
    if (lower.indexOf("just words") >= 0) return "just-words";
    if (lower.indexOf("heggerty") >= 0 || lower.indexOf("haggerty") >= 0) return "haggerty";
    if (lower.indexOf("bridges") >= 0) return "bridges-math";
    if (lower.indexOf("step up") >= 0) return "step-up-writing";
    if (lower.indexOf("humanities") >= 0) return "sas-humanities-9";
    if (area === "math") return "bridges-math";
    if (area === "writing") return "step-up-writing";
    if (area === "humanities") return "sas-humanities-9";
    if (area === "intervention") return "ufli";
    return "fishtank-ela";
  }

  function normalizeCalendarEvent(event) {
    var startIso = event && event.start && (event.start.dateTime || event.start.date) || "";
    var endIso = event && event.end && (event.end.dateTime || event.end.date) || "";
    var summary = String(event && event.summary || "Untitled block").trim();
    var area = inferArea(summary);
    return {
      id: String(event && event.id || ""),
      summary: summary,
      description: String(event && event.description || ""),
      location: String(event && event.location || ""),
      start: startIso,
      end: endIso,
      timeLabel: startIso && endIso ? (formatLocalTime(startIso) + " - " + formatLocalTime(endIso)) : "All day",
      supportType: /pullout|tier 2|tier 3|intervention/i.test(summary) ? "pullout" : "push-in",
      area: area,
      programId: inferProgramId(summary, area)
    };
  }

  function buildContextTitle(context) {
    context = context || {};
    var bits = [];
    if (context.studentName) bits.push(context.studentName);
    if (context.blockLabel) bits.push(context.blockLabel);
    if (context.title) bits.push(context.title);
    else if (context.programLabel) bits.push(context.programLabel);
    return bits.filter(Boolean).join(" - ") || "Cornerstone MTSS Support";
  }

  function createWorkspaceFile(name, mimeType) {
    return ensureSignedIn().then(function () {
      return apiFetch(DRIVE_BASE + "/files?supportsAllDrives=true&fields=id,name,webViewLink,webContentLink", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name,
          mimeType: mimeType
        })
      });
    });
  }

  function uploadMultipartToDrive(name, mimeType, body, description) {
    return ensureSignedIn().then(function () {
      var boundary = "cornerstone_" + Date.now().toString(36);
      var metadata = {
        name: name,
        mimeType: mimeType
      };
      if (description) metadata.description = description;
      var payload =
        "--" + boundary + "\r\n" +
        "Content-Type: application/json; charset=UTF-8\r\n\r\n" +
        JSON.stringify(metadata) + "\r\n" +
        "--" + boundary + "\r\n" +
        "Content-Type: " + mimeType + "\r\n\r\n" +
        body + "\r\n" +
        "--" + boundary + "--";
      return apiFetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&supportsAllDrives=true&fields=id,name,webViewLink,webContentLink", {
        method: "POST",
        headers: {
          "Content-Type": "multipart/related; boundary=" + boundary
        },
        body: payload
      });
    });
  }

  function searchYouTube(query) {
    return ensureSignedIn().then(function () {
      return apiFetch(YT_BASE + "/search?part=snippet&type=video&maxResults=6&q=" + encodeURIComponent(query))
        .then(function (payload) {
          return (payload.items || []).map(function (item) {
            return {
              id: item.id && item.id.videoId || "",
              title: item.snippet && item.snippet.title || "Video",
              channel: item.snippet && item.snippet.channelTitle || "",
              description: item.snippet && item.snippet.description || "",
              url: item.id && item.id.videoId ? "https://www.youtube.com/watch?v=" + item.id.videoId : ""
            };
          }).filter(function (item) { return item.url; });
        });
    });
  }

  root.CSGoogleWorkspace = {
    SCOPES: SCOPES,

    isConfigured: function () {
      var auth = getAuth();
      return !!(auth && auth.isConfigured && auth.isConfigured());
    },

    isSignedIn: isSignedIn,

    connect: function () {
      var auth = getAuth();
      if (!auth || !auth.signIn) return Promise.reject(new Error("Google auth module unavailable."));
      return auth.signIn();
    },

    listTodayCalendarEvents: function () {
      var now = new Date();
      return ensureSignedIn().then(function () {
        var url = CAL_BASE + "/calendars/primary/events?singleEvents=true&orderBy=startTime&timeMin=" +
          encodeURIComponent(toIsoStart(now)) + "&timeMax=" + encodeURIComponent(toIsoEnd(now)) + "&maxResults=50";
        return apiFetch(url).then(function (payload) {
          return (payload.items || []).map(normalizeCalendarEvent);
        });
      });
    },

    importCalendarBlocks: function () {
      return root.CSGoogleWorkspace.listTodayCalendarEvents().then(function (events) {
        return events.map(function (event) {
          return {
            id: "gcal-" + String(event.id || Date.now()),
            label: event.summary,
            timeLabel: event.timeLabel,
            supportType: event.supportType,
            area: event.area,
            programId: event.programId,
            studentIds: [],
            source: "google-calendar",
            location: event.location || "",
            notes: event.description || ""
          };
        });
      });
    },

    createDoc: function (context) {
      return createWorkspaceFile(buildContextTitle(context) + " - Lesson Notes", "application/vnd.google-apps.document");
    },

    createSheet: function (context) {
      return createWorkspaceFile(buildContextTitle(context) + " - Progress Tracker", "application/vnd.google-apps.spreadsheet");
    },

    createSlideDeck: function (context) {
      return createWorkspaceFile(buildContextTitle(context) + " - Support Slides", "application/vnd.google-apps.presentation");
    },

    uploadJsonFile: function (name, payload, options) {
      var fileName = String(name || "cornerstone-backup.json").trim() || "cornerstone-backup.json";
      var text = JSON.stringify(payload || {}, null, 2);
      return uploadMultipartToDrive(fileName, "application/json", text, options && options.description);
    },

    searchDriveFiles: function (query) {
      query = String(query || "").trim();
      return ensureSignedIn().then(function () {
        var q = query
          ? "trashed=false and name contains '" + query.replace(/'/g, "\\'") + "'"
          : "trashed=false";
        var url = DRIVE_BASE + "/files?supportsAllDrives=true&includeItemsFromAllDrives=true&fields=files(id,name,webViewLink,mimeType,modifiedTime)&pageSize=8&orderBy=modifiedTime desc&q=" +
          encodeURIComponent(q);
        return apiFetch(url).then(function (payload) {
          return payload.files || [];
        });
      });
    },

    searchYouTube: searchYouTube,

    openCalendarUrl: function () {
      return "https://calendar.google.com/calendar/u/0/r/day";
    },

    getApiKeyConfigured: function () {
      return !!String(getConfig().apiKey || "").trim();
    }
  };
})(window);
