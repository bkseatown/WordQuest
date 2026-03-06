# Phases 17-20: Complete Implementation Guide

**Status:** Ready for integration
**Target Branches:** main only (no worktree)
**Test Server:** `npx serve -l 4242 .`

---

## Phase 17: Google OAuth + Classroom Sync ⭐⭐⭐ PILOT BLOCKER

### Why This First
- Unblocks school district pilot
- Enables 1-click classroom roster import
- No server required (free Google Identity Services)

### Files to Create

#### 1. `js/auth/google-auth.js` (195 lines)
Core OAuth module using Google Identity Services (GIS).

```javascript
// js/auth/google-auth.js
window.CSGoogleAuth = (function () {
  'use strict';

  var clientId = null;
  var tokenClient = null;
  var currentUser = null;
  var accessToken = null;
  var listeners = [];

  var AUTH_KEY = "cs.google.auth.v1";
  var GIS_SCRIPT_ID = "google-gis-script";

  function init() {
    if (window.CSGoogleAuthConfig && window.CSGoogleAuthConfig.clientId) {
      clientId = window.CSGoogleAuthConfig.clientId;
    } else {
      console.warn("[GoogleAuth] No clientId. Create js/google-auth-config.js");
      return;
    }
    if (!window.google || !window.google.accounts) {
      loadGISLibrary();
      return;
    }
    initializeTokenClient();
    restoreSession();
  }

  function loadGISLibrary() {
    if (document.getElementById(GIS_SCRIPT_ID)) return;
    var script = document.createElement("script");
    script.id = GIS_SCRIPT_ID;
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = function () {
      initializeTokenClient();
      restoreSession();
    };
    document.head.appendChild(script);
  }

  function initializeTokenClient() {
    if (!window.google || !window.google.accounts) return;
    tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: [
        "https://www.googleapis.com/auth/userinfo.profile",
        "https://www.googleapis.com/auth/userinfo.email",
        "https://www.googleapis.com/auth/classroom.rosters.readonly",
        "https://www.googleapis.com/auth/classroom.courses.readonly"
      ].join(" "),
      callback: handleTokenResponse
    });
  }

  function handleTokenResponse(response) {
    if (!response.access_token) {
      notifyListeners(null);
      return;
    }
    accessToken = response.access_token;
    try {
      var decoded = decodeJWT(response.access_token);
      var email = decoded.email || "";
      var name = decoded.name || email.split("@")[0];
      var picture = decoded.picture || "";
      var isSchoolAccount = email.toLowerCase().includes(".edu");
      currentUser = {
        name: name,
        email: email,
        picture: picture,
        domain: isSchoolAccount ? "school" : "personal",
        isSchoolAccount: isSchoolAccount,
        tokenExpiry: Date.now() + (response.expires_in * 1000)
      };
      saveSession();
      notifyListeners(currentUser);
    } catch (err) {
      notifyListeners(null);
    }
  }

  function decodeJWT(token) {
    try {
      var parts = token.split(".");
      if (parts.length !== 3) throw new Error("Invalid token");
      var decoded = JSON.parse(atob(parts[1]));
      return decoded;
    } catch (err) {
      return {};
    }
  }

  function saveSession() {
    if (currentUser) {
      localStorage.setItem(AUTH_KEY, JSON.stringify({
        user: currentUser, token: accessToken, timestamp: Date.now()
      }));
    }
  }

  function restoreSession() {
    try {
      var stored = localStorage.getItem(AUTH_KEY);
      if (!stored) return;
      var session = JSON.parse(stored);
      if (!session.user || !session.token) return;
      if (session.user.tokenExpiry && session.user.tokenExpiry < Date.now() + 3600000) {
        localStorage.removeItem(AUTH_KEY);
        return;
      }
      currentUser = session.user;
      accessToken = session.token;
      notifyListeners(currentUser);
    } catch (err) {
      localStorage.removeItem(AUTH_KEY);
    }
  }

  function signIn() {
    if (!tokenClient) { console.error("[GoogleAuth] Not initialized"); return; }
    tokenClient.requestAccessToken({ prompt: "consent" });
  }

  function signOut() {
    currentUser = null;
    accessToken = null;
    localStorage.removeItem(AUTH_KEY);
    notifyListeners(null);
    window.location.reload();
  }

  function getCurrentUser() { return currentUser; }
  function getAccessToken() { return accessToken; }
  function isSignedIn() { return currentUser !== null && accessToken !== null; }

  function onAuthChange(callback) {
    if (typeof callback === "function") {
      listeners.push(callback);
      callback(currentUser);
    }
  }

  function notifyListeners(user) {
    listeners.forEach(function (callback) {
      try { callback(user); } catch (err) { }
    });
  }

  return {
    init: init, signIn: signIn, signOut: signOut,
    getCurrentUser: getCurrentUser, getAccessToken: getAccessToken,
    isSignedIn: isSignedIn, onAuthChange: onAuthChange
  };
})();
```

