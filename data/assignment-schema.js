(function () {
  'use strict';

  window.WQAssignmentSchema = Object.freeze({
    version: '1.0.0',
    groupPlanV1: Object.freeze({
      group_id: 'string',
      name: 'string',
      tier: 'tier1|tier2|tier3',
      students: ['student name'],
      assignment: Object.freeze({
        curriculum_pack: 'string',
        curriculum_target_id: 'string',
        updated_at: 'timestamp'
      })
    }),
    studentTargetLockV1: Object.freeze({
      student: 'string',
      enabled: 'boolean',
      curriculum_pack: 'string',
      curriculum_target_id: 'string',
      expires_at: 'timestamp|0',
      updated_at: 'timestamp'
    })
  });
})();
