/**
 * google-classroom.js — Google Classroom roster sync
 *
 * Requires: CSGoogleAuth (google-auth.js) to be initialized first.
 * Fetches teacher's courses and student rosters via Classroom API.
 * Syncs students directly into the MTSS evidence store.
 *
 * Usage:
 *   CSGoogleClassroom.fetchCourses()
 *     → Promise<[{ id, name, section, studentCount }]>
 *
 *   CSGoogleClassroom.fetchRoster(courseId)
 *     → Promise<[{ id, name, email }]>
 *
 *   CSGoogleClassroom.syncRosterToHub(courseId, options)
 *     → Promise<{ added, skipped, total }>
 *
 * Exports: window.CSGoogleClassroom
 */

(function googleClassroomModule(root) {
  "use strict";

  var BASE = "https://classroom.googleapis.com/v1";

  /* ── API request helper ─────────────────────────────────── */
  function apiGet(path) {
    var token = root.CSGoogleAuth && root.CSGoogleAuth.getAccessToken();
    if (!token) return Promise.reject(new Error("Not signed in to Google. Please sign in first."));
    return fetch(BASE + path, {
      headers: { Authorization: "Bearer " + token }
    }).then(function (res) {
      if (res.status === 401) {
        /* Token expired — prompt re-auth */
        return Promise.reject(new Error("Google session expired. Please sign in again."));
      }
      if (res.status === 403) {
        return Promise.reject(new Error(
          "Google Classroom access denied. Make sure you enabled the Classroom API " +
          "and granted classroom.courses.readonly + classroom.rosters.readonly scopes."
        ));
      }
      if (!res.ok) {
        return res.json().then(function (e) {
          throw new Error("Classroom API error: " + (e.error && e.error.message || res.status));
        });
      }
      return res.json();
    });
  }

  /* ── Normalize a Classroom student object ───────────────── */
  function normalizeStudent(s) {
    var profile = s.profile || {};
    var name    = profile.name && profile.name.fullName || profile.name || "";
    var email   = (profile.emailAddress || "").toLowerCase();
    var id      = s.userId || ("gc_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7));
    return { id: "gc_" + id, name: name, email: email, source: "google-classroom" };
  }

  /* ── Public API ─────────────────────────────────────────── */
  root.CSGoogleClassroom = {

    /**
     * List teacher's active courses
     * @returns Promise<Array<{ id, name, section, studentCount, courseState }>>
     */
    fetchCourses: function () {
      return apiGet("/courses?teacherId=me&courseStates=ACTIVE&pageSize=50")
        .then(function (data) {
          return (data.courses || []).map(function (c) {
            return {
              id:           c.id,
              name:         c.name || "Unnamed course",
              section:      c.section || "",
              studentCount: null,   /* not returned by this endpoint */
              courseState:  c.courseState
            };
          });
        });
    },

    /**
     * Fetch student roster for a course
     * @param {string} courseId
     * @returns Promise<Array<{ id, name, email }>>
     */
    fetchRoster: function (courseId) {
      if (!courseId) return Promise.reject(new Error("courseId required"));
      return apiGet("/courses/" + encodeURIComponent(courseId) + "/students?pageSize=200")
        .then(function (data) {
          return (data.students || []).map(normalizeStudent);
        });
    },

    /**
     * Sync roster from a Google Classroom course into the hub
     * @param {string} courseId
     * @param {object} [opts] - { gradeOverride, tagOverride }
     * @returns Promise<{ added, skipped, total }>
     */
    syncRosterToHub: function (courseId, opts) {
      var options = opts || {};
      return root.CSGoogleClassroom.fetchRoster(courseId)
        .then(function (students) {
          var Evidence = root.CSEvidence;
          if (!Evidence || typeof Evidence.upsertStudent !== "function") {
            return Promise.reject(new Error("Evidence store not available"));
          }
          var existing = [];
          try {
            existing = (Evidence.listCaseload && Evidence.listCaseload()) || [];
          } catch (_e) {}
          var existingEmails = {};
          existing.forEach(function (s) { if (s.email) existingEmails[s.email] = true; });

          var added   = 0;
          var skipped = 0;

          students.forEach(function (s) {
            if (s.email && existingEmails[s.email]) {
              skipped++;
              return;
            }
            try {
              Evidence.upsertStudent({
                id:        s.id,
                name:      s.name,
                email:     s.email,
                gradeBand: options.gradeOverride || "",
                tags:      options.tagOverride ? [options.tagOverride] : ["google-classroom"],
                source:    "google-classroom",
                syncedAt:  new Date().toISOString()
              });
              added++;
            } catch (_e) {
              console.warn("[CSGoogleClassroom] Failed to add student:", s.name, _e);
            }
          });

          /* Track the sync event */
          window.dispatchEvent(new CustomEvent("cs-classroom-synced", {
            detail: { courseId: courseId, added: added, skipped: skipped, total: students.length }
          }));

          return { added: added, skipped: skipped, total: students.length };
        });
    },

    /**
     * Check if Classroom API is available (requires OAuth + Classroom scope)
     */
    isAvailable: function () {
      return !!(root.CSGoogleAuth && root.CSGoogleAuth.isSignedIn());
    }
  };

})(window);