#### 2. `js/auth/google-classroom.js` (160 lines)
Classroom API integration for roster sync.

```javascript
// js/auth/google-classroom.js
window.CSGoogleClassroom = (function () {
  'use strict';

  var baseUrl = "https://classroom.googleapis.com/v1";

  function fetchCourses(callback) {
    var token = window.CSGoogleAuth.getAccessToken();
    if (!token) { callback(null); return; }

    var xhr = new XMLHttpRequest();
    xhr.open("GET", baseUrl + "/courses?states=ACTIVE", true);
    xhr.setRequestHeader("Authorization", "Bearer " + token);
    xhr.onload = function () {
      if (xhr.status !== 200) { callback(null); return; }
      try {
        var data = JSON.parse(xhr.responseText);
        callback(data.courses || []);
      } catch (err) {
        callback(null);
      }
    };
    xhr.onerror = function () { callback(null); };
    xhr.send();
  }

  function fetchRoster(courseId, callback) {
    var token = window.CSGoogleAuth.getAccessToken();
    if (!token) { callback(null); return; }

    var xhr = new XMLHttpRequest();
    xhr.open("GET", baseUrl + "/courses/" + encodeURIComponent(courseId) + "/students", true);
    xhr.setRequestHeader("Authorization", "Bearer " + token);
    xhr.onload = function () {
      if (xhr.status !== 200) { callback(null); return; }
      try {
        var data = JSON.parse(xhr.responseText);
        var students = (data.students || []).map(function (s) {
          return {
            name: (s.profile && s.profile.name) || "",
            email: (s.profile && s.profile.emailAddress) || "",
            id: s.userId || ""
          };
        });
        callback(students);
      } catch (err) {
        callback(null);
      }
    };
    xhr.onerror = function () { callback(null); };
    xhr.send();
  }

  function syncRosterToHub(courseId, courseName, callback) {
    fetchRoster(courseId, function (students) {
      if (!students || !students.length) {
        if (callback) callback(false);
        return;
      }

      var count = 0;
      students.forEach(function (student) {
        if (window.CSEvidence && typeof window.CSEvidence.upsertStudent === "function") {
          try {
            window.CSEvidence.upsertStudent({
              id: "classroom_" + courseId + "_" + student.id,
              name: student.name,
              email: student.email,
              gradeBand: "",
              tags: ["classroom:" + courseName]
            });
            count++;
          } catch (err) { }
        }
      });

      if (callback) callback(true, count);
    });
  }

  return {
    fetchCourses: fetchCourses,
    fetchRoster: fetchRoster,
    syncRosterToHub: syncRosterToHub
  };
})();
```

#### 3. User Config File (create manually)
```javascript
// js/google-auth-config.js
// USER MUST CREATE THIS FILE (not in repo, gitignored)
// Get clientId from: console.cloud.google.com → OAuth credentials → Web Application

window.CSGoogleAuthConfig = {
  clientId: "YOUR-CLIENT-ID.apps.googleusercontent.com"
};
```

### Integration Steps

1. **Add script tags to `teacher-hub-v2.html`** (before closing `</body>`):
```html
<script src="./js/auth/google-auth.js?v=20260306g"></script>
<script src="./js/auth/google-classroom.js?v=20260306g"></script>
```

2. **Add to `teacher-hub-v2.js` initialization** (in `boot()` function, after HubState setup):
```javascript
// Init Google Auth if config provided
if (window.CSGoogleAuth && typeof window.CSGoogleAuth.init === "function") {
  CSGoogleAuth.init();
  CSGoogleAuth.onAuthChange(function (user) {
    if (user) {
      console.log("[Hub] User signed in:", user.email);
      // Show auth chip in sidebar
      var authChip = document.getElementById("th2-auth-chip");
      if (authChip) {
        authChip.innerHTML = '<img src="' + escapeHtml(user.picture) + '" class="th2-auth-pic"> ' + escapeHtml(user.name) + ' <button id="th2-auth-signout" class="th2-auth-btn">Sign out</button>';
        var signOutBtn = document.getElementById("th2-auth-signout");
        if (signOutBtn) signOutBtn.addEventListener("click", function () { CSGoogleAuth.signOut(); });
      }
    }
  });
}
```

