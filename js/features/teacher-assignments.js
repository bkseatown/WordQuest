(function () {
  'use strict';

  const FALLBACK_STORAGE_KEYS = Object.freeze({
    groupPlan: 'wq_v2_group_plan_state_v1',
    studentTargetLocks: 'wq_v2_student_target_locks_v1'
  });

  const FALLBACK_EVENTS = Object.freeze({
    assignmentUpdated: 'wq:assignment-updated',
    studentLockUpdated: 'wq:student-lock-updated'
  });

  function getContract(contract) {
    const source = contract && typeof contract === 'object'
      ? contract
      : (window.WQTeacherAssignmentsContract || {});
    return {
      storageKeys: {
        groupPlan: source.storageKeys?.groupPlan || FALLBACK_STORAGE_KEYS.groupPlan,
        studentTargetLocks: source.storageKeys?.studentTargetLocks || FALLBACK_STORAGE_KEYS.studentTargetLocks
      },
      events: {
        assignmentUpdated: source.events?.assignmentUpdated || FALLBACK_EVENTS.assignmentUpdated,
        studentLockUpdated: source.events?.studentLockUpdated || FALLBACK_EVENTS.studentLockUpdated
      }
    };
  }

  function emitNamedEvent(eventName, detail) {
    if (!eventName) return;
    window.dispatchEvent(new CustomEvent(eventName, { detail }));
  }

  function bindUI(deps) {
    if (!deps || typeof deps.el !== 'function') return;
    const _el = deps.el;
    const contract = getContract(deps.contract);

    _el('s-group-select')?.addEventListener('change', (event) => {
      deps.setSelectedGroupPlanId(event.target?.value || '');
      deps.renderGroupBuilderPanel();
    });

    _el('session-group-new-btn')?.addEventListener('click', () => {
      const nextName = String(_el('s-group-name')?.value || '').trim() || `Group ${deps.getGroupPlanCount() + 1}`;
      const nextTier = String(_el('s-group-tier')?.value || 'tier2').trim().toLowerCase();
      const entry = {
        id: `group-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        name: nextName,
        tier: nextTier === 'tier1' || nextTier === 'tier3' ? nextTier : 'tier2',
        students: [],
        assignment: { packId: 'custom', targetId: 'custom', updatedAt: 0 },
        updatedAt: Date.now()
      };
      deps.addGroupPlanEntry(entry);
      deps.setSelectedGroupPlanId(entry.id);
      deps.saveGroupPlanState();
      emitNamedEvent(contract.events.assignmentUpdated, { type: 'group_created', group: entry });
      deps.renderGroupBuilderPanel();
      deps.toast('New group created.');
    });

    _el('session-group-save-btn')?.addEventListener('click', () => {
      const selected = deps.getSelectedGroupPlan();
      if (!selected) {
        deps.toast('Select or create a group first.');
        return;
      }
      const nextName = String(_el('s-group-name')?.value || '').trim() || selected.name;
      const nextTierRaw = String(_el('s-group-tier')?.value || selected.tier || 'tier2').trim().toLowerCase();
      selected.name = nextName;
      selected.tier = nextTierRaw === 'tier1' || nextTierRaw === 'tier3' ? nextTierRaw : 'tier2';
      selected.updatedAt = Date.now();
      deps.saveGroupPlanState();
      emitNamedEvent(contract.events.assignmentUpdated, { type: 'group_saved', group: selected });
      deps.renderGroupBuilderPanel();
      deps.toast('Group saved.');
    });

    _el('session-group-delete-btn')?.addEventListener('click', () => {
      const selected = deps.getSelectedGroupPlan();
      if (!selected) {
        deps.toast('Select a group to delete.');
        return;
      }
      deps.removeGroupPlanById(selected.id);
      deps.setSelectedGroupPlanId(deps.getFirstGroupPlanId());
      deps.saveGroupPlanState();
      emitNamedEvent(contract.events.assignmentUpdated, { type: 'group_deleted', groupId: selected.id });
      deps.renderGroupBuilderPanel();
      deps.toast('Group deleted.');
    });

    _el('session-group-add-active-btn')?.addEventListener('click', () => {
      const selected = deps.getSelectedGroupPlan();
      const student = deps.getActiveStudentLabel();
      if (!selected) {
        deps.toast('Select a group first.');
        return;
      }
      if (!student || student === 'Class') {
        deps.toast('Select a student first.');
        return;
      }
      if (!selected.students.includes(student)) selected.students.push(student);
      selected.students.sort((a, b) => a.localeCompare(b));
      selected.updatedAt = Date.now();
      deps.saveGroupPlanState();
      emitNamedEvent(contract.events.assignmentUpdated, { type: 'group_members_updated', group: selected });
      deps.renderGroupBuilderPanel();
      deps.toast(`${student} added to ${selected.name}.`);
    });

    _el('session-group-remove-active-btn')?.addEventListener('click', () => {
      const selected = deps.getSelectedGroupPlan();
      const student = deps.getActiveStudentLabel();
      if (!selected) {
        deps.toast('Select a group first.');
        return;
      }
      if (!student || student === 'Class') {
        deps.toast('Select a student first.');
        return;
      }
      selected.students = selected.students.filter((name) => name !== student);
      selected.updatedAt = Date.now();
      deps.saveGroupPlanState();
      emitNamedEvent(contract.events.assignmentUpdated, { type: 'group_members_updated', group: selected });
      deps.renderGroupBuilderPanel();
      deps.toast(`${student} removed from ${selected.name}.`);
    });

    _el('session-group-assign-target-btn')?.addEventListener('click', () => {
      const selected = deps.getSelectedGroupPlan();
      if (!selected) {
        deps.toast('Select a group first.');
        return;
      }
      const snapshot = deps.buildCurrentCurriculumSnapshot();
      selected.assignment = {
        packId: snapshot.packId || 'custom',
        targetId: snapshot.targetId || 'custom',
        updatedAt: Date.now()
      };
      selected.updatedAt = Date.now();
      deps.saveGroupPlanState();
      emitNamedEvent(contract.events.assignmentUpdated, { type: 'group_target_assigned', group: selected });
      deps.renderGroupBuilderPanel();
      deps.toast(`Assigned current target to ${selected.name}.`);
    });

    _el('s-lock-pack')?.addEventListener('change', (event) => {
      const nextPack = deps.normalizeLessonPackId(event.target?.value || 'custom');
      deps.populateTargetSelectForPack(_el('s-lock-target'), nextPack, 'custom', { includeCustom: true });
    });

    _el('session-lock-save-btn')?.addEventListener('click', () => {
      const student = deps.getActiveStudentLabel();
      if (!student || student === 'Class') {
        deps.toast('Select a student first.');
        return;
      }
      const enabled = !!_el('s-lock-enabled')?.checked;
      const packId = deps.normalizeLessonPackId(_el('s-lock-pack')?.value || 'custom');
      const targetId = deps.normalizeLessonTargetId(packId, _el('s-lock-target')?.value || 'custom');
      const duration = String(_el('s-lock-duration')?.value || '1w').trim().toLowerCase();
      const now = Date.now();
      let expiresAt = 0;
      if (duration === '1w') expiresAt = now + (7 * 24 * 60 * 60 * 1000);
      if (duration === '2w') expiresAt = now + (14 * 24 * 60 * 60 * 1000);
      if (duration === '4w') expiresAt = now + (28 * 24 * 60 * 60 * 1000);
      if (duration === 'never') expiresAt = 0;
      if (!deps.setStudentTargetLock(student, { enabled, packId, targetId, expiresAt, updatedAt: now })) {
        deps.toast('Could not save lock.');
        return;
      }
      deps.renderStudentLockPanel();
      deps.toast(`Target lock saved for ${student}.`);
    });

    _el('session-lock-apply-btn')?.addEventListener('click', () => {
      const student = deps.getActiveStudentLabel();
      if (!student || student === 'Class') {
        deps.toast('Select a student first.');
        return;
      }
      if (!deps.maybeApplyStudentPlanForActiveStudent({ toast: true })) {
        deps.toast('No active lock or group assignment to apply.');
        return;
      }
      deps.renderStudentLockPanel();
    });

    _el('session-lock-clear-btn')?.addEventListener('click', () => {
      const student = deps.getActiveStudentLabel();
      if (!student || student === 'Class') {
        deps.toast('Select a student first.');
        return;
      }
      if (!deps.clearStudentTargetLock(student)) {
        deps.toast('No lock set for this student.');
        return;
      }
      deps.renderStudentLockPanel();
      deps.toast(`Target lock cleared for ${student}.`);
    });
  }

  function createFeature(deps) {
    if (!deps || typeof deps.el !== 'function') return null;
    const _el = deps.el;
    const contract = getContract(deps.contract);

    function createEmptyGroupPlanState() {
      return { groups: [], selectedId: '' };
    }

    function normalizeGroupPlanEntry(raw) {
      if (!raw || typeof raw !== 'object') return null;
      const id = String(raw.id || '').trim();
      if (!id) return null;
      const tierRaw = String(raw.tier || 'tier2').trim().toLowerCase();
      const tier = tierRaw === 'tier1' || tierRaw === 'tier3' ? tierRaw : 'tier2';
      const name = String(raw.name || '').trim() || 'Group';
      const students = Array.isArray(raw.students)
        ? Array.from(new Set(raw.students
          .map((item) => String(item || '').trim().replace(/\s+/g, ' '))
          .filter(Boolean)))
        : [];
      const assignment = raw.assignment && typeof raw.assignment === 'object'
        ? {
            packId: deps.normalizeLessonPackId(raw.assignment.packId || 'custom'),
            targetId: deps.normalizeLessonTargetId(
              deps.normalizeLessonPackId(raw.assignment.packId || 'custom'),
              raw.assignment.targetId || 'custom'
            ),
            updatedAt: Math.max(0, Number(raw.assignment.updatedAt) || 0)
          }
        : { packId: 'custom', targetId: 'custom', updatedAt: 0 };
      return {
        id,
        name,
        tier,
        students,
        assignment,
        updatedAt: Math.max(0, Number(raw.updatedAt) || Date.now())
      };
    }

    function normalizeStudentTargetLockEntry(raw) {
      if (!raw || typeof raw !== 'object') return null;
      const enabled = !!raw.enabled;
      const packId = deps.normalizeLessonPackId(raw.packId || 'custom');
      const targetId = deps.normalizeLessonTargetId(packId, raw.targetId || 'custom');
      return {
        enabled,
        packId,
        targetId,
        expiresAt: Math.max(0, Number(raw.expiresAt) || 0),
        updatedAt: Math.max(0, Number(raw.updatedAt) || Date.now())
      };
    }

    function loadGroupPlanState() {
      const fallback = createEmptyGroupPlanState();
      try {
        const parsed = JSON.parse(localStorage.getItem(contract.storageKeys.groupPlan) || 'null');
        if (!parsed || typeof parsed !== 'object') return fallback;
        const groups = Array.isArray(parsed.groups)
          ? parsed.groups.map((entry) => normalizeGroupPlanEntry(entry)).filter(Boolean).slice(0, 40)
          : [];
        const selectedId = String(parsed.selectedId || '').trim();
        return {
          groups,
          selectedId: groups.some((entry) => entry.id === selectedId) ? selectedId : (groups[0]?.id || '')
        };
      } catch {
        return fallback;
      }
    }

    function loadStudentTargetLocksState() {
      try {
        const parsed = JSON.parse(localStorage.getItem(contract.storageKeys.studentTargetLocks) || '{}');
        if (!parsed || typeof parsed !== 'object') return Object.create(null);
        const normalized = Object.create(null);
        Object.entries(parsed).forEach(([key, value]) => {
          const lockKey = String(key || '').trim();
          if (!lockKey) return;
          const entry = normalizeStudentTargetLockEntry(value);
          if (!entry) return;
          normalized[lockKey] = entry;
        });
        return normalized;
      } catch {
        return Object.create(null);
      }
    }

    let groupPlanState = loadGroupPlanState();
    let studentTargetLocksState = loadStudentTargetLocksState();

    function saveGroupPlanState() {
      try { localStorage.setItem(contract.storageKeys.groupPlan, JSON.stringify(groupPlanState)); } catch {}
    }

    function saveStudentTargetLocksState() {
      try { localStorage.setItem(contract.storageKeys.studentTargetLocks, JSON.stringify(studentTargetLocksState)); } catch {}
    }

    function getStudentLockKey(studentLabel) {
      const label = String(studentLabel || '').trim();
      if (!label || label === 'Class') return '';
      return `student:${label}`;
    }

    function getSelectedGroupPlan() {
      const selectedId = String(groupPlanState.selectedId || '').trim();
      if (!selectedId) return null;
      return groupPlanState.groups.find((entry) => entry.id === selectedId) || null;
    }

    function setSelectedGroupPlanId(groupId) {
      const nextId = String(groupId || '').trim();
      if (!nextId) {
        groupPlanState.selectedId = '';
      } else if (groupPlanState.groups.some((entry) => entry.id === nextId)) {
        groupPlanState.selectedId = nextId;
      } else {
        groupPlanState.selectedId = '';
      }
      saveGroupPlanState();
    }

    function getGroupPlanForStudent(studentLabel) {
      const label = String(studentLabel || '').trim();
      if (!label || label === 'Class') return null;
      return groupPlanState.groups.find((entry) => Array.isArray(entry.students) && entry.students.includes(label)) || null;
    }

    function getStudentTargetLock(studentLabel) {
      const key = getStudentLockKey(studentLabel);
      if (!key) return null;
      return studentTargetLocksState[key] || null;
    }

    function isStudentTargetLockActive(lock) {
      if (!lock || !lock.enabled) return false;
      if (!lock.expiresAt) return true;
      return lock.expiresAt >= Date.now();
    }

    function setStudentTargetLock(studentLabel, payload) {
      const key = getStudentLockKey(studentLabel);
      if (!key) return false;
      const entry = normalizeStudentTargetLockEntry(payload);
      if (!entry) return false;
      studentTargetLocksState[key] = entry;
      saveStudentTargetLocksState();
      emitNamedEvent(contract.events.studentLockUpdated, {
        student: studentLabel,
        lock: entry
      });
      return true;
    }

    function clearStudentTargetLock(studentLabel) {
      const key = getStudentLockKey(studentLabel);
      if (!key || !studentTargetLocksState[key]) return false;
      delete studentTargetLocksState[key];
      saveStudentTargetLocksState();
      emitNamedEvent(contract.events.studentLockUpdated, {
        student: studentLabel,
        lock: null
      });
      return true;
    }

    function populatePackSelect(selectEl, selectedPackId = 'custom', options = {}) {
      if (!selectEl) return;
      const includeCustom = options.includeCustom !== false;
      const normalizedSelected = deps.normalizeLessonPackId(selectedPackId);
      const optionsList = [];
      if (includeCustom) {
        optionsList.push({ value: 'custom', label: 'Manual (no pack)' });
      }
      deps.curriculumPackOrder.forEach((packId) => {
        const pack = deps.getLessonPackDefinition(packId);
        optionsList.push({ value: packId, label: pack.label });
      });
      selectEl.innerHTML = '';
      optionsList.forEach((item) => {
        const option = document.createElement('option');
        option.value = item.value;
        option.textContent = item.label;
        selectEl.appendChild(option);
      });
      selectEl.value = optionsList.some((item) => item.value === normalizedSelected)
        ? normalizedSelected
        : (optionsList[0]?.value || 'custom');
    }

    function populateTargetSelectForPack(selectEl, packId, selectedTargetId = 'custom', options = {}) {
      if (!selectEl) return 'custom';
      const normalizedPack = deps.normalizeLessonPackId(packId);
      const includeCustom = options.includeCustom !== false;
      const targets = normalizedPack === 'custom'
        ? []
        : deps.getCurriculumTargetsForGrade(normalizedPack, deps.getQuestFilterGradeBand(), { matchSelectedGrade: false });
      selectEl.innerHTML = '';
      if (includeCustom || !targets.length) {
        const manual = document.createElement('option');
        manual.value = 'custom';
        manual.textContent = 'Manual';
        selectEl.appendChild(manual);
      }
      targets.forEach((target) => {
        const option = document.createElement('option');
        option.value = target.id;
        option.textContent = target.label;
        selectEl.appendChild(option);
      });
      const normalizedTarget = deps.normalizeLessonTargetId(normalizedPack, selectedTargetId);
      if (Array.from(selectEl.options).some((option) => option.value === normalizedTarget)) {
        selectEl.value = normalizedTarget;
      } else {
        selectEl.value = includeCustom ? 'custom' : (targets[0]?.id || 'custom');
      }
      return selectEl.value || 'custom';
    }

    function renderGroupBuilderPanel() {
      const selectEl = _el('s-group-select');
      const nameEl = _el('s-group-name');
      const tierEl = _el('s-group-tier');
      const summaryEl = _el('session-group-summary');
      const studentsEl = _el('session-group-students');
      const targetEl = _el('session-group-target');
      if (!selectEl) return;

      selectEl.innerHTML = '';
      const none = document.createElement('option');
      none.value = '';
      none.textContent = 'No group selected';
      selectEl.appendChild(none);
      groupPlanState.groups
        .slice()
        .sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')))
        .forEach((group) => {
          const option = document.createElement('option');
          option.value = group.id;
          option.textContent = `${group.name} (${String(group.tier || 'tier2').toUpperCase()})`;
          selectEl.appendChild(option);
        });
      if (groupPlanState.selectedId && Array.from(selectEl.options).some((option) => option.value === groupPlanState.selectedId)) {
        selectEl.value = groupPlanState.selectedId;
      }

      const selected = getSelectedGroupPlan();
      if (nameEl && !nameEl.matches(':focus')) nameEl.value = selected?.name || '';
      if (tierEl) tierEl.value = selected?.tier || 'tier2';

      if (!selected) {
        if (summaryEl) summaryEl.textContent = 'Group: --';
        if (studentsEl) studentsEl.textContent = 'Students: --';
        if (targetEl) targetEl.textContent = 'Target: --';
        return;
      }

      const packLabel = deps.getLessonPackDefinition(selected.assignment?.packId || 'custom').label;
      const target = deps.getLessonTarget(selected.assignment?.packId || 'custom', selected.assignment?.targetId || 'custom');
      const members = Array.isArray(selected.students) ? selected.students : [];
      if (summaryEl) summaryEl.textContent = `Group: ${selected.name} (${String(selected.tier || 'tier2').toUpperCase()})`;
      if (studentsEl) studentsEl.textContent = members.length ? `Students: ${members.join(', ')}` : 'Students: none yet';
      if (targetEl) {
        targetEl.textContent = target
          ? `Target: ${packLabel} · ${target.label}`
          : `Target: ${packLabel === 'Manual (no pack)' ? 'manual' : `${packLabel} (not set)`}`;
      }
    }

    function renderStudentLockPanel() {
      const student = deps.getActiveStudentLabel();
      const enabledEl = _el('s-lock-enabled');
      const packEl = _el('s-lock-pack');
      const targetEl = _el('s-lock-target');
      const durationEl = _el('s-lock-duration');
      const statusEl = _el('session-lock-status');
      const targetChipEl = _el('session-lock-target');

      if (!packEl || !targetEl) return;
      const lock = getStudentTargetLock(student);
      const packId = lock?.packId || 'custom';
      const targetId = lock?.targetId || 'custom';

      populatePackSelect(packEl, packId, { includeCustom: true });
      populateTargetSelectForPack(targetEl, packEl.value, targetId, { includeCustom: true });
      if (enabledEl) enabledEl.checked = !!lock?.enabled;
      if (durationEl && lock?.expiresAt) {
        const days = Math.max(0, Math.ceil((lock.expiresAt - Date.now()) / (24 * 60 * 60 * 1000)));
        durationEl.value = days > 21 ? '4w' : days > 10 ? '2w' : '1w';
      }

      if (!statusEl || !targetChipEl) return;
      if (!student || student === 'Class') {
        statusEl.textContent = 'Lock: select a student';
        targetChipEl.textContent = 'Target: --';
        deps.applyChipTone(statusEl, '');
        deps.applyChipTone(targetChipEl, '');
        return;
      }
      if (!lock) {
        statusEl.textContent = 'Lock: not set';
        targetChipEl.textContent = 'Target: --';
        deps.applyChipTone(statusEl, '');
        deps.applyChipTone(targetChipEl, '');
        return;
      }
      const active = isStudentTargetLockActive(lock);
      const packLabel = deps.getLessonPackDefinition(lock.packId).label;
      const target = deps.getLessonTarget(lock.packId, lock.targetId);
      statusEl.textContent = active
        ? `Lock: active${lock.expiresAt ? ` until ${new Date(lock.expiresAt).toLocaleDateString()}` : ''}`
        : 'Lock: expired';
      targetChipEl.textContent = target
        ? `Target: ${packLabel} · ${target.label}`
        : `Target: ${packLabel} · not set`;
      deps.applyChipTone(statusEl, active ? 'good' : 'warn');
      deps.applyChipTone(targetChipEl, active ? 'good' : '');
    }

    function maybeApplyStudentPlanForActiveStudent(options = {}) {
      const student = deps.getActiveStudentLabel();
      if (!student || student === 'Class') return false;
      if (deps.isAssessmentRoundLocked()) return false;

      const lock = getStudentTargetLock(student);
      if (lock && isStudentTargetLockActive(lock)) {
        const applied = deps.applyStudentTargetConfig(lock.packId, lock.targetId, { toast: !!options.toast });
        if (applied) return true;
      }

      const group = getGroupPlanForStudent(student);
      if (group && group.assignment) {
        const { packId, targetId } = group.assignment;
        const applied = deps.applyStudentTargetConfig(packId, targetId, { toast: !!options.toast });
        if (applied) return true;
      }
      return false;
    }

    function removeStudentReferences(studentLabel) {
      const active = String(studentLabel || '').trim();
      if (!active) return;
      const lockKey = getStudentLockKey(active);
      if (lockKey && studentTargetLocksState[lockKey]) {
        delete studentTargetLocksState[lockKey];
        saveStudentTargetLocksState();
      }
      groupPlanState.groups.forEach((group) => {
        group.students = Array.isArray(group.students) ? group.students.filter((name) => name !== active) : [];
      });
      saveGroupPlanState();
    }

    function clearStudentAssignments() {
      studentTargetLocksState = Object.create(null);
      groupPlanState.groups.forEach((group) => {
        group.students = [];
      });
      saveStudentTargetLocksState();
      saveGroupPlanState();
    }

    function addGroupPlanEntry(entry) {
      groupPlanState.groups.push(entry);
      groupPlanState.groups = groupPlanState.groups.slice(-40);
    }

    function removeGroupPlanById(id) {
      groupPlanState.groups = groupPlanState.groups.filter((entry) => entry.id !== id);
    }

    return Object.freeze({
      getGroupPlanCount: () => groupPlanState.groups.length,
      addGroupPlanEntry,
      removeGroupPlanById,
      getFirstGroupPlanId: () => groupPlanState.groups[0]?.id || '',
      getSelectedGroupPlan,
      setSelectedGroupPlanId,
      saveGroupPlanState,
      setStudentTargetLock,
      clearStudentTargetLock,
      renderGroupBuilderPanel,
      renderStudentLockPanel,
      maybeApplyStudentPlanForActiveStudent,
      populateTargetSelectForPack,
      removeStudentReferences,
      clearStudentAssignments
    });
  }

  window.WQTeacherAssignmentsFeature = Object.freeze({
    bindUI,
    createFeature
  });
})();
