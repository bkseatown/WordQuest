/**
 * google-auth.js — Google Identity Services (GIS) authentication
 *
 * COMPLETELY FREE — no billing, no Firebase, no server needed.
 * Works with personal Gmail AND school Google Workspace accounts
 * (e.g. teacher@sas.edu.sg).
 *
 * ONE-TIME SETUP (2 minutes):
 * ─────────────────────────────────────────────────────────────────
 * 1. Go to https://console.cloud.google.com
 * 2. Create a project (e.g. "Cornerstone MTSS")
 * 3. APIs & Services → Enable APIs:
 *    • "Google Identity" (free, always-on)
 *    • "Google Classroom API" (free, for roster sync)
 *    • "Google Drive API" (free, for video upload)
 * 4. APIs & Services → Credentials → + Create Credentials
 *    → OAuth 2.0 Client ID → Web Application
 * 5. Authorized JavaScript origins — add ALL of these:
 *    • http://localhost
 *    • http://localhost:4242
 *    • http://127.0.0.1
 *    • http://127.0.0.1:4242
 *    • file://   (for opening index.html directly)
 * 6. Copy the Client ID (looks like: 1234567890-abc...apps.googleusercontent.com)
 * 7. Create the file  js/google-auth-config.js  with:
 *
 *    window.CSGoogleAuthConfig = {
 *      clientId: "YOUR_CLIENT_ID_HERE.apps.googleusercontent.com",
 *      schoolDomains: ["sas.edu.sg"],   // add your school domain(s)
 *      scopes: [
 *        "https://www.googleapis.com/auth/classroom.courses.readonly",
 *        "https://www.googleapis.com/auth/classroom.rosters.readonly",
 *        "https://www.googleapis.com/auth/drive.file"
 *      ]
 *    };
 *
 * 8. That's it! The app will show "Sign in with Google" automatically.
 * ─────────────────────────────────────────────────────────────────
 *
 * Exports: window.CSGoogleAuth
 *   .init()              → void  (call once on page load)
 *   .signIn()            → Promise<User>
 *   .signOut()           → void
 *   .getCurrentUser()    → User | null
 *   .getAccessToken()    → string | null
 *   .isSignedIn()        → boolean
 *   .onAuthChange(fn)    → unsubscribe function
 *
 * User shape: { name, email, picture, domain, isSchoolAccount, tokenExpiry }
 */