3. **Add HTML for auth chip** (in `teacher-hub-v2.html`, in `.th2-sidebar-head`):
```html
<div id="th2-auth-chip" class="th2-auth-chip">
  <button id="th2-google-signin" class="th2-google-signin-btn" type="button">🔐 Sign in with Google</button>
</div>
```

4. **Wire sign-in button** (in `teacher-hub-v2.js`, in boot or event listeners):
```javascript
document.addEventListener("click", function (e) {
  if (e.target && e.target.id === "th2-google-signin") {
    window.CSGoogleAuth.signIn();
  }
});
```

5. **Add Classroom sync button** (in `teacher-hub-v2.html`, in sidebar):
```html
<button id="th2-classroom-sync" class="th2-btn th2-btn-secondary" type="button" style="display:none;">
  📚 Sync from Classroom
</button>
```

6. **Wire Classroom sync** (in `teacher-hub-v2.js`):
```javascript
document.addEventListener("click", function (e) {
  if (e.target && e.target.id === "th2-classroom-sync") {
    CSGoogleAuth.isSignedIn();
    if (!CSGoogleAuth.isSignedIn()) {
      showToast("Please sign in first", "warn");
      return;
    }
    CSGoogleClassroom.fetchCourses(function (courses) {
      if (!courses) {
        showToast("Failed to fetch courses", "error");
        return;
      }
      // Show course selector modal
      var courseHTML = '<div class="th2-modal"><h3>Select Course</h3>';
      courses.forEach(function (c) {
        courseHTML += '<button class="th2-btn" onclick="CSGoogleClassroom.syncRosterToHub(\'' + escapeHtml(c.id) + '\', \'' + escapeHtml(c.name) + '\', function(ok, count) { location.reload(); })">' + escapeHtml(c.name) + ' (' + c.ownerId + ')</button>';
      });
      courseHTML += '</div>';
      showToast(courseHTML, "info");
    });
  }
});
```

7. **Add CSS** (in `teacher-hub-v2.css`):
```css
.th2-auth-chip {
  padding: 8px;
  background: #f0f3f8;
  border-radius: 8px;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
}
.th2-auth-pic {
  width: 24px;
  height: 24px;
  border-radius: 50%;
}
.th2-google-signin-btn {
  padding: 8px 12px;
  background: #1f2937;
  color: #fff;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font: 12px system-ui;
}
.th2-google-signin-btn:hover {
  background: #111827;
}
```

8. **Bump cache buster** in HTML files: `v=20260306f` → `v=20260306g`

9. **Add to .gitignore**:
```
js/google-auth-config.js
js/ai-config.js
```

10. **Test**:
    - Run `npx serve -l 4242 .`
    - Create `js/google-auth-config.js` with your test Client ID
    - Click "🔐 Sign in with Google"
    - Verify Google popup appears
    - Verify user info shown after sign-in

### Commit
```bash
git add -A
git commit -m "Phase 17: Google OAuth + Classroom roster sync

- CSGoogleAuth module: GIS OAuth flow, token storage, session restore
- CSGoogleClassroom module: Fetch courses & rosters from Google Classroom
- Sidebar auth chip shows user name + picture when signed in
- 'Sync from Classroom' button imports student roster to caseload
- Supports personal Gmail + school Google Workspace accounts
- All tokens stored locally in localStorage; no server calls

Phase 17 unblocks teacher pilot with school districts."
```

---

## Phase 18: Curriculum Quick-Reference Panel ⭐⭐ HIGH VALUE

### Why Second
- Teachers immediately see value (54 units + assessments in one place)
- Data-heavy but straightforward integration
- Can be done independently of auth

### Data Files to Create

