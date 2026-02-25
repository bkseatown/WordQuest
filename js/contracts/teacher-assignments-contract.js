(function () {
  'use strict';

  const storageKeys = Object.freeze({
    groupPlan: 'wq_v2_group_plan_state_v1',
    studentTargetLocks: 'wq_v2_student_target_locks_v1'
  });

  const events = Object.freeze({
    assignmentUpdated: 'wq:assignment-updated',
    studentLockUpdated: 'wq:student-lock-updated'
  });

  window.WQTeacherAssignmentsContract = Object.freeze({
    storageKeys,
    events
  });
})();