(function googleAuthModule(root) {
  "use strict";

  var STORAGE_KEY = "cs.google.auth.v1";
  var TOKEN_KEY   = "cs.google.token.v1";
  var GIS_CDN     = "https://accounts.google.com/gsi/client";

  var _listeners = [];
  var _user      = null;
  var _token     = null;
  var _client    = null;   // GIS TokenClient
  var _gisLoaded = false;
  var _resolveSignIn = null;
  var _rejectSignIn  = null;

  /* ── Config helpers ─────────────────────────────────────── */
  function cfg() { return root.CSGoogleAuthConfig || null; }

  function isConfigured() {
    var c = cfg();
    return !!(c && c.clientId && c.clientId !== "YOUR_CLIENT_ID_HERE.apps.googleusercontent.com");
  }

  function schoolDomains() {
    var c = cfg();
    return (c && c.schoolDomains) || [];
  }

  function scopes() {
    var c = cfg();
    var defaultScopes = [
      "https://www.googleapis.com/auth/classroom.courses.readonly",
      "https://www.googleapis.com/auth/classroom.rosters.readonly"
    ];
    return (c && c.scopes) ? c.scopes.join(" ") : defaultScopes.join(" ");
  }

  /* ── User helpers ───────────────────────────────────────── */
  function detectSchoolAccount(email) {
    var domain = (email || "").split("@")[1] || "";
    var configDomains = schoolDomains();
    if (configDomains.some(function (d) { return domain === d || domain.endsWith("." + d); })) return true;
    return domain.includes(".edu") || domain.endsWith(".ac.uk") || domain.endsWith(".school");
  }

  function buildUser(profile, tokenExpiry) {
    var email = profile.email || profile.getEmail && profile.getEmail() || "";
    var name  = profile.name  || profile.getName  && profile.getName()  || email.split("@")[0];
    var pic   = profile.picture || profile.getImageUrl && profile.getImageUrl() || "";
    return {
      name:            name,
      email:           email,
      picture:         pic,
      domain:          (email.split("@")[1] || ""),
      isSchoolAccount: detectSchoolAccount(email),
      tokenExpiry:     tokenExpiry || (Date.now() + 3600 * 1000)
    };
  }

  /* ── Persist / restore ──────────────────────────────────── */
  function saveUser(user) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(user)); } catch (_e) {}
  }

  function saveToken(token) {
    _token = token;
    try { localStorage.setItem(TOKEN_KEY, token); } catch (_e) {}
  }

  function loadUser() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      var user = JSON.parse(raw);
      if (user.tokenExpiry && user.tokenExpiry < Date.now()) {
        clearUser();
        return null;
      }
      return user;
    } catch (_e) { return null; }
  }

  function clearUser() {
    _user  = null;
    _token = null;
    try { localStorage.removeItem(STORAGE_KEY); } catch (_e) {}
    try { localStorage.removeItem(TOKEN_KEY);   } catch (_e) {}
  }

  /* ── Notify listeners ───────────────────────────────────── */
  function emit(user) {
    _user = user;
    window.dispatchEvent(new CustomEvent("cs-auth-change", { detail: { user: user } }));
    _listeners.forEach(function (fn) { try { fn(user); } catch (_e) {} });
  }

  /* ── Load GIS library ───────────────────────────────────── */
  function loadGIS() {
    return new Promise(function (resolve, reject) {
      if (root.google && root.google.accounts) { resolve(); return; }
      if (_gisLoaded) { resolve(); return; }
      var existing = document.getElementById("cs-gis-script");
      if (existing) { existing.addEventListener("load", resolve); return; }
      var script  = document.createElement("script");
      script.id   = "cs-gis-script";
      script.src  = GIS_CDN;
      script.async = true;
      script.onload  = function () { _gisLoaded = true; resolve(); };
      script.onerror = function () { reject(new Error("Failed to load Google Identity Services. Check internet connection.")); };
      document.head.appendChild(script);
    });
  }

  /* ── Build TokenClient ──────────────────────────────────── */
  function buildClient() {
    if (!root.google || !root.google.accounts) return null;
    return root.google.accounts.oauth2.initTokenClient({
      client_id: cfg().clientId,
      scope: scopes(),
      callback: function (response) {
        if (response.error) {
          if (_rejectSignIn) _rejectSignIn(new Error(response.error));
          _rejectSignIn = _resolveSignIn = null;
          return;
        }
        /* Token granted — decode JWT id_token or use tokeninfo endpoint */
        var token = response.access_token;
        saveToken(token);
        /* Fetch user profile from Google */
        fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
          headers: { Authorization: "Bearer " + token }
        }).then(function (r) { return r.json(); })
          .then(function (profile) {
            var expiry = Date.now() + ((response.expires_in || 3600) * 1000);
            var user   = buildUser(profile, expiry);
            saveUser(user);
            emit(user);
            if (_resolveSignIn) _resolveSignIn(user);
            _resolveSignIn = _rejectSignIn = null;
          }).catch(function (err) {
            if (_rejectSignIn) _rejectSignIn(err);
            _resolveSignIn = _rejectSignIn = null;
          });
      }
    });
  }

  /* ── Public API ─────────────────────────────────────────── */
  root.CSGoogleAuth = {

    /** Call once at page load */
    init: function () {
      if (!isConfigured()) {
        console.info("[CSGoogleAuth] Not configured — see js/google-auth-config.js setup instructions.");
        return;
      }
      /* Try to restore persisted session */
      var saved = loadUser();
      if (saved) {
        _user = saved;
        try { _token = localStorage.getItem(TOKEN_KEY); } catch (_e) {}
        emit(saved);
      }
      /* Load GIS in background so it's ready */
      loadGIS().then(function () {
        _client = buildClient();
        console.log("[CSGoogleAuth] Ready. User:", _user ? _user.email : "not signed in");
      }).catch(function (err) {
        console.warn("[CSGoogleAuth] GIS load failed:", err.message);
      });
    },

    /** Trigger Google sign-in popup */
    signIn: function () {
      if (!isConfigured()) {
        return Promise.reject(new Error(
          "Google auth not configured. Create js/google-auth-config.js with your Client ID.\n" +
          "See js/auth/google-auth.js setup instructions (top of file)."
        ));
      }
      return loadGIS().then(function () {
        if (!_client) _client = buildClient();
        return new Promise(function (resolve, reject) {
          _resolveSignIn = resolve;
          _rejectSignIn  = reject;
          _client.requestAccessToken({ prompt: "consent" });
        });
      });
    },

    /** Sign out and clear session */
    signOut: function () {
      var token = _token;
      clearUser();
      if (root.google && root.google.accounts && token) {
        root.google.accounts.oauth2.revoke(token, function () {});
      }
      emit(null);
    },

    /** Get current user or null */
    getCurrentUser: function () { return _user; },

    /** Get current access token or null */
    getAccessToken: function () { return _token; },

    /** Is a user signed in? */
    isSignedIn: function () { return !!_user && _user.tokenExpiry > Date.now(); },

    /** Subscribe to auth state changes */
    onAuthChange: function (fn) {
      _listeners.push(fn);
      /* Immediately call with current state */
      try { fn(_user); } catch (_e) {}
      return function () {
        _listeners = _listeners.filter(function (l) { return l !== fn; });
      };
    },

    /** Is Google auth configured? */
    isConfigured: isConfigured,

    /** Setup instructions (for display in setup panel) */
    getSetupInstructions: function () {
      return [
        "1. Go to console.cloud.google.com → Create project",
        "2. Enable: Google Identity + Classroom API + Drive API",
        "3. Credentials → OAuth 2.0 Client ID → Web Application",
        "4. Add origins: http://localhost:4242 and http://127.0.0.1:4242",
        "5. Copy Client ID",
        "6. Create js/google-auth-config.js with window.CSGoogleAuthConfig = { clientId: '...' }"
      ];
    }
  };

})(window);