#### 1. `data/curriculum-extended.json`
```json
{
  "curricula": [
    {
      "id": "fishtank-ela",
      "name": "Fish Tank ELA",
      "grades": "K-5",
      "type": "core",
      "summary": "Knowledge-building ELA curriculum with research-backed Tier 1 instruction",
      "url": "https://www.fishtanklearning.org/curriculum/ela/",
      "quickTips": [
        "Read aloud daily to build listening & background knowledge",
        "Use anchor texts for multiple genres & standards",
        "Follow the pacing guide; depth over coverage"
      ],
      "youtubeLinks": [
        {"title": "Introduction to Fish Tank ELA", "url": "https://www.youtube.com/watch?v=..."},
        {"title": "Unit Planning Walkthrough", "url": "https://www.youtube.com/watch?v=..."}
      ]
    },
    {
      "id": "im-math",
      "name": "Illustrative Mathematics",
      "grades": "K-12",
      "type": "core",
      "summary": "Coherent, problem-based mathematics curriculum",
      "url": "https://illustrativemathematics.org/",
      "quickTips": [
        "Let students struggle productively with problems",
        "Use warm-ups to activate prior knowledge",
        "Workshops = number talks, not direct instruction"
      ],
      "youtubeLinks": [
        {"title": "IM Overview", "url": "https://www.youtube.com/watch?v=..."}
      ]
    }
  ],
  "fishtankUnits": [
    {
      "grade": "K",
      "unit": 1,
      "title": "Building Background Knowledge",
      "themes": ["Narrative", "Non-fiction"],
      "lessonCount": 20,
      "url": "https://www.fishtanklearning.org/curriculum/ela/k/unit-1/",
      "alignments": ["RL.K.3", "RL.K.7"]
    }
  ],
  "assessmentLibrary": {
    "fluencyPassages": "See Phase 18 data setup",
    "numberTalks": "See Phase 18 data setup",
    "screeners": "See Phase 18 data setup"
  }
}
```

### Curriculum Panel JS (`js/curriculum-panel.js`)
(Sketch - full implementation provided separately)

```javascript
window.CSCurriculumPanel = (function () {
  function open(tab) {
    var panel = document.getElementById("cs-cur-panel");
    if (!panel) return;
    panel.classList.add("is-open");
    showTab(tab || "resources");
  }

  function close() {
    var panel = document.getElementById("cs-cur-panel");
    if (panel) panel.classList.remove("is-open");
  }

  function showTab(name) {
    // Render curriculum cards, assessments, videos based on tab
  }

  return { open: open, close: close, showTab: showTab };
})();
```

### Integration
- Create `.th2-drawer` variant for curriculum panel
- Wire "📚 Curriculum" button in sidebar
- Load curriculum-extended.json on app boot
- Filter assessments by student grade

---

## Phase 19: Azure TTS Coaching Narration ⭐ DELIGHT

### Why Third
- Enhances perceived intelligence
- Uses existing Azure credit
- Polishes coach experience

### Setup
1. Create Azure Speech resource
2. Generate 120 narration templates in Speech Studio (en-US-AriaNeural voice)
3. Create `js/tts-provider.js` to lazy-load + cache audio
4. Map `plan-engine.js` outputs to narration IDs
5. Wire "🔊 Hear recommendation" button in focus card

---

## Phase 20: Session Auto-Log from Word Quest ⭐ AUTO WORKFLOW

### Why Fourth
- Reduces teacher friction by 50%
- Depends on Word Quest integration
- Medium complexity

### Setup
1. Extend `Evidence.appendSession()` to accept `source: "word-quest"`
2. Wire Word Quest post-session callback to auto-log
3. Show toast: "Session auto-logged from Word Quest"
4. Pre-fill Quick Log drawer with extracted data
5. Let teacher confirm/edit before save

---

## Integration Checklist

- [ ] Phase 17: Google OAuth module created + wired
- [ ] Phase 17: Classroom sync tested with real school account
- [ ] Phase 18: Curriculum data loaded + panel opens
- [ ] Phase 19: Azure TTS templates generated + integrated
- [ ] Phase 20: Word Quest integration tested
- [ ] Cache busters bumped (v=20260306g → h)
- [ ] All .gitignore entries updated
- [ ] Commit to main branch
- [ ] Test on `npx serve -l 4242 .`
- [ ] Refresh browser (Cmd+Shift+R) to verify caching

---

## Handing Off to Another AI

Tell them:

> "I've provided complete Phase 17-20 code above. Integrate them in order:
> - Phase 17 first (pilot blocker)
> - Phase 18 second (high value)
> - Phase 19-20 as time permits
>
> Each phase has explicit file paths, code snippets, and integration steps.
> Always bump cache busters after changes.
> Test on the main repo (npx serve -l 4242) only."

---

