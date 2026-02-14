
// Compatibility: map words.js global WORDS_DATA to the engine's expected WORD_ENTRIES.
// Note: words.js declares WORDS_DATA with `const`, so it is *not* a window property, but it
// is still available by name to later scripts in classic (non-module) script tags.
if (typeof window !== 'undefined' && !window.WORD_ENTRIES && typeof WORDS_DATA !== 'undefined') {
    window.WORD_ENTRIES = WORDS_DATA;
}

const MAX_GUESSES_LIMIT = 6;
const MIN_GUESSES_LIMIT = 1;
let CURRENT_WORD_LENGTH = 5;
let CURRENT_MAX_GUESSES = MAX_GUESSES_LIMIT;
let currentWord = "";
let currentEntry = null;
let guesses = [];
let currentGuess = "";
let previousGuessRenderLength = 0;
let gameOver = false;
let isFirstLoad = true;
let isUpperCase = false;
let cachedVoices = [];
let lengthAutoSet = false;
let patternLengthCache = null;
let voicesReadyPromise = null;
let speechStartTimeout = null;
let speechSequenceToken = 0;
let voiceLoaderInitialized = false;
let voiceDiagnosticsState = {
    dialect: 'en-US',
    voiceName: 'Not resolved yet',
    voiceLang: '—',
    qualityTier: 'Unknown',
    qualityMode: 'Natural preferred',
    fallbackReason: 'Waiting for voice data.',
    candidateCount: 0,
    updatedAt: 0
};
let sessionEnglishVoice = {
    dialect: '',
    voiceUri: ''
};
let modalDismissBound = false;
let popupWindowInteractionsBound = false;
let assessmentState = null;
let enhancedVoicePrefetched = false;
let warmupPrefetchDone = false;
let fitScreenActive = false;
let fitScreenTightActive = false;
let fitScreenRaf = null;
let wordQuestScrollFallback = false;
let teacherToolsInitialized = false;
let isCustomWordRound = false;
let customWordInLibrary = true;
let teacherWordList = [];
let teacherWordListEnabled = false;
let activeRoundPattern = 'all';
let activeRoundFallbackNote = '';
let voiceHealthCheckInProgress = false;
let voiceHealthCheckToken = 0;
let pronunciationRecognition = null;
let pronunciationActive = false;
let pronunciationTimeout = null;
let practiceRecorder = {
    stream: null,
    mediaRecorder: null,
    activeKey: null,
    chunks: []
};
const practiceRecordings = new Map();
const phonemeAudioCache = new Map();
const phonemeVideoLookupCache = new Map();
const activeAudioPlayers = new Set();
let activePlaybackSourceId = '';
const PHONEME_VIDEO_LIBRARY_CANDIDATE_DIRS = [
    'assets/articulation/clips',
    'public/assets/articulation/clips'
]; //
const PACKED_TTS_BASE_PREF_KEY = 'decode_tts_base_path_v1';
const PACKED_TTS_BASE_PLAIN = 'https://raw.githubusercontent.com/bkseatown/Cornerstone-MTSS/main/literacy-platform/audio/tts';
const PACKED_TTS_BASE_SCOPED = 'https://raw.githubusercontent.com/bkseatown/Cornerstone-MTSS/main/literacy-platform/audio/tts';

const PACKED_TTS_REGISTRY_URL = null;
const PACKED_TTS_MANIFEST_URL = null;

function normalizePackedTtsBasePath(value = '') {
    return PACKED_TTS_BASE_PLAIN;
}

function readPackedTtsBasePathPreference() {
    try {
        return normalizePackedTtsBasePath(localStorage.getItem(PACKED_TTS_BASE_PREF_KEY) || '');
    } catch (e) {
        return '';
    }
}

function rememberPackedTtsBasePathPreference(value = '') {
    const normalized = normalizePackedTtsBasePath(value);
    if (!normalized) return;
    try {
        localStorage.setItem(PACKED_TTS_BASE_PREF_KEY, normalized);
    } catch (e) {}
}
function detectPackedTtsBasePathFromAssetPath(value = '') {
    const candidate = String(value || '').trim().replace(/^\/+/, '');
    if (candidate === PACKED_TTS_BASE_PLAIN || candidate.startsWith(`${PACKED_TTS_BASE_PLAIN}/`)) {
        return PACKED_TTS_BASE_PLAIN;
    }
    if (candidate === PACKED_TTS_BASE_SCOPED || candidate.startsWith(`${PACKED_TTS_BASE_SCOPED}/`)) {
        return PACKED_TTS_BASE_SCOPED;
    }
    return '';
}

function resolvePackedTtsBasePath() {
    const runtimeOverride = normalizePackedTtsBasePath(window?.CORNERSTONE_TTS_BASE_PATH || '');
    if (runtimeOverride) return runtimeOverride;

    const pathname = String(window?.location?.pathname || '').toLowerCase();
    const preferredBase = readPackedTtsBasePathPreference();
    if (preferredBase) {
        if (preferredBase === PACKED_TTS_BASE_SCOPED && !pathname.includes('/literacy-platform/')) {
            return PACKED_TTS_BASE_PLAIN;
        }
        return preferredBase;
    }
    return PACKED_TTS_BASE_PLAIN;
}
const PACKED_TTS_BASE_PATH = resolvePackedTtsBasePath();
const PACKED_TTS_DEFAULT_MANIFEST_PATH = `${PACKED_TTS_BASE_PATH}/tts-manifest.json`;
const PACKED_TTS_PACK_REGISTRY_PATH = null;
const packedTtsManifestCacheByPath = new Map();
const packedTtsManifestPromiseByPath = new Map();
let packedTtsPackRegistryCache = null;
let packedTtsPackRegistryPromise = null;
const DECODABLE_SPEED_PRESETS = [0.75, 0.85, 1.0, 1.15, 1.3];
let decodableFollowAlongState = {
    title: '',
    token: 0,
    card: null,
    words: [],
    wordStarts: [],
    activeWordIndex: -1,
    timerId: null,
    audio: null,
    onTimeUpdate: null,
    onLoadedMetadata: null
};
const decodableWordMetaByTitle = new Map();

// DOM Elements - will be initialized after DOM loads
let board, keyboard, modalOverlay, welcomeModal, teacherModal, studioModal, gameModal;

// App settings (accessibility + teacher tools)
const SETTINGS_KEY = 'decode_settings';
const DEFAULT_SETTINGS = {
    calmMode: false,
    largeText: false,
    uiLook: '35', // 'k2' | '35' | '612' (age-based presentation presets)
    showIPA: true,
    showExamples: true,
    showMouthCues: true,
    speechRate: 0.95,
    decodableReadSpeed: 1.0,
    voiceDialect: 'en-US',
    narrationStyle: 'expressive', // expressive | neutral
    speechQualityMode: 'natural-only', // natural-preferred | natural-only | fallback-any
    ttsPackId: 'ava-multi',
    voiceUri: '',
    audienceMode: 'auto', // auto | general | young-eal
    autoHear: true,
    showRevealRecordingTools: false,
    funHud: {
        enabled: true,
        coins: 0,
        hearts: 3,
        maxHearts: 3,
        challenge: false,
        sfx: false,
        style: 'playful'
    },
    gameMode: {
        active: false,
        teamMode: false,
        timerEnabled: false,
        timerSeconds: 60,
        activeTeam: 'A',
        teamAName: 'Team A',
        teamBName: 'Team B',
        teamACoins: 0,
        teamBCoins: 0
    },
    classroom: {
        dockOpen: false,
        timerMinutes: 10
    },
    translation: {
        pinned: false,
        lang: 'en'
    },
    guessCount: MAX_GUESSES_LIMIT,
    bonus: {
        frequency: 'always'
    },
    soundWallSections: {
        'vowel-valley': true,
        'long-vowels': true,
        'r-controlled': true,
        'diphthongs': true,
        'welded': true,
        'schwa': true,
        'consonant-grid': true,
        'blends': true
    }
};

const UI_LOOK_CLASSES = ['look-k2', 'look-35', 'look-612'];
const HOME_ROLE_STORAGE_KEY = 'cornerstone_home_role_v1';
const HOME_LANGUAGE_PREFERENCE_KEY = 'cornerstone_home_language_pref_v1';
const SHUFFLE_MEMORY_KEY_PREFIX = 'cornerstone_shuffle_memory_v1::';
const BONUS_SHUFFLE_ENTRY_DELIM = '||::||';
const YOUNG_AUDIENCE_ROLE_PATHWAYS = new Set(['eal']);
const SHUFFLE_FOCUS_AVOID_FOR_YOUNG = new Set(['schwa', 'prefix', 'suffix', 'compound', 'multisyllable']);
const SHUFFLE_FOCUS_PRIORITY = ['cvc', 'digraph', 'ccvc', 'cvcc', 'trigraph', 'cvce', 'vowel_team', 'r_controlled', 'diphthong', 'floss', 'welded'];
const FOCUS_TAG_EXCLUSIONS = Object.freeze({
    schwa: new Set(['apple'])
});
const CURRICULUM_FOCUS_LISTS = Object.freeze({
    'vocab-math-k2': ['count', 'add', 'sum', 'take', 'equal', 'shape', 'circle', 'square', 'line', 'graph', 'half', 'whole'],
    'vocab-math-35': ['fraction', 'decimal', 'multiply', 'divide', 'equation', 'numerator', 'denominator', 'perimeter', 'area', 'volume', 'estimate', 'quotient'],
    'vocab-math-68': ['integer', 'ratio', 'variable', 'expression', 'coefficient', 'probability', 'percent', 'theorem', 'geometry', 'function', 'slope', 'equivalent'],
    'vocab-math-912': ['quadratic', 'polynomial', 'logarithm', 'derivative', 'matrix', 'vector', 'statistic', 'hypothesis', 'calculus', 'function', 'sequence', 'asymptote'],
    'vocab-science-k2': ['plant', 'animal', 'water', 'weather', 'cloud', 'soil', 'light', 'sound', 'force', 'energy', 'earth', 'space'],
    'vocab-science-35': ['habitat', 'ecosystem', 'gravity', 'erosion', 'magnet', 'circuit', 'matter', 'organism', 'evaporation', 'condensation', 'fossil', 'adaptation'],
    'vocab-science-68': ['photosynthesis', 'cellular', 'molecule', 'element', 'tectonic', 'climate', 'inertia', 'velocity', 'density', 'chemistry', 'ecosystem', 'organism'],
    'vocab-science-912': ['equilibrium', 'stoichiometry', 'radiation', 'entropy', 'isotope', 'catalyst', 'organism', 'genetics', 'reaction', 'momentum', 'velocity', 'ecosystem'],
    'vocab-social-k2': ['map', 'community', 'family', 'school', 'rules', 'leader', 'vote', 'flag', 'city', 'state', 'country', 'history'],
    'vocab-social-35': ['culture', 'region', 'economy', 'citizen', 'history', 'government', 'resource', 'geography', 'monument', 'colony', 'immigrant', 'democracy'],
    'vocab-social-68': ['constitution', 'democracy', 'migration', 'revolution', 'parliament', 'republic', 'federal', 'conflict', 'treaty', 'civilization', 'economy', 'citizen'],
    'vocab-social-912': ['jurisprudence', 'sovereignty', 'ideology', 'globalization', 'diplomacy', 'legislation', 'inflation', 'policy', 'reform', 'constitution', 'democracy', 'economics'],
    'vocab-ela-k2': ['letter', 'story', 'rhyme', 'vowel', 'author', 'title', 'sentence', 'noun', 'verb', 'read', 'write', 'sound'],
    'vocab-ela-35': ['paragraph', 'adjective', 'adverb', 'context', 'infer', 'summarize', 'compare', 'contrast', 'sequence', 'theme', 'evidence', 'character'],
    'vocab-ela-68': ['analyze', 'evidence', 'citation', 'argument', 'narrative', 'figurative', 'metaphor', 'syntax', 'transition', 'perspective', 'conclusion', 'counterclaim'],
    'vocab-ela-912': ['rhetoric', 'thesis', 'counterclaim', 'synthesis', 'allusion', 'diction', 'nuance', 'irony', 'symbolism', 'semantics', 'analysis', 'argument']
});
const KEYBOARD_VOWELS = new Set(['a', 'e', 'i', 'o', 'u']);
const SENTENCE_CAPTION_KEY = 'cs_caption_sentence';
const DELIGHT_MOTION_KEY = 'cs_delight_motion';
const DELIGHT_SOUND_KEY = 'cs_delight_sound';
const ROUND_CLUE_VISIBILITY_KEY = 'cs_show_round_clue';
const PLAY_MODE_KEY = 'cs_wordquest_play_mode_v1';
const PLAY_MODE_CLASSIC = 'classic';
const PLAY_MODE_LISTEN = 'listen';
const TEACHER_WORD_LIST_KEY = 'cs_teacher_word_list';
const TEACHER_WORD_LIST_ENABLED_KEY = 'cs_teacher_word_list_enabled';
const WORD_SOURCE_LIBRARY_STATUS = 'Mode: Library. Pick a focus or set a custom challenge word.';
const CUSTOM_WORD_BLOCK_PATTERNS = [
    /fuck/i,
    /shit/i,
    /bitch/i,
    /cunt/i,
    /dick/i,
    /cock/i,
    /pussy/i,
    /penis/i,
    /vagina/i,
    /porn/i,
    /nude/i,
    /xxx/i,
    /slut/i,
    /whore/i,
    /fetish/i,
    /nsfw/i,
    /\bnigg(?:a|er)\b/i,
    /\bfag(?:got)?\b/i,
    /\bretard(?:ed)?\b/i,
    /\bchink\b/i,
    /\bspic\b/i,
    /\bkike\b/i,
    /\bwetback\b/i
];
const CLASS_SAFE_BLOCKED_WORD_PATTERNS = [
    /^ass$/i,
    /^asses$/i,
    /^asshole(?:s)?$/i,
    /^anal$/i,
    /^anus$/i,
    /^cum(?:s|ming)?$/i,
    /^sex(?:y)?$/i,
    /^porn$/i,
    /^nude$/i,
    /^xxx$/i,
    /^slut$/i,
    /^whore$/i,
    /^fetish$/i,
    /^nsfw$/i,
    /^fuck(?:ed|er|ers|ing)?$/i,
    /^shit(?:s|ty|ting)?$/i,
    /^bitch(?:es|y)?$/i,
    /^cunt(?:s)?$/i,
    /^dick(?:s)?$/i,
    /^cock(?:s)?$/i,
    /^pussy$/i,
    /^penis(?:es)?$/i,
    /^vagina(?:s)?$/i,
    /^nigg(?:a|er|ers|as)$/i,
    /^fag(?:got|gots)?$/i,
    /^retard(?:ed|s)?$/i,
    /^chink(?:s)?$/i,
    /^spic(?:s)?$/i,
    /^kike(?:s)?$/i,
    /^wetback(?:s)?$/i
];
let kidSafeWordEntriesCache = null;
let kidSafeWordEntriesSourceSize = -1;
let kidSafeWordEntriesOverrideSize = -1;

function getUiLookValue() {
    const raw = (appSettings?.uiLook || DEFAULT_SETTINGS.uiLook || '35').toString();
    if (raw === 'k2') return 'k2';
    if (raw === '612') return '612';
    return '35';
}

function normalizeAudienceMode(value) {
    const raw = String(value || 'auto').toLowerCase().trim();
    if (raw === 'general') return 'general';
    if (raw === 'young-eal' || raw === 'young' || raw === 'eal') return 'young-eal';
    return 'auto';
}

function normalizeNarrationStyle(value) {
    const raw = String(value || '').toLowerCase().trim();
    if (raw === 'neutral') return 'neutral';
    return 'expressive';
}

function normalizeSpeechQualityMode(value) {
    const raw = String(value || '').toLowerCase().trim();
    if (raw === 'natural-only' || raw === 'strict' || raw === 'high-only') return 'natural-only';
    if (raw === 'fallback-any' || raw === 'allow-basic' || raw === 'compatibility') return 'fallback-any';
    return 'natural-preferred';
}

function normalizeTtsPackId(value) {
    const raw = String(value || '').trim().toLowerCase();
    if (!raw || raw === 'default' || raw === 'built-in') return 'default';
    const cleaned = raw.replace(/[^a-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '');
    return cleaned || 'default';
}

function normalizeGradeBandForAudience(value) {
    const raw = String(value || '').trim();
    if (!raw) return '';
    if (raw === 'k2' || raw.toLowerCase() === 'k-2') return 'K-2';
    if (raw === '35' || raw === '3-5') return '3-5';
    if (raw === '68' || raw === '6-8') return '6-8';
    if (raw === '912' || raw === '9-12') return '9-12';
    if (raw === '612' || raw === '6-12') return '6-8';
    return raw;
}

function normalizeGuessCount(value) {
    const parsed = Number.parseInt(String(value ?? ''), 10);
    if (!Number.isFinite(parsed)) return MAX_GUESSES_LIMIT;
    return Math.min(MAX_GUESSES_LIMIT, Math.max(MIN_GUESSES_LIMIT, parsed));
}

function normalizeCustomWordInput(value) {
    return String(value || '').trim().toLowerCase();
}

function isBlockedCustomWord(value) {
    const normalized = normalizeCustomWordInput(value);
    if (!normalized) return false;
    return isBlockedClassSafeWord(normalized)
        || CUSTOM_WORD_BLOCK_PATTERNS.some((pattern) => pattern.test(normalized));
}

function isBlockedClassSafeWord(value) {
    const normalized = normalizeCustomWordInput(value);
    if (!normalized) return false;
    return CLASS_SAFE_BLOCKED_WORD_PATTERNS.some((pattern) => pattern.test(normalized));
}

function validateCustomWordValue(value) {
    const normalized = normalizeCustomWordInput(value);
    if (normalized.length < 3 || normalized.length > 12) {
        return { ok: false, message: 'Use 3-12 letters (A-Z only).' };
    }
    if (!/^[a-z]+$/.test(normalized)) {
        return { ok: false, message: 'Letters only (no spaces, numbers, or symbols).' };
    }
    if (isBlockedCustomWord(normalized)) {
        return { ok: false, message: 'That word is blocked by the class-safe filter. Try another word.' };
    }
    const inLibrary = !!window.WORD_ENTRIES?.[normalized];
    return {
        ok: true,
        value: normalized,
        inLibrary
    };
}

function readTeacherWordList() {
    try {
        const raw = localStorage.getItem(TEACHER_WORD_LIST_KEY);
        const parsed = JSON.parse(raw || '[]');
        if (!Array.isArray(parsed)) return [];
        const uniq = [];
        const seen = new Set();
        parsed.forEach((item) => {
            const result = validateCustomWordValue(item);
            if (!result.ok || seen.has(result.value)) return;
            seen.add(result.value);
            uniq.push(result.value);
        });
        return uniq;
    } catch (error) {
        return [];
    }
}

function writeTeacherWordList(words = []) {
    const clean = [];
    const seen = new Set();
    words.forEach((item) => {
        const result = validateCustomWordValue(item);
        if (!result.ok || seen.has(result.value)) return;
        seen.add(result.value);
        clean.push(result.value);
    });
    teacherWordList = clean;
    try {
        localStorage.setItem(TEACHER_WORD_LIST_KEY, JSON.stringify(clean));
    } catch (error) {}
    return clean;
}

function readTeacherWordListEnabled() {
    try {
        return String(localStorage.getItem(TEACHER_WORD_LIST_ENABLED_KEY) || '').trim().toLowerCase() === 'on';
    } catch (error) {
        return false;
    }
}

function writeTeacherWordListEnabled(enabled) {
    teacherWordListEnabled = !!enabled && teacherWordList.length > 0;
    try {
        localStorage.setItem(TEACHER_WORD_LIST_ENABLED_KEY, teacherWordListEnabled ? 'on' : 'off');
    } catch (error) {}
    return teacherWordListEnabled;
}

function parseTeacherWordListInput(raw = '') {
    const parts = String(raw || '')
        .split(/[\n,;]+/g)
        .map((item) => item.trim())
        .filter(Boolean);
    const accepted = [];
    const rejected = [];
    const seen = new Set();
    parts.forEach((item) => {
        const result = validateCustomWordValue(item);
        if (!result.ok) {
            rejected.push({ word: item, reason: result.message });
            return;
        }
        if (!seen.has(result.value)) {
            seen.add(result.value);
            accepted.push(result.value);
        }
    });
    return { accepted, rejected };
}

function getTeacherWordListStatusText() {
    if (!teacherWordList.length) return 'No teacher list saved yet.';
    return teacherWordListEnabled
        ? `Teacher list ON (${teacherWordList.length} words). Rounds use this list only.`
        : `Teacher list saved (${teacherWordList.length} words). Turn on "Lock list for rounds" to activate.`;
}

function isCurrentWordAudioBlocked() {
    return isCustomWordRound;
}

function isTeacherCustomWordAllowed() {
    return getCurrentAudienceRolePathway() === 'teacher';
}

function setTeacherErrorMessage(message = '', isError = false) {
    const errorEl = document.getElementById("teacher-error");
    if (!errorEl) return;
    errorEl.textContent = message || '';
    errorEl.style.color = isError ? "var(--color-incorrect)" : "var(--color-correct)";
}

function setQuickCustomWordStatus(message = '', isError = false, isSuccess = false) {
    const statusEl = document.getElementById('quick-custom-word-status');
    if (!statusEl) return;
    const toggle = document.getElementById('quick-custom-word-toggle');
    if (toggle) {
        if (isSuccess) {
            toggle.textContent = 'Teacher-selected challenge word (active)';
        } else if (!isError) {
            toggle.textContent = 'Teacher-selected challenge word';
        }
    }
    if (isError) {
        const body = document.getElementById('quick-custom-word-body');
        if (body && toggle) {
            body.classList.remove('hidden');
            toggle.classList.add('open');
            toggle.setAttribute('aria-expanded', 'true');
        }
    }
    statusEl.textContent = message || '';
    statusEl.classList.toggle('error', !!isError);
    statusEl.classList.toggle('success', !isError && !!isSuccess);
}

function refreshPatternSelectTooltip() {
    const patternSelect = document.getElementById('pattern-select');
    if (!patternSelect) return;
    const selected = patternSelect.options[patternSelect.selectedIndex];
    const label = selected ? String(selected.textContent || '').trim() : '';
    patternSelect.title = label;
    if (label) {
        patternSelect.setAttribute('aria-label', `Choose your path: ${label}`);
    } else {
        patternSelect.setAttribute('aria-label', 'Choose your path');
    }
}

function updateWordQuestAudioAvailabilityNotice() {
    const blocked = isCurrentWordAudioBlocked();
    const hearWordBtn = document.getElementById("simple-hear-word");
    const hearSentenceBtn = document.getElementById("simple-hear-sentence");
    const sentencePreview = document.getElementById('sentence-preview');

    [hearWordBtn, hearSentenceBtn].forEach((btn) => {
        if (!btn) return;
        btn.disabled = blocked;
        btn.classList.toggle('hint-btn-disabled', blocked);
        btn.title = blocked
            ? 'Audio is disabled for custom challenge words.'
            : '';
    });

    if (sentencePreview) {
        sentencePreview.classList.add('hidden');
    }
}

function applyCustomWordChallenge(rawValue, options = {}) {
    const source = String(options.source || '').trim().toLowerCase();
    if (source === 'quick' && !isTeacherCustomWordAllowed()) {
        setQuickCustomWordStatus('Custom challenge words are teacher-only.', true, false);
        return false;
    }

    const result = validateCustomWordValue(rawValue);
    if (!result.ok) {
        if (options.source === 'teacher') {
            setTeacherErrorMessage(result.message, true);
        }
        setQuickCustomWordStatus(result.message, true, false);
        return false;
    }

    const wordLabel = result.value.toUpperCase();
    if (options.source === 'teacher') {
        setTeacherErrorMessage(`✅ Word accepted: "${wordLabel}"`, false);
    }

    if (options.closeTeacherModal) {
        closeModal();
    }

    if (teacherWordListEnabled) {
        writeTeacherWordListEnabled(false);
    }

    if (result.inLibrary) {
        setQuickCustomWordStatus(`Custom word "${wordLabel}" loaded with full library support.`, false, true);
    } else {
        setQuickCustomWordStatus(`Custom word "${wordLabel}" loaded. You can play now and add support clips later.`, false, true);
    }

    showBanner(`✅ Custom challenge word set: ${wordLabel}`);
    startNewGame(result.value);
    return true;
}

function applyUiLookClass() {
    const look = getUiLookValue();
    UI_LOOK_CLASSES.forEach(cls => document.body.classList.remove(cls));
    document.body.classList.add(look === 'k2' ? 'look-k2' : (look === '612' ? 'look-612' : 'look-35'));

    const uiLookSelect = document.getElementById('ui-look-select');
    if (uiLookSelect) {
        uiLookSelect.value = look;
    }
}

const WTW_INVENTORIES = {
    psi: {
        label: 'Primary Spelling Inventory (PSI)',
        words: [
            { word: 'fan', pattern: 'Short A' },
            { word: 'pet', pattern: 'Short E' },
            { word: 'dig', pattern: 'Short I' },
            { word: 'rob', pattern: 'Short O' },
            { word: 'hop', pattern: 'Short O' },
            { word: 'man', pattern: 'Short A' },
            { word: 'pen', pattern: 'Short E' },
            { word: 'rig', pattern: 'Short I' },
            { word: 'top', pattern: 'Short O' },
            { word: 'sun', pattern: 'Short U' },
            { word: 'plate', pattern: 'Long A (CVCe)' },
            { word: 'spin', pattern: 'Initial Blend (sp)' },
            { word: 'train', pattern: 'Vowel Team (ai)' },
            { word: 'deer', pattern: 'Vowel Team (ee)' },
            { word: 'sheep', pattern: 'Vowel Team (ee)' },
            { word: 'float', pattern: 'Vowel Team (oa)' },
            { word: 'drive', pattern: 'Long I (CVCe)' },
            { word: 'bright', pattern: 'Vowel Team (igh)' },
            { word: 'swing', pattern: 'Blend + NG' },
            { word: 'train', pattern: 'Vowel Team (ai)' },
            { word: 'stick', pattern: 'Blend (st)' },
            { word: 'dream', pattern: 'Vowel Team (ea)' },
            { word: 'block', pattern: 'Blend (bl) + CK' },
            { word: 'flash', pattern: 'Blend (fl) + SH' },
            { word: 'snake', pattern: 'Long A (CVCe)' },
            { word: 'clock', pattern: 'Blend (cl) + CK' }
        ]
    },
    esi: {
        label: 'Elementary Spelling Inventory (ESI)',
        words: [
            { word: 'bed', pattern: 'Short E' },
            { word: 'ship', pattern: 'Digraph SH' },
            { word: 'drive', pattern: 'Long I (CVCe)' },
            { word: 'bright', pattern: 'Vowel Team (igh)' },
            { word: 'chain', pattern: 'Vowel Team (ai)' },
            { word: 'float', pattern: 'Vowel Team (oa)' },
            { word: 'train', pattern: 'Vowel Team (ai)' },
            { word: 'snake', pattern: 'Long A (CVCe)' },
            { word: 'stick', pattern: 'Blend (st)' },
            { word: 'block', pattern: 'Blend (bl) + CK' },
            { word: 'ship', pattern: 'Digraph SH' },
            { word: 'train', pattern: 'Vowel Team (ai)' },
            { word: 'drive', pattern: 'Long I (CVCe)' },
            { word: 'bright', pattern: 'Vowel Team (igh)' },
            { word: 'chain', pattern: 'Vowel Team (ai)' },
            { word: 'float', pattern: 'Vowel Team (oa)' },
            { word: 'stick', pattern: 'Blend (st)' },
            { word: 'block', pattern: 'Blend (bl) + CK' },
            { word: 'cake', pattern: 'Long A (CVCe)' },
            { word: 'dream', pattern: 'Vowel Team (ea)' },
            { word: 'sheet', pattern: 'Vowel Team (ee)' },
            { word: 'snake', pattern: 'Long A (CVCe)' },
            { word: 'flash', pattern: 'Blend (fl) + SH' },
            { word: 'clock', pattern: 'Blend (cl) + CK' },
            { word: 'slide', pattern: 'Long I (CVCe)' }
        ]
    },
    usi: {
        label: 'Upper-Level Spelling Inventory (USI)',
        words: [
            { word: 'switch', pattern: 'Digraph (tch)' },
            { word: 'smudge', pattern: 'DGE' },
            { word: 'trapped', pattern: 'Double Consonant + -ed' },
            { word: 'scrape', pattern: 'Silent E + Blend' },
            { word: 'knotted', pattern: 'Silent K + Double Consonant' },
            { word: 'shaving', pattern: 'Long A + -ing' },
            { word: 'squirt', pattern: 'SQU + R-controlled' },
            { word: 'pounce', pattern: 'Diphthong OU' },
            { word: 'scratches', pattern: 'TCH + -es' },
            { word: 'crater', pattern: 'Open Syllable' },
            { word: 'certain', pattern: 'Soft C' },
            { word: 'pleasure', pattern: 'Soft G / ZH' },
            { word: 'fortunate', pattern: 'Derivational (-ate)' },
            { word: 'confindle', pattern: 'Derivational (prefix)' },
            { word: 'appreciate', pattern: 'Derivational (-ate)' },
            { word: 'spoilage', pattern: 'Derivational (-age)' },
            { word: 'oppose', pattern: 'Prefix + Silent E' },
            { word: 'manage', pattern: 'Soft G' },
            { word: 'village', pattern: 'Soft G + -age' },
            { word: 'concede', pattern: 'Soft C + Silent E' },
            { word: 'commercial', pattern: 'Derivational (-cial)' },
            { word: 'independent', pattern: 'Derivational (-ent)' },
            { word: 'opposition', pattern: 'Derivational (-tion)' },
            { word: 'confident', pattern: 'Derivational (-ent)' },
            { word: 'definition', pattern: 'Derivational (-tion)' },
            { word: 'deviation', pattern: 'Derivational (-tion)' },
            { word: 'heredity', pattern: 'Derivational (-ity)' },
            { word: 'permanent', pattern: 'Derivational (-ent)' },
            { word: 'commercial', pattern: 'Derivational (-cial)' },
            { word: 'dependent', pattern: 'Derivational (-ent)' },
            { word: 'irrelevant', pattern: 'Derivational (prefix)' }
        ]
    }
};

const WTW_PRACTICE_SETS = {
    psi: [
        { word: 'cap', pattern: 'Short A' },
        { word: 'pen', pattern: 'Short E' },
        { word: 'sit', pattern: 'Short I' },
        { word: 'mom', pattern: 'Short O' },
        { word: 'bug', pattern: 'Short U' },
        { word: 'flag', pattern: 'Blend (fl)' },
        { word: 'clap', pattern: 'Blend (cl)' },
        { word: 'ship', pattern: 'Digraph SH' },
        { word: 'shop', pattern: 'Digraph SH' },
        { word: 'rain', pattern: 'Vowel Team (ai)' },
        { word: 'seed', pattern: 'Vowel Team (ee)' },
        { word: 'boat', pattern: 'Vowel Team (oa)' },
        { word: 'snake', pattern: 'Long A (CVCe)' },
        { word: 'drive', pattern: 'Long I (CVCe)' },
        { word: 'clock', pattern: 'Blend (cl) + CK' }
    ],
    esi: [
        { word: 'chip', pattern: 'Digraph CH' },
        { word: 'shine', pattern: 'Long I (CVCe)' },
        { word: 'float', pattern: 'Vowel Team (oa)' },
        { word: 'train', pattern: 'Vowel Team (ai)' },
        { word: 'green', pattern: 'Vowel Team (ee)' },
        { word: 'flash', pattern: 'Blend (fl) + SH' },
        { word: 'block', pattern: 'Blend (bl) + CK' },
        { word: 'snake', pattern: 'Long A (CVCe)' },
        { word: 'slide', pattern: 'Long I (CVCe)' },
        { word: 'paint', pattern: 'Vowel Team (ai)' },
        { word: 'dream', pattern: 'Vowel Team (ea)' },
        { word: 'clock', pattern: 'Blend (cl) + CK' }
    ],
    usi: [
        { word: 'bridge', pattern: 'DGE' },
        { word: 'scrape', pattern: 'Silent E + Blend' },
        { word: 'squash', pattern: 'SQU' },
        { word: 'fortunate', pattern: 'Derivational (-ate)' },
        { word: 'addition', pattern: 'Derivational (-tion)' },
        { word: 'dependent', pattern: 'Derivational (-ent)' },
        { word: 'conclude', pattern: 'Prefix + Silent E' },
        { word: 'motion', pattern: 'Derivational (-tion)' },
        { word: 'scratched', pattern: 'TCH + -ed' },
        { word: 'pleasure', pattern: 'Soft G / ZH' },
        { word: 'permanent', pattern: 'Derivational (-ent)' },
        { word: 'relevant', pattern: 'Derivational (prefix)' }
    ]
};

const CORE_PHONICS_LEVELS = [
    {
        id: 'cvc',
        label: 'CVC Short Vowels',
        words: ['cat', 'bed', 'sit', 'hot', 'cup', 'map', 'sun', 'red', 'pin', 'dog']
    },
    {
        id: 'digraphs',
        label: 'Digraphs (sh, ch, th, wh, ph)',
        words: ['ship', 'chip', 'thin', 'whip', 'phone', 'shop', 'math', 'shed', 'chop', 'when']
    },
    {
        id: 'blends',
        label: 'Blends (st, bl, tr, fl)',
        words: ['stop', 'flag', 'trap', 'plan', 'slug', 'frog', 'blink', 'strip', 'crab', 'glad']
    },
    {
        id: 'long-vowels',
        label: 'Long Vowels (CVCe)',
        words: ['cake', 'slide', 'ride', 'bone', 'mule', 'shape', 'these', 'home', 'cute', 'late']
    },
    {
        id: 'vowel-teams',
        label: 'Vowel Teams (ai, ee, oa, ea)',
        words: ['rain', 'train', 'seed', 'sheep', 'boat', 'float', 'team', 'dream', 'coat', 'seal']
    },
    {
        id: 'r-controlled',
        label: 'R-Controlled Vowels',
        words: ['car', 'her', 'bird', 'fork', 'turn', 'storm', 'first', 'cart', 'hurt', 'barn']
    }
];

const WTW_STAGES = [
    {
        id: 'letter-name',
        label: 'Letter-Name Alphabetic',
        words: [
            { word: 'cat', pattern: 'Short A' },
            { word: 'pin', pattern: 'Short I' },
            { word: 'bed', pattern: 'Short E' },
            { word: 'hot', pattern: 'Short O' },
            { word: 'cup', pattern: 'Short U' },
            { word: 'map', pattern: 'CVC' },
            { word: 'sun', pattern: 'CVC' },
            { word: 'fish', pattern: 'Digraph SH' },
            { word: 'chip', pattern: 'Digraph CH' },
            { word: 'thin', pattern: 'Digraph TH' }
        ]
    },
    {
        id: 'within-word',
        label: 'Within Word Pattern',
        words: [
            { word: 'rain', pattern: 'Vowel Team AI' },
            { word: 'boat', pattern: 'Vowel Team OA' },
            { word: 'seed', pattern: 'Vowel Team EE' },
            { word: 'night', pattern: 'Long I' },
            { word: 'snow', pattern: 'Long O' },
            { word: 'coin', pattern: 'Diphthong OI' },
            { word: 'out', pattern: 'Diphthong OU' },
            { word: 'bird', pattern: 'R-Controlled IR' },
            { word: 'fork', pattern: 'R-Controlled OR' },
            { word: 'turn', pattern: 'R-Controlled UR' }
        ]
    },
    {
        id: 'syllable-juncture',
        label: 'Syllable Juncture',
        words: [
            { word: 'rabbit', pattern: 'Closed + Closed' },
            { word: 'picnic', pattern: 'Closed + Closed' },
            { word: 'paper', pattern: 'Open + Closed' },
            { word: 'sunset', pattern: 'Compound' },
            { word: 'campfire', pattern: 'Compound' },
            { word: 'robot', pattern: 'Open + Closed' },
            { word: 'sticky', pattern: 'Vowel + Y' },
            { word: 'napkin', pattern: 'Closed + Closed' }
        ]
    },
    {
        id: 'derivational',
        label: 'Derivational Relations',
        words: [
            { word: 'music', pattern: 'Base + ic' },
            { word: 'musician', pattern: 'Base + ian' },
            { word: 'danger', pattern: 'Base + er' },
            { word: 'dangerous', pattern: 'Base + ous' },
            { word: 'celebrate', pattern: 'Base' },
            { word: 'celebration', pattern: 'Base + tion' }
        ]
    }
];

let appSettings = { ...DEFAULT_SETTINGS };

// --- AUDIO DATABASE SETUP (IndexedDB) ---
const DB_NAME = "PhonicsAudioDB";
const STORE_NAME = "audio_files";
let db;
let dbReadyResolve;
const dbReady = new Promise((resolve) => {
    dbReadyResolve = resolve;
});

function initDB() {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = (event) => {
        db = event.target.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
            db.createObjectStore(STORE_NAME);
        }
    };
    request.onsuccess = (event) => {
        db = event.target.result;
        if (dbReadyResolve) dbReadyResolve(db);
    };
    request.onerror = (event) => {
        console.error("DB Error", event);
        if (dbReadyResolve) dbReadyResolve(null);
    };
}

function saveAudioToDB(key, blob) {
    if (!db) return;
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    store.put(blob, key);
}

function getAudioFromDB(key) {
    return new Promise((resolve) => {
        if (!db) return resolve(null);
        const tx = db.transaction(STORE_NAME, "readonly");
        const store = tx.objectStore(STORE_NAME);
        const req = store.get(key);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => resolve(null);
    });
}

async function ensureDBReady() {
    if (db) return db;
    return dbReady;
}

async function deleteAudioFromDB(key) {
    const database = await ensureDBReady();
    if (!database) return false;
    return new Promise((resolve) => {
        const tx = database.transaction(STORE_NAME, "readwrite");
        const store = tx.objectStore(STORE_NAME);
        const req = store.delete(key);
        req.onsuccess = () => resolve(true);
        req.onerror = () => resolve(false);
    });
}

async function listAudioKeys() {
    const database = await ensureDBReady();
    if (!database) return [];
    return new Promise((resolve) => {
        const keys = [];
        const tx = database.transaction(STORE_NAME, "readonly");
        const store = tx.objectStore(STORE_NAME);
        const req = store.openCursor();
        req.onsuccess = () => {
            const cursor = req.result;
            if (cursor) {
                keys.push(cursor.key);
                cursor.continue();
            } else {
                resolve(keys);
            }
        };
        req.onerror = () => resolve(keys);
    });
}

async function deleteAudioByFilter(predicate) {
    const keys = await listAudioKeys();
    const targets = keys.filter(predicate);
    await Promise.all(targets.map(key => deleteAudioFromDB(key)));
    return targets.length;
}

async function countRecordingsByType() {
    const keys = await listAudioKeys();
    const counts = { total: keys.length, word: 0, sentence: 0, phoneme: 0 };
    keys.forEach(key => {
        if (key.endsWith('_word')) counts.word += 1;
        else if (key.endsWith('_sentence')) counts.sentence += 1;
        else if (key.startsWith('phoneme_')) counts.phoneme += 1;
    });
    return counts;
}

function normalizePackedTtsLanguage(languageCode = 'en') {
    const code = String(languageCode || 'en').trim().toLowerCase();
    if (!code) return 'en';
    if (code === 'en' || code.startsWith('en-')) return 'en';
    if (code === 'es' || code.startsWith('es-')) return 'es';
    if (code === 'zh' || code.startsWith('zh-') || code === 'cmn') return 'zh';
    if (code === 'tl' || code === 'tagalog' || code === 'fil' || code.startsWith('fil-') || code === 'filipino') return 'tl';
    if (code === 'hi' || code.startsWith('hi-')) return 'hi';
    return code.slice(0, 2);
}

function normalizePackedTtsType(type = 'word') {
    const raw = String(type || 'word').trim().toLowerCase();
    if (raw === 'definition' || raw === 'def') return 'def';
    if (raw === 'sentence' || raw === 'sent') return 'sentence';
    if (raw === 'passage' || raw === 'text') return 'passage';
    if (raw === 'phoneme' || raw === 'sound') return 'phoneme';
    return 'word';
}

// MUST match literacy-platform/scripts/export-azure-tts.js safeWordSlug.
function safeWordSlug(word = '') {
    const slug = String(word || '')
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
    return slug || 'word';
}

function normalizeTextForCompare(text = '') {
    return String(text || '')
        .replace(/\u200B/g, '')
        .replace(/\s+/g, ' ')
        .trim()
        .toLowerCase();
}

function getCurrentEntryByLanguage(languageCode = 'en') {
    const resolvedEntry = getWordEntryForAudience(currentWord) || currentEntry;
    if (!resolvedEntry) return null;
    const lang = normalizePackedTtsLanguage(languageCode);
    if (lang === 'en') return resolvedEntry.en || resolvedEntry || null;
    return resolvedEntry[lang] || resolvedEntry.en || resolvedEntry || null;
}

function resolveCurrentWordTtsType(text, languageCode = 'en', requestedType = 'word') {
    const normalizedText = normalizeTextForCompare(text);
    const requested = normalizePackedTtsType(requestedType);
    if (!normalizedText) return requested;

    const normalizedWord = normalizeTextForCompare(currentWord || '');
    if (normalizedWord && normalizedText === normalizedWord) return 'word';

    const entryByLang = getCurrentEntryByLanguage(languageCode);
    const langDef = normalizeTextForCompare(entryByLang?.def || '');
    const langSentence = normalizeTextForCompare(entryByLang?.sentence || '');
    if (langDef && normalizedText === langDef) return 'def';
    if (langSentence && normalizedText === langSentence) return 'sentence';

    const englishDef = normalizeTextForCompare(currentEntry?.en?.def || '');
    const englishSentence = normalizeTextForCompare(currentEntry?.en?.sentence || '');
    if (englishDef && normalizedText === englishDef) return 'def';
    if (englishSentence && normalizedText === englishSentence) return 'sentence';

    return requested;
}

function getPackedTtsManifestKey(word, languageCode, type) {
    const rawWord = String(word || '').trim();
    if (!rawWord) return '';
    const lang = normalizePackedTtsLanguage(languageCode);
    const entryType = normalizePackedTtsType(type);
    return `${safeWordSlug(rawWord)}|${lang}|${entryType}`;
}

function getLegacyPackedTtsManifestKey(word, languageCode, type) {
    const normalizedWord = String(word || '').trim().toLowerCase();
    if (!normalizedWord) return '';
    const lang = normalizePackedTtsLanguage(languageCode);
    const entryType = normalizePackedTtsType(type);
    return `${normalizedWord}|${lang}|${entryType}`;
}

function normalizePhonemeSoundKey(soundKey = '') {
    const raw = String(soundKey || '').trim().toLowerCase();
    if (!raw) return '';
    return raw.replace(/\s+/g, '-');
}

function getPackedPhonemeManifestKey(soundKey = '', languageCode = 'en') {
    const normalizedSound = normalizePhonemeSoundKey(soundKey);
    if (!normalizedSound) return '';
    const lang = normalizePackedTtsLanguage(languageCode);
    return `@phoneme:${normalizedSound}|${lang}|phoneme`;
}

function normalizePassageSlug(title = '') {
    const raw = String(title || '')
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
    return raw || '';
}

function getPackedPassageManifestKey(title = '', languageCode = 'en') {
    const slug = normalizePassageSlug(title);
    if (!slug) return '';
    const lang = normalizePackedTtsLanguage(languageCode);
    return `@passage:${slug}|${lang}|passage`;
}

function parsePackedTtsManifestKey(key = '') {
    const parts = String(key || '').split('|');
    if (parts.length < 3) return null;
    const [word, languageCode, type] = parts;
    if (!word || !languageCode || !type) return null;
    return {
        word: word.toLowerCase(),
        languageCode: normalizePackedTtsLanguage(languageCode),
        type: normalizePackedTtsType(type)
    };
}

function summarizePackedTtsEntries(entries = {}) {
    const summary = {
        total: 0,
        byLanguage: {},
        byType: {}
    };
    Object.keys(entries || {}).forEach((key) => {
        const parsed = parsePackedTtsManifestKey(key);
        if (!parsed) return;
        summary.total += 1;
        summary.byLanguage[parsed.languageCode] = (summary.byLanguage[parsed.languageCode] || 0) + 1;
        summary.byType[parsed.type] = (summary.byType[parsed.type] || 0) + 1;
    });
    return summary;
}

function clearPackedTtsCaches() {
    packedTtsManifestCacheByPath.clear();
    packedTtsManifestPromiseByPath.clear();
    packedTtsPackRegistryCache = null;
    packedTtsPackRegistryPromise = null;
}

function normalizePackManifestPath(rawPath = '') {
    const candidate = String(rawPath || '').trim();
    if (!candidate) return '';
    if (/^(https?:)?\/\//i.test(candidate)) return candidate;

    const normalized = candidate
        .replace(/^\.\/+/, '')
        .replace(/^\/+/, '');
    const base = PACKED_TTS_BASE_PATH.replace(/\/+$/, '');
    const plainBase = PACKED_TTS_BASE_PLAIN;
    const scopedBase = PACKED_TTS_BASE_SCOPED;

    if (normalized === base || normalized.startsWith(`${base}/`)) {
        return normalized;
    }

    if ((normalized === plainBase || normalized.startsWith(`${plainBase}/`)) && base === scopedBase) {
        const suffix = normalized.slice(plainBase.length).replace(/^\/+/, '');
        return suffix ? `${base}/${suffix}` : base;
    }

    if ((normalized === scopedBase || normalized.startsWith(`${scopedBase}/`)) && base === plainBase) {
        const suffix = normalized.slice(scopedBase.length).replace(/^\/+/, '');
        return suffix ? `${base}/${suffix}` : base;
    }

    if (normalized.startsWith('packs/') || normalized.startsWith('tts-manifest')) {
        return `${base}/${normalized}`;
    }

    // All other relative paths (e.g. "en/word/stand.mp3" from manifest) must resolve against base
    return `${base}/${normalized}`;
}

function remapPackedPathToBase(rawPath = '', targetBase = PACKED_TTS_BASE_PATH) {
    const normalized = String(rawPath || '').trim();
    const target = normalizePackedTtsBasePath(targetBase);
    if (!normalized || !target || /^(https?:)?\/\//i.test(normalized)) return normalized;

    if (normalized.startsWith(`${PACKED_TTS_BASE_PLAIN}/`)) {
        return `${target}/${normalized.slice(PACKED_TTS_BASE_PLAIN.length + 1)}`;
    }
    if (normalized.startsWith(`${PACKED_TTS_BASE_SCOPED}/`)) {
        return `${target}/${normalized.slice(PACKED_TTS_BASE_SCOPED.length + 1)}`;
    }
    if (normalized === PACKED_TTS_BASE_PLAIN || normalized === PACKED_TTS_BASE_SCOPED) {
        return target;
    }
    return normalized;
}

function getDefaultTtsPackOption() {
    return {
        id: 'ava-multi',
        name: 'Default voice pack',
        manifestPath: PACKED_TTS_DEFAULT_MANIFEST_PATH,
        description: 'Uses clips generated into audio/tts.'
    };
}

function normalizeTtsPackRegistry(rawRegistry) {
    const defaultPack = getDefaultTtsPackOption();
    if (!rawRegistry || typeof rawRegistry !== 'object' || !Array.isArray(rawRegistry.packs)) {
        return {
            packs: [defaultPack],
            packMap: { default: defaultPack }
        };
    }

    const normalizedPacks = [];
    rawRegistry.packs.forEach((pack) => {
        if (!pack || typeof pack !== 'object') return;
        const id = normalizeTtsPackId(pack.id);
        if (id === 'default') return;
        const manifestPath = normalizePackManifestPath(pack.manifestPath);
        if (!manifestPath) return;
        normalizedPacks.push({
            id,
            name: String(pack.name || id).trim() || id,
            manifestPath,
            description: String(pack.description || '').trim(),
            generatedAt: pack.generatedAt || '',
            languages: Array.isArray(pack.languages) ? pack.languages : [],
            fields: Array.isArray(pack.fields) ? pack.fields : []
        });
    });

    const packs = [defaultPack, ...normalizedPacks];
    const packMap = {};
    packs.forEach((pack) => {
        packMap[pack.id] = pack;
    });
    return { packs, packMap };
}

async function loadPackedTtsPackRegistry() {
    return null; 
}

async function resolvePackedTtsManifestInfo(packId = '') {
    return {
        id: 'ava-multi',
        manifestPath: `${PACKED_TTS_BASE_PATH}/tts-manifest.json`
    };
}

async function loadPackedTtsManifestFromPath(manifestPath = '') {
    try {
        const response = await fetch(manifestPath);
        if (response.ok) return await response.json();
    } catch (e) {
        console.log("Manifest not found, playing audio directly.");
    }
    return { words: {}, sentences: {} };
}
async function loadPackedTtsManifest() {
    const selectedPack = await resolvePackedTtsManifestInfo();
    const manifest = await loadPackedTtsManifestFromPath(selectedPack.manifestPath);
    if (manifest && typeof manifest === 'object') {
        manifest.__packId = selectedPack.id;
        manifest.__packName = selectedPack.name;
        manifest.__manifestPath = selectedPack.manifestPath;
    }
    return manifest;
}

function getPackedClipPathCandidates(rawPath = '') {
    const normalized = normalizePackManifestPath(rawPath);
    if (!normalized) return [];
    const preferredBase = normalizePackedTtsBasePath(resolvePackedTtsBasePath()) || PACKED_TTS_BASE_PATH;
    const candidates = [
        remapPackedPathToBase(normalized, preferredBase),
        remapPackedPathToBase(normalized, PACKED_TTS_BASE_PLAIN),
        remapPackedPathToBase(normalized, PACKED_TTS_BASE_SCOPED),
        normalized
    ];

    const deduped = Array.from(new Set(candidates.filter(Boolean)));
    deduped.sort((a, b) => {
        const aScore = a.startsWith(`${preferredBase}/`) || a === preferredBase ? 0 : 1;
        const bScore = b.startsWith(`${preferredBase}/`) || b === preferredBase ? 0 : 1;
        if (aScore !== bScore) return aScore - bScore;
        return a.length - b.length;
    });
    return deduped;
}

async function playPackedClipWithFallbackPaths(rawPath = '', options = {}) {
    const candidates = getPackedClipPathCandidates(rawPath);
    for (const candidate of candidates) {
        const played = await playAudioClipUrl(candidate, options);
        if (played) return true;
    }
    return false;
}

async function findPackedTtsClipAcrossPacks(manifestKey = '', languageCode = 'en') {
    const key = String(manifestKey || '').trim();
    if (!key) return '';
    const targetLang = normalizePackedTtsLanguage(languageCode);
    const registry = await loadPackedTtsPackRegistry();
    const packs = Array.isArray(registry?.packs) ? registry.packs.slice() : [];
    if (!packs.length) return '';

    const ordered = packs.sort((a, b) => {
        const aHasLang = Array.isArray(a?.languages) && a.languages.some((lang) => normalizePackedTtsLanguage(lang) === targetLang);
        const bHasLang = Array.isArray(b?.languages) && b.languages.some((lang) => normalizePackedTtsLanguage(lang) === targetLang);
        if (aHasLang !== bHasLang) return aHasLang ? -1 : 1;
        if (a?.id === 'default' && b?.id !== 'default') return 1;
        if (b?.id === 'default' && a?.id !== 'default') return -1;
        return String(a?.name || a?.id || '').localeCompare(String(b?.name || b?.id || ''));
    });

    for (const pack of ordered) {
        const manifestPath = pack?.manifestPath || PACKED_TTS_DEFAULT_MANIFEST_PATH;
        const manifest = await loadPackedTtsManifestFromPath(manifestPath);
        const clipPath = manifest?.entries?.[key];
        if (clipPath) return clipPath;
    }
    return '';
}

function orderPacksForLanguage(packs = [], languageCode = 'en') {
    const targetLang = normalizePackedTtsLanguage(languageCode);
    const preferredPackId = getPreferredTtsPackId();
    return packs.slice().sort((a, b) => {
        if ((a?.id || '') === preferredPackId && (b?.id || '') !== preferredPackId) return -1;
        if ((b?.id || '') === preferredPackId && (a?.id || '') !== preferredPackId) return 1;
        const aHasLang = Array.isArray(a?.languages) && a.languages.some((lang) => normalizePackedTtsLanguage(lang) === targetLang);
        const bHasLang = Array.isArray(b?.languages) && b.languages.some((lang) => normalizePackedTtsLanguage(lang) === targetLang);
        if (aHasLang !== bHasLang) return aHasLang ? -1 : 1;
        if (a?.id === 'default' && b?.id !== 'default') return 1;
        if (b?.id === 'default' && a?.id !== 'default') return -1;
        return String(a?.name || a?.id || '').localeCompare(String(b?.name || b?.id || ''));
    });
}

async function tryPlayPackedClipByDirectPath({
    word = '',
    languageCode = 'en',
    type = 'word',
    playbackRate = 1,
    sourceId = '',
    onPlay = null
} = {}) {
    const rawWord = String(word || '').trim();
    if (!rawWord) return false;
    const normalizedLang = normalizePackedTtsLanguage(languageCode);
    const normalizedType = normalizePackedTtsType(type);
    const encodedWord = encodeURIComponent(safeWordSlug(rawWord));

    const registry = await loadPackedTtsPackRegistry();
    const packs = Array.isArray(registry?.packs) && registry.packs.length
        ? registry.packs
        : [getDefaultTtsPackOption()];
    const orderedPacks = orderPacksForLanguage(packs, normalizedLang);

    for (const pack of orderedPacks) {
        const packId = String(pack?.id || '').trim();
        if (!packId) continue;
        const candidate = `${PACKED_TTS_BASE_PATH}/packs/${packId}/${normalizedLang}/${normalizedType}/${encodedWord}.mp3`;
        const played = await playPackedClipWithFallbackPaths(candidate, { playbackRate, sourceId, onPlay });
        if (played) return true;
    }
    return false;
}

function stopAllActiveAudioPlayers() {
    activeAudioPlayers.forEach((audio) => {
        try {
            audio.pause();
            audio.currentTime = 0;
        } catch (e) {}
    });
    activeAudioPlayers.clear();
    activePlaybackSourceId = '';
}

function normalizePlaybackSourceId(value = '') {
    return String(value || '').trim().toLowerCase();
}

function getActiveAudioPlayerBySourceId(sourceId = '') {
    const normalized = normalizePlaybackSourceId(sourceId);
    if (!normalized) return null;
    for (const audio of activeAudioPlayers) {
        if (!(audio instanceof HTMLAudioElement)) continue;
        if (audio.dataset.playbackSourceId !== normalized) continue;
        if (!audio.paused && !audio.ended) return audio;
    }
    return null;
}

function stopAudioPlayerInstance(audio) {
    if (!(audio instanceof HTMLAudioElement)) return;
    try {
        audio.pause();
        audio.currentTime = 0;
    } catch (e) {}
    activeAudioPlayers.delete(audio);
}

function beginExclusivePlaybackForSource(sourceId = '') {
    const normalized = normalizePlaybackSourceId(sourceId);
    const activeSameSource = getActiveAudioPlayerBySourceId(normalized);
    if (activeSameSource) {
        stopAudioPlayerInstance(activeSameSource);
        if (activePlaybackSourceId === normalized) {
            activePlaybackSourceId = '';
        }
        return { proceed: false, sourceId: normalized, reason: 'same-source-toggled' };
    }

    stopAllActiveAudioPlayers();
    cancelPendingSpeech(true);
    activePlaybackSourceId = normalized;
    return { proceed: true, sourceId: normalized, reason: '' };
}

async function playAudioClipUrl(url, options = {}) {
    if (!url) return false;
    const playbackRate = normalizeDecodableReadSpeed(options.playbackRate ?? 1);
    const sourceId = normalizePlaybackSourceId(options.sourceId || '');
    const onPlay = typeof options.onPlay === 'function' ? options.onPlay : null;
    const audio = new Audio(url);
    audio.playbackRate = playbackRate;
    if (sourceId) {
        audio.dataset.playbackSourceId = sourceId;
    }
    activeAudioPlayers.add(audio);
    const cleanup = () => {
        activeAudioPlayers.delete(audio);
        if (sourceId && activePlaybackSourceId === sourceId) {
            const hasSameSourceActive = Array.from(activeAudioPlayers).some((player) => (
                player instanceof HTMLAudioElement
                && player.dataset.playbackSourceId === sourceId
                && !player.paused
                && !player.ended
            ));
            if (!hasSameSourceActive) {
                activePlaybackSourceId = '';
            }
        }
    };
    audio.onended = cleanup;
    audio.onerror = cleanup;
    try {
        await audio.play();
        if (onPlay) {
            try { onPlay(audio); } catch (e) {}
        }
        return true;
    } catch {
        cleanup();
        return false;
    }
}

function shouldUsePackedClipForCurrentRevealText({ text = '', languageCode = 'en', type = 'word' } = {}) {
    const normalizedText = normalizeTextForCompare(text);
    if (!normalizedText) return false;
    const normalizedType = normalizePackedTtsType(type);
    const normalizedLang = normalizePackedTtsLanguage(languageCode);

    // Translation clips should remain usable even when displayed text was
    // lightly transformed (punctuation/safety trimming).
    if (normalizedLang !== 'en') return true;

    if (normalizedType === 'word') {
        return normalizedText === normalizeTextForCompare(currentWord || '');
    }
    if (normalizedType !== 'def' && normalizedType !== 'sentence') {
        return true;
    }

    const lang = normalizePackedTtsLanguage(languageCode);
    const mode = getResolvedAudienceMode();
    const expected = getWordCopyForAudience(currentWord, lang, mode);
    let expectedText = normalizedType === 'def'
        ? normalizeTextForCompare(expected?.definition || '')
        : normalizeTextForCompare(expected?.sentence || '');
    if (!expectedText && lang !== 'en') {
        const translated = getTranslationData(currentWord, lang, { audienceMode: mode });
        expectedText = normalizedType === 'def'
            ? normalizeTextForCompare(translated?.definition || '')
            : normalizeTextForCompare(translated?.sentence || '');
    }
    if (!expectedText) return false;
    return normalizedText === expectedText;
}

async function tryPlayPackedTtsForCurrentWord({
    text = '',
    languageCode = 'en',
    type = 'word',
    playbackRate = 1,
    sourceId = '',
    onPlay = null
} = {}) {
    if (!shouldAttemptPackedTtsLookup()) return false;
    const word = String(currentWord || '').trim().toLowerCase();
    if (!word || !text) return false;
    if (!shouldUsePackedClipForCurrentRevealText({ text, languageCode, type })) return false;
    const manifest = await loadPackedTtsManifest();
    if (!manifest?.entries) return false;
    const resolvedType = resolveCurrentWordTtsType(text, languageCode, type);
    const key = getPackedTtsManifestKey(word, languageCode, resolvedType);
    const legacyKey = getLegacyPackedTtsManifestKey(word, languageCode, resolvedType);
    if (!key) return false;
    const primaryClip = manifest.entries[key] || (legacyKey && legacyKey !== key ? manifest.entries[legacyKey] : '');
    if (primaryClip) {
        const played = await playPackedClipWithFallbackPaths(primaryClip, { playbackRate, sourceId, onPlay });
        if (played) return true;
    }

    const activePackId = normalizeTtsPackId(manifest.__packId || 'default');
    if (activePackId !== 'default') {
        const fallbackManifest = await loadPackedTtsManifestFromPath(PACKED_TTS_DEFAULT_MANIFEST_PATH);
        const fallbackClip = fallbackManifest?.entries?.[key]
            || (legacyKey && legacyKey !== key ? fallbackManifest?.entries?.[legacyKey] : '');
        if (fallbackClip) {
            const played = await playPackedClipWithFallbackPaths(fallbackClip, { playbackRate, sourceId, onPlay });
            if (played) return true;
        }
    }
    let crossPackClip = await findPackedTtsClipAcrossPacks(key, languageCode);
    if (!crossPackClip && legacyKey && legacyKey !== key) {
        crossPackClip = await findPackedTtsClipAcrossPacks(legacyKey, languageCode);
    }
    if (crossPackClip) {
        const played = await playPackedClipWithFallbackPaths(crossPackClip, { playbackRate, sourceId, onPlay });
        if (played) return true;
    }
    return tryPlayPackedClipByDirectPath({
        word,
        languageCode,
        type: resolvedType,
        playbackRate,
        sourceId,
        onPlay
    });
}

async function resolvePackedTtsClipByManifestKey(manifestKey = '', languageCode = 'en') {
    const key = String(manifestKey || '').trim();
    if (!key) return '';
    const normalizedLang = normalizePackedTtsLanguage(languageCode);

    const manifest = await loadPackedTtsManifest();
    const primaryClip = manifest?.entries?.[key];
    if (primaryClip) return primaryClip;

    const activePackId = normalizeTtsPackId(manifest?.__packId || 'default');
    if (activePackId !== 'default') {
        const fallbackManifest = await loadPackedTtsManifestFromPath(PACKED_TTS_DEFAULT_MANIFEST_PATH);
        const fallbackClip = fallbackManifest?.entries?.[key];
        if (fallbackClip) return fallbackClip;
    }

    return await findPackedTtsClipAcrossPacks(key, normalizedLang);
}

function normalizeLiteralPackedTtsLookupText(text = '') {
    return String(text || '')
        .replace(/\u200B/g, '')
        .replace(/\s+/g, ' ')
        .replace(/[“”]/g, '"')
        .replace(/[‘’]/g, "'")
        .trim()
        .toLowerCase();
}

async function tryPlayPackedTtsForLiteralText({
    text = '',
    languageCode = 'en',
    type = 'sentence',
    playbackRate = 1,
    sourceId = '',
    onPlay = null
} = {}) {
    if (!shouldAttemptPackedTtsLookup()) return false;
    const normalizedText = normalizeLiteralPackedTtsLookupText(text);
    if (!normalizedText) return false;
    const normalizedLang = normalizePackedTtsLanguage(languageCode);

    const keyTypes = Array.from(new Set([
        normalizePackedTtsType(type),
        'sentence',
        'def',
        'word'
    ]));
    for (const entryType of keyTypes) {
        const key = getPackedTtsManifestKey(normalizedText, normalizedLang, entryType);
        const legacyKey = getLegacyPackedTtsManifestKey(normalizedText, normalizedLang, entryType);
        let clipPath = await resolvePackedTtsClipByManifestKey(key, normalizedLang);
        if (!clipPath && legacyKey && legacyKey !== key) {
            clipPath = await resolvePackedTtsClipByManifestKey(legacyKey, normalizedLang);
        }
        if (!clipPath) continue;
        const played = await playPackedClipWithFallbackPaths(clipPath, { playbackRate, sourceId, onPlay });
        if (played) return true;
    }
    return false;
}

async function tryPlayPreferredPackPreviewClip(languageCode = 'en') {
    if (!shouldAttemptPackedTtsLookup()) return false;
    const normalizedLang = normalizePackedTtsLanguage(languageCode);
    const manifest = await loadPackedTtsManifest();
    const entries = manifest?.entries;
    if (!entries || typeof entries !== 'object') return false;

    let sentenceClip = '';
    let definitionClip = '';
    let wordClip = '';
    let anyClip = '';

    Object.entries(entries).some(([key, clipPath]) => {
        if (!clipPath) return false;
        if (!anyClip) anyClip = clipPath;
        const parsed = parsePackedTtsManifestKey(key);
        if (!parsed || parsed.languageCode !== normalizedLang) return false;
        if (parsed.type === 'sentence' && !sentenceClip) sentenceClip = clipPath;
        if (parsed.type === 'def' && !definitionClip) definitionClip = clipPath;
        if (parsed.type === 'word' && !wordClip) wordClip = clipPath;
        return !!(sentenceClip && definitionClip && wordClip);
    });

    const preferredClip = sentenceClip || definitionClip || wordClip || anyClip;
    if (!preferredClip) return false;
    return playPackedClipWithFallbackPaths(preferredClip);
}

async function hasPackedClipByDirectPath({ word = '', languageCode = 'en', type = 'word' } = {}) {
    const rawWord = String(word || '').trim();
    if (!rawWord) return false;
    const normalizedLang = normalizePackedTtsLanguage(languageCode);
    const normalizedType = normalizePackedTtsType(type);
    const encodedWord = encodeURIComponent(safeWordSlug(rawWord));
    const registry = await loadPackedTtsPackRegistry();
    const packs = Array.isArray(registry?.packs) && registry.packs.length
        ? registry.packs
        : [getDefaultTtsPackOption()];
    const orderedPacks = orderPacksForLanguage(packs, normalizedLang);

    for (const pack of orderedPacks) {
        const packId = String(pack?.id || '').trim();
        if (!packId) continue;
        const candidate = `${PACKED_TTS_BASE_PATH}/packs/${packId}/${normalizedLang}/${normalizedType}/${encodedWord}.mp3`;
        const variants = getPackedClipPathCandidates(candidate);
        for (const variant of variants) {
            try {
                const response = await fetch(variant, { method: 'HEAD' });
                if (response.ok) return true;
            } catch (e) {}
        }
    }
    return false;
}

async function hasPackedTtsClipForCurrentWord({ text = '', languageCode = 'en', type = 'word' } = {}) {
    if (!shouldAttemptPackedTtsLookup()) return false;
    const word = String(currentWord || '').trim().toLowerCase();
    if (!word || !text) return false;
    if (!shouldUsePackedClipForCurrentRevealText({ text, languageCode, type })) return false;
    const manifest = await loadPackedTtsManifest();
    if (!manifest?.entries) return false;

    const resolvedType = resolveCurrentWordTtsType(text, languageCode, type);
    const key = getPackedTtsManifestKey(word, languageCode, resolvedType);
    const legacyKey = getLegacyPackedTtsManifestKey(word, languageCode, resolvedType);
    if (!key) return false;
    if (manifest.entries[key] || (legacyKey && legacyKey !== key && manifest.entries[legacyKey])) return true;

    const activePackId = normalizeTtsPackId(manifest.__packId || 'default');
    if (activePackId !== 'default') {
        const fallbackManifest = await loadPackedTtsManifestFromPath(PACKED_TTS_DEFAULT_MANIFEST_PATH);
        if (fallbackManifest?.entries?.[key]
            || (legacyKey && legacyKey !== key && fallbackManifest?.entries?.[legacyKey])) return true;
    }
    let crossPackClip = await findPackedTtsClipAcrossPacks(key, languageCode);
    if (!crossPackClip && legacyKey && legacyKey !== key) {
        crossPackClip = await findPackedTtsClipAcrossPacks(legacyKey, languageCode);
    }
    if (crossPackClip) return true;
    return hasPackedClipByDirectPath({
        word,
        languageCode,
        type: resolvedType
    });
}

async function tryPlayPackedPhoneme(soundKey = '', languageCode = 'en') {
    if (!shouldAttemptPackedTtsLookup()) return false;
    const normalizedSound = normalizePhonemeSoundKey(soundKey);
    if (!normalizedSound) return false;

    const manifest = await loadPackedTtsManifest();
    const key = getPackedPhonemeManifestKey(normalizedSound, languageCode);
    const primaryClip = manifest?.entries?.[key];
    if (primaryClip) {
        const played = await playPackedClipWithFallbackPaths(primaryClip);
        if (played) return true;
    }

    const activePackId = normalizeTtsPackId(manifest?.__packId || 'default');
    if (activePackId !== 'default') {
        const fallbackManifest = await loadPackedTtsManifestFromPath(PACKED_TTS_DEFAULT_MANIFEST_PATH);
        const fallbackClip = fallbackManifest?.entries?.[key];
        if (fallbackClip) {
            return playPackedClipWithFallbackPaths(fallbackClip);
        }
    }

    return false;
}

async function tryPlayPackedPassageClip({
    title = '',
    languageCode = 'en',
    playbackRate = 1,
    onPlay = null
} = {}) {
    if (!shouldAttemptPackedTtsLookup()) return false;
    const key = getPackedPassageManifestKey(title, languageCode);
    if (!key) return false;

    const manifest = await loadPackedTtsManifest();
    const primaryClip = manifest?.entries?.[key];
    if (primaryClip) {
        const played = await playPackedClipWithFallbackPaths(primaryClip, { playbackRate, onPlay });
        if (played) return true;
    }

    const activePackId = normalizeTtsPackId(manifest?.__packId || 'default');
    if (activePackId !== 'default') {
        const fallbackManifest = await loadPackedTtsManifestFromPath(PACKED_TTS_DEFAULT_MANIFEST_PATH);
        const fallbackClip = fallbackManifest?.entries?.[key];
        if (fallbackClip) {
            return playPackedClipWithFallbackPaths(fallbackClip, { playbackRate, onPlay });
        }
    }

    return false;
}

function getPhonemeRecordingKey(sound = '') {
    return `phoneme_${sound.toString().toLowerCase()}`;
}

function getPhonemeVideoRecordingKey(sound = '') {
    return `phonemevideo_${sound.toString().toLowerCase()}`;
}

function releaseActiveSoundVideoUrl() {
    if (activeSoundVideoObjectUrl) {
        try {
            URL.revokeObjectURL(activeSoundVideoObjectUrl);
        } catch (e) {}
        activeSoundVideoObjectUrl = '';
    }
}

function normalizeSoundVideoFilename(sound = '') {
    return normalizePhonemeSoundKey(sound)
        .replace(/[^a-z0-9-]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-+|-+$/g, '');
}

function buildBundledPhonemeVideoCandidates(sound = '', phoneme = null) {
    const candidates = [];
    const customVideo = (phoneme && typeof phoneme.video === 'string') ? phoneme.video.trim() : '';
    if (customVideo) candidates.push(customVideo);
    const fileSafe = normalizeSoundVideoFilename(sound);
    if (!fileSafe) return candidates;
    PHONEME_VIDEO_LIBRARY_CANDIDATE_DIRS.forEach((dir) => {
        candidates.push(`${dir}/${fileSafe}.mp4`);
        candidates.push(`${dir}/${fileSafe}.webm`);
    });
    return Array.from(new Set(candidates));
}

async function canLoadVideoUrl(url = '') {
    if (!url) return false;
    try {
        const res = await fetch(url, { method: 'HEAD', cache: 'no-store' });
        if (res.ok) return true;
    } catch (e) {}
    try {
        const res = await fetch(url, {
            method: 'GET',
            cache: 'no-store',
            headers: { Range: 'bytes=0-1' }
        });
        return !!res.ok;
    } catch (e) {
        return false;
    }
}

async function resolveBundledPhonemeVideoUrl(sound = '', phoneme = null) {
    const normalizedSound = normalizePhonemeSoundKey(sound);
    if (!normalizedSound) return '';
    if (phonemeVideoLookupCache.has(normalizedSound)) {
        return phonemeVideoLookupCache.get(normalizedSound) || '';
    }
    const candidates = buildBundledPhonemeVideoCandidates(normalizedSound, phoneme);
    for (const url of candidates) {
        // eslint-disable-next-line no-await-in-loop
        if (await canLoadVideoUrl(url)) {
            phonemeVideoLookupCache.set(normalizedSound, url);
            return url;
        }
    }
    phonemeVideoLookupCache.set(normalizedSound, '');
    return '';
}

async function resolvePhonemeVideoSource(sound = '', phoneme = null) {
    const normalizedSound = normalizePhonemeSoundKey(sound);
    if (!normalizedSound) return null;

    await ensureDBReady();
    const teacherBlob = await getAudioFromDB(getPhonemeVideoRecordingKey(normalizedSound));
    if (teacherBlob) {
        releaseActiveSoundVideoUrl();
        activeSoundVideoObjectUrl = URL.createObjectURL(teacherBlob);
        return {
            url: activeSoundVideoObjectUrl,
            source: 'teacher',
            kind: 'blob'
        };
    }

    releaseActiveSoundVideoUrl();
    const bundled = await resolveBundledPhonemeVideoUrl(normalizedSound, phoneme);
    if (bundled) {
        return {
            url: bundled,
            source: 'library',
            kind: 'url'
        };
    }
    return null;
}

function setSoundVideoStatus(message = '', tone = 'info') {
    const statusEl = document.getElementById('sound-video-status');
    if (!statusEl) return;
    statusEl.textContent = message || '';
    statusEl.dataset.tone = tone;
}

function getSoundVideoPlayer() {
    return document.getElementById('sound-video-player');
}

function clearSoundVideoPlayer() {
    const videoEl = getSoundVideoPlayer();
    if (!videoEl) return;
    try { videoEl.pause(); } catch (e) {}
    videoEl.removeAttribute('src');
    videoEl.load();
    videoEl.classList.add('hidden');
    videoEl.dataset.source = '';
}

async function showPhonemeVideoPreview(sound = '', phoneme = null, options = {}) {
    const videoEl = getSoundVideoPlayer();
    if (!videoEl) return false;
    const autoplay = !!options.autoplay;
    const source = await resolvePhonemeVideoSource(sound, phoneme);
    if (!source?.url) {
        clearSoundVideoPlayer();
        setSoundVideoStatus('No sound clip yet. Add one with Record or Upload.', 'warn');
        return false;
    }

    videoEl.src = source.url;
    videoEl.classList.remove('hidden');
    videoEl.dataset.source = source.source;
    setSoundVideoStatus(
        source.source === 'teacher'
            ? 'Using teacher video for this sound.'
            : 'Using library video for this sound.',
        source.source === 'teacher' ? 'success' : 'info'
    );
    if (autoplay) {
        try {
            await videoEl.play();
        } catch (e) {}
    }
    return true;
}

function clearPhonemeCache(sound = '') {
    if (!sound) return;
    const key = getPhonemeRecordingKey(sound);
    const cached = phonemeAudioCache.get(key);
    if (cached?.url) URL.revokeObjectURL(cached.url);
    phonemeAudioCache.delete(key);
}

function clearAllPhonemeCache() {
    phonemeAudioCache.forEach(entry => {
        if (entry?.url) URL.revokeObjectURL(entry.url);
    });
    phonemeAudioCache.clear();
    phonemeVideoLookupCache.clear();
    releaseActiveSoundVideoUrl();
}

async function prefetchPhonemeClips(sounds = []) {
    const unique = Array.from(new Set((sounds || [])
        .map(sound => (sound || '').toString().toLowerCase())
        .filter(Boolean)));
    if (!unique.length) return;
    await ensureDBReady();
    await Promise.all(unique.map(async (sound) => {
        const key = getPhonemeRecordingKey(sound);
        if (phonemeAudioCache.has(key)) return;
        const blob = await getAudioFromDB(key);
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        phonemeAudioCache.set(key, { blob, url, createdAt: Date.now() });
    }));
}

async function tryPlayRecordedPhoneme(sound = '') {
    const useTeacherVoice = localStorage.getItem('useTeacherRecordings') !== 'false';
    if (!useTeacherVoice) return false;
    const key = getPhonemeRecordingKey(sound);
    let cached = phonemeAudioCache.get(key);
    if (!cached) {
        await ensureDBReady();
        const blob = await getAudioFromDB(key);
        if (!blob) return false;
        cached = { blob, url: URL.createObjectURL(blob), createdAt: Date.now() };
        phonemeAudioCache.set(key, cached);
    }
    if (!cached?.url) return false;
    const audio = new Audio(cached.url);
    audio.play();
    return true;
}

function prefetchWarmupPhonemes() {
    if (warmupPrefetchDone) return;
    const sounds = Array.from(document.querySelectorAll('.warmup-tile[data-sound]'))
        .map(tile => tile.dataset.sound)
        .filter(Boolean);
    if (!sounds.length) return;
    warmupPrefetchDone = true;
    prefetchPhonemeClips(sounds);
}

function loadSettings() {
    const saved = localStorage.getItem(SETTINGS_KEY);
    if (!saved) return;

    try {
        const parsed = JSON.parse(saved);
        appSettings = {
            ...DEFAULT_SETTINGS,
            ...parsed,
            funHud: {
                ...DEFAULT_SETTINGS.funHud,
                ...(parsed.funHud || {})
            },
            translation: {
                ...DEFAULT_SETTINGS.translation,
                ...(parsed.translation || {})
            },
            bonus: {
                ...DEFAULT_SETTINGS.bonus,
                ...(parsed.bonus || {})
            },
            gameMode: {
                ...DEFAULT_SETTINGS.gameMode,
                ...(parsed.gameMode || {})
            },
            classroom: {
                ...DEFAULT_SETTINGS.classroom,
                ...(parsed.classroom || {})
            },
            soundWallSections: {
                ...DEFAULT_SETTINGS.soundWallSections,
                ...(parsed.soundWallSections || {})
            }
        };

        appSettings.audienceMode = normalizeAudienceMode(appSettings.audienceMode || DEFAULT_SETTINGS.audienceMode);
        appSettings.narrationStyle = normalizeNarrationStyle(appSettings.narrationStyle || DEFAULT_SETTINGS.narrationStyle);
        appSettings.speechQualityMode = normalizeSpeechQualityMode(appSettings.speechQualityMode || DEFAULT_SETTINGS.speechQualityMode);
        const normalizedPackId = normalizeTtsPackId(appSettings.ttsPackId || DEFAULT_SETTINGS.ttsPackId);
        appSettings.ttsPackId = normalizedPackId === 'default' ? DEFAULT_SETTINGS.ttsPackId : normalizedPackId;
        if (appSettings.ttsPackId !== 'default') {
            appSettings.speechQualityMode = 'natural-only';
        }
        appSettings.speechRate = normalizeSpeechRate(appSettings.speechRate ?? DEFAULT_SETTINGS.speechRate);
        appSettings.guessCount = normalizeGuessCount(appSettings.guessCount ?? DEFAULT_SETTINGS.guessCount);
        appSettings.decodableReadSpeed = normalizeDecodableReadSpeed(appSettings.decodableReadSpeed ?? DEFAULT_SETTINGS.decodableReadSpeed);

        const migrated = localStorage.getItem('bonus_frequency_migrated');
        if (!migrated && (!parsed.bonus || ['sometimes', 'often'].includes(parsed.bonus.frequency))) {
            appSettings.bonus.frequency = DEFAULT_SETTINGS.bonus.frequency;
            localStorage.setItem('bonus_frequency_migrated', 'true');
        }

        // Game Modes (Team / Timer / Challenge) are session-based.
        // Keep toggles saved, but do not auto-start (or show the HUD) just because toggles are on.
        // Activation happens only when the teacher presses “Start” in the Game Modes modal.
        appSettings.gameMode.active = false;

    } catch (e) {
        console.warn('Could not parse settings, using defaults.', e);
    }
}

function saveSettings() {
    appSettings.audienceMode = normalizeAudienceMode(appSettings.audienceMode || DEFAULT_SETTINGS.audienceMode);
    appSettings.narrationStyle = normalizeNarrationStyle(appSettings.narrationStyle || DEFAULT_SETTINGS.narrationStyle);
    appSettings.speechQualityMode = normalizeSpeechQualityMode(appSettings.speechQualityMode || DEFAULT_SETTINGS.speechQualityMode);
    const normalizedPackId = normalizeTtsPackId(appSettings.ttsPackId || DEFAULT_SETTINGS.ttsPackId);
    appSettings.ttsPackId = normalizedPackId === 'default' ? DEFAULT_SETTINGS.ttsPackId : normalizedPackId;
    if (appSettings.ttsPackId !== 'default') {
        appSettings.speechQualityMode = 'natural-only';
    }
    appSettings.speechRate = normalizeSpeechRate(appSettings.speechRate ?? DEFAULT_SETTINGS.speechRate);
    appSettings.guessCount = normalizeGuessCount(appSettings.guessCount ?? DEFAULT_SETTINGS.guessCount);
    appSettings.decodableReadSpeed = normalizeDecodableReadSpeed(appSettings.decodableReadSpeed ?? DEFAULT_SETTINGS.decodableReadSpeed);
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(appSettings));
}

function normalizeDecodableReadSpeed(value = 1.0) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return 1.0;
    return Math.max(0.65, Math.min(1.5, Math.round(numeric * 100) / 100));
}

function normalizeSpeechRate(value = DEFAULT_SETTINGS.speechRate) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return DEFAULT_SETTINGS.speechRate;
    return Math.max(0.55, Math.min(1.05, Math.round(numeric * 100) / 100));
}

function getDecodableReadSpeed() {
    return normalizeDecodableReadSpeed(appSettings.decodableReadSpeed ?? DEFAULT_SETTINGS.decodableReadSpeed);
}

function getSpeechRate(type = 'word') {
    const base = normalizeSpeechRate(appSettings.speechRate ?? DEFAULT_SETTINGS.speechRate);
    if (type === 'phoneme') return Math.max(0.55, base - 0.12);
    if (type === 'sentence') return Math.max(0.55, base - 0.08);
    return base;
}

function getNarrationStyle() {
    return normalizeNarrationStyle(appSettings.narrationStyle || DEFAULT_SETTINGS.narrationStyle);
}

function getSpeechQualityMode() {
    return normalizeSpeechQualityMode(appSettings.speechQualityMode || DEFAULT_SETTINGS.speechQualityMode);
}

function getPreferredTtsPackId() {
    const normalizedPackId = normalizeTtsPackId(appSettings.ttsPackId || DEFAULT_SETTINGS.ttsPackId);
    return normalizedPackId === 'default' ? DEFAULT_SETTINGS.ttsPackId : normalizedPackId;
}

function shouldAttemptPackedTtsLookup() {
    return true;
}

function shouldUseLegacyForceLight() {
    return false; // Dark mode media query removed — themes handle all styling
}

function applySettings() {
    document.body.classList.toggle('calm-mode', appSettings.calmMode);
    document.body.classList.toggle('large-text', appSettings.largeText);
    document.body.classList.toggle('hide-ipa', !appSettings.showIPA);
    document.body.classList.toggle('hide-examples', !appSettings.showExamples);
    document.body.classList.toggle('hide-mouth-cues', !appSettings.showMouthCues);
    const useLegacyForceLight = shouldUseLegacyForceLight();
    document.body.classList.toggle('force-light', useLegacyForceLight);
    document.documentElement.classList.toggle('force-light', useLegacyForceLight);
    document.documentElement.style.colorScheme = 'light';
    applyUiLookClass();
    updateFunHudVisibility();

    const calmToggle = document.getElementById('toggle-calm-mode');
    if (calmToggle) calmToggle.checked = appSettings.calmMode;
    const largeTextToggle = document.getElementById('toggle-large-text');
    if (largeTextToggle) largeTextToggle.checked = appSettings.largeText;
    const ipaToggle = document.getElementById('toggle-show-ipa');
    if (ipaToggle) ipaToggle.checked = appSettings.showIPA;
    const examplesToggle = document.getElementById('toggle-show-examples');
    if (examplesToggle) examplesToggle.checked = appSettings.showExamples;
    const cuesToggle = document.getElementById('toggle-mouth-cues');
    if (cuesToggle) cuesToggle.checked = appSettings.showMouthCues;
    const speechRateInput = document.getElementById('speech-rate');
    if (speechRateInput) {
        speechRateInput.value = appSettings.speechRate;
        const display = document.getElementById('speech-rate-value');
        if (display) display.textContent = `${appSettings.speechRate.toFixed(2)}x`;
    }

    const voiceSelect = document.getElementById('system-voice-select');
    if (voiceSelect) {
        voiceSelect.value = appSettings.voiceDialect || DEFAULT_SETTINGS.voiceDialect;
    }

    const translationSelect = document.getElementById('translation-default-select');
    if (translationSelect) {
        translationSelect.value = appSettings.translation?.lang || 'en';
    }
    const translationLock = document.getElementById('translation-lock-toggle');
    if (translationLock) {
        translationLock.checked = !!appSettings.translation?.pinned;
    }

    const bonusSelect = document.getElementById('bonus-frequency') || document.getElementById('bonus-frequency-select');
    if (bonusSelect) {
        bonusSelect.value = appSettings.bonus?.frequency || 'always';
    }

    const audienceSelect = document.getElementById('audience-mode-select');
    if (audienceSelect) {
        audienceSelect.value = normalizeAudienceMode(appSettings.audienceMode || 'auto');
    }

    const narrationStyleSelect = document.getElementById('narration-style-select');
    if (narrationStyleSelect) {
        narrationStyleSelect.value = normalizeNarrationStyle(appSettings.narrationStyle || DEFAULT_SETTINGS.narrationStyle);
    }

    const speechQualitySelect = document.getElementById('speech-quality-select');
    if (speechQualitySelect) {
        speechQualitySelect.value = getSpeechQualityMode();
    }

    const ttsPackSelect = document.getElementById('tts-pack-select');
    if (ttsPackSelect) {
        ttsPackSelect.value = getPreferredTtsPackId();
    }

    const guessCountSelect = document.getElementById('guess-count-select');
    if (guessCountSelect) {
        const nextGuessCount = normalizeGuessCount(appSettings.guessCount ?? DEFAULT_SETTINGS.guessCount);
        appSettings.guessCount = nextGuessCount;
        CURRENT_MAX_GUESSES = nextGuessCount;
        guessCountSelect.value = String(nextGuessCount);
    }

    const autoHearToggle = document.getElementById('toggle-auto-hear');
    if (autoHearToggle) {
        autoHearToggle.checked = appSettings.autoHear !== false;
    }

    applySoundWallSectionVisibility();
    renderVoiceDiagnosticsPanel();
}

function applySoundWallSectionVisibility() {
    const sections = document.querySelectorAll('.soundwall-section');
    sections.forEach(section => {
        const key = section.dataset.section;
        if (!key) return;
        const isVisible = appSettings.soundWallSections[key] !== false;
        section.classList.toggle('hidden', !isVisible);
    });

    const filterInputs = document.querySelectorAll('.soundwall-filters input[type="checkbox"][data-section]');
    filterInputs.forEach(input => {
        const section = input.dataset.section;
        if (!section) return;
        input.checked = appSettings.soundWallSections[section] !== false;
    });
}

function applyWordQuestUrlPreset() {
    const patternSelect = document.getElementById("pattern-select");
    const lengthSelect = document.getElementById("length-select");
    const guessCountSelect = document.getElementById("guess-count-select");
    if (!patternSelect || !lengthSelect) return;

    try {
        const params = new URLSearchParams(window.location.search);
        const focusParam = (params.get('focus') || '').trim();
        const lenParam = (params.get('len') || '').trim();
        const guessParam = (params.get('guesses') || '').trim();

        if (focusParam) {
            const allowed = Array.from(patternSelect.options).some(opt => opt.value === focusParam);
            if (allowed) {
                patternSelect.value = focusParam;
            }
        }

        // Always sync after pattern choice (and keep legacy behavior even when no params exist).
        syncLengthOptionsToPattern(true);

        if (lenParam) {
            const normalized = lenParam === 'any' ? 'any' : String(parseInt(lenParam, 10));
            const opt = Array.from(lengthSelect.options).find(o => o.value === normalized && !o.disabled);
            if (opt) {
                lengthSelect.value = opt.value;
                lengthAutoSet = false;
            }
        }

        if (guessCountSelect && guessParam) {
            const normalizedGuessCount = normalizeGuessCount(guessParam);
            guessCountSelect.value = String(normalizedGuessCount);
            appSettings.guessCount = normalizedGuessCount;
            CURRENT_MAX_GUESSES = normalizedGuessCount;
            saveSettings();
        }
        refreshPatternSelectTooltip();
    } catch (e) {
        syncLengthOptionsToPattern(true);
        refreshPatternSelectTooltip();
    }
}

function clearUrlSearchParam(paramName) {
    if (!paramName || !window.history || typeof window.history.replaceState !== 'function') return;
    try {
        const url = new URL(window.location.href);
        if (!url.searchParams.has(paramName)) return;
        url.searchParams.delete(paramName);
        const next = `${url.pathname}${url.search}${url.hash}`;
        window.history.replaceState(null, document.title, next);
    } catch {}
}

function openWordQuestToolAction(action = '') {
    const normalized = String(action || '').trim().toLowerCase();
    if (!normalized) return false;

    const hideWelcome = () => {
        if (welcomeModal && !welcomeModal.classList.contains('hidden')) {
            welcomeModal.classList.add('hidden');
        }
    };

    if (normalized === 'session-setup' || normalized === 'session') {
        hideWelcome();
        openTeacherMode();
        return true;
    }
    if (normalized === 'recording-studio' || normalized === 'studio') {
        hideWelcome();
        openStudioSetup();
        return true;
    }
    if (normalized === 'sound-lab' || normalized === 'soundlab') {
        openPhonemeGuide();
        return true;
    }
    return false;
}

function applyWordQuestToolParamIfPresent() {
    try {
        const params = new URLSearchParams(window.location.search);
        const toolParam = (params.get('tool') || '').trim().toLowerCase();
        if (!toolParam) return;
        const opened = openWordQuestToolAction(toolParam);
        if (opened) {
            clearUrlSearchParam('tool');
        }
    } catch {}
}

function syncSettingsFromPlatform(nextSettings = {}) {
    if (!nextSettings || typeof nextSettings !== 'object') return;
    let changed = false;

    const nextVoiceDialect = String(nextSettings.voiceDialect || '').trim();
    if (nextVoiceDialect && nextVoiceDialect !== appSettings.voiceDialect) {
        appSettings.voiceDialect = nextVoiceDialect;
        sessionEnglishVoice = { dialect: '', voiceUri: '' };
        changed = true;
    }

    if (nextSettings.translation && typeof nextSettings.translation === 'object') {
        const nextTranslationLang = String(nextSettings.translation.lang || appSettings.translation?.lang || 'en').trim() || 'en';
        const nextTranslationPinned = !!nextSettings.translation.pinned;
        if (!appSettings.translation) {
            appSettings.translation = { ...DEFAULT_SETTINGS.translation };
        }
        if (nextTranslationLang !== appSettings.translation.lang) {
            appSettings.translation.lang = nextTranslationLang;
            changed = true;
        }
        if (nextTranslationPinned !== !!appSettings.translation.pinned) {
            appSettings.translation.pinned = nextTranslationPinned;
            changed = true;
        }
    }

    if (Object.prototype.hasOwnProperty.call(nextSettings, 'ttsPackId')) {
        const nextPackIdRaw = normalizeTtsPackId(nextSettings.ttsPackId || DEFAULT_SETTINGS.ttsPackId);
        const nextPackId = nextPackIdRaw === 'default' ? DEFAULT_SETTINGS.ttsPackId : nextPackIdRaw;
        if (nextPackId !== appSettings.ttsPackId) {
            appSettings.ttsPackId = nextPackId;
            sessionEnglishVoice = { dialect: '', voiceUri: '' };
            changed = true;
        }
    }

    if (Object.prototype.hasOwnProperty.call(nextSettings, 'voiceUri')) {
        const nextVoiceUri = String(nextSettings.voiceUri || '').trim();
        if (nextVoiceUri !== String(appSettings.voiceUri || '').trim()) {
            appSettings.voiceUri = nextVoiceUri;
            sessionEnglishVoice = { dialect: '', voiceUri: '' };
            changed = true;
        }
    }

    if (Object.prototype.hasOwnProperty.call(nextSettings, 'speechRate')) {
        const nextSpeechRate = normalizeSpeechRate(nextSettings.speechRate);
        if (nextSpeechRate !== normalizeSpeechRate(appSettings.speechRate)) {
            appSettings.speechRate = nextSpeechRate;
            changed = true;
        }
    }

    if (!changed) return;
    saveSettings();
    applySettings();
    updateVoiceInstallPrompt();
    updateEnhancedVoicePrompt();
}

async function previewSelectedVoice(sampleText = '') {
    const text = String(sampleText || 'This is your selected English listening voice.').trim();
    if (!text) return;
    stopAllActiveAudioPlayers();
    cancelPendingSpeech(true);
    const literalClipPlayed = await tryPlayPackedTtsForLiteralText({
        text,
        languageCode: 'en',
        type: 'sentence'
    });
    if (literalClipPlayed) return;
    const previewClipPlayed = await tryPlayPreferredPackPreviewClip('en');
    if (previewClipPlayed) return;
    showToast('No Azure voice preview clip is available yet.');
}

document.addEventListener("DOMContentLoaded", () => {
    const useLegacyForceLight = shouldUseLegacyForceLight();
    document.body.classList.toggle('force-light', useLegacyForceLight);
    document.documentElement.classList.toggle('force-light', useLegacyForceLight);
    loadSettings();

    // Initialize DOM elements
    board = document.getElementById("game-board");
    keyboard = document.getElementById("keyboard");
    modalOverlay = document.getElementById("modal-overlay");
    welcomeModal = document.getElementById("welcome-modal");
    teacherModal = document.getElementById("teacher-modal");
    studioModal = document.getElementById("recording-studio-modal");
    gameModal = document.getElementById("modal");
    if (welcomeModal) {
        welcomeModal.dataset.overlayClose = 'true';
    }

    // Pre-compactify reveal modal sections (prevents a brief layout flash on first win/loss).
    prepareTranslationSection();
    
    initDB();
    initControls();
    applyWordQuestUrlPreset();
    initWarmupButtons();
    initKeyboard();
    initVoiceLoader(); 
    notifyMissingEnglishVoice();
    updateFunHudVisibility();
    initStudio();
    initNewFeatures();
    initTutorial();
    initFocusToggle();
    enableOverlayCloseForAllModals();
    initModalDismissals();
    initPopupWindowInteractions();
    initHowTo();
    initQuickTeacherWord();
    initAdventureMode();
    if (typeof initAssessmentFlow === 'function') {
        initAssessmentFlow();
    }
    initVoiceSourceControls(); // Voice source toggle
    initSoundWallFilters();
    applySettings();
    
    // Initialize adaptive actions
    if (typeof initAdaptiveActions === 'function') {
        initAdaptiveActions();
    } else {
        console.log('initAdaptiveActions not available - skipping');
    }
    
    startNewGame();
    checkFirstTimeVisitor();
    positionFunHud();
    applyWordQuestDesktopScale();
    updateFitScreenMode();
    updateWordQuestScrollFallback();
    scheduleEnhancedVoicePrefetch();
    const handleViewportResize = () => {
        positionFunHud();
        applyWordQuestDesktopScale();
        updateFitScreenMode();
        updateWordQuestScrollFallback();
    };
    window.addEventListener('resize', handleViewportResize);
    if (window.visualViewport) {
        window.visualViewport.addEventListener('resize', handleViewportResize);
        window.visualViewport.addEventListener('scroll', handleViewportResize);
    }
    setTimeout(handleViewportResize, 120);

    if (modalOverlay) {
        const observer = new MutationObserver(() => updateFunHudVisibility());
        observer.observe(modalOverlay, { attributes: true, attributeFilter: ['class'] });
    }

    const dockParam = new URLSearchParams(window.location.search).get('dock');
    if (dockParam) {
        document.body.classList.add('dock-only');
        ensureClassroomDock();
        toggleClassroomDock(true);
        setClassroomDockTab(dockParam);
    }

    const hash = (window.location.hash || '').toLowerCase();
    if (hash === '#sound-lab' || hash === '#soundlab') {
        openPhonemeGuide();
        // Clean the hash so refreshing doesn't re-open Sound Lab unexpectedly.
        if (history && typeof history.replaceState === 'function') {
            history.replaceState(null, document.title, window.location.pathname + window.location.search);
        }
    }

    const soundLabParam = new URLSearchParams(window.location.search).get('soundlab');
    if (soundLabParam) {
        document.body.classList.add('soundlab-only');
        openPhonemeGuide();

        // In "Sound Lab only" mode, the close button should exit cleanly.
        const closeBtn = document.querySelector('#phoneme-modal .close-phoneme');
        if (closeBtn && closeBtn.dataset.soundlabBound !== 'true') {
            closeBtn.dataset.soundlabBound = 'true';
            closeBtn.addEventListener('click', (event) => {
                if (!document.body.classList.contains('soundlab-only')) return;
                event.preventDefault();
                event.stopImmediatePropagation();
                // Works when opened via window.open(); fallback navigates back.
                window.close();
                setTimeout(() => {
                    if (!window.closed) window.location.href = 'word-quest.html';
                }, 60);
            }, true);
        }
    }

    window.addEventListener('cornerstone:tool-request', (event) => {
        const action = event?.detail?.action || '';
        openWordQuestToolAction(action);
    });

    window.addEventListener('decode:settings-changed', (event) => {
        syncSettingsFromPlatform(event?.detail || {});
    });

    window.addEventListener('cornerstone:voice-preview', (event) => {
        const text = event?.detail?.text || '';
        previewSelectedVoice(text);
    });

    applyWordQuestToolParamIfPresent();
});

function enableOverlayCloseForAllModals() {
    if (modalDismissBound) return;
    const modals = getAllModalElements();
    modals.forEach(modal => {
        modal.dataset.overlayClose = 'true';
    });
    modalDismissBound = true;
}

function initPopupWindowInteractions() {
    if (popupWindowInteractionsBound) return;
    popupWindowInteractionsBound = true;

    const clampValue = (value, min, max) => Math.min(max, Math.max(min, value));
    const EDGE_THRESHOLD = 12;
    const interactiveSelector = 'button, input, select, textarea, a, label, summary, option, [role="button"], [role="tab"], [contenteditable="true"]';
    const resizeClassMap = {
        n: 'popup-window-resize-n',
        s: 'popup-window-resize-s',
        e: 'popup-window-resize-e',
        w: 'popup-window-resize-w',
        ne: 'popup-window-resize-ne',
        nw: 'popup-window-resize-nw',
        se: 'popup-window-resize-se',
        sw: 'popup-window-resize-sw'
    };
    const resizeClassList = Object.values(resizeClassMap);

    const ensureFloating = (panel) => {
        if (!(panel instanceof HTMLElement)) return;
        const rect = panel.getBoundingClientRect();
        const computed = window.getComputedStyle(panel);
        if (computed.position !== 'fixed') {
            panel.style.position = 'fixed';
        }
        panel.style.left = `${rect.left}px`;
        panel.style.top = `${rect.top}px`;
        panel.style.right = 'auto';
        panel.style.bottom = 'auto';
        panel.style.transform = 'none';
        panel.style.margin = '0';
    };

    const readRectSize = (panel) => {
        if (!(panel instanceof HTMLElement)) return { width: 0, height: 0 };
        const rect = panel.getBoundingClientRect();
        return { width: rect.width, height: rect.height };
    };

    const constrainToViewport = (panel, nextLeft, nextTop, width, height) => {
        if (!(panel instanceof HTMLElement)) return { left: nextLeft, top: nextTop };
        const size = (typeof width === 'number' && typeof height === 'number')
            ? { width, height }
            : readRectSize(panel);
        const keepX = 96;
        const keepY = 56;
        const minLeft = keepX - size.width;
        const maxLeft = window.innerWidth - keepX;
        const minTop = 8;
        const maxTop = window.innerHeight - keepY;
        return {
            left: clampValue(nextLeft, minLeft, maxLeft),
            top: clampValue(nextTop, minTop, maxTop)
        };
    };

    const getResizeEdges = (panel, clientX, clientY) => {
        if (!(panel instanceof HTMLElement)) return null;
        const rect = panel.getBoundingClientRect();
        const north = (clientY - rect.top) <= EDGE_THRESHOLD;
        const south = (rect.bottom - clientY) <= EDGE_THRESHOLD;
        const west = (clientX - rect.left) <= EDGE_THRESHOLD;
        const east = (rect.right - clientX) <= EDGE_THRESHOLD;
        if (!(north || south || east || west)) return null;
        return { north, south, east, west };
    };

    const edgesToHandle = (edges) => {
        if (!edges) return '';
        if (edges.north && edges.west) return 'nw';
        if (edges.north && edges.east) return 'ne';
        if (edges.south && edges.west) return 'sw';
        if (edges.south && edges.east) return 'se';
        if (edges.north) return 'n';
        if (edges.south) return 's';
        if (edges.west) return 'w';
        if (edges.east) return 'e';
        return '';
    };

    const setResizeClass = (panel, handle = '') => {
        if (!(panel instanceof HTMLElement)) return;
        panel.classList.remove(...resizeClassList);
        const className = resizeClassMap[handle];
        if (className) panel.classList.add(className);
    };

    const updateContentScale = (panel) => {
        if (!(panel instanceof HTMLElement)) return;
        const rect = panel.getBoundingClientRect();
        const baseWidth = Number.parseFloat(panel.dataset.popupBaseWidth || '');
        const baseHeight = Number.parseFloat(panel.dataset.popupBaseHeight || '');
        const safeBaseWidth = Number.isFinite(baseWidth) && baseWidth > 0 ? baseWidth : rect.width;
        const safeBaseHeight = Number.isFinite(baseHeight) && baseHeight > 0 ? baseHeight : rect.height;
        if (!panel.dataset.popupBaseWidth) panel.dataset.popupBaseWidth = `${safeBaseWidth}`;
        if (!panel.dataset.popupBaseHeight) panel.dataset.popupBaseHeight = `${safeBaseHeight}`;
        const widthScale = rect.width / safeBaseWidth;
        const heightScale = rect.height / safeBaseHeight;
        const nextScale = clampValue(Math.min(widthScale, heightScale), 0.86, 1.14);
        panel.style.setProperty('--popup-content-scale', nextScale.toFixed(3));
    };

    const bindPopupWindow = (panel) => {
        if (!(panel instanceof HTMLElement)) return;
        if (panel.dataset.popupWindowBound === 'true') return;
        panel.dataset.popupWindowBound = 'true';
        panel.classList.add('popup-window-enabled');
        updateContentScale(panel);

        let interactionMode = '';
        let pointerId = null;
        let startX = 0;
        let startY = 0;
        let startLeft = 0;
        let startTop = 0;
        let startWidth = 0;
        let startHeight = 0;
        let resizeHandle = '';

        const stopInteraction = (id = null) => {
            if (!interactionMode) return;
            if (id !== null && id !== pointerId) return;
            const currentPointerId = pointerId;
            interactionMode = '';
            pointerId = null;
            resizeHandle = '';
            panel.classList.remove('popup-window-dragging', 'popup-window-resizing');
            setResizeClass(panel, '');
            if (currentPointerId !== null) {
                try {
                    panel.releasePointerCapture(currentPointerId);
                } catch (error) {}
            }
        };

        panel.addEventListener('pointerdown', (event) => {
            if (event.button !== 0) return;
            if (event.target instanceof HTMLElement && event.target.closest(interactiveSelector)) return;
            ensureFloating(panel);
            const rect = panel.getBoundingClientRect();
            const edges = getResizeEdges(panel, event.clientX, event.clientY);
            const minWidth = Math.max(
                280,
                Number.parseFloat(window.getComputedStyle(panel).minWidth || '0') || 0
            );
            const minHeight = Math.max(
                180,
                Number.parseFloat(window.getComputedStyle(panel).minHeight || '0') || 0
            );

            interactionMode = edges ? 'resize' : 'drag';
            pointerId = event.pointerId;
            startX = event.clientX;
            startY = event.clientY;
            startLeft = rect.left;
            startTop = rect.top;
            startWidth = rect.width;
            startHeight = rect.height;
            resizeHandle = edgesToHandle(edges);
            panel.dataset.popupMinWidth = String(minWidth);
            panel.dataset.popupMinHeight = String(minHeight);
            panel.classList.remove('popup-window-expanded');
            if (interactionMode === 'resize') {
                panel.classList.add('popup-window-resizing');
                setResizeClass(panel, resizeHandle);
            } else {
                panel.classList.add('popup-window-dragging');
                setResizeClass(panel, '');
            }
            try {
                panel.setPointerCapture(pointerId);
            } catch (error) {}
            event.preventDefault();
        });

        panel.addEventListener('pointermove', (event) => {
            if (!interactionMode) {
                if (event.target instanceof HTMLElement && event.target.closest(interactiveSelector)) {
                    setResizeClass(panel, '');
                    return;
                }
                const handle = edgesToHandle(getResizeEdges(panel, event.clientX, event.clientY));
                setResizeClass(panel, handle);
                return;
            }
            if (event.pointerId !== pointerId) return;

            const dx = event.clientX - startX;
            const dy = event.clientY - startY;

            if (interactionMode === 'drag') {
                const next = constrainToViewport(panel, startLeft + dx, startTop + dy);
                panel.style.left = `${next.left}px`;
                panel.style.top = `${next.top}px`;
                return;
            }

            const minWidth = Number.parseFloat(panel.dataset.popupMinWidth || '280') || 280;
            const minHeight = Number.parseFloat(panel.dataset.popupMinHeight || '180') || 180;
            const maxWidth = Math.max(minWidth, window.innerWidth - 16);
            const maxHeight = Math.max(minHeight, window.innerHeight - 16);

            let nextLeft = startLeft;
            let nextTop = startTop;
            let nextWidth = startWidth;
            let nextHeight = startHeight;

            if (resizeHandle.includes('e')) {
                nextWidth = clampValue(startWidth + dx, minWidth, maxWidth);
            }
            if (resizeHandle.includes('s')) {
                nextHeight = clampValue(startHeight + dy, minHeight, maxHeight);
            }
            if (resizeHandle.includes('w')) {
                const rawWidth = startWidth - dx;
                nextWidth = clampValue(rawWidth, minWidth, maxWidth);
                nextLeft = startLeft + (startWidth - nextWidth);
            }
            if (resizeHandle.includes('n')) {
                const rawHeight = startHeight - dy;
                nextHeight = clampValue(rawHeight, minHeight, maxHeight);
                nextTop = startTop + (startHeight - nextHeight);
            }

            const constrained = constrainToViewport(panel, nextLeft, nextTop, nextWidth, nextHeight);
            panel.style.left = `${constrained.left}px`;
            panel.style.top = `${constrained.top}px`;
            panel.style.width = `${nextWidth}px`;
            panel.style.height = `${nextHeight}px`;
            updateContentScale(panel);
        });

        panel.addEventListener('pointerup', (event) => stopInteraction(event.pointerId));
        panel.addEventListener('pointercancel', (event) => stopInteraction(event.pointerId));
        panel.addEventListener('lostpointercapture', () => stopInteraction());
        panel.addEventListener('pointerleave', () => {
            if (!interactionMode) setResizeClass(panel, '');
        });
    };

    const bindAllPopupWindows = () => {
        document.querySelectorAll('.modal').forEach((modal) => {
            bindPopupWindow(modal);
        });
        const quickVoiceModal = document.querySelector('#voice-quick-overlay .voice-quick-modal');
        if (quickVoiceModal instanceof HTMLElement) {
            bindPopupWindow(quickVoiceModal);
        }
    };

    bindAllPopupWindows();
    const observer = new MutationObserver(() => bindAllPopupWindows());
    observer.observe(document.body, { childList: true });
}

function ensureFunHud() {
    let hud = document.getElementById('fun-hud');
    if (!hud) {
        hud = document.createElement('div');
        hud.id = 'fun-hud';
        hud.className = 'fun-hud hidden';
        hud.innerHTML = `
            <div class="fun-hud-item fun-hud-team" id="fun-hud-team"></div>
            <div class="fun-hud-item fun-hud-coins">
                <span class="fun-hud-icon">🪙</span>
                <span class="fun-hud-label">Coins</span>
                <span class="fun-hud-value" id="fun-hud-coins">0</span>
            </div>
            <div class="fun-hud-item fun-hud-hearts">
                <span class="fun-hud-icon">❤️</span>
                <span class="fun-hud-label">Hearts</span>
                <span class="fun-hud-value" id="fun-hud-hearts">3</span>
            </div>
            <div class="fun-hud-item fun-hud-timer">
                <span class="fun-hud-icon">⏱</span>
                <span class="fun-hud-label">Timer</span>
                <span class="fun-hud-value" id="fun-hud-timer">0:00</span>
            </div>
            <div class="fun-hud-item fun-hud-help">
                <button type="button" id="fun-hud-help" class="fun-hud-mini-btn" aria-label="About game modes">?</button>
            </div>
        `;
        document.body.appendChild(hud);
    } else if (!document.getElementById('fun-hud-timer')) {
        hud.innerHTML = `
            <div class="fun-hud-item fun-hud-team" id="fun-hud-team"></div>
            <div class="fun-hud-item fun-hud-coins">
                <span class="fun-hud-icon">🪙</span>
                <span class="fun-hud-label">Coins</span>
                <span class="fun-hud-value" id="fun-hud-coins">0</span>
            </div>
            <div class="fun-hud-item fun-hud-hearts">
                <span class="fun-hud-icon">❤️</span>
                <span class="fun-hud-label">Hearts</span>
                <span class="fun-hud-value" id="fun-hud-hearts">3</span>
            </div>
            <div class="fun-hud-item fun-hud-timer">
                <span class="fun-hud-icon">⏱</span>
                <span class="fun-hud-label">Timer</span>
                <span class="fun-hud-value" id="fun-hud-timer">0:00</span>
            </div>
            <div class="fun-hud-item fun-hud-help">
                <button type="button" id="fun-hud-help" class="fun-hud-mini-btn" aria-label="About game modes">?</button>
            </div>
        `;
    }
    const helpBtn = hud.querySelector('#fun-hud-help');
    if (helpBtn && !helpBtn.dataset.bound) {
        helpBtn.dataset.bound = 'true';
        helpBtn.title = 'Fun: coins track wins. Challenge: hearts change on misses. Team: alternate turns and score.';
    }
    return hud;
}

function renderFunHud() {
    const maxHearts = appSettings.funHud?.maxHearts ?? 3;
    if (!appSettings.funHud?.hearts || appSettings.funHud.hearts < 1) {
        appSettings.funHud.hearts = maxHearts;
    }
    const hearts = document.getElementById('fun-hud-hearts');
    const coins = document.getElementById('fun-hud-coins');
    const timer = document.getElementById('fun-hud-timer');
    const teamLabel = document.getElementById('fun-hud-team');
    const heartsItem = document.querySelector('.fun-hud-hearts');
    const coinsItem = document.querySelector('.fun-hud-coins');
    const timerItem = document.querySelector('.fun-hud-timer');

    const teamMode = !!appSettings.gameMode?.teamMode;
    const timerEnabled = !!appSettings.gameMode?.timerEnabled;
    const gameModeActive = teamMode || timerEnabled || !!appSettings.funHud?.challenge;

    if (teamMode) {
        const aName = appSettings.gameMode?.teamAName || 'Team A';
        const bName = appSettings.gameMode?.teamBName || 'Team B';
        const aCoins = appSettings.gameMode?.teamACoins ?? 0;
        const bCoins = appSettings.gameMode?.teamBCoins ?? 0;
        const aShort = formatTeamShortLabel(aName, 'A');
        const bShort = formatTeamShortLabel(bName, 'B');
        if (coins) coins.textContent = `${aShort} ${aCoins} • ${bShort} ${bCoins}`;
        if (teamLabel) {
            teamLabel.textContent = `Turn: ${formatTeamShortLabel(getActiveTeamLabel(), getActiveTeamKey())}`;
            teamLabel.style.display = 'inline-flex';
        }
    } else {
        if (coins) coins.textContent = String(appSettings.funHud?.coins ?? 0);
        if (teamLabel) {
            teamLabel.textContent = '';
            teamLabel.style.display = 'none';
        }
    }

    if (hearts) hearts.textContent = String(appSettings.funHud?.hearts ?? 3);
    if (heartsItem) heartsItem.style.display = appSettings.funHud?.challenge ? 'inline-flex' : 'none';
    if (coinsItem) coinsItem.style.display = gameModeActive ? 'inline-flex' : 'none';

    if (timerItem) timerItem.style.display = timerEnabled ? 'inline-flex' : 'none';
    if (timer && timerEnabled) timer.textContent = formatTime(lightningRemaining || appSettings.gameMode?.timerSeconds || 0);
}

function syncGameModeActive(forceStart = false) {
    const hasActiveModes = !!appSettings.gameMode?.teamMode
        || !!appSettings.gameMode?.timerEnabled
        || !!appSettings.funHud?.challenge;
    if (forceStart) {
        appSettings.gameMode.active = hasActiveModes;
    } else if (!hasActiveModes) {
        appSettings.gameMode.active = false;
    }
    saveSettings();
    updateFunHudVisibility();
}

function formatTeamShortLabel(name = '', fallback = '') {
    if (!name) return fallback;
    const cleaned = name.toString().replace(/team\s*/i, '').trim();
    if (!cleaned) return fallback;
    const parts = cleaned.split(/\s+/);
    const base = parts[0] || cleaned;
    if (base.length <= 4) return base;
    return base.slice(0, 4);
}

function updateFunHudVisibility() {
    const hud = ensureFunHud();
    const enabled = !!appSettings.funHud?.enabled;
    const overlayOpen = modalOverlay && !modalOverlay.classList.contains('hidden');
    const gameModeActive = !!appSettings.gameMode?.active;
    const shouldShow = enabled && gameModeActive && !funHudSuspended && !overlayOpen;
    hud.classList.toggle('hidden', !shouldShow);
    document.body.classList.toggle('fun-mode', enabled);
    document.body.classList.toggle('fun-studio', enabled && appSettings.funHud?.style === 'studio');
    if (shouldShow) {
        renderFunHud();
        positionFunHud();
    }
}

function positionFunHud() {
    const hud = document.getElementById('fun-hud');
    const header = document.querySelector('header');
    if (!hud || !header) return;
    const rect = header.getBoundingClientRect();
    const actions = header.querySelector('.header-actions');
    const controls = document.querySelector('.controls');
    const warmup = document.querySelector('.warmup-panel');
    const bottoms = [rect.bottom];
    if (actions) bottoms.push(actions.getBoundingClientRect().bottom);
    if (controls) bottoms.push(controls.getBoundingClientRect().bottom);
    if (warmup && warmup.offsetParent) bottoms.push(warmup.getBoundingClientRect().bottom);
    const top = Math.max(12, ...bottoms.map(val => val + 8));
    hud.style.top = `${top}px`;
    hud.style.right = window.innerWidth < 720 ? '8px' : '16px';
}

function isCoarsePointerLayout() {
    return window.matchMedia && window.matchMedia('(hover: none) and (pointer: coarse)').matches;
}

function getVisibleElementHeight(element) {
    if (!element || element.offsetParent === null) return 0;
    const rect = element.getBoundingClientRect();
    if (!rect || !Number.isFinite(rect.height) || rect.height <= 0) return 0;
    return Math.ceil(rect.height);
}

function applyWordQuestDesktopScale() {
    const body = document.body;
    if (!body || !body.classList.contains('word-quest-page')) return;

    const clearDesktopScaleVars = () => {
        body.style.removeProperty('--wq-tile-size-desktop');
        body.style.removeProperty('--wq-key-size-desktop');
        body.style.removeProperty('--wq-key-wide-size-desktop');
        body.style.removeProperty('--wq-keyboard-max-desktop');
        body.style.removeProperty('--wq-canvas-max-desktop');
        body.style.removeProperty('--wq-desktop-bottom-gap');
    };

    const header = document.querySelector('header');
    const headerHeight = header ? Math.ceil(header.getBoundingClientRect().height) : 0;
    const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 900;

    const quickCustomPanel = document.querySelector('.quick-custom-word-panel');
    const focusPanel = document.getElementById('focus-panel');
    const pageGuideTip = document.getElementById('page-guide-tip');
    const quickPanelHeight = getVisibleElementHeight(quickCustomPanel);
    const focusPanelHeight = focusPanel && !focusPanel.classList.contains('hidden')
        ? getVisibleElementHeight(focusPanel)
        : 0;
    const guideTipHeight = viewportHeight < 880 ? getVisibleElementHeight(pageGuideTip) : 0;
    const chromeAboveCanvas = quickPanelHeight + focusPanelHeight + guideTipHeight;
    const reservedOutsideCanvas = 38 + chromeAboveCanvas;
    const availableHeight = Math.max(340, viewportHeight - headerHeight - reservedOutsideCanvas);
    const coarsePointer = isCoarsePointerLayout();
    // Estimated constant chrome inside the canvas (board padding, hint row, keyboard panel padding).
    // Keep this conservative so non-fullscreen desktop/iPad windows avoid clipping.
    const staticChrome = coarsePointer ? 352 : 328;

    let baseTileSize = (availableHeight - staticChrome) / 9.08;
    baseTileSize = Math.max(31, Math.min(56, baseTileSize));
    const tileScaleBoost = window.innerWidth >= 1280 ? 1.18 : (window.innerWidth >= 1024 ? 1.1 : 1.02);
    let tileSize = baseTileSize * tileScaleBoost;
    tileSize = Math.max(34, Math.min(68, tileSize));
    if (viewportHeight < 980) tileSize = Math.min(tileSize, 82);
    if (viewportHeight < 910) tileSize = Math.min(tileSize, 76);
    if (viewportHeight < 840) tileSize = Math.min(tileSize, 70);
    if (viewportHeight < 790) tileSize = Math.min(tileSize, 62);

    let keySize = baseTileSize * (coarsePointer ? 1.02 : 0.98);
    keySize = Math.max(coarsePointer ? 33 : 31, Math.min(52, keySize));

    let wideKeySize = keySize * 1.72;
    wideKeySize = Math.max(62, Math.min(98, wideKeySize));

    let keyboardMax = Math.round((keySize * 10) + (coarsePointer ? 82 : 74));
    let canvasMax = Math.round(Math.max(680, Math.min(1060, keyboardMax + 236)));
    let bottomGap = coarsePointer ? 12 : 10;
    if (viewportHeight < 930) bottomGap = Math.max(8, bottomGap - 3);
    if (viewportHeight < 860) bottomGap = Math.max(8, bottomGap - 2);
    if (viewportHeight < 800) bottomGap = Math.max(5, bottomGap - 2);
    bottomGap = Math.max(6, Math.min(14, bottomGap));

    const applyDesktopScaleVars = () => {
        body.style.setProperty('--wq-tile-size-desktop', `${tileSize.toFixed(1)}px`);
        body.style.setProperty('--wq-key-size-desktop', `${keySize.toFixed(1)}px`);
        body.style.setProperty('--wq-key-wide-size-desktop', `${wideKeySize.toFixed(1)}px`);
        body.style.setProperty('--wq-keyboard-max-desktop', `${keyboardMax}px`);
        body.style.setProperty('--wq-canvas-max-desktop', `${canvasMax}px`);
        body.style.setProperty('--wq-desktop-bottom-gap', `${bottomGap}px`);
    };

    applyDesktopScaleVars();

    // Second pass: if canvas still overflows visible height, shrink iteratively before falling back to page scroll.
    const canvas = document.getElementById('game-canvas');
    const keyboardEl = document.getElementById('keyboard');
    if (canvas && keyboardEl) {
        const availableCanvasHeight = Math.max(320, viewportHeight - headerHeight - reservedOutsideCanvas - 8);
        const measureLayoutOverflow = () => {
            const viewportBottom = window.visualViewport
                ? (window.visualViewport.offsetTop + window.visualViewport.height)
                : (window.innerHeight || document.documentElement.clientHeight || 0);
            const safeBottom = Math.max(0, viewportBottom - (coarsePointer ? 10 : 8));
            const canvasRect = canvas.getBoundingClientRect();
            const keyboardRect = keyboardEl.getBoundingClientRect();
            return Math.max(
                0,
                canvasRect.bottom - safeBottom,
                keyboardRect.bottom - safeBottom,
                canvas.scrollHeight - canvas.clientHeight - 4
            );
        };

        let requiredCanvasHeight = Math.ceil(canvas.scrollHeight || 0);
        let layoutOverflow = measureLayoutOverflow();
        let attempts = 0;

        while ((requiredCanvasHeight > availableCanvasHeight + 2 || layoutOverflow > 2) && attempts < 8) {
            const combinedDemand = Math.max(requiredCanvasHeight, availableCanvasHeight + layoutOverflow);
            const fitRatio = Math.max(0.74, Math.min(0.95, availableCanvasHeight / Math.max(1, combinedDemand)));
            tileSize = Math.max(30, Math.min(88, tileSize * fitRatio));
            keySize = Math.max(coarsePointer ? 33 : 31, Math.min(60, keySize * fitRatio));
            wideKeySize = Math.max(62, Math.min(112, wideKeySize * fitRatio));
            keyboardMax = Math.round((keySize * 10) + (coarsePointer ? 96 : 86));
            canvasMax = Math.round(Math.max(680, Math.min(1120, keyboardMax + 252)));
            bottomGap = Math.max(4, Math.min(14, bottomGap - 1));
            applyDesktopScaleVars();
            requiredCanvasHeight = Math.ceil(canvas.scrollHeight || 0);
            layoutOverflow = measureLayoutOverflow();
            attempts += 1;
        }
    }
}

function updateWordQuestScrollFallback() {
    const body = document.body;
    if (!body || !body.classList.contains('word-quest-page')) return;

    if (window.innerWidth >= 980) {
        if (wordQuestScrollFallback) {
            wordQuestScrollFallback = false;
            body.classList.remove('wq-scroll-fallback');
        }
        return;
    }

    const canvas = document.getElementById('game-canvas');
    const keyboardEl = document.getElementById('keyboard');
    if (!canvas || !keyboardEl) {
        if (wordQuestScrollFallback) {
            wordQuestScrollFallback = false;
            body.classList.remove('wq-scroll-fallback');
        }
        return;
    }

    const coarsePointer = isCoarsePointerLayout();
    const viewportBottom = window.visualViewport
        ? (window.visualViewport.offsetTop + window.visualViewport.height)
        : (window.innerHeight || document.documentElement.clientHeight || 0);
    const comfortInset = coarsePointer ? 20 : 14;
    const safeBottom = Math.max(0, viewportBottom - comfortInset);
    const canvasRect = canvas.getBoundingClientRect();
    const keyboardRect = keyboardEl.getBoundingClientRect();
    const overflowPx = Math.max(
        0,
        canvasRect.bottom - safeBottom,
        keyboardRect.bottom - safeBottom,
        canvas.scrollHeight - canvas.clientHeight - 8
    );
    // Keep no-scroll layout as the default; only fallback when clipping is clearly unavoidable.
    const fallbackThreshold = coarsePointer ? 52 : 40;
    const shouldFallback = overflowPx > fallbackThreshold;

    if (wordQuestScrollFallback !== shouldFallback) {
        wordQuestScrollFallback = shouldFallback;
        body.classList.toggle('wq-scroll-fallback', shouldFallback);
    }
}

function updateFitScreenMode() {
    const canvas = document.getElementById('game-canvas');
    const keyboardEl = document.getElementById('keyboard');
    const quickRow = document.querySelector('.quick-row');

    // Desktop Word Quest uses a fixed large layout; skip auto-fit compression logic.
    if (window.innerWidth >= 821) {
        applyWordQuestDesktopScale();
        if (fitScreenRaf) {
            cancelAnimationFrame(fitScreenRaf);
            fitScreenRaf = null;
        }
        fitScreenActive = false;
        fitScreenTightActive = false;
        document.body.classList.remove('fit-screen', 'fit-screen-tight');
        positionFunHud();
        updateWordQuestScrollFallback();
        return;
    }

    const storyTrack = document.getElementById('story-track');
    const storyTrackVisible = !!(
        storyTrack &&
        storyTrack.offsetParent !== null &&
        storyTrack.getBoundingClientRect().height > 0
    );
    const storyRect = storyTrackVisible ? storyTrack.getBoundingClientRect() : null;
    // If the Story Track is fixed at the bottom, treat its top edge as the usable viewport bottom.
    // Otherwise the keyboard can be "visible" by rect math but still covered by the overlay.
    const bottomSafeY = storyRect ? Math.max(0, storyRect.top - 6) : (window.innerHeight - 8);

    // Base heuristic: only force fit on clearly short viewports.
    const needsFitByHeight = window.innerHeight < 860;

    let needsFitByLayout = false;
    if (canvas) {
        // If canvas content is clipped (overflow hidden), scrollHeight will exceed clientHeight.
        needsFitByLayout = needsFitByLayout || (canvas.scrollHeight > canvas.clientHeight + 2);
    }
    if (keyboardEl) {
        const kbRect = keyboardEl.getBoundingClientRect();
        needsFitByLayout = needsFitByLayout || (kbRect.bottom > bottomSafeY);
    }
    if (keyboardEl && quickRow) {
        const kbRect = keyboardEl.getBoundingClientRect();
        const qRect = quickRow.getBoundingClientRect();
        // Prevent the keyboard from visually colliding with the audio row.
        needsFitByLayout = needsFitByLayout || (kbRect.top < qRect.bottom + 6);
    }

    const shouldFit = needsFitByHeight || needsFitByLayout;

    if (fitScreenActive !== shouldFit) {
        fitScreenActive = shouldFit;
        document.body.classList.toggle('fit-screen', shouldFit);
    }

    // Compute "tight" mode after the DOM has applied the fit-screen class.
    if (fitScreenRaf) cancelAnimationFrame(fitScreenRaf);
    fitScreenRaf = requestAnimationFrame(() => {
        fitScreenRaf = null;
        const canvasNow = document.getElementById('game-canvas');
        const keyboardNow = document.getElementById('keyboard');
        const stillClipped = canvasNow ? (canvasNow.scrollHeight > canvasNow.clientHeight + 12) : false;
        const storyNow = document.getElementById('story-track');
        const storyNowVisible = !!(
            storyNow &&
            storyNow.offsetParent !== null &&
            storyNow.getBoundingClientRect().height > 0
        );
        const storyNowRect = storyNowVisible ? storyNow.getBoundingClientRect() : null;
        const bottomSafeNowY = storyNowRect ? Math.max(0, storyNowRect.top - 4) : (window.innerHeight - 6);
        const stillOffscreen = keyboardNow
            ? (keyboardNow.getBoundingClientRect().bottom > bottomSafeNowY)
            : false;
        const shouldTight = shouldFit && (window.innerHeight < 790 || stillClipped || stillOffscreen);

        if (fitScreenTightActive !== shouldTight) {
            fitScreenTightActive = shouldTight;
            document.body.classList.toggle('fit-screen-tight', shouldTight);
        }

        positionFunHud();
        updateWordQuestScrollFallback();
    });
}

function applyFunHudOutcome(win) {
    if (!appSettings.funHud?.enabled) return;
    if (!appSettings.gameMode?.active) return;
    const maxHearts = appSettings.funHud?.maxHearts ?? 3;
    let hearts = appSettings.funHud?.hearts ?? maxHearts;
    if (appSettings.funHud?.challenge) {
        hearts = win ? Math.min(maxHearts, hearts + 1) : Math.max(1, hearts - 1);
    }
    appSettings.funHud.hearts = hearts;
    saveSettings();
    renderFunHud();
}

let funAudioContext = null;
let funHudSuspended = false;

function setFunHudSuspended(shouldSuspend = false) {
    funHudSuspended = shouldSuspend;
    const hud = ensureFunHud();
    hud.classList.toggle('suspended', shouldSuspend);
    updateFunHudVisibility();
}
function playFunChime(type = 'win') {
    if (!appSettings.funHud?.sfx) return;
    try {
        if (!funAudioContext) {
            funAudioContext = new (window.AudioContext || window.webkitAudioContext)();
        }
        const ctx = funAudioContext;
        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        const base = type === 'win' ? 660 : 520;
        osc.frequency.setValueAtTime(base, now);
        osc.frequency.exponentialRampToValueAtTime(base * 1.25, now + 0.12);
        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.exponentialRampToValueAtTime(0.12, now + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.4);
    } catch (e) {
        console.warn('SFX unavailable', e);
    }
}

function getAllModalElements() {
    return Array.from(document.querySelectorAll('.modal, [role="dialog"], [id$="-modal"], [id$="modal"]'));
}

/* --- VOICE LOADING & PICKER --- */
function initVoiceLoader() {
    const voiceSelect = document.getElementById("system-voice-select");

    const load = () => {
        cachedVoices = window.speechSynthesis.getVoices();
        if (cachedVoices.length) {
            pickBestEnglishVoice(cachedVoices);
        }
        populateVoiceList();
        renderVoiceDiagnosticsPanel();
        updateVoiceInstallPrompt();
        updateEnhancedVoicePrompt();
    };

    const populateVoiceList = () => {
        if (!voiceSelect) return;
        voiceSelect.innerHTML = `
            <option value="en-US">American English (Default)</option>
            <option value="en-GB">British English</option>
        `;

        const preferredDialect = appSettings.voiceDialect || DEFAULT_SETTINGS.voiceDialect;
        voiceSelect.value = preferredDialect;
        
    };

    load();
    if (!voiceLoaderInitialized && window.speechSynthesis.onvoiceschanged !== undefined) {
        if (window.speechSynthesis.addEventListener) {
            window.speechSynthesis.addEventListener('voiceschanged', load);
        } else {
            window.speechSynthesis.onvoiceschanged = load;
        }
        voiceLoaderInitialized = true;
    }

    if (voiceSelect && !voiceSelect.dataset.bound) {
        voiceSelect.dataset.bound = 'true';
        voiceSelect.onchange = () => {
            appSettings.voiceDialect = voiceSelect.value || DEFAULT_SETTINGS.voiceDialect;
            sessionEnglishVoice = { dialect: '', voiceUri: '' };
            saveSettings();
            if (cachedVoices.length) {
                pickBestEnglishVoice(cachedVoices);
            }
            renderVoiceDiagnosticsPanel();
            updateVoiceInstallPrompt();
            updateEnhancedVoicePrompt();
            prefetchEnhancedVoice();
        };
    }
}

function getVoicesAsync(timeout = 800) {
    if (cachedVoices.length) return Promise.resolve(cachedVoices);
    if (voicesReadyPromise) return voicesReadyPromise;

    voicesReadyPromise = new Promise((resolve) => {
        const existing = window.speechSynthesis.getVoices();
        if (existing && existing.length) {
            cachedVoices = existing;
            voicesReadyPromise = null;
            resolve(existing);
            return;
        }

        let resolved = false;
        const finish = () => {
            if (resolved) return;
            resolved = true;
            const voices = window.speechSynthesis.getVoices();
            if (voices && voices.length) cachedVoices = voices;
            voicesReadyPromise = null;
            resolve(cachedVoices);
        };

        if (window.speechSynthesis.addEventListener) {
            window.speechSynthesis.addEventListener('voiceschanged', finish, { once: true });
        } else {
            window.speechSynthesis.onvoiceschanged = finish;
        }

        setTimeout(finish, timeout);
    });

    return voicesReadyPromise;
}

async function getVoicesForSpeech() {
    let voices = await getVoicesAsync();
    if (voices.length) return voices;
    await new Promise(resolve => setTimeout(resolve, 180));
    voices = await getVoicesAsync(1400);
    return voices;
}

function cancelPendingSpeech(invalidateSequence = true) {
    if (!('speechSynthesis' in window)) return;
    if (speechStartTimeout) {
        clearTimeout(speechStartTimeout);
        speechStartTimeout = null;
    }
    if (invalidateSequence) {
        speechSequenceToken += 1;
    }
    window.speechSynthesis.cancel();
}

function speakUtterance(utterance, options = {}) {
    if (!('speechSynthesis' in window)) return;
    const cancelBefore = options.cancelBefore !== false;
    if (cancelBefore) {
        cancelPendingSpeech(true);
    } else if (speechStartTimeout) {
        clearTimeout(speechStartTimeout);
        speechStartTimeout = null;
    }
    const sequenceId = speechSequenceToken;
    speechStartTimeout = setTimeout(() => {
        if (sequenceId !== speechSequenceToken) {
            speechStartTimeout = null;
            return;
        }
        window.speechSynthesis.speak(utterance);
        speechStartTimeout = null;
    }, 40);
}

function countSpeechWords(text) {
    const normalized = String(text || '').trim();
    if (!normalized) return 0;
    return normalized.split(/\s+/).filter(Boolean).length;
}

function clampSpeechRate(value) {
    return Math.max(0.55, Math.min(1.1, value));
}

function clampSpeechPitch(value) {
    return Math.max(0.86, Math.min(1.25, value));
}

function buildSentenceProsodySegments(text, baseRate = 1) {
    const normalized = normalizeTextForTTS(text);
    const fragments = normalized.match(/[^.!?;:,]+[.!?;:,]?/g) || [normalized];
    const total = fragments.length;
    return fragments
        .map(fragment => fragment.trim())
        .filter(Boolean)
        .map((fragment, index) => {
            const end = fragment.slice(-1);
            let rate = baseRate;
            let pitch = 1.0;
            let pauseMs = 70;

            if (fragment.length > 70) rate -= 0.08;
            else if (fragment.length > 40) rate -= 0.05;

            if (end === ',') {
                rate -= 0.05;
                pauseMs = 110;
            } else if (end === ';' || end === ':') {
                rate -= 0.06;
                pauseMs = 130;
            } else if (end === '?') {
                rate += 0.03;
                pitch += 0.08;
                pauseMs = 180;
            } else if (end === '!') {
                rate += 0.04;
                pitch += 0.06;
                pauseMs = 190;
            } else if (end === '.') {
                pauseMs = 170;
            }

            if (total > 1 && index === total - 1) {
                rate -= 0.02;
            }

            return {
                text: fragment,
                rate: clampSpeechRate(rate),
                pitch: clampSpeechPitch(pitch),
                pauseMs
            };
        });
}

function speakSentenceWithProsody(text, voice, lang, baseRate) {
    const segments = buildSentenceProsodySegments(text, baseRate);
    if (!segments.length) return;

    cancelPendingSpeech(true);
    const sequenceId = speechSequenceToken;
    let index = 0;

    const playNext = () => {
        if (sequenceId !== speechSequenceToken) return;
        if (index >= segments.length) return;
        const segment = segments[index];
        const utterance = new SpeechSynthesisUtterance(segment.text);
        if (voice) {
            utterance.voice = voice;
            utterance.lang = voice.lang;
        } else if (lang) {
            utterance.lang = lang;
        }
        utterance.rate = segment.rate;
        utterance.pitch = segment.pitch;
        utterance.onend = () => {
            if (sequenceId !== speechSequenceToken) return;
            index += 1;
            if (index < segments.length) {
                setTimeout(playNext, segment.pauseMs);
            }
        };
        utterance.onerror = () => {
            if (sequenceId !== speechSequenceToken) return;
            index += 1;
            if (index < segments.length) {
                setTimeout(playNext, 40);
            }
        };
        window.speechSynthesis.speak(utterance);
    };

    speechStartTimeout = setTimeout(() => {
        if (sequenceId !== speechSequenceToken) {
            speechStartTimeout = null;
            return;
        }
        speechStartTimeout = null;
        playNext();
    }, 35);
}

function speakEnglishText(text, type = 'word', voice = null, fallbackLang = '') {
    const normalized = normalizeTextForTTS(text);
    const qualityMode = getSpeechQualityMode();
    if (!voice && qualityMode === 'natural-only') {
        return false;
    }
    const normalizedType = type === 'sentence' ? 'sentence' : (type === 'phoneme' ? 'phoneme' : 'word');
    const isSentence = normalizedType === 'sentence';
    const rate = getSpeechRate(normalizedType);
    const narrationStyle = getNarrationStyle();
    const expressive = narrationStyle === 'expressive';

    if (isSentence && expressive && countSpeechWords(normalized) >= 4 && /[.,!?;:]/.test(normalized)) {
        speakSentenceWithProsody(normalized, voice, fallbackLang, rate);
        return;
    }

    const msg = new SpeechSynthesisUtterance(normalized);
    if (voice) {
        msg.voice = voice;
        msg.lang = voice.lang;
    } else if (fallbackLang) {
        msg.lang = fallbackLang;
    }
    msg.rate = clampSpeechRate(rate);
    msg.pitch = isSentence
        ? clampSpeechPitch(expressive ? 1.03 : 1.0)
        : (normalizedType === 'phoneme' ? 1.02 : 1.0);
    speakUtterance(msg);
    return true;
}

async function speak(text, type = "word", options = {}) {
    if (!text) return false;
    const allowSystemFallback = !!options.allowSystemFallback || type === 'phoneme';
    const quietMissing = !!options.quietMissing;
    cancelPendingSpeech(true);

    // 1. Check Studio Recording
    let dbKey = "";
    if (type === "word") {
        dbKey = `${text.toLowerCase()}_word`;
    } else if (type === "sentence") {
        let currentSentence = getWordCopyForAudience(currentWord, 'en').sentence;
        if (!currentSentence && currentEntry && currentEntry.en && currentEntry.en.sentence) {
            currentSentence = currentEntry.en.sentence;
        } else if (!currentSentence && currentEntry && currentEntry.sentence) {
            currentSentence = currentEntry.sentence;
        }
        
        if (currentSentence && text === currentSentence) {
            dbKey = `${currentWord.toLowerCase()}_sentence`;
        } else {
            dbKey = "unknown"; 
        }
    } else {
        dbKey = "unknown";
    }

    const useTeacherVoice = localStorage.getItem('useTeacherRecordings') !== 'false';
    const blob = useTeacherVoice ? await getAudioFromDB(dbKey) : null;
    
    if (blob) {
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        audio.play();
        audio.onended = () => URL.revokeObjectURL(url);
        return true;
    }

    const packedType = type === 'sentence' ? 'sentence' : 'word';
    const packedPlaybackRate = Math.max(0.6, getSpeechRate(packedType));
    const packedPlayed = await tryPlayPackedTtsForCurrentWord({
        text,
        languageCode: 'en',
        type: packedType,
        playbackRate: packedPlaybackRate
    });
    if (packedPlayed) return true;

    if (!allowSystemFallback) {
        if (!quietMissing) {
            showToast('Audio clip unavailable for this item.');
        }
        return false;
    }

    // 2. Fallback to System Voice
    const voices = await getVoicesForSpeech();
    const preferred = pickBestEnglishVoice(voices);
    const fallbackLang = preferred ? preferred.lang : getPreferredEnglishDialect();
    return !!speakEnglishText(text, type === 'sentence' ? 'sentence' : 'word', preferred, fallbackLang);
}

function getPreferredEnglishDialect() {
    const raw = (appSettings.voiceDialect || DEFAULT_SETTINGS.voiceDialect || 'en-US').toString();
    const normalized = raw.toLowerCase();
    if (['uk', 'en-uk', 'british', 'en-gb'].includes(normalized)) return 'en-GB';
    if (['us', 'en-us', 'american'].includes(normalized)) return 'en-US';
    if (normalized.startsWith('en-')) return raw;
    if (normalized.startsWith('en')) return 'en-US';
    return 'en-US';
}

function pickPreferredEnglishCandidate(voices, dialect, options = {}) {
    const target = String(dialect || 'en-US');
    let picked = pickBestVoiceForLang(voices, target, options);
    if (!picked && target.toLowerCase() !== 'en') {
        picked = pickBestVoiceForLang(voices, 'en', options);
    }
    return picked;
}

function pickBestEnglishVoice(voices) {
    const dialect = getPreferredEnglishDialect();
    const qualityMode = getSpeechQualityMode();
    const pool = Array.isArray(voices) ? voices : [];
    if (!pool.length) {
        sessionEnglishVoice = { dialect: '', voiceUri: '' };
        setVoiceDiagnosticsState({
            voice: null,
            reason: `No system voices are currently loaded for ${dialect}.`,
            dialect,
            qualityMode,
            candidateCount: 0
        });
        return null;
    }

    const bestHighQuality = pickPreferredEnglishCandidate(pool, dialect, { requireHighQuality: true });
    const bestSafeGeneral = pickPreferredEnglishCandidate(pool, dialect, { excludeLowQuality: true });
    const bestAnyGeneral = pickPreferredEnglishCandidate(pool, dialect);
    const bestGeneral = qualityMode === 'fallback-any'
        ? (bestHighQuality || bestAnyGeneral)
        : (bestHighQuality || bestSafeGeneral || bestAnyGeneral);
    const bestVoiceUri = (bestGeneral && (bestGeneral.voiceURI || bestGeneral.name || '')) || '';
    const supportsOnlyHighQuality = qualityMode === 'natural-only';
    const hasSafeAlternative = !!(bestHighQuality || bestSafeGeneral);
    const disallowBasicWhenPossible = qualityMode === 'natural-preferred' && hasSafeAlternative;
    let upgradeReason = '';

    const modeBlocksVoice = (voice) => {
        if (!voice) return true;
        if (supportsOnlyHighQuality && !isHighQualityVoice(voice)) return true;
        if (disallowBasicWhenPossible && isLowQualityVoice(voice)) return true;
        return false;
    };

    if (sessionEnglishVoice.dialect === dialect && sessionEnglishVoice.voiceUri) {
        const locked = pool.find((voice) => (voice.voiceURI || voice.name) === sessionEnglishVoice.voiceUri);
        if (locked && locked.lang && locked.lang.toLowerCase().startsWith('en')) {
            const lockedUri = locked.voiceURI || locked.name || '';
            if (modeBlocksVoice(locked) && bestVoiceUri && bestVoiceUri !== lockedUri) {
                sessionEnglishVoice = { dialect: '', voiceUri: '' };
                upgradeReason = supportsOnlyHighQuality
                    ? `Upgraded locked voice to satisfy Natural-only mode for ${dialect}.`
                    : `Upgraded from a basic locked voice for ${dialect}.`;
            } else {
                setVoiceDiagnosticsState({
                    voice: locked,
                    reason: `Using locked session voice for ${dialect}.`,
                    dialect,
                    qualityMode,
                    candidateCount: pool.length
                });
                return locked;
            }
        }
    }

    const storedVoiceUri = getStoredEnglishVoiceUriForDialect(dialect);
    if (storedVoiceUri) {
        const remembered = pool.find(v => (v.voiceURI || v.name) === storedVoiceUri);
        if (remembered && remembered.lang && remembered.lang.toLowerCase().startsWith('en')) {
            const rememberedUri = remembered.voiceURI || remembered.name || '';
            if (
                modeBlocksVoice(remembered) &&
                bestVoiceUri &&
                bestVoiceUri !== rememberedUri
            ) {
                // Keep moving: we auto-upgrade below.
                upgradeReason = supportsOnlyHighQuality
                    ? `Upgraded saved voice to satisfy Natural-only mode for ${dialect}.`
                    : `Upgraded from a basic saved voice for ${dialect}.`;
            } else if (
                bestVoiceUri &&
                rememberedUri &&
                rememberedUri !== bestVoiceUri &&
                scoreVoiceForTarget(bestGeneral, dialect) - scoreVoiceForTarget(remembered, dialect) >= 40
            ) {
                // Keep moving: a substantially better voice is now available.
                upgradeReason = `Upgraded to a higher-scoring saved voice for ${dialect}.`;
            } else {
                sessionEnglishVoice = {
                    dialect,
                    voiceUri: remembered.voiceURI || remembered.name || ''
                };
                setVoiceDiagnosticsState({
                    voice: remembered,
                    reason: `Using saved preferred voice for ${dialect}.`,
                    dialect,
                    qualityMode,
                    candidateCount: pool.length
                });
                return remembered;
            }
        }
    }

    let voice = null;
    if (supportsOnlyHighQuality) {
        voice = bestHighQuality || null;
    } else if (qualityMode === 'natural-preferred') {
        voice = bestHighQuality || bestSafeGeneral || bestAnyGeneral || null;
    } else {
        voice = bestHighQuality || bestAnyGeneral || null;
    }

    let reason = bestHighQuality
        ? `Selected highest quality ${dialect} match from loaded voices.`
        : `No enhanced ${dialect} voice detected; using best available English voice.`;
    if (supportsOnlyHighQuality && !bestHighQuality) {
        reason = `Natural-only mode is enabled and no enhanced ${dialect} voice is installed yet.`;
    } else if (qualityMode === 'natural-preferred' && !bestHighQuality && bestSafeGeneral) {
        reason = `No enhanced ${dialect} voice detected; using a non-basic English voice.`;
    } else if (qualityMode === 'natural-preferred' && !bestHighQuality && !bestSafeGeneral && bestAnyGeneral) {
        reason = `Only basic English voices are available for ${dialect}; using best available fallback.`;
    } else if (voice && !bestHighQuality && dialect.toLowerCase() !== 'en' && String(voice.lang || '').toLowerCase().startsWith('en-')) {
        reason = `No enhanced ${dialect} match; using best available English voice.`;
    }
    if (voice) {
        if (upgradeReason) {
            reason = `${upgradeReason} ${reason}`;
        }
        sessionEnglishVoice = {
            dialect,
            voiceUri: voice.voiceURI || voice.name || ''
        };
        if (
            isHighQualityVoice(voice) ||
            !storedVoiceUri ||
            (!isLowQualityVoice(voice) && qualityMode !== 'fallback-any')
        ) {
            setStoredEnglishVoiceUriForDialect(dialect, voice.voiceURI || voice.name || '');
        }
        setVoiceDiagnosticsState({
            voice,
            reason,
            dialect,
            qualityMode,
            candidateCount: pool.length
        });
    } else {
        sessionEnglishVoice = { dialect: '', voiceUri: '' };
        setVoiceDiagnosticsState({
            voice: null,
            reason: supportsOnlyHighQuality
                ? `Natural-only mode is on and no enhanced English voice is available for ${dialect}.`
                : `Loaded voices do not include an English option for ${dialect}.`,
            dialect,
            qualityMode,
            candidateCount: pool.length
        });
    }
    return voice;
}

const ENGLISH_VOICE_PREFS_KEY = 'decode_english_voice_prefs_v1';
const HIGH_QUALITY_VOICE_PATTERNS = [
    /Premium/i,
    /Enhanced/i,
    /Natural/i,
    /Neural/i,
    /Siri/i,
    /Google/i,
    /Microsoft/i,
    /Samantha/i,
    /Ava/i,
    /Alex/i,
    /Daniel/i,
    /Serena/i,
    /Kate/i
];

const LOW_QUALITY_VOICE_PATTERNS = [
    /Fred/i,
    /Zarvox/i,
    /Whisper/i,
    /Bubbles/i,
    /Trinoids/i,
    /Bad News/i,
    /Novelty/i,
    /Robot/i
];

const DIALECT_NAME_HINTS = {
    'en-us': [/American/i, /\bUS\b/i, /\bUSA\b/i, /Samantha/i, /Ava/i, /Alex/i, /Allison/i, /Joelle/i],
    'en-gb': [/British/i, /\bUK\b/i, /England/i, /Daniel/i, /Kate/i, /Serena/i]
};

function isHighQualityVoice(voice) {
    if (!voice || !voice.name) return false;
    return HIGH_QUALITY_VOICE_PATTERNS.some(pattern => pattern.test(voice.name));
}

function isLowQualityVoice(voice) {
    if (!voice || !voice.name) return false;
    return LOW_QUALITY_VOICE_PATTERNS.some(pattern => pattern.test(voice.name));
}

function loadEnglishVoicePrefs() {
    try {
        const raw = localStorage.getItem(ENGLISH_VOICE_PREFS_KEY);
        const parsed = raw ? JSON.parse(raw) : {};
        return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
        return {};
    }
}

function saveEnglishVoicePrefs(prefs) {
    try {
        localStorage.setItem(ENGLISH_VOICE_PREFS_KEY, JSON.stringify(prefs || {}));
    } catch {}
}

function getStoredEnglishVoiceUriForDialect(dialect) {
    const prefs = loadEnglishVoicePrefs();
    const key = String(dialect || 'en-us').toLowerCase();
    return prefs[key] || prefs.en || '';
}

function setStoredEnglishVoiceUriForDialect(dialect, voiceUri) {
    if (!voiceUri) return;
    const prefs = loadEnglishVoicePrefs();
    const key = String(dialect || 'en-us').toLowerCase();
    prefs[key] = voiceUri;
    if (!prefs.en) prefs.en = voiceUri;
    saveEnglishVoicePrefs(prefs);
}

function scoreVoiceForTarget(voice, targetLang = 'en') {
    if (!voice) return Number.NEGATIVE_INFINITY;
    const lang = String(voice.lang || '').toLowerCase();
    const target = String(targetLang || 'en').toLowerCase();
    const targetBase = target.split('-')[0];
    let score = 0;

    if (lang === target) score += 140;
    else if (lang.startsWith(`${target}-`)) score += 130;
    else if (lang.startsWith(targetBase)) score += 94;

    if (voice.default) score += 18;
    if (voice.localService) score += 6;
    if (isHighQualityVoice(voice)) score += 64;
    if (isLowQualityVoice(voice)) score -= 90;
    if (/Compact|Legacy|Classic|Old/i.test(voice.name || '')) score -= 20;
    if (/Enhanced|Premium|Natural|Neural/i.test(voice.name || '')) score += 20;

    const hints = DIALECT_NAME_HINTS[target] || [];
    hints.forEach((pattern) => {
        if (pattern.test(voice.name || '')) score += 9;
    });

    return score;
}

function pickBestVoiceForLang(voices, targetLang, options = {}) {
    if (!voices || !voices.length || !targetLang) return null;
    const normalized = targetLang.toLowerCase();
    const normalizedFamily = normalizePackedTtsLanguage(normalized);
    const candidates = voices.filter((voice) => {
        if (!voice?.lang) return false;
        return normalizePackedTtsLanguage(voice.lang) === normalizedFamily;
    });
    if (!candidates.length) return null;

    const exact = candidates.filter(v => v.lang && v.lang.toLowerCase() === normalized);
    let pool = exact.length ? exact : candidates;
    if (options.requireHighQuality) {
        pool = pool.filter(isHighQualityVoice);
    }
    if (options.excludeLowQuality) {
        pool = pool.filter(voice => !isLowQualityVoice(voice));
    }
    if (!pool.length) return null;

    return pool
        .slice()
        .sort((a, b) => {
            const scoreDelta = scoreVoiceForTarget(b, normalized) - scoreVoiceForTarget(a, normalized);
            if (scoreDelta !== 0) return scoreDelta;
            const nameA = (a.name || '').toLowerCase();
            const nameB = (b.name || '').toLowerCase();
            if (nameA !== nameB) return nameA.localeCompare(nameB);
            return (a.voiceURI || '').localeCompare(b.voiceURI || '');
        })[0] || null;
}

function getTranslationVoiceTarget(languageCode) {
    const langMappings = {
        'es': 'es',
        'zh': 'zh',
        'vi': 'vi',
        'tl': 'fil',
        'ms': 'ms',
        'pt': 'pt',
        'hi': 'hi',
        'ar': 'ar',
        'ko': 'ko',
        'ja': 'ja'
    };
    return langMappings[languageCode] || languageCode;
}

function voiceMatchesLanguage(voice, targetLang = 'en') {
    if (!voice?.lang) return false;
    return normalizePackedTtsLanguage(voice.lang) === normalizePackedTtsLanguage(targetLang);
}

async function hasVoiceForLanguage(languageCode, options = {}) {
    const voices = await getVoicesForSpeech();
    const targetLang = getTranslationVoiceTarget(languageCode);
    if (options.requireHighQuality) {
        return !!pickBestVoiceForLang(voices, targetLang, { requireHighQuality: true });
    }
    return !!(
        pickBestVoiceForLang(voices, targetLang, { requireHighQuality: true })
        || pickBestVoiceForLang(voices, targetLang, { excludeLowQuality: true })
        || pickBestVoiceForLang(voices, targetLang)
    );
}

async function hasHighQualityVoiceForLanguage(languageCode) {
    return hasVoiceForLanguage(languageCode, { requireHighQuality: true });
}

function ensureTranslationAudioNote() {
    const translationDisplay = document.getElementById("translation-display");
    if (!translationDisplay) return null;
    let note = document.getElementById("translation-audio-note");
    if (!note) {
        note = document.createElement("div");
        note.id = "translation-audio-note";
        note.className = "translation-audio-note hidden";
        translationDisplay.appendChild(note);
    }
    return note;
}

function getVoiceInstallHint() {
    return 'Install enhanced voices in System Settings → Accessibility → Spoken Content → System Voice → Manage Voices. Voices can take a moment to load the first time.';
}

async function notifyMissingEnglishVoice() {
    const voices = await getVoicesForSpeech();
    const dialect = getPreferredEnglishDialect();
    const hasHighQuality = !!pickBestVoiceForLang(voices, dialect, { requireHighQuality: true }) ||
        (dialect !== 'en' && !!pickBestVoiceForLang(voices, 'en', { requireHighQuality: true }));
    if (!hasHighQuality && !localStorage.getItem('hq_english_voice_notice')) {
        showToast('Install enhanced English voices for clearer phoneme audio.');
        localStorage.setItem('hq_english_voice_notice', 'true');
    }
}

function setTranslationAudioNote(message, withTooltip = false) {
    const note = ensureTranslationAudioNote();
    if (!note) return;
    if (message) {
        if (withTooltip) {
            const hint = getVoiceInstallHint();
            note.innerHTML = `${message} <span class="tiny-tooltip" title="${hint}" aria-label="${hint}">ⓘ</span>`;
        } else {
            note.textContent = message;
        }
        note.classList.remove("hidden");
    } else {
        note.textContent = "";
        note.classList.add("hidden");
    }
}

function notifyMissingTranslationVoice() {
    setTranslationAudioNote('Audio unavailable for this language.', true);
    if (!localStorage.getItem('hq_voice_notice_shown')) {
        showToast('Install a matching voice pack for this language.');
        localStorage.setItem('hq_voice_notice_shown', 'true');
    }
}

function getBestTranslationVoice(voices, targetLang) {
    if (!Array.isArray(voices) || !voices.length) return null;
    return (
        pickBestVoiceForLang(voices, targetLang, { requireHighQuality: true })
        || pickBestVoiceForLang(voices, targetLang, { excludeLowQuality: true })
        || pickBestVoiceForLang(voices, targetLang)
        || null
    );
}

/* Play text in a specific language for translations */
async function playTextInLanguage(text, languageCode, type = 'sentence', sourceId = '') {
    if (!text) return;
    const normalizedType = normalizePackedTtsType(type);
    const playbackSource = normalizePlaybackSourceId(sourceId || `translation-${languageCode}-${normalizedType}`);
    const gate = beginExclusivePlaybackForSource(playbackSource);
    if (!gate.proceed) return;

    const packedPlayed = await tryPlayPackedTtsForCurrentWord({
        text,
        languageCode,
        type: normalizedType,
        playbackRate: Math.max(0.6, getSpeechRate(normalizedType === 'word' ? 'word' : 'sentence')),
        sourceId: playbackSource
    });
    if (packedPlayed) {
        setTranslationAudioNote('');
        return true;
    }

    if (activePlaybackSourceId === playbackSource) {
        activePlaybackSourceId = '';
    }
    notifyMissingTranslationVoice();
    return false;
}

function getTranslationData(word, langCode, options = {}) {
    if (!word || !langCode || langCode === 'en') return null;
    const lower = word.toLowerCase();
    if (!window.WORD_ENTRIES?.[lower]) {
        return null;
    }
    const normalizedLang = normalizePackedTtsLanguage(langCode);
    const audienceMode = normalizeAudienceMode(options.audienceMode || getResolvedAudienceMode());
    const englishCopy = getWordCopyForAudience(lower, 'en', audienceMode);

    const sanitizeAgainstEnglish = ({ wordText = '', definition = '', sentence = '' } = {}) => {
        const englishDefinition = normalizeTextForCompare(englishCopy.definition || '');
        const englishSentence = normalizeTextForCompare(englishCopy.sentence || '');
        const englishWord = normalizeTextForCompare(lower);
        const cleanWord = normalizeTextForCompare(wordText);
        const cleanDefinition = normalizeTextForCompare(definition);
        const cleanSentence = normalizeTextForCompare(sentence);

        return {
            wordText: cleanWord && cleanWord !== englishWord ? cleanAudienceText(wordText) : '',
            definition: cleanDefinition && cleanDefinition !== englishDefinition ? definition : '',
            sentence: cleanSentence && cleanSentence !== englishSentence ? sentence : ''
        };
    };
    const sanitizeTranslationCopy = ({ wordText = '', definition = '', sentence = '' } = {}) => ({
        word: cleanAudienceText(wordText),
        definition: definition
            ? sanitizeRevealText(definition, {
                word: lower,
                field: 'definition',
                languageCode: normalizedLang,
                allowFallback: true,
                maxWords: 20
            })
            : '',
        sentence: sentence
            ? sanitizeRevealText(sentence, {
                word: lower,
                field: 'sentence',
                languageCode: normalizedLang,
                allowFallback: true,
                maxWords: 24
            })
            : ''
    });

    const audienceCopy = getWordCopyForAudience(lower, normalizedLang, audienceMode);
    if (audienceCopy.definition || audienceCopy.sentence) {
        const cleaned = sanitizeAgainstEnglish({
            wordText: audienceCopy.word || '',
            definition: audienceCopy.definition,
            sentence: audienceCopy.sentence
        });
        const sanitized = sanitizeTranslationCopy(cleaned);
        if (sanitized.definition || sanitized.sentence) {
            return sanitized;
        }
    }

    if (window.TRANSLATIONS && typeof window.TRANSLATIONS.getTranslation === 'function') {
        const fallback = window.TRANSLATIONS.getTranslation(lower, normalizedLang);
        if (fallback) {
            const cleaned = sanitizeAgainstEnglish(fallback);
            const sanitized = sanitizeTranslationCopy(cleaned);
            if (!sanitized.definition && !sanitized.sentence) return null;
            return sanitized;
        }
    }
    
    // Direct fallback to WORDS_DATA (has full translations even if WORD_ENTRIES IIFE stripped them)
    if (typeof WORDS_DATA !== 'undefined' && WORDS_DATA?.[lower]?.[normalizedLang]) {
        const raw = WORDS_DATA[lower][normalizedLang];
        const cleaned = sanitizeAgainstEnglish({
            wordText: raw.word || raw.label || '',
            definition: raw.def || '',
            sentence: raw.sentence || ''
        });
        const sanitized = sanitizeTranslationCopy(cleaned);
        if (sanitized.definition || sanitized.sentence) {
            return sanitized;
        }
    }
    return null;
}

function getPreferredTranslationLanguage() {
    const fromSettings = normalizePackedTtsLanguage(appSettings?.translation?.lang || 'en');
    const fromHome = normalizePackedTtsLanguage(localStorage.getItem(HOME_LANGUAGE_PREFERENCE_KEY) || '');
    if (fromSettings && fromSettings !== 'en') return fromSettings;
    if (fromHome && fromHome !== 'en') return fromHome;
    return 'en';
}

function getYoungAudienceDefaultTranslationLanguage() {
    const preferred = getPreferredTranslationLanguage();
    if (preferred && preferred !== 'en') return preferred;
    return 'es';
}

function formatTranslationLanguageLabel(code = '', fallbackLabel = '') {
    const normalized = normalizePackedTtsLanguage(code);
    const fallback = String(fallbackLabel || '').trim();
    const labels = {
        es: 'Español (Spanish)',
        zh: '中文 (Simplified Chinese)',
        hi: 'हिन्दी (Hindi)',
        tl: 'Tagalog (Filipino)',
        ms: 'Bahasa Melayu (Malay)',
        vi: 'Tiếng Việt (Vietnamese)',
        ar: 'العربية (Arabic)',
        ko: '한국어 (Korean)',
        ja: '日本語 (Japanese)'
    };
    if (normalized === 'en') {
        return fallback || 'English';
    }
    return labels[normalized] || fallback || normalized.toUpperCase();
}

function applyTranslationLanguageOptionLabels(selectEl) {
    if (!(selectEl instanceof HTMLSelectElement)) return;
    Array.from(selectEl.options).forEach((option) => {
        const lang = normalizePackedTtsLanguage(option.value || '');
        option.textContent = formatTranslationLanguageLabel(lang, option.textContent || '');
    });
}

const WORD_QUEST_QUICK_VOICE_FALLBACK_PACKS = Object.freeze([
    { id: 'ava-multi', name: 'Ava Multilingual', dialect: 'en-US' },
    { id: 'emma-en', name: 'Emma English', dialect: 'en-US' },
    { id: 'guy-en-us', name: 'Guy English US', dialect: 'en-US' },
    { id: 'sonia-en-gb', name: 'Sonia British English', dialect: 'en-GB' },
    { id: 'ryan-en-gb', name: 'Ryan British English', dialect: 'en-GB' }
]);

function normalizeQuickVoiceDialectFromPack(pack = null) {
    const raw = String(pack?.dialect || '').trim().toLowerCase();
    if (raw === 'en-gb') return 'en-GB';
    if (raw === 'en-us') return 'en-US';
    const id = String(pack?.id || '').trim().toLowerCase();
    if (id.includes('en-gb')) return 'en-GB';
    if (id.includes('en-us')) return 'en-US';
    return 'en-US';
}

async function getWordQuestQuickVoicePackOptions() {
    try {
        const registry = await loadPackedTtsPackRegistry();
        const packs = Array.isArray(registry?.packs) ? registry.packs : [];
        const normalized = packs
            .map((pack) => {
                const id = normalizeTtsPackId(pack?.id || '');
                if (!id || id === 'default') return null;
                return {
                    id,
                    name: String(pack?.name || id).trim() || id,
                    dialect: normalizeQuickVoiceDialectFromPack(pack)
                };
            })
            .filter(Boolean);
        if (normalized.length) {
            const preferredOrder = new Map(WORD_QUEST_QUICK_VOICE_FALLBACK_PACKS.map((pack, index) => [pack.id, index]));
            return normalized
                .filter((pack) => preferredOrder.has(pack.id))
                .sort((a, b) => preferredOrder.get(a.id) - preferredOrder.get(b.id));
        }
    } catch (error) {}
    return WORD_QUEST_QUICK_VOICE_FALLBACK_PACKS.slice();
}

function readSentenceCaptionMode() {
    try {
        const raw = String(localStorage.getItem(SENTENCE_CAPTION_KEY) || '').trim().toLowerCase();
        return raw === 'on' ? 'on' : 'off';
    } catch (error) {
        return 'off';
    }
}

function writeSentenceCaptionMode(mode = 'off') {
    const next = String(mode || '').trim().toLowerCase() === 'on' ? 'on' : 'off';
    try {
        localStorage.setItem(SENTENCE_CAPTION_KEY, next);
    } catch (error) {}
    return next;
}

function readDelightToggleSetting(key, defaultValue = 'off') {
    try {
        const raw = String(localStorage.getItem(key) || '').trim().toLowerCase();
        if (raw === 'on' || raw === 'off') return raw;
    } catch (error) {}
    return defaultValue;
}

function writeDelightToggleSetting(key, next = 'off') {
    const value = String(next || '').trim().toLowerCase() === 'on' ? 'on' : 'off';
    try {
        localStorage.setItem(key, value);
    } catch (error) {}
    return value;
}

function readRoundClueVisibilityMode() {
    try {
        const raw = String(localStorage.getItem(ROUND_CLUE_VISIBILITY_KEY) || '').trim().toLowerCase();
        return raw === 'on' ? 'on' : 'off';
    } catch (error) {
        return 'off';
    }
}

function writeRoundClueVisibilityMode(mode = 'off') {
    const next = String(mode || '').trim().toLowerCase() === 'on' ? 'on' : 'off';
    try {
        localStorage.setItem(ROUND_CLUE_VISIBILITY_KEY, next);
    } catch (error) {}
    const chip = document.getElementById('focus-round-chip');
    if (chip) {
        chip.classList.toggle('is-hidden', next !== 'on');
    }
    return next;
}

function normalizePlayMode(mode = '') {
    return String(mode || '').trim().toLowerCase() === PLAY_MODE_LISTEN
        ? PLAY_MODE_LISTEN
        : PLAY_MODE_CLASSIC;
}

function readPlayMode() {
    try {
        return normalizePlayMode(localStorage.getItem(PLAY_MODE_KEY) || '');
    } catch (error) {
        return PLAY_MODE_CLASSIC;
    }
}

function writePlayMode(mode = PLAY_MODE_CLASSIC) {
    const next = normalizePlayMode(mode);
    try {
        localStorage.setItem(PLAY_MODE_KEY, next);
    } catch (error) {}
    return next;
}

function applyPlayMode(mode = PLAY_MODE_CLASSIC, options = {}) {
    const opts = options && typeof options === 'object' ? options : {};
    const nextMode = writePlayMode(mode);
    const isListen = nextMode === PLAY_MODE_LISTEN;

    document.body.dataset.wqPlayMode = nextMode;

    const classicBtn = document.getElementById('wq-play-mode-classic');
    const listenBtn = document.getElementById('wq-play-mode-listen');
    if (classicBtn) {
        const active = !isListen;
        classicBtn.classList.toggle('is-active', active);
        classicBtn.setAttribute('aria-pressed', active ? 'true' : 'false');
    }
    if (listenBtn) {
        listenBtn.classList.toggle('is-active', isListen);
        listenBtn.setAttribute('aria-pressed', isListen ? 'true' : 'false');
    }

    const hintActions = document.querySelector('.hint-actions');
    if (hintActions instanceof HTMLElement) {
        hintActions.classList.toggle('hidden', !isListen);
        hintActions.setAttribute('aria-hidden', isListen ? 'false' : 'true');
    }

    const sentenceToggleWrap = document.getElementById('cs-sentence-caption-toggle-wrap');
    if (sentenceToggleWrap instanceof HTMLElement) {
        sentenceToggleWrap.classList.toggle('hidden', !isListen);
        sentenceToggleWrap.setAttribute('aria-hidden', isListen ? 'false' : 'true');
    }

    const sentencePreview = document.getElementById('sentence-preview');
    if (!isListen && sentencePreview instanceof HTMLElement) {
        sentencePreview.classList.add('hidden');
        sentencePreview.classList.remove('has-caption');
    }

    if (opts.toast === true) {
        showToast(isListen ? '🎧 Listen & Spell — audio hints on' : '🎮 Classic — pure deduction, no audio hints');
    }
    return nextMode;
}

function ensureSentenceCaptionToggleControls() {
    const sentenceBtn = document.getElementById('simple-hear-sentence');
    const hintActions = sentenceBtn?.closest('.hint-actions');
    const sentencePreview = document.getElementById('sentence-preview');
    if (!(hintActions instanceof HTMLElement) || !(sentencePreview instanceof HTMLElement)) return;

    let wrap = document.getElementById('cs-sentence-caption-toggle-wrap');
    if (!(wrap instanceof HTMLElement)) {
        wrap = document.createElement('div');
        wrap.id = 'cs-sentence-caption-toggle-wrap';
        wrap.className = 'cs-sentence-caption-toggle-wrap';
        wrap.innerHTML = `
          <label class="cs-sentence-caption-toggle">
            <input id="cs-sentence-caption-toggle" type="checkbox" />
            <span>Sentence text</span>
          </label>
        `;
        hintActions.insertAdjacentElement('afterend', wrap);
    }

    let hideBtn = document.getElementById('cs-sentence-caption-hide');
    if (!(hideBtn instanceof HTMLButtonElement)) {
        hideBtn = document.createElement('button');
        hideBtn.type = 'button';
        hideBtn.id = 'cs-sentence-caption-hide';
        hideBtn.className = 'cs-sentence-caption-hide hidden';
        hideBtn.textContent = 'Hide caption ×';
        sentencePreview.insertAdjacentElement('afterend', hideBtn);
    }

    const toggle = document.getElementById('cs-sentence-caption-toggle');
    if (!(toggle instanceof HTMLInputElement)) return;

    const sync = () => {
        const enabled = readSentenceCaptionMode() === 'on';
        toggle.checked = enabled;
        const hasPreview = !!String(sentencePreview.textContent || '').trim();
        if (!enabled || !hasPreview || sentencePreview.classList.contains('hidden')) {
            sentencePreview.classList.remove('has-caption');
            hideBtn.classList.add('hidden');
        } else {
            sentencePreview.classList.add('has-caption');
            hideBtn.classList.remove('hidden');
        }
    };

    if (toggle.dataset.bound !== 'true') {
        toggle.dataset.bound = 'true';
        toggle.addEventListener('change', () => {
            writeSentenceCaptionMode(toggle.checked ? 'on' : 'off');
            if (!toggle.checked) {
                sentencePreview.classList.add('hidden');
                sentencePreview.classList.remove('has-caption');
            }
            sync();
        });
    }

    if (hideBtn.dataset.bound !== 'true') {
        hideBtn.dataset.bound = 'true';
        hideBtn.addEventListener('click', () => {
            sentencePreview.classList.add('hidden');
            sentencePreview.classList.remove('has-caption');
            hideBtn.classList.add('hidden');
            hideBtn.blur();
        });
    }

    sync();
}

function ensureWordQuestUtilityControlsPlacement() {
    const body = document.body;
    if (!body || !body.classList.contains('word-quest-page')) return;
    const legacyPost = document.querySelector('.post-keyboard-actions');
    const inlineWrap = document.querySelector('.wq-tools-buttons');
    if (!(inlineWrap instanceof HTMLElement)) {
        if (legacyPost instanceof HTMLElement) {
            legacyPost.classList.add('hidden');
            legacyPost.setAttribute('aria-hidden', 'true');
        }
        return;
    }

    const voiceBtn = document.getElementById('simple-voice-settings');
    if (voiceBtn instanceof HTMLElement) {
        voiceBtn.classList.add('wq-utility-btn');
        if (voiceBtn.parentElement !== inlineWrap) {
            inlineWrap.appendChild(voiceBtn);
        }
    }

    const themeBtn = document.getElementById('wq-theme-studio-btn');
    if (themeBtn instanceof HTMLElement) {
        themeBtn.classList.add('wq-utility-btn');
        if (themeBtn.parentElement !== inlineWrap) {
            inlineWrap.appendChild(themeBtn);
        }
    }

    const misplacedUtilityControls = document.querySelectorAll('.hint-actions #simple-voice-settings, .hint-actions #wq-theme-studio-btn, .hint-actions .wq-theme-studio-btn-inline');
    misplacedUtilityControls.forEach((node) => {
        if (!(node instanceof HTMLElement)) return;
        node.classList.add('wq-utility-btn');
        if (node.id === 'wq-theme-studio-btn' || node.id === 'simple-voice-settings') {
            inlineWrap.appendChild(node);
        } else {
            node.remove();
        }
    });

    if (legacyPost instanceof HTMLElement) {
        legacyPost.classList.add('hidden');
        legacyPost.setAttribute('aria-hidden', 'true');
    }
}

function ensureWordQuestVoiceQuickOverlay() {
    let overlay = document.getElementById('voice-quick-overlay');
    if (overlay) return overlay;

    overlay = document.createElement('div');
    overlay.id = 'voice-quick-overlay';
    overlay.className = 'voice-quick-overlay hidden';
    overlay.innerHTML = `
      <section class="voice-quick-modal" role="dialog" aria-modal="true" aria-labelledby="voice-quick-title">
        <header class="voice-quick-head">
          <h2 id="voice-quick-title">Voice</h2>
        </header>
        <p class="voice-quick-copy">Choose one Azure voice for listening activities.</p>
        <label class="voice-quick-field">
          <span>Voice choice</span>
          <select id="voice-quick-voice"></select>
        </label>
        <label class="voice-quick-field">
          <span>Reading speed</span>
          <div class="voice-quick-rate-row">
            <input id="voice-quick-rate" type="range" min="0.55" max="1.05" step="0.01" />
            <span id="voice-quick-rate-value">0.95x</span>
          </div>
          <span class="voice-quick-note">Applies to word, definition, sentence, and translation audio.</span>
        </label>
        <div class="voice-quick-field voice-quick-delight">
          <span>Delight feedback</span>
          <label class="voice-quick-lock">
            <input type="checkbox" id="voice-quick-delight-motion" />
            Animate 3-star celebrations
          </label>
          <label class="voice-quick-lock">
            <input type="checkbox" id="voice-quick-delight-sound" />
            Play celebration chime
          </label>
        </div>
        <p id="voice-quick-status" class="voice-quick-status"></p>
        <div class="voice-quick-actions">
          <button type="button" class="voice-quick-preview">Preview Voice</button>
          <button type="button" class="voice-quick-done">Done</button>
        </div>
      </section>
    `;
    document.body.appendChild(overlay);

    const voiceSelect = overlay.querySelector('#voice-quick-voice');
    const rateInput = overlay.querySelector('#voice-quick-rate');
    const rateValue = overlay.querySelector('#voice-quick-rate-value');
    const delightMotionToggle = overlay.querySelector('#voice-quick-delight-motion');
    const delightSoundToggle = overlay.querySelector('#voice-quick-delight-sound');
    const statusEl = overlay.querySelector('#voice-quick-status');
    const previewBtn = overlay.querySelector('.voice-quick-preview');
    let quickPacks = [];

    const setStatus = (message = '', active = false) => {
        if (!statusEl) return;
        statusEl.textContent = String(message || '').trim();
        statusEl.classList.toggle('active', !!active && !!statusEl.textContent);
    };

    const findPack = (packId = '') => {
        const normalized = normalizeTtsPackId(packId || '');
        return quickPacks.find((pack) => pack.id === normalized) || null;
    };

    const resolveVoiceUriForPack = async (pack) => {
        if (!pack) return '';
        const voices = await getVoicesForSpeech();
        if (!Array.isArray(voices) || !voices.length) return '';
        const dialect = normalizeQuickVoiceDialectFromPack(pack).toLowerCase();
        const family = dialect.split('-')[0];
        const englishVoices = voices.filter((voice) => {
            const lang = String(voice?.lang || '').toLowerCase();
            return lang.startsWith(family);
        });
        if (!englishVoices.length) return '';
        const dialectVoices = englishVoices.filter((voice) => String(voice?.lang || '').toLowerCase().startsWith(dialect));
        const pool = dialectVoices.length ? dialectVoices : englishVoices;
        const normalizedPackId = normalizeTtsPackId(pack.id);
        const targetPatterns = normalizedPackId === 'ava-multi'
            ? [/ava/i, /samantha/i, /allison/i]
            : normalizedPackId === 'emma-en'
                ? [/emma/i, /samantha/i, /allison/i]
                : normalizedPackId === 'guy-en-us'
                    ? [/guy/i, /alex/i, /aaron/i]
                    : normalizedPackId === 'sonia-en-gb'
                        ? [/sonia/i, /daniel/i, /serena/i, /kate/i]
                        : normalizedPackId === 'ryan-en-gb'
                            ? [/ryan/i, /daniel/i, /serena/i, /kate/i]
                            : [];
        const matching = targetPatterns.length
            ? pool.filter((voice) => targetPatterns.some((pattern) => pattern.test(String(voice?.name || ''))))
            : pool;
        const ranked = (matching.length ? matching : pool)
            .slice()
            .sort((a, b) => scoreVoiceForTarget(b, dialect) - scoreVoiceForTarget(a, dialect));
        const best = ranked[0];
        return best ? String(best.voiceURI || best.name || '').trim() : '';
    };

    const applyQuickSelection = async (packId = '') => {
        const pack = findPack(packId);
        if (!pack) return;
        const voiceDialect = normalizeQuickVoiceDialectFromPack(pack);
        const matchedVoiceUri = await resolveVoiceUriForPack(pack);
        syncSettingsFromPlatform({
            ttsPackId: pack.id,
            voiceDialect,
            voiceUri: matchedVoiceUri || ''
        });
        if (matchedVoiceUri) {
            sessionEnglishVoice = { dialect: voiceDialect, voiceUri: matchedVoiceUri };
        }
    };

    const populateVoiceChoices = async () => {
        if (!(voiceSelect instanceof HTMLSelectElement)) return;
        quickPacks = await getWordQuestQuickVoicePackOptions();
        voiceSelect.innerHTML = '';
        quickPacks.forEach((pack) => {
            const option = document.createElement('option');
            option.value = pack.id;
            option.textContent = `${pack.name} (${pack.dialect})`;
            voiceSelect.appendChild(option);
        });
        const preferred = normalizeTtsPackId(appSettings.ttsPackId || DEFAULT_SETTINGS.ttsPackId);
        if (quickPacks.some((pack) => pack.id === preferred)) {
            voiceSelect.value = preferred;
        } else if (quickPacks[0]) {
            voiceSelect.value = quickPacks[0].id;
            await applyQuickSelection(quickPacks[0].id);
        }
        voiceSelect.disabled = !quickPacks.length;
        if (previewBtn) previewBtn.disabled = !quickPacks.length;
        setStatus(
            quickPacks.length
                ? `Preview ready: ${voiceSelect.selectedOptions?.[0]?.textContent || 'voice selected'}.`
                : 'No compatible Azure voices are loaded yet.',
            quickPacks.length > 0
        );
    };

    const closeOverlay = () => {
        overlay.classList.add('hidden');
    };

    const syncRateUi = () => {
        if (!(rateInput instanceof HTMLInputElement)) return;
        const next = normalizeSpeechRate(appSettings.speechRate ?? DEFAULT_SETTINGS.speechRate);
        rateInput.value = String(next);
        if (rateValue instanceof HTMLElement) {
            rateValue.textContent = `${next.toFixed(2)}x`;
        }
    };

    const openOverlay = async () => {
        await populateVoiceChoices();
        syncRateUi();
        if (delightMotionToggle instanceof HTMLInputElement) {
            delightMotionToggle.checked = readDelightToggleSetting(DELIGHT_MOTION_KEY, 'on') === 'on';
        }
        if (delightSoundToggle instanceof HTMLInputElement) {
            delightSoundToggle.checked = readDelightToggleSetting(DELIGHT_SOUND_KEY, 'off') === 'on';
        }
        overlay.classList.remove('hidden');
        setTimeout(() => {
            (voiceSelect instanceof HTMLSelectElement ? voiceSelect : overlay.querySelector('.voice-quick-done'))?.focus();
        }, 0);
    };

    overlay.querySelector('.voice-quick-done')?.addEventListener('click', closeOverlay);
    overlay.addEventListener('click', (event) => {
        if (event.target === overlay) closeOverlay();
    });
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && !overlay.classList.contains('hidden')) {
            closeOverlay();
            return;
        }
        if (event.key === 'Enter' && !overlay.classList.contains('hidden')) {
            const activeEl = document.activeElement;
            if (activeEl && ['INPUT', 'TEXTAREA', 'SELECT'].includes(activeEl.tagName)) return;
            closeOverlay();
        }
    });

    if (voiceSelect instanceof HTMLSelectElement) {
        voiceSelect.addEventListener('change', async () => {
            await applyQuickSelection(voiceSelect.value || '');
            setStatus(`Saved: ${voiceSelect.selectedOptions?.[0]?.textContent || 'voice selected'}.`, true);
        });
    }

    if (rateInput instanceof HTMLInputElement) {
        const commitRate = () => {
            const nextRate = normalizeSpeechRate(rateInput.value);
            syncSettingsFromPlatform({ speechRate: nextRate });
            if (rateValue instanceof HTMLElement) {
                rateValue.textContent = `${nextRate.toFixed(2)}x`;
            }
            setStatus(`Saved: reading speed ${nextRate.toFixed(2)}x.`, true);
        };
        rateInput.addEventListener('input', commitRate);
        rateInput.addEventListener('change', commitRate);
    }

    if (delightMotionToggle instanceof HTMLInputElement) {
        delightMotionToggle.addEventListener('change', () => {
            const mode = writeDelightToggleSetting(DELIGHT_MOTION_KEY, delightMotionToggle.checked ? 'on' : 'off');
            if (window.csDelight && typeof window.csDelight.setMotionSetting === 'function') {
                window.csDelight.setMotionSetting(mode);
            }
        });
    }

    if (delightSoundToggle instanceof HTMLInputElement) {
        delightSoundToggle.addEventListener('change', () => {
            const mode = writeDelightToggleSetting(DELIGHT_SOUND_KEY, delightSoundToggle.checked ? 'on' : 'off');
            if (window.csDelight && typeof window.csDelight.setSoundSetting === 'function') {
                window.csDelight.setSoundSetting(mode);
            }
        });
    }

    previewBtn?.addEventListener('click', async () => {
        if (!(voiceSelect instanceof HTMLSelectElement) || !voiceSelect.options.length) {
            setStatus('Select a voice first.');
            return;
        }
        await applyQuickSelection(voiceSelect.value || '');
        setStatus('Playing voice preview…', true);
        await previewSelectedVoice('This is your selected English listening voice.');
        setStatus(`Preview ready: ${voiceSelect.selectedOptions?.[0]?.textContent || 'voice selected'}.`, true);
    });

    overlay.openQuickVoice = openOverlay;
    return overlay;
}

/* --- CONTROLS & EVENTS --- */
function initControls() {
    writeSentenceCaptionMode('off');
    const delightMotion = writeDelightToggleSetting(DELIGHT_MOTION_KEY, readDelightToggleSetting(DELIGHT_MOTION_KEY, 'on'));
    const delightSound = writeDelightToggleSetting(DELIGHT_SOUND_KEY, readDelightToggleSetting(DELIGHT_SOUND_KEY, 'off'));
    if (window.csDelight && typeof window.csDelight.setMotionSetting === 'function') {
        window.csDelight.setMotionSetting(delightMotion);
    }
    if (window.csDelight && typeof window.csDelight.setSoundSetting === 'function') {
        window.csDelight.setSoundSetting(delightSound);
    }

    const newWordBtn = document.getElementById("new-word-btn");
    if (newWordBtn) {
        newWordBtn.onclick = () => {
            newWordBtn.blur();
            startNewGame();
        };
    }
    const caseToggle = document.getElementById("case-toggle");
    if (caseToggle) {
        caseToggle.onclick = (e) => {
            e.target.blur();
            toggleCase();
        };
    }
    
    const patternSelect = document.getElementById("pattern-select");
    if (patternSelect) {
        patternSelect.onchange = () => {
            patternSelect.blur();
            syncLengthOptionsToPattern(true);
            refreshPatternSelectTooltip();
            startNewGame();
        };
    }
    
    const lengthSelect = document.getElementById("length-select");
    if (lengthSelect) {
        lengthSelect.onchange = (e) => {
            e.target.blur();
            lengthAutoSet = false;
            startNewGame();
        };
    }

    const guessCountSelect = document.getElementById("guess-count-select");
    if (guessCountSelect) {
        guessCountSelect.onchange = (e) => {
            e.target.blur();
            const nextGuessCount = normalizeGuessCount(guessCountSelect.value);
            appSettings.guessCount = nextGuessCount;
            CURRENT_MAX_GUESSES = nextGuessCount;
            saveSettings();
            startNewGame();
        };
    }

    const teacherBtn = document.getElementById("teacher-btn");
    if (teacherBtn) teacherBtn.onclick = openTeacherMode;
    const openStudioBtn = document.getElementById("open-studio-btn");
    if (openStudioBtn) openStudioBtn.onclick = openStudioSetup;
    const quickCustomWordToggleBtn = document.getElementById('quick-custom-word-toggle');
    const quickCustomWordBody = document.getElementById('quick-custom-word-body');
    const quickCustomWordInput = document.getElementById('quick-custom-word-input');
    const quickCustomWordStartBtn = document.getElementById('quick-custom-word-start');
    const quickCustomWordClearBtn = document.getElementById('quick-custom-word-clear');
    const quickCustomWordListInput = document.getElementById('quick-custom-word-list-input');
    const quickCustomWordListSetBtn = document.getElementById('quick-custom-word-list-set');
    const quickCustomWordListClearBtn = document.getElementById('quick-custom-word-list-clear');
    const quickCustomWordListEnable = document.getElementById('quick-custom-word-list-enable');
    const quickCustomWordListStatus = document.getElementById('quick-custom-word-list-status');
    const quickCustomWordFileInput = document.getElementById('quick-custom-word-file');
    const quickCustomWordFileImportBtn = document.getElementById('quick-custom-word-file-import');
    const toggleMaskBtn = document.getElementById('quick-custom-word-toggle-mask');
    const roundClueToggle = document.getElementById('wq-toggle-round-clue');
    const teacherWordToolsBtn = document.getElementById('wq-tools-teacher-word');
    const toolsMenu = document.getElementById('wq-tools-menu');
    const toolsTeacherTabBtn = document.getElementById('wq-tools-tab-teacher');
    const customWordInput = quickCustomWordInput;
    const quickCustomPanel = document.querySelector('.quick-custom-word-panel');
    const teacherToolsCard = document.querySelector('.wq-tools-teacher-card');
    const teacherControlsInTools = !!(quickCustomWordBody && quickCustomWordBody.closest('#wq-tools-menu'));
    const customWordTeacherOnly = isTeacherCustomWordAllowed();
    const supportsTextSecurity = typeof CSS !== 'undefined' && CSS.supports && (
        CSS.supports('-webkit-text-security: disc') || CSS.supports('text-security: disc')
    );
    const initToolsTabbedPanels = () => {
        if (!(toolsMenu instanceof HTMLElement)) return;
        const tabButtons = Array.from(toolsMenu.querySelectorAll('.wq-tools-tab[data-tools-tab]'));
        const panels = Array.from(toolsMenu.querySelectorAll('.wq-tools-panel[data-tools-panel]'));
        if (!tabButtons.length || !panels.length) return;

        const storageKey = 'wq_tools_active_tab';
        const fallbackTab = 'round';
        const resolveTabId = (nextTabId) => {
            const target = String(nextTabId || '').trim();
            if (!target) return fallbackTab;
            return tabButtons.some((btn) => btn.dataset.toolsTab === target) ? target : fallbackTab;
        };

        const applyTab = (nextTabId, { persist = true, focus = false } = {}) => {
            const tabId = resolveTabId(nextTabId);
            tabButtons.forEach((btn) => {
                const isActive = btn.dataset.toolsTab === tabId;
                btn.classList.toggle('is-active', isActive);
                btn.setAttribute('aria-selected', isActive ? 'true' : 'false');
                btn.tabIndex = isActive ? 0 : -1;
                if (isActive && focus) btn.focus();
            });
            panels.forEach((panel) => {
                const isActive = panel.dataset.toolsPanel === tabId;
                panel.classList.toggle('is-active', isActive);
                panel.classList.toggle('hidden', !isActive);
                panel.setAttribute('aria-hidden', isActive ? 'false' : 'true');
            });
            if (persist) {
                try {
                    localStorage.setItem(storageKey, tabId);
                } catch (e) {}
            }
        };

        const moveFocusByOffset = (currentTab, offset) => {
            if (!tabButtons.length) return;
            const currentIndex = Math.max(0, tabButtons.indexOf(currentTab));
            const nextIndex = (currentIndex + offset + tabButtons.length) % tabButtons.length;
            const nextTab = tabButtons[nextIndex];
            if (!(nextTab instanceof HTMLButtonElement)) return;
            applyTab(nextTab.dataset.toolsTab, { focus: true });
        };

        tabButtons.forEach((btn) => {
            if (!(btn instanceof HTMLButtonElement) || btn.dataset.boundToolsTab === 'true') return;
            btn.dataset.boundToolsTab = 'true';
            btn.addEventListener('click', () => {
                applyTab(btn.dataset.toolsTab);
            });
            btn.addEventListener('keydown', (event) => {
                if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
                    event.preventDefault();
                    moveFocusByOffset(btn, 1);
                } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
                    event.preventDefault();
                    moveFocusByOffset(btn, -1);
                } else if (event.key === 'Home') {
                    event.preventDefault();
                    const firstTab = tabButtons[0];
                    if (firstTab) applyTab(firstTab.dataset.toolsTab, { focus: true });
                } else if (event.key === 'End') {
                    event.preventDefault();
                    const lastTab = tabButtons[tabButtons.length - 1];
                    if (lastTab) applyTab(lastTab.dataset.toolsTab, { focus: true });
                }
            });
        });

        let initialTab = fallbackTab;
        try {
            initialTab = resolveTabId(localStorage.getItem(storageKey));
        } catch (e) {}
        applyTab(initialTab, { persist: false });

        if (toolsMenu instanceof HTMLDetailsElement && toolsMenu.dataset.boundToolsToggle !== 'true') {
            toolsMenu.dataset.boundToolsToggle = 'true';
            toolsMenu.addEventListener('toggle', () => {
                if (!toolsMenu.open) return;
                const activeTab = tabButtons.find((btn) => btn.classList.contains('is-active'));
                applyTab(activeTab?.dataset.toolsTab || initialTab, { persist: false });
            });
        }
    };

    teacherWordList = readTeacherWordList();
    teacherWordListEnabled = readTeacherWordListEnabled() && teacherWordList.length > 0;
    writeTeacherWordListEnabled(teacherWordListEnabled);
    initToolsTabbedPanels();

    if (quickCustomPanel) {
        quickCustomPanel.classList.toggle('hidden', !customWordTeacherOnly);
        quickCustomPanel.classList.toggle('is-open', false);
        quickCustomPanel.classList.toggle('is-collapsed', customWordTeacherOnly);
        quickCustomPanel.setAttribute('aria-hidden', customWordTeacherOnly ? 'false' : 'true');
    }
    if (teacherToolsCard) {
        teacherToolsCard.classList.toggle('hidden', !customWordTeacherOnly);
        teacherToolsCard.setAttribute('aria-hidden', customWordTeacherOnly ? 'false' : 'true');
    }

    const setCustomPanelExpanded = (expanded) => {
        if (!quickCustomWordBody) return;
        quickCustomWordBody.classList.toggle('hidden', !expanded);
        if (quickCustomWordToggleBtn) {
            quickCustomWordToggleBtn.classList.toggle('open', expanded);
            quickCustomWordToggleBtn.setAttribute('aria-expanded', expanded ? 'true' : 'false');
        }
        if (quickCustomPanel) {
            quickCustomPanel.classList.toggle('is-open', expanded);
            quickCustomPanel.classList.toggle('is-collapsed', !expanded);
        }
    };

    const autoResizeTeacherListInput = () => {
        if (!(quickCustomWordListInput instanceof HTMLTextAreaElement)) return;
        quickCustomWordListInput.style.height = 'auto';
        const next = Math.max(96, Math.min(320, quickCustomWordListInput.scrollHeight + 2));
        quickCustomWordListInput.style.height = `${next}px`;
    };

    const setListStatus = (message = '', isError = false) => {
        if (!(quickCustomWordListStatus instanceof HTMLElement)) return;
        quickCustomWordListStatus.textContent = message;
        quickCustomWordListStatus.classList.toggle('error', !!isError);
    };

    const syncTeacherWordListUi = () => {
        if (quickCustomWordListInput instanceof HTMLTextAreaElement) {
            quickCustomWordListInput.value = teacherWordList.join('\n');
            autoResizeTeacherListInput();
        }
        if (quickCustomWordListEnable instanceof HTMLInputElement) {
            quickCustomWordListEnable.checked = !!teacherWordListEnabled && teacherWordList.length > 0;
            quickCustomWordListEnable.disabled = teacherWordList.length === 0;
        }
        setListStatus(getTeacherWordListStatusText(), false);
    };

    if (roundClueToggle instanceof HTMLInputElement) {
        roundClueToggle.checked = readRoundClueVisibilityMode() === 'on';
        roundClueToggle.addEventListener('change', () => {
            writeRoundClueVisibilityMode(roundClueToggle.checked ? 'on' : 'off');
            updateFocusPanel();
        });
        writeRoundClueVisibilityMode(roundClueToggle.checked ? 'on' : 'off');
    } else {
        writeRoundClueVisibilityMode(readRoundClueVisibilityMode());
    }

    if (customWordTeacherOnly && quickCustomWordBody) {
        if (teacherControlsInTools) {
            setCustomPanelExpanded(true);
            if (quickCustomWordToggleBtn instanceof HTMLButtonElement) {
                quickCustomWordToggleBtn.classList.add('hidden');
                quickCustomWordToggleBtn.setAttribute('aria-hidden', 'true');
                quickCustomWordToggleBtn.tabIndex = -1;
            }
        } else if (quickCustomWordToggleBtn) {
            setCustomPanelExpanded(false);
            quickCustomWordToggleBtn.onclick = () => {
                const shouldExpand = quickCustomWordBody.classList.contains('hidden');
                setCustomPanelExpanded(shouldExpand);
                if (shouldExpand) {
                    setTimeout(() => quickCustomWordInput?.focus(), 0);
                }
            };
        }
    }

    if (teacherWordToolsBtn instanceof HTMLButtonElement) {
        teacherWordToolsBtn.classList.toggle('hidden', !customWordTeacherOnly);
        teacherWordToolsBtn.addEventListener('click', () => {
            if (!customWordTeacherOnly) return;
            if (teacherControlsInTools) {
                if (toolsMenu instanceof HTMLDetailsElement) toolsMenu.open = true;
                if (toolsTeacherTabBtn instanceof HTMLButtonElement) toolsTeacherTabBtn.click();
                quickCustomWordInput?.focus();
                return;
            }
            setCustomPanelExpanded(true);
            quickCustomWordInput?.focus();
            if (toolsMenu instanceof HTMLDetailsElement) toolsMenu.open = false;
        });
    }

    if (toolsMenu instanceof HTMLDetailsElement) {
        const closeToolsMenu = () => {
            toolsMenu.open = false;
        };
        document.addEventListener('click', (event) => {
            if (!toolsMenu.open) return;
            const target = event.target;
            if (target instanceof Node && toolsMenu.contains(target)) return;
            closeToolsMenu();
        });
        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape' && toolsMenu.open) {
                closeToolsMenu();
            }
        });
    }

    if (customWordTeacherOnly && quickCustomWordListInput instanceof HTMLTextAreaElement) {
        quickCustomWordListInput.addEventListener('input', autoResizeTeacherListInput);
    }

    if (customWordTeacherOnly && quickCustomWordListSetBtn instanceof HTMLButtonElement) {
        quickCustomWordListSetBtn.addEventListener('click', () => {
            const parsed = parseTeacherWordListInput(quickCustomWordListInput?.value || '');
            if (!parsed.accepted.length) {
                setListStatus(
                    parsed.rejected.length
                        ? 'No words saved. Check formatting or class-safe filter.'
                        : 'No words entered.',
                    true
                );
                return;
            }
            writeTeacherWordList(parsed.accepted);
            writeTeacherWordListEnabled(true);
            syncTeacherWordListUi();
            const rejectedNote = parsed.rejected.length ? ` (${parsed.rejected.length} skipped)` : '';
            setQuickCustomWordStatus(`Teacher list saved: ${teacherWordList.length} words${rejectedNote}.`, false, true);
            startNewGame();
        });
    }

    if (customWordTeacherOnly && quickCustomWordListEnable instanceof HTMLInputElement) {
        quickCustomWordListEnable.addEventListener('change', () => {
            const enabled = quickCustomWordListEnable.checked && teacherWordList.length > 0;
            writeTeacherWordListEnabled(enabled);
            syncTeacherWordListUi();
            if (enabled) {
                setQuickCustomWordStatus(`Teacher list mode is ON (${teacherWordList.length} words).`, false, true);
                startNewGame();
            } else {
                setQuickCustomWordStatus(WORD_SOURCE_LIBRARY_STATUS, false, false);
                startNewGame();
            }
        });
    }

    if (customWordTeacherOnly && quickCustomWordListClearBtn instanceof HTMLButtonElement) {
        quickCustomWordListClearBtn.addEventListener('click', () => {
            writeTeacherWordList([]);
            writeTeacherWordListEnabled(false);
            syncTeacherWordListUi();
            setQuickCustomWordStatus(WORD_SOURCE_LIBRARY_STATUS, false, false);
            startNewGame();
        });
    }

    const importTeacherWordsFromFile = async () => {
        if (!(quickCustomWordFileInput instanceof HTMLInputElement)) return;
        const file = quickCustomWordFileInput.files && quickCustomWordFileInput.files[0];
        if (!file) {
            setListStatus('Choose a file first.', true);
            return;
        }
        if (file.size > 2 * 1024 * 1024) {
            setListStatus('File is too large. Use a file under 2MB.', true);
            return;
        }
        const fileName = String(file.name || '').toLowerCase();
        let rawText = '';
        try {
            if (fileName.endsWith('.json')) {
                const jsonText = await file.text();
                const parsedJson = JSON.parse(jsonText || '[]');
                if (Array.isArray(parsedJson)) {
                    rawText = parsedJson.join('\n');
                } else if (parsedJson && Array.isArray(parsedJson.words)) {
                    rawText = parsedJson.words.join('\n');
                } else {
                    rawText = String(parsedJson || '');
                }
            } else {
                const buffer = await file.arrayBuffer();
                rawText = new TextDecoder('utf-8').decode(new Uint8Array(buffer));
            }
        } catch (error) {
            setListStatus('Could not read that file. Paste the list directly instead.', true);
            return;
        }

        const parsed = parseTeacherWordListInput(rawText);
        const acceptedFromLibrary = parsed.accepted.filter((word) => !!window.WORD_ENTRIES?.[word]);
        const filteredOut = parsed.accepted.length - acceptedFromLibrary.length;
        if (!acceptedFromLibrary.length) {
            const needsManualPaste = fileName.endsWith('.pdf') || fileName.endsWith('.doc') || fileName.endsWith('.docx');
            setListStatus(
                needsManualPaste
                    ? 'No readable words found. For PDF/DOC files, paste text into the list box.'
                    : 'No valid words found in that file.',
                true
            );
            return;
        }

        writeTeacherWordList(acceptedFromLibrary);
        writeTeacherWordListEnabled(true);
        syncTeacherWordListUi();
        setQuickCustomWordStatus(
            `Teacher file imported: ${teacherWordList.length} words${filteredOut ? ` (${filteredOut} non-library skipped)` : ''}.`,
            false,
            true
        );
        startNewGame();
        quickCustomWordFileInput.value = '';
    };

    if (customWordTeacherOnly && quickCustomWordFileImportBtn instanceof HTMLButtonElement) {
        quickCustomWordFileImportBtn.addEventListener('click', () => {
            importTeacherWordsFromFile();
        });
    }

    if (customWordTeacherOnly && quickCustomWordFileInput instanceof HTMLInputElement) {
        quickCustomWordFileInput.addEventListener('change', () => {
            importTeacherWordsFromFile();
        });
    }

    if (customWordTeacherOnly && customWordInput) {
        if (supportsTextSecurity) {
            customWordInput.type = 'text';
            customWordInput.classList.add('masked');
            customWordInput.setAttribute('autocomplete', 'off');
        } else {
            customWordInput.classList.remove('masked');
            customWordInput.type = 'password';
            customWordInput.setAttribute('autocomplete', 'new-password');
        }
    }

    if (customWordTeacherOnly && toggleMaskBtn) {
        toggleMaskBtn.onclick = () => {
            const inp = quickCustomWordInput;
            if (!inp) return;

            const canMask = typeof CSS !== 'undefined' && CSS.supports && (
                CSS.supports('-webkit-text-security: disc') || CSS.supports('text-security: disc')
            );

            if (canMask) {
                const isMasked = inp.classList.contains('masked');
                inp.classList.toggle('masked', !isMasked);
                toggleMaskBtn.textContent = isMasked ? "Hide" : "Show";
            } else {
                const isHidden = inp.type === "password";
                inp.type = isHidden ? "text" : "password";
                inp.setAttribute('autocomplete', inp.type === 'password' ? 'new-password' : 'off');
                toggleMaskBtn.textContent = isHidden ? "Hide" : "Show";
            }

            inp.focus();
        };
    }

    if (customWordTeacherOnly && quickCustomWordStartBtn) {
        quickCustomWordStartBtn.onclick = () => {
            const value = quickCustomWordInput ? quickCustomWordInput.value : '';
            const ok = applyCustomWordChallenge(value, { source: 'quick' });
            if (ok) {
                if (quickCustomWordInput) quickCustomWordInput.value = '';
                if (!teacherControlsInTools) setCustomPanelExpanded(false);
            }
            if (quickCustomWordInput) quickCustomWordInput.blur();
        };
    }

    if (customWordTeacherOnly && quickCustomWordInput) {
        quickCustomWordInput.addEventListener('keydown', (event) => {
            if (event.key !== 'Enter') return;
            event.preventDefault();
            const ok = applyCustomWordChallenge(quickCustomWordInput.value, { source: 'quick' });
            if (ok) {
                quickCustomWordInput.value = '';
                if (!teacherControlsInTools) setCustomPanelExpanded(false);
            }
        });
    }

    if (customWordTeacherOnly && quickCustomWordClearBtn) {
        quickCustomWordClearBtn.onclick = () => {
            if (quickCustomWordInput) quickCustomWordInput.value = '';
            isCustomWordRound = false;
            customWordInLibrary = true;
            writeTeacherWordListEnabled(false);
            syncTeacherWordListUi();
            setQuickCustomWordStatus(WORD_SOURCE_LIBRARY_STATUS, false, false);
            startNewGame();
            if (!teacherControlsInTools) setCustomPanelExpanded(false);
        };
    }

    if (customWordTeacherOnly) {
        syncTeacherWordListUi();
    }

    ensureWordQuestUtilityControlsPlacement();

    // Simple audio buttons
    const playModeClassicBtn = document.getElementById('wq-play-mode-classic');
    const playModeListenBtn = document.getElementById('wq-play-mode-listen');
    const hearWordBtn = document.getElementById("simple-hear-word");
    const hearSentenceBtn = document.getElementById("simple-hear-sentence");
    const voiceSettingsBtn = document.getElementById("simple-voice-settings");
    const testCelebrationSoundBtn = document.getElementById("wq-test-celebration-sound");

    if (playModeClassicBtn) {
        playModeClassicBtn.onclick = () => applyPlayMode(PLAY_MODE_CLASSIC, { toast: true });
    }
    if (playModeListenBtn) {
        playModeListenBtn.onclick = () => applyPlayMode(PLAY_MODE_LISTEN, { toast: true });
    }

    if (hearWordBtn) {
        hearWordBtn.onclick = async () => {
            if (isCurrentWordAudioBlocked()) {
                hearWordBtn.blur();
                return;
            }
            if (!currentWord) {
                hearWordBtn.blur();
                return;
            }
            const gate = beginExclusivePlaybackForSource('simple-hear-word');
            if (gate.proceed) {
                const played = await tryPlayPackedTtsForCurrentWord({
                    text: currentWord,
                    languageCode: 'en',
                    type: 'word',
                    playbackRate: Math.max(0.6, getSpeechRate('word')),
                    sourceId: gate.sourceId
                });
                if (!played) {
                    if (activePlaybackSourceId === gate.sourceId) activePlaybackSourceId = '';
                    showToast('No Azure clip is available for this word yet.');
                }
            }
            hearWordBtn.blur();
        };
    }
    
    if (hearSentenceBtn) {
        ensureSentenceCaptionToggleControls();
        hearSentenceBtn.onclick = async () => {
            if (isCurrentWordAudioBlocked()) {
                hearSentenceBtn.blur();
                return;
            }
            const audienceCopy = getWordCopyForAudience(currentWord, 'en');
            let sentence = audienceCopy.sentence || null;
            if (!sentence && currentEntry && currentEntry.en && currentEntry.en.sentence) {
                sentence = currentEntry.en.sentence;
            } else if (!sentence && currentEntry && currentEntry.sentence) {
                sentence = currentEntry.sentence;
            }

            const sentencePreview = document.getElementById('sentence-preview');
            const hideCaptionBtn = document.getElementById('cs-sentence-caption-hide');
            const captionsOn = readSentenceCaptionMode() === 'on';

            if (sentence) {
                if (sentencePreview) {
                    sentencePreview.textContent = `"${sentence}"`;
                    if (captionsOn) {
                        sentencePreview.classList.remove('hidden');
                        sentencePreview.classList.add('has-caption');
                        if (hideCaptionBtn instanceof HTMLButtonElement) hideCaptionBtn.classList.remove('hidden');
                    } else {
                        sentencePreview.classList.add('hidden');
                        sentencePreview.classList.remove('has-caption');
                        if (hideCaptionBtn instanceof HTMLButtonElement) hideCaptionBtn.classList.add('hidden');
                    }
                }

                const gate = beginExclusivePlaybackForSource('simple-hear-sentence');
                if (gate.proceed) {
                    const played = await tryPlayPackedTtsForCurrentWord({
                        text: sentence,
                        languageCode: 'en',
                        type: 'sentence',
                        playbackRate: Math.max(0.6, getSpeechRate('sentence')),
                        sourceId: gate.sourceId
                    });
                    if (!played) {
                        if (activePlaybackSourceId === gate.sourceId) activePlaybackSourceId = '';
                        showToast('No Azure clip is available for this sentence yet.');
                    }
                }
            } else {
                if (sentencePreview) {
                    sentencePreview.textContent = '';
                    sentencePreview.classList.add('hidden');
                    sentencePreview.classList.remove('has-caption');
                }
                if (hideCaptionBtn instanceof HTMLButtonElement) hideCaptionBtn.classList.add('hidden');
                showToast('No sentence available for this word.');
            }
            hearSentenceBtn.blur();
        };
    }

    applyPlayMode(readPlayMode(), { toast: false });

    if (voiceSettingsBtn) {
        voiceSettingsBtn.onclick = (event) => {
            event.preventDefault();
            event.stopImmediatePropagation();
            window.dispatchEvent(new CustomEvent('cornerstone:open-voice-quick'));
            const overlay = ensureWordQuestVoiceQuickOverlay();
            if (overlay && typeof overlay.openQuickVoice === 'function') {
                overlay.openQuickVoice();
            } else {
                openTeacherMode();
            }
            if (toolsMenu instanceof HTMLDetailsElement) toolsMenu.open = false;
            voiceSettingsBtn.blur();
        };
    }

    if (testCelebrationSoundBtn instanceof HTMLButtonElement) {
        testCelebrationSoundBtn.onclick = () => {
            const played = !!(window.csDelight && typeof window.csDelight.playStarPing === 'function' && window.csDelight.playStarPing());
            if (!played) {
                showToast('Celebration sound is off or blocked. Turn it on and tap anywhere once.');
            }
            testCelebrationSoundBtn.blur();
        };
    }

    const themeStudioBtn = document.getElementById('wq-theme-studio-btn');
    if (themeStudioBtn instanceof HTMLButtonElement) {
        themeStudioBtn.addEventListener('click', () => {
            if (toolsMenu instanceof HTMLDetailsElement) toolsMenu.open = false;
            themeStudioBtn.blur();
        });
    }

    refreshPatternSelectTooltip();
    if (customWordTeacherOnly) {
        setQuickCustomWordStatus(WORD_SOURCE_LIBRARY_STATUS, false, false);
    }
    updateWordQuestAudioAvailabilityNotice();
    
    document.getElementById("speak-btn").onclick = () => {
        if (isCurrentWordAudioBlocked()) return;
        speak(currentWord, "word");
    };
    document.getElementById("play-again-btn").onclick = () => {
        closeModal();
        startNewGame();
    };
    const bonusContinueBtn = document.getElementById("bonus-continue");
    if (bonusContinueBtn) {
        bonusContinueBtn.onclick = closeModal;
    }

    document.querySelectorAll(".close-btn, .close-teacher, .close-studio").forEach(btn => {
        btn.addEventListener("click", closeModal);
    });

    window.addEventListener("keydown", (e) => {
        if (isModalOpen()) {
            if (!studioModal.classList.contains("hidden")) return; 

            if (e.key === "Escape") {
                closeModal();
            }
            return; 
        }

        if (gameOver) return;

        // Add visual feedback to on-screen keyboard
        const key = e.key.toLowerCase();
        
        if (/^[a-z]$/i.test(key)) {
            // Find key by data-key attribute
            const keyElement = document.querySelector(`.key[data-key="${key}"]`);
            if (keyElement) {
                keyElement.classList.add('key-pressed');
                setTimeout(() => keyElement.classList.remove('key-pressed'), 150);
            }
            handleInput(key);
        }
        else if (e.key === "Enter") {
            const enterKey = Array.from(document.querySelectorAll('.key.wide')).find(k => 
                k.textContent === 'ENTER'
            );
            if (enterKey) {
                enterKey.classList.add('key-pressed');
                setTimeout(() => enterKey.classList.remove('key-pressed'), 150);
            }
            submitGuess();
        }
        else if (e.key === "Backspace") {
            const backKey = Array.from(document.querySelectorAll('.key.wide')).find(k => 
                k.textContent.includes('⌫')
            );
            if (backKey) {
                backKey.classList.add('key-pressed');
                setTimeout(() => backKey.classList.remove('key-pressed'), 150);
            }
            deleteLetter();
        }
    });

    if (quickCustomWordInput) {
        quickCustomWordInput.addEventListener("keydown", (e) => {
            e.stopImmediatePropagation();
            if (e.key === "Escape") closeModal();
        });
    }
}

function initWarmupButtons() {
    const warmupPanel = document.querySelector('.warmup-panel');
    if (warmupPanel) {
        warmupPanel.classList.add('hidden');
        warmupPanel.setAttribute('aria-hidden', 'true');
    }

    const phonemeBtn = document.getElementById('phoneme-btn');
    if (phonemeBtn) {
        phonemeBtn.onclick = () => openPhonemeGuide();
    }

    const warmupTiles = document.querySelectorAll('.warmup-tile');
    warmupTiles.forEach(tile => {
        tile.onclick = () => {
            const sound = tile.dataset.sound;
            openPhonemeGuide(sound);
        };
    });

    prefetchWarmupPhonemes();
}

function initTeacherTools() {
    const grid = document.querySelector('#teacher-modal .teacher-tools-grid');
    if (!grid) return;
    grid.innerHTML = `
        <div class="teacher-row teacher-launchpad-row">
            <div>
                <strong>Session setup</strong>
                <div class="teacher-subtext">Set class defaults once, then launch tools.</div>
            </div>
            <div class="teacher-launchpad-controls">
                <label for="teacher-translation-default">Reveal language</label>
                <select id="teacher-translation-default">
                    <option value="en">English</option>
                    <option value="es">Español (Spanish)</option>
                    <option value="zh">中文 (Simplified Chinese)</option>
                    <option value="hi">हिन्दी (Hindi)</option>
                    <option value="tl">Tagalog (Filipino)</option>
                    <option value="ms">Bahasa Melayu (Malay)</option>
                    <option value="vi">Tiếng Việt (Vietnamese)</option>
                    <option value="ar">العربية (Arabic)</option>
                    <option value="ko">한국어 (Korean)</option>
                    <option value="ja">日本語 (Japanese)</option>
                </select>

                <label for="teacher-audience-mode">Language style</label>
                <select id="teacher-audience-mode">
                    <option value="auto">Auto</option>
                    <option value="young-eal">Young / EAL-friendly</option>
                    <option value="general">General</option>
                </select>

                <label for="teacher-reveal-frequency">Jokes, riddles, facts</label>
                <select id="teacher-reveal-frequency">
                    <option value="off">Off</option>
                    <option value="rare">Rare</option>
                    <option value="sometimes">Sometimes</option>
                    <option value="often">Often</option>
                    <option value="always">Always</option>
                </select>

                <label class="toggle-row inline">
                    <input type="checkbox" id="toggle-auto-hear-session" />
                    Auto-read reveal card
                </label>
                <label class="toggle-row inline">
                    <input type="checkbox" id="toggle-fun-mode-session" />
                    Fun mode (coins/hearts)
                </label>
            </div>
        </div>

        <div class="teacher-row teacher-action-buttons">
            <button type="button" id="open-studio-btn" class="teacher-secondary-btn">Recording Studio</button>
            <button type="button" id="open-sound-lab-btn" class="teacher-secondary-btn">Sound Lab</button>
            <button type="button" id="open-assessment-hub-btn" class="teacher-secondary-btn">Assessments Hub</button>
            <button type="button" id="open-classroom-dock" class="teacher-secondary-btn">Classroom Dock</button>
        </div>

        <div class="teacher-subtext">
            Voice packs are managed from Home → Language + Audio Setup.
        </div>
        <div id="teacher-error" class="teacher-error" aria-live="polite"></div>
    `;

    grid.querySelector('#open-studio-btn')?.addEventListener('click', openStudioSetup);
    grid.querySelector('#open-sound-lab-btn')?.addEventListener('click', () => openPhonemeGuide());
    grid.querySelector('#open-assessment-hub-btn')?.addEventListener('click', () => {
        window.location.href = 'assessments.html';
    });
    grid.querySelector('#open-classroom-dock')?.addEventListener('click', () => {
        toggleClassroomDock(true);
    });

    const translationSelect = document.getElementById('teacher-translation-default');
    if (translationSelect) {
        applyTranslationLanguageOptionLabels(translationSelect);
        translationSelect.value = normalizePackedTtsLanguage(appSettings.translation?.lang || 'en');
        translationSelect.onchange = () => {
            appSettings.translation.lang = translationSelect.value;
            if (translationSelect.value === 'en') {
                appSettings.translation.pinned = false;
            }
            saveSettings();
        };
    }

    const bonusSelect = document.getElementById('teacher-reveal-frequency');
    if (bonusSelect) {
        bonusSelect.value = appSettings.bonus?.frequency || DEFAULT_SETTINGS.bonus.frequency;
        bonusSelect.onchange = () => {
            appSettings.bonus.frequency = bonusSelect.value;
            saveSettings();
        };
    }

    // Tools panel bonus frequency
    const toolsBonusSelect = document.getElementById('bonus-frequency-select');
    if (toolsBonusSelect) {
        toolsBonusSelect.value = appSettings.bonus?.frequency || 'always';
        toolsBonusSelect.onchange = () => {
            appSettings.bonus.frequency = toolsBonusSelect.value;
            saveSettings();
        };
    }

    const audienceSelect = document.getElementById('teacher-audience-mode');
    if (audienceSelect) {
        audienceSelect.value = normalizeAudienceMode(appSettings.audienceMode || DEFAULT_SETTINGS.audienceMode);
        audienceSelect.onchange = () => {
            appSettings.audienceMode = normalizeAudienceMode(audienceSelect.value);
            saveSettings();
        };
    }

    const autoHearToggle = document.getElementById('toggle-auto-hear-session');
    if (autoHearToggle) {
        autoHearToggle.checked = appSettings.autoHear !== false;
        autoHearToggle.onchange = () => {
            appSettings.autoHear = autoHearToggle.checked;
            saveSettings();
        };
    }
    const funModeToggle = document.getElementById('toggle-fun-mode-session');
    if (funModeToggle) {
        funModeToggle.checked = !!appSettings.funHud?.enabled;
        funModeToggle.onchange = () => {
            appSettings.funHud.enabled = !!funModeToggle.checked;
            saveSettings();
            updateFunHudVisibility();
        };
    }
}

function ensureTeacherLaunchpad() {
    const grid = document.querySelector('#teacher-modal .teacher-tools-grid');
    if (!grid || document.getElementById('teacher-launchpad-row')) return;

    const row = document.createElement('div');
    row.className = 'teacher-row teacher-launchpad-row';
    row.id = 'teacher-launchpad-row';
    row.innerHTML = `
        <div>
            <strong>Session defaults</strong>
            <div class="teacher-subtext">Set language, audio behavior, and fun level once before class.</div>
        </div>
        <div class="teacher-launchpad-controls">
            <label for="teacher-translation-default">Reveal language</label>
            <select id="teacher-translation-default">
                <option value="en">English</option>
                <option value="es">Español (Spanish)</option>
                <option value="zh">中文 (Simplified Chinese)</option>
                <option value="hi">हिन्दी (Hindi)</option>
                <option value="tl">Tagalog (Filipino)</option>
                <option value="ms">Bahasa Melayu (Malay)</option>
                <option value="vi">Tiếng Việt (Vietnamese)</option>
                <option value="ar">العربية (Arabic)</option>
                <option value="ko">한국어 (Korean)</option>
                <option value="ja">日本語 (Japanese)</option>
            </select>
            <label for="teacher-audience-mode">Language style</label>
            <select id="teacher-audience-mode">
                <option value="auto">Auto</option>
                <option value="young-eal">Young / EAL-friendly</option>
                <option value="general">General</option>
            </select>
            <label for="teacher-reveal-frequency">Jokes/facts/riddles</label>
            <select id="teacher-reveal-frequency">
                <option value="off">Off</option>
                <option value="rare">Rare</option>
                <option value="sometimes">Sometimes</option>
                <option value="often">Often</option>
                <option value="always">Always</option>
            </select>
            <label class="toggle-row inline"><input type="checkbox" id="toggle-auto-hear-session" /> Auto-read reveal card</label>
            <label class="toggle-row inline"><input type="checkbox" id="toggle-fun-mode-session" /> Fun mode (coins/hearts)</label>
        </div>
    `;
    grid.prepend(row);
}

function ensureVoiceHubRow() {
    const grid = document.querySelector('#teacher-modal .teacher-tools-grid');
    if (!grid) return;
    if (document.getElementById('open-voice-hub-btn')) return;

    const row = document.createElement('div');
    row.className = 'teacher-row';
    row.innerHTML = `
        <div>
            <strong>Voice & Audio Packs</strong>
            <div class="teacher-subtext">Managed in a dedicated workspace so gameplay settings stay simple.</div>
        </div>
        <button type="button" id="open-voice-hub-btn" class="teacher-secondary-btn">Open Audio Workspace</button>
    `;
    grid.appendChild(row);
    row.querySelector('#open-voice-hub-btn')?.addEventListener('click', () => {
        window.location.href = 'teacher-report.html#report-recording-library';
    });
}

function ensureUiLookRow() {
    const grid = document.querySelector('#teacher-modal .teacher-tools-grid');
    if (!grid || document.getElementById('ui-look-select')) return;

    const row = document.createElement('div');
    row.className = 'teacher-row';
    row.innerHTML = `
        <label for="ui-look-select"><strong>Interface look</strong></label>
        <select id="ui-look-select">
            <option value="k2">K–2 (Playful)</option>
            <option value="35">3–5 (Balanced)</option>
            <option value="612">6–12 (Studio)</option>
        </select>
        <div class="teacher-subtext">Adjusts shapes and contrast (content stays the same).</div>
    `;
    grid.appendChild(row);

    const select = row.querySelector('#ui-look-select');
    if (!select) return;
    select.value = getUiLookValue();
    select.addEventListener('change', () => {
        appSettings.uiLook = select.value;
        saveSettings();
        applySettings();
    });
}

function ensureClassroomDockControl() {
    const grid = document.querySelector('#teacher-modal .teacher-tools-grid');
    if (!grid || document.getElementById('open-classroom-dock')) return;

    const row = document.createElement('div');
    row.className = 'toggle-row inline';
    row.innerHTML = `
        <button type="button" id="open-classroom-dock" class="teacher-secondary-btn">Open Classroom Dock</button>
    `;
    grid.appendChild(row);
    row.querySelector('#open-classroom-dock')?.addEventListener('click', () => {
        toggleClassroomDock(true);
    });
}

function ensurePracticePackRow() {
    const grid = document.querySelector('#teacher-modal .teacher-tools-grid');
    if (!grid || document.getElementById('practice-pack-row')) return;

    const row = document.createElement('div');
    row.className = 'teacher-pack-row';
    row.id = 'practice-pack-row';
    row.innerHTML = `
        <div class="practice-pack-label">
            <strong>Download practice pack</strong>
            <span class="teacher-subtext">CSV summary + audio bundle</span>
        </div>
        <div class="practice-pack-actions">
            <button type="button" id="practice-pack-csv" class="teacher-secondary-btn">CSV</button>
            <button type="button" id="practice-pack-audio" class="teacher-secondary-btn">Audio bundle</button>
            <button type="button" id="practice-pack-clear" class="teacher-secondary-btn">Clear local recordings</button>
        </div>
    `;
    grid.appendChild(row);

    row.querySelector('#practice-pack-csv')?.addEventListener('click', downloadPracticePackCsv);
    row.querySelector('#practice-pack-audio')?.addEventListener('click', downloadPracticeAudioBundle);
    row.querySelector('#practice-pack-clear')?.addEventListener('click', clearAllPracticeRecordings);
}

function ensureSettingsTransferRow() {
    const grid = document.querySelector('#teacher-modal .teacher-tools-grid');
    if (!grid || document.getElementById('settings-transfer-row')) return;

    const row = document.createElement('div');
    row.className = 'teacher-pack-row';
    row.id = 'settings-transfer-row';
    row.innerHTML = `
        <div class="practice-pack-label">
            <strong>Move your settings</strong>
            <span class="teacher-subtext">Export/import preferences for a new device.</span>
        </div>
        <div class="practice-pack-actions">
            <button type="button" id="settings-export" class="teacher-secondary-btn">Export</button>
            <button type="button" id="settings-import-btn" class="teacher-secondary-btn">Import</button>
            <input id="settings-import" type="file" accept="application/json" style="position:absolute;left:-9999px;width:1px;height:1px;" />
        </div>
    `;
    grid.appendChild(row);

    row.querySelector('#settings-export')?.addEventListener('click', exportPlatformSettings);
    row.querySelector('#settings-import-btn')?.addEventListener('click', () => {
        row.querySelector('#settings-import')?.click();
    });
    const input = row.querySelector('#settings-import');
    if (input) {
        input.addEventListener('change', async (event) => {
            const file = event.target.files?.[0];
            if (!file) return;
            await importPlatformSettingsFromFile(file);
            event.target.value = '';
        });
    }
}

function exportPlatformSettings() {
    const safeCopy = JSON.parse(JSON.stringify(appSettings || {}));
    if (safeCopy.gameMode) safeCopy.gameMode.active = false;
    const blob = new Blob([JSON.stringify(safeCopy, null, 2)], { type: 'application/json' });
    downloadBlob(blob, 'decode-the-word-settings.json');
    showToast('Settings exported.');
}

async function importPlatformSettingsFromFile(file) {
    try {
        const text = await file.text();
        const parsed = JSON.parse(text);
        if (!parsed || typeof parsed !== 'object') {
            showToast('That file does not look like settings.');
            return;
        }

        const merged = {
            ...DEFAULT_SETTINGS,
            ...parsed,
            funHud: {
                ...DEFAULT_SETTINGS.funHud,
                ...(parsed.funHud || {})
            },
            translation: {
                ...DEFAULT_SETTINGS.translation,
                ...(parsed.translation || {})
            },
            bonus: {
                ...DEFAULT_SETTINGS.bonus,
                ...(parsed.bonus || {})
            },
            gameMode: {
                ...DEFAULT_SETTINGS.gameMode,
                ...(parsed.gameMode || {})
            },
            classroom: {
                ...DEFAULT_SETTINGS.classroom,
                ...(parsed.classroom || {})
            },
            soundWallSections: {
                ...DEFAULT_SETTINGS.soundWallSections,
                ...(parsed.soundWallSections || {})
            }
        };

        merged.audienceMode = normalizeAudienceMode(merged.audienceMode || DEFAULT_SETTINGS.audienceMode);
        merged.narrationStyle = normalizeNarrationStyle(merged.narrationStyle || DEFAULT_SETTINGS.narrationStyle);
        merged.speechQualityMode = normalizeSpeechQualityMode(merged.speechQualityMode || DEFAULT_SETTINGS.speechQualityMode);
        const mergedPackId = normalizeTtsPackId(merged.ttsPackId || DEFAULT_SETTINGS.ttsPackId);
        merged.ttsPackId = mergedPackId === 'default' ? DEFAULT_SETTINGS.ttsPackId : mergedPackId;
        merged.guessCount = normalizeGuessCount(merged.guessCount ?? DEFAULT_SETTINGS.guessCount);

        localStorage.setItem(SETTINGS_KEY, JSON.stringify(merged));
        showToast('Settings imported. Reloading...');
        setTimeout(() => window.location.reload(), 650);
    } catch (e) {
        console.error('Could not import settings', e);
        showToast('Could not import settings.');
    }
}

function ensureTeacherTabs() {
    return;
}

function setTeacherTab(tab = 'audio') {
    return;
}

function compactTeacherLayout() {
    const modal = document.getElementById('teacher-modal');
    if (!modal || modal.dataset.cleaned === 'true') return;
    modal.dataset.cleaned = 'true';
    modal.classList.add('teacher-clean');

    const deleteGrid = modal.querySelector('.voice-delete-grid');
    if (deleteGrid && !modal.querySelector('.teacher-danger')) {
        const wrapper = document.createElement('details');
        wrapper.className = 'teacher-section teacher-danger';
        wrapper.innerHTML = `<summary>Cleanup tools</summary>`;
        deleteGrid.parentNode?.insertBefore(wrapper, deleteGrid);
        wrapper.appendChild(deleteGrid);
    }

    const tools = modal.querySelector('.teacher-tools');
    if (tools) tools.classList.add('teacher-section');
}

function ensureAssessmentControls() {
    const grid = document.querySelector('#teacher-modal .teacher-tools-grid');
    if (!grid) return;
    if (document.getElementById('open-assessment-hub-btn')) return;

    const row = document.createElement('div');
    row.className = 'teacher-row';
    row.innerHTML = `
        <div>
            <strong>Assessments</strong>
            <div class="teacher-subtext">Open literacy, numeracy, SEL/behavior, SLP, and executive-function pathways by role.</div>
        </div>
        <button type="button" id="open-assessment-hub-btn" class="teacher-secondary-btn">Open Assessments Hub</button>
    `;
    grid.appendChild(row);
    row.querySelector('#open-assessment-hub-btn')?.addEventListener('click', () => {
        window.location.href = 'assessments.html';
    });
}

function ensureVoiceQualityHint() {
    const voiceSelect = document.getElementById('system-voice-select');
    if (!voiceSelect) return;
    let hint = document.getElementById('voice-quality-hint');
    if (!hint) {
        hint = document.createElement('div');
        hint.id = 'voice-quality-hint';
        hint.className = 'voice-quality-hint';
        const tip = getVoiceInstallHint();
        hint.innerHTML = `Enhanced voices (may load after first play) <span class="tiny-tooltip" title="${tip}" aria-label="${tip}">ⓘ</span>`;
        voiceSelect.insertAdjacentElement('afterend', hint);
    }
}

function ensureVoiceInstallPrompt() {
    const voiceSelect = document.getElementById('system-voice-select');
    if (!voiceSelect) return null;
    let row = document.getElementById('voice-install-row');
    if (!row) {
        row = document.createElement('div');
        row.id = 'voice-install-row';
        row.className = 'voice-install-row hidden';
        row.innerHTML = `
            <button type="button" id="voice-install-btn">Install better voices</button>
            <span>Boost clarity for phonemes and definitions.</span>
        `;
        voiceSelect.insertAdjacentElement('afterend', row);
    }
    const btn = row.querySelector('#voice-install-btn');
    if (btn && !btn.dataset.bound) {
        btn.dataset.bound = 'true';
        btn.onclick = () => {
            alert(getVoiceInstallHint());
        };
    }
    return row;
}

async function updateVoiceInstallPrompt() {
    const row = ensureVoiceInstallPrompt();
    if (!row) return;
    const voices = await getVoicesForSpeech();
    const dialect = getPreferredEnglishDialect();
    const hasHQ = !!pickBestVoiceForLang(voices, dialect, { requireHighQuality: true }) ||
        (dialect !== 'en' && !!pickBestVoiceForLang(voices, 'en', { requireHighQuality: true }));
    row.classList.toggle('hidden', hasHQ);
}

function ensureEnhancedVoicePrompt() {
    const voiceSelect = document.getElementById('system-voice-select');
    if (!voiceSelect) return null;
    let row = document.getElementById('voice-available-row');
    if (!row) {
        row = document.createElement('div');
        row.id = 'voice-available-row';
        row.className = 'voice-available-row hidden';
        row.innerHTML = `
            <span>Enhanced voice available.</span>
            <button type="button" id="voice-prefetch-btn">Prefetch now</button>
        `;
        voiceSelect.insertAdjacentElement('afterend', row);
    }
    const btn = row.querySelector('#voice-prefetch-btn');
    if (btn && !btn.dataset.bound) {
        btn.dataset.bound = 'true';
        btn.onclick = () => prefetchEnhancedVoice();
    }
    return row;
}

async function updateEnhancedVoicePrompt() {
    const row = ensureEnhancedVoicePrompt();
    if (!row) return;
    const voices = await getVoicesForSpeech();
    const dialect = getPreferredEnglishDialect();
    const hasHQ = !!pickBestVoiceForLang(voices, dialect, { requireHighQuality: true }) ||
        (dialect !== 'en' && !!pickBestVoiceForLang(voices, 'en', { requireHighQuality: true }));
    row.classList.toggle('hidden', !hasHQ);
}

function scheduleEnhancedVoicePrefetch() {
    // Keep Word Quest on Azure-pack playback only.
    // System-voice warmup can produce unexpected voice output during gameplay.
    return;
}

async function prefetchEnhancedVoice() {
    return;
}

function ensureBonusControls() {
    const grid = document.querySelector('#teacher-modal .teacher-tools-grid');
    if (!grid || document.getElementById('bonus-frequency')) return;

    const row = document.createElement('div');
    row.className = 'teacher-row';
    row.innerHTML = `
        <label for="bonus-frequency"><strong>Reveal fun frequency</strong></label>
        <select id="bonus-frequency">
            <option value="off">Off</option>
            <option value="rare">Rare</option>
            <option value="sometimes">Sometimes</option>
            <option value="often">Often</option>
            <option value="always">Always</option>
        </select>
        <label for="audience-mode-select" style="margin-top:8px;"><strong>Language style</strong></label>
        <select id="audience-mode-select">
            <option value="auto">Auto (by learner + language)</option>
            <option value="young-eal">Young / EAL-friendly</option>
            <option value="general">General</option>
        </select>
        <div class="teacher-subtext">Auto defaults to Young/EAL for K-2 learners, EAL pathway, and non-English translation mode.</div>
    `;
    grid.appendChild(row);
}

function ensureAutoHearToggle() {
    const grid = document.querySelector('#teacher-modal .teacher-tools-grid');
    if (!grid) return;
    if (document.getElementById('toggle-auto-hear')) return;

    const row = document.createElement('label');
    row.className = 'toggle-row';
    row.innerHTML = `
        <input type="checkbox" id="toggle-auto-hear" />
        Auto-play word, definition, and sentence
    `;
    grid.appendChild(row);
}

function ensureRevealRecordingToolsToggle() {
    const grid = document.querySelector('#teacher-modal .teacher-tools-grid');
    if (!grid) return;
    if (document.getElementById('toggle-reveal-recorders')) return;

    const row = document.createElement('label');
    row.className = 'toggle-row';
    row.innerHTML = `
        <input type="checkbox" id="toggle-reveal-recorders" />
        Show teacher recording tools on the reveal screen
    `;
    grid.appendChild(row);

    const toggle = row.querySelector('#toggle-reveal-recorders');
    toggle.checked = !!appSettings.showRevealRecordingTools;
    toggle.onchange = () => {
        appSettings.showRevealRecordingTools = toggle.checked;
        saveSettings();
    };
}

function ensureFunHudControls() {
    const grid = document.querySelector('#teacher-modal .teacher-tools-grid');
    if (!grid) return;
    if (document.getElementById('toggle-fun-hud')) return;

    const row = document.createElement('label');
    row.className = 'toggle-row';
    row.innerHTML = `
        <input type="checkbox" id="toggle-fun-hud" />
        Fun mode (coins & hearts)
    `;
    grid.appendChild(row);

    const toggle = row.querySelector('#toggle-fun-hud');
    toggle.checked = !!appSettings.funHud?.enabled;
    toggle.onchange = () => {
        appSettings.funHud.enabled = toggle.checked;
        saveSettings();
        updateFunHudVisibility();
    };

    const sfxRow = document.createElement('label');
    sfxRow.className = 'toggle-row';
    sfxRow.innerHTML = `
        <input type="checkbox" id="toggle-fun-sfx" />
        Tiny reward sounds
    `;
    grid.appendChild(sfxRow);

    const styleRow = document.createElement('label');
    styleRow.className = 'toggle-row select-row';
    styleRow.innerHTML = `
        <span>Fun style</span>
        <select id="fun-style-select">
            <option value="playful">Playful</option>
            <option value="studio">Studio</option>
        </select>
    `;
    grid.appendChild(styleRow);

    const resetRow = document.createElement('div');
    resetRow.className = 'toggle-row inline';
    resetRow.innerHTML = `
        <button type="button" id="reset-fun-hud" class="teacher-secondary-btn">Reset fun counters</button>
    `;
    grid.appendChild(resetRow);

    const sfxToggle = sfxRow.querySelector('#toggle-fun-sfx');
    sfxToggle.checked = !!appSettings.funHud?.sfx;
    sfxToggle.onchange = () => {
        appSettings.funHud.sfx = sfxToggle.checked;
        saveSettings();
    };

    const styleSelect = styleRow.querySelector('#fun-style-select');
    styleSelect.value = appSettings.funHud?.style || 'playful';
    styleSelect.onchange = () => {
        appSettings.funHud.style = styleSelect.value;
        saveSettings();
        updateFunHudVisibility();
    };

    const resetBtn = resetRow.querySelector('#reset-fun-hud');
    resetBtn.onclick = () => {
        appSettings.funHud.coins = 0;
        appSettings.funHud.hearts = appSettings.funHud.maxHearts || 3;
        saveSettings();
        renderFunHud();
        showToast('Fun counters reset.');
    };
}

function ensureGameModesRow() {
    const grid = document.querySelector('#teacher-modal .teacher-tools-grid');
    if (!grid || document.getElementById('open-game-modes-btn')) return;

    const row = document.createElement('div');
    row.className = 'teacher-row';
    row.innerHTML = `
        <div>
            <strong>Game Modes</strong>
            <div class="teacher-subtext">Optional: team turns, timer, and challenge hearts.</div>
        </div>
        <button type="button" id="open-game-modes-btn" class="teacher-secondary-btn">Open</button>
    `;
    grid.appendChild(row);
    row.querySelector('#open-game-modes-btn')?.addEventListener('click', openAdventureModal);
}

function initSoundWallFilters() {
    const filterInputs = document.querySelectorAll('.soundwall-filters input[type="checkbox"][data-section]');
    if (!filterInputs.length) return;

    filterInputs.forEach(input => {
        input.addEventListener('change', () => {
            const section = input.dataset.section;
            if (!section) return;
            appSettings.soundWallSections[section] = input.checked;
            saveSettings();
            applySoundWallSectionVisibility();
        });
    });
}

function isModalOpen() {
    return !modalOverlay.classList.contains("hidden");
}

function getVoiceQualityTier(voice) {
    if (!voice) return 'Unavailable';
    if (isHighQualityVoice(voice)) return 'High quality';
    if (isLowQualityVoice(voice)) return 'Basic';
    return 'Standard';
}

function setVoiceDiagnosticsState({ voice = null, reason = '', dialect = null, qualityMode = null, candidateCount = null } = {}) {
    if (dialect) {
        voiceDiagnosticsState.dialect = dialect;
    } else {
        voiceDiagnosticsState.dialect = getPreferredEnglishDialect();
    }
    if (voice) {
        voiceDiagnosticsState.voiceName = voice.name || voice.voiceURI || 'Unnamed voice';
        voiceDiagnosticsState.voiceLang = voice.lang || '—';
        voiceDiagnosticsState.qualityTier = getVoiceQualityTier(voice);
    } else {
        voiceDiagnosticsState.voiceName = 'Unavailable';
        voiceDiagnosticsState.voiceLang = '—';
        voiceDiagnosticsState.qualityTier = 'Unavailable';
    }
    const mode = qualityMode || getSpeechQualityMode();
    if (mode === 'natural-only') voiceDiagnosticsState.qualityMode = 'Natural only';
    else if (mode === 'fallback-any') voiceDiagnosticsState.qualityMode = 'Allow basic fallback';
    else voiceDiagnosticsState.qualityMode = 'Natural preferred';
    if (reason) {
        voiceDiagnosticsState.fallbackReason = reason;
    }
    if (typeof candidateCount === 'number') {
        voiceDiagnosticsState.candidateCount = candidateCount;
    }
    voiceDiagnosticsState.updatedAt = Date.now();
    renderVoiceDiagnosticsPanel();
}

function renderVoiceDiagnosticsPanel() {
    const nameEl = document.getElementById('voice-diagnostics-name');
    if (!nameEl) return;
    const dialectEl = document.getElementById('voice-diagnostics-dialect');
    const langEl = document.getElementById('voice-diagnostics-lang');
    const qualityEl = document.getElementById('voice-diagnostics-quality');
    const policyEl = document.getElementById('voice-diagnostics-policy');
    const reasonEl = document.getElementById('voice-diagnostics-reason');
    const candidatesEl = document.getElementById('voice-diagnostics-candidates');
    const styleEl = document.getElementById('voice-diagnostics-style');
    const updatedEl = document.getElementById('voice-diagnostics-updated');

    nameEl.textContent = voiceDiagnosticsState.voiceName || 'Unavailable';
    if (dialectEl) dialectEl.textContent = voiceDiagnosticsState.dialect || getPreferredEnglishDialect();
    if (langEl) langEl.textContent = voiceDiagnosticsState.voiceLang || '—';
    if (qualityEl) qualityEl.textContent = voiceDiagnosticsState.qualityTier || 'Unknown';
    if (policyEl) policyEl.textContent = voiceDiagnosticsState.qualityMode || 'Natural preferred';
    if (reasonEl) reasonEl.textContent = voiceDiagnosticsState.fallbackReason || 'No details available.';
    if (candidatesEl) candidatesEl.textContent = String(voiceDiagnosticsState.candidateCount || 0);
    if (styleEl) styleEl.textContent = getNarrationStyle() === 'expressive' ? 'Expressive' : 'Neutral';
    if (updatedEl) {
        updatedEl.textContent = voiceDiagnosticsState.updatedAt
            ? new Date(voiceDiagnosticsState.updatedAt).toLocaleTimeString()
            : '—';
    }
}

function setTtsPackStatus(message = '', tone = 'info') {
    const statusEl = document.getElementById('tts-pack-status');
    if (!statusEl) return;
    const text = String(message || '').trim();
    statusEl.textContent = text || 'Using default voice pack.';
    statusEl.dataset.tone = tone || 'info';
}

function describeTtsPackLanguages(pack) {
    if (!pack || !Array.isArray(pack.languages) || !pack.languages.length) return '';
    return pack.languages.map((lang) => String(lang || '').toUpperCase()).join(', ');
}

function getCurrentWordPackCoverage(manifestEntries = {}, languageCode = 'en') {
    const word = String(currentWord || '').trim().toLowerCase();
    const lang = normalizePackedTtsLanguage(languageCode);
    const fieldKeys = ['word', 'def', 'sentence'];
    const result = {
        hasWord: !!word,
        present: 0,
        total: fieldKeys.length,
        missing: []
    };
    if (!word) return result;
    fieldKeys.forEach((field) => {
        const key = getPackedTtsManifestKey(word, lang, field);
        if (key && manifestEntries[key]) {
            result.present += 1;
        } else {
            result.missing.push(field);
        }
    });
    return result;
}

async function updateTtsPackStatusFromManifest({ pack = null } = {}) {
    const activePack = pack || await resolvePackedTtsManifestInfo();
    const manifest = await loadPackedTtsManifestFromPath(activePack.manifestPath);
    const entries = manifest?.entries || {};
    const summary = summarizePackedTtsEntries(entries);
    const activeLang = normalizePackedTtsLanguage(appSettings?.translation?.lang || 'en');
    const langCount = summary.byLanguage[activeLang] || 0;
    const phonemeCount = summary.byType.phoneme || 0;
    const coverage = getCurrentWordPackCoverage(entries, 'en');

    if (!summary.total) {
        if (activePack.id === 'default') {
            setTtsPackStatus('Default pack has no clips yet. Generate audio to enable premium playback.', 'warn');
        } else {
            setTtsPackStatus(`Pack "${activePack.name}" has no clips yet.`, 'warn');
        }
        return;
    }

    const prefix = activePack.id === 'default'
        ? 'Default pack'
        : `Pack "${activePack.name}"`;
    const coverageText = coverage.hasWord
        ? ` Current word EN coverage: ${coverage.present}/${coverage.total}.`
        : '';
    const phonemeText = phonemeCount ? ` Phoneme clips: ${phonemeCount}.` : '';
    setTtsPackStatus(
        `${prefix}: ${summary.total} clips loaded. ${activeLang.toUpperCase()} clips: ${langCount}.${phonemeText}${coverageText}`,
        'info'
    );
}

async function playTtsPackSampleClip() {
    const audienceCopy = getWordCopyForAudience(currentWord, 'en');
    const sentence = String(audienceCopy.sentence || currentEntry?.en?.sentence || '').trim();
    const definition = String(audienceCopy.definition || currentEntry?.en?.def || '').trim();
    const word = String(currentWord || '').trim();

    let played = false;
    if (sentence) {
        played = await tryPlayPackedTtsForCurrentWord({
            text: sentence,
            languageCode: 'en',
            type: 'sentence'
        });
    }
    if (!played && definition) {
        played = await tryPlayPackedTtsForCurrentWord({
            text: definition,
            languageCode: 'en',
            type: 'def'
        });
    }
    if (!played && word) {
        played = await tryPlayPackedTtsForCurrentWord({
            text: word,
            languageCode: 'en',
            type: 'word'
        });
    }

    if (played) {
        showToast('Voice-pack clip played.');
    } else {
        showToast('No clip found in this pack for the current word yet.');
    }
}

async function populateTtsPackSelect({ forceRefresh = false } = {}) {
    const selectEl = document.getElementById('tts-pack-select');
    if (!selectEl) return;
    try {
        const registry = await loadPackedTtsPackRegistry({ forceRefresh });
        const packs = Array.isArray(registry?.packs) && registry.packs.length
            ? registry.packs
            : [getDefaultTtsPackOption()];
        const selectedPackId = getPreferredTtsPackId();

        selectEl.innerHTML = '';
        packs.forEach((pack) => {
            const option = document.createElement('option');
            option.value = pack.id;
            option.textContent = pack.name || pack.id;
            selectEl.appendChild(option);
        });

        const hasSelected = packs.some((pack) => pack.id === selectedPackId);
        if (hasSelected) {
            selectEl.value = selectedPackId;
        } else {
            const preferredFallbackPackId = packs.some((pack) => pack.id === DEFAULT_SETTINGS.ttsPackId)
                ? DEFAULT_SETTINGS.ttsPackId
                : 'default';
            selectEl.value = preferredFallbackPackId;
            appSettings.ttsPackId = preferredFallbackPackId;
            saveSettings();
        }

        const activePackId = normalizeTtsPackId(selectEl.value || 'default');
        const activePack = packs.find((pack) => pack.id === activePackId) || getDefaultTtsPackOption();
        const languageSummary = describeTtsPackLanguages(activePack);
        const languageText = languageSummary ? ` (${languageSummary})` : '';
        if (activePack.id === 'default') {
            setTtsPackStatus(`Using default voice pack from ${PACKED_TTS_BASE_PATH}.`, 'info');
        } else {
            setTtsPackStatus(`Using pack: ${activePack.name}${languageText}.`, 'info');
        }
        await updateTtsPackStatusFromManifest({ pack: activePack });
    } catch {
        setTtsPackStatus('Could not load pack registry. Falling back to default pack.', 'warn');
    }
}

function setVoiceHealthCheckStatus(message = '', tone = 'info') {
    const el = document.getElementById('voice-health-check-status');
    if (!el) return;
    const text = String(message || '').trim();
    el.textContent = text;
    el.dataset.tone = tone || 'info';
    el.classList.toggle('hidden', !text);
}

function getVoiceHealthSummary(voice, qualityMode) {
    const quality = getVoiceQualityTier(voice);
    if (quality === 'High quality') {
        return { tone: 'pass', message: 'High-quality natural voice is active.' };
    }
    if (qualityMode === 'natural-only') {
        return { tone: 'warn', message: 'Natural-only mode is set, but no enhanced voice is installed yet.' };
    }
    if (quality === 'Basic') {
        return { tone: 'warn', message: 'Basic voice fallback is active; install enhanced voices for better prosody.' };
    }
    return { tone: 'info', message: 'Standard voice is active; enhanced voices will sound more natural.' };
}

async function runVoiceHealthCheck() {
    if (voiceHealthCheckInProgress) {
        showToast('Voice health check is already running.');
        return;
    }
    voiceHealthCheckInProgress = true;
    voiceHealthCheckToken += 1;
    const checkToken = voiceHealthCheckToken;

    try {
        const qualityMode = getSpeechQualityMode();
        setVoiceHealthCheckStatus('Running voice health check…', 'info');
        await refreshVoiceDiagnostics('voice health check');
        const voices = await getVoicesForSpeech();
        const preferred = pickBestEnglishVoice(voices);
        if (!preferred) {
            setVoiceHealthCheckStatus('No English voice is available yet. Install enhanced voices, then refresh.', 'warn');
            showToast('Install enhanced voices, then run Voice Health Check again.');
            voiceHealthCheckInProgress = false;
            return;
        }

        const summary = getVoiceHealthSummary(preferred, qualityMode);
        const voiceName = preferred.name || preferred.voiceURI || 'Selected voice';
        setVoiceHealthCheckStatus(`${voiceName}: ${summary.message} Playing test lines…`, 'info');

        cancelPendingSpeech(true);
        const fallbackLang = preferred.lang || getPreferredEnglishDialect();
        const samples = [
            { text: 'Phoneme sample: mmm, as in moon.', type: 'phoneme' },
            { text: 'Word sample: bright.', type: 'word' },
            { text: 'Sentence sample: You found the clue, laughed at the joke, and read with expression.', type: 'sentence' }
        ];

        let delay = 90;
        samples.forEach((sample) => {
            setTimeout(() => {
                if (checkToken !== voiceHealthCheckToken) return;
                speakEnglishText(sample.text, sample.type, preferred, fallbackLang);
            }, delay);
            delay += estimateSpeechDuration(sample.text, getSpeechRate(sample.type)) + 260;
        });

        setTimeout(() => {
            if (checkToken !== voiceHealthCheckToken) return;
            setVoiceHealthCheckStatus(`${voiceName}: ${summary.message}`, summary.tone);
            voiceHealthCheckInProgress = false;
        }, delay + 120);
    } catch (error) {
        console.warn('Voice health check failed', error);
        setVoiceHealthCheckStatus('Voice health check failed. Refresh diagnostics and try again.', 'warn');
        voiceHealthCheckInProgress = false;
    }
}

async function refreshVoiceDiagnostics(source = 'refresh') {
    const qualityMode = getSpeechQualityMode();
    if (!('speechSynthesis' in window)) {
        setVoiceDiagnosticsState({
            voice: null,
            reason: 'Speech synthesis is not supported in this browser.',
            dialect: getPreferredEnglishDialect(),
            qualityMode,
            candidateCount: 0
        });
        return;
    }
    const voices = await getVoicesForSpeech();
    const preferred = pickBestEnglishVoice(voices);
    if (!preferred) {
        setVoiceDiagnosticsState({
            voice: null,
            reason: qualityMode === 'natural-only'
                ? `No enhanced English voice available (${source}).`
                : `No English voice available (${source}).`,
            dialect: getPreferredEnglishDialect(),
            qualityMode,
            candidateCount: Array.isArray(voices) ? voices.length : 0
        });
    }
    renderVoiceDiagnosticsPanel();
    updateVoiceInstallPrompt();
    updateEnhancedVoicePrompt();
}

function ensureVoicePreferencesControls() {
    const grid = document.querySelector('#teacher-modal .teacher-tools-grid');
    if (!grid || document.getElementById('system-voice-select')) return;

    const row = document.createElement('div');
    row.className = 'teacher-row teacher-voice-row';
    row.id = 'teacher-voice-preferences-row';
    row.innerHTML = `
        <label for="system-voice-select"><strong>Narration voice</strong></label>
        <select id="system-voice-select" aria-label="Narration voice dialect">
            <option value="en-US">American English</option>
            <option value="en-GB">British English</option>
        </select>
        <div class="slider-row">
            <label for="speech-rate"><strong>Base speech rate</strong></label>
            <div style="display:flex; gap:10px; align-items:center;">
                <input id="speech-rate" type="range" min="0.7" max="1.05" step="0.01" />
                <span id="speech-rate-value">0.95x</span>
            </div>
        </div>
        <label for="narration-style-select"><strong>Narration style</strong></label>
        <select id="narration-style-select" aria-label="Narration style">
            <option value="expressive">Expressive (recommended)</option>
            <option value="neutral">Neutral</option>
        </select>
        <label for="speech-quality-select"><strong>Voice quality</strong></label>
        <select id="speech-quality-select" aria-label="Voice quality mode">
            <option value="natural-preferred">Natural preferred (recommended)</option>
            <option value="natural-only">Natural only</option>
            <option value="fallback-any">Allow basic fallback</option>
        </select>
        <label for="tts-pack-select"><strong>Audio voice pack</strong></label>
        <div class="voice-pack-controls">
            <select id="tts-pack-select" aria-label="Audio voice pack">
                <option value="default">Default voice pack</option>
            </select>
            <button type="button" id="tts-pack-refresh-btn" class="teacher-secondary-btn">Refresh packs</button>
            <button type="button" id="tts-pack-sample-btn" class="teacher-secondary-btn">Play pack sample</button>
        </div>
        <div id="tts-pack-status" class="teacher-subtext">Using default voice pack.</div>
        <div class="teacher-subtext">Natural-only blocks robotic fallback voices but requires enhanced system voices.</div>
        <div class="teacher-subtext">Expressive style adds punctuation-aware pacing and intonation for sentence reading.</div>
    `;
    grid.appendChild(row);
}

function ensureVoiceDiagnosticsPanel() {
    const grid = document.querySelector('#teacher-modal .teacher-tools-grid');
    if (!grid || document.getElementById('voice-diagnostics-panel')) return;

    const row = document.createElement('div');
    row.className = 'teacher-row voice-diagnostics-row';
    row.id = 'voice-diagnostics-row';
    row.innerHTML = `
        <label><strong>Voice diagnostics</strong></label>
        <div id="voice-diagnostics-panel" class="voice-diagnostics-panel">
            <div><strong>Selected voice:</strong> <span id="voice-diagnostics-name">Not resolved yet</span></div>
            <div><strong>Preferred dialect:</strong> <span id="voice-diagnostics-dialect">en-US</span></div>
            <div><strong>Voice language:</strong> <span id="voice-diagnostics-lang">—</span></div>
            <div><strong>Quality tier:</strong> <span id="voice-diagnostics-quality">Unknown</span></div>
            <div><strong>Quality policy:</strong> <span id="voice-diagnostics-policy">Natural preferred</span></div>
            <div><strong>Candidates loaded:</strong> <span id="voice-diagnostics-candidates">0</span></div>
            <div><strong>Narration style:</strong> <span id="voice-diagnostics-style">Expressive</span></div>
            <div><strong>Fallback reason:</strong> <span id="voice-diagnostics-reason">Waiting for voice data.</span></div>
            <div><strong>Last updated:</strong> <span id="voice-diagnostics-updated">—</span></div>
        </div>
        <div class="toggle-row inline voice-diagnostics-actions">
            <button type="button" id="voice-diagnostics-refresh" class="teacher-secondary-btn">Refresh diagnostics</button>
            <button type="button" id="voice-diagnostics-sample" class="teacher-secondary-btn">Play sample</button>
            <button type="button" id="voice-health-check-btn" class="teacher-secondary-btn">Voice health check</button>
        </div>
        <div id="voice-health-check-status" class="voice-health-check-status hidden" aria-live="polite"></div>
        <div class="teacher-subtext">Use this to verify which system voice is active before class.</div>
    `;
    grid.appendChild(row);
}

/* --- AUTO-ADJUST WORD LENGTH BASED ON PATTERN --- */
const PATTERN_LENGTH_RULES = {
    cvc: { preferred: '3', valid: [3] },
    cvce: { preferred: '4', valid: [4, 5] },
    ccvc: { preferred: '4', valid: [4, 5] },
    cvcc: { preferred: '4', valid: [4, 5] }
};

function buildPatternLengthCache() {
    if (!window.WORD_ENTRIES) return null;
    const cache = { all: new Set() };
    Object.keys(window.WORD_ENTRIES).forEach(word => {
        const entry = window.WORD_ENTRIES[word];
        const len = word.length;
        cache.all.add(len);
        if (entry && Array.isArray(entry.tags)) {
            entry.tags.forEach(tag => {
                if (!cache[tag]) cache[tag] = new Set();
                cache[tag].add(len);
            });
        }
    });
    patternLengthCache = {};
    Object.keys(cache).forEach(key => {
        patternLengthCache[key] = Array.from(cache[key]).sort((a, b) => a - b);
    });
    return patternLengthCache;
}

function getPatternLengths(pattern) {
    if (!patternLengthCache) buildPatternLengthCache();
    const key = pattern || 'all';
    if (patternLengthCache && patternLengthCache[key] && patternLengthCache[key].length) {
        return patternLengthCache[key];
    }
    if (patternLengthCache && patternLengthCache.all && patternLengthCache.all.length) {
        return patternLengthCache.all;
    }
    const fallback = PATTERN_LENGTH_RULES[key]?.valid;
    return fallback && fallback.length ? fallback.slice() : [5];
}

function pickDefaultLength(lengths) {
    if (!lengths || !lengths.length) return 5;
    if (lengths.includes(5)) return 5;
    const underFive = lengths.filter(l => l < 5);
    if (underFive.length) return Math.max(...underFive);
    return lengths[0];
}

function normalizeLengthOptions(lengthSelect) {
    if (!lengthSelect) return;
    const options = Array.from(lengthSelect.options);
    const hasFive = options.some(opt => opt.value === '5');
    const toRemove = [];

    options.forEach(opt => {
        if (opt.value === 'traditional') {
            if (hasFive) {
                toRemove.push(opt);
            } else {
                opt.value = '5';
                opt.textContent = '5';
            }
        }
        if (opt.value === '5') {
            opt.textContent = '5';
        }
    });

    toRemove.forEach(opt => opt.remove());
}

function syncLengthOptionsToPattern(setDefault = false) {
    const patternSelect = document.getElementById("pattern-select");
    const lengthSelect = document.getElementById("length-select");
    if (!patternSelect || !lengthSelect) return;

    normalizeLengthOptions(lengthSelect);

    const pattern = patternSelect.value || 'all';
    const lengths = getPatternLengths(pattern);
    const allowed = new Set(lengths.map(len => String(len)));

    Array.from(lengthSelect.options).forEach(opt => {
        if (opt.value === 'any') {
            opt.disabled = false;
            opt.hidden = false;
            return;
        }
        if (!allowed.size) {
            opt.disabled = false;
            opt.hidden = false;
            return;
        }
        const enabled = allowed.has(opt.value);
        opt.disabled = !enabled;
        opt.hidden = !enabled;
    });

    const selectedOpt = lengthSelect.options[lengthSelect.selectedIndex];
    if (setDefault || (selectedOpt && selectedOpt.disabled)) {
        const defaultLen = pickDefaultLength(lengths);
        const defaultValue = String(defaultLen);
        const defaultOption = Array.from(lengthSelect.options).find(opt => opt.value === defaultValue && !opt.disabled);
        if (defaultOption) {
            lengthSelect.value = defaultValue;
        } else {
            const anyOption = lengthSelect.querySelector('option[value="any"]');
            if (anyOption) lengthSelect.value = 'any';
        }
    }
}

function autoAdjustLength() {
    syncLengthOptionsToPattern(true);
}

function updatePatternLengthCompatibility() {
    syncLengthOptionsToPattern(false);
}

/* --- STUDIO LOGIC --- */
let studioList = [];
let studioIndex = 0;
let mediaRecorder = null;
let audioChunks = [];
let recordingType = ""; // Track what we are recording
let studioStream = null;

function releaseStudioStream() {
    if (!studioStream) return;
    try {
        studioStream.getTracks().forEach(track => {
            try { track.stop(); } catch (e) {}
        });
    } finally {
        studioStream = null;
    }
}

function initStudio() {
    document.getElementById("studio-source-select").onchange = (e) => {
        const pasteArea = document.getElementById("studio-paste-area");
        pasteArea.classList.toggle("hidden", e.target.value !== "paste");
    };

    document.getElementById("start-studio-btn").onclick = startStudioSession;
    document.getElementById("exit-studio-btn").onclick = closeModal;
    
    document.getElementById("record-word-btn").onclick = () => toggleRecording("word");
    document.getElementById("record-sentence-btn").onclick = () => toggleRecording("sentence");
    
    document.getElementById("play-word-preview").onclick = () => playPreview("word");
    document.getElementById("play-sentence-preview").onclick = () => playPreview("sentence");
    
    document.getElementById("next-item-btn").onclick = nextStudioItem;
    document.getElementById("prev-item-btn").onclick = prevStudioItem;
    document.getElementById("skip-item-btn").onclick = skipStudioItem;
}

function openStudioSetup() {
    teacherModal.classList.add("hidden");
    studioModal.classList.remove("hidden");
    document.getElementById("studio-setup-view").classList.remove("hidden");
    document.getElementById("studio-record-view").classList.add("hidden");
}

async function startStudioSession() {
    const source = document.getElementById("studio-source-select").value;
    const skipExisting = document.getElementById("studio-skip-existing").checked;
    
    // Safety check
    if (!window.WORD_ENTRIES) {
        alert("Word database not loaded yet. Please wait and try again.");
        return;
    }
    
    let rawList = [];

    if (source === "focus") {
        const pattern = document.getElementById("pattern-select").value;
        const allWords = Object.keys(window.WORD_ENTRIES);
        rawList = allWords.filter(w => {
            const e = window.WORD_ENTRIES[w];
            return pattern === 'all' || (e.tags && e.tags.includes(pattern));
        });
    } else {
        const text = document.getElementById("studio-paste-input").value;
        rawList = text.split(/\r?\n/).map(s => s.trim().toLowerCase()).filter(s => s && /^[a-z]+$/.test(s));
    }

    if (rawList.length === 0) {
        alert("No words found. Please check your selection or pasted list.");
        return;
    }

    studioList = [];
    for (let w of rawList) {
        const entry = window.WORD_ENTRIES[w];
        let sentence = `The word is ${w}.`; // fallback
        
        // Extract sentence from multilingual data structure
        if (entry) {
            if (entry.en && entry.en.sentence) {
                sentence = entry.en.sentence;
            } else if (entry.sentence) {
                sentence = entry.sentence;
            }
        }
        
        if (skipExisting) {
            const hasWord = await getAudioFromDB(`${w}_word`);
            const hasSent = await getAudioFromDB(`${w}_sentence`);
            if (hasWord && hasSent) continue; 
        }
        
        studioList.push({ 
            word: w, 
            sentence: sentence,
            definition: entry?.en?.def || entry?.def || `Definition for ${w}`,
            entry: entry
        });
    }

    if (studioList.length === 0) {
        alert("All selected words already have recordings! Try unchecking 'Skip existing' or choose different words.");
        return;
    }

    studioIndex = 0;
    document.getElementById("studio-setup-view").classList.add("hidden");
    document.getElementById("studio-record-view").classList.remove("hidden");
    loadStudioItem();
}

function loadStudioItem() {
    if (studioIndex >= studioList.length) {
        showStudioCompletionModal();
        return;
    }

    const item = studioList[studioIndex];
    const progressElement = document.getElementById("studio-progress");
    const definitionElement = document.getElementById("studio-definition-display");
    
    // Enhanced progress display
    const progressText = `Word ${studioIndex + 1} of ${studioList.length}`;
    const percentComplete = Math.round(((studioIndex) / studioList.length) * 100);
    progressElement.innerHTML = `<strong>${progressText}</strong> • ${percentComplete}% Complete`;
    
    // Populate word data
    document.getElementById("studio-word-display").textContent = item.word.toUpperCase();
    document.getElementById("studio-sentence-display").value = item.sentence || "";
    
    // Show definition
    if (definitionElement) {
        definitionElement.textContent = item.definition || "No definition available";
    }

    resetRecordButtons();
    updateNavigationButtons();
    
    // Auto-scroll to top of recording area
    const recordView = document.getElementById("studio-record-view");
    if (recordView) {
        recordView.scrollTop = 0;
    }
}

function showStudioCompletionModal() {
    const totalWords = studioList.length;
    const wordsRecorded = studioIndex;
    
    const message = `🎉 Recording Session Complete!\n\n` +
                   `✅ ${totalWords} words processed\n` +
                   `🎙️ Recordings saved to device\n\n` +
                   `Your custom recordings will now be used when students play with these words. ` +
                   `The app will automatically prefer your recordings over computer-generated speech.`;
    
    alert(message);
    closeModal();
}

function resetRecordButtons() {
    const wordBtn = document.getElementById("record-word-btn");
    const sentBtn = document.getElementById("record-sentence-btn");
    const playW = document.getElementById("play-word-preview");
    const playS = document.getElementById("play-sentence-preview");

    // Reset button states
    wordBtn.innerHTML = "🎤 Record Word";
    wordBtn.classList.remove("recording");
    wordBtn.style.background = "#dc2626";
    
    sentBtn.innerHTML = "🎤 Record Sentence";
    sentBtn.classList.remove("recording");
    sentBtn.style.background = "#dc2626";
    
    // Reset play buttons
    playW.disabled = true;
    playW.style.background = "#e5e7eb";
    playW.style.color = "#9ca3af";
    
    playS.disabled = true;
    playS.style.background = "#e5e7eb";
    playS.style.color = "#9ca3af";

    // Check for existing recordings and update play button states
    const w = studioList[studioIndex].word;
    getAudioFromDB(`${w}_word`).then(blob => { 
        if(blob) {
            playW.disabled = false;
            playW.style.background = "#10b981";
            playW.style.color = "white";
            wordBtn.innerHTML = "✅ Re-record Word";
            wordBtn.style.background = "#059669";
        }
    });
    
    getAudioFromDB(`${w}_sentence`).then(blob => { 
        if(blob) {
            playS.disabled = false;
            playS.style.background = "#10b981";
            playS.style.color = "white";
            sentBtn.innerHTML = "✅ Re-record Sentence";
            sentBtn.style.background = "#059669";
        }
    });
}

function toggleRecording(type) {
    if (mediaRecorder && mediaRecorder.state === "recording") {
        mediaRecorder.stop();
        return;
    }

    // Ensure we don't leave the mic open between recordings.
    releaseStudioStream();

    navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
        studioStream = stream;
        // FIX: iOS/Safari Mime Check
        let mimeType = "audio/webm";
        if (MediaRecorder.isTypeSupported("audio/mp4")) {
            mimeType = "audio/mp4";
        } else if (MediaRecorder.isTypeSupported("audio/webm;codecs=opus")) {
            mimeType = "audio/webm;codecs=opus";
        }

        mediaRecorder = new MediaRecorder(stream, { mimeType });
        audioChunks = [];
        recordingType = type; // Track what we are recording

        mediaRecorder.ondataavailable = event => audioChunks.push(event.data);
        
        mediaRecorder.onstop = () => {
            const blob = new Blob(audioChunks, { type: mimeType });
            const word = studioList[studioIndex].word;
            const key = type === "word" ? `${word}_word` : `${word}_sentence`;
            
            saveAudioToDB(key, blob);

            // Stop the mic immediately after we have the blob.
            releaseStudioStream();
            
            const btn = document.getElementById(type === "word" ? "record-word-btn" : "record-sentence-btn");
            const playBtn = document.getElementById(type === "word" ? "play-word-preview" : "play-sentence-preview");
            
            // Update button to show successful recording
            btn.innerHTML = type === "word" ? "✅ Re-record Word" : "✅ Re-record Sentence";
            btn.classList.remove("recording");
            btn.style.background = "#059669";
            
            // Enable and style the play button
            playBtn.disabled = false;
            playBtn.style.background = "#10b981";
            playBtn.style.color = "white";

            // Show success message
            const statusElement = document.getElementById("recording-status");
            statusElement.style.display = "block";
            statusElement.style.background = "#d1fae5";
            statusElement.style.color = "#065f46";
            statusElement.innerHTML = `🎉 ${type === "word" ? "Word" : "Sentence"} recording saved!`;
            
            setTimeout(() => {
                statusElement.style.display = "none";
                
                // CRITICAL FIX: Only auto-advance if we just finished the SENTENCE.
                // This ensures the user stays on the card after recording the Word.
                if (document.getElementById("studio-auto-advance").checked && recordingType === 'sentence') {
                    setTimeout(nextStudioItem, 500);
                }
            }, 2000);
        };

        mediaRecorder.start();
        
        const btn = document.getElementById(type === "word" ? "record-word-btn" : "record-sentence-btn");
        const statusElement = document.getElementById("recording-status");
        
        // Update button for recording state
        btn.innerHTML = "🔴 Stop Recording";
        btn.classList.add("recording");
        btn.style.background = "#ef4444";
        
        // Show recording status
        statusElement.style.display = "block";
        statusElement.style.background = "#fee2e2";
        statusElement.style.color = "#dc2626";
        statusElement.innerHTML = `🔴 Recording ${type === "word" ? "word" : "sentence"}... Click button to stop.`;

    }).catch(err => {
        console.error("Mic Error:", err);
        alert("Could not access microphone. Please check permissions and try again.");
    });
}

async function playPreview(type) {
    const word = studioList[studioIndex].word;
    const key = type === "word" ? `${word}_word` : `${word}_sentence`;
    const blob = await getAudioFromDB(key);
    if (blob) {
        const audio = new Audio(URL.createObjectURL(blob));
        audio.play();
    }
}

function nextStudioItem() {
    studioIndex++;
    loadStudioItem();
}

function prevStudioItem() {
    if (studioIndex > 0) {
        studioIndex--;
        loadStudioItem();
    }
    updateNavigationButtons();
}

function skipStudioItem() {
    const confirmSkip = confirm(`Skip recording "${studioList[studioIndex].word}"?\n\nYou can come back to it later by using the Previous button.`);
    if (confirmSkip) {
        nextStudioItem();
    }
}

function updateNavigationButtons() {
    const prevBtn = document.getElementById("prev-item-btn");
    const nextBtn = document.getElementById("next-item-btn");
    
    if (prevBtn) {
        prevBtn.disabled = studioIndex === 0;
        prevBtn.style.opacity = studioIndex === 0 ? "0.5" : "1";
    }
    
    if (nextBtn) {
        const isLast = studioIndex >= studioList.length - 1;
        nextBtn.innerHTML = isLast ? "🏁 Finish Session" : "Next Word →";
    }
}

/* --- GAME LOGIC --- */
function startNewGame(customWord = null) {
    // Safety check: ensure board element exists
    if (!board) {
        console.error("Game board element not found! Cannot start game.");
        board = document.getElementById("game-board");
        if (!board) {
            console.error("Still cannot find #game-board element!");
            return;
        }
    }
    
    gameOver = false;
    guesses = [];
    currentGuess = "";
    previousGuessRenderLength = 0;
    CURRENT_MAX_GUESSES = normalizeGuessCount(appSettings.guessCount ?? DEFAULT_SETTINGS.guessCount);
    board.innerHTML = "";
    clearKeyboardColors();
    clearPracticeGroup('word:');
    clearPracticeGroup('sentence:');
    
    if (customWord) {
        currentWord = customWord.toLowerCase();
        if (isBlockedClassSafeWord(currentWord)) {
            showToast("That word is blocked by the class-safe filter.");
            return startNewGame(null);
        }
        CURRENT_WORD_LENGTH = currentWord.length;
        isCustomWordRound = true;
        activeRoundPattern = 'all';
        customWordInLibrary = !!window.WORD_ENTRIES?.[currentWord];
        currentEntry = window.WORD_ENTRIES[currentWord] || {
            def: "",
            sentence: "",
            syllables: currentWord
        };
    } else {
        const data = getWordFromDictionary();
        currentWord = data.word;
        currentEntry = data.entry;
        CURRENT_WORD_LENGTH = currentWord.length;
        isCustomWordRound = false;
        customWordInLibrary = true;
        setQuickCustomWordStatus(WORD_SOURCE_LIBRARY_STATUS, false, false);
    }
    updateFocusPanel();

    isFirstLoad = false;
    board.style.setProperty("--word-length", CURRENT_WORD_LENGTH);
    board.style.setProperty("--max-guesses", CURRENT_MAX_GUESSES);
    for (let i = 0; i < CURRENT_MAX_GUESSES * CURRENT_WORD_LENGTH; i++) {
        const tile = document.createElement("div");
        tile.className = "tile";
        tile.id = `tile-${i}`;
        board.appendChild(tile);
    }

    // Highlight the first row immediately so the board feels "ready" even before typing.
    updateGrid();
    
    console.log(`✓ Game started: word="${currentWord}" (${CURRENT_WORD_LENGTH} letters)`);
    updateWordQuestAudioAvailabilityNotice();
    
    // Update adaptive actions for new word
    if (typeof updateAdaptiveActions === 'function') {
        updateAdaptiveActions();
    }

    resetLightningTimer();
    renderFunHud();

    // Re-evaluate stage sizing after board and keyboard are rebuilt.
    requestAnimationFrame(() => {
        updateFitScreenMode();
    });
}

function getWordFromDictionary() {
    const pattern = document.getElementById("pattern-select").value;
    const lenVal = document.getElementById("length-select").value;
    
    // Safety check: ensure word database is loaded
    if (!window.WORD_ENTRIES) {
        console.error("Word database not loaded yet");
        return { word: "plant", entry: { def: "Loading...", sentence: "Please wait.", syllables: "plant", tags: [] } };
    }
    
    let targetLen = null;
    if (lenVal === 'any') {
        targetLen = null;
    } else if (lenVal === 'traditional' || lenVal === '5') {
        targetLen = 5;
    } else {
        const parsed = parseInt(lenVal, 10);
        targetLen = Number.isFinite(parsed) ? parsed : null;
    }

    const allWords = Object.keys(window.WORD_ENTRIES);
    const getFocusTitle = (focusKey = 'all') => {
        if (!focusKey || focusKey === 'all') return 'Any Focus';
        return window.FOCUS_INFO?.[focusKey]?.title || focusKey;
    };
    if (!teacherWordList.length) {
        teacherWordList = readTeacherWordList();
    }
    teacherWordListEnabled = readTeacherWordListEnabled() && teacherWordList.length > 0;

    const getPool = ({ focus = 'all', length = targetLen } = {}) => {
        const curriculumWords = CURRICULUM_FOCUS_LISTS[focus];
        if (Array.isArray(curriculumWords)) {
            const basePool = curriculumWords
                .map((word) => normalizeCustomWordInput(word))
                .filter((word) => !!window.WORD_ENTRIES?.[word]);
            return basePool.filter((word) => {
                if (/[^a-z]/i.test(word)) return false;
                if (isBlockedClassSafeWord(word)) return false;
                return !length || word.length === length;
            });
        }

        const blockedWords = focus === 'all' ? null : FOCUS_TAG_EXCLUSIONS[focus];
        return allWords.filter((word) => {
            if (/[^a-z]/i.test(word)) return false;
            const entry = window.WORD_ENTRIES[word] || {};
            const lenMatch = !length || word.length === length;
            const focusMatch = focus === 'all' || (Array.isArray(entry.tags) && entry.tags.includes(focus));
            if (!lenMatch || !focusMatch) return false;
            if (isBlockedClassSafeWord(word)) return false;
            if (focus === 'schwa') {
                const syllableCount = Number(entry?.phonics?.syllables || 0);
                if (syllableCount > 0 && syllableCount < 2) return false;
                if (!syllableCount && String(word || '').length < 5) return false;
            }
            if (blockedWords && blockedWords.has(String(word || '').toLowerCase())) return false;
            return true;
        });
    };

    if (teacherWordListEnabled && teacherWordList.length) {
        const teacherBasePool = teacherWordList.filter((word) => !isBlockedClassSafeWord(word));
        let teacherPool = teacherBasePool.filter((word) => !targetLen || word.length === targetLen);
        if (!teacherPool.length) teacherPool = teacherBasePool.slice();

        if (pattern !== 'all' && pattern !== 'shuffle') {
            const patternFiltered = teacherPool.filter((word) => {
                const entry = window.WORD_ENTRIES[word] || {};
                if (Array.isArray(CURRICULUM_FOCUS_LISTS[pattern])) {
                    return CURRICULUM_FOCUS_LISTS[pattern].includes(word);
                }
                return Array.isArray(entry.tags) && entry.tags.includes(pattern);
            });
            if (patternFiltered.length) {
                teacherPool = patternFiltered;
            } else {
                activeRoundFallbackNote = `No teacher-list words match ${getFocusTitle(pattern)}; using full teacher list.`;
            }
        }

        if (!teacherPool.length) {
            teacherPool = allWords.filter((word) => !isBlockedClassSafeWord(word));
        }

        const selected = getNonRepeatingShuffleChoice(
            teacherPool,
            `teacher-list:${pattern || 'all'}:${targetLen || 'any'}:${getResolvedAudienceMode()}`
        ) || teacherPool[Math.floor(Math.random() * teacherPool.length)] || 'plant';
        const selectedEntry = window.WORD_ENTRIES[selected] || {
            def: 'Teacher-selected challenge word.',
            sentence: '',
            syllables: selected,
            tags: []
        };
        activeRoundPattern = pattern === 'shuffle' ? 'all' : pattern;
        return { word: selected, entry: selectedEntry };
    }

    const selectableFocuses = Array.from(new Set(allWords.flatMap((word) => {
        const tags = window.WORD_ENTRIES[word]?.tags;
        return Array.isArray(tags) ? tags : [];
    }))).filter((tag) => tag && tag !== 'all' && tag !== 'shuffle');

    let effectivePattern = pattern;
    let forcedWord = '';
    let shuffleUsesAnyLength = false;
    activeRoundFallbackNote = '';
    if (pattern === 'shuffle') {
        const focusCandidates = selectableFocuses.filter((tag) => getPool({ focus: tag }).length > 0);
        let shuffleCandidates = focusCandidates.slice();
        if (getResolvedAudienceMode() === 'young-eal') {
            shuffleCandidates = shuffleCandidates.filter((tag) => !SHUFFLE_FOCUS_AVOID_FOR_YOUNG.has(tag));
            if (!shuffleCandidates.length) {
                shuffleCandidates = focusCandidates.slice();
            }
        }
        const orderedCandidates = [
            ...SHUFFLE_FOCUS_PRIORITY.filter((tag) => shuffleCandidates.includes(tag)),
            ...shuffleCandidates.filter((tag) => !SHUFFLE_FOCUS_PRIORITY.includes(tag))
        ];
        if (orderedCandidates.length) {
            const lengthMatched = orderedCandidates.filter((tag) => getPool({ focus: tag, length: targetLen }).length > 0);
            const source = lengthMatched.length ? lengthMatched : orderedCandidates;
            const shuffleLength = lengthMatched.length ? targetLen : null;
            shuffleUsesAnyLength = Number.isFinite(targetLen) && shuffleLength === null;
            const mergedPool = Array.from(new Set(source.flatMap((tag) => getPool({ focus: tag, length: shuffleLength }))));
            forcedWord = getNonRepeatingShuffleChoice(
                mergedPool,
                `word:shuffle:${targetLen || 'any'}:${getResolvedAudienceMode()}`
            ) || '';

            if (forcedWord) {
                const tags = Array.isArray(window.WORD_ENTRIES?.[forcedWord]?.tags)
                    ? window.WORD_ENTRIES[forcedWord].tags
                    : [];
                effectivePattern = source.find((tag) => tags.includes(tag))
                    || orderedCandidates.find((tag) => tags.includes(tag))
                    || 'all';
            } else {
                effectivePattern = getNonRepeatingShuffleChoice(
                    source,
                    `focus:${targetLen || 'any'}:${getResolvedAudienceMode()}`
                ) || source[Math.floor(Math.random() * source.length)];
            }
        } else {
            effectivePattern = 'all';
        }
    }

    let pool = getPool({ focus: effectivePattern, length: targetLen });
    if (!pool.length && effectivePattern !== 'all') {
        pool = getPool({ focus: effectivePattern, length: null });
        if (pool.length && Number.isFinite(targetLen)) {
            activeRoundFallbackNote = `No ${getFocusTitle(effectivePattern)} words at length ${targetLen}; this round uses any length.`;
        }
    }
    if (!pool.length) {
        if (effectivePattern !== 'all') {
            activeRoundFallbackNote = `No ${getFocusTitle(effectivePattern)} words available right now; this round uses Any Focus.`;
        }
        effectivePattern = 'all';
        pool = getPool({ focus: 'all', length: targetLen });
    }
    if (!pool.length) {
        pool = getPool({ focus: 'all', length: null });
    }

    if (!activeRoundFallbackNote && pattern === 'shuffle' && shuffleUsesAnyLength) {
        activeRoundFallbackNote = `No shuffle words at length ${targetLen}; this round uses any length.`;
    }

    activeRoundPattern = effectivePattern;
    const safeFallbackWord = allWords.find((word) => !isBlockedClassSafeWord(word)) || 'plant';
    const final = (forcedWord && pool.includes(forcedWord) ? forcedWord : '')
        || getNonRepeatingShuffleChoice(
            pool,
            `word:${effectivePattern || 'all'}:${targetLen || 'any'}:${getResolvedAudienceMode()}`
        ) || pool[Math.floor(Math.random() * pool.length)] || safeFallbackWord;
    const finalEntry = window.WORD_ENTRIES[final] || { def: '', sentence: '', syllables: final, tags: [] };
    return { word: final, entry: finalEntry };
}

function updateFocusPanel() {
    const sel = document.getElementById("pattern-select");
    const selectedPattern = sel ? sel.value : "all";
    const selectedInfo = window.FOCUS_INFO?.[selectedPattern] || window.FOCUS_INFO?.all || {};
    let pat = selectedPattern === 'shuffle'
        ? (activeRoundPattern && activeRoundPattern !== 'all' ? activeRoundPattern : 'all')
        : selectedPattern;
    const usesFallback = selectedPattern !== 'shuffle' && selectedPattern !== 'all' && activeRoundPattern && activeRoundPattern !== selectedPattern;
    if (usesFallback) {
        pat = activeRoundPattern;
    }

    // Safety check: ensure FOCUS_INFO is loaded
    if (!window.FOCUS_INFO) {
        console.error("FOCUS_INFO not loaded yet");
        return;
    }

    const info = window.FOCUS_INFO[pat] || window.FOCUS_INFO.all || {
        title: "Practice",
        desc: "General Review",
        examples: ""
    };
    const displayTitle = selectedPattern === 'shuffle'
        ? `Shuffle focus: ${info.title || 'Mixed Review'}`
        : usesFallback
            ? `Requested: ${selectedInfo.title || selectedPattern} (using ${info.title || 'Any Focus'})`
            : (info.title || '');
    const displayDesc = selectedPattern === 'shuffle'
        ? `Random clue for this round. ${info.desc || ''}`.trim()
        : usesFallback
            ? (activeRoundFallbackNote || info.desc || '')
            : (info.desc || "");

    const focusRoundChip = document.getElementById('focus-round-chip');
    if (focusRoundChip) {
        if (selectedPattern === 'all') {
            focusRoundChip.textContent = 'Hint: Any focus';
        } else if (selectedPattern === 'shuffle') {
            focusRoundChip.textContent = `Hint: ${info.title || 'Mixed review'}`;
        } else if (usesFallback) {
            const note = activeRoundFallbackNote ? ` · ${activeRoundFallbackNote}` : '';
            focusRoundChip.textContent = `Hint: ${info.title || 'Any focus'}${note}`;
        } else {
            focusRoundChip.textContent = `Hint: ${info.title || selectedPattern}`;
        }
        focusRoundChip.classList.toggle('is-hidden', readRoundClueVisibilityMode() !== 'on');
    }

    // Support both older + newer DOM ids
    const titleEl = document.getElementById("focus-title") || document.getElementById("simple-focus-title");
    const descEl = document.getElementById("focus-desc") || document.getElementById("simple-focus-desc");
    const examplesEl = document.getElementById("focus-examples") || document.getElementById("simple-focus-examples");

    if (titleEl) titleEl.textContent = displayTitle;
    if (descEl) descEl.textContent = displayDesc;

    if (examplesEl) {
        if (info.examples) {
            examplesEl.textContent = `Try words like: ${info.examples}`;
            examplesEl.classList.remove("hidden");
        } else {
            examplesEl.textContent = "";
            examplesEl.classList.add("hidden");
        }
    }

    // Quick tiles row is optional; never crash if missing
    const quickRow = document.getElementById("quick-tiles-row");
    if (quickRow) {
        if (pat !== "all" && info.quick && Array.isArray(info.quick) && info.quick.length) {
            quickRow.innerHTML = "";
            info.quick.forEach(q => {
                const b = document.createElement("button");
                b.className = "q-tile";
                b.type = "button";
                b.textContent = q;
                b.onclick = () => {
                    for (let c of q) handleInput(c);
                    b.blur();
                };
                quickRow.appendChild(b);
            });
            quickRow.classList.remove("hidden");
        } else {
            quickRow.classList.add("hidden");
            quickRow.innerHTML = "";
        }
    }
}

/* ==========================================
   ADAPTIVE ACTION ROW - Context-aware quick actions
   ========================================== */

function updateAdaptiveActions() {
    // Get current word info
    const word = currentWord;
    const entry = currentEntry;
    const audienceCopy = getWordCopyForAudience(word, 'en');
    
    if (!word || !entry) return;
    
    // Action buttons
    const hearWord = document.getElementById('action-hear-word');
    const hearSentence = document.getElementById('action-hear-sentence');
    const hearSound = document.getElementById('action-hear-sound');
    const mouthPosition = document.getElementById('action-mouth-position');
    
    if (!hearWord) return; // Elements not loaded yet
    
    const audioBlocked = isCurrentWordAudioBlocked();

    // Always show "Hear word"
    hearWord.style.display = 'inline-block';
    hearWord.classList.add('hint-primary');
    hearWord.disabled = audioBlocked;
    hearWord.onclick = async () => {
        if (audioBlocked) return;
        const gate = beginExclusivePlaybackForSource('action-hear-word');
        if (!gate.proceed) return;
        const played = await tryPlayPackedTtsForCurrentWord({
            text: word,
            languageCode: 'en',
            type: 'word',
            playbackRate: Math.max(0.6, getSpeechRate('word')),
            sourceId: gate.sourceId
        });
        if (!played) {
            if (activePlaybackSourceId === gate.sourceId) activePlaybackSourceId = '';
            showToast('No Azure clip is available for this word yet.');
        }
    };
    
    // Show "Hear sentence" only if sentence exists
    const sentenceText = audienceCopy.sentence || entry?.sentence || entry?.en?.sentence || '';
    if (!audioBlocked && sentenceText && sentenceText.length > 5) {
        hearSentence.style.display = 'inline-block';
        hearSentence.classList.add('hint-primary');
        hearSentence.disabled = false;
        hearSentence.onclick = async () => {
            const gate = beginExclusivePlaybackForSource('action-hear-sentence');
            if (!gate.proceed) return;
            const played = await tryPlayPackedTtsForCurrentWord({
                text: sentenceText,
                languageCode: 'en',
                type: 'sentence',
                playbackRate: Math.max(0.6, getSpeechRate('sentence')),
                sourceId: gate.sourceId
            });
            if (!played) {
                if (activePlaybackSourceId === gate.sourceId) activePlaybackSourceId = '';
                showToast('No Azure clip is available for this sentence yet.');
            }
        };
    } else {
        hearSentence.style.display = 'none';
        hearSentence.disabled = true;
    }
    
    // Show "Hear sound" if we can detect a phoneme pattern
    const firstSound = detectPrimarySound(word);
    if (!audioBlocked && firstSound) {
        hearSound.style.display = 'inline-block';
        hearSound.disabled = false;
        hearSound.onclick = () => {
            // Play sound then word
            speakPhoneme(firstSound);
            setTimeout(() => speak(word, 'word'), 600);
        };
    } else {
        hearSound.style.display = 'none';
        hearSound.disabled = true;
    }
    
    // Mouth guide is optional and off by default (Sound Guide is primary)
    if (mouthPosition) {
        mouthPosition.style.display = 'none';
    }
    
    // Update voice indicator
    updateVoiceIndicator();
}

function detectPrimarySound(word) {
    if (!word) return null;
    
    // Detect first vowel sound (simplified - can be enhanced)
    const vowels = ['a', 'e', 'i', 'o', 'u'];
    for (let char of word.toLowerCase()) {
        if (vowels.includes(char)) {
            return char;
        }
    }
    return word[0]; // Fallback to first letter
}

async function speakPhoneme(sound) {
    if (!sound) return;
    const lower = sound.toString().toLowerCase();
    if (await tryPlayRecordedPhoneme(lower)) return;
    if (await tryPlayPackedPhoneme(lower, 'en')) return;
    const phonemeData = window.PHONEME_DATA ? window.PHONEME_DATA[sound.toLowerCase()] : null;
    const text = phonemeData ? getPhonemeTts(phonemeData, sound) : sound;
    speakText(text, 'phoneme');
}

function canShowMouthPosition(sound) {
    // Check if we have mouth position data for this sound
    if (!sound || !window.PHONEME_DATA) return false;
    return !!window.PHONEME_DATA[sound.toLowerCase()];
}

function openPhonemeGuideToSound(sound) {
    // Open phoneme modal
    const phonemeModal = document.getElementById('phoneme-modal');
    const modalOverlay = document.getElementById('modal-overlay');
    
    if (phonemeModal && modalOverlay) {
        modalOverlay.classList.remove('hidden');
        phonemeModal.classList.remove('hidden');
        setWarmupOpen(true);
        if (sound) prefetchPhonemeClips([sound]);
    try { populatePhonemeGrid && populatePhonemeGrid(); } catch(e) {}
        
        // Scroll to matching card and highlight
        setTimeout(() => {
            const targetCard = document.querySelector(`.phoneme-card[data-sound="${sound}"]`);
            if (targetCard) {
                targetCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
                targetCard.classList.add('highlight-flash');
                setTimeout(() => targetCard.classList.remove('highlight-flash'), 2000);
            }
        }, 100);
    }
}

function updateVoiceIndicator() {
    const indicator = document.getElementById('voice-indicator');
    const indicatorText = document.getElementById('voice-indicator-text');
    
    if (!indicator || !indicatorText) return;
    
    // Check if teacher recordings are enabled
    const useTeacherVoice = localStorage.getItem('useTeacherRecordings') !== 'false';
    
    if (useTeacherVoice && hasAnyRecordings()) {
        indicator.style.display = 'block';
        indicatorText.textContent = '🎤 Using teacher\'s voice';
    } else {
        indicator.style.display = 'none';
    }
}

function hasAnyRecordings() {
    // Check if any recordings exist in IndexedDB
    // Simplified check - can be enhanced
    return localStorage.getItem('hasRecordings') === 'true';
}

function initAdaptiveActions() {
    // Wire up action buttons
    const hearWord = document.getElementById('action-hear-word');
    const hearSentence = document.getElementById('action-hear-sentence');
    const hearSound = document.getElementById('action-hear-sound');
    const mouthPosition = document.getElementById('action-mouth-position');
    
    // Actions are wired up in updateAdaptiveActions()
    // This is just initial setup
    
    console.log('✓ Adaptive actions initialized');
}

function initKeyboard() {
    const rows = ["qwertyuiop", "asdfghjkl", "zxcvbnm"];
    keyboard.innerHTML = "";
    rows.forEach(r => {
        const rowDiv = document.createElement("div");
        rowDiv.className = "keyboard-row";
        r.split("").forEach(char => {
            const k = document.createElement("button");
            k.className = "key";
            if (KEYBOARD_VOWELS.has(char)) {
                k.classList.add("vowel");
            }
            k.textContent = isUpperCase ? char.toUpperCase() : char;
            k.dataset.key = char;
            k.onclick = (e) => {
                // Add visual feedback
                e.target.classList.add('key-pressed');
                setTimeout(() => e.target.classList.remove('key-pressed'), 150);
                
                handleInput(char);
                e.target.blur(); 
            };
            rowDiv.appendChild(k);
        });
        if (r === "zxcvbnm") {
            const del = createKey("⌫", deleteLetter, true);
            const ent = createKey("ENTER", submitGuess, true);
            rowDiv.prepend(del);
            rowDiv.append(ent);
        }
        keyboard.appendChild(rowDiv);
    });

    // Recording feature moved to reveal modal (reveal-record-btn)
}
function createKey(txt, action, wide) {
    const b = document.createElement("button");

    b.textContent = txt;
    b.className = `key ${wide ? 'wide' : ''}`;
    if (wide) {
        const widePx = window.innerWidth <= 760
            ? 74
            : (window.innerHeight <= 860 ? 78 : 86);
        b.style.setProperty('flex', `0 0 ${widePx}px`, 'important');
        b.style.setProperty('width', `${widePx}px`, 'important');
        b.style.setProperty('min-width', `${widePx}px`, 'important');
        b.style.setProperty('max-width', `${widePx}px`, 'important');
    }
    b.onclick = (e) => {
        // Add visual feedback
        e.target.classList.add('key-pressed');
        setTimeout(() => e.target.classList.remove('key-pressed'), 150);
        
        action();
        e.target.blur();
    };
    return b;
}

function handleInput(char) {
    if (currentGuess.length < CURRENT_WORD_LENGTH && !gameOver) {
        currentGuess += char;
        updateGrid();
    }
}

function deleteLetter() {
    if (gameOver) return;
    currentGuess = currentGuess.slice(0, -1);
    updateGrid();
}

function shouldAnimateWordQuestTiles() {
    if (isReducedStimulationEnabled()) return false;
    try {
        return !(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    } catch {
        return true;
    }
}

function triggerTileAnimation(tile, className) {
    if (!(tile instanceof HTMLElement) || !className) return;
    tile.classList.remove(className);
    // Force reflow so the same animation can be replayed reliably.
    void tile.offsetWidth;
    tile.classList.add(className);
    tile.addEventListener('animationend', () => {
        tile.classList.remove(className);
    }, { once: true });
}

function updateGrid() {
    const offset = guesses.length * CURRENT_WORD_LENGTH;
    const canAnimateTiles = shouldAnimateWordQuestTiles();
    const insertedLetter = currentGuess.length > previousGuessRenderLength;
    const latestLetterIndex = insertedLetter ? (currentGuess.length - 1) : -1;
    for (let i = 0; i < CURRENT_WORD_LENGTH; i++) {
        const t = document.getElementById(`tile-${offset + i}`);
        if (!t) continue;
        t.textContent = "";
        t.className = "tile row-active"; 
    }
    for (let i = 0; i < currentGuess.length; i++) {
        const t = document.getElementById(`tile-${offset + i}`);
        if (!t) continue;
        const char = currentGuess[i];
        t.textContent = isUpperCase ? char.toUpperCase() : char;
        const isVowel = KEYBOARD_VOWELS.has(String(char || '').toLowerCase());
        t.className = `tile active row-active${isVowel ? ' vowel' : ''}`;
        if (canAnimateTiles && i === latestLetterIndex) {
            triggerTileAnimation(t, 'tile-letter-bounce');
        }
    }
    previousGuessRenderLength = currentGuess.length;
}

function toggleCase() {
    isUpperCase = !isUpperCase;
    const caseToggle = document.getElementById("case-toggle");
    if (caseToggle) {
        caseToggle.textContent = isUpperCase ? "ABC" : "abc";
    }
    initKeyboard();
    document.querySelectorAll(".tile").forEach(t => {
        if(t.textContent) t.textContent = isUpperCase ? t.textContent.toUpperCase() : t.textContent.toLowerCase();
    });
}

function submitGuess() {
    if (currentGuess.length !== CURRENT_WORD_LENGTH) {
        const offset = guesses.length * CURRENT_WORD_LENGTH;
        const first = document.getElementById(`tile-${offset}`);
        if(first) {
            first.style.transform = "translateX(5px)";
            setTimeout(() => first.style.transform = "none", 100);
        }
        showToast("Finish the word first."); // CLEAN TOAST
        return;
    }
    if (isBlockedClassSafeWord(currentGuess)) {
        showToast("That guess is blocked by the class-safe filter.");
        return;
    }
    const gameModeRunning = !!appSettings.gameMode?.active;
    const teamModeRunning = gameModeRunning && !!appSettings.gameMode?.teamMode;
    const guessTeam = teamModeRunning ? getActiveTeamKey() : 'A';
    lastGuessTeam = guessTeam;

    const result = evaluate(currentGuess, currentWord);
    revealColors(result, currentGuess);
    guesses.push(currentGuess);

    if (currentGuess === currentWord) {
        gameOver = true;
        if (!isReducedStimulationEnabled()) {
            confetti();
        }
        if (window.csDelight && typeof window.csDelight.awardStars === 'function') {
            window.csDelight.awardStars(3, { label: 'Round complete' });
        }
        setTimeout(() => {
            showEndModal(true);  // Show word reveal first
        }, 1500);
    } else if (guesses.length >= CURRENT_MAX_GUESSES) {
        gameOver = true;
        setTimeout(() => showEndModal(false), 1500);
    } else {
        currentGuess = "";
        if (teamModeRunning) {
            toggleActiveTeam();
            renderFunHud();
        }
        // Prepare and highlight the next row immediately.
        updateGrid();
    }
}

function evaluate(guess, target) {
    const res = Array(CURRENT_WORD_LENGTH).fill("absent");
    const tArr = target.split("");
    const gArr = guess.split("");

    gArr.forEach((c, i) => {
        if (c === tArr[i]) {
            res[i] = "correct";
            tArr[i] = null;
            gArr[i] = null;
        }
    });
    gArr.forEach((c, i) => {
        if (c && tArr.includes(c)) {
            res[i] = "present";
            tArr[tArr.indexOf(c)] = null;
        }
    });
    return res;
}

function revealColors(result, guess) {
    const offset = (guesses.length) * CURRENT_WORD_LENGTH;
    const canAnimateTiles = shouldAnimateWordQuestTiles();
    result.forEach((status, i) => {
        setTimeout(() => {
            const t = document.getElementById(`tile-${offset + i}`);
            if (!t) return;
            t.classList.add(status);
            if (canAnimateTiles) {
                if (status === "correct") {
                    triggerTileAnimation(t, 'tile-correct-celebrate');
                } else {
                    triggerTileAnimation(t, 'pop');
                }
            }
            const k = document.querySelector(`.key[data-key="${guess[i]}"]`);
            if (k) {
                if (status === "correct") {
                    k.classList.remove("present", "absent");
                    k.classList.add("correct");
                } else if (status === "present") {
                    if (!k.classList.contains("correct")) {
                        k.classList.remove("absent");
                        k.classList.add("present");
                    }
                } else if (status === "absent") {
                    if (!k.classList.contains("correct") && !k.classList.contains("present")) {
                        k.classList.add("absent");
                    }
                }
            }
        }, i * 200);
    });
}

function renderModalWord(word) {
    const wordEl = document.getElementById("modal-word");
    if (!wordEl) return;
    const letters = (word || "").toUpperCase().split("");
    if (!letters.length) {
        wordEl.textContent = "";
        return;
    }
    wordEl.classList.add("reveal-word");
    wordEl.setAttribute("aria-label", letters.join(""));
    wordEl.innerHTML = letters
        .map((ch, i) => `<span style="--delay:${(i * 0.08).toFixed(2)}s">${ch}</span>`)
        .join("");
}

function applyRevealVariant(win) {
    const wordEl = document.getElementById("modal-word");
    if (!wordEl) return;
    const variants = ['lift', 'flip', 'sparkle'];
    const choice = win ? variants[Math.floor(Math.random() * variants.length)] : 'lift';
    wordEl.classList.remove('variant-lift', 'variant-flip', 'variant-sparkle');
    wordEl.classList.add(`variant-${choice}`);
}

function updateModalSyllables(word, rawSyllables) {
    const syllableEl = document.getElementById("modal-syllables");
    if (!syllableEl) return;

    const cleanedWord = (word || "").replace(/[^a-z]/gi, "").toLowerCase();
    const normalizedRaw = String(rawSyllables || '').trim();
    const cleanedSyllables = normalizedRaw.replace(/[^a-z]/gi, "").toLowerCase();

    if (!normalizedRaw || cleanedSyllables === cleanedWord) {
        syllableEl.textContent = "";
        syllableEl.classList.add("hidden");
        return;
    }

    const segments = normalizedRaw
        .split(/[·•\-/\s]+/)
        .map((segment) => segment.trim())
        .filter(Boolean);
    if (segments.length <= 1) {
        syllableEl.textContent = "";
        syllableEl.classList.add("hidden");
        return;
    }

    syllableEl.innerHTML = `<span class="syllable-label">Syllables:</span> ${segments.join(' • ')}`;
    syllableEl.classList.remove("hidden");
}

function estimateSpeechDuration(text, rate = 1) {
    if (!text) return 0;
    const normalized = Math.max(0.6, rate || 1);
    const words = countSpeechWords(text);
    const punctuationPauses = (String(text).match(/[.,!?;:]/g) || []).length;
    const charEstimate = Math.max(980, String(text).length * 72);
    const wordEstimate = Math.max(980, (words * 420) + (punctuationPauses * 120));
    const base = Math.max(charEstimate, wordEstimate);
    return Math.min(12000, base / normalized);
}

// Track autoplay timeouts so we can cancel them on modal close
let autoPlayRevealTimeouts = [];

function cancelAutoPlayReveal() {
    autoPlayRevealTimeouts.forEach(id => clearTimeout(id));
    autoPlayRevealTimeouts = [];
}

function autoPlayReveal(definitionText, sentenceText) {
    cancelAutoPlayReveal();
    if (appSettings.autoHear === false) return;
    if (isCurrentWordAudioBlocked()) return;
    const wordText = currentWord || '';
    const speechRateWord = getSpeechRate('word');
    const speechRateSentence = getSpeechRate('sentence');

    const interPartGapMs = 340;
    let delay = 170;
    if (wordText) {
        autoPlayRevealTimeouts.push(setTimeout(() => {
            const gate = beginExclusivePlaybackForSource('auto-hear-word');
            if (!gate.proceed) return;
            tryPlayPackedTtsForCurrentWord({
                text: wordText,
                languageCode: 'en',
                type: 'word',
                playbackRate: Math.max(0.6, getSpeechRate('word')),
                sourceId: gate.sourceId
            }).then((played) => {
                if (!played && activePlaybackSourceId === gate.sourceId) {
                    activePlaybackSourceId = '';
                }
            });
        }, delay));
        delay += estimateSpeechDuration(wordText, speechRateWord) + interPartGapMs;
    }
    if (definitionText) {
        autoPlayRevealTimeouts.push(setTimeout(() => {
            const gate = beginExclusivePlaybackForSource('auto-hear-definition');
            if (!gate.proceed) return;
            tryPlayPackedTtsForCurrentWord({
                text: definitionText,
                languageCode: 'en',
                type: 'def',
                playbackRate: Math.max(0.6, getSpeechRate('sentence')),
                sourceId: gate.sourceId
            }).then((played) => {
                if (!played && activePlaybackSourceId === gate.sourceId) {
                    activePlaybackSourceId = '';
                }
            });
        }, delay));
        delay += estimateSpeechDuration(definitionText, speechRateSentence) + interPartGapMs;
    }
    if (sentenceText) {
        autoPlayRevealTimeouts.push(setTimeout(() => {
            const gate = beginExclusivePlaybackForSource('auto-hear-sentence');
            if (!gate.proceed) return;
            tryPlayPackedTtsForCurrentWord({
                text: sentenceText,
                languageCode: 'en',
                type: 'sentence',
                playbackRate: Math.max(0.6, getSpeechRate('sentence')),
                sourceId: gate.sourceId
            }).then((played) => {
                if (!played && activePlaybackSourceId === gate.sourceId) {
                    activePlaybackSourceId = '';
                }
            });
        }, delay));
    }
}

function prepareTranslationSection() {
    const languageSelect = document.getElementById("language-select");
    let section = document.querySelector(".translation-selector");
    if (!section && languageSelect) {
        section = languageSelect.closest(".translation-selector") || languageSelect.parentElement;
        if (section && !section.classList.contains("translation-selector")) {
            section.classList.add("translation-selector");
        }
    }
    if (!section || section.dataset.compactified === "true") return section;

    const toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "translation-toggle";
    toggle.textContent = "🌐 Language + Translation";

    section.prepend(toggle);

    const controls = document.createElement("div");
    controls.className = "translation-controls";

    Array.from(section.children).forEach(child => {
        if (child !== toggle) controls.appendChild(child);
    });

    section.appendChild(controls);
    section.classList.add("translation-compact");
    section.dataset.compactified = "true";

    toggle.addEventListener("click", () => {
        section.classList.toggle("is-open");
    });

    const preferredTranslation = getPreferredTranslationLanguage();
    const shouldAutoOpen = getResolvedAudienceMode() === 'young-eal'
        || (!!preferredTranslation && preferredTranslation !== 'en');
    if (shouldAutoOpen) {
        section.classList.add('is-open');
    }

    return section;
}

function ensureTranslationElements(modalContent) {
    const container = modalContent || document;
    const languageSelect = document.getElementById('language-select');
    const fallbackSelector = languageSelect
        ? (languageSelect.closest('.translation-selector') || languageSelect.parentElement)
        : null;
    const translationSelector = container.querySelector('.translation-selector') || document.querySelector('.translation-selector') || fallbackSelector;
    const translationContainer = translationSelector?.querySelector?.('.translation-controls') || translationSelector;

    let translationDisplay = document.getElementById('translation-display');
    if (!translationDisplay) {
        translationDisplay = document.createElement('div');
        translationDisplay.id = 'translation-display';
        translationDisplay.className = 'translation-display hidden';
    }

    let translatedDef = document.getElementById('translated-def');
    if (!translatedDef) {
        translatedDef = document.createElement('div');
        translatedDef.id = 'translated-def';
        translationDisplay.appendChild(translatedDef);
    }

    let translatedWord = document.getElementById('translated-word');
    if (!translatedWord) {
        translatedWord = document.createElement('div');
        translatedWord.id = 'translated-word';
        translatedWord.className = 'translated-word hidden';
        translationDisplay.appendChild(translatedWord);
    }

    let translatedSentence = document.getElementById('translated-sentence');
    if (!translatedSentence) {
        translatedSentence = document.createElement('div');
        translatedSentence.id = 'translated-sentence';
        translationDisplay.appendChild(translatedSentence);
    }

    let audioRow = translationDisplay.querySelector('.translation-audio-row');
    if (!audioRow) {
        audioRow = document.createElement('div');
        audioRow.className = 'translation-audio-row';
        translationDisplay.appendChild(audioRow);
    }

    let playTranslatedWord = document.getElementById('play-translated-word');
    if (!playTranslatedWord) {
        playTranslatedWord = document.createElement('button');
        playTranslatedWord.id = 'play-translated-word';
        playTranslatedWord.type = 'button';
        playTranslatedWord.textContent = 'Hear Word';
    }
    if (audioRow && !audioRow.contains(playTranslatedWord)) audioRow.appendChild(playTranslatedWord);

    let playTranslatedDef = document.getElementById('play-translated-def');
    if (!playTranslatedDef) {
        playTranslatedDef = document.createElement('button');
        playTranslatedDef.id = 'play-translated-def';
        playTranslatedDef.type = 'button';
        playTranslatedDef.textContent = 'Hear Definition';
    }
    if (audioRow && !audioRow.contains(playTranslatedDef)) audioRow.appendChild(playTranslatedDef);

    let playTranslatedSentence = document.getElementById('play-translated-sentence');
    if (!playTranslatedSentence) {
        playTranslatedSentence = document.createElement('button');
        playTranslatedSentence.id = 'play-translated-sentence';
        playTranslatedSentence.type = 'button';
        playTranslatedSentence.textContent = 'Hear Sentence';
    }
    if (audioRow && !audioRow.contains(playTranslatedSentence)) audioRow.appendChild(playTranslatedSentence);

    if (translationContainer && !translationContainer.contains(translationDisplay)) {
        translationContainer.appendChild(translationDisplay);
    } else if (modalContent && !modalContent.contains(translationDisplay)) {
        modalContent.appendChild(translationDisplay);
    }

    return {
        translationDisplay,
        translatedWord,
        translatedDef,
        translatedSentence,
        playTranslatedWord,
        playTranslatedDef,
        playTranslatedSentence,
        translationSelector
    };
}

function setupModalAudioControls(definitionText, sentenceText) {
    if (!gameModal) return;
    const modalContent = gameModal.querySelector('.modal-content')
        || gameModal.querySelector('.modal-body')
        || gameModal;
    if (!modalContent) return;

    let audioControls = document.getElementById('modal-audio-controls');
    if (!audioControls) {
        audioControls = document.createElement('div');
        audioControls.id = 'modal-audio-controls';
        audioControls.className = 'modal-audio-controls';
    }

    let actionRow = document.getElementById('modal-action-row');
    if (!actionRow) {
        actionRow = document.createElement('div');
        actionRow.id = 'modal-action-row';
        actionRow.className = 'modal-action-row';
    }

    let autoReadRow = document.getElementById('auto-read-toggle');
    if (!autoReadRow) {
        autoReadRow = document.createElement('div');
        autoReadRow.id = 'auto-read-toggle';
        autoReadRow.className = 'auto-read-toggle';
        autoReadRow.innerHTML = `
            <label class="auto-read-label">
                <input type="checkbox" id="auto-read-checkbox" />
                Auto-read word, definition, and sentence
            </label>
        `;
    }
    const autoReadCheckbox = autoReadRow.querySelector('#auto-read-checkbox');
    if (autoReadCheckbox) {
        autoReadCheckbox.checked = appSettings.autoHear !== false;
        autoReadCheckbox.onchange = () => {
            appSettings.autoHear = autoReadCheckbox.checked;
            saveSettings();
        };
    }

    const audioBlocked = isCurrentWordAudioBlocked();

    let speakBtn = document.getElementById('speak-btn');
    if (!speakBtn) {
        speakBtn = document.createElement('button');
        speakBtn.id = 'speak-btn';
        speakBtn.type = 'button';
    }
    speakBtn.textContent = 'Hear Word';
    speakBtn.classList.add('modal-audio-btn');
    speakBtn.disabled = audioBlocked;
    speakBtn.onclick = async () => {
        if (audioBlocked) return;
        if (!currentWord) return;
        const gate = beginExclusivePlaybackForSource('modal-hear-word');
        if (!gate.proceed) return;
        const played = await tryPlayPackedTtsForCurrentWord({
            text: currentWord,
            languageCode: 'en',
            type: 'word',
            playbackRate: Math.max(0.6, getSpeechRate('word')),
            sourceId: gate.sourceId
        });
        if (!played) {
            if (activePlaybackSourceId === gate.sourceId) activePlaybackSourceId = '';
            showToast('No Azure clip is available for this word yet.');
        }
    };
    if (!audioControls.contains(speakBtn)) audioControls.appendChild(speakBtn);

    let defBtn = document.getElementById('modal-hear-def');
    if (!defBtn) {
        defBtn = document.createElement('button');
        defBtn.id = 'modal-hear-def';
        defBtn.type = 'button';
        defBtn.className = 'modal-audio-btn';
    }
    defBtn.textContent = 'Hear Definition';
    defBtn.disabled = audioBlocked || !definitionText;
    defBtn.onclick = async () => {
        if (audioBlocked) return;
        if (!definitionText) return;
        const gate = beginExclusivePlaybackForSource('modal-hear-definition');
        if (!gate.proceed) return;
        const played = await tryPlayPackedTtsForCurrentWord({
            text: definitionText,
            languageCode: 'en',
            type: 'def',
            playbackRate: Math.max(0.6, getSpeechRate('sentence')),
            sourceId: gate.sourceId
        });
        if (!played) {
            if (activePlaybackSourceId === gate.sourceId) activePlaybackSourceId = '';
            showToast('No Azure clip is available for this definition yet.');
        }
    };
    if (!audioControls.contains(defBtn)) audioControls.appendChild(defBtn);

    let sentenceBtn = document.getElementById('modal-hear-sentence');
    if (!sentenceBtn) {
        sentenceBtn = document.createElement('button');
        sentenceBtn.id = 'modal-hear-sentence';
        sentenceBtn.type = 'button';
        sentenceBtn.className = 'modal-audio-btn';
    }
    sentenceBtn.textContent = 'Hear Sentence';
    sentenceBtn.disabled = audioBlocked || !sentenceText;
    sentenceBtn.onclick = async () => {
        if (audioBlocked) return;
        if (!sentenceText) return;
        const gate = beginExclusivePlaybackForSource('modal-hear-sentence');
        if (!gate.proceed) return;
        const played = await tryPlayPackedTtsForCurrentWord({
            text: sentenceText,
            languageCode: 'en',
            type: 'sentence',
            playbackRate: Math.max(0.6, getSpeechRate('sentence')),
            sourceId: gate.sourceId
        });
        if (!played) {
            if (activePlaybackSourceId === gate.sourceId) activePlaybackSourceId = '';
            showToast('No Azure clip is available for this sentence yet.');
        }
    };
    if (!audioControls.contains(sentenceBtn)) audioControls.appendChild(sentenceBtn);

    const playAgainBtn = document.getElementById('play-again-btn');
    if (playAgainBtn) {
        playAgainBtn.classList.add('modal-primary-btn');
        if (!actionRow.contains(playAgainBtn)) actionRow.appendChild(playAgainBtn);
    }

    const translationSelector = modalContent.querySelector('.translation-selector')
        || document.querySelector('.translation-selector')
        || document.getElementById('language-select')?.parentElement;
    const sentenceEl = modalContent.querySelector('#modal-sentence');

    const safeInsertBefore = (parent, node, reference) => {
        if (!parent || !node) return;
        if (reference && reference.parentElement === parent) {
            parent.insertBefore(node, reference);
        } else if (!parent.contains(node)) {
            parent.appendChild(node);
        }
    };
    const safeInsertAfter = (parent, node, reference) => {
        if (!parent || !node) return;
        if (reference && reference.parentElement === parent) {
            parent.insertBefore(node, reference.nextSibling);
        } else if (!parent.contains(node)) {
            parent.appendChild(node);
        }
    };

    const translationParent = translationSelector?.parentElement;
    if (translationSelector && translationParent === modalContent) {
        safeInsertBefore(modalContent, audioControls, translationSelector);
        safeInsertBefore(modalContent, actionRow, translationSelector);
        safeInsertBefore(modalContent, autoReadRow, translationSelector);
    } else if (sentenceEl && sentenceEl.parentElement) {
        const parent = sentenceEl.parentElement;
        safeInsertAfter(parent, audioControls, sentenceEl);
        safeInsertAfter(parent, actionRow, audioControls);
        safeInsertAfter(parent, autoReadRow, actionRow);
    } else {
        safeInsertBefore(modalContent, audioControls, null);
        safeInsertAfter(modalContent, actionRow, audioControls);
        safeInsertAfter(modalContent, autoReadRow, actionRow);
    }

    // Teacher tools (local-only recordings)
    const revealRecorderEnabled = !!appSettings.showRevealRecordingTools;
    let teacherTools = document.getElementById('reveal-teacher-tools');
    if (!revealRecorderEnabled) {
        teacherTools?.remove();
        document.getElementById('practice-recorder-group')?.remove();
        return;
    }

    if (!teacherTools) {
        teacherTools = document.createElement('div');
        teacherTools.id = 'reveal-teacher-tools';
        teacherTools.className = 'reveal-teacher-tools';
        teacherTools.innerHTML = `
            <button type="button" class="reveal-teacher-toggle">🎙️ Teacher tools</button>
            <div class="reveal-teacher-controls">
                <div class="reveal-teacher-note">Teacher only: record your voice for the word and sentence (saved on this device).</div>
            </div>
        `;
    }

    const toggleBtn = teacherTools.querySelector('.reveal-teacher-toggle');
    if (toggleBtn && !toggleBtn.dataset.bound) {
        toggleBtn.dataset.bound = 'true';
        toggleBtn.addEventListener('click', () => {
            teacherTools.classList.toggle('is-open');
        });
    }

    const controls = teacherTools.querySelector('.reveal-teacher-controls');
    if (!controls) return;

    let recorderGroup = document.getElementById('practice-recorder-group');
    if (!recorderGroup) {
        recorderGroup = document.createElement('div');
        recorderGroup.id = 'practice-recorder-group';
        recorderGroup.className = 'practice-recorder-group';
    }

    recorderGroup.innerHTML = '';
    if (currentWord) {
        ensurePracticeRecorder(recorderGroup, `word:${currentWord}`, 'Record Word');
    }
    if (sentenceText) {
        ensurePracticeRecorder(recorderGroup, `sentence:${currentWord}`, 'Record Sentence');
    }

    if (!controls.contains(recorderGroup)) {
        controls.appendChild(recorderGroup);
    }

    const anchor = (translationSelector && translationSelector.parentElement === modalContent) ? translationSelector : autoReadRow;
    safeInsertAfter(modalContent, teacherTools, anchor);
}

function showEndModal(win) {
    // Track progress
    trackProgress(currentWord, win, guesses.length);
    try {
        const focus = document.getElementById('pattern-select')?.value || 'all';
        const length = document.getElementById('length-select')?.value || String(CURRENT_WORD_LENGTH || '');
        window.DECODE_PLATFORM?.logActivity?.({
            activity: 'word-quest',
            label: 'Word Quest',
            event: win ? 'Solved word' : 'Round ended',
            detail: {
                won: !!win,
                guesses: Array.isArray(guesses) ? guesses.length : 0,
                word: currentWord || '',
                focus,
                length
            }
        });
    } catch (e) {}

    stopLightningTimer();
    
    modalOverlay.classList.remove("hidden");
    gameModal.classList.remove("hidden");
    gameModal.dataset.overlayClose = 'true';
    gameModal.classList.toggle("win", win);
    gameModal.classList.toggle("loss", !win);
    document.getElementById("modal-title").textContent = win ? "Great Job!" : "Nice Try!";
    
    renderModalWord(currentWord);
    applyRevealVariant(win);
    const syllableText = currentEntry?.syllables ? currentEntry.syllables.replace(/-/g, " • ") : "";
    updateModalSyllables(currentWord, syllableText);
    
    const resolvedAudienceMode = getResolvedAudienceMode();
    const audienceCopy = getWordCopyForAudience(currentWord, 'en', resolvedAudienceMode);
    let def = audienceCopy.definition || currentEntry?.en?.def || currentEntry?.def || "";
    let sentence = audienceCopy.sentence || currentEntry?.en?.sentence || currentEntry?.sentence || "";

    const adaptedCopy = adaptRevealCopyForAudience(def, sentence, currentWord, {
        mode: resolvedAudienceMode,
        languageCode: 'en'
    });
    def = adaptedCopy.definition;
    sentence = adaptedCopy.sentence;
    renderAudienceModeNote(adaptedCopy.mode);

    const isCustomWithoutLibrarySupport = isCustomWordRound && !customWordInLibrary;
    if (!isCustomWithoutLibrarySupport) {
        const hasLibrarySupport = !!window.WORD_ENTRIES?.[currentWord];
        if (!hasLibrarySupport) {
            def = simplifyRevealDefinition(def || '', currentWord, 'en');
            sentence = simplifyRevealSentence(sentence || `Can you use "${currentWord}" in a class-safe sentence?`, currentWord, 'en');
        }
    } else {
        def = '';
        sentence = '';
    }
    def = sanitizeRevealText(def, {
        word: currentWord,
        field: 'definition',
        languageCode: 'en',
        allowFallback: !isCustomWithoutLibrarySupport,
        maxWords: 20
    });
    sentence = sanitizeRevealText(sentence, {
        word: currentWord,
        field: 'sentence',
        languageCode: 'en',
        allowFallback: !isCustomWithoutLibrarySupport,
        maxWords: 24
    });

    const modalDefEl = document.getElementById("modal-def");
    const modalSentenceEl = document.getElementById("modal-sentence");
    if (modalDefEl) {
        modalDefEl.textContent = def || '';
    }
    if (modalSentenceEl) {
        modalSentenceEl.textContent = sentence ? `"${sentence}"` : '';
    }

    const speakBtn = document.getElementById("speak-btn");
    if (speakBtn) {
        speakBtn.disabled = isCurrentWordAudioBlocked();
        speakBtn.textContent = 'Hear Word';
    }

    setupModalAudioControls(def, sentence);

    const gameModeRunning = !!appSettings.gameMode?.active;
    if (win && appSettings.funHud?.enabled && gameModeRunning) {
        if (appSettings.gameMode?.teamMode) {
            if (lastGuessTeam === 'B') {
                appSettings.gameMode.teamBCoins = (appSettings.gameMode.teamBCoins || 0) + 1;
            } else {
                appSettings.gameMode.teamACoins = (appSettings.gameMode.teamACoins || 0) + 1;
            }
        } else {
            appSettings.funHud.coins = (appSettings.funHud.coins || 0) + 1;
        }
        saveSettings();
        renderFunHud();
        playFunChime('win');
    }
    applyFunHudOutcome(win);
    
    // Set up translation dropdown functionality
    const languageSelect = document.getElementById("language-select");
    const modalContent = gameModal.querySelector('.modal-content') || gameModal;
    const translationElements = ensureTranslationElements(modalContent);
    const translationDisplay = translationElements.translationDisplay;
    const translatedWord = translationElements.translatedWord;
    const translatedDef = translationElements.translatedDef;
    const translatedSentence = translationElements.translatedSentence;
    const playTranslatedWord = translationElements.playTranslatedWord;
    const playTranslatedDef = translationElements.playTranslatedDef;
    const playTranslatedSentence = translationElements.playTranslatedSentence;
    
    const pinCheckbox = document.getElementById("pin-language");
    const pinStatus = document.getElementById("translation-pin-status");
    const translationSection = prepareTranslationSection();
    const toggleTranslationSection = (open) => {
        if (translationSection) {
            translationSection.classList.toggle("is-open", open);
        }
    };

    const renderTranslation = async (selectedLang) => {
        if (!translationDisplay || !translatedDef || !translatedSentence) {
            return;
        }
        if (!selectedLang || selectedLang === "en") {
            translationDisplay.classList.add("hidden");
            setTranslationAudioNote('');
            return;
        }

        const translation = getTranslationData(currentWord, selectedLang, {
            audienceMode: resolvedAudienceMode
        });
        if (translation && (translation.definition || translation.sentence || translation.word)) {
            const safeWord = cleanAudienceText(translation.word || '');
            const safeDefinition = translation.definition || '';
            const safeSentence = translation.sentence || '';
            
            // If all text ended up empty after sanitization, show fallback
            if (!safeWord && !safeDefinition && !safeSentence) {
                if (translatedWord) { translatedWord.textContent = ''; translatedWord.classList.add('hidden'); }
                translatedDef.textContent = "Translation coming soon for this word.";
                translatedSentence.textContent = "";
                if (playTranslatedWord) { playTranslatedWord.onclick = null; playTranslatedWord.disabled = true; }
                if (playTranslatedDef) { playTranslatedDef.onclick = null; playTranslatedDef.disabled = true; }
                if (playTranslatedSentence) { playTranslatedSentence.onclick = null; playTranslatedSentence.disabled = true; }
                setTranslationAudioNote('');
                translationDisplay.classList.remove("hidden");
                return;
            }
            if (translatedWord) {
                translatedWord.textContent = safeWord ? `Word: ${safeWord}` : '';
                translatedWord.classList.toggle('hidden', !safeWord);
            }
            translatedDef.textContent = safeDefinition;
            translatedSentence.textContent = safeSentence ? `"${safeSentence}"` : '';

            if (playTranslatedWord) {
                playTranslatedWord.onclick = safeWord
                    ? () => playTextInLanguage(safeWord, selectedLang, 'word', 'translation-hear-word')
                    : null;
            }
            if (playTranslatedDef) {
                playTranslatedDef.onclick = safeDefinition
                    ? () => playTextInLanguage(safeDefinition, selectedLang, 'def', 'translation-hear-definition')
                    : null;
            }
            if (playTranslatedSentence) {
                playTranslatedSentence.onclick = safeSentence
                    ? () => playTextInLanguage(safeSentence, selectedLang, 'sentence', 'translation-hear-sentence')
                    : null;
            }

            translationDisplay.classList.remove("hidden");
            const [hasVoice, packedWordReady, packedDefReady, packedSentenceReady] = await Promise.all([
                hasVoiceForLanguage(selectedLang),
                safeWord ? hasPackedTtsClipForCurrentWord({ text: safeWord, languageCode: selectedLang, type: 'word' }) : Promise.resolve(false),
                safeDefinition ? hasPackedTtsClipForCurrentWord({ text: safeDefinition, languageCode: selectedLang, type: 'def' }) : Promise.resolve(false),
                safeSentence ? hasPackedTtsClipForCurrentWord({ text: safeSentence, languageCode: selectedLang, type: 'sentence' }) : Promise.resolve(false)
            ]);

            const canPlayWord = !!safeWord;
            const canPlayDefinition = !!safeDefinition;
            const canPlaySentence = !!safeSentence;

            if (playTranslatedWord) playTranslatedWord.disabled = !canPlayWord;
            if (playTranslatedDef) playTranslatedDef.disabled = !canPlayDefinition;
            if (playTranslatedSentence) playTranslatedSentence.disabled = !canPlaySentence;

            const hasAnyText = canPlayWord || canPlayDefinition || canPlaySentence;
            const hasAnyPlayable = packedWordReady || packedDefReady || packedSentenceReady || hasVoice;
            if (!hasAnyPlayable && hasAnyText) {
                setTranslationAudioNote('Audio unavailable for this language.', true);
            } else {
                setTranslationAudioNote('');
            }
        } else {
            if (translatedWord) {
                translatedWord.textContent = '';
                translatedWord.classList.add('hidden');
            }
            translatedDef.textContent = "Translation coming soon for this word.";
            translatedSentence.textContent = "";
            if (playTranslatedWord) playTranslatedWord.onclick = null;
            if (playTranslatedDef) playTranslatedDef.onclick = null;
            if (playTranslatedSentence) playTranslatedSentence.onclick = null;
            if (playTranslatedWord) playTranslatedWord.disabled = true;
            if (playTranslatedDef) playTranslatedDef.disabled = true;
            if (playTranslatedSentence) playTranslatedSentence.disabled = true;
            setTranslationAudioNote('');
            translationDisplay.classList.remove("hidden");
        }

        const translationSection = translationDisplay.closest('.translation-compact');
        if (translationSection) translationSection.classList.add('is-open');
    };

    const updatePinStatus = () => {
        if (!pinStatus) return;
        if (appSettings.translation?.pinned && appSettings.translation?.lang && appSettings.translation.lang !== 'en') {
            const optionLabel = languageSelect?.selectedOptions?.[0]?.textContent || appSettings.translation.lang;
            pinStatus.textContent = `Locked to ${optionLabel}.`;
            pinStatus.classList.remove('hidden');
        } else {
            pinStatus.textContent = "";
            pinStatus.classList.add('hidden');
        }
    };

    if (languageSelect) {
        applyTranslationLanguageOptionLabels(languageSelect);
        const pinned = appSettings.translation?.pinned;
        const pinnedLang = appSettings.translation?.lang || 'en';
        const preferredTranslationLang = resolvedAudienceMode === 'young-eal'
            ? getYoungAudienceDefaultTranslationLanguage()
            : getPreferredTranslationLanguage();
        const defaultLang = (!pinned && preferredTranslationLang && preferredTranslationLang !== 'en')
            ? preferredTranslationLang
            : 'en';
        languageSelect.value = pinned ? pinnedLang : defaultLang;
        translationDisplay.classList.add("hidden");

        if (pinCheckbox) {
            pinCheckbox.checked = !!pinned;
        }

        renderTranslation(languageSelect.value);
        updatePinStatus();
        toggleTranslationSection(languageSelect.value && languageSelect.value !== 'en');

        languageSelect.onchange = () => {
            const selectedLang = languageSelect.value;
            renderTranslation(selectedLang);
            toggleTranslationSection(selectedLang && selectedLang !== 'en');

            if (pinCheckbox && pinCheckbox.checked) {
                appSettings.translation.lang = selectedLang;
                if (selectedLang === 'en') {
                    appSettings.translation.pinned = false;
                    pinCheckbox.checked = false;
                }
                saveSettings();
            }
            updatePinStatus();
        };

        if (pinCheckbox) {
            pinCheckbox.onchange = () => {
                const selectedLang = languageSelect.value;
                const shouldPin = pinCheckbox.checked && selectedLang !== 'en';
                appSettings.translation.pinned = shouldPin;
                if (shouldPin) {
                    appSettings.translation.lang = selectedLang;
                }
                saveSettings();
                updatePinStatus();
                toggleTranslationSection(selectedLang && selectedLang !== 'en');
            };
        }
    }
    
    // Set up recording button in reveal modal
    const revealRecordBtn = document.getElementById('reveal-record-btn');
    const revealRecordStatus = document.getElementById('reveal-record-status');
    if (revealRecordBtn) {
        let recMediaRecorder = null;
        let recAudioChunks = [];
        let recIsRecording = false;
        let recBlobUrl = null;
        
        revealRecordBtn.onclick = async () => {
            if (recIsRecording) {
                if (recMediaRecorder && recMediaRecorder.state === 'recording') recMediaRecorder.stop();
                return;
            }
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                recMediaRecorder = new MediaRecorder(stream);
                recAudioChunks = [];
                
                recMediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) recAudioChunks.push(e.data); };
                recMediaRecorder.onstart = () => {
                    recIsRecording = true;
                    revealRecordBtn.innerHTML = '⏹ Stop Recording';
                    revealRecordBtn.style.background = 'linear-gradient(180deg,#fca5a5,#f87171)';
                    revealRecordBtn.style.borderColor = '#f87171';
                    revealRecordBtn.style.color = '#7f1d1d';
                    // Countdown timer
                    let secondsLeft = 8;
                    if (revealRecordStatus) revealRecordStatus.innerHTML = `<span style="color:#dc2626; font-weight:700;">🔴 Recording: ${secondsLeft}s remaining</span><br><span style="font-size:0.72rem; color:#6b7280;">Say the word clearly — tap Stop when done</span>`;
                    const countdownInterval = setInterval(() => {
                        secondsLeft--;
                        if (secondsLeft <= 0 || !recIsRecording) {
                            clearInterval(countdownInterval);
                            return;
                        }
                        if (revealRecordStatus) revealRecordStatus.innerHTML = `<span style="color:#dc2626; font-weight:700;">🔴 Recording: ${secondsLeft}s remaining</span><br><span style="font-size:0.72rem; color:#6b7280;">Say the word clearly — tap Stop when done</span>`;
                    }, 1000);
                };
                recMediaRecorder.onstop = () => {
                    recIsRecording = false;
                    stream.getTracks().forEach(t => t.stop());
                    const blob = new Blob(recAudioChunks, { type: 'audio/webm' });
                    recBlobUrl = URL.createObjectURL(blob);
                    const word = String(currentWord || '').toLowerCase();
                    
                    revealRecordBtn.innerHTML = '🎙 Try Again';
                    revealRecordBtn.style.background = 'linear-gradient(180deg, #fefce8, #fef3c7)';
                    revealRecordBtn.style.borderColor = '#fde68a';
                    revealRecordBtn.style.color = '#92400e';
                    
                    if (revealRecordStatus) {
                        revealRecordStatus.innerHTML = `
                            <span style="display:inline-flex; gap:6px; flex-wrap:wrap; margin-top:4px;">
                                <button onclick="new Audio('${recBlobUrl}').play()" style="padding:3px 10px; border-radius:8px; border:1px solid #bbf7d0; background:#f0fdf4; cursor:pointer; font-size:0.75rem; font-weight:600;">▶ Hear Me</button>
                                <button onclick="if(typeof speak==='function')speak('${word}','word')" style="padding:3px 10px; border-radius:8px; border:1px solid #bfdbfe; background:#eff6ff; cursor:pointer; font-size:0.75rem; font-weight:600;">🔊 Compare</button>
                                <button id="reveal-save-rec" style="padding:3px 10px; border-radius:8px; border:1px solid #c4b5fd; background:#f5f3ff; cursor:pointer; font-size:0.75rem; font-weight:600;">💾 Save</button>
                            </span>`;
                        const saveBtn = document.getElementById('reveal-save-rec');
                        if (saveBtn) {
                            saveBtn.onclick = async () => {
                                try {
                                    const db = await new Promise((resolve, reject) => {
                                        const req = indexedDB.open('WordQuestRecordings', 1);
                                        req.onupgradeneeded = () => req.result.createObjectStore('recordings');
                                        req.onsuccess = () => resolve(req.result);
                                        req.onerror = () => reject(req.error);
                                    });
                                    const tx = db.transaction('recordings', 'readwrite');
                                    tx.objectStore('recordings').put({ blob, word, date: new Date().toISOString() }, `${word}_${new Date().toISOString().slice(0,10)}`);
                                    await new Promise((res, rej) => { tx.oncomplete = res; tx.onerror = rej; });
                                    db.close();
                                    saveBtn.textContent = '✅ Saved!';
                                    saveBtn.disabled = true;
                                } catch(e) { saveBtn.textContent = '⚠️ Error'; }
                            };
                        }
                    }
                };
                recMediaRecorder.start();
                setTimeout(() => { if (recMediaRecorder.state === 'recording') recMediaRecorder.stop(); }, 8000);
            } catch(err) {
                if (revealRecordStatus) revealRecordStatus.textContent = '⚠️ Microphone access needed';
            }
        };
    }

    // Store that we should show bonus when modal closes
    sessionStorage.setItem('showBonusOnClose', 'true');

    autoPlayReveal(def, sentence);
}

function openTeacherMode() {
    modalOverlay.classList.remove("hidden");
    teacherModal.classList.remove("hidden");
    const errorEl = document.getElementById("teacher-error");
    if (errorEl) errorEl.textContent = "";

    if (!teacherToolsInitialized) {
        initTeacherTools();
        teacherToolsInitialized = true;
    }
    applySettings();
}

/* ==========================================
   TEACHER VOICE CONTROL SYSTEM
   ========================================== */

function initTeacherVoiceControl() {
    const toggle = document.getElementById('teacher-voice-toggle');
    const statusText = document.getElementById('recording-count');
    const deleteAllBtn = document.getElementById('delete-all-recordings');
    const deleteWordBtn = document.getElementById('delete-word-recording');
    const deleteSentenceBtn = document.getElementById('delete-sentence-recording');
    const deleteAllWordBtn = document.getElementById('delete-all-word-recordings');
    const deleteAllSentenceBtn = document.getElementById('delete-all-sentence-recordings');
    const deletePhonemeBtn = document.getElementById('delete-phoneme-recording');

    if (!toggle) return;

    const useTeacherVoice = localStorage.getItem('useTeacherRecordings') !== 'false';
    toggle.checked = useTeacherVoice;

    updateRecordingStatus();

    toggle.onchange = () => {
        const enabled = toggle.checked;
        localStorage.setItem('useTeacherRecordings', enabled.toString());
        updateVoiceIndicator();
        showToast(enabled ? '✅ Teacher voice enabled' : '🔊 Using system voice');
    };

    if (deleteWordBtn) {
        deleteWordBtn.onclick = async () => {
            if (!currentWord) return showToast('No word selected yet.');
            if (confirm(`Delete the word recording for "${currentWord}"?`)) {
                await deleteAudioFromDB(`${currentWord}_word`);
                showToast('✅ Word recording deleted');
                updateRecordingStatus();
            }
        };
    }

    if (deleteSentenceBtn) {
        deleteSentenceBtn.onclick = async () => {
            if (!currentWord) return showToast('No word selected yet.');
            if (confirm(`Delete the sentence recording for "${currentWord}"?`)) {
                await deleteAudioFromDB(`${currentWord}_sentence`);
                showToast('✅ Sentence recording deleted');
                updateRecordingStatus();
            }
        };
    }

    if (deletePhonemeBtn) {
        deletePhonemeBtn.onclick = async () => {
            if (!currentSelectedSound?.sound) return showToast('Select a sound in the Sounds guide first.');
            const key = `phoneme_${currentSelectedSound.sound}`;
            if (confirm(`Delete the phoneme recording for "${currentSelectedSound.sound}"?`)) {
                await deleteAudioFromDB(key);
                clearPhonemeCache(currentSelectedSound.sound);
                showToast('✅ Phoneme recording deleted');
                updateRecordingStatus();
            }
        };
    }

    if (deleteAllWordBtn) {
        deleteAllWordBtn.onclick = async () => {
            if (confirm('Delete all word recordings? This cannot be undone.')) {
                const count = await deleteAudioByFilter(key => key.endsWith('_word'));
                showToast(`✅ Deleted ${count} word recording${count === 1 ? '' : 's'}`);
                updateRecordingStatus();
            }
        };
    }

    if (deleteAllSentenceBtn) {
        deleteAllSentenceBtn.onclick = async () => {
            if (confirm('Delete all sentence recordings? This cannot be undone.')) {
                const count = await deleteAudioByFilter(key => key.endsWith('_sentence'));
                showToast(`✅ Deleted ${count} sentence recording${count === 1 ? '' : 's'}`);
                updateRecordingStatus();
            }
        };
    }

    if (deleteAllBtn) {
        deleteAllBtn.onclick = async () => {
            if (confirm('Delete all your voice recordings? This cannot be undone.')) {
                await clearAllTeacherRecordings();
            }
        };
    }
}

function updateRecordingStatus() {
    const statusText = document.getElementById('recording-count');
    if (!statusText) return;

    countRecordingsByType().then(counts => {
        const total = counts.total || 0;
        if (total > 0) {
            statusText.textContent = `${counts.word} word • ${counts.sentence} sentence${counts.sentence === 1 ? '' : 's'} recorded`;
            localStorage.setItem('hasRecordings', 'true');
        } else {
            statusText.textContent = 'No recordings yet';
            localStorage.setItem('hasRecordings', 'false');
        }
    });
}

async function clearAllTeacherRecordings() {
    const database = await ensureDBReady();
    if (!database) {
        showToast('❌ No recordings to delete');
        return;
    }

    return new Promise((resolve) => {
        const transaction = database.transaction(STORE_NAME, "readwrite");
        const store = transaction.objectStore(STORE_NAME);
        const request = store.clear();

        request.onsuccess = () => {
            showToast('✅ All recordings deleted');
            localStorage.setItem('hasRecordings', 'false');
            clearAllPhonemeCache();
            updateRecordingStatus();
            updateVoiceIndicator();
            resolve(true);
        };

        request.onerror = () => {
            showToast('❌ Error deleting recordings');
            resolve(false);
        };
    });
}

function updateVoiceIndicator() {
    const indicator = document.getElementById('voice-indicator');
    const indicatorText = document.getElementById('voice-indicator-text');
    
    if (!indicator || !indicatorText) return;
    
    // Check if teacher recordings are enabled and exist
    const useTeacherVoice = localStorage.getItem('useTeacherRecordings') !== 'false';
    const hasRecordings = localStorage.getItem('hasRecordings') === 'true';
    
    if (useTeacherVoice && hasRecordings) {
        indicator.style.display = 'block';
        indicatorText.textContent = '🎤 Using teacher\'s voice';
    } else {
        indicator.style.display = 'none';
    }
}

function handleTeacherSubmit() {
    const input = document.getElementById("quick-custom-word-input");
    if (!input) return;
    applyCustomWordChallenge(input.value, { source: 'teacher' });
    input.value = '';
}

function closeModal() {
    const wasGameModalOpen = !gameModal.classList.contains("hidden");
    const wasBonusModalOpen = !document.getElementById('bonus-modal')?.classList.contains("hidden");
    cancelAutoPlayReveal();
    stopAllActiveAudioPlayers();
    stopDecodableFollowAlong({ clearHighlights: true });
    cancelPendingSpeech(true);
    
    modalOverlay.classList.add("hidden");
    welcomeModal.classList.add("hidden");
    teacherModal.classList.add("hidden");
    gameModal.classList.add("hidden");
    studioModal.classList.add("hidden");
    const howtoModal = document.getElementById("howto-modal");
    const assessmentModal = document.getElementById("assessment-modal");
    const corePhonicsModal = document.getElementById("core-phonics-modal");
    const adventureModal = document.getElementById("adventure-modal");
    if (howtoModal) howtoModal.classList.add("hidden");
    if (assessmentModal) assessmentModal.classList.add("hidden");
    if (corePhonicsModal) corePhonicsModal.classList.add("hidden");
    if (adventureModal) adventureModal.classList.add("hidden");
    
    // Close new modals
    const decodableModal = document.getElementById("decodable-modal");
    const progressModal = document.getElementById("progress-modal");
    const phonemeModal = document.getElementById("phoneme-modal");
    const helpModal = document.getElementById("help-modal");
    const bonusModal = document.getElementById("bonus-modal");
    const infoModal = document.getElementById("info-modal");
    if (decodableModal) decodableModal.classList.add("hidden");
    if (progressModal) progressModal.classList.add("hidden");
    if (phonemeModal) {
        phonemeModal.classList.add("hidden");
        clearSoundSelection();
    }
    if (helpModal) helpModal.classList.add("hidden");
    if (bonusModal) bonusModal.classList.add("hidden");
    if (infoModal) infoModal.classList.add("hidden");
    stopPronunciationCheck();
    if (practiceRecorder.mediaRecorder && practiceRecorder.mediaRecorder.state === 'recording') {
        practiceRecorder.mediaRecorder.stop();
    }
    releasePracticeStream();
    if (mediaRecorder && mediaRecorder.state === 'recording') {
        try { mediaRecorder.stop(); } catch (e) {}
    }
    releaseStudioStream();
    
    if (document.activeElement) document.activeElement.blur();
    document.body.focus();
    
    // Show bonus content if closing word modal after win
    if (wasGameModalOpen && sessionStorage.getItem('showBonusOnClose') === 'true') {
        sessionStorage.removeItem('showBonusOnClose');
        if (shouldShowBonusContent()) {
            // Show bonus first; new game starts when bonus is closed
            sessionStorage.setItem('startNewGameAfterBonus', 'true');
            setTimeout(() => showBonusContent(), 300);
            return; // Don't start new game yet
        }
    }
    
    // Auto-start new game after closing win/loss modal
    if (wasGameModalOpen && gameOver) {
        setTimeout(() => startNewGame(), 300);
    }
    
    // Auto-start new game after closing bonus modal
    if (wasBonusModalOpen && sessionStorage.getItem('startNewGameAfterBonus') === 'true') {
        sessionStorage.removeItem('startNewGameAfterBonus');
        if (gameOver) {
            setTimeout(() => startNewGame(), 300);
        }
    }

    document.body.classList.remove('adventure-open');
    setWarmupOpen(false);
    updateFunHudVisibility();
}

function showBanner(msg) {
    const b = document.getElementById("banner-container");
    b.textContent = msg;
    b.classList.remove("hidden");
    b.classList.add("visible"); 
    setTimeout(() => {
        b.classList.remove("visible");
        b.classList.add("hidden");
    }, 3000);
}

// FIX: New Non-Stacking Toast
function showToast(msg) {
    const container = document.getElementById("toast-container");
    container.innerHTML = ""; // Clear existing
    const t = document.createElement("div");
    t.className = "toast";
    t.textContent = msg;
    container.appendChild(t);
    setTimeout(() => t.remove(), 3000);
}

/* ==========================================
   Practice Recorder (Local-only, auto-delete)
   ========================================== */

async function ensurePracticeStream() {
    if (practiceRecorder.stream) return practiceRecorder.stream;
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        practiceRecorder.stream = stream;
        return stream;
    } catch (err) {
        showToast('Microphone access is needed to record.');
        throw err;
    }
}

function releasePracticeStream() {
    if (!practiceRecorder.stream) return;
    practiceRecorder.stream.getTracks().forEach(track => {
        try {
            track.stop();
        } catch (err) {
            // ignore stop errors
        }
    });
    practiceRecorder.stream = null;
}

function getPracticeRecording(key) {
    return practiceRecordings.get(key);
}

function clearPracticeRecording(key) {
    const existing = practiceRecordings.get(key);
    if (existing?.url) {
        URL.revokeObjectURL(existing.url);
    }
    practiceRecordings.delete(key);
    updatePracticeRecorderUI(key);
}

function clearPracticeGroup(prefix) {
    Array.from(practiceRecordings.keys()).forEach(key => {
        if (key.startsWith(prefix)) {
            clearPracticeRecording(key);
        }
    });
}

async function startPracticeRecording(key) {
    await ensurePracticeStream();
    if (practiceRecorder.mediaRecorder && practiceRecorder.mediaRecorder.state === 'recording') {
        practiceRecorder.mediaRecorder.stop();
    }

    const recorder = new MediaRecorder(practiceRecorder.stream);
    practiceRecorder.mediaRecorder = recorder;
    practiceRecorder.activeKey = key;
    practiceRecorder.chunks = [];

    recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
            practiceRecorder.chunks.push(event.data);
        }
    };

    recorder.onstop = () => {
        const blob = new Blob(practiceRecorder.chunks, { type: recorder.mimeType || 'audio/webm' });
        const url = URL.createObjectURL(blob);
        const existing = practiceRecordings.get(key);
        if (existing?.url) URL.revokeObjectURL(existing.url);
        practiceRecordings.set(key, { blob, url, createdAt: Date.now() });
        practiceRecorder.activeKey = null;
        practiceRecorder.chunks = [];
        updatePracticeRecorderUI(key);
        releasePracticeStream();
    };

    recorder.start();
    updatePracticeRecorderUI(key, true);
}

function stopPracticeRecording() {
    if (practiceRecorder.mediaRecorder && practiceRecorder.mediaRecorder.state === 'recording') {
        practiceRecorder.mediaRecorder.stop();
    }
}

async function togglePracticeRecording(key) {
    if (practiceRecorder.mediaRecorder && practiceRecorder.mediaRecorder.state === 'recording') {
        if (practiceRecorder.activeKey === key) {
            stopPracticeRecording();
            return;
        }
        stopPracticeRecording();
        setTimeout(() => startPracticeRecording(key), 150);
        return;
    }
    await startPracticeRecording(key);
}

function playPracticeRecording(key) {
    const recording = practiceRecordings.get(key);
    if (!recording?.url) return;
    const audio = new Audio(recording.url);
    audio.play();
}

function updatePracticeRecorderUI(key, isRecording = false) {
    const row = document.querySelector(`.practice-recorder[data-recorder-key="${key}"]`);
    if (!row) return;
    const recordBtn = row.querySelector('.practice-record');
    const playBtn = row.querySelector('.practice-play');
    const clearBtn = row.querySelector('.practice-clear');
    const status = row.querySelector('.practice-status');
    const hasRecording = !!practiceRecordings.get(key);

    if (recordBtn) recordBtn.textContent = isRecording ? 'Stop' : 'Record';
    if (recordBtn) recordBtn.classList.toggle('recording', isRecording);
    if (playBtn) playBtn.disabled = !hasRecording;
    if (clearBtn) clearBtn.disabled = !hasRecording;
    if (status) status.textContent = isRecording ? 'Recording…' : (hasRecording ? 'Ready' : 'Tap record');
}

function ensurePracticeRecorder(container, key, label) {
    if (!container) return;
    let row = container.querySelector(`.practice-recorder[data-recorder-key="${key}"]`);
    if (!row) {
        row = document.createElement('div');
        row.className = 'practice-recorder';
        row.dataset.recorderKey = key;
        row.innerHTML = `
            <span class="practice-label"></span>
            <span class="practice-status"></span>
            <button type="button" class="practice-record">Record</button>
            <button type="button" class="practice-play" disabled>Play</button>
            <button type="button" class="practice-clear" disabled>Redo</button>
        `;
        container.appendChild(row);
    }
    const labelEl = row.querySelector('.practice-label');
    if (labelEl) labelEl.textContent = label;
    const recordBtn = row.querySelector('.practice-record');
    const playBtn = row.querySelector('.practice-play');
    const clearBtn = row.querySelector('.practice-clear');
    if (recordBtn) recordBtn.onclick = () => togglePracticeRecording(key);
    if (playBtn) playBtn.onclick = () => playPracticeRecording(key);
    if (clearBtn) clearBtn.onclick = () => clearPracticeRecording(key);
    updatePracticeRecorderUI(key);
}

function clearAllPracticeRecordings() {
    if (practiceRecordings.size === 0) {
        showToast('No practice recordings to clear.');
        return;
    }
    if (!confirm('Clear all local practice recordings? This only removes audio stored on this device.')) return;
    if (practiceRecorder.mediaRecorder && practiceRecorder.mediaRecorder.state === 'recording') {
        practiceRecorder.mediaRecorder.stop();
    }
    Array.from(practiceRecordings.keys()).forEach(key => clearPracticeRecording(key));
    showToast('✅ Local practice recordings cleared');
}

function parsePracticeKey(key = '') {
    const [type, label] = key.split(':');
    return { type: type || 'unknown', label: label || '' };
}

function buildPracticePackCsv() {
    const header = ['Type', 'Label', 'Created At'];
    const rows = [];
    practiceRecordings.forEach((entry, key) => {
        const parsed = parsePracticeKey(key);
        const createdAt = entry?.createdAt ? new Date(entry.createdAt).toISOString() : '';
        rows.push([parsed.type, parsed.label, createdAt]);
    });
    return [header, ...rows].map(row => row.map(escapeCsv).join(',')).join('\n');
}

function downloadPracticePackCsv() {
    if (practiceRecordings.size === 0) {
        showToast('No practice recordings yet.');
        return;
    }
    const csv = buildPracticePackCsv();
    downloadCSV(csv, `practice_pack_${new Date().toISOString().split('T')[0]}.csv`);
}

function getAudioExtension(blob) {
    if (!blob?.type) return 'webm';
    if (blob.type.includes('mp4')) return 'm4a';
    if (blob.type.includes('wav')) return 'wav';
    if (blob.type.includes('mpeg')) return 'mp3';
    return 'webm';
}

async function downloadPracticeAudioBundle() {
    if (practiceRecordings.size === 0) {
        showToast('No practice recordings yet.');
        return;
    }
    const files = [];
    for (const [key, entry] of practiceRecordings.entries()) {
        const parsed = parsePracticeKey(key);
        if (!entry?.blob) continue;
        const ext = getAudioExtension(entry.blob);
        const safeLabel = (parsed.label || 'recording').toString().replace(/[^a-z0-9-_]+/gi, '_');
        const filename = `practice_${parsed.type}_${safeLabel}.${ext}`;
        const buffer = await entry.blob.arrayBuffer();
        files.push({ name: filename, data: new Uint8Array(buffer) });
    }
    if (!files.length) {
        showToast('No audio files found.');
        return;
    }
    const zip = createZipArchive(files);
    downloadBlob(zip, `practice_audio_${new Date().toISOString().split('T')[0]}.zip`);
}

function checkFirstTimeVisitor() {
    if (!localStorage.getItem("decode_v5_visited")) {
        modalOverlay.classList.remove("hidden");
        welcomeModal.classList.remove("hidden");
        localStorage.setItem("decode_v5_visited", "true");
    }
}

function clearKeyboardColors() {
    document.querySelectorAll(".key").forEach(k => {
        k.classList.remove("correct", "present", "absent");
    });
}

function isReducedStimulationEnabled() {
    try {
        if (document.body?.classList.contains("reduced-stimulation")) return true;
        const settings = window.DECODE_PLATFORM?.getSettings?.();
        return !!settings?.reducedStimulation;
    } catch {
        return false;
    }
}

function confetti() {
    if (isReducedStimulationEnabled()) return;
    // Create more confetti pieces spread across screen
    for (let i = 0; i < 80; i++) {
        const c = document.createElement("div");
        c.style.position = "fixed";
        c.style.left = (Math.random() * 100) + "vw"; // Spread across full width
        c.style.top = "-20px";
        c.style.width = (Math.random() * 6 + 6) + "px"; // Varied sizes 6-12px
        c.style.height = (Math.random() * 6 + 6) + "px";
        c.style.backgroundColor = `hsl(${Math.random() * 360}, 70%, 60%)`;
        c.style.borderRadius = Math.random() > 0.5 ? "50%" : "0"; // Mix circles and squares
        c.style.zIndex = "2000";
        c.style.opacity = "1";
        // Varied fall speeds for more natural effect
        const duration = (Math.random() * 0.8 + 1.2); // 1.2-2s
        c.style.transition = `top ${duration}s ease-in, opacity ${duration}s ease-in, transform ${duration}s ease-in`;
        document.body.appendChild(c);
        
        setTimeout(() => {
            c.style.top = "110vh";
            c.style.opacity = "0";
            c.style.transform = `rotate(${Math.random() * 360}deg)`; // Spin while falling
        }, 10);
        
        setTimeout(() => c.remove(), duration * 1000 + 100);
    }
}

const YOUNG_AUDIENCE_WORD_REPLACEMENTS = [
    [/\bguy\b/gi, 'person'],
    [/\bgross\b/gi, 'messy'],
    [/\bscary\b/gi, 'surprising'],
    [/\bcrazy\b/gi, 'silly'],
    [/\bterrible\b/gi, 'not great'],
    [/\bhurt\b/gi, 'feel sore'],
    [/\bhate\b/gi, 'do not enjoy'],
    [/\bfight scene\b/gi, 'action scene'],
    [/\bfight\b/gi, 'game'],
    [/\bcrash(?:ed|ing)?\b/gi, 'bumped'],
    [/\bshriek(?:ed|ing)?\b/gi, 'made a loud sound'],
    [/\bstupid\b/gi, 'tricky'],
    [/\bfreak(?:ed|ing)? out\b/gi, 'got startled'],
    [/\bawkwardly\b/gi, 'carefully']
];

const YOUNG_AUDIENCE_BLOCKLIST = /\b(kill|killed|dead|blood|drunk|weapon|gun|tax bill|middle finger|war|battle)\b/i;
const YOUNG_AUDIENCE_EXTRA_BLOCKLIST = [
    /\b(violence|violent|murder|murdered|corpse|knife|bomb|suicide|self-harm|shoot|shooting|attack)\b/i,
    /\b(booze|hangover|intoxicated)\b/i,
    /\b(sex|sexual|porn|nude|naked)\b/i,
    /\b(flipped\s+off|pointed\s+to\s+the\s+middle|inappropriate\s+gesture)\b/i,
    /\bsaw\s+the\s+tiny\b/i,
    /\b(zombie|booger(?:s)?|snot|slime|drool(?:ed|ing)?|poop|pee|fart|barf|vomit|puke)\b/i,
    /\b(lied\s+smoothly|tiny\s+sign)\b/i,
    /\b(hole\s+in\s+your\s+face|never\s+stops\s+talking)\b/i,
    /\b(distance\s+to\s+the\s+bathroom|warm\s+in\s+bed)\b/i,
    /\b(afraid\s+of\s+the\s+stapler|brain\s+store)\b/i,
    /\b(looks\s+like\s+a\s+crocodile\s+mouth|poop\s+on\s+my\s+hat)\b/i,
    /\b(tried\s+it\s+\(it\s+hurt\)|it\s+hurt)\b/i,
    /\b(underwear\s+for\s+your\s+foot|squishy\s+balls)\b/i,
    /\b(smells\s+like\s+milk|tiny\s+human|baby\s+elephant)\b/i,
    /\b(guy\s+who\s+tells\s+bad\s+jokes|falls\s+asleep\s+watching\s+movies)\b/i,
    /\b(gravity\s+pulling\s+you\s+down|surprise\s+hug\s+with\s+the\s+floor)\b/i
];
const SCHOOL_SAFE_REPLACEMENTS = [
    [/\bhate\b/gi, 'do not like'],
    [/\battacked?\b/gi, 'rushed toward'],
    [/\bslime\b/gi, 'smudge'],
    [/\bdrool(?:ed|ing)?\b/gi, 'made a small spill'],
    [/\bbooger(?:s)?\b/gi, 'sniffles'],
    [/\bzombie\b/gi, 'costume character'],
    [/\blied\s+smoothly\b/gi, 'spoke too quickly'],
    [/\bflipped\s+off\b/gi, 'made an unkind gesture'],
    [/\bmiddle\s+finger\b/gi, 'unkind gesture']
];
const REVEAL_TRAILING_WORDS_TO_TRIM = new Set([
    'a', 'an', 'the', 'this', 'that', 'these', 'those',
    'my', 'your', 'our', 'their', 'his', 'her',
    'and', 'or', 'but', 'to', 'for', 'with',
    'tiny', 'little', 'small'
]);
const KID_SAFE_TEXT_FALLBACKS = {
    en: {
        definition: (word) => `"${word}" is a school-safe practice word for reading, speaking, and writing clearly.`,
        sentence: (word) => `Example: "Our class used ${word} in a clear sentence during practice."`
    },
    es: {
        definition: (word) => `"${word}" es una palabra de clase para decodificar, leer y usar al explicar ideas.`,
        sentence: (word) => `Ejemplo: "Nuestra clase usó ${word} en una oración clara durante la práctica."`
    },
    zh: {
        definition: (word) => `"${word}" 是课堂练习词，可以用来练习解码、阅读和表达想法。`,
        sentence: (word) => `示例：“我们在练习时把 ${word} 用在了一个清晰的句子里。”`
    },
    tl: {
        definition: (word) => `"${word}" ay salitang pang-klase para sa pagde-decode, pagbasa, at malinaw na paliwanag.`,
        sentence: (word) => `Halimbawa: "Ginamit ng klase ang ${word} sa malinaw na pangungusap habang nagpa-practice."`
    },
    vi: {
        definition: (word) => `"${word}" là từ luyện tập trên lớp để giải mã, đọc và diễn đạt ý rõ ràng.`,
        sentence: (word) => `Ví dụ: "Lớp em dùng ${word} trong một câu rõ ràng khi luyện tập."`
    },
    ms: {
        definition: (word) => `"${word}" ialah perkataan kelas untuk latihan menyahkod, membaca, dan menerangkan idea.`,
        sentence: (word) => `Contoh: "Kelas kami guna ${word} dalam ayat yang jelas semasa latihan."`
    },
    hi: {
        definition: (word) => `"${word}" कक्षा में पढ़ने, समझने और साफ़ बोलने के लिए अभ्यास शब्द है।`,
        sentence: (word) => `उदाहरण: "हमारी कक्षा ने अभ्यास के दौरान ${word} का स्पष्ट वाक्य में उपयोग किया।"`
    },
    ar: {
        definition: (word) => `"${word}" كلمة تدريب صفية للقراءة والفهم والتعبير الواضح.`,
        sentence: (word) => `مثال: "استخدم فصلنا كلمة ${word} في جملة واضحة أثناء التدريب."`
    },
    ko: {
        definition: (word) => `"${word}" 는 읽기와 이해, 또렷한 말하기를 위한 수업 연습 단어입니다.`,
        sentence: (word) => `예시: "우리 반은 연습 시간에 ${word} 를 넣어 또렷한 문장을 만들었어요."`
    },
    ja: {
        definition: (word) => `"${word}" は、読む・理解する・はっきり話す練習のための授業用語です。`,
        sentence: (word) => `例: "わたしたちのクラスは練習中に ${word} を使って分かりやすい文を作りました。"`
    }
};
const SCHOOL_SAFE_REVEAL_OVERRIDES = {
    theme: {
        definition: 'The main idea that ties parts of a story, lesson, or event together.',
        sentence: 'Our class party theme was space, so we made star hats and planet signs.'
    },
    claim: {
        definition: 'To say something belongs to you or is true.',
        sentence: 'Mina raised her hand to claim the reading chair before recess.'
    },
    plea: {
        definition: 'A strong request for help.',
        sentence: 'Leo made a polite plea for one more minute to finish his puzzle.'
    },
    fern: {
        definition: 'A green plant with feathery leaves.',
        sentence: 'The fern near the window grew taller after we watered it.'
    },
    horse: {
        definition: 'A large farm animal that can carry people and pull carts.',
        sentence: 'The horse trotted around the field while we counted its steps.'
    },
    dislike: {
        definition: 'To not enjoy something very much.',
        sentence: 'I dislike soggy cereal, so I eat it right away.'
    },
    oil: {
        definition: 'A smooth liquid used in cooking and in machines.',
        sentence: 'We added a little oil to the pan before cooking vegetables.'
    },
    cow: {
        definition: 'A large farm animal that gives milk.',
        sentence: 'The cow chewed grass slowly in the sunny field.'
    },
    backpack: {
        definition: 'A bag you carry on your back for school items.',
        sentence: 'I zipped my backpack and checked that my notebook was inside.'
    },
    quickly: {
        definition: 'At a fast speed.',
        sentence: 'We quickly lined up when the bell rang.'
    },
    if: {
        definition: 'A word used to show a condition or choice.',
        sentence: '"If it rains, we will read indoors."'
    },
    far: {
        definition: 'A long distance away.',
        sentence: 'The library is far from our class, so we walk together.'
    },
    nose: {
        definition: 'The part of your face used for breathing and smelling.',
        sentence: 'My nose feels cold when I walk outside in winter.'
    },
    butter: {
        definition: 'A soft food spread made from cream.',
        sentence: 'We spread butter on warm toast at breakfast.'
    },
    park: {
        definition: 'An outdoor place with grass, trees, and play areas.',
        sentence: 'We met at the park and played tag near the swings.'
    },
    hair: {
        definition: 'The strands that grow on your head.',
        sentence: 'I brushed my hair before school.'
    },
    blood: {
        definition: 'The red liquid in your body that carries oxygen.',
        sentence: 'In science, we learned that blood helps move oxygen through the body.'
    },
    thermal: {
        definition: 'Designed to keep heat in and keep you warm.',
        sentence: 'I wore thermal socks on the cold morning walk.'
    },
    cyclone: {
        definition: 'A powerful spinning wind storm.',
        sentence: 'The weather map showed a cyclone far out at sea.'
    },
    above: {
        definition: 'Higher than something else.',
        sentence: 'The kite flew above the trees.'
    },
    toward: {
        definition: 'In the direction of something.',
        sentence: 'We walked toward the gym when music started.'
    },
    during: {
        definition: 'At the same time as something else.',
        sentence: 'I took notes during the lesson.'
    },
    suddenly: {
        definition: 'Happening quickly and without warning.',
        sentence: 'Suddenly, the lights turned on and the room got bright.'
    },
    slip: {
        definition: 'To lose your footing for a moment.',
        sentence: 'I started to slip on the wet floor, then caught the rail.'
    },
    mouth: {
        definition: 'The part of your face you use to speak, smile, and eat.',
        sentence: 'I opened my mouth wide so the dentist could check my teeth.'
    },
    baby: {
        definition: 'A very young child who needs care and comfort.',
        sentence: 'The baby smiled and waved at everyone in the room.'
    },
    web: {
        definition: 'A thin net made by a spider.',
        sentence: 'A silver web shined in the morning light near the fence.'
    },
    solo: {
        definition: 'A part performed by one person.',
        sentence: 'Nia sang a solo at the class concert.'
    },
    steep: {
        definition: 'Rising quickly at a sharp angle.',
        sentence: 'The hill was steep, so we climbed slowly and stayed together.'
    },
    star: {
        definition: 'A bright object in the night sky.',
        sentence: 'We counted stars after sunset.'
    },
    misfit: {
        definition: 'Something that does not match the group.',
        sentence: 'This puzzle piece is a misfit in this corner.'
    },
    gnat: {
        definition: 'A very small flying insect.',
        sentence: 'A gnat buzzed near the window.'
    },
    cage: {
        definition: 'A safe enclosure for an animal.',
        sentence: 'The rabbit rested in its cage after playtime.'
    },
    spider: {
        definition: 'A small animal with eight legs that can spin webs.',
        sentence: 'A spider built a web between two plants in the garden.'
    },
    mouse: {
        definition: 'A small furry animal.',
        sentence: 'A mouse nibbled a seed near the hedge.'
    },
    toothbrush: {
        definition: 'A brush used to clean your teeth.',
        sentence: 'I used my toothbrush after breakfast.'
    },
    got: {
        definition: 'Received or obtained something.',
        sentence: 'I got my library card and checked out a new book.'
    },
    big: {
        definition: 'Large in size.',
        sentence: 'The big box held all our art supplies.'
    },
    soup: {
        definition: 'A warm liquid food with vegetables, noodles, or other ingredients.',
        sentence: 'The soup smelled warm and delicious at lunch.'
    },
    tea: {
        definition: 'A drink made by steeping tea leaves in hot water.',
        sentence: 'Grandma cooled her tea before taking a sip.'
    },
    fly: {
        definition: 'A small flying insect.',
        sentence: 'A fly buzzed near the window.'
    },
    frog: {
        definition: 'A small jumping animal that lives near water.',
        sentence: 'The frog hopped across a wet rock.'
    },
    hiccup: {
        definition: 'A quick sound and movement in your throat that happens by surprise.',
        sentence: 'I got a hiccup and took slow breaths until it stopped.'
    },
    laugh: {
        definition: 'To make happy sounds when something is funny.',
        sentence: 'We laughed at the class puppet show.'
    },
    monster: {
        definition: 'An imaginary creature in stories and games.',
        sentence: 'In our story, the monster turned out to be friendly.'
    },
    scared: {
        definition: 'Feeling worried or afraid.',
        sentence: 'I felt scared during the storm, so I sat with my family.'
    },
    dot: {
        definition: 'A small round mark.',
        sentence: 'I put a dot at the end of my design.'
    },
    construct: {
        definition: 'To build or put something together.',
        sentence: 'We used blocks to construct a tall tower.'
    },
    crawl: {
        definition: 'To move close to the ground on hands and knees.',
        sentence: 'The baby learned to crawl across the rug.'
    },
    hairy: {
        definition: 'Covered with a lot of hair.',
        sentence: 'The dog looked hairy after rolling in the grass.'
    },
    mosquito: {
        definition: 'A small flying insect that can bite.',
        sentence: 'We used bug spray to keep mosquitoes away.'
    },
    force: {
        definition: 'Strength used to push or pull something.',
        sentence: 'We used gentle force to open the heavy library door.'
    },
    dog: {
        definition: 'A loyal animal that can be trained to help, play, and keep people company.',
        sentence: 'The dog waited by the door and wagged its tail when we came home.'
    },
    stress: {
        definition: 'A heavy feeling that can show up when work feels hard.',
        sentence: 'When I felt stress, I took a breath and finished one step at a time.'
    },
    gross: {
        definition: 'A word for something that feels or smells unpleasant.',
        sentence: 'The old food smelled gross, so we cleaned the lunchbox right away.'
    },
    trunk: {
        definition: 'An elephant’s long nose used for grabbing, spraying, and smelling.',
        sentence: 'The elephant used its trunk to lift a stick and splash water.'
    },
    snort: {
        definition: 'A short burst of air from your nose, often during a big laugh.',
        sentence: 'The class started to laugh, and one kid let out a tiny snort.'
    },
    fetch: {
        definition: 'To go get something and bring it back.',
        sentence: 'Please fetch the marker from the table so we can keep writing.'
    },
    eat: {
        definition: 'To put food in your mouth and chew it.',
        sentence: 'We sit down to eat lunch before we go outside.'
    },
    butterfly: {
        definition: 'A colorful insect with wings that starts life as a caterpillar.',
        sentence: 'A butterfly landed on the flower and opened its wings in the sun.'
    },
    snowman: {
        definition: 'A figure made from rolled snow.',
        sentence: 'We built a snowman and gave it a scarf and button eyes.'
    },
    fearless: {
        definition: 'Feeling brave when trying something hard.',
        sentence: 'Nia felt fearless as she read her poem to the class.'
    },
    knight: {
        definition: 'A historical soldier who wore armor.',
        sentence: 'In the story, the knight rode to the castle gate.'
    },
    "it's": {
        definition: 'A short form of "it is" or "it has".',
        sentence: '"It\'s time to line up," the teacher said with a smile.'
    },
    fall: {
        definition: 'To move downward from a higher place.',
        sentence: 'The leaf began to fall when the wind picked up.'
    },
    some: {
        definition: 'An amount that is not all, but more than a little.',
        sentence: 'I saved some crackers for later in the day.'
    },
    eye: {
        definition: 'The part of your face used for seeing.',
        sentence: 'My eye blinked fast when bright light came in the window.'
    },
    sock: {
        definition: 'A soft piece of clothing worn on your foot.',
        sentence: 'I put on dry socks after recess in the rain.'
    },
    room: {
        definition: 'A space inside a building with a specific use.',
        sentence: 'We cleaned the room before starting our project.'
    },
    dad: {
        definition: 'A father in a family.',
        sentence: 'My dad read the story with me before bed.'
    },
    sneeze: {
        definition: 'A sudden burst of air from your nose and mouth.',
        sentence: 'I covered my mouth when I had to sneeze.'
    },
    snore: {
        definition: 'A breathing sound some people make while sleeping.',
        sentence: 'My brother can snore loudly after a long day.'
    },
    pink: {
        definition: 'A color between red and white.',
        sentence: 'She used a pink marker for the title on her poster.'
    },
    stapler: {
        definition: 'A tool that joins papers with a small metal staple.',
        sentence: 'We used the stapler to keep the packet pages together.'
    },
    reflection: {
        definition: 'The image you see in a mirror or shiny surface.',
        sentence: 'I could see my reflection in the classroom window.'
    }
};

function cleanAudienceText(value) {
    return String(value || '')
        .replace(/[“”]/g, '"')
        .replace(/[‘’]/g, "'")
        .replace(/\s+/g, ' ')
        .trim();
}

function countWords(value) {
    const text = cleanAudienceText(value);
    if (!text) return 0;
    return text.split(/\s+/).filter(Boolean).length;
}

function truncateWords(value, maxWords) {
    const text = cleanAudienceText(value);
    if (!text) return '';
    const words = text.split(/\s+/).filter(Boolean);
    if (words.length <= maxWords) return text;
    const clippedWords = words.slice(0, maxWords);
    while (clippedWords.length > 6) {
        const tail = String(clippedWords[clippedWords.length - 1] || '').replace(/[^\p{L}']/gu, '').toLowerCase();
        if (!REVEAL_TRAILING_WORDS_TO_TRIM.has(tail)) break;
        clippedWords.pop();
    }
    const clipped = clippedWords.join(' ').replace(/[,:;]+$/, '');
    return `${clipped}.`;
}

function ensureEndingPunctuation(value) {
    const text = cleanAudienceText(value);
    if (!text) return '';
    if (/[.!?]$/.test(text)) return text;
    return `${text}.`;
}

function ensureEndingPunctuationForLanguage(value, languageCode = 'en') {
    const text = cleanAudienceText(value);
    if (!text) return '';
    const lang = normalizePackedTtsLanguage(languageCode);
    if (lang === 'zh') {
        if (/[。！？]$/.test(text)) return text;
        return `${text}。`;
    }
    if (lang === 'hi') {
        if (/[।॥!?]$/.test(text)) return text;
        return `${text}।`;
    }
    return ensureEndingPunctuation(text);
}

function applySchoolSafeReplacements(value, languageCode = 'en') {
    const lang = normalizePackedTtsLanguage(languageCode);
    let text = cleanAudienceText(value);
    if (!text) return '';
    if (lang !== 'en') return text;
    SCHOOL_SAFE_REPLACEMENTS.forEach(([pattern, replacement]) => {
        text = text.replace(pattern, replacement);
    });
    return text;
}

function applyYoungAudienceReplacements(value) {
    let text = cleanAudienceText(value);
    YOUNG_AUDIENCE_WORD_REPLACEMENTS.forEach(([pattern, replacement]) => {
        text = text.replace(pattern, replacement);
    });
    return text;
}

function normalizeAudienceRolePathway(value) {
    const raw = String(value || '').trim().toLowerCase();
    if (!raw) return '';
    if (raw === 'ell' || raw === 'esl') return 'eal';
    return raw;
}

function getCurrentAudienceRolePathway() {
    const bodyRole = normalizeAudienceRolePathway(document.body?.dataset?.rolePathway || '');
    if (bodyRole) return bodyRole;
    return normalizeAudienceRolePathway(localStorage.getItem(HOME_ROLE_STORAGE_KEY) || '');
}

function getKidSafeFallbackText(word, field = 'definition', languageCode = 'en') {
    const lang = normalizePackedTtsLanguage(languageCode);
    const fallbackSet = KID_SAFE_TEXT_FALLBACKS[lang] || KID_SAFE_TEXT_FALLBACKS.en;
    const fallbackBuilder = field === 'sentence' ? fallbackSet.sentence : fallbackSet.definition;
    return fallbackBuilder(String(word || '').toLowerCase());
}

function getSchoolSafeOverrideText(word, field = 'definition', languageCode = 'en') {
    const lang = normalizePackedTtsLanguage(languageCode);
    if (lang !== 'en') return '';
    const key = String(word || '').trim().toLowerCase();
    if (!key) return '';
    const entry = SCHOOL_SAFE_REVEAL_OVERRIDES[key];
    if (!entry || typeof entry !== 'object') return '';
    const text = field === 'sentence' ? entry.sentence : entry.definition;
    return cleanAudienceText(text || '');
}

function trimToFirstSentence(text = '') {
    const cleaned = cleanAudienceText(text);
    if (!cleaned) return '';
    const split = cleaned.split(/(?<=[.!?。！？])\s+/);
    return split[0] || cleaned;
}

function truncateForAudienceLanguage(value, languageCode = 'en', maxWords = 16) {
    const cleaned = cleanAudienceText(value);
    if (!cleaned) return '';
    const lang = normalizePackedTtsLanguage(languageCode);
    if (lang === 'zh') {
        if (cleaned.length <= 32) return cleaned;
        return `${cleaned.slice(0, 31).replace(/[，、,:;]+$/, '')}…`;
    }
    if (countWords(cleaned) <= maxWords) return cleaned;
    return truncateWords(cleaned, maxWords);
}

function isYoungAudienceUnsafeText(value) {
    if (!value) return false;
    const text = cleanAudienceText(value);
    if (!text) return false;
    if (YOUNG_AUDIENCE_BLOCKLIST.test(text)) return true;
    return YOUNG_AUDIENCE_EXTRA_BLOCKLIST.some((pattern) => pattern.test(text));
}

function buildKidSafeAudienceText(rawText, {
    word = '',
    field = 'definition',
    languageCode = 'en'
} = {}) {
    const lang = normalizePackedTtsLanguage(languageCode);
    let text = cleanAudienceText(rawText);
    text = applySchoolSafeReplacements(text, lang);
    if (lang === 'en') {
        text = applyYoungAudienceReplacements(text);
    }
    text = trimToFirstSentence(text);

    const maxWords = field === 'sentence' ? 18 : 16;
    text = truncateForAudienceLanguage(text, lang, maxWords);

    if (!text || isYoungAudienceUnsafeText(text)) {
        return getKidSafeFallbackText(word, field, lang);
    }
    return ensureEndingPunctuationForLanguage(text, lang);
}

function cloneWordEntry(entry = {}) {
    if (!entry || typeof entry !== 'object') return {};
    const clone = { ...entry };
    Object.keys(clone).forEach((key) => {
        const value = clone[key];
        if (value && typeof value === 'object' && !Array.isArray(value)) {
            clone[key] = { ...value };
        } else if (Array.isArray(value)) {
            clone[key] = value.slice();
        }
    });
    return clone;
}

function getYoungAudienceOverridesSource() {
    const source = window.YOUNG_AUDIENCE_OVERRIDES;
    if (!source || typeof source !== 'object') return {};
    return source;
}

function getYoungOverrideWordCount() {
    return Object.keys(getYoungAudienceOverridesSource()).length;
}

function normalizeYoungOverrideText(value, languageCode = 'en') {
    const text = cleanAudienceText(value);
    if (!text) return '';
    return ensureEndingPunctuationForLanguage(text, languageCode);
}

function getFieldOverrideKeys(field = 'definition') {
    if (field === 'sentence') {
        return ['sentence_young', 'sent_young', 'sentenceYoung'];
    }
    return ['def_young', 'definition_young', 'defYoung'];
}

function readOverrideTextFromContainer(container, field = 'definition', languageCode = 'en') {
    if (!container || typeof container !== 'object') return '';
    const keys = getFieldOverrideKeys(field);
    for (const key of keys) {
        const value = container[key];
        if (typeof value === 'string' && value.trim()) {
            return normalizeYoungOverrideText(value, languageCode);
        }
    }
    return '';
}

function getManualYoungOverride(word, languageCode = 'en', field = 'definition') {
    const key = String(word || '').trim().toLowerCase();
    if (!key) return '';
    const overrides = getYoungAudienceOverridesSource();
    const entry = overrides[key];
    if (!entry || typeof entry !== 'object') return '';

    const lang = normalizePackedTtsLanguage(languageCode);
    const langContainer = (entry[lang] && typeof entry[lang] === 'object') ? entry[lang] : null;
    const enContainer = (entry.en && typeof entry.en === 'object') ? entry.en : null;

    let text = readOverrideTextFromContainer(langContainer, field, lang);
    if (!text) text = readOverrideTextFromContainer(entry, field, lang);
    if (!text && lang !== 'en') text = readOverrideTextFromContainer(enContainer, field, 'en');
    if (!text && lang !== 'en') text = readOverrideTextFromContainer(entry, field, 'en');
    return text;
}

function buildKidSafeEntryVariant(word, entry = {}) {
    const safeEntry = cloneWordEntry(entry);
    ['en', 'es', 'zh', 'tl', 'vi', 'ms', 'hi'].forEach((langCode) => {
        const langEntry = (entry?.[langCode] && typeof entry[langCode] === 'object')
            ? entry[langCode]
            : null;
        if (!langEntry) return;
        const manualDef = getManualYoungOverride(word, langCode, 'definition');
        const manualSentence = getManualYoungOverride(word, langCode, 'sentence');
        const safeManualDef = manualDef
            ? buildKidSafeAudienceText(manualDef, { word, field: 'definition', languageCode: langCode })
            : '';
        const safeManualSentence = manualSentence
            ? buildKidSafeAudienceText(manualSentence, { word, field: 'sentence', languageCode: langCode })
            : '';
        safeEntry[langCode] = {
            ...langEntry,
            def: safeManualDef || buildKidSafeAudienceText(langEntry.def, {
                word,
                field: 'definition',
                languageCode: langCode
            }),
            sentence: safeManualSentence || buildKidSafeAudienceText(langEntry.sentence, {
                word,
                field: 'sentence',
                languageCode: langCode
            })
        };
    });

    const manualRootDef = getManualYoungOverride(word, 'en', 'definition');
    const manualRootSentence = getManualYoungOverride(word, 'en', 'sentence');
    const safeManualRootDef = manualRootDef
        ? buildKidSafeAudienceText(manualRootDef, { word, field: 'definition', languageCode: 'en' })
        : '';
    const safeManualRootSentence = manualRootSentence
        ? buildKidSafeAudienceText(manualRootSentence, { word, field: 'sentence', languageCode: 'en' })
        : '';

    if (safeEntry.def || safeEntry.sentence || safeManualRootDef || safeManualRootSentence) {
        safeEntry.def = safeManualRootDef || buildKidSafeAudienceText(safeEntry.def, {
            word,
            field: 'definition',
            languageCode: 'en'
        });
        safeEntry.sentence = safeManualRootSentence || buildKidSafeAudienceText(safeEntry.sentence, {
            word,
            field: 'sentence',
            languageCode: 'en'
        });
    }

    if (safeEntry.en && typeof safeEntry.en === 'object') {
        if (safeManualRootDef) safeEntry.en.def = safeManualRootDef;
        if (safeManualRootSentence) safeEntry.en.sentence = safeManualRootSentence;
    }

    return safeEntry;
}

function getWordEntriesSource() {
    if (window.WORD_ENTRIES && typeof window.WORD_ENTRIES === 'object') return window.WORD_ENTRIES;
    if (typeof WORDS_DATA !== 'undefined' && WORDS_DATA && typeof WORDS_DATA === 'object') return WORDS_DATA;
    return {};
}

function getKidSafeWordEntries() {
    const source = getWordEntriesSource();
    const sourceSize = Object.keys(source).length;
    const overrideSize = getYoungOverrideWordCount();
    if (
        kidSafeWordEntriesCache
        && kidSafeWordEntriesSourceSize === sourceSize
        && kidSafeWordEntriesOverrideSize === overrideSize
    ) {
        return kidSafeWordEntriesCache;
    }
    const safe = {};
    Object.keys(source).forEach((word) => {
        safe[word] = buildKidSafeEntryVariant(word, source[word]);
    });
    kidSafeWordEntriesCache = safe;
    kidSafeWordEntriesSourceSize = sourceSize;
    kidSafeWordEntriesOverrideSize = overrideSize;
    return kidSafeWordEntriesCache;
}

function getWordEntryForAudience(word, mode = getResolvedAudienceMode()) {
    const key = String(word || '').trim().toLowerCase();
    if (!key) return null;
    if (normalizeAudienceMode(mode) === 'young-eal') {
        const safeEntries = getKidSafeWordEntries();
        if (safeEntries?.[key]) return safeEntries[key];
    }
    return getWordEntriesSource()?.[key] || null;
}

function getWordCopyForAudience(word, languageCode = 'en', mode = getResolvedAudienceMode()) {
    const key = String(word || '').trim().toLowerCase();
    if (!key) return { definition: '', sentence: '', languageCode: normalizePackedTtsLanguage(languageCode) };
    const lang = normalizePackedTtsLanguage(languageCode);
    const entry = getWordEntryForAudience(key, mode);
    const englishCopy = entry?.en || entry || null;
    const localizedCopy = lang === 'en'
        ? englishCopy
        : ((entry?.[lang] && typeof entry[lang] === 'object') ? entry[lang] : null);
    return {
        word: cleanAudienceText(
            lang === 'en'
                ? ''
                : (localizedCopy?.word || localizedCopy?.label || '')
        ),
        definition: cleanAudienceText(
            lang === 'en'
                ? (englishCopy?.def || entry?.def || '')
                : (localizedCopy?.def || '')
        ),
        sentence: cleanAudienceText(
            lang === 'en'
                ? (englishCopy?.sentence || entry?.sentence || '')
                : (localizedCopy?.sentence || '')
        ),
        languageCode: lang,
        hasLocalizedCopy: !!(localizedCopy?.def || localizedCopy?.sentence)
    };
}

function getResolvedAudienceMode() {
    const explicit = normalizeAudienceMode(appSettings.audienceMode || 'auto');
    if (explicit !== 'auto') return explicit;

    const profile = window.DECODE_PLATFORM?.getProfile?.() || {};
    const gradeBand = normalizeGradeBandForAudience(profile.gradeBand || '');
    const uiLook = getUiLookValue();
    const rolePathway = getCurrentAudienceRolePathway();
    const translationLockedNonEnglish = !!appSettings.translation?.pinned && appSettings.translation?.lang && appSettings.translation.lang !== 'en';
    const translationDefaultNonEnglish = !!appSettings.translation?.lang && appSettings.translation.lang !== 'en';

    if (
        gradeBand === 'K-2'
        || uiLook === 'k2'
        || translationLockedNonEnglish
        || translationDefaultNonEnglish
        || YOUNG_AUDIENCE_ROLE_PATHWAYS.has(rolePathway)
    ) {
        return 'young-eal';
    }
    return 'general';
}

function sanitizeRevealText(value, {
    word = '',
    field = 'definition',
    languageCode = 'en',
    allowFallback = true,
    maxWords = null
} = {}) {
    const lang = normalizePackedTtsLanguage(languageCode);
    const manualOverride = getSchoolSafeOverrideText(word, field, lang);
    if (manualOverride) {
        return ensureEndingPunctuationForLanguage(manualOverride, lang);
    }
    let text = trimToFirstSentence(value);
    text = applySchoolSafeReplacements(text, lang);
    const limit = Number.isFinite(maxWords) && maxWords > 0
        ? Math.max(6, Math.min(32, maxWords))
        : (field === 'sentence' ? 24 : 20);
    text = truncateForAudienceLanguage(text, lang, limit);
    if (!text || isYoungAudienceUnsafeText(text)) {
        return allowFallback ? getKidSafeFallbackText(word, field, lang) : '';
    }
    return ensureEndingPunctuationForLanguage(text, lang);
}

function simplifyRevealDefinition(definitionText, word, languageCode = 'en') {
    return buildKidSafeAudienceText(definitionText, {
        word,
        field: 'definition',
        languageCode
    });
}

function simplifyRevealSentence(sentenceText, word, languageCode = 'en') {
    return buildKidSafeAudienceText(sentenceText, {
        word,
        field: 'sentence',
        languageCode
    });
}

function adaptRevealCopyForAudience(definitionText, sentenceText, word, options = {}) {
    const mode = normalizeAudienceMode(options.mode || getResolvedAudienceMode());
    const languageCode = normalizePackedTtsLanguage(options.languageCode || 'en');
    if (mode !== 'young-eal') {
        return {
            definition: sanitizeRevealText(definitionText, {
                word,
                field: 'definition',
                languageCode,
                allowFallback: true,
                maxWords: 24
            }),
            sentence: sanitizeRevealText(sentenceText, {
                word,
                field: 'sentence',
                languageCode,
                allowFallback: true,
                maxWords: 30
            }),
            mode
        };
    }

    return {
        definition: simplifyRevealDefinition(definitionText, word, languageCode),
        sentence: simplifyRevealSentence(sentenceText, word, languageCode),
        mode
    };
}

function ensureAudienceModeNote() {
    if (!gameModal) return null;
    const modalContent = gameModal.querySelector('.modal-content') || gameModal;
    if (!modalContent) return null;
    let note = document.getElementById('audience-mode-note');
    if (!note) {
        note = document.createElement('div');
        note.id = 'audience-mode-note';
        note.className = 'audience-mode-note hidden';
        const sentenceEl = modalContent.querySelector('#modal-sentence');
        if (sentenceEl && sentenceEl.parentElement) {
            sentenceEl.insertAdjacentElement('afterend', note);
        } else {
            modalContent.appendChild(note);
        }
    }
    return note;
}

function renderAudienceModeNote(mode) {
    const note = ensureAudienceModeNote();
    if (!note) return;
    if (mode === 'young-eal') {
        note.textContent = 'Young/EAL-friendly language mode is on.';
        note.classList.remove('hidden');
    } else {
        note.textContent = '';
        note.classList.add('hidden');
    }
}

/* ==========================================
   BONUS CONTENT SYSTEM
   ========================================== */

const BONUS_CONTENT = {
    jokes: [
        "What do you call cheese that is not yours? Nacho cheese.",
        "Why did the student bring a ladder to music class? To reach the high notes.",
        "Why did the math book look worried? It had too many problems.",
        "Why did the broom miss first period? It swept in.",
        "What did one pencil say to the other? Write on.",
        "Why did the computer go to class? To improve its byte skills.",
        "What did the ocean say to the beach? Nothing, it just waved.",
        "Why did the cookie go to the nurse? It felt crummy.",
        "Why did the calendar feel proud? Its days were numbered in order.",
        "What did one plate say to the other plate? Dinner is on me.",
        "Why did the moon skip breakfast? It was already full.",
        "What did one wall say to the other wall? I will meet you at the corner.",
        "Why did the eraser feel calm? It knew mistakes can be fixed.",
        "Why did the notebook bring a sweater? It had too many drafts.",
        "Why did the teacher wear sunglasses? The class had bright ideas.",
        "Why did the crayon stay after school? It wanted to draw better.",
        "Why did the robot join reading group? It wanted better character development.",
        "Why was the belt funny at lunch? It held up the whole table.",
        "Why did the bicycle rest? It was two-tired.",
        "Why did the ruler win the race? It knew how to measure pace."
    ],
    riddles: [
        "I have keys but no locks and space but no room. What am I? A keyboard.",
        "What has hands but cannot clap? A clock.",
        "What gets wetter as it dries? A towel.",
        "What can travel around the world while staying in one corner? A stamp.",
        "I am full of holes but still hold water. What am I? A sponge.",
        "What has many teeth but cannot bite? A comb.",
        "What comes down but never goes up? Rain.",
        "What has one eye but cannot see? A needle.",
        "What has a neck but no head? A bottle.",
        "What has pages but is not a tree? A book.",
        "What can you catch but not throw? A cold.",
        "What has a face and two hands but no arms? A clock.",
        "What belongs to you but others use more? Your name.",
        "What has legs but cannot walk? A table.",
        "What building has the most stories? A library.",
        "What goes up and down but stays in one place? Stairs."
    ],
    facts: [
        "Honey can last for a very long time when sealed.",
        "A group of flamingos is called a flamboyance.",
        "Octopuses have three hearts.",
        "Bananas are berries, but strawberries are not.",
        "Lightning flashes around Earth many times each second.",
        "Butterflies can taste with their feet.",
        "Koalas sleep many hours each day.",
        "A day on Venus is longer than a year on Venus.",
        "Some cats can jump several times their own body length.",
        "Dolphins use signature sounds like names.",
        "Sea otters hold hands while they sleep so they stay together.",
        "Sharks have lived on Earth longer than trees.",
        "The Eiffel Tower grows a little taller in summer heat.",
        "The human nose can remember many different smells.",
        "Some bamboo plants can grow very quickly in one day.",
        "Owls can turn their heads very far to each side.",
        "A blue whale heart is about the size of a small car.",
        "Crows can recognize human faces.",
        "Rainbows are full circles, but we usually see only part of one.",
        "A cloud can weigh more than a large truck.",
        "The dot above i and j is called a tittle.",
        "Penguins use sounds to find family in a crowd.",
        "Some turtles can breathe through special body parts underwater.",
        "Saturn could float in water because it is very low density."
    ],
    quotes: [
        "The more that you read, the more things you will know. - Dr. Seuss",
        "Today a reader, tomorrow a leader. - Margaret Fuller",
        "Every expert started as a beginner.",
        "Small steps every day add up to big progress.",
        "Mistakes are proof that you are trying.",
        "Curiosity is the spark behind discovery.",
        "Kind words can brighten someone's whole day.",
        "Practice makes progress.",
        "You can do hard things one step at a time.",
        "Effort grows your skills.",
        "Learning is a team sport.",
        "Ask questions. That is how learning starts.",
        "Progress is built one try at a time.",
        "Read, think, and keep going.",
        "Your ideas matter in this classroom.",
        "Be brave enough to try again.",
        "Take your time and do your best.",
        "Success is many small wins added together.",
        "Kindness and effort are always in style.",
        "You are capable of learning something new today."
    ]
};

const BONUS_CONTENT_YOUNG = {
    jokes: [
        "What do you call a sleeping dinosaur? A dino-snore.",
        "Why did the teddy bear skip dessert? It was stuffed.",
        "What kind of tree fits in your hand? A palm tree.",
        "What did one plate say to the other plate? Lunch is on me.",
        "What do you call cheese that is not yours? Nacho cheese.",
        "Why did the pencil smile? It had a bright idea.",
        "What did one wall say to the other wall? I will meet you at the corner.",
        "Why did the broom miss class? It swept in.",
        "What did the zero say to the eight? Nice belt.",
        "Why did the crayon laugh? It felt colorful today.",
        "Why did the clock stay calm? It had time to think.",
        "Why did the notebook blush? It saw a lot of good writing.",
        "Why did the snack smile? It was a happy meal.",
        "What sound do bees make on the playground? Buzzzzz!",
        "Why did the marker smile? It had a bright cap.",
        "Why did the backpack sing? It was full of notes.",
        "Why did the shoe sit down? It was a little tired.",
        "Why did the apple grin? It had a core of confidence."
    ],
    riddles: [
        "I have a face and two hands, but no arms or legs. What am I? A clock.",
        "What has many teeth but cannot bite? A comb.",
        "What goes up but never comes down? Your age.",
        "What can you catch but not throw? A cold.",
        "What has to be broken before you can use it? An egg.",
        "What has four wheels and flies? A garbage truck.",
        "What has one eye but cannot see? A needle.",
        "What is full of holes but still holds water? A sponge.",
        "What has pages but is not a tree? A book.",
        "What has legs but cannot walk? A table.",
        "What can you hear but not touch? A sound.",
        "What can run but cannot walk? Water.",
        "What has stripes and helps measure? A ruler.",
        "What is easy to lift but hard to throw far? A feather.",
        "What has a ring but no finger? A phone.",
        "What gets bigger the more you share it? A smile."
    ],
    facts: [
        "Octopuses have three hearts.",
        "Butterflies can taste with their feet.",
        "Dolphins use signature sounds like names.",
        "Honey can last a very long time.",
        "Koalas sleep many hours each day.",
        "Some clouds are heavier than a truck.",
        "Sea otters hold hands while they sleep.",
        "A day on Venus is longer than a year there.",
        "Sharks have been around longer than trees.",
        "Crows can remember friendly faces.",
        "Owls can turn their heads very far.",
        "Bananas are berries.",
        "A snail can sleep for a long time.",
        "Some frogs can jump many times their body length.",
        "Bees dance to show where flowers are.",
        "The moon has mountains and valleys.",
        "Kangaroos cannot walk backward easily."
    ],
    quotes: [
        "Small steps every day lead to big progress.",
        "Practice makes progress.",
        "Curiosity helps us learn new things.",
        "You can do hard things one step at a time.",
        "Mistakes help your brain grow.",
        "Kind words make learning easier.",
        "Readers become leaders.",
        "Try, reflect, and try again.",
        "Your effort matters every day.",
        "Breathe, think, and keep going.",
        "Learning is an adventure.",
        "Your voice matters in our class.",
        "You are a problem-solver.",
        "Kind choices build strong classrooms.",
        "Each question helps your brain grow.",
        "Progress is more important than perfect.",
        "You can learn one new thing today."
    ]
};

const BONUS_CONTENT_SHARED_EXPANDED = {
    jokes: [
        "Why did the book go to the nurse? It had too many paper cuts.",
        "Why did the student bring a flashlight to class? For brighter ideas.",
        "What do you call a bear with no teeth? A gummy bear.",
        "Why did the crayon visit the computer lab? It wanted to draw online.",
        "Why did the clock join music club? It had great timing.",
        "What did one volcano say to the other? I lava your work.",
        "Why did the eraser get an award? It cleaned up mistakes.",
        "Why did the student sit near the dictionary? To improve word power.",
        "Why did the broom love reading time? It could sweep through pages.",
        "What do you call a fish that practices piano? A tuna player.",
        "Why did the banana bring sunscreen? It did not want to peel.",
        "Why did the laptop eat breakfast at school? It needed more bytes.",
        "Why did the glue stick make friends quickly? It was very attached.",
        "Why did the paper stay after class? It needed a final draft.",
        "What did one raindrop say to the other? Two is company, three is a cloud.",
        "Why did the student wear a watch in art class? To draw on time.",
        "Why did the chair ace the test? It had strong support.",
        "Why did the compass feel proud? It always found direction.",
        "Why did the cookie study spelling? To become a smart cookie.",
        "Why did the backpack smile? It was packed with potential.",
        "What do you call a quiet dinosaur? A hush-a-saurus.",
        "Why did the math student carry a ladder? To reach the next level.",
        "Why did the light bulb get perfect attendance? It always showed up bright.",
        "Why did the plant like school? It loved to grow there.",
        "Why did the pencil case laugh? It had a sharp sense of humor.",
        "Why did the student bring marshmallows on field day? To have smore fun.",
        "Why did the ruler stay humble? It knew everyone has a measure.",
        "What did the desk say at cleanup time? I can handle this.",
        "Why did the calendar pass the quiz? It knew every date.",
        "Why did the music note stay positive? It always found the right pitch.",
        "Why did the orange stop rolling? It ran out of juice.",
        "Why did the scientist carry a pencil? To draw conclusions.",
        "Why did the spelling word feel confident? It was well defined.",
        "What did one sock say to the other? We make a great pair.",
        "Why did the student bring a mirror to class? To reflect on learning.",
        "Why did the moon go to school? To get a little brighter.",
        "Why did the stapler stay calm? It kept things together.",
        "Why did the classroom door get a compliment? It was open-minded.",
        "Why did the keyboard feel proud? It had all the right keys.",
        "Why did the tomato blush at lunch? It saw the salad dressing.",
        "Why did the marker join the debate team? It made strong points.",
        "Why did the library card work so hard? It was fully checked in.",
        "Why did the puzzle do well in class? It put ideas together.",
        "Why did the sandwich bring a notebook? It wanted better layers of detail.",
        "Why did the kite love science class? It learned how to rise."
    ],
    riddles: [
        "What has one horn but does not honk? A unicorn.",
        "What can you hold in your left hand but not your right hand? Your right elbow.",
        "What has many keys but opens no doors? A piano.",
        "What goes up when rain comes down? An umbrella.",
        "What has cities, rivers, and roads but no people? A map.",
        "What has a ring but no finger? A bell.",
        "What kind of coat is always put on wet? A coat of paint.",
        "What has words and pages but never talks? A dictionary.",
        "What can you serve but never eat? A tennis ball.",
        "What has one eye but cannot blink? A hurricane.",
        "What kind of band never plays music? A rubber band.",
        "What has a thumb and four fingers but is not alive? A glove.",
        "What gets sharper the more you use it? Your brain.",
        "What has a bottom at the top? Your legs.",
        "What runs around a yard without moving? A fence.",
        "What starts with T, ends with T, and has tea inside? A teapot.",
        "What has to be filled before it can write? A pencil.",
        "What has one head, one foot, and four legs? A bed.",
        "What can be cracked, made, told, and played? A joke.",
        "What room can no one enter? A mushroom.",
        "What can you hear but never hold? An echo.",
        "What has many branches but no fruit? A bank.",
        "What can you break without touching it? A promise.",
        "What comes once in a minute, twice in a moment, and never in a thousand years? The letter m.",
        "What has a neck and two arms but no hands? A shirt.",
        "What gets bigger every time you take from it? A hole.",
        "What kind of tree can you carry in your hand? A palm.",
        "What has a tail and a head but no body? A coin.",
        "What can fill a classroom but takes up no space? Light.",
        "What is easy to lift but hard to throw far? A feather.",
        "What has many teeth but cannot chew food? A zipper.",
        "What has one mouth but never eats? A river.",
        "What has many stories but no voice? A bookshelf.",
        "What can point in every direction but never moves? A compass needle.",
        "What has numbers but cannot count by itself? A calendar.",
        "What flies without wings and cries without eyes? A cloud.",
        "What has stripes and can tell length? A ruler.",
        "What is always in front of you but cannot be seen? The future.",
        "What has two ends but no beginning? A rope.",
        "What can you keep after giving it away? Your word.",
        "What has one voice but can tell many stories? A book.",
        "What has a center but no edges? A circle.",
        "What can be full of letters but has no mail carrier? An alphabet chart.",
        "What can you catch in class but not throw? A clue.",
        "What starts small, gets taller, and ends as a tiny point? A pencil.",
        "What has a cap but no head? A bottle.",
        "What has a spine but no bones? A book.",
        "What can jump higher than a building? Any animal, because buildings cannot jump.",
        "What goes through glass without breaking it? Light.",
        "What has no life but can still grow? A crystal."
    ],
    facts: [
        "Earth rotates once about every 24 hours.",
        "The Pacific Ocean is the largest ocean on Earth.",
        "Water expands when it freezes.",
        "Most of Earth's fresh water is in ice and glaciers.",
        "The adult human skeleton has 206 bones.",
        "Your heart is a muscle.",
        "Bees help pollinate many fruits and vegetables.",
        "The Sun is a star.",
        "Sunlight takes about eight minutes to reach Earth.",
        "Mars has the tallest known volcano in our solar system.",
        "Jupiter is the largest planet in our solar system.",
        "Saturn's rings are made mostly of ice and rock.",
        "Uranus rotates on its side.",
        "Neptune has very fast winds.",
        "Earth is the only known planet with stable surface oceans.",
        "A year is one trip around the Sun.",
        "Day and night happen because Earth rotates.",
        "Seasons happen because Earth is tilted.",
        "Sound needs matter like air or water to travel.",
        "Thunder is the sound of rapidly expanding air.",
        "Rain forms when water vapor cools and condenses.",
        "Snowflakes are made of ice crystals.",
        "A rainbow appears when light bends in water droplets.",
        "The moon does not produce its own light.",
        "The moon reflects sunlight.",
        "Ocean tides are mostly driven by the moon's gravity.",
        "Bamboo is a type of grass.",
        "Penguins are birds.",
        "Bats are mammals.",
        "Spiders are not insects.",
        "Insects have six legs.",
        "An octopus has eight arms.",
        "Coral reefs are built by tiny animals called polyps.",
        "Sharks have cartilage instead of bone.",
        "Whales are mammals that breathe air.",
        "Frogs can absorb water through their skin.",
        "Chameleons can change color for signaling and temperature control.",
        "Cheetahs are among the fastest land animals.",
        "Earthquakes happen when tectonic plates shift.",
        "Volcanoes can create new land.",
        "Fossils provide clues about ancient life.",
        "Magnets have north and south poles.",
        "A prism can split white light into colors.",
        "Glass is made mostly from sand.",
        "Steel is mostly iron mixed with carbon.",
        "Recycling aluminum uses far less energy than making new aluminum.",
        "Sleep helps memory and learning.",
        "Exercise supports brain and body health.",
        "Practice strengthens neural connections in the brain.",
        "Hummingbirds can fly backward.",
        "Honeybees use dances to share food locations.",
        "Antarctica is the coldest continent.",
        "Mosses are among the oldest land plants.",
        "Lichens are partnerships between fungi and algae.",
        "Sound travels faster in water than in air.",
        "Hot air rises because it is less dense than cool air.",
        "The Amazon rainforest is one of the largest rainforests on Earth.",
        "Deserts can still support many plants and animals.",
        "A leap year adds one day to February.",
        "Planets do not make their own visible light.",
        "Mercury is the closest planet to the Sun.",
        "Venus is the hottest planet in our solar system.",
        "Clouds are tiny water droplets or ice crystals.",
        "Wind is moving air caused by pressure differences.",
        "Some birds migrate thousands of miles each year.",
        "The Milky Way is the galaxy that includes our solar system.",
        "Trees absorb carbon dioxide and release oxygen during photosynthesis.",
        "DNA carries instructions for living things.",
        "Human fingerprints are unique patterns.",
        "The brain and spinal cord make up the central nervous system."
    ],
    quotes: [
        "Small steps repeated daily build big results.",
        "Effort today becomes confidence tomorrow.",
        "Ask questions; curiosity is a learning superpower.",
        "Progress is often quiet before it is obvious.",
        "Practice with purpose beats practice with pressure.",
        "Your voice matters in every classroom.",
        "Improvement starts with one brave attempt.",
        "Mistakes are data for your next move.",
        "Focus on growth, not perfection.",
        "A strong start can happen at any moment.",
        "Learning is teamwork between effort and feedback.",
        "Consistency can outshine talent over time.",
        "You do not need to know everything to begin.",
        "Better habits create better outcomes.",
        "Keep going; understanding often comes one try later.",
        "Confidence grows when preparation meets action.",
        "Reading opens doors that tests cannot measure.",
        "Kindness makes learning safer for everyone.",
        "Listening carefully is a powerful academic skill.",
        "Clear goals turn hard work into progress.",
        "Discipline is remembering what matters most.",
        "Patience is part of mastery.",
        "Strong thinking starts with good questions.",
        "Courage in class is raising your hand anyway.",
        "Knowledge grows when shared.",
        "Feedback is a gift when used well.",
        "Every expert once needed extra time.",
        "You can be both a beginner and a leader.",
        "Excellence is built in ordinary moments.",
        "Try again with a new strategy.",
        "Your brain changes every time you learn.",
        "Hard things become easier with practice.",
        "One page a day can change your year.",
        "Good habits are quiet superpowers.",
        "Growth is earned, not rushed.",
        "Show up prepared and half the battle is won.",
        "Deep work beats distracted speed.",
        "Learning sticks when you explain it to someone else.",
        "The goal is understanding, not just finishing.",
        "Keep your standards high and your attitude steady.",
        "Respect for others improves every team.",
        "Reliable effort builds trusted results.",
        "Use your strengths and train your gaps.",
        "Start where you are; build from there.",
        "Calm thinking leads to better choices.",
        "Make your next step clear and simple.",
        "Learning is a long game; play it daily.",
        "Improvement is proof of persistence.",
        "Preparation turns nerves into focus.",
        "Good readers notice details and ask why.",
        "Strong writers revise on purpose.",
        "Great math thinkers explain their reasoning.",
        "Better questions lead to better answers.",
        "Keep your goals visible and your actions consistent.",
        "What you practice is what you become.",
        "Momentum starts with one completed task.",
        "Learn deeply, then teach clearly.",
        "Your future is shaped by what you repeat today.",
        "Keep your promise to yourself.",
        "Progress loves persistence.",
        "When in doubt, take the next helpful step.",
        "Thinking clearly is a skill you can train.",
        "Setbacks are part of serious learning.",
        "You can be proud and still keep improving.",
        "Finish strong, then start stronger.",
        "Preparation is confidence in advance.",
        "Learning is not linear, but effort still counts.",
        "The right environment helps great work happen.",
        "A focused ten minutes can change a whole hour.",
        "Build skills that help others, not just yourself."
    ]
};

function mergeBonusPools(basePool = {}, extraPool = {}) {
    const merged = {};
    ['jokes', 'riddles', 'facts', 'quotes'].forEach((type) => {
        const baseList = Array.isArray(basePool[type]) ? basePool[type] : [];
        const extraList = Array.isArray(extraPool[type]) ? extraPool[type] : [];
        merged[type] = baseList.concat(extraList);
    });
    return merged;
}

function getBonusContentPool() {
    const mode = getResolvedAudienceMode();
    const targetMode = mode === 'young-eal' ? 'young-eal' : 'general';
    const generalPool = mergeBonusPools(BONUS_CONTENT, BONUS_CONTENT_SHARED_EXPANDED);
    const youngPool = mergeBonusPools(BONUS_CONTENT_YOUNG, BONUS_CONTENT_SHARED_EXPANDED);
    const primaryPool = targetMode === 'young-eal' ? youngPool : generalPool;
    const fallbackPool = youngPool;

    const normalized = {};
    ['jokes', 'riddles', 'facts', 'quotes'].forEach((type) => {
        const primaryBucket = filterBonusBucket(primaryPool[type], targetMode);
        if (primaryBucket.length) {
            normalized[type] = primaryBucket;
            return;
        }
        normalized[type] = filterBonusBucket(fallbackPool[type], 'young-eal');
    });
    return normalized;
}

function normalizeBonusLine(text = '') {
    return cleanAudienceText(text).replace(/\s+([,.;!?])/g, '$1');
}

function splitRiddlePromptAndAnswer(line = '') {
    const normalized = normalizeBonusLine(line);
    if (!normalized) return { prompt: '', answer: '' };
    const questionIndex = normalized.lastIndexOf('?');
    if (questionIndex < 0) return { prompt: normalized, answer: '' };

    const prompt = normalized.slice(0, questionIndex + 1).trim();
    let answer = normalized.slice(questionIndex + 1).trim();
    answer = answer.replace(/^answer[:\s-]*/i, '').trim();
    return { prompt: prompt || normalized, answer };
}

function splitJokeSetupAndPunchline(line = '') {
    const normalized = normalizeBonusLine(line);
    if (!normalized) return { setup: '', punchline: '' };
    const questionBreak = normalized.lastIndexOf('?');
    if (questionBreak > -1) {
        const setup = normalized.slice(0, questionBreak + 1).trim();
        const punchline = normalized.slice(questionBreak + 1).trim();
        if (setup && punchline) return { setup, punchline };
    }
    const patterns = [
        /(?:\s+|^)Answer::\s*/i,
        /(?:\s+|^)Answer:\s*/i,
        /\s+—\s+/,
        /\.\.\.+\s+/,
        /…\s+/
    ];
    for (const pattern of patterns) {
        const match = normalized.match(pattern);
        if (!match || typeof match.index !== 'number') continue;
        const setup = normalized.slice(0, match.index).trim();
        const punchline = normalized.slice(match.index + match[0].length).trim();
        if (setup && punchline) return { setup, punchline };
    }
    return { setup: normalized, punchline: '' };
}

function isSafeBonusLine(text = '') {
    if (!text) return false;
    if (isYoungAudienceUnsafeText(text)) return false;
    return !CUSTOM_WORD_BLOCK_PATTERNS.some((pattern) => pattern.test(text));
}

function isClearBonusLine(text = '', mode = 'general') {
    const limit = mode === 'young-eal' ? 20 : 28;
    return countWords(text) <= limit;
}

function filterBonusBucket(items = [], mode = 'general') {
    if (!Array.isArray(items)) return [];
    const seen = new Set();
    return items
        .map((item) => normalizeBonusLine(item))
        .filter((item) => {
            if (!item || !isSafeBonusLine(item) || !isClearBonusLine(item, mode)) return false;
            const key = item.toLowerCase();
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });
}

function getBonusHearButtonLabel(type = '', options = {}) {
    const answerRevealed = !!options.answerRevealed;
    if (type === 'facts') return 'Hear the fun fact';
    if (type === 'quotes') return 'Hear the quote';
    if (type === 'riddles') return answerRevealed ? 'Hear the answer' : 'Hear the riddle';
    if (type === 'jokes') return answerRevealed ? 'Hear the punchline' : 'Hear the joke';
    return 'Hear this';
}

function isBonusTtsDebugEnabled() {
    try {
        const params = new URLSearchParams(window.location.search || '');
        return params.get('debug_tts') === '1';
    } catch (e) {
        return false;
    }
}

function getBonusVoiceDebugId() {
    try {
        const packId = normalizeTtsPackId(appSettings?.ttsPackId || DEFAULT_SETTINGS.ttsPackId);
        const resolvedPackId = packId === 'default' ? '' : packId;
        if (resolvedPackId) return `pack:${resolvedPackId}`;
        const voiceUri = String(appSettings?.voiceUri || '').trim();
        if (voiceUri) return `voice:${voiceUri}`;
    } catch (e) {}
    return 'system-default';
}

function pickPreferredBonusNarrationVoice(voices = []) {
    const pool = Array.isArray(voices) ? voices : [];
    if (!pool.length) return null;
    const isEnglishVoice = (voice) => String(voice?.lang || '').toLowerCase().startsWith('en');
    const selectedVoiceUri = String(appSettings?.voiceUri || '').trim();
    if (selectedVoiceUri) {
        const selected = pool.find((voice) => (voice?.voiceURI || voice?.name || '') === selectedVoiceUri);
        if (selected && isEnglishVoice(selected) && isHighQualityVoice(selected)) {
            return selected;
        }
    }
    const dialect = getPreferredEnglishDialect();
    return pickPreferredEnglishCandidate(pool, dialect, { requireHighQuality: true }) || null;
}

function shouldShowBonusContent() {
    const frequency = appSettings.bonus?.frequency || 'always';
    if (frequency === 'off') return false;
    if (frequency === 'always') return true;
    if (frequency === 'often') return Math.random() < 0.75;
    if (frequency === 'rare') return Math.random() < 0.2;
    return Math.random() < 0.4;
}

function showBonusContent() {
    const pool = getBonusContentPool();
    if (!pool) return;

    const types = ['jokes', 'riddles', 'facts', 'quotes'].filter((type) => Array.isArray(pool[type]) && pool[type].length);
    if (!types.length) return;
    const modeKey = getResolvedAudienceMode() === 'young-eal' ? 'young-eal' : 'general';

    const entries = types.flatMap((type) => {
        const bucket = Array.isArray(pool[type]) ? pool[type] : [];
        return bucket.map((text) => ({
            type,
            text,
            key: `${type}${BONUS_SHUFFLE_ENTRY_DELIM}${text}`
        }));
    });
    if (!entries.length) return;

    const entryMap = new Map(entries.map((entry) => [entry.key, entry]));
    const pickedKey = getNonRepeatingShuffleChoice(
        entries.map((entry) => entry.key),
        `bonus-entry:${modeKey}`
    ) || entries[Math.floor(Math.random() * entries.length)]?.key;
    const pickedEntry = pickedKey ? entryMap.get(pickedKey) : entries[0];
    if (!pickedEntry?.text) return;

    const type = pickedEntry.type;
    const content = pickedEntry.text;
    const parsedRiddle = type === 'riddles'
        ? splitRiddlePromptAndAnswer(content)
        : { prompt: content, answer: '' };
    const hasRiddleAnswer = type === 'riddles' && !!parsedRiddle.answer;
    const parsedJoke = type === 'jokes'
        ? splitJokeSetupAndPunchline(content)
        : { setup: content, punchline: '' };
    const hasPunchline = type === 'jokes' && !!parsedJoke.punchline;
    const initialVisibleContent = hasPunchline
        ? parsedJoke.setup
        : (parsedRiddle.prompt || content);
    try {
        localStorage.setItem('last_bonus_key', `${type}:${initialVisibleContent}`);
    } catch (e) {}
    
    const emoji = type === 'jokes'
        ? '😄'
        : type === 'riddles'
            ? '🧩'
            : type === 'facts'
                ? '🌟'
                : '💭';
    const title = type === 'jokes'
        ? 'Joke Time!'
        : type === 'riddles'
            ? 'Riddle Time!'
            : type === 'facts'
                ? 'Fun Fact!'
                : 'Inspiration';

    const bonusModal = document.getElementById('bonus-modal');
    if (!bonusModal) return;

    modalOverlay.classList.remove('hidden');
    bonusModal.classList.remove('hidden');

    const emojiEl = document.getElementById('bonus-emoji');
    const titleEl = document.getElementById('bonus-title');
    const textEl = document.getElementById('bonus-text');
    const hearBtn = document.getElementById('bonus-hear');
    const audioNoteEl = document.getElementById('bonus-audio-note');
    let revealBtn = document.getElementById('bonus-reveal-detail');
    const setBonusAudioNote = (message = '') => {
        if (!(audioNoteEl instanceof HTMLElement)) return;
        const text = String(message || '').trim();
        audioNoteEl.textContent = text;
        audioNoteEl.classList.toggle('hidden', !text);
    };
    if (!(revealBtn instanceof HTMLButtonElement) && hearBtn) {
        revealBtn = document.createElement('button');
        revealBtn.id = 'bonus-reveal-detail';
        revealBtn.type = 'button';
        revealBtn.className = 'secondary-btn bonus-reveal-punchline hidden';
        revealBtn.textContent = 'Reveal';
        const bonusActions = hearBtn.closest('.bonus-actions');
        if (bonusActions && hearBtn && hearBtn.parentElement === bonusActions) {
            bonusActions.insertBefore(revealBtn, hearBtn.nextSibling);
        } else {
            bonusActions?.appendChild(revealBtn);
        }
    }
    if (emojiEl) emojiEl.textContent = emoji;
    if (titleEl) titleEl.textContent = title;
    if (textEl) textEl.textContent = initialVisibleContent;
    setBonusAudioNote('');
    bonusModal.dataset.lastSpokenText = '';
    bonusModal.dataset.bonusType = type;
    bonusModal.dataset.bonusPunchline = hasPunchline ? parsedJoke.punchline : '';
    bonusModal.dataset.bonusPunchlineRevealed = hasPunchline ? 'false' : 'true';
    bonusModal.dataset.bonusRiddleAnswer = hasRiddleAnswer ? parsedRiddle.answer : '';
    bonusModal.dataset.bonusRiddleAnswerRevealed = hasRiddleAnswer ? 'false' : 'true';
    if (revealBtn instanceof HTMLButtonElement) {
        const shouldShowReveal = hasPunchline || hasRiddleAnswer;
        revealBtn.classList.toggle('hidden', !shouldShowReveal);
        revealBtn.textContent = hasRiddleAnswer ? 'Reveal answer' : 'Reveal punchline';
        revealBtn.onclick = () => {
            if (!textEl) return;
            bonusModal.dataset.lastSpokenText = '';
            if (hasPunchline) {
                bonusModal.dataset.bonusPunchlineRevealed = 'true';
                textEl.textContent = parsedJoke.punchline;
                if (hearBtn) {
                    hearBtn.dataset.ttsText = parsedJoke.punchline;
                    hearBtn.dataset.lastSpokenText = '';
                    hearBtn.textContent = getBonusHearButtonLabel(type, { answerRevealed: true });
                }
            } else if (hasRiddleAnswer) {
                bonusModal.dataset.bonusRiddleAnswerRevealed = 'true';
                textEl.textContent = `${parsedRiddle.prompt}\n\nAnswer: ${parsedRiddle.answer}`;
                if (hearBtn) {
                    hearBtn.dataset.ttsText = parsedRiddle.answer;
                    hearBtn.dataset.lastSpokenText = '';
                    hearBtn.textContent = getBonusHearButtonLabel(type, { answerRevealed: true });
                }
            }
            if (hearBtn && appSettings.autoHear !== false) {
                queueMicrotask(() => {
                    if (document.body.contains(hearBtn)) hearBtn.click();
                });
            }
            revealBtn.classList.add('hidden');
            revealBtn.blur();
        };
    }
    if (hearBtn) {
        hearBtn.textContent = getBonusHearButtonLabel(type, { answerRevealed: false });
        hearBtn.dataset.ttsType = type;
        hearBtn.dataset.ttsText = hasRiddleAnswer ? (parsedRiddle.prompt || initialVisibleContent || '') : (initialVisibleContent || '');
        hearBtn.dataset.lastSpokenText = '';
        hearBtn.disabled = !hearBtn.dataset.ttsText;
        hearBtn.onclick = async () => {
            const gate = beginExclusivePlaybackForSource('bonus-hear');
            if (!gate.proceed) return;
            const popupType = hearBtn.dataset.ttsType || type;
            const popupText = String(hearBtn.dataset.ttsText || (textEl && textEl.innerText) || '').replace(/\s+/g, ' ').trim();
            hearBtn.dataset.ttsText = popupText;
            hearBtn.dataset.lastSpokenText = popupText;
            bonusModal.dataset.lastSpokenText = popupText;
            if (!popupText) {
                showToast('No bonus text is available to read yet.');
                setBonusAudioNote('No bonus text is available yet.');
                return;
            }
            setBonusAudioNote('');
            if (isBonusTtsDebugEnabled()) {
                console.debug('bonus-tts', {
                    popupType,
                    spokenTextPreview: popupText.slice(0, 60),
                    voiceId: getBonusVoiceDebugId()
                });
            }
            const packedPlayed = await tryPlayPackedTtsForLiteralText({
                text: popupText,
                languageCode: 'en',
                type: 'sentence',
                playbackRate: Math.max(0.6, getSpeechRate('sentence')),
                sourceId: gate.sourceId
            });
            if (packedPlayed) {
                setBonusAudioNote('');
                return;
            }
            if (activePlaybackSourceId === gate.sourceId) activePlaybackSourceId = '';
            showToast('No Azure clip is available for this bonus item yet.');
            setBonusAudioNote('Audio unavailable for this bonus item.');
        };
    }
}

/* ==========================================
   NEW FEATURES: Translation, Decodable Texts, Progress, Phoneme Guide
   ========================================== */

// Progress tracking data
let progressData = {
    wordsAttempted: 0,
    wordsCorrect: 0,
    recentWords: [],
    totalGuesses: 0
};

// Load progress data from localStorage
function loadProgressData() {
    const saved = localStorage.getItem('decode_progress_data');
    if (saved) {
        try {
            progressData = JSON.parse(saved);
        } catch (e) {
            console.error('Could not load progress data');
        }
    }
}

// Save progress data
function saveProgressData() {
    localStorage.setItem('decode_progress_data', JSON.stringify(progressData));
}

// Track game completion
function trackProgress(word, won, numGuesses) {
    progressData.wordsAttempted++;
    if (won) progressData.wordsCorrect++;
    progressData.totalGuesses += numGuesses;
    
    progressData.recentWords.unshift({
        word: word,
        won: won,
        guesses: numGuesses,
        date: new Date().toLocaleDateString()
    });
    
    // Keep only last 20 words
    if (progressData.recentWords.length > 20) {
        progressData.recentWords = progressData.recentWords.slice(0, 20);
    }
    
    saveProgressData();
}

// Initialize new features
function initNewFeatures() {
    loadProgressData();
    
    // Translation button
    const translateBtn = document.getElementById('translate-btn');
    if (translateBtn) {
        translateBtn.onclick = () => {
            const section = document.getElementById('translation-section');
            section.style.display = section.style.display === 'none' ? 'block' : 'none';
        };
    }
    
    // Translation select
    const translateSelect = document.getElementById('translate-to');
    if (translateSelect) {
        translateSelect.onchange = () => {
            const lang = translateSelect.value;
            if (!lang) return;
            
            const resultDiv = document.getElementById('translation-result');
            const word = currentWord;
            const def = currentEntry.def || '';
            
            // Debug: Check if translations are loaded
            console.log('Translation requested for:', word, 'Language:', lang);
            console.log('window.TRANSLATIONS exists:', !!window.TRANSLATIONS);
            if (window.TRANSLATIONS) {
                console.log('Available words:', Object.keys(window.TRANSLATIONS));
            }
            
            // Use curated translations for high-frequency words
            const translation = getWordTranslation(word, lang);
            console.log('Translation found:', translation);
            
            if (translation) {
                // Rich translation available from translations.js
                resultDiv.innerHTML = `
                    <div style="padding: 12px; background: #e8f5e9; border-radius: 8px; border: 2px solid var(--color-correct);">
                        <div style="color: var(--color-correct); font-weight: 600; margin-bottom: 8px;">✓ Translation Available</div>
                        
                        <div style="font-size: 1.2rem; margin-bottom: 10px; display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                            <strong>${word}</strong> 
                            <span style="color: #999;">→</span> 
                            <strong style="color: var(--color-correct);">${translation.word}</strong>
                            ${translation.phonetic ? `<span style="font-size: 0.85rem; color: #666; font-style: italic;">(${translation.phonetic})</span>` : ''}
                        </div>
                        
                        <div style="font-size: 0.95rem; color: #555; margin-bottom: 10px; line-height: 1.5;">
                            ${translation.def || translation.meaning || ''}
                        </div>
                        
                        ${translation.sentence ? `
                            <div style="padding: 8px; background: white; border-radius: 4px; font-size: 0.9rem; color: #666; font-style: italic; border-left: 3px solid var(--color-correct);">
                                "${translation.sentence}"
                            </div>
                        ` : ''}
                    </div>
                `;
            } else {
                // Fallback: Show English definition clearly
                resultDiv.innerHTML = `
                    <div style="padding: 10px; background: #fff3e0; border-radius: 6px; border: 2px solid #ffb74d;">
                        <div style="color: #f57c00; font-weight: 600; margin-bottom: 6px;">📚 Translation Coming Soon</div>
                        <div style="font-size: 1.1rem; margin-bottom: 8px;">
                            <strong>${word}</strong> (English)
                        </div>
                        <div style="font-size: 0.9rem; color: #555; margin-bottom: 8px;">
                            <em>Meaning: ${def}</em>
                        </div>
                        <div style="font-size: 0.85rem; color: #666; line-height: 1.4;">
                            Working with English meanings helps build vocabulary skills! We're adding more translations regularly.
                        </div>
                    </div>
                `;
            }
        };
    }
    
    // Decodable texts button
    const decodableBtn = document.getElementById('decodable-btn');
    if (decodableBtn) {
        decodableBtn.onclick = openDecodableTexts;
    }
    
    // Help button
    const helpBtn = document.getElementById('help-btn');
    if (helpBtn) {
        helpBtn.onclick = openHelpModal;
    }
    
    // Progress button
    const progressBtn = document.getElementById('progress-btn');
    if (progressBtn) {
        progressBtn.onclick = openProgressModal;
    }
    
    // Phoneme cards are created when the phoneme modal opens.
    
    // Close buttons for new modals
    document.querySelectorAll('.close-decodable, .close-progress, .close-phoneme, .close-help').forEach(btn => {
        btn.addEventListener('click', closeModal);
    });
    
    const closeDecodableBtn = document.getElementById('close-decodable-btn');
    if (closeDecodableBtn) {
        closeDecodableBtn.onclick = closeModal;
    }
    
    // Export data button
    const exportBtn = document.getElementById('export-data-btn');
    if (exportBtn) {
        exportBtn.onclick = exportProgressData;
    }
    
    // Clear data button
    const clearBtn = document.getElementById('clear-data-btn');
    if (clearBtn) {
        clearBtn.onclick = () => {
            if (confirm('Clear all progress data? This cannot be undone.')) {
                progressData = {
                    wordsAttempted: 0,
                    wordsCorrect: 0,
                    recentWords: [],
                    totalGuesses: 0
                };
                saveProgressData();
                openProgressModal(); // Refresh display
            }
        };
    }
    
    // Phoneme card clicks - respect voice source selection
    document.addEventListener('click', (e) => {
        const card = e.target.closest('.phoneme-card');
        if (card) {
            const sound = card.dataset.sound;
            const example = card.dataset.example;
            
            // Check which voice source is selected
            const voiceSource = document.querySelector('input[name="guide-voice-source"]:checked')?.value;
            
            if (voiceSource === 'system') {
                // Force system voice - bypass any recordings
                speakWithSystemVoice(example);
            } else {
                // Use recorded voice if available, fallback to system
                speak(example, 'word');
            }
        }
    });
}

// Force system voice (ignore recordings)
async function speakWithSystemVoice(text) {
    if (!('speechSynthesis' in window)) return;

    const voices = await getVoicesForSpeech();
    const preferred = pickBestEnglishVoice(voices);
    const fallbackLang = preferred ? preferred.lang : getPreferredEnglishDialect();
    const speechType = countSpeechWords(text) >= 5 || /[.!?]/.test(String(text || '')) ? 'sentence' : 'word';
    speakEnglishText(text, speechType, preferred, fallbackLang);
}

const DEFAULT_DECODABLE_TEXTS = [
    {
        title: 'Sam and the Map',
        level: 'K-2 · CVC',
        gradeBand: 'K-2',
        focus: 'Short vowels',
        tags: ['cvc'],
        content: 'Sam had a map. Pam had a cap. Sam ran to the path and sat by a big log. Pam said, "Tap the map and plan the path." Sam did not rush. He had to spot each mark. At last, Sam and Pam got back to camp and had a snack.'
    },
    {
        title: 'The Red Jet',
        level: 'K-2 · CVC',
        gradeBand: 'K-2',
        focus: 'Short vowels',
        tags: ['cvc'],
        content: 'Ben and Jen got a red jet toy. The jet can dip and spin. Ben set the jet on a mat. Jen got a pen and drew a net. "Can the jet get in?" Jen said. Ben did a test. The jet did not fit. They had to fix the net. Then it did.'
    },
    {
        title: 'Ship at the Shop',
        level: 'K-2 · Digraphs',
        gradeBand: 'K-2',
        focus: 'Sh and ch',
        tags: ['digraph'],
        content: 'Chip and Ash had cash for the shop. Chip chose a shell and a dish. Ash chose a fish and a brush. At the shop, they had to check each tag. "This shell is cheap," said Chip. "This dish is shiny," said Ash. They left the shop with a big grin.'
    },
    {
        title: 'Thin Path, Thick Log',
        level: 'K-2 · Digraphs',
        gradeBand: 'K-2',
        focus: 'Th',
        tags: ['digraph'],
        content: 'Theo and Beth had to go on a thin path by the hill. They saw a thick log on the path. "Think first," said Beth. Theo said, "Then we can shift the log." They put their hands on the log and gave it a push. The path was clear, and they went on.'
    },
    {
        title: 'Flag at the Cliff',
        level: 'K-2 · Blends',
        gradeBand: 'K-2',
        focus: 'Initial and final blends',
        tags: ['ccvc', 'cvcc'],
        content: 'Brad had a flag and a plan. He had to climb the small cliff by camp. Glen brought a black clip. "Clip the flag to the branch," said Glen. Brad did it and stood still. The flag did not slip. The class clapped when the flag flapped in the wind.'
    },
    {
        title: 'Trick on the Track',
        level: 'K-2 · Trigraphs',
        gradeBand: 'K-2',
        focus: 'Tch and dge',
        tags: ['trigraph'],
        content: 'Mitch went to the track for a quick match. He had to catch a badge at each check point. At the last point, he had to dodge a big cone and latch a tag to his shirt. Mitch had to stretch and breathe, but he did the whole challenge with grit.'
    },
    {
        title: 'Make a Cake',
        level: 'K-2 · Magic E',
        gradeBand: 'K-2',
        focus: 'CVCe',
        tags: ['cvce'],
        content: 'Nate and Jade made a cake at home. Nate wrote bake, made, and plate on a note. Jade said, "The e is quiet but it makes the vowel say its name." They mixed, baked, and set the cake on a plate. They gave the cake to the whole class.'
    },
    {
        title: 'Rain by the Train',
        level: 'K-2 · Vowel Teams',
        gradeBand: 'K-2',
        focus: 'Ai and ea',
        tags: ['vowel_team'],
        content: 'It was rain day at the train stop. Mia and Dean wore rain coats and waited. They read the sign to pass the time. "The train is late," said Mia. Dean read it again. Soon the train came. They waved and made space for each rider to board.'
    },
    {
        title: 'Park in the Dark',
        level: 'K-2 · R-Controlled',
        gradeBand: 'K-2',
        focus: 'Ar and or',
        tags: ['r_controlled'],
        content: 'Mark and Nora went to the park at dusk. The bark on the dark tree looked rough. Nora saw a card on a bench. The card said, "Start at the north corner." They followed each part and found a small star charm in the grass.'
    },
    {
        title: 'Boil and Bounce',
        level: 'K-2 · Diphthongs',
        gradeBand: 'K-2',
        focus: 'Oi and ou',
        tags: ['diphthong'],
        content: 'Joy found a coin by the house. Lou heard a shout and ran out. They took the coin to the lost box. Then they played with a bouncy ball. "Boing!" it went. They could hear the sound and point to the oi in boing and the ou in out.'
    },
    {
        title: 'Puff, Bell, and Buzz',
        level: 'K-2 · FLOSS',
        gradeBand: 'K-2',
        focus: 'FLOSS endings',
        tags: ['floss'],
        content: 'The bell will ring at lunch. Will and Tess had to pack a full bag. Tess had fluff for art and Will had a class pass. "Tell me when the bell rings," said Will. Tess listened. Ding! The bell rang, and they went to lunch.'
    },
    {
        title: 'Bunk in the Camp',
        level: 'K-2 · Welded',
        gradeBand: 'K-2',
        focus: 'Nk and ng',
        tags: ['welded'],
        content: 'At camp, the bunk had a long trunk under each bed. Hank had to bring his sling and a drink. Ming had to bring a blank tag for his trunk. At night, they sang a song and hung each tag on a hook so no trunk got mixed up.'
    },
    {
        title: 'Schwa in the Middle',
        level: '3-5 · Schwa',
        gradeBand: '3-5',
        focus: 'Unstressed vowels',
        tags: ['schwa'],
        content: 'The class read about the banana festival and the camera club. Ms. Perez said, "Listen to the unstressed vowel. It sounds like uh in many words." Students tapped syllables in animal, support, and pencil, then marked where the schwa sound appeared.'
    },
    {
        title: 'Prefix Power Plan',
        level: '3-5 · Morphology',
        gradeBand: '3-5',
        focus: 'Prefixes',
        tags: ['prefix'],
        content: 'The team built a prefix chart for preview, replay, and rewrite. They learned that a prefix can change meaning before the base word. In small groups, students used each new word in a sentence and checked whether the prefix meaning matched the context.'
    },
    {
        title: 'Suffix Switch',
        level: '3-5 · Morphology',
        gradeBand: '3-5',
        focus: 'Suffixes',
        tags: ['suffix'],
        content: 'During writing workshop, students revised short drafts and added suffixes to make meaning precise. Quick became quickly, care became careful, and teach became teacher. The class discussed how suffix choices can shift part of speech and sentence rhythm.'
    },
    {
        title: 'Compound Word Crew',
        level: '3-5 · Compounds',
        gradeBand: '3-5',
        focus: 'Compound words',
        tags: ['compound'],
        content: 'A small crew made a playground map with labels like sandbox, backpack, and basketball court. They split each compound into two known words, then explained how the parts combined to create a new meaning. The map was clear, useful, and easy to read.'
    },
    {
        title: 'Multisyllable Checkpoint',
        level: '3-5 · Multisyllabic',
        gradeBand: '3-5',
        focus: 'Syllable division',
        tags: ['multisyllable'],
        content: 'At the checkpoint station, students decoded words such as fantastic, remember, and computer. They underlined vowel patterns, divided syllables, and blended each part. When someone got stuck, partners coached with a repeatable routine: mark, divide, blend, confirm.'
    },
    {
        title: 'Perspective Letters',
        level: '6-8 · Fluency + Meaning',
        gradeBand: '6-8',
        focus: 'Prosody and punctuation',
        tags: ['multisyllable', 'suffix'],
        content: 'The class read two letters about the same event from different perspectives. One voice sounded frustrated, and the other sounded hopeful. Students practiced prosody by pausing at punctuation and adjusting intonation to reflect speaker purpose in each paragraph.'
    },
    {
        title: 'Science Terms in Context',
        level: '6-8 · Academic',
        gradeBand: '6-8',
        focus: 'Morphology and vocabulary',
        tags: ['prefix', 'suffix', 'multisyllable'],
        content: 'In science class, teams decoded words like microscopic, reactivate, and transportation. They located prefixes, roots, and suffixes, then used context clues to explain meaning. Each team created a short summary using at least three new terms accurately.'
    },
    {
        title: 'Argument Outline',
        level: '9-12 · Advanced',
        gradeBand: '9-12',
        focus: 'Academic language',
        tags: ['prefix', 'suffix', 'multisyllable', 'schwa'],
        content: 'Students prepared an argument outline on school sustainability choices. They read a source set, annotated key terms, and decoded unfamiliar words before discussion. During rehearsal, they focused on precise language, clear transitions, and evidence-based claims.'
    },
    {
        title: 'Career Pathway Memo',
        level: '9-12 · Advanced',
        gradeBand: '9-12',
        focus: 'Complex text fluency',
        tags: ['multisyllable', 'suffix'],
        content: 'A student team drafted a memo for a mock internship panel. They revised for clarity, checked pronunciation of technical words, and practiced reading aloud with pacing that supported comprehension. Final reflections focused on communication, confidence, and audience awareness.'
    },
    {
        title: 'Splash at Lunch',
        level: 'K-2 · Digraphs',
        gradeBand: 'K-2',
        focus: 'Sh, ch, th',
        tags: ['digraph'],
        content: 'At lunch, Theo had a fish dish and a peach. Ash had chips and a thick shake. A splash hit the bench when Theo shook his cup. The class said, "Check your cup and clean the chair." They did, then they got back to lunch.'
    },
    {
        title: 'Crab Trap Plan',
        level: 'K-2 · Blends',
        gradeBand: 'K-2',
        focus: 'Blends',
        tags: ['ccvc', 'cvcc'],
        content: 'Brock and Clara had to set a crab trap near the dock. Clara drew a plan with a black crayon. Brock put a snack in the trap and set it by a flat rock. They came back at dusk and found one small crab to sketch and then set free.'
    },
    {
        title: 'Late Train Note',
        level: 'K-2 · Magic E',
        gradeBand: 'K-2',
        focus: 'Long vowel CVCe',
        tags: ['cvce'],
        content: 'Kate wrote a note: "The train is late, so wait by the gate." She gave the note to Jake. Jake smiled and said, "I can read each long vowel because the e at the end is silent." They made it to the gate right on time.'
    },
    {
        title: 'Bright Sea Team',
        level: 'K-2 · Vowel Teams',
        gradeBand: 'K-2',
        focus: 'Vowel teams',
        tags: ['vowel_team'],
        content: 'A team on the beach had a clean blue sail. They read a chart that said to steer near the green buoy. "Read, then lead," said the coach. The team agreed. They moved in a straight line and reached the shore with big smiles.'
    },
    {
        title: 'Schwa Strategy Circle',
        level: '3-5 · Schwa',
        gradeBand: '3-5',
        focus: 'Unstressed syllables',
        tags: ['schwa', 'multisyllable'],
        content: 'Students sat in a strategy circle and practiced words like support, family, and problem. They tapped each syllable, circled the unstressed vowel, and rehearsed accurate pronunciation. The group wrote a quick tip card to use during independent reading.'
    },
    {
        title: 'Prefix Detective File',
        level: '3-5 · Morphology',
        gradeBand: '3-5',
        focus: 'Prefix meaning',
        tags: ['prefix', 'multisyllable'],
        content: 'In the detective file, students sorted preview, misread, and reconnect by prefix. They discussed how each prefix shifted meaning and then tested the words in context. The team closed with a short paragraph using at least two new words correctly.'
    },
    {
        title: 'Suffix Revision Sprint',
        level: '3-5 · Morphology',
        gradeBand: '3-5',
        focus: 'Suffixes in writing',
        tags: ['suffix', 'multisyllable'],
        content: 'Writers revised a draft and swapped broad words for precise forms: create became creative, assist became assistant, and move became movement. Partners read each sentence aloud and listened for clarity, rhythm, and accurate pronunciation.'
    },
    {
        title: 'History Debate Warm-Up',
        level: '6-8 · Academic',
        gradeBand: '6-8',
        focus: 'Academic vocabulary',
        tags: ['prefix', 'suffix', 'multisyllable'],
        content: 'Before debate, students decoded words like disagreement, reconstruction, and political. They underlined roots and affixes, practiced pronunciation, and linked each term to a short evidence statement. The warm-up improved confidence before discussion.'
    },
    {
        title: 'Lab Safety Briefing',
        level: '6-8 · Fluency + Meaning',
        gradeBand: '6-8',
        focus: 'Precision and prosody',
        tags: ['multisyllable', 'suffix'],
        content: 'During lab briefing, students read instructions with careful pacing so every safety step was clear. They paused at punctuation, emphasized caution words, and corrected difficult terms like protective and ventilation. Teams then restated directions in their own words.'
    },
    {
        title: 'College Seminar Preview',
        level: '9-12 · Advanced',
        gradeBand: '9-12',
        focus: 'Complex syntax and fluency',
        tags: ['prefix', 'suffix', 'multisyllable'],
        content: 'Students previewed a seminar article and decoded low-frequency academic vocabulary before annotation. They practiced concise oral summaries with attention to phrasing and tone. Final reflections compared first-read confidence to post-strategy confidence.'
    },
    {
        title: 'Internship Reflection Script',
        level: '9-12 · Advanced',
        gradeBand: '9-12',
        focus: 'Presentation fluency',
        tags: ['multisyllable', 'schwa', 'suffix'],
        content: 'A learner drafted a reflection script for an internship panel. They rehearsed transitions, checked stress patterns in multisyllabic words, and adjusted pacing for audience comprehension. The final read-through sounded clear, credible, and professional.'
    },
    {
        title: 'Big Net Picnic',
        level: 'K-2 · CVC',
        gradeBand: 'K-2',
        focus: 'Short vowels',
        tags: ['cvc'],
        content: 'Tim and Kim had a big red net and a bag. They ran to the pond to get fish for a pretend picnic game. Tim let the net dip in the pond, and Kim set the bag on a log. They did not get fish, but they got wet and had fun.'
    },
    {
        title: 'Mud Hut Plan',
        level: 'K-2 · CVC',
        gradeBand: 'K-2',
        focus: 'Short vowels',
        tags: ['cvc'],
        content: 'Sam had a mud hut map on a pad. Max dug in the mud and Pat put sticks on top. The hut had a big gap, so Sam put in a flat plank. At dusk, the hut was set, and the kids sat by it to clap and grin.'
    },
    {
        title: 'Zip the Bag',
        level: 'K-2 · CVC',
        gradeBand: 'K-2',
        focus: 'Short vowels',
        tags: ['cvc'],
        content: 'Liz had to pack a bag for a short trip. She put in a hat, a cup, and a map. The bag did not zip at first, so she had to swap one big item for a small one. Then the zip shut, and Liz was set to go.'
    },
    {
        title: 'Hot Pot Shop',
        level: 'K-2 · CVC',
        gradeBand: 'K-2',
        focus: 'Short vowels',
        tags: ['cvc'],
        content: 'At the shop, Rob saw a hot pot and a red pan. Nan got a cup and a lid. The clerk said, "Check the tag to pick the best cost." Rob did the math on his pad, and Nan said the plan was smart and fair.'
    },
    {
        title: 'Chalk and Cheese',
        level: 'K-2 · Digraphs',
        gradeBand: 'K-2',
        focus: 'Ch and sh',
        tags: ['digraph'],
        content: 'Chad had chalk and a dish. Shea had cheese and chips. They had to choose one snack for lunch and one tool for art. Chad chose chalk and chips, and Shea chose cheese and a brush. They both had what they need and got to work.'
    },
    {
        title: 'The Thin Thread',
        level: 'K-2 · Digraphs',
        gradeBand: 'K-2',
        focus: 'Th',
        tags: ['digraph'],
        content: 'Theo saw a thin thread on his shirt and told Beth. Beth said, "Think and then fix it with care." They got a thick cloth and set the shirt on the bench. With calm hands, they fixed the thread and put the shirt back on.'
    },
    {
        title: 'Shark in the Shade',
        level: 'K-2 · Digraphs',
        gradeBand: 'K-2',
        focus: 'Sh and ch',
        tags: ['digraph'],
        content: 'At beach class, kids drew a shark in the shade. Ash drew sharp fins and Chip drew a shell near each wave. The coach said, "Check your sketch and add one more shape." They did, then they shared each page with a classmate.'
    },
    {
        title: 'Lunch Bench Check',
        level: 'K-2 · Digraphs',
        gradeBand: 'K-2',
        focus: 'Sh, ch, th',
        tags: ['digraph'],
        content: 'At lunch, the class did a quick bench check. They found a chip bag, a thin cloth, and a lunch tray with a splash. "Push each dish to the center," said the teacher. The class did each task and left the bench clean.'
    },
    {
        title: 'Clap for the Frog',
        level: 'K-2 · Blends',
        gradeBand: 'K-2',
        focus: 'Initial blends',
        tags: ['ccvc', 'cvcc'],
        content: 'Brad and Clare saw a frog jump from grass to rock. The frog did a quick flip and then hid by a plant. "Clap if you spot it again," said Brad. The frog sprang back, and the class gave one big clap for the brave frog.'
    },
    {
        title: 'Trip to the Brick Pond',
        level: 'K-2 · Blends',
        gradeBand: 'K-2',
        focus: 'Initial and final blends',
        tags: ['ccvc', 'cvcc'],
        content: 'The class took a trip to a pond by a brick path. Brent brought a black sketch pad, and Priya brought a chart. They sat on a flat rock and drew each duck. At the end, they clipped each sketch to a class board.'
    },
    {
        title: 'Fresh Grass Track',
        level: 'K-2 · Blends',
        gradeBand: 'K-2',
        focus: 'Blends',
        tags: ['ccvc', 'cvcc'],
        content: 'On sports day, the class ran laps on the fresh grass track. Fred was fast at the start, but Grace kept a calm pace and passed him at the end. The coach said, "Great grit from both of you." They shook hands and got a drink.'
    },
    {
        title: 'Black Flag Sprint',
        level: 'K-2 · Blends',
        gradeBand: 'K-2',
        focus: 'Blends',
        tags: ['ccvc', 'cvcc'],
        content: 'In relay class, one team had a black flag and one had a blue flag. Each group had to sprint to a mark and clip the flag to a stand. Brock slipped one step but did not quit. He got back up and still helped his team win.'
    },
    {
        title: 'Pete and the Cube',
        level: 'K-2 · Magic E',
        gradeBand: 'K-2',
        focus: 'Long vowel CVCe',
        tags: ['cvce'],
        content: 'Pete made a cube from paper and tape. He wrote these words on each side: made, note, bike, and cube. "The e is silent and helps the vowel say its name," said Pete. The group read each side and gave Pete a smile.'
    },
    {
        title: 'Ride the Bike Lane',
        level: 'K-2 · Magic E',
        gradeBand: 'K-2',
        focus: 'Long vowel CVCe',
        tags: ['cvce'],
        content: 'Jade and Mike rode in the bike lane by the lake. A sign said, "Ride safe and keep space." Mike saw that every key word had a final e. Jade said, "We can decode these words fast now." They waved and rode home safe.'
    },
    {
        title: 'Home Note Code',
        level: 'K-2 · Magic E',
        gradeBand: 'K-2',
        focus: 'Long vowel CVCe',
        tags: ['cvce'],
        content: 'At home, Zoe hid a note with a code for her dad. The note said, "Look by the stove and then by the vase." Dad solved each clue and found a joke by the gate. Zoe clapped and said, "Nice decode work!"'
    },
    {
        title: 'Team Seal Rescue',
        level: 'K-2 · Vowel Teams',
        gradeBand: 'K-2',
        focus: 'Ea and ee',
        tags: ['vowel_team'],
        content: 'At the beach, a team saw a seal near a green rope. The coach said, "Keep clear and speak low." They read the safety sheet, then called the rescue crew. The team stayed calm, and the seal got safe care right away.'
    },
    {
        title: 'Rainy Day Paint',
        level: 'K-2 · Vowel Teams',
        gradeBand: 'K-2',
        focus: 'Ai and ay',
        tags: ['vowel_team'],
        content: 'On a rainy day, the class did paint time. Mia made a bright rainbow and Jay made a train in gray. They read labels on each paint tray and put lids on when done. The room stayed neat, and each page looked great.'
    },
    {
        title: 'Blue Moon Cruise',
        level: 'K-2 · Vowel Teams',
        gradeBand: 'K-2',
        focus: 'Oo and ue',
        tags: ['vowel_team'],
        content: 'The class read a story called Blue Moon Cruise. In the tale, a crew used clues to choose a route. The teacher paused at each vowel team and had students echo read. By the end, the whole group read with smooth pace.'
    },
    {
        title: 'Farm Cart Race',
        level: 'K-2 · R-Controlled',
        gradeBand: 'K-2',
        focus: 'Ar',
        tags: ['r_controlled'],
        content: 'At the farm fair, kids ran a cart race in the barn yard. Mark pushed his cart past a dark tarp and a sharp turn. Sara kept her cart on the marked path. Both carts got to the start line for one more round.'
    },
    {
        title: 'Storm at the Port',
        level: 'K-2 · R-Controlled',
        gradeBand: 'K-2',
        focus: 'Or',
        tags: ['r_controlled'],
        content: 'A storm hit the port at dawn. The short horn warned each boat to stay near shore. Nora and Jorge read the port report board and saw the word storm many times. They talked about or words and then went indoors.'
    },
    {
        title: 'Turn at Bird Park',
        level: 'K-2 · R-Controlled',
        gradeBand: 'K-2',
        focus: 'Er, ir, ur',
        tags: ['r_controlled'],
        content: 'At Bird Park, a sign said, "Turn left at the fern and look for birds near the curb." Mira heard the er sound in fern, bird, and curb. She circled each word in her notebook and read the line again with clear voice.'
    },
    {
        title: 'Coin Count Out Loud',
        level: 'K-2 · Diphthongs',
        gradeBand: 'K-2',
        focus: 'Oi and ou',
        tags: ['diphthong'],
        content: 'Joy found coins in a toy box and said, "Let us count out loud." Lou joined in and pointed to each coin. They heard oi in coin and ou in out. Then they wrote both patterns on a card and stuck it on the wall.'
    },
    {
        title: 'Boy Scout Point',
        level: 'K-2 · Diphthongs',
        gradeBand: 'K-2',
        focus: 'Oi and ou',
        tags: ['diphthong'],
        content: 'The scout group met at a point by the trail. One boy had to shout when he found the route mark. The leader said, "Listen for oi and ou words while we walk." The group did, and they found many sound pattern pairs.'
    },
    {
        title: 'Bell Buzz Hill',
        level: 'K-2 · FLOSS',
        gradeBand: 'K-2',
        focus: 'FLOSS endings',
        tags: ['floss'],
        content: 'At camp, the bell rang from the hill, and Tess said, "Class starts now." Russ had a pass and Jill had a shell for the lesson bin. The class read words that end in ll, ss, and zz and then sorted them by ending.'
    },
    {
        title: 'Cliff Pass Toss',
        level: 'K-2 · FLOSS',
        gradeBand: 'K-2',
        focus: 'FLOSS endings',
        tags: ['floss'],
        content: 'On game day, kids had to toss a ball past a small cliff mark. Miss Bell said, "Do not rush. Set your feet and toss." The class then read pass, cliff, and miss on cards and matched each word to its ending sound.'
    },
    {
        title: 'Long Song Campfire',
        level: 'K-2 · Welded',
        gradeBand: 'K-2',
        focus: 'Ng and nk',
        tags: ['welded'],
        content: 'At campfire sing time, kids sang a long song and drank warm drinks. Hank had a trunk with string lights and a blank song sheet. Ming found ink for names at the top. They sang, rang bells, and had a calm night.'
    },
    {
        title: 'Trunk and String Tag',
        level: 'K-2 · Welded',
        gradeBand: 'K-2',
        focus: 'Ng and nk',
        tags: ['welded'],
        content: 'Each camper had a trunk and a string tag. The teacher said, "Think and then link your tag to the right trunk." Kids checked names, fixed one mix up, and then sat in a ring. They sang one song before bed.'
    },
    {
        title: 'Schwa in Animal Report',
        level: '3-5 · Schwa',
        gradeBand: '3-5',
        focus: 'Unstressed syllables',
        tags: ['schwa', 'multisyllable'],
        content: 'Students wrote an animal report and practiced words like animal, habitat, and tropical. They tapped syllables, marked the unstressed sound, and rehearsed each line aloud. The class used a quick schwa check before final sharing.'
    },
    {
        title: 'Camera and Memory',
        level: '3-5 · Schwa',
        gradeBand: '3-5',
        focus: 'Schwa in connected text',
        tags: ['schwa', 'multisyllable'],
        content: 'The media club created a memory board from a school trip. In the script, they found schwa sounds in camera, memory, and celebrate. Partners practiced fluent reading with smooth stress patterns, then recorded a final read.'
    },
    {
        title: 'Support for the Team',
        level: '3-5 · Schwa',
        gradeBand: '3-5',
        focus: 'Schwa and fluency',
        tags: ['schwa', 'multisyllable'],
        content: 'During a team challenge, students read support plans and highlighted unstressed syllables in difficult words. They practiced chunks, then read full sentences with natural pacing. The final reflection explained how schwa awareness improved decoding speed.'
    },
    {
        title: 'Problem Solver Plan',
        level: '3-5 · Schwa',
        gradeBand: '3-5',
        focus: 'Schwa transfer',
        tags: ['schwa', 'multisyllable'],
        content: 'The class solved a design problem and logged each strategy step. They noticed schwa in words like problem, separate, and decimal while reading notes aloud. Each group made a poster of tips for decoding unstressed syllables in content classes.'
    },
    {
        title: 'Preview and Predict',
        level: '3-5 · Morphology',
        gradeBand: '3-5',
        focus: 'Prefix meaning',
        tags: ['prefix', 'multisyllable'],
        content: 'Readers previewed a short article and predicted key ideas from headings. They sorted pre words, explained how the prefix changed meaning, and wrote one evidence sentence for each heading. Peer partners checked accuracy and clarity.'
    },
    {
        title: 'Rebuild the Model',
        level: '3-5 · Morphology',
        gradeBand: '3-5',
        focus: 'Re- prefix',
        tags: ['prefix', 'multisyllable'],
        content: 'In science, teams rebuilt a storm model after the first test failed. They tracked words such as rebuild, review, and remeasure. Students connected the prefix re to repeated action and used the words in a clear procedure summary.'
    },
    {
        title: 'Misprint Fix Station',
        level: '3-5 · Morphology',
        gradeBand: '3-5',
        focus: 'Mis- and dis-',
        tags: ['prefix', 'multisyllable'],
        content: 'At the fix station, students corrected a page with several misprints and disconnected labels. They discussed how mis and dis shifted meaning and then revised sentences for clarity. The class compared first drafts to final corrected versions.'
    },
    {
        title: 'Careful Writers Club',
        level: '3-5 · Morphology',
        gradeBand: '3-5',
        focus: 'Suffixes in writing',
        tags: ['suffix', 'multisyllable'],
        content: 'In writers club, students changed base words with suffixes to improve precision. Hope became hopeful, teach became teacher, and care became careful. They read each revision aloud and checked if the new form matched the sentence purpose.'
    },
    {
        title: 'Movement in the Market',
        level: '3-5 · Morphology',
        gradeBand: '3-5',
        focus: 'Noun-forming suffixes',
        tags: ['suffix', 'multisyllable'],
        content: 'A class market simulation used words like movement, payment, and shipment. Students identified suffix patterns and grouped words by part of speech. They then wrote a short market report using at least four derived words correctly.'
    },
    {
        title: 'Helpful Partner Notes',
        level: '3-5 · Morphology',
        gradeBand: '3-5',
        focus: 'Adjective and adverb suffixes',
        tags: ['suffix', 'multisyllable'],
        content: 'Partners exchanged notes and revised language to sound helpful and specific. Quick became quickly, calm became calmly, and use became useful. Teams shared one revised paragraph and explained why each suffix choice improved meaning.'
    },
    {
        title: 'Sunflower Sketchbook',
        level: '3-5 · Compounds',
        gradeBand: '3-5',
        focus: 'Compound words',
        tags: ['compound'],
        content: 'The art class made a sketchbook page with compound words from the school garden: sunflower, beehive, birdhouse, and raincoat. Students split each word into parts, explained meaning, and then wrote a short caption for each sketch.'
    },
    {
        title: 'Backpack Raincheck',
        level: '3-5 · Compounds',
        gradeBand: '3-5',
        focus: 'Compound words in context',
        tags: ['compound'],
        content: 'On a rainy field day, students read schedule cards with words like backpack, raincheck, and playground. They decoded each compound quickly and used it in an oral sentence. The class then made a compound word wall for reference.'
    },
    {
        title: 'Syllable Ladder Practice',
        level: '3-5 · Multisyllabic',
        gradeBand: '3-5',
        focus: 'Syllable division',
        tags: ['multisyllable'],
        content: 'Students built a syllable ladder from words of increasing length: robot, computer, celebrate, and transportation. They marked vowels, divided syllables, and blended in sequence. The final challenge was reading each word inside a full sentence.'
    },
    {
        title: 'Fantastic Planet Poster',
        level: '3-5 · Multisyllabic',
        gradeBand: '3-5',
        focus: 'Multisyllabic decoding',
        tags: ['multisyllable'],
        content: 'For science fair, teams made a fantastic planet poster with many multisyllabic labels. They practiced decoding each label before presenting and adjusted pacing at punctuation. Audience questions showed stronger vocabulary accuracy than before.'
    },
    {
        title: 'Computer Corner Protocol',
        level: '3-5 · Multisyllabic',
        gradeBand: '3-5',
        focus: 'Procedure fluency',
        tags: ['multisyllable', 'suffix'],
        content: 'In computer corner, students read a protocol for logging in, organizing files, and submitting work. They decoded multisyllabic verbs and nouns, then paraphrased each step. Partners checked whether the paraphrase kept all key details.'
    },
    {
        title: 'Civic Speech Rehearsal',
        level: '6-8 · Academic',
        gradeBand: '6-8',
        focus: 'Prosody and argument language',
        tags: ['multisyllable', 'suffix'],
        content: 'Students rehearsed a civic speech and monitored pace, stress, and pause points. They practiced terms such as participation, responsibility, and representation, then revised sentence phrasing for clarity. Peer feedback focused on credibility and audience comprehension.'
    },
    {
        title: 'Ecosystem Field Notes',
        level: '6-8 · Academic',
        gradeBand: '6-8',
        focus: 'Vocabulary in science context',
        tags: ['prefix', 'suffix', 'multisyllable'],
        content: 'In ecosystem field notes, students decoded words like biodiversity, interaction, and decomposition. They identified morphemes, predicted meaning, and confirmed with context from observation notes. Teams then presented one concise claim with evidence.'
    },
    {
        title: 'Media Literacy Roundtable',
        level: '6-8 · Fluency + Meaning',
        gradeBand: '6-8',
        focus: 'Complex sentence reading',
        tags: ['multisyllable', 'prefix'],
        content: 'At the roundtable, students read short media claims and evaluated source reliability. They decoded complex words, marked transition phrases, and practiced expressive reading of evidence statements. Discussion quality improved when text reading became more fluent.'
    },
    {
        title: 'Design Brief Walkthrough',
        level: '6-8 · Academic',
        gradeBand: '6-8',
        focus: 'Technical fluency',
        tags: ['suffix', 'multisyllable'],
        content: 'Teams completed a design brief walkthrough for a classroom prototype challenge. They decoded technical vocabulary, chunked long sentences, and rehearsed oral delivery with natural phrasing. The final brief was clear, organized, and easier for peers to follow.'
    },
    {
        title: 'Policy Analysis Warmup',
        level: '9-12 · Advanced',
        gradeBand: '9-12',
        focus: 'Academic vocabulary and cadence',
        tags: ['prefix', 'suffix', 'multisyllable', 'schwa'],
        content: 'Students completed a policy analysis warmup with targeted vocabulary before seminar. They decoded unfamiliar terms, annotated author claims, and practiced spoken summaries with controlled pacing. The group used a rubric to evaluate precision, coherence, and delivery.'
    },
    {
        title: 'Capstone Presentation Draft',
        level: '9-12 · Advanced',
        gradeBand: '9-12',
        focus: 'Presentation fluency and clarity',
        tags: ['multisyllable', 'suffix', 'prefix'],
        content: 'Learners drafted capstone presentation scripts and tested sentence rhythm through repeated read-throughs. They corrected pronunciation of domain-specific terms and revised transitions for audience flow. Final drafts demonstrated stronger confidence and clearer message structure.'
    }
];

function ensureDecodableTextsLibrary() {
    if (Array.isArray(window.DECODABLE_TEXTS) && window.DECODABLE_TEXTS.length >= DEFAULT_DECODABLE_TEXTS.length) {
        return window.DECODABLE_TEXTS;
    }

    const base = DEFAULT_DECODABLE_TEXTS.map((entry) => ({ ...entry }));
    const expansion = Array.isArray(window.DECODABLE_TEXTS_EXPANSION)
        ? window.DECODABLE_TEXTS_EXPANSION.map((entry) => ({ ...entry }))
        : [];

    const merged = [];
    const seen = new Set();
    [...base, ...expansion].forEach((entry) => {
        if (!entry || typeof entry !== 'object') return;
        const title = String(entry.title || '').trim();
        const gradeBand = String(entry.gradeBand || '').trim();
        const content = String(entry.content || '').trim();
        if (!title || !content) return;
        const key = `${title.toLowerCase()}|${gradeBand.toLowerCase()}`;
        if (seen.has(key)) return;
        seen.add(key);
        merged.push(entry);
    });

    window.DECODABLE_TEXTS = merged;
    return window.DECODABLE_TEXTS;
}

function ensureDecodableModal() {
    let modal = document.getElementById('decodable-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'decodable-modal';
        modal.className = 'modal hidden decodable-modal';
        modal.dataset.overlayClose = 'true';
        modal.innerHTML = `
            <div class="modal-content decodable-modal-content">
                <button id="close-decodable-btn" class="close-btn close-decodable" aria-label="Close">✕</button>
                <h2>Decodable Library</h2>
                <p class="assessment-subtitle">Pick a passage, then use follow-along reading with adjustable speed.</p>
                <div class="decodable-toolbar">
                    <label for="decodable-speed-select"><strong>Read speed</strong></label>
                    <select id="decodable-speed-select" aria-label="Decodable read speed"></select>
                    <div id="decodable-speed-note" class="decodable-speed-note" aria-live="polite"></div>
                </div>
                <div id="decodable-text-list"></div>
            </div>
        `;
        document.body.appendChild(modal);
        modal.querySelector('.close-btn')?.addEventListener('click', closeModal);
    }

    const speedSelect = modal.querySelector('#decodable-speed-select');
    if (speedSelect && !speedSelect.dataset.initialized) {
        speedSelect.innerHTML = DECODABLE_SPEED_PRESETS.map((value) => {
            const label = `${value.toFixed(2).replace(/\.00$/, '')}x`;
            return `<option value="${value}">${label}</option>`;
        }).join('');
        speedSelect.dataset.initialized = 'true';
        speedSelect.addEventListener('change', () => {
            appSettings.decodableReadSpeed = normalizeDecodableReadSpeed(speedSelect.value);
            saveSettings();
            const note = document.getElementById('decodable-speed-note');
            if (note) note.textContent = `Playback set to ${appSettings.decodableReadSpeed.toFixed(2).replace(/\.00$/, '')}x`;
        });
    }

    if (speedSelect) {
        speedSelect.value = String(getDecodableReadSpeed());
    }
    const note = modal.querySelector('#decodable-speed-note');
    if (note) {
        note.textContent = `Playback set to ${getDecodableReadSpeed().toFixed(2).replace(/\.00$/, '')}x`;
    }

    return modal;
}

function tokenizeDecodableContent(content = '') {
    const raw = String(content || '');
    const tokens = [];
    const matcher = /\s+|[^\s]+/g;
    let match;
    while ((match = matcher.exec(raw)) !== null) {
        const tokenText = match[0];
        tokens.push({
            text: tokenText,
            start: match.index,
            isWord: /[A-Za-z\u00C0-\u024F]/.test(tokenText)
        });
    }
    return tokens;
}

function renderDecodablePassageContent(container, text, title) {
    if (!container) return;
    container.textContent = '';
    const tokens = tokenizeDecodableContent(text);
    const fragment = document.createDocumentFragment();
    const wordStarts = [];
    let wordIndex = 0;

    tokens.forEach((token) => {
        if (token.isWord) {
            const span = document.createElement('span');
            span.className = 'decodable-word';
            span.dataset.wordIndex = String(wordIndex);
            span.textContent = token.text;
            fragment.appendChild(span);
            wordStarts.push(token.start);
            wordIndex += 1;
        } else {
            fragment.appendChild(document.createTextNode(token.text));
        }
    });

    container.appendChild(fragment);
    decodableWordMetaByTitle.set(title, { wordStarts, wordCount: wordIndex });
}

function clearDecodableCardHighlights() {
    if (decodableFollowAlongState.card) {
        decodableFollowAlongState.card.classList.remove('is-reading');
    }
    decodableFollowAlongState.words.forEach((wordEl) => {
        wordEl.classList.remove('is-active');
    });
}

function stopDecodableFollowAlong({ clearHighlights = true } = {}) {
    if (decodableFollowAlongState.timerId) {
        clearInterval(decodableFollowAlongState.timerId);
        decodableFollowAlongState.timerId = null;
    }
    if (decodableFollowAlongState.audio && decodableFollowAlongState.onTimeUpdate) {
        decodableFollowAlongState.audio.removeEventListener('timeupdate', decodableFollowAlongState.onTimeUpdate);
    }
    if (decodableFollowAlongState.audio && decodableFollowAlongState.onLoadedMetadata) {
        decodableFollowAlongState.audio.removeEventListener('loadedmetadata', decodableFollowAlongState.onLoadedMetadata);
    }
    if (clearHighlights) {
        clearDecodableCardHighlights();
    }
    decodableFollowAlongState.card = null;
    decodableFollowAlongState.words = [];
    decodableFollowAlongState.wordStarts = [];
    decodableFollowAlongState.activeWordIndex = -1;
    decodableFollowAlongState.audio = null;
    decodableFollowAlongState.onTimeUpdate = null;
    decodableFollowAlongState.onLoadedMetadata = null;
}

function setDecodableActiveWord(index, scrollIntoView = true) {
    if (!decodableFollowAlongState.words.length) return;
    const safeIndex = Math.max(0, Math.min(decodableFollowAlongState.words.length - 1, Number(index) || 0));
    if (safeIndex === decodableFollowAlongState.activeWordIndex) return;

    const prev = decodableFollowAlongState.words[decodableFollowAlongState.activeWordIndex];
    if (prev) prev.classList.remove('is-active');

    const next = decodableFollowAlongState.words[safeIndex];
    if (!next) return;
    next.classList.add('is-active');
    decodableFollowAlongState.activeWordIndex = safeIndex;

    if (scrollIntoView) {
        next.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    }
}

function findDecodableCardByTitle(title = '') {
    const slug = normalizePassageSlug(title);
    if (!slug) return null;
    return document.querySelector(`.decodable-text-card[data-passage-slug="${slug}"]`);
}

function activateDecodableCard(title = '') {
    const slug = normalizePassageSlug(title);
    document.querySelectorAll('.decodable-text-card').forEach((card) => {
        card.classList.toggle('is-selected', card.dataset.passageSlug === slug);
    });
}

function beginDecodableFollowAlong(title = '') {
    stopDecodableFollowAlong({ clearHighlights: true });
    decodableFollowAlongState.token += 1;

    const card = findDecodableCardByTitle(title);
    if (!card) return decodableFollowAlongState.token;
    const words = Array.from(card.querySelectorAll('.decodable-word'));
    const meta = decodableWordMetaByTitle.get(title) || { wordStarts: [] };

    decodableFollowAlongState.title = title;
    decodableFollowAlongState.card = card;
    decodableFollowAlongState.words = words;
    decodableFollowAlongState.wordStarts = Array.isArray(meta.wordStarts) ? meta.wordStarts : [];
    decodableFollowAlongState.activeWordIndex = -1;

    card.classList.add('is-reading');
    if (words.length) {
        setDecodableActiveWord(0, false);
    }
    return decodableFollowAlongState.token;
}

function resolveDecodableWordIndexFromChar(charIndex = 0) {
    const starts = decodableFollowAlongState.wordStarts;
    if (!starts.length) return -1;
    let resolved = 0;
    for (let index = 0; index < starts.length; index += 1) {
        if (starts[index] <= charIndex) {
            resolved = index;
        } else {
            break;
        }
    }
    return resolved;
}

function scheduleDecodableTimerFollowAlong(token, content, speed) {
    const totalWords = decodableFollowAlongState.words.length;
    if (!totalWords) return;

    const estimatedMs = Math.max(1800, estimateSpeechDuration(content, getSpeechRate('sentence')) / Math.max(0.5, speed));
    const stepMs = Math.max(120, estimatedMs / Math.max(1, totalWords));
    let index = 0;
    decodableFollowAlongState.timerId = setInterval(() => {
        if (token !== decodableFollowAlongState.token) {
            clearInterval(decodableFollowAlongState.timerId);
            decodableFollowAlongState.timerId = null;
            return;
        }
        index += 1;
        if (index >= totalWords) {
            setDecodableActiveWord(totalWords - 1);
            clearInterval(decodableFollowAlongState.timerId);
            decodableFollowAlongState.timerId = null;
            return;
        }
        setDecodableActiveWord(index);
    }, stepMs);
}

function bindDecodableAudioFollowAlong(token, audio) {
    if (!audio) return;
    decodableFollowAlongState.audio = audio;
    const update = () => {
        if (token !== decodableFollowAlongState.token) return;
        const duration = Number(audio.duration);
        if (!Number.isFinite(duration) || duration <= 0 || !decodableFollowAlongState.words.length) return;
        const ratio = Math.max(0, Math.min(1, audio.currentTime / duration));
        const index = Math.round(ratio * (decodableFollowAlongState.words.length - 1));
        setDecodableActiveWord(index);
    };
    decodableFollowAlongState.onTimeUpdate = update;
    decodableFollowAlongState.onLoadedMetadata = update;
    audio.addEventListener('loadedmetadata', update);
    audio.addEventListener('timeupdate', update);
}

async function speakDecodableTextWithFollowAlong(text, title, speed = 1, existingToken = null) {
    if (!('speechSynthesis' in window)) return false;
    const normalized = normalizeTextForTTS(text);
    if (!normalized) return false;

    let token = Number.isFinite(existingToken) ? existingToken : beginDecodableFollowAlong(title);
    if (!decodableFollowAlongState.words.length) {
        token = beginDecodableFollowAlong(title);
    }
    const voices = await getVoicesForSpeech();
    const preferred = pickBestEnglishVoice(voices);
    const fallbackLang = preferred ? preferred.lang : getPreferredEnglishDialect();
    const utterance = new SpeechSynthesisUtterance(normalized);
    utterance.rate = clampSpeechRate(getSpeechRate('sentence') * speed);
    utterance.pitch = clampSpeechPitch(1.0);
    if (preferred) {
        utterance.voice = preferred;
        utterance.lang = preferred.lang;
    } else if (fallbackLang) {
        utterance.lang = fallbackLang;
    }
    utterance.onboundary = (event) => {
        if (token !== decodableFollowAlongState.token) return;
        if (typeof event.charIndex !== 'number') return;
        const index = resolveDecodableWordIndexFromChar(event.charIndex);
        if (index >= 0) {
            setDecodableActiveWord(index);
        }
    };
    utterance.onend = () => {
        if (token !== decodableFollowAlongState.token) return;
        if (decodableFollowAlongState.words.length) {
            setDecodableActiveWord(decodableFollowAlongState.words.length - 1);
        }
    };
    utterance.onerror = () => {
        if (token !== decodableFollowAlongState.token) return;
        scheduleDecodableTimerFollowAlong(token, normalized, speed);
    };
    speakUtterance(utterance);
    return true;
}

// Open decodable texts
function openDecodableTexts() {
    const decodableTexts = ensureDecodableTextsLibrary();
    if (!decodableTexts.length) return;

    const decodableModal = ensureDecodableModal();
    if (modalOverlay) modalOverlay.classList.remove('hidden');
    decodableModal.classList.remove('hidden');

    const listDiv = document.getElementById('decodable-text-list');
    if (!listDiv) return;
    let recorder = document.getElementById('decodable-recorder');
    if (!recorder) {
        recorder = document.createElement('div');
        recorder.id = 'decodable-recorder';
        recorder.className = 'practice-recorder-group';
        decodableModal.querySelector('.modal-content')?.insertAdjacentElement('beforeend', recorder);
    }
    recorder.innerHTML = '<div class="practice-recorder-note">Select a passage to record.</div>';

    const pattern = document.getElementById('pattern-select')?.value || 'all';
    const texts = decodableTexts.filter((text) => (
        pattern === 'all' || (text.tags && text.tags.some((tag) => tag === pattern || pattern.includes(tag)))
    ));

    listDiv.textContent = '';
    if (!texts.length) {
        const empty = document.createElement('p');
        empty.style.textAlign = 'center';
        empty.style.color = '#666';
        empty.textContent = 'No texts available for this pattern.';
        listDiv.appendChild(empty);
        return;
    }

    const countsByBand = texts.reduce((acc, text) => {
        const band = text.gradeBand || 'Mixed';
        acc[band] = (acc[band] || 0) + 1;
        return acc;
    }, {});
    const countSummary = Object.entries(countsByBand)
        .map(([band, count]) => `${band}: ${count}`)
        .join(' · ');

    const meta = document.createElement('div');
    meta.className = 'decodable-library-meta';
    meta.innerHTML = `<strong>${texts.length} passages ready</strong> · ${countSummary || 'Mixed grade bands'}`;
    listDiv.appendChild(meta);

    texts.forEach((text) => {
        const card = document.createElement('button');
        card.type = 'button';
        card.className = 'decodable-text-card';
        card.dataset.title = text.title;
        card.dataset.passageSlug = normalizePassageSlug(text.title);

        const titleEl = document.createElement('div');
        titleEl.className = 'decodable-text-title';
        titleEl.textContent = text.title;
        card.appendChild(titleEl);

        const levelEl = document.createElement('div');
        levelEl.className = 'decodable-text-level';
        levelEl.textContent = text.level || 'Mixed level';
        card.appendChild(levelEl);

        const contentEl = document.createElement('div');
        contentEl.className = 'decodable-text-content';
        renderDecodablePassageContent(contentEl, text.content, text.title);
        card.appendChild(contentEl);

        card.addEventListener('click', () => {
            readDecodableText(text.title);
        });
        listDiv.appendChild(card);
    });
}

// Read decodable text aloud
async function readDecodableText(title) {
    const text = ensureDecodableTextsLibrary().find((entry) => entry.title === title);
    if (!text) return;

    activateDecodableCard(title);
    clearPracticeGroup('passage:');
    const recorder = document.getElementById('decodable-recorder');
    if (recorder) {
        recorder.innerHTML = '';
        ensurePracticeRecorder(recorder, `passage:${text.title}`, 'Record Passage');
    }

    const speed = getDecodableReadSpeed();
    cancelPendingSpeech(true);
    stopDecodableFollowAlong({ clearHighlights: true });
    const token = beginDecodableFollowAlong(title);

    const playedPacked = await tryPlayPackedPassageClip({
        title: text.title,
        languageCode: 'en',
        playbackRate: speed,
        onPlay: (audio) => {
            if (token !== decodableFollowAlongState.token) return;
            bindDecodableAudioFollowAlong(token, audio);
        }
    });
    if (playedPacked) {
        scheduleDecodableTimerFollowAlong(token, text.content, speed);
        return;
    }

    await speakDecodableTextWithFollowAlong(text.content, text.title, speed, token);
}

// Open progress modal
function openHelpModal() {
    modalOverlay.classList.remove('hidden');
    const helpModal = document.getElementById('help-modal');
    if (helpModal) {
        helpModal.classList.remove('hidden');
    }
}

function openProgressModal() {
    modalOverlay.classList.remove('hidden');
    const progressModal = document.getElementById('progress-modal');
    progressModal.classList.remove('hidden');
    
    // Update stats
    document.getElementById('stat-attempted').textContent = progressData.wordsAttempted;
    document.getElementById('stat-correct').textContent = progressData.wordsCorrect;
    
    const rate = progressData.wordsAttempted > 0 
        ? Math.round((progressData.wordsCorrect / progressData.wordsAttempted) * 100)
        : 0;
    document.getElementById('stat-rate').textContent = rate + '%';
    
    const avgGuesses = progressData.wordsAttempted > 0
        ? (progressData.totalGuesses / progressData.wordsAttempted).toFixed(1)
        : 0;
    document.getElementById('stat-avg-guesses').textContent = avgGuesses;
    
    // Recent words
    const recentDiv = document.getElementById('recent-words');
    if (progressData.recentWords.length === 0) {
        recentDiv.innerHTML = '<p style="color: #666;">No words played yet.</p>';
    } else {
        recentDiv.innerHTML = progressData.recentWords.map(w => `
            <div style="padding: 6px; border-bottom: 1px solid #eee;">
                <strong>${w.word}</strong> - 
                ${w.won ? '✅' : '❌'} 
                (${w.guesses} guesses) - 
                <small>${w.date}</small>
            </div>
        `).join('');
    }
}

// Export progress data
function exportProgressData() {
    const dataStr = JSON.stringify(progressData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `decode-progress-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    
    URL.revokeObjectURL(url);
    showToast('Progress data exported!');
}

// Open phoneme guide
/* ==========================================
   PHONEME CARD INITIALIZATION WITH MOUTH ANIMATIONS
   ========================================== */


/* ==========================================================================
   ADVANCED ARTICULATION SYSTEM
   Comprehensive phoneme guide with mouth positioning and multiple sounds
   ========================================================================== */

// Current selected sound for detailed view
let currentSelectedSound = null;
let currentSelectedTile = null;
let soundGuideBuilt = false;

function populatePhonemeGrid(preselectSound = null) {
    if (!window.PHONEME_DATA) {
        console.error('Phoneme data not loaded!');
        return;
    }

    const subtitle = document.querySelector('.sound-guide-subtitle');
    if (subtitle) subtitle.textContent = 'Tap a tile to see a quick tip and example. Each sound can have its own video clip, including teacher-recorded versions.';

    if (!soundGuideBuilt) {
        buildVowelRow();
        buildAlphabetBoard();
        buildSoundSection('digraph-board', getDigraphSounds());
        buildSoundSection('blend-board', getBlendSounds());
        buildSoundSectionGrouped('vowel-team-board', [
            { title: 'Vowel Teams', sounds: getVowelTeamOnlySounds() },
            { title: 'Diphthongs', sounds: getDiphthongSounds() }
        ], { vowel: true });
        buildSoundSection('rcontrolled-board', getRControlledSounds(), { vowel: true });
        buildSoundSection('welded-board', getWeldedSounds(), { vowel: true });
        initArticulationAudioControls();
        injectSoundGuideInfoButtons();
        soundGuideBuilt = true;
    }

    const defaultSound = preselectSound || currentSelectedSound?.sound || null;
    if (defaultSound) {
        selectSoundByKey(defaultSound);
    } else {
        clearSoundSelection();
    }
}

function buildVowelRow() {
    const vowels = ['a', 'e', 'i', 'o', 'u'];
    buildSoundSection('vowel-row', vowels, { vowel: true });
}

function buildAlphabetBoard() {
    const board = document.getElementById('alphabet-board');
    if (!board) return;
    board.innerHTML = '';

    const letters = 'abcdefghijklmnopqrstuvwxyz'.split('');
    letters.forEach(letter => {
        const data = getLetterTileData(letter);
        if (!data) return;
        const tile = createSoundTile(data.soundKey, data.phoneme, data.label, data.vowel);
        board.appendChild(tile);
    });
}

function buildSoundSection(containerId, sounds, options = {}) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '';

    let count = 0;
    sounds.forEach(item => {
        const config = typeof item === 'string' ? { soundKey: item } : item;
        const phoneme = window.PHONEME_DATA[config.soundKey];
        if (!phoneme) return;
        const label = config.label || phoneme.sound || phoneme.grapheme || config.soundKey;
        const tile = createSoundTile(config.soundKey, phoneme, label, options.vowel);
        container.appendChild(tile);
        count += 1;
    });

    const section = container.closest('.sound-guide-section');
    if (section) {
        section.classList.toggle('hidden', count === 0);
    }
}

function buildSoundSectionGrouped(containerId, groups, options = {}) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '';

    let total = 0;
    groups.forEach(group => {
        const wrapper = document.createElement('div');
        wrapper.className = 'sound-subsection';

        if (group.title) {
            const heading = document.createElement('div');
            heading.className = 'sound-subsection-title';
            heading.textContent = group.title;
            wrapper.appendChild(heading);
        }

        const row = document.createElement('div');
        row.className = 'sound-row';
        group.sounds.forEach(item => {
            const config = typeof item === 'string' ? { soundKey: item } : item;
            const phoneme = window.PHONEME_DATA[config.soundKey];
            if (!phoneme) return;
            const label = config.label || phoneme.sound || phoneme.grapheme || config.soundKey;
            const tile = createSoundTile(config.soundKey, phoneme, label, options.vowel);
            row.appendChild(tile);
            total += 1;
        });

        wrapper.appendChild(row);
        container.appendChild(wrapper);
    });

    const section = container.closest('.sound-guide-section');
    if (section) {
        section.classList.toggle('hidden', total === 0);
    }
}

const SOUND_GUIDE_INFO = {
    short_vowels: {
        title: 'Short Vowels',
        body: 'Short vowels are quick, relaxed vowel sounds. They usually appear in short words.',
        examples: ['cat', 'bed', 'sit', 'hot', 'cup']
    },
    vowel_teams: {
        title: 'Vowel Teams',
        body: 'Two vowels team up (ai, ee, oa) or split digraphs like a-e in cake and i-e in kite.',
        examples: ['rain', 'seed', 'boat', 'cake']
    },
    diphthongs: {
        title: 'Diphthongs',
        body: 'Two vowel sounds glide together in one syllable.',
        examples: ['cow', 'coin', 'toy', 'out']
    },
    digraphs: {
        title: 'Digraphs',
        body: 'Two letters make one sound (sh, ch, th, ng).',
        examples: ['ship', 'chin', 'thin', 'sing']
    },
    blends: {
        title: 'Blends',
        body: 'Two or three consonants blend together. You can still hear each sound.',
        examples: ['bl', 'tr', 'sw', 'st']
    },
    r_controlled: {
        title: 'R-Controlled Vowels',
        body: 'The “r” changes the vowel sound.',
        examples: ['car', 'her', 'bird', 'fork', 'turn']
    },
    welded: {
        title: 'Welded Sounds',
        body: 'Common vowel + consonant chunks that stick together.',
        examples: ['ang', 'ing', 'ong', 'unk']
    },
    alphabet: {
        title: 'Alphabet Sounds',
        body: 'Single-letter sounds. Some change by context (c before a is /k/, before i is /s/).',
        examples: ['b', 'm', 't', 'c']
    }
};

function mapHeadingToInfoKey(text = '') {
    const label = text.toLowerCase();
    if (label.includes('short vowel')) return 'short_vowels';
    if (label.includes('vowel team')) return 'vowel_teams';
    if (label.includes('diphthong')) return 'diphthongs';
    if (label.includes('digraph')) return 'digraphs';
    if (label.includes('blend')) return 'blends';
    if (label.includes('r-controlled') || label.includes('r controlled')) return 'r_controlled';
    if (label.includes('welded')) return 'welded';
    if (label.includes('alphabet')) return 'alphabet';
    return null;
}

function ensureInfoModal() {
    let modal = document.getElementById('info-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'info-modal';
        modal.className = 'modal hidden';
        modal.dataset.overlayClose = 'true';
        modal.innerHTML = `
            <div class="modal-content info-modal-content">
                <button class="close-btn" aria-label="Close">✕</button>
                <h2 id="info-modal-title">More Info</h2>
                <p id="info-modal-body"></p>
                <div id="info-modal-examples" class="info-modal-examples"></div>
            </div>
        `;
        document.body.appendChild(modal);
        const closeBtn = modal.querySelector('.close-btn');
        closeBtn.onclick = () => closeInfoModal();
    }
    return modal;
}

function openInfoModal(key) {
    const info = SOUND_GUIDE_INFO[key];
    if (!info) return;
    const modal = ensureInfoModal();
    const title = modal.querySelector('#info-modal-title');
    const body = modal.querySelector('#info-modal-body');
    const examples = modal.querySelector('#info-modal-examples');
    if (title) title.textContent = info.title;
    if (body) body.textContent = info.body;
    if (examples) {
        examples.innerHTML = '';
        info.examples.forEach(example => {
            const badge = document.createElement('span');
            badge.className = 'info-example';
            badge.textContent = example;
            examples.appendChild(badge);
        });
    }
    if (modalOverlay) modalOverlay.classList.remove('hidden');
    modal.classList.remove('hidden');
}

function closeInfoModal() {
    const infoModal = document.getElementById('info-modal');
    if (!infoModal || infoModal.classList.contains('hidden')) return;
    infoModal.classList.add('hidden');
    const othersOpen = getAllModalElements().some(modal => {
        if (modal.id === 'info-modal') return false;
        return !modal.classList.contains('hidden');
    });
    if (!othersOpen && modalOverlay) {
        modalOverlay.classList.add('hidden');
    }
}

function injectSoundGuideInfoButtons() {
    const headings = document.querySelectorAll('.sound-guide-section h3, .sound-subsection-title');
    headings.forEach(heading => {
        if (heading.querySelector('.info-icon')) return;
        const key = mapHeadingToInfoKey(heading.textContent || '');
        if (!key) return;
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'info-icon';
        btn.setAttribute('aria-label', 'More info');
        btn.dataset.infoKey = key;
        btn.textContent = 'ℹ︎';
        btn.onclick = () => openInfoModal(key);
        heading.appendChild(btn);
    });
}

function getLetterTileData(letter) {
    const vowels = ['a', 'e', 'i', 'o', 'u'];
    if (window.PHONEME_DATA[letter]) {
        return {
            soundKey: letter,
            phoneme: window.PHONEME_DATA[letter],
            label: letter.toUpperCase(),
            vowel: vowels.includes(letter)
        };
    }

    const fallback = {
        c: { soundKey: 'k', name: 'Hard C', example: 'cat', sound: '/k/' },
        q: { soundKey: 'k', name: 'Q (kw)', example: 'quit', sound: '/kw/' },
        x: { soundKey: 'k', name: 'X (ks)', example: 'box', sound: '/ks/' }
    }[letter];

    if (!fallback || !window.PHONEME_DATA[fallback.soundKey]) return null;
    const base = window.PHONEME_DATA[fallback.soundKey];
    return {
        soundKey: fallback.soundKey,
        phoneme: {
            ...base,
            name: fallback.name,
            example: fallback.example,
            sound: fallback.sound,
            grapheme: letter.toUpperCase(),
            description: `${fallback.name} as in ${fallback.example}`
        },
        label: letter.toUpperCase(),
        vowel: vowels.includes(letter)
    };
}

function getDigraphSounds() {
    const sounds = ['ch', 'sh', 'th', 'th-voiced', 'ng', 'zh'];
    return sounds.filter(item => {
        const key = typeof item === 'string' ? item : item.soundKey;
        return window.PHONEME_DATA[key];
    });
}

function getBlendSounds() {
    const blends = window.PHONEME_GROUPS?.consonants?.blends || [
        'bl', 'cl', 'fl', 'gl', 'pl', 'sl',
        'br', 'cr', 'dr', 'fr', 'gr', 'pr', 'tr',
        'sk', 'sm', 'sn', 'sp', 'st', 'sw'
    ];
    return blends.filter(sound => window.PHONEME_DATA[sound]);
}

function getVowelTeamSounds() {
    return getVowelTeamOnlySounds();
}

function getVowelTeamOnlySounds() {
    const fallback = ['ay', 'ee', 'igh', 'oa', 'oo'];
    const fromGroups = window.PHONEME_GROUPS?.vowels?.long || fallback;
    return fromGroups.filter(sound => window.PHONEME_DATA[sound]);
}

function getDiphthongSounds() {
    const fallback = ['ow', 'oi', 'oo-short'];
    const fromGroups = window.PHONEME_GROUPS?.vowels?.diphthongs || fallback;
    return fromGroups.filter(sound => window.PHONEME_DATA[sound]);
}

function getRControlledSounds() {
    const rSounds = ['ar', 'or', 'ur', 'air', 'ear', 'ure'];
    return rSounds.filter(sound => window.PHONEME_DATA[sound]);
}

function getWeldedSounds() {
    const fromGroups = window.PHONEME_GROUPS?.vowels?.welded;
    const welded = Array.isArray(fromGroups) ? fromGroups : ['ang', 'ing', 'ong', 'ung', 'ank', 'ink', 'onk', 'unk'];
    return welded.filter(sound => window.PHONEME_DATA[sound]);
}

function createSoundTile(soundKey, phoneme, label, isVowel = false) {
    const tile = document.createElement('button');
    tile.type = 'button';
    tile.className = `sound-tile${isVowel ? ' vowel' : ''}`;
    tile.dataset.sound = soundKey;
    tile.dataset.label = label;
    tile.textContent = formatSoundLabel(label);

    tile.onclick = () => {
        selectSound(soundKey, phoneme, label, tile);
    };

    return tile;
}

function formatSoundLabel(label) {
    if (!label) return '';
    const text = label.toString();
    if (text.includes('/')) return text;
    return text.toUpperCase();
}

function selectSoundByKey(soundKey) {
    const tile = document.querySelector(`.sound-tile[data-sound="${soundKey}"]`);
    const phoneme = window.PHONEME_DATA[soundKey];
    if (phoneme) {
        selectSound(soundKey, phoneme, phoneme.sound || phoneme.grapheme || soundKey, tile);
    }
}

function clearSoundSelection() {
    currentSelectedSound = null;
    if (currentSelectedTile) {
        currentSelectedTile.classList.remove('selected');
        currentSelectedTile = null;
    }
    const displayPanel = document.getElementById('selected-sound-display');
    if (displayPanel) {
        displayPanel.classList.add('hidden');
    }
    clearPronunciationFeedback();
    clearSoundVideoPlayer();
    releaseActiveSoundVideoUrl();
    const layout = document.querySelector('.sound-guide-layout');
    if (layout) layout.classList.add('no-card');
}

function initPhonemeTabNavigation() {
    const tabs = document.querySelectorAll('.phoneme-tab');
    const contents = document.querySelectorAll('.tab-content');
    
    tabs.forEach(tab => {
        tab.onclick = () => {
            // Update tab appearance
            tabs.forEach(t => {
                t.classList.remove('active');
                t.style.background = 'transparent';
                t.style.color = '#6b7280';
            });
            tab.classList.add('active');
            tab.style.background = 'white';
            tab.style.color = '#374151';
            
            // Show corresponding content
            const targetTab = tab.dataset.tab;
            contents.forEach(content => {
                content.classList.add('hidden');
            });
            document.getElementById(targetTab + '-content').classList.remove('hidden');
        };
    });
}

function populatePhonemeGroup(gridId, sounds) {
    const grid = document.getElementById(gridId);
    if (!grid) return 0;

    grid.innerHTML = '';
    let count = 0;

    sounds.forEach(sound => {
        const phoneme = window.PHONEME_DATA[sound];
        if (!phoneme) return;
        const card = createPhonemeCard(sound, phoneme);
        grid.appendChild(card);
        count += 1;
    });

    const section = grid.closest('.phoneme-section');
    if (section) {
        section.classList.toggle('hidden', count === 0);
    }

    return count;
}

function populateVowelsGrid() {
    if (window.PHONEME_GROUPS && window.PHONEME_GROUPS.vowels) {
        populatePhonemeGroup('vowels-short-grid', window.PHONEME_GROUPS.vowels.short);
        populatePhonemeGroup('vowels-long-grid', window.PHONEME_GROUPS.vowels.long);
        populatePhonemeGroup('vowels-rcontrolled-grid', window.PHONEME_GROUPS.vowels.rControlled);
        populatePhonemeGroup('vowels-diphthongs-grid', window.PHONEME_GROUPS.vowels.diphthongs);
        populatePhonemeGroup('vowels-welded-grid', window.PHONEME_GROUPS.vowels.welded);
        populatePhonemeGroup('vowels-schwa-grid', window.PHONEME_GROUPS.vowels.schwa);
        return;
    }

    const grid = document.getElementById('vowels-grid');
    if (!grid) return;

    const vowels = window.PHONEME_CATEGORIES.vowels.filter(v => window.PHONEME_DATA[v]);
    grid.innerHTML = '';

    vowels.forEach(sound => {
        const phoneme = window.PHONEME_DATA[sound];
        const card = createPhonemeCard(sound, phoneme);
        grid.appendChild(card);
    });
}

function populateConsonantsGrid() {
    if (window.PHONEME_GROUPS && window.PHONEME_GROUPS.consonants) {
        populatePhonemeGroup('consonants-single-grid', window.PHONEME_GROUPS.consonants.single);
        populatePhonemeGroup('consonants-digraphs-grid', window.PHONEME_GROUPS.consonants.digraphs);
        populatePhonemeGroup('consonants-blends-grid', window.PHONEME_GROUPS.consonants.blends);
        return;
    }

    const grid = document.getElementById('consonants-grid');
    if (!grid) return;

    const consonants = window.PHONEME_CATEGORIES.consonants.filter(c => window.PHONEME_DATA[c]);
    grid.innerHTML = '';

    consonants.forEach(sound => {
        const phoneme = window.PHONEME_DATA[sound];
        const card = createPhonemeCard(sound, phoneme);
        grid.appendChild(card);
    });
}

function populateSoundWall() {
    populateVowelValley();

    if (window.PHONEME_GROUPS && window.PHONEME_GROUPS.vowels) {
        populatePhonemeGroup('soundwall-long-vowels', window.PHONEME_GROUPS.vowels.long);
        populatePhonemeGroup('soundwall-rcontrolled', window.PHONEME_GROUPS.vowels.rControlled);
        populatePhonemeGroup('soundwall-diphthongs', window.PHONEME_GROUPS.vowels.diphthongs);
        populatePhonemeGroup('soundwall-welded', window.PHONEME_GROUPS.vowels.welded);
        populatePhonemeGroup('soundwall-schwa', window.PHONEME_GROUPS.vowels.schwa);
    }

    populateConsonantGrid();

    if (window.PHONEME_GROUPS && window.PHONEME_GROUPS.consonants) {
        populatePhonemeGroup('soundwall-blends', window.PHONEME_GROUPS.consonants.blends);
    }
}

function populateVowelValley() {
    const container = document.getElementById('vowel-valley');
    if (!container) return;

    container.innerHTML = '';

    const valley = window.UFLI_VOWEL_VALLEY || [];
    valley.forEach(item => {
        const phoneme = window.PHONEME_DATA[item.sound];
        if (!phoneme) return;
        const card = createPhonemeCard(item.sound, phoneme);
        card.classList.add('valley-item');
        card.style.setProperty('--valley-offset', `${item.offset || 0}px`);
        container.appendChild(card);
    });
}

function populateConsonantGrid() {
    const grid = document.getElementById('consonant-grid');
    if (!grid) return;

    const places = [
        { id: 'lips', label: 'Lips Together' },
        { id: 'teeth', label: 'Teeth on Lip' },
        { id: 'between', label: 'Tongue Between Teeth' },
        { id: 'behind', label: 'Tongue Behind Top Teeth' },
        { id: 'lifted', label: 'Tongue Lifted' },
        { id: 'pulled', label: 'Tongue Pulled Back' },
        { id: 'throat', label: 'Back of Throat' }
    ];

    const manners = [
        { id: 'stop', label: 'Stop' },
        { id: 'nasal', label: 'Nasal' },
        { id: 'fricative', label: 'Fricative' },
        { id: 'affricate', label: 'Affricate' },
        { id: 'glide', label: 'Glide' },
        { id: 'liquid', label: 'Liquid' }
    ];

    if (!grid.dataset.built) {
        grid.innerHTML = '';

        const emptyHeader = document.createElement('div');
        emptyHeader.className = 'grid-header';
        grid.appendChild(emptyHeader);

        places.forEach(place => {
            const header = document.createElement('div');
            header.className = 'grid-header';
            header.textContent = place.label;
            grid.appendChild(header);
        });

        manners.forEach(manner => {
            const rowLabel = document.createElement('div');
            rowLabel.className = 'row-label';
            rowLabel.textContent = manner.label;
            grid.appendChild(rowLabel);

            places.forEach(place => {
                const cell = document.createElement('div');
                cell.className = 'grid-cell';
                cell.id = `cell-${manner.id}-${place.id}`;
                grid.appendChild(cell);
            });
        });

        grid.dataset.built = 'true';
    }

    grid.querySelectorAll('.grid-cell').forEach(cell => {
        cell.innerHTML = '';
    });

    const placementMap = window.UFLI_CONSONANT_GRID || {};
    Object.keys(placementMap).forEach(sound => {
        const placement = placementMap[sound];
        const cell = document.getElementById(`cell-${placement.manner}-${placement.place}`);
        const phoneme = window.PHONEME_DATA[sound];
        if (!cell || !phoneme) return;
        const card = createPhonemeCard(sound, phoneme);
        cell.appendChild(card);
    });
}

function populateLettersGrid() {
    const grid = document.getElementById('letters-grid');
    if (!grid) return;
    
    const letters = Object.keys(window.LETTER_SOUNDS);
    grid.innerHTML = '';
    
    letters.forEach(letter => {
        const card = document.createElement('div');
        card.className = 'letter-card';
        card.style.cssText = `
            background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%);
            color: white;
            padding: 16px;
            border-radius: 8px;
            text-align: center;
            cursor: pointer;
            transition: all 0.2s;
            font-weight: 700;
            font-size: 2rem;
        `;
        
        card.textContent = letter.toUpperCase();
        card.onclick = () => showLetterSounds(letter);
        
        card.addEventListener('mouseenter', () => {
            card.style.transform = 'translateY(-2px)';
            card.style.boxShadow = '0 8px 16px rgba(0,0,0,0.2)';
        });
        
        card.addEventListener('mouseleave', () => {
            card.style.transform = 'translateY(0)';
            card.style.boxShadow = 'none';
        });
        
        grid.appendChild(card);
    });
}

function getMouthClass(phoneme) {
    return phoneme?.animation || 'mouth-neutral';
}

function createPhonemeCard(sound, phoneme) {
    const card = document.createElement('div');
    card.className = 'phoneme-card';
    card.dataset.sound = sound;
    card.dataset.example = phoneme.example || '';
    card.style.cssText = `
        background: white;
        border: 2px solid #e5e7eb;
        border-radius: 8px;
        padding: 12px;
        text-align: center;
        cursor: pointer;
        transition: all 0.2s;
        min-height: 120px;
        display: flex;
        flex-direction: column;
        justify-content: center;
    `;
    
    const displayText = (phoneme.grapheme || sound).toUpperCase();
    
    card.innerHTML = `
        <div class="phoneme-letter">${displayText}</div>
        <div class="phoneme-example">${phoneme.example || ''}</div>
        <div class="phoneme-ipa">${phoneme.sound || ''}</div>
    `;
    
    card.onclick = () => {
        card.classList.remove('cs-phoneme-bounce');
        void card.offsetWidth;
        card.classList.add('cs-phoneme-bounce');
        setTimeout(() => card.classList.remove('cs-phoneme-bounce'), 190);
        selectSound(sound, phoneme);
    };
    
    // Hover effects
    card.addEventListener('mouseenter', () => {
        card.style.borderColor = phoneme.color || '#7aa6e6';
        card.style.transform = 'translateY(-1px)';
        card.style.boxShadow = '0 0 0 2px rgba(231, 198, 118, 0.22), 0 8px 16px rgba(15, 23, 42, 0.12)';
    });
    
    card.addEventListener('mouseleave', () => {
        card.style.borderColor = '#e5e7eb';
        card.style.transform = 'translateY(0)';
        card.style.boxShadow = 'none';
    });
    
    return card;
}

function getSoundNameLabel(phoneme) {
    if (!phoneme || !phoneme.name) return '';
    const label = phoneme.name.toString();
    const lowered = label.toLowerCase();
    if (lowered.includes('blend') || lowered.includes('digraph') || lowered.includes('sound')) return '';
    return label;
}

function formatMouthCue(phoneme) {
    if (!phoneme) return '';
    if (phoneme.example && phoneme.sound) return `Listen for ${phoneme.sound} in “${phoneme.example}.”`;
    if (phoneme.example) return `Listen for the sound in “${phoneme.example}.”`;
    if (phoneme.cue) return phoneme.cue;
    if (phoneme.description) return phoneme.description;
    return '';
}

function formatMouthDescription(phoneme) {
    if (!phoneme) return '';
    if (phoneme.example) return `Example: ${phoneme.example}`;
    return phoneme.description || phoneme.cue || '';
}

function getArticulationShape(phoneme) {
    const shape = (phoneme?.mouthShape || '').toLowerCase();
    if (shape.includes('wide')) return 'wide';
    if (shape.includes('smile')) return 'smile';
    if (shape.includes('rounded')) return 'round';
    if (shape.includes('neutral')) return 'neutral';
    const mouthClass = getMouthClass(phoneme);
    if (mouthClass.includes('th')) return 'tongue';
    if (mouthClass.includes('f')) return 'teeth';
    if (mouthClass.includes('s')) return 'teeth';
    if (['mouth-b', 'mouth-p', 'mouth-m'].includes(mouthClass)) return 'closed';
    if (mouthClass.includes('sh') || mouthClass.includes('ch')) return 'round';
    return 'neutral';
}

function getClipartForSound(soundKey = '', phoneme = null) {
    const key = soundKey.toString().toLowerCase();
    const cliparts = {
        a: { label: 'apple', svg: getClipartSvg('apple') },
        e: { label: 'egg', svg: getClipartSvg('egg') },
        i: { label: 'igloo', svg: getClipartSvg('igloo') },
        o: { label: 'octopus', svg: getClipartSvg('octopus') },
        u: { label: 'umbrella', svg: getClipartSvg('umbrella') }
    };
    if (cliparts[key]) return cliparts[key];
    const fallbackLabel = phoneme?.example || 'sound cue';
    return { label: fallbackLabel, svg: getClipartSvg('sound') };
}

function getClipartSvg(type = 'sound') {
    switch (type) {
        case 'apple':
            return `
                <svg class="sound-clipart clipart-apple" viewBox="0 0 120 120" role="img" aria-label="Apple">
                    <circle cx="60" cy="68" r="30" fill="#f87171"/>
                    <circle cx="48" cy="62" r="18" fill="#fb7185" opacity="0.85"/>
                    <rect x="56" y="26" width="8" height="18" rx="4" fill="#92400e"/>
                    <path d="M60 30c10-12 24-14 32-2-14 6-26 8-32 2Z" fill="#34d399"/>
                </svg>
            `;
        case 'egg':
            return `
                <svg class="sound-clipart clipart-egg" viewBox="0 0 120 120" role="img" aria-label="Egg">
                    <ellipse cx="60" cy="66" rx="30" ry="38" fill="#fef3c7"/>
                    <ellipse cx="50" cy="58" rx="10" ry="16" fill="#fde68a" opacity="0.9"/>
                </svg>
            `;
        case 'igloo':
            return `
                <svg class="sound-clipart clipart-igloo" viewBox="0 0 120 120" role="img" aria-label="Igloo">
                    <path d="M20 78c4-26 24-44 40-44s36 18 40 44H20Z" fill="#bfdbfe"/>
                    <path d="M32 78c3-20 18-34 28-34s25 14 28 34H32Z" fill="#93c5fd"/>
                    <rect x="52" y="70" width="16" height="16" rx="6" fill="#60a5fa"/>
                </svg>
            `;
        case 'octopus':
            return `
                <svg class="sound-clipart clipart-octopus" viewBox="0 0 120 120" role="img" aria-label="Octopus">
                    <circle cx="60" cy="54" r="24" fill="#f472b6"/>
                    <circle cx="50" cy="50" r="4" fill="#0f172a"/>
                    <circle cx="70" cy="50" r="4" fill="#0f172a"/>
                    <path d="M30 74c6 14 18 16 30 10 12 6 24 4 30-10" stroke="#f472b6" stroke-width="10" stroke-linecap="round" fill="none"/>
                </svg>
            `;
        case 'umbrella':
            return `
                <svg class="sound-clipart clipart-umbrella" viewBox="0 0 120 120" role="img" aria-label="Umbrella">
                    <path d="M20 64c8-26 72-26 80 0H20Z" fill="#60a5fa"/>
                    <path d="M60 64v30c0 8-10 8-10 0" stroke="#1e3a8a" stroke-width="6" stroke-linecap="round" fill="none"/>
                    <circle cx="60" cy="60" r="6" fill="#1e3a8a"/>
                </svg>
            `;
        default:
            return `
                <svg class="sound-clipart clipart-sound" viewBox="0 0 120 120" role="img" aria-label="Sound waves">
                    <circle cx="42" cy="60" r="14" fill="#a5b4fc"/>
                    <path d="M70 42c10 12 10 24 0 36" stroke="#818cf8" stroke-width="8" stroke-linecap="round" fill="none"/>
                    <path d="M86 32c14 18 14 38 0 56" stroke="#6366f1" stroke-width="8" stroke-linecap="round" fill="none"/>
                </svg>
            `;
    }
}

function getArticulationIconSvg(phoneme) {
    const shape = getArticulationShape(phoneme);
    const mouth = (() => {
        switch (shape) {
            case 'wide':
                return `<rect x="34" y="60" width="52" height="24" rx="10" fill="#f87171"/>`;
            case 'smile':
                return `<path d="M34 66c10 14 42 14 52 0" stroke="#f87171" stroke-width="10" stroke-linecap="round" fill="none"/>`;
            case 'round':
                return `<circle cx="60" cy="72" r="16" fill="#f87171"/>`;
            case 'closed':
                return `<rect x="30" y="66" width="60" height="10" rx="5" fill="#f87171"/>`;
            case 'tongue':
                return `<path d="M36 58h48v16a14 14 0 0 1-14 14H50a14 14 0 0 1-14-14V58Z" fill="#f87171"/>`;
            default:
                return `<rect x="32" y="64" width="56" height="14" rx="7" fill="#f87171"/>`;
        }
    })();

    return `
        <svg class="sound-clipart clipart-mouth" viewBox="0 0 120 120" role="img" aria-label="Mouth cue">
            <circle cx="60" cy="52" r="34" fill="#fde68a" opacity="0.6"/>
            <circle cx="60" cy="52" r="28" fill="#fde68a" opacity="0.9"/>
            ${mouth}
        </svg>
    `;
}

function ensureArticulationCard(phoneme) {
    const display = document.getElementById('selected-sound-display');
    if (!display || !phoneme) return;

    let card = document.getElementById('articulation-card');
    if (!card) {
        card = document.createElement('div');
        card.id = 'articulation-card';
        card.className = 'articulation-card';
        display.appendChild(card);
    }

    const soundKey = currentSelectedSound?.sound || '';
    const cue = formatMouthCue(phoneme);
    const soundLabel = phoneme.sound ? phoneme.sound.toString() : '';
    const example = phoneme.example || '';
    const letterBadge = (phoneme.grapheme || soundKey || '').toString().toUpperCase();

    const exampleLine = example ? `<div class="articulation-example">Example: <strong>${example}</strong></div>` : '';
    const soundBadge = soundLabel || (soundKey ? `/${soundKey}/` : '');
    const pictureLine = `<div class="articulation-picture-label">Phoneme</div>`;

    card.innerHTML = `
        <div class="articulation-card-header">
            <span class="articulation-title">Articulation Card</span>
            <div class="articulation-actions">
                ${soundLabel ? `<span class="articulation-ipa">${soundLabel}</span>` : ''}
                <button type="button" class="articulation-collapse" id="collapse-articulation">Collapse card</button>
            </div>
        </div>
        <div class="articulation-card-body">
            <div class="articulation-visual">
                <div class="articulation-visual-block">
                    <div class="articulation-visual-wrap articulation-letter">${letterBadge || '•'}</div>
                    <div class="articulation-picture-label">Target letter</div>
                </div>
                <div class="articulation-visual-block">
                    <div class="articulation-visual-wrap articulation-icon">${soundBadge || '•'}</div>
                    ${pictureLine}
                </div>
            </div>
            <div class="articulation-text">
                <div class="articulation-tip">${cue}</div>
                ${exampleLine}
            </div>
        </div>
        <div class="sound-card-actions">
            <button type="button" id="hear-letter-name">Hear letter</button>
            <button type="button" id="hear-example-word">Hear example</button>
            <button type="button" id="pronunciation-check-btn">Pronunciation Check</button>
            <button type="button" id="play-sound-video">Play sound video</button>
            <button type="button" id="record-sound-video">Record my video</button>
            <button type="button" id="upload-sound-video">Upload video</button>
            <button type="button" id="delete-sound-video">Delete my video</button>
        </div>
        <div class="sound-video-panel">
            <video id="sound-video-player" class="sound-video-player hidden" controls playsinline preload="metadata"></video>
            <input id="sound-video-file-input" class="hidden" type="file" accept="video/mp4,video/webm,video/quicktime,video/*">
            <div id="sound-video-status" class="sound-video-status muted">Each sound can use its own short video clip.</div>
        </div>
    `;

    const collapseBtn = document.getElementById('collapse-articulation');
    if (collapseBtn) {
        collapseBtn.onclick = () => clearSoundSelection();
    }
    initArticulationAudioControls();
    bindSoundVideoControls();
}

function ensureSoundLabCollapseControl() {
    const display = document.getElementById('selected-sound-display');
    if (!display) return;
    const actions = display.querySelector('.sound-card-actions');
    if (!actions) return;

    let btn = actions.querySelector('#collapse-sound-card');
    if (!btn) {
        btn = document.createElement('button');
        btn.id = 'collapse-sound-card';
        btn.type = 'button';
        btn.className = 'sound-card-collapse';
        btn.textContent = 'Collapse card';
        actions.appendChild(btn);
    }

    if (!btn.dataset.bound) {
        btn.dataset.bound = 'true';
        btn.addEventListener('click', () => clearSoundSelection());
    }
}

function selectSound(sound, phoneme, labelOverride = null, tile = null) {
    if (!phoneme) return;

    if (currentSelectedSound?.sound === sound) {
        clearSoundSelection();
        return;
    }

    currentSelectedSound = { sound, phoneme, label: labelOverride };
    clearPracticeGroup('sound:');

    if (currentSelectedTile) {
        currentSelectedTile.classList.remove('selected');
    }
    if (tile) {
        tile.classList.add('selected');
        currentSelectedTile = tile;
    }

    const displayPanel = document.getElementById('selected-sound-display');
    if (displayPanel) displayPanel.classList.remove('hidden');
    ensureSoundLabCollapseControl();
    const layout = document.querySelector('.sound-guide-layout');
    if (layout) layout.classList.remove('no-card');
    clearPronunciationFeedback();

    const displayLabel = labelOverride || phoneme.sound || phoneme.grapheme || sound;
    const soundLetter = document.getElementById('sound-letter');
    if (soundLetter) soundLetter.textContent = formatSoundLabel(displayLabel);

    const soundName = document.getElementById('sound-name');
    if (soundName) {
        const label = getSoundNameLabel(phoneme);
        soundName.textContent = label;
        soundName.classList.toggle('hidden', !label);
    }

    const mouthCue = document.getElementById('mouth-cue');
    if (mouthCue) mouthCue.textContent = formatMouthCue(phoneme);

    const mouthDescription = document.getElementById('mouth-description');
    if (mouthDescription) mouthDescription.textContent = formatMouthDescription(phoneme);

    const mouthVisual = document.getElementById('mouth-visual');
    if (mouthVisual) {
        mouthVisual.innerHTML = '';
        mouthVisual.style.display = 'none';
    }

    const cueLabel = document.querySelector('.sound-cue-label');
    if (cueLabel) cueLabel.textContent = 'Sound Tip';

    const hearSoundBtn = document.getElementById('hear-phoneme-sound');
    if (hearSoundBtn) {
        hearSoundBtn.remove();
    }

    ensureArticulationCard(phoneme);

    if (displayPanel && sound) {
        // Remove phoneme practice recorder for articulation card
        const existingSoundRecorder = displayPanel.querySelector('.practice-recorder-group');
        if (existingSoundRecorder) existingSoundRecorder.remove();
    }
    setSoundVideoStatus('Checking available sound video…', 'info');
    showPhonemeVideoPreview(sound, phoneme, { autoplay: false });
}

function showLetterSounds(letter) {
    const sounds = window.LETTER_SOUNDS[letter];
    if (!sounds) return;
    
    document.getElementById('selected-letter').textContent = letter.toUpperCase();
    
    const grid = document.getElementById('letter-sounds-grid');
    grid.innerHTML = '';
    
    sounds.forEach(soundInfo => {
        const card = document.createElement('div');
        card.style.cssText = `
            background: white;
            border: 2px solid #e5e7eb;
            border-radius: 8px;
            padding: 16px;
            cursor: pointer;
            transition: all 0.2s;
        `;
        
        card.innerHTML = `
            <div style="display: flex; align-items: center; gap: 12px;">
                <div style="font-size: 2rem; font-weight: 700;">${letter.toUpperCase()}</div>
                <div style="flex: 1;">
                    <div style="font-weight: 600; color: #374151;">${soundInfo.name}</div>
                    <div style="font-size: 0.9rem; color: #6b7280;">Example: ${soundInfo.example}</div>
                </div>
                <button style="padding: 8px 12px; background: #3b82f6; color: white; border: none; border-radius: 6px; font-size: 0.85rem;">Play</button>
            </div>
        `;
        
        card.onclick = () => {
            if (window.PHONEME_DATA[soundInfo.phoneme]) {
                selectSound(soundInfo.phoneme, window.PHONEME_DATA[soundInfo.phoneme]);
            }
        };
        
        // Find and setup the play button
        const playBtn = card.querySelector('button');
        playBtn.onclick = (e) => {
            e.stopPropagation();
            playLetterSequence(letter, soundInfo.example, soundInfo.phoneme);
        };
        
        grid.appendChild(card);
    });
    
    document.getElementById('letter-sounds-display').classList.remove('hidden');
    document.getElementById('letter-sounds-display').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function initArticulationAudioControls() {
    const hearLetterBtn = document.getElementById('hear-letter-name');
    const hearWordBtn = document.getElementById('hear-example-word');
    ensurePronunciationCheckButton();
    
    if (hearLetterBtn) {
        hearLetterBtn.onclick = () => {
            if (currentSelectedSound) {
                const grapheme = currentSelectedSound.label || currentSelectedSound.phoneme.grapheme || currentSelectedSound.sound;
                speakSpelling(grapheme);
            }
        };
    }
    
    if (hearWordBtn) {
        hearWordBtn.onclick = () => {
            if (currentSelectedSound) {
                speakText(currentSelectedSound.phoneme.example || '');
            }
        };
    }

    const actionButtons = document.querySelectorAll('.sound-card-actions button');
    actionButtons.forEach(btn => {
        if (btn.dataset.bound === 'true') return;
        const label = (btn.textContent || '').toLowerCase();
        if (label.includes('letter')) {
            btn.dataset.bound = 'true';
            btn.onclick = () => {
                if (currentSelectedSound) {
                    const grapheme = currentSelectedSound.label || currentSelectedSound.phoneme.grapheme || currentSelectedSound.sound;
                    speakSpelling(grapheme);
                }
            };
        } else if (label.includes('example')) {
            btn.dataset.bound = 'true';
            btn.onclick = () => {
                if (currentSelectedSound) {
                    speakText(currentSelectedSound.phoneme.example || '');
                }
            };
        } else if (label.includes('pronunciation')) {
            btn.dataset.bound = 'true';
            btn.onclick = () => startPronunciationCheck();
        }
    });
}

function getCurrentSoundForVideo() {
    return normalizePhonemeSoundKey(currentSelectedSound?.sound || '');
}

async function playSoundVideoForCurrentSelection(options = {}) {
    const sound = getCurrentSoundForVideo();
    if (!sound || !currentSelectedSound?.phoneme) {
        setSoundVideoStatus('Select a sound tile first.', 'warn');
        return false;
    }
    return showPhonemeVideoPreview(sound, currentSelectedSound.phoneme, options);
}

function openSoundVideoInput(capture = false) {
    const input = document.getElementById('sound-video-file-input');
    if (!input) return;
    if (capture) {
        input.setAttribute('capture', 'user');
    } else {
        input.removeAttribute('capture');
    }
    input.click();
}

async function handleSoundVideoFile(file) {
    if (!file) return;
    const sound = getCurrentSoundForVideo();
    if (!sound) {
        showToast('Select a sound tile before adding a video.');
        return;
    }
    if (!String(file.type || '').startsWith('video/')) {
        showToast('Please choose a video file.');
        return;
    }
    const maxBytes = 90 * 1024 * 1024;
    if (file.size > maxBytes) {
        showToast('Video is too large (max 90MB).');
        return;
    }

    const database = await ensureDBReady();
    if (!database) {
        showToast('Unable to save video on this device right now.');
        return;
    }
    saveAudioToDB(getPhonemeVideoRecordingKey(sound), file);
    setSoundVideoStatus('Teacher video saved for this sound.', 'success');
    showToast(`Saved teacher video for /${sound}/.`);
    await playSoundVideoForCurrentSelection({ autoplay: true });
}

async function deleteSoundVideoForCurrentSelection() {
    const sound = getCurrentSoundForVideo();
    if (!sound) {
        showToast('Select a sound tile first.');
        return;
    }
    if (!confirm(`Delete teacher video for "${sound}"?`)) return;
    await deleteAudioFromDB(getPhonemeVideoRecordingKey(sound));
    releaseActiveSoundVideoUrl();
    setSoundVideoStatus('Teacher video deleted. Checking library clip…', 'info');
    showToast(`Deleted teacher video for /${sound}/.`);
    await playSoundVideoForCurrentSelection({ autoplay: false });
}

function bindSoundVideoControls() {
    const playBtn = document.getElementById('play-sound-video');
    const recordBtn = document.getElementById('record-sound-video');
    const uploadBtn = document.getElementById('upload-sound-video');
    const deleteBtn = document.getElementById('delete-sound-video');
    const input = document.getElementById('sound-video-file-input');
    const player = getSoundVideoPlayer();

    if (playBtn) {
        playBtn.onclick = () => {
            playSoundVideoForCurrentSelection({ autoplay: true });
        };
    }
    if (recordBtn) {
        recordBtn.onclick = () => {
            openSoundVideoInput(true);
        };
    }
    if (uploadBtn) {
        uploadBtn.onclick = () => {
            openSoundVideoInput(false);
        };
    }
    if (deleteBtn) {
        deleteBtn.onclick = () => {
            deleteSoundVideoForCurrentSelection();
        };
    }
    if (input) {
        input.onchange = async () => {
            const file = input.files && input.files[0] ? input.files[0] : null;
            await handleSoundVideoFile(file);
            input.value = '';
        };
    }
    if (player) {
        player.onended = () => {
            const source = player.dataset.source || 'library';
            if (source === 'teacher') {
                setSoundVideoStatus('Teacher video finished. Tap play to review again.', 'success');
            } else {
                setSoundVideoStatus('Library video finished. Tap play to review again.', 'info');
            }
        };
    }
}

function ensurePronunciationCheckButton() {
    const actionBar = document.querySelector('.sound-card-actions');
    if (!actionBar) return;
    let btn = document.getElementById('pronunciation-check-btn');
    if (!btn) {
        btn = document.createElement('button');
        btn.type = 'button';
        btn.id = 'pronunciation-check-btn';
        btn.textContent = 'Pronunciation Check';
        actionBar.appendChild(btn);
    }
    ensurePronunciationFeedback();
}

function ensurePronunciationFeedback() {
    const displayPanel = document.getElementById('selected-sound-display');
    if (!displayPanel) return null;
    let feedback = document.getElementById('pronunciation-feedback');
    if (!feedback) {
        feedback = document.createElement('div');
        feedback.id = 'pronunciation-feedback';
        feedback.className = 'pronunciation-feedback hidden';
        displayPanel.appendChild(feedback);
    }
    return feedback;
}

function setPronunciationFeedback(status, lines) {
    const feedback = ensurePronunciationFeedback();
    if (!feedback) return;
    feedback.className = `pronunciation-feedback ${status || ''}`.trim();
    feedback.innerHTML = '';
    (lines || []).forEach(text => {
        const row = document.createElement('div');
        row.textContent = text;
        feedback.appendChild(row);
    });
    feedback.classList.remove('hidden');
}

function clearPronunciationFeedback() {
    const feedback = document.getElementById('pronunciation-feedback');
    if (!feedback) return;
    feedback.classList.add('hidden');
    feedback.textContent = '';
}

function stopPronunciationCheck() {
    if (pronunciationTimeout) {
        clearTimeout(pronunciationTimeout);
        pronunciationTimeout = null;
    }
    if (pronunciationRecognition) {
        try {
            pronunciationRecognition.onresult = null;
            pronunciationRecognition.onerror = null;
            pronunciationRecognition.onend = null;
            if (typeof pronunciationRecognition.abort === 'function') {
                pronunciationRecognition.abort();
            }
            pronunciationRecognition.stop();
        } catch (e) {
            // ignore stop errors
        }
    }
    pronunciationRecognition = null;
    pronunciationActive = false;
    const btn = document.getElementById('pronunciation-check-btn');
    if (btn) {
        btn.disabled = false;
        btn.classList.remove('listening');
        btn.textContent = 'Pronunciation Check';
    }
}

function startPronunciationCheck() {
    if (!currentSelectedSound || !currentSelectedSound.phoneme) {
        showToast('Pick a sound first.');
        return;
    }
    const target = getPrimaryExampleWord(currentSelectedSound.phoneme.example || '');
    if (!target) {
        showToast('No example word available.');
        return;
    }

    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRec) {
        setPronunciationFeedback('warn', [
            'Speech recognition is not supported in this browser.',
            'Try Chrome or Edge for pronunciation checks.'
        ]);
        return;
    }

    stopPronunciationCheck();

    const btn = document.getElementById('pronunciation-check-btn');
    if (btn) {
        btn.disabled = true;
        btn.classList.add('listening');
        btn.textContent = 'Listening...';
    }

    setPronunciationFeedback('info', [
        `Listening... Say "${target}".`
    ]);

    pronunciationRecognition = new SpeechRec();
    pronunciationRecognition.lang = getPreferredEnglishDialect();
    pronunciationRecognition.interimResults = false;
    pronunciationRecognition.continuous = false;
    pronunciationRecognition.maxAlternatives = 3;
    pronunciationActive = true;

    pronunciationRecognition.onresult = (event) => {
        if (pronunciationTimeout) {
            clearTimeout(pronunciationTimeout);
            pronunciationTimeout = null;
        }
        const transcripts = [];
        if (event.results && event.results[0]) {
            const result = event.results[0];
            for (let i = 0; i < result.length; i += 1) {
                transcripts.push(result[i].transcript || '');
            }
        }
        handlePronunciationResult(target, transcripts);
        // Stop immediately after we have a result so the mic icon does not linger.
        stopPronunciationCheck();
    };

    pronunciationRecognition.onerror = () => {
        if (pronunciationTimeout) {
            clearTimeout(pronunciationTimeout);
            pronunciationTimeout = null;
        }
        setPronunciationFeedback('warn', [
            'Could not hear that clearly.',
            `Try again: "${target}".`
        ]);
        stopPronunciationCheck();
    };

    pronunciationRecognition.onend = () => {
        if (pronunciationTimeout) {
            clearTimeout(pronunciationTimeout);
            pronunciationTimeout = null;
        }
        stopPronunciationCheck();
    };

    try {
        pronunciationRecognition.start();
        pronunciationTimeout = setTimeout(() => {
            if (!pronunciationActive) return;
            setPronunciationFeedback('warn', [
                'Recording timed out.',
                `Try again: "${target}".`
            ]);
            stopPronunciationCheck();
        }, 6000);
    } catch (e) {
        stopPronunciationCheck();
        setPronunciationFeedback('warn', ['Microphone was not available.']);
    }
}

function handlePronunciationResult(target, transcripts) {
    const normalizedTarget = normalizeSpeechText(target);
    if (!normalizedTarget) {
        setPronunciationFeedback('warn', ['Try again.']);
        return;
    }

    const best = pickBestSpokenWord(transcripts || [], normalizedTarget);
    const spokenWord = best.word || '';
    const rawTranscript = best.transcript || (transcripts && transcripts[0]) || '';
    const normalizedSpoken = normalizeSpeechText(spokenWord || rawTranscript);

    if (!normalizedSpoken) {
        setPronunciationFeedback('warn', [
            'I did not catch a word.',
            `Try again: "${target}".`
        ]);
        return;
    }

    if (normalizedSpoken === normalizedTarget || normalizedSpoken.includes(normalizedTarget)) {
        setPronunciationFeedback('good', [
            `Great! That sounded like "${target}".`,
            `Heard: "${spokenWord || rawTranscript}".`
        ]);
        return;
    }

    const distance = levenshteinDistance(normalizedSpoken, normalizedTarget);
    const maxLen = Math.max(normalizedTarget.length, normalizedSpoken.length);
    const closeness = maxLen ? 1 - (distance / maxLen) : 0;
    const hint = getLikelySoundHint(normalizedTarget, normalizedSpoken);

    if (closeness > 0.7) {
        setPronunciationFeedback('warn', [
            `Almost! Try again: "${target}".`,
            `Heard: "${spokenWord || rawTranscript}".`,
            hint ? hint : 'Try saying it slowly.'
        ]);
    } else {
        setPronunciationFeedback('bad', [
            `Let’s try that again: "${target}".`,
            `Heard: "${spokenWord || rawTranscript}".`,
            hint ? hint : 'Watch the mouth cue and try the sound again.'
        ]);
    }
}

function getPrimaryExampleWord(example) {
    if (!example) return '';
    const first = example.toString().split(/[\n,]/)[0] || '';
    const word = (first.trim().match(/[a-zA-Z']+/) || [])[0] || '';
    return word;
}

function normalizeSpeechText(text) {
    return (text || '')
        .toString()
        .toLowerCase()
        .replace(/[^a-z']/g, '')
        .trim();
}

function pickBestSpokenWord(transcripts, target) {
    let best = { word: '', dist: Infinity, transcript: '' };
    (transcripts || []).forEach(raw => {
        const words = (raw || '').toLowerCase().match(/[a-z']+/g) || [];
        if (!words.length) return;
        words.forEach(word => {
            const dist = levenshteinDistance(word, target);
            if (dist < best.dist) {
                best = { word, dist, transcript: raw };
            }
        });
    });
    return best;
}

function levenshteinDistance(a = '', b = '') {
    if (a === b) return 0;
    const matrix = Array.from({ length: a.length + 1 }, () => []);
    for (let i = 0; i <= a.length; i += 1) matrix[i][0] = i;
    for (let j = 0; j <= b.length; j += 1) matrix[0][j] = j;
    for (let i = 1; i <= a.length; i += 1) {
        for (let j = 1; j <= b.length; j += 1) {
            const cost = a[i - 1] === b[j - 1] ? 0 : 1;
            matrix[i][j] = Math.min(
                matrix[i - 1][j] + 1,
                matrix[i][j - 1] + 1,
                matrix[i - 1][j - 1] + cost
            );
        }
    }
    return matrix[a.length][b.length];
}

function getLikelySoundHint(target, spoken) {
    const rules = [
        { target: 'th', alts: ['f', 'd', 't'], hint: 'Try /th/ (tongue between teeth).' },
        { target: 'sh', alts: ['s', 'ch'], hint: 'Try /sh/ (quiet sound).' },
        { target: 'ch', alts: ['sh', 't'], hint: 'Try /ch/ (chin sound).' },
        { target: 'ng', alts: ['n'], hint: 'Try /ng/ (back of tongue, hum).' },
        { target: 'r', alts: ['w'], hint: 'Try /r/ (tongue pulled back).' },
        { target: 'l', alts: ['w', 'r'], hint: 'Try /l/ (tongue tip up).' },
        { target: 'v', alts: ['b', 'f'], hint: 'Try /v/ (lip on teeth, voice on).' },
        { target: 'b', alts: ['p'], hint: 'Try /b/ (voice on).' },
        { target: 'p', alts: ['b'], hint: 'Try /p/ (puff of air).' },
        { target: 'd', alts: ['t'], hint: 'Try /d/ (voice on).' },
        { target: 't', alts: ['d'], hint: 'Try /t/ (no voice).' },
        { target: 'g', alts: ['k'], hint: 'Try /g/ (voice on).' },
        { target: 'k', alts: ['g'], hint: 'Try /k/ (no voice).' },
        { target: 'z', alts: ['s'], hint: 'Try /z/ (voice on).' },
        { target: 's', alts: ['z'], hint: 'Try /s/ (no voice).' },
        { target: 'ee', alts: ['i'], hint: 'Try /ee/ (smile sound).' },
        { target: 'oo', alts: ['u', 'o'], hint: 'Try /oo/ (rounded lips).' },
        { target: 'ai', alts: ['a', 'e'], hint: 'Try /ai/ (rain sound).' },
        { target: 'oa', alts: ['o'], hint: 'Try /oa/ (boat sound).' },
        { target: 'ie', alts: ['i', 'y'], hint: 'Try /ie/ (night sound).' },
        { target: 'ar', alts: ['or', 'er'], hint: 'Try /ar/ (car sound).' },
        { target: 'or', alts: ['ar'], hint: 'Try /or/ (fork sound).' },
        { target: 'ur', alts: ['er'], hint: 'Try /ur/ (bird sound).' },
        { target: 'air', alts: ['ar', 'er'], hint: 'Try /air/ (chair sound).' },
        { target: 'ear', alts: ['er'], hint: 'Try /ear/ (near sound).' },
        { target: 'ure', alts: ['ur', 'oor'], hint: 'Try /ure/ (pure sound).' }
    ];

    for (const rule of rules) {
        if (!target.includes(rule.target)) continue;
        for (const alt of rule.alts) {
            if (spoken.includes(alt)) return rule.hint;
        }
    }
    return '';
}

function playLetterSequence(letter, word, phoneme) {
    // Play: spelling → example word → sound cue
    speakSpelling(letter);

    setTimeout(() => {
        speakText(word);
    }, 900);

    setTimeout(() => {
        const phonemeData = window.getPhonemeData ? window.getPhonemeData(phoneme) : null;
        speakPhonemeSound(phonemeData, phoneme);
    }, 1800);
}

function normalizeTextForTTS(text) {
    if (!text) return '';
    let normalized = text.toString();
    // Some system voices interpret standalone "I" as the roman numeral (one).
    // Adding an invisible word-break keeps the screen text the same but nudges TTS toward the pronoun.
    normalized = normalized.replace(/\bI\b/g, 'I\u200B');
    return normalized;
}

async function speakText(text, rateType = 'word') {
    if (!text) return false;
    const normalizedRateType = String(rateType || 'word').toLowerCase();
    const type = normalizedRateType === 'definition' || normalizedRateType === 'def'
        ? 'def'
        : (normalizedRateType === 'sentence' ? 'sentence' : (normalizedRateType === 'phoneme' ? 'phoneme' : 'word'));
    const speechType = type === 'def' ? 'sentence' : type;
    const packedPlayed = await tryPlayPackedTtsForCurrentWord({
        text,
        languageCode: 'en',
        type,
        playbackRate: Math.max(0.6, getSpeechRate(speechType))
    });
    if (packedPlayed) return true;

    if (speechType !== 'phoneme') {
        showToast('Audio clip unavailable for this item.');
        return false;
    }

    const voices = await getVoicesForSpeech();
    const preferred = pickBestEnglishVoice(voices);
    const fallbackLang = preferred ? preferred.lang : getPreferredEnglishDialect();
    return !!speakEnglishText(text, speechType, preferred, fallbackLang);
}

function speakSpelling(grapheme) {
    if (!grapheme) return;
    const letters = grapheme
        .toString()
        .toUpperCase()
        .split('')
        .join(' ');
    speakText(letters, 'phoneme');
}

function normalizePhonemeForTTS(sound) {
    if (!sound) return '';
    let cleaned = sound.toString().replace(/[\/\[\]]/g, '').trim().toLowerCase();
    const multiMap = {
        'iː': 'ee',
        'uː': 'oo',
        'eɪ': 'ay',
        'aɪ': 'eye',
        'oʊ': 'oh',
        'aʊ': 'ow',
        'ɔɪ': 'oy',
        'ɜː': 'er'
    };
    Object.entries(multiMap).forEach(([key, value]) => {
        cleaned = cleaned.replace(new RegExp(key, 'g'), value);
    });
    const charMap = {
        'æ': 'aeh',
        'ɑ': 'ah',
        'ɒ': 'aw',
        'ɔ': 'aw',
        'ə': 'uh',
        'ʌ': 'uh',
        'ɛ': 'eh',
        'ɪ': 'ih',
        'ʊ': 'oo',
        'ʃ': 'sh',
        'ʒ': 'zh',
        'ʧ': 'ch',
        'ʤ': 'j',
        'θ': 'th',
        'ð': 'th',
        'ŋ': 'ng',
        'ɜ': 'er',
        'ː': ''
    };
    cleaned = cleaned.replace(/[æɑɒɔəʌɛɪʊʃʒʧʤθðŋɜː]/g, (match) => charMap[match] || match);
    return cleaned.replace(/\s+/g, ' ').trim();
}

const SOUND_TTS_MAP = {
    a: 'short a, as in cat',
    e: 'short e, as in bed',
    i: 'short i, as in sit',
    o: 'short o, as in top',
    u: 'short u, as in up',
    ay: 'ay',
    ee: 'ee',
    igh: 'eye',
    oa: 'oh',
    oo: 'oo',
    ow: 'ow',
    ou: 'ow',
    oi: 'oy',
    oy: 'oy',
    aw: 'aw',
    ah: 'ah',
    ar: 'ar',
    er: 'er',
    ir: 'er',
    or: 'or',
    ur: 'er',
    'oo-short': 'short oo, as in book',
    air: 'air, as in chair',
    ear: 'ear, as in near',
    ure: 'ure, as in pure',
    sh: 'sh',
    ch: 'ch',
    th: 'th',
    'th-voiced': 'th',
    zh: 'zh',
    ng: 'ng',
    ph: 'f',
    wh: 'wh',
    b: 'buh',
    p: 'puh',
    d: 'duh',
    t: 'tuh',
    g: 'guh',
    k: 'kuh',
    f: 'fff',
    v: 'vuh',
    s: 'sss',
    z: 'zzz',
    h: 'huh',
    j: 'juh',
    l: 'lll',
    r: 'rrr',
    w: 'wuh',
    y: 'yuh',
    m: 'mmm',
    n: 'nnn'
};

function getSoundTtsFromKey(soundKey = '') {
    const key = soundKey.toString().toLowerCase();
    return SOUND_TTS_MAP[key] || '';
}

function isShortVowelSound(soundKey = '', phoneme = null) {
    const key = soundKey.toString().toLowerCase();
    const shortVowels = ['a', 'e', 'i', 'o', 'u'];
    if (!shortVowels.includes(key)) return false;
    if (phoneme?.name && phoneme.name.toLowerCase().includes('short')) return true;
    return true;
}

function getPhonemeTts(phoneme, soundKey = '') {
    if (!phoneme) return '';
    if (phoneme.tts) return phoneme.tts;
    const override = getSoundTtsFromKey(soundKey);
    if (override) return override;
    const rawSound = phoneme.sound ? phoneme.sound.toString().replace(/[\/\[\]]/g, '').trim() : '';
    const normalized = normalizePhonemeForTTS(rawSound);
    if (normalized) return normalized;
    if (rawSound) return rawSound;
    if (phoneme.grapheme) return phoneme.grapheme.toString().toLowerCase();
    if (soundKey) return soundKey.toString().toLowerCase();
    return '';
}

async function speakPhonemeSound(phoneme, soundKey = '') {
    const tts = getPhonemeTts(phoneme, soundKey);
    if (!tts) return;
    const key = soundKey || phoneme?.grapheme || '';
    if (key) {
        const played = await tryPlayRecordedPhoneme(key);
        if (played) return;
        const packedPlayed = await tryPlayPackedPhoneme(key, 'en');
        if (packedPlayed) return;
    }
    if (await tryPlayPackedPhoneme(soundKey || phoneme?.grapheme || '', 'en')) return;
    const voices = await getVoicesForSpeech();
    const preferred = pickPreferredEnglishCandidate(voices, getPreferredEnglishDialect(), { requireHighQuality: true })
        || pickPreferredEnglishCandidate(voices, 'en-US', { requireHighQuality: true })
        || pickPreferredEnglishCandidate(voices, 'en-GB', { requireHighQuality: true });
    if (!preferred) {
        showToast('No high-quality Azure voice is available for Sound Lab right now.');
        return;
    }
    speakEnglishText(tts, 'phoneme', preferred, preferred.lang || getPreferredEnglishDialect());
}

function initPhonemeCards() {
    const cards = document.querySelectorAll('.phoneme-card');

    let initialized = 0;
    cards.forEach(card => {
        if (card.dataset.mouthInit === 'true') return;
        card.dataset.mouthInit = 'true';
        initialized += 1;

        card.addEventListener('click', () => {
            const sound = card.dataset.sound;
            if (!sound) return;

            const phonemeData = window.getPhonemeData ? window.getPhonemeData(sound) : null;
            showPhonemeMouth(sound, phonemeData);
        });
    });

    if (initialized > 0) {
        console.log('✓ Initialized', initialized, 'phoneme cards with mouth animations');
    }
}

function showPhonemeMouth(sound, phonemeData) {
    if (phonemeData) {
        selectSound(sound, phonemeData);
        speakPhonemeSound(phonemeData, sound);
    }
    const mouthDisplay = document.getElementById('phoneme-mouth-display');
    if (mouthDisplay) mouthDisplay.remove();
}

function setWarmupOpen(isOpen) {
    document.body.classList.toggle('warmup-open', isOpen);
    setFunHudSuspended(isOpen);
}

let phonemeModalResilienceReady = false;

function initPhonemeModalResilience() {
    const phonemeModal = document.getElementById('phoneme-modal');
    if (!phonemeModal || phonemeModalResilienceReady) return;
    if (typeof ResizeObserver === 'undefined') return;
    phonemeModalResilienceReady = true;

    const observer = new ResizeObserver((entries) => {
        for (const entry of entries) {
            const rect = entry.contentRect;
            phonemeModal.classList.toggle('phoneme-narrow', rect.width < 900);
            phonemeModal.classList.toggle('phoneme-short', rect.height < 600);
        }
    });

    observer.observe(phonemeModal);
}

function openPhonemeGuide(preselectSound = null) {
    const soundLabOnly = document.body.classList.contains('soundlab-only');
    if (modalOverlay) {
        modalOverlay.classList.toggle('hidden', soundLabOnly);
    }
    const phonemeModal = document.getElementById('phoneme-modal');
    if (!phonemeModal) {
        console.error("phoneme-modal element not found!");
        return;
    }
    initPhonemeModalResilience();
    clearSoundSelection();
    phonemeModal.classList.remove('hidden');
    setWarmupOpen(true);
    bindSoundLabPopoutButton();
    if (preselectSound) {
        prefetchPhonemeClips([preselectSound]);
    } else {
        prefetchWarmupPhonemes();
    }

    try {
        if (typeof populatePhonemeGrid === 'function') {
            populatePhonemeGrid(preselectSound);
        } else {
            console.error("populatePhonemeGrid function not found!");
        }
    } catch (e) {
        console.error("Error populating phoneme grid:", e);
    }
}

function bindSoundLabPopoutButton() {
    const btn = document.getElementById('sound-lab-popout');
    if (!btn || btn.dataset.bound === 'true') return;
    btn.dataset.bound = 'true';

    const isSoundLabOnly = document.body.classList.contains('soundlab-only');
    btn.textContent = isSoundLabOnly ? 'Back to Word Quest' : 'Open in new tab';

    btn.addEventListener('click', () => {
        if (document.body.classList.contains('soundlab-only')) {
            window.location.href = 'word-quest.html';
        } else {
            window.open('word-quest.html?soundlab=1', '_blank');
        }
    });
}


/* ==========================================
   MULTILINGUAL GLOSSARY (No API Required)
   Curated translations for high-frequency words
   ========================================== */

// Curated multilingual glossary
// Translation system loaded from translations.js
// window.TRANSLATIONS provides rich multilingual data:
// - word: native script translation
// - def: definition in home language  
// - sentence: example sentence translated
// - phonetic: pronunciation guide

function getWordTranslation(word, langCode) {
    const wordLower = word.toLowerCase();
    // Use window.TRANSLATIONS from translations.js (loaded via script tag)
    if (window.TRANSLATIONS) {
        if (typeof window.TRANSLATIONS.getTranslation === 'function') {
            return window.TRANSLATIONS.getTranslation(wordLower, langCode);
        }
        if (window.TRANSLATIONS[wordLower] && window.TRANSLATIONS[wordLower][langCode]) {
            return window.TRANSLATIONS[wordLower][langCode];
        }
    }
    return null;
}


/* Self-Contained Phoneme Voice Management */
let phonemeRecorder = null;
let phonemeAudioChunks = [];
let currentPhonemeForRecording = null;

function initVoiceSourceControls() {
    // Toggle voice source
    const voiceRadios = document.getElementsByName('guide-voice-source');
    voiceRadios.forEach(radio => {
        radio.closest('.voice-option').addEventListener('click', function() {
            const radioInput = this.querySelector('input[type="radio"]');
            radioInput.checked = true;
            
            // Update styling
            document.querySelectorAll('.voice-option').forEach(opt => {
                opt.style.borderColor = '#d0d0d0';
                opt.style.background = 'white';
            });
            this.style.borderColor = 'var(--color-correct)';
            this.style.background = '#f0f8f5';
            
            if (radioInput.value === 'system') {
                showToast('Using system voice');
            } else {
                showToast('Using your recorded voice');
            }
        });
    });
    
    // When clicking a phoneme card, set it as current for recording (Teacher Studio only)
    document.addEventListener('click', (e) => {
        const card = e.target.closest('.phoneme-card');
        if (card && card.dataset.sound) {
            currentPhonemeForRecording = card.dataset.sound;
            const displayEl = document.getElementById('current-phoneme-recording');
            if (displayEl) {
                displayEl.textContent = card.dataset.sound;
            }
        }
    });
}

/* First-Time Tutorial */
function initTutorial() {
    const tutorialShown = localStorage.getItem('tutorialShown');
    const welcomeModal = document.getElementById('welcome-modal');
    const startBtn = document.getElementById('start-playing-btn');
    if (!welcomeModal || !startBtn) return;

    if (!tutorialShown) {
        localStorage.setItem('tutorialShown', 'true');
        if (modalOverlay) modalOverlay.classList.remove('hidden');
        welcomeModal.classList.remove('hidden');
    }

    startBtn.onclick = () => {
        try { localStorage.setItem('wq_tutorial_seen', '1'); } catch(e) {}
        closeModal();
    };
}

/* Focus Panel Toggle */
function initFocusToggle() {
    const toggleBtn = document.getElementById('focus-toggle-btn');
    const focusPanel = document.getElementById('focus-panel');
    
    if (toggleBtn && focusPanel) {
        toggleBtn.onclick = () => {
            const isHidden = focusPanel.classList.contains('hidden');
            
            if (isHidden) {
                focusPanel.classList.remove('hidden');
                toggleBtn.classList.add('expanded');
                toggleBtn.textContent = '▼ Hide';
            } else {
                focusPanel.classList.add('hidden');
                toggleBtn.classList.remove('expanded');
                toggleBtn.textContent = '💡 Hints';
            }
        };
    }
}

function initQuickTeacherWord() {
    const input = document.getElementById('quick-teacher-word');
    const goBtn = document.getElementById('quick-teacher-go');
    if (!input || !goBtn) return;
    
    const doApply = () => {
        const word = (input.value || '').trim().toLowerCase();
        if (!word || word.length < 3 || word.length > 12 || /[^a-z]/i.test(word)) {
            showToast('Enter a 3-12 letter word (letters only)');
            return;
        }
        if (typeof applyCustomWordChallenge === 'function') {
            const ok = applyCustomWordChallenge(word, { source: 'quick' });
            if (ok) {
                input.value = '';
                showToast(`Teacher word: ${word.toUpperCase()}`);
            }
        }
        input.blur();
    };
    
    goBtn.onclick = doApply;
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { e.preventDefault(); doApply(); }
        // Prevent keyboard game input when typing in this field
        e.stopPropagation();
    });
    input.addEventListener('keyup', (e) => e.stopPropagation());
}

function initHowTo() {
    const headerActions = document.querySelector('.header-actions');
    if (!headerActions) return;
    if (document.getElementById('howto-btn')) return;
    const btn = document.createElement('button');
    btn.id = 'howto-btn';
    btn.type = 'button';
    btn.className = 'link-btn howto-icon-btn';
    btn.textContent = '?';
    btn.setAttribute('aria-label', 'How to Play');
    btn.title = 'How to Play';
    btn.addEventListener('click', openHowToModal);
    headerActions.appendChild(btn);
}

function initClozeLink() {
    const headerActions = document.querySelector('.header-actions');
    if (!headerActions || document.getElementById('cloze-btn')) return;
    const link = document.createElement('a');
    link.id = 'cloze-btn';
    link.href = 'cloze.html';
    link.className = 'link-btn';
    link.textContent = 'Story Fill';
    link.title = 'Cloze';
    const madlibsLink = Array.from(headerActions.querySelectorAll('a, button'))
        .find(el => (el.textContent || '').toLowerCase().includes('mad libs'));
    if (madlibsLink) {
        headerActions.insertBefore(link, madlibsLink);
    } else {
        headerActions.appendChild(link);
    }
}

function initComprehensionLink() {
    const headerActions = document.querySelector('.header-actions');
    if (!headerActions || document.getElementById('comprehension-btn')) return;
    const link = document.createElement('a');
    link.id = 'comprehension-btn';
    link.href = 'comprehension.html';
    link.className = 'link-btn';
    link.textContent = 'Read & Think';
    link.title = 'Comprehension';
    const madlibsLink = Array.from(headerActions.querySelectorAll('a, button'))
        .find(el => (el.textContent || '').toLowerCase().includes('mad libs'));
    if (madlibsLink) {
        headerActions.insertBefore(link, madlibsLink);
    } else {
        headerActions.appendChild(link);
    }
}

function initFluencyLink() {
    const headerActions = document.querySelector('.header-actions');
    if (!headerActions || document.getElementById('fluency-btn')) return;
    const link = document.createElement('a');
    link.id = 'fluency-btn';
    link.href = 'fluency.html';
    link.className = 'link-btn';
    link.textContent = 'Speed Sprint';
    link.title = 'Fluency';
    const madlibsLink = Array.from(headerActions.querySelectorAll('a, button'))
        .find(el => (el.textContent || '').toLowerCase().includes('mad libs'));
    if (madlibsLink) {
        headerActions.insertBefore(link, madlibsLink);
    } else {
        headerActions.appendChild(link);
    }
}

function initAdventureMode() {
    // Game modes are now accessed from Teacher Settings to keep the main header clean.
    return;
}

function initClassroomDock() {
    ensureClassroomDock();
}

let classroomFileUrl = null;
let classroomTimerId = null;
let classroomTimerRemaining = 0;
let classroomTimerDuration = 0;

function ensureClassroomDock() {
    let dock = document.getElementById('classroom-dock');
    if (dock) return dock;

    dock = document.createElement('div');
    dock.id = 'classroom-dock';
    dock.className = 'classroom-dock hidden';
    dock.innerHTML = `
        <div class="classroom-dock-header">
            <div>
                <h3>Classroom Dock</h3>
                <p>Keep slides and timers handy while you play.</p>
            </div>
            <div class="dock-actions">
                <button class="dock-popout" id="dock-popout" type="button">Open in new tab</button>
                <button class="dock-fullscreen" id="dock-fullscreen" type="button">Full screen</button>
                <button class="dock-close" aria-label="Close">✕</button>
            </div>
        </div>
        <div class="classroom-dock-tabs">
            <button class="dock-tab active" data-tab="slides">Slides</button>
            <button class="dock-tab" data-tab="timer">Timer</button>
        </div>
        <div class="classroom-dock-body">
            <div class="dock-panel" data-panel="slides">
                <label class="dock-upload">
                    <input id="dock-file-input" type="file" accept="application/pdf,image/*" />
                    <span>Upload PDF or image</span>
                </label>
                <div id="dock-file-name" class="dock-file-name">No file loaded yet.</div>
                <div id="dock-file-viewer" class="dock-file-viewer"></div>
                <p class="dock-hint">Tip: export slide decks as PDF for the cleanest view.</p>
            </div>
            <div class="dock-panel hidden" data-panel="timer">
                <div class="dock-timer-display" id="dock-timer-display">10:00</div>
                <div class="dock-timer-controls">
                    <button id="dock-timer-start" class="primary-btn" type="button">Start</button>
                    <button id="dock-timer-pause" class="secondary-btn" type="button">Pause</button>
                    <button id="dock-timer-reset" class="secondary-btn" type="button">Reset</button>
                </div>
                <div class="dock-timer-set">
                    <label for="dock-timer-select">Minutes</label>
                    <select id="dock-timer-select">
                        <option value="5">5</option>
                        <option value="10">10</option>
                        <option value="15">15</option>
                        <option value="20">20</option>
                        <option value="25">25</option>
                    </select>
                </div>
                <p class="dock-hint">Pomodoro tip: 25 minutes focus, 5 minutes break.</p>
            </div>
        </div>
    `;
    document.body.appendChild(dock);

    dock.querySelector('.dock-close')?.addEventListener('click', () => {
        if (document.body.classList.contains('dock-only')) {
            window.close();
        } else {
            toggleClassroomDock(false);
        }
    });
    dock.querySelector('#dock-popout')?.addEventListener('click', openClassroomDockInNewTab);
    dock.querySelector('#dock-fullscreen')?.addEventListener('click', toggleClassroomDockFullscreen);
    dock.querySelectorAll('.dock-tab').forEach(btn => {
        btn.addEventListener('click', () => {
            setClassroomDockTab(btn.dataset.tab || 'slides');
        });
    });

    const fileInput = dock.querySelector('#dock-file-input');
    if (fileInput) {
        fileInput.addEventListener('change', (event) => {
            const file = event.target.files?.[0];
            if (file) {
                loadClassroomFile(file);
            }
        });
    }

    initClassroomTimerControls(dock);
    return dock;
}

function ensureMoreToolsMenu() {
    const headerActions = document.querySelector('.header-actions');
    if (!headerActions || document.getElementById('more-tools-btn')) return;
    const wrapper = document.createElement('div');
    wrapper.className = 'more-tools-wrapper';
    wrapper.innerHTML = `
        <button type="button" id="more-tools-btn" class="link-btn" aria-haspopup="menu" aria-expanded="false">Activities ▾</button>
        <div id="more-tools-menu" class="more-tools-menu hidden" role="menu" aria-label="Tools menu">
            <a href="word-quest.html" class="more-tools-item" role="menuitem">Word Quest</a>
            <a href="cloze.html" class="more-tools-item" role="menuitem">Story Fill</a>
            <a href="comprehension.html" class="more-tools-item" role="menuitem">Read & Think</a>
            <a href="fluency.html" class="more-tools-item" role="menuitem">Speed Sprint</a>
            <a href="madlibs.html" class="more-tools-item" role="menuitem">Silly Stories</a>
            <a href="writing.html" class="more-tools-item" role="menuitem">Write & Build</a>
            <a href="plan-it.html" class="more-tools-item" role="menuitem">Plan-It</a>
            <a href="number-sense.html" class="more-tools-item" role="menuitem">Number Sense</a>
            <a href="operations.html" class="more-tools-item" role="menuitem">Operations</a>
            <a href="teacher-report.html" class="more-tools-item" role="menuitem">Teacher Report</a>
            <button type="button" id="menu-sound-lab" class="more-tools-item" role="menuitem">Sound Lab</button>
            <button type="button" id="menu-classroom-dock" class="more-tools-item" role="menuitem">Classroom Dock</button>
        </div>
    `;
    headerActions.appendChild(wrapper);

    const btn = wrapper.querySelector('#more-tools-btn');
    const menu = wrapper.querySelector('#more-tools-menu');
    const soundLab = wrapper.querySelector('#menu-sound-lab');
    const classroomDock = wrapper.querySelector('#menu-classroom-dock');

    const closeMenu = () => {
        menu.classList.add('hidden');
        btn?.setAttribute('aria-expanded', 'false');
    };
    btn.addEventListener('click', (e) => {
        e.stopPropagation();
        menu.classList.toggle('hidden');
        btn.setAttribute('aria-expanded', menu.classList.contains('hidden') ? 'false' : 'true');
    });
    document.addEventListener('click', (e) => {
        if (!wrapper.contains(e.target)) closeMenu();
    });

    if (soundLab) {
        soundLab.addEventListener('click', () => {
            closeMenu();
            openPhonemeGuide();
        });
    }
    if (classroomDock) {
        classroomDock.addEventListener('click', () => {
            closeMenu();
            toggleClassroomDock(true);
        });
    }

    wrapper.querySelectorAll('a.more-tools-item').forEach((link) => {
        link.addEventListener('click', () => {
            closeMenu();
        });
    });
}

function organizeHeaderActions() {
    const headerActions = document.querySelector('.header-actions');
    if (!headerActions || headerActions.dataset.organized === 'v2') return;

    const moreWrapper = headerActions.querySelector('.more-tools-wrapper');
    const howtoBtn = headerActions.querySelector('#howto-btn');

    const findById = (id) => headerActions.querySelector(`#${id}`);
    const findByText = (text) => Array.from(headerActions.querySelectorAll('a,button'))
        .find(el => (el.textContent || '').toLowerCase().includes(text));

    const homeBtn = findById('home-btn');
    const classroomBtn = findById('classroom-btn');
    const adventureBtn = findById('adventure-btn');
    const teacherBtn = findById('teacher-btn');
    const newWordBtn = findById('new-word-btn') || findByText('new word');
    const clozeBtn = findById('cloze-btn') || findByText('cloze');
    const compBtn = findById('comprehension-btn') || findByText('comprehension');
    const fluencyBtn = findById('fluency-btn') || findByText('fluency');
    const madlibsBtn = findById('madlibs-btn') || findByText('mad libs');
    const writingBtn = findById('writing-btn') || findByText('write');
    const planitBtn = findById('planit-btn') || findByText('plan-it') || findByText('planit');

    const existing = Array.from(headerActions.children);
    const used = new Set();

    const ordered = [];
    const add = (el) => {
        if (!el || used.has(el)) return;
        used.add(el);
        ordered.push(el);
    };

    add(homeBtn);
    add(classroomBtn);
    add(teacherBtn);

    add(newWordBtn);
    add(adventureBtn);
    add(clozeBtn);
    add(compBtn);
    add(fluencyBtn);
    add(madlibsBtn);
    add(writingBtn);
    add(planitBtn);

    if (moreWrapper) add(moreWrapper);
    if (howtoBtn) add(howtoBtn);

    existing.forEach(el => {
        if (!used.has(el)) ordered.push(el);
    });

    headerActions.innerHTML = '';
    ordered.forEach(el => headerActions.appendChild(el));
    headerActions.dataset.organized = 'v2';

    if (newWordBtn) {
        newWordBtn.textContent = 'Word Quest';
        newWordBtn.title = 'New Word';
        newWordBtn.classList.add('active');
        newWordBtn.setAttribute('aria-current', 'page');
    }

    if (clozeBtn) {
        clozeBtn.textContent = 'Story Fill';
        clozeBtn.title = 'Cloze';
    }

    if (compBtn) {
        compBtn.textContent = 'Read & Think';
        compBtn.title = 'Comprehension';
    }

    if (fluencyBtn) {
        fluencyBtn.textContent = 'Speed Sprint';
        fluencyBtn.title = 'Fluency';
    }

    if (madlibsBtn) {
        madlibsBtn.textContent = 'Silly Stories';
        madlibsBtn.title = 'Mad Libs';
    }

    if (writingBtn) {
        writingBtn.textContent = 'Write & Build';
        writingBtn.title = 'Writing';
    }

    if (planitBtn) {
        planitBtn.textContent = 'Plan-It';
        planitBtn.title = 'Planning & organizing';
    }

    if (adventureBtn) {
        adventureBtn.title = 'Adventure Mode';
    }

    if (classroomBtn) {
        classroomBtn.title = 'Classroom Tools';
    }

    if (teacherBtn) {
        teacherBtn.title = 'Teacher Settings';
    }
}

function toggleClassroomDock(forceOpen = null) {
    const dock = ensureClassroomDock();
    if (!dock) return;
    const willOpen = forceOpen === null ? dock.classList.contains('hidden') : forceOpen;
    dock.classList.toggle('hidden', !willOpen);
    appSettings.classroom.dockOpen = willOpen;
    saveSettings();
}

function getActiveDockTab() {
    const dock = document.getElementById('classroom-dock');
    if (!dock) return 'slides';
    const active = dock.querySelector('.dock-tab.active');
    return active?.dataset.tab || 'slides';
}

function openClassroomDockInNewTab() {
    const tab = getActiveDockTab();
    const url = new URL(window.location.href);
    url.searchParams.set('dock', tab);
    window.open(url.toString(), '_blank', 'noopener');
}

function toggleClassroomDockFullscreen() {
    const dock = document.getElementById('classroom-dock');
    if (!dock) return;
    if (document.fullscreenElement) {
        document.exitFullscreen();
        return;
    }
    if (dock.requestFullscreen) {
        dock.requestFullscreen();
    }
}

function setClassroomDockTab(tab) {
    const dock = document.getElementById('classroom-dock');
    if (!dock) return;
    dock.querySelectorAll('.dock-tab').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tab);
    });
    dock.querySelectorAll('.dock-panel').forEach(panel => {
        panel.classList.toggle('hidden', panel.dataset.panel !== tab);
    });
}

function loadClassroomFile(file) {
    if (classroomFileUrl) {
        URL.revokeObjectURL(classroomFileUrl);
        classroomFileUrl = null;
    }

    const viewer = document.getElementById('dock-file-viewer');
    const name = document.getElementById('dock-file-name');
    if (!viewer || !name) return;

    if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
        showToast('Please upload a PDF or image file.');
        return;
    }

    classroomFileUrl = URL.createObjectURL(file);
    name.textContent = file.name;

    if (file.type === 'application/pdf') {
        viewer.innerHTML = `<iframe title="Classroom PDF" src="${classroomFileUrl}" frameborder="0"></iframe>`;
    } else {
        viewer.innerHTML = `<img src="${classroomFileUrl}" alt="Classroom slide" />`;
    }
}

function initClassroomTimerControls(dock) {
    const display = dock.querySelector('#dock-timer-display');
    const startBtn = dock.querySelector('#dock-timer-start');
    const pauseBtn = dock.querySelector('#dock-timer-pause');
    const resetBtn = dock.querySelector('#dock-timer-reset');
    const select = dock.querySelector('#dock-timer-select');

    const initialMinutes = Number(appSettings.classroom?.timerMinutes || 10);
    if (select) select.value = String(initialMinutes);
    setClassroomTimerMinutes(initialMinutes);

    if (select) {
        select.addEventListener('change', () => {
            const minutes = Number(select.value || 10);
            setClassroomTimerMinutes(minutes);
        });
    }

    if (startBtn) startBtn.addEventListener('click', startClassroomTimer);
    if (pauseBtn) pauseBtn.addEventListener('click', pauseClassroomTimer);
    if (resetBtn) resetBtn.addEventListener('click', resetClassroomTimer);

    if (display) updateClassroomTimerDisplay();
}

function setClassroomTimerMinutes(minutes = 10) {
    const clamped = Math.max(1, Math.min(60, Number(minutes) || 10));
    classroomTimerDuration = clamped * 60;
    if (!classroomTimerRemaining || !classroomTimerId) {
        classroomTimerRemaining = classroomTimerDuration;
    }
    appSettings.classroom.timerMinutes = clamped;
    saveSettings();
    updateClassroomTimerDisplay();
}

function updateClassroomTimerDisplay() {
    const display = document.getElementById('dock-timer-display');
    if (!display) return;
    display.textContent = formatTime(classroomTimerRemaining || classroomTimerDuration || 0);
}

function startClassroomTimer() {
    if (classroomTimerId) return;
    if (!classroomTimerRemaining) classroomTimerRemaining = classroomTimerDuration || 0;
    classroomTimerId = setInterval(() => {
        classroomTimerRemaining = Math.max(0, classroomTimerRemaining - 1);
        updateClassroomTimerDisplay();
        if (classroomTimerRemaining <= 0) {
            pauseClassroomTimer();
            showToast('⏱️ Time! Great focus.');
        }
    }, 1000);
}

function pauseClassroomTimer() {
    if (classroomTimerId) {
        clearInterval(classroomTimerId);
        classroomTimerId = null;
    }
}

function resetClassroomTimer() {
    pauseClassroomTimer();
    classroomTimerRemaining = classroomTimerDuration || 0;
    updateClassroomTimerDisplay();
}

function ensureAdventureModal() {
    let modal = document.getElementById('adventure-modal');
    if (modal) return modal;

    modal = document.createElement('div');
    modal.id = 'adventure-modal';
    modal.className = 'modal hidden adventure-modal';
    modal.dataset.overlayClose = 'true';
    modal.innerHTML = `
        <div class="modal-content adventure-content">
            <button class="close-btn" aria-label="Close">✕</button>
            <h2>Game Modes</h2>
            <p class="adventure-subtitle">Optional: turn on one or more modes, then press “Start”.</p>

            <div class="adventure-grid">
                <label class="adventure-card">
                    <input type="checkbox" id="adventure-team-toggle" />
                    <div class="adventure-card-body">
                        <h3>Team Battle</h3>
                        <p>Two teams take turns. The team that cracks the code earns coins.</p>
                    </div>
                </label>

                <label class="adventure-card">
                    <input type="checkbox" id="adventure-timer-toggle" />
                    <div class="adventure-card-body">
                        <h3>Lightning Round</h3>
                        <p>Beat the timer to win. Perfect for fast practice.</p>
                        <div class="adventure-timer-row">
                            <span>Time limit</span>
                            <select id="adventure-timer-seconds">
                                <option value="30">30s</option>
                                <option value="45">45s</option>
                                <option value="60">60s</option>
                                <option value="90">90s</option>
                            </select>
                        </div>
                    </div>
                </label>

                <label class="adventure-card">
                    <input type="checkbox" id="adventure-challenge-toggle" />
                    <div class="adventure-card-body">
                        <h3>Challenge Mode</h3>
                        <p>Hearts appear only in Challenge Mode. Lose one on a miss.</p>
                    </div>
                </label>
            </div>

            <p class="adventure-note">Coins track wins. Hearts only appear in Challenge Mode.</p>

            <div class="adventure-team-settings" id="adventure-team-settings">
                <h3>Teams</h3>
                <div class="adventure-team-row">
                    <label>Team A</label>
                    <input id="team-a-name" type="text" maxlength="18" />
                </div>
                <div class="adventure-team-row">
                    <label>Team B</label>
                    <input id="team-b-name" type="text" maxlength="18" />
                </div>
                <div class="adventure-team-row" id="adventure-turn-row">
                    <span class="adventure-active-label">Current Turn</span>
                    <button type="button" id="adventure-switch-team" class="secondary-btn">Switch Team</button>
                    <span id="adventure-active-team" class="adventure-active-team"></span>
                </div>
            </div>

            <div class="adventure-actions">
                <button type="button" id="adventure-start" class="primary-btn">Start</button>
                <button type="button" id="adventure-reset-coins" class="secondary-btn">Reset Team Coins</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    modal.querySelector('.close-btn')?.addEventListener('click', closeModal);
    initAdventureControls();
    return modal;
}

function openAdventureModal() {
    const modal = ensureAdventureModal();
    if (!modalOverlay) return;
    hydrateAdventureUI();
    modalOverlay.classList.remove('hidden');
    modal.classList.remove('hidden');
    document.body.classList.add('adventure-open');
}

function hydrateAdventureUI() {
    const teamToggle = document.getElementById('adventure-team-toggle');
    const timerToggle = document.getElementById('adventure-timer-toggle');
    const challengeToggle = document.getElementById('adventure-challenge-toggle');
    const timerSelect = document.getElementById('adventure-timer-seconds');
    const teamSettings = document.getElementById('adventure-team-settings');
    const teamAInput = document.getElementById('team-a-name');
    const teamBInput = document.getElementById('team-b-name');
    const activeTeam = document.getElementById('adventure-active-team');
    const turnRow = document.getElementById('adventure-turn-row');

    if (teamToggle) teamToggle.checked = !!appSettings.gameMode?.teamMode;
    if (timerToggle) timerToggle.checked = !!appSettings.gameMode?.timerEnabled;
    if (challengeToggle) challengeToggle.checked = !!appSettings.funHud?.challenge;
    if (timerSelect) timerSelect.value = String(appSettings.gameMode?.timerSeconds || 60);

    if (teamAInput) teamAInput.value = appSettings.gameMode?.teamAName || 'Team A';
    if (teamBInput) teamBInput.value = appSettings.gameMode?.teamBName || 'Team B';

    if (teamSettings) {
        teamSettings.style.display = appSettings.gameMode?.teamMode ? 'block' : 'none';
    }
    if (activeTeam) activeTeam.textContent = getActiveTeamLabel();
    if (turnRow) {
        turnRow.style.display = appSettings.gameMode?.teamMode ? 'grid' : 'none';
    }
}

function initAdventureControls() {
    const teamToggle = document.getElementById('adventure-team-toggle');
    const timerToggle = document.getElementById('adventure-timer-toggle');
    const challengeToggle = document.getElementById('adventure-challenge-toggle');
    const timerSelect = document.getElementById('adventure-timer-seconds');
    const teamSettings = document.getElementById('adventure-team-settings');
    const teamAInput = document.getElementById('team-a-name');
    const teamBInput = document.getElementById('team-b-name');
    const switchTeamBtn = document.getElementById('adventure-switch-team');
    const activeTeam = document.getElementById('adventure-active-team');
    const startBtn = document.getElementById('adventure-start');
    const resetCoinsBtn = document.getElementById('adventure-reset-coins');

    if (teamToggle) {
        teamToggle.addEventListener('change', () => {
            appSettings.gameMode.teamMode = teamToggle.checked;
            if (teamSettings) teamSettings.style.display = teamToggle.checked ? 'block' : 'none';
            const turnRow = document.getElementById('adventure-turn-row');
            if (turnRow) turnRow.style.display = teamToggle.checked ? 'grid' : 'none';
            syncGameModeActive(false);
            renderFunHud();
        });
    }

    if (timerToggle) {
        timerToggle.addEventListener('change', () => {
            appSettings.gameMode.timerEnabled = timerToggle.checked;
            syncGameModeActive(false);
            resetLightningTimer();
            renderFunHud();
        });
    }

    if (timerSelect) {
        timerSelect.addEventListener('change', () => {
            appSettings.gameMode.timerSeconds = Number(timerSelect.value) || 60;
            saveSettings();
            resetLightningTimer();
        });
    }

    if (challengeToggle) {
        challengeToggle.addEventListener('change', () => {
            appSettings.funHud.challenge = challengeToggle.checked;
            if (challengeToggle.checked && (!appSettings.funHud.hearts || appSettings.funHud.hearts < 1)) {
                appSettings.funHud.hearts = appSettings.funHud.maxHearts || 3;
            }
            syncGameModeActive(false);
            renderFunHud();
        });
    }

    if (teamAInput) {
        teamAInput.addEventListener('input', () => {
            appSettings.gameMode.teamAName = teamAInput.value.trim() || 'Team A';
            if (activeTeam) activeTeam.textContent = getActiveTeamLabel();
            saveSettings();
            renderFunHud();
        });
    }

    if (teamBInput) {
        teamBInput.addEventListener('input', () => {
            appSettings.gameMode.teamBName = teamBInput.value.trim() || 'Team B';
            if (activeTeam) activeTeam.textContent = getActiveTeamLabel();
            saveSettings();
            renderFunHud();
        });
    }

    if (switchTeamBtn) {
        switchTeamBtn.addEventListener('click', () => {
            toggleActiveTeam();
            if (activeTeam) activeTeam.textContent = getActiveTeamLabel();
            renderFunHud();
        });
    }

    if (startBtn) {
        startBtn.addEventListener('click', () => {
            syncGameModeActive(true);
            closeModal();
            resetLightningTimer();
            startNewGame();
        });
    }

    if (resetCoinsBtn) {
        resetCoinsBtn.addEventListener('click', () => {
            appSettings.gameMode.teamACoins = 0;
            appSettings.gameMode.teamBCoins = 0;
            saveSettings();
            renderFunHud();
            showToast('Team coins reset.');
        });
    }
}

function getActiveTeamKey() {
    return (appSettings.gameMode?.activeTeam || 'A').toUpperCase();
}

function getActiveTeamLabel() {
    const key = getActiveTeamKey();
    return key === 'A' ? (appSettings.gameMode?.teamAName || 'Team A') : (appSettings.gameMode?.teamBName || 'Team B');
}

function toggleActiveTeam() {
    const next = getActiveTeamKey() === 'A' ? 'B' : 'A';
    appSettings.gameMode.activeTeam = next;
    saveSettings();
}

let lightningTimer = null;
let lightningRemaining = 0;
let lastGuessTeam = 'A';

function formatTime(seconds = 0) {
    const clamped = Math.max(0, Math.floor(seconds));
    const m = Math.floor(clamped / 60);
    const s = clamped % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
}

function resetLightningTimer() {
    stopLightningTimer();
    const gameModeRunning = !!appSettings.gameMode?.active;
    if (!gameModeRunning || !appSettings.gameMode?.timerEnabled) {
        lightningRemaining = 0;
        renderFunHud();
        return;
    }
    lightningRemaining = appSettings.gameMode.timerSeconds || 60;
    startLightningTimer();
    renderFunHud();
}

function startLightningTimer() {
    stopLightningTimer();
    const gameModeRunning = !!appSettings.gameMode?.active;
    if (!gameModeRunning || !appSettings.gameMode?.timerEnabled) return;
    if (!lightningRemaining) {
        lightningRemaining = appSettings.gameMode.timerSeconds || 60;
    }
    lightningTimer = setInterval(() => {
        lightningRemaining -= 1;
        if (lightningRemaining <= 0) {
            lightningRemaining = 0;
            stopLightningTimer();
            if (!gameOver) {
                gameOver = true;
                showEndModal(false);
            }
        }
        renderFunHud();
    }, 1000);
}

function stopLightningTimer() {
    if (lightningTimer) {
        clearInterval(lightningTimer);
        lightningTimer = null;
    }
}
function ensureHowToModal() {
    let modal = document.getElementById('howto-modal');
    if (modal) return modal;

    modal = document.createElement('div');
    modal.id = 'howto-modal';
    modal.className = 'modal hidden howto-modal';
    modal.dataset.overlayClose = 'true';
    modal.innerHTML = `
        <div class="modal-content howto-content">
            <button class="close-btn" aria-label="Close">✕</button>
            <h2>How to Play</h2>
            <p class="howto-subtitle">Quick steps for students and teachers.</p>
            <div class="howto-section">
                <h3>1) Guess the word</h3>
                <ul>
                    <li>Type a word, then press Enter.</li>
                    <li><span class="tile howto-tile correct">W</span> Green = correct spot.</li>
                    <li><span class="tile howto-tile present">A</span> Gold = in the word, wrong spot.</li>
                    <li><span class="tile howto-tile absent">R</span> Slate = not in the word.</li>
                </ul>
            </div>
            <div class="howto-section">
                <h3>2) Use audio tools</h3>
                <ul>
                    <li>Hear Word / Definition / Sentence in the reveal card.</li>
                    <li>Warm‑Up: tap a sound to see mouth cues and hear it.</li>
                </ul>
            </div>
            <div class="howto-section">
                <h3>3) Fun mode (optional)</h3>
                <ul>
                    <li>Coins track progress. Hearts are optional in Challenge mode.</li>
                    <li>Teachers can toggle fun, sound effects, and difficulty.</li>
                </ul>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    modal.querySelector('.close-btn')?.addEventListener('click', closeModal);
    return modal;
}

function openHowToModal() {
    const modal = document.getElementById('welcome-modal');
    if (!modal || !modalOverlay) return;
    modalOverlay.classList.remove('hidden');
    modal.classList.remove('hidden');
}

function initAssessmentFlow() {
    ensureAssessmentControls();
}

function ensureAssessmentModal() {
    let modal = document.getElementById('assessment-modal');
    if (modal) return modal;

    modal = document.createElement('div');
    modal.id = 'assessment-modal';
    modal.className = 'modal hidden assessment-modal';
    modal.dataset.overlayClose = 'true';
    modal.innerHTML = `
        <div class="modal-content assessment-content">
            <button class="close-btn" aria-label="Close">✕</button>
            <h2>Words Their Way Assessment</h2>
            <p class="assessment-subtitle">Dictate each word, then capture the student’s typed response.</p>

            <div class="assessment-setup" id="assessment-setup">
                <div class="assessment-row">
                    <label for="assessment-student">Student name</label>
                    <input id="assessment-student" type="text" placeholder="Student name" />
                </div>
                <div class="assessment-row">
                    <label for="assessment-class">Class / Group (optional)</label>
                    <input id="assessment-class" type="text" placeholder="Class or group" />
                </div>
                <div class="assessment-row">
                    <label for="assessment-inventory">Inventory</label>
                    <select id="assessment-inventory">
                        <option value="psi">Primary (PSI)</option>
                        <option value="esi">Elementary (ESI)</option>
                        <option value="usi">Upper-Level (USI)</option>
                    </select>
                </div>
                <div class="assessment-row">
                    <label for="assessment-mode">Mode</label>
                    <select id="assessment-mode">
                        <option value="assessment">Assessment (official list)</option>
                        <option value="practice">Practice (similar patterns)</option>
                    </select>
                </div>
                <div class="assessment-row assessment-practice-row">
                    <label for="assessment-count">Practice words</label>
                    <input id="assessment-count" type="number" min="5" max="30" value="10" />
                </div>
                <button type="button" id="assessment-start" class="primary-btn">Start</button>
            </div>

            <div class="assessment-play hidden" id="assessment-play">
                <div class="assessment-hud">
                    <div class="assessment-progress">Word <span id="assessment-index">1</span> of <span id="assessment-total">10</span></div>
                    <div class="assessment-quest">Quest Coins: <span id="assessment-coins">0</span></div>
                    <div class="assessment-streak">Streak: <span id="assessment-streak">0</span></div>
                </div>
                <div class="assessment-prompt">Listen and type the word.</div>
                <div class="assessment-buttons">
                    <button type="button" id="assessment-play-prompt" class="secondary-btn">Play prompt</button>
                    <button type="button" id="assessment-play-word" class="secondary-btn">Play word</button>
                    <button type="button" id="assessment-play-sentence" class="secondary-btn">Play sentence</button>
                </div>
                <div class="assessment-input-row">
                    <input id="assessment-response" type="text" placeholder="Type the word here" />
                    <button type="button" id="assessment-submit" class="primary-btn">Submit</button>
                </div>
                <div id="assessment-feedback" class="assessment-feedback"></div>
                <div class="assessment-footer">
                    <button type="button" id="assessment-skip" class="secondary-btn">Skip</button>
                    <button type="button" id="assessment-stop" class="secondary-btn">End session</button>
                </div>
            </div>

            <div class="assessment-summary hidden" id="assessment-summary">
                <h3>Summary</h3>
                <div class="assessment-summary-grid">
                    <div><strong>Accuracy:</strong> <span id="assessment-accuracy"></span></div>
                    <div><strong>Correct:</strong> <span id="assessment-correct"></span></div>
                    <div><strong>Total:</strong> <span id="assessment-total-summary"></span></div>
                </div>
                <div id="assessment-feature-breakdown" class="assessment-feature-breakdown"></div>
                <div id="assessment-focus" class="assessment-note"></div>
                <div class="assessment-export">
                    <button type="button" id="assessment-export" class="primary-btn">Export CSV</button>
                    <button type="button" id="assessment-export-all" class="secondary-btn">Export all records</button>
                    <button type="button" id="assessment-restart" class="secondary-btn">Start another round</button>
                </div>
                <div class="assessment-note">Patterns are tagged for analysis and aligned with Words Their Way stages.</div>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    modal.querySelector('.close-btn')?.addEventListener('click', closeModal);

    modal.querySelector('#assessment-start')?.addEventListener('click', startAssessment);
    modal.querySelector('#assessment-play-prompt')?.addEventListener('click', () => playAssessmentPrompt());
    modal.querySelector('#assessment-play-word')?.addEventListener('click', () => playAssessmentWord());
    modal.querySelector('#assessment-play-sentence')?.addEventListener('click', () => playAssessmentSentence());
    modal.querySelector('#assessment-submit')?.addEventListener('click', submitAssessmentWord);
    modal.querySelector('#assessment-skip')?.addEventListener('click', () => submitAssessmentWord(true));
    modal.querySelector('#assessment-stop')?.addEventListener('click', finishAssessment);
    modal.querySelector('#assessment-export')?.addEventListener('click', exportCurrentAssessment);
    modal.querySelector('#assessment-export-all')?.addEventListener('click', exportAllAssessments);
    modal.querySelector('#assessment-restart')?.addEventListener('click', restartAssessment);

    const responseInput = modal.querySelector('#assessment-response');
    responseInput?.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            submitAssessmentWord();
        }
    });

    const modeSelect = modal.querySelector('#assessment-mode');
    const practiceRow = modal.querySelector('.assessment-practice-row');
    modeSelect?.addEventListener('change', () => {
        if (!practiceRow) return;
        practiceRow.style.display = modeSelect.value === 'practice' ? 'grid' : 'none';
    });

    return modal;
}

function openAssessmentModal() {
    const modal = ensureAssessmentModal();
    if (!modalOverlay) return;
    modalOverlay.classList.remove('hidden');
    modal.classList.remove('hidden');
}

function ensureCorePhonicsModal() {
    let modal = document.getElementById('core-phonics-modal');
    if (modal) return modal;
    modal = document.createElement('div');
    modal.id = 'core-phonics-modal';
    modal.className = 'modal hidden core-phonics-modal';
    modal.dataset.overlayClose = 'true';
    modal.innerHTML = `
        <div class="modal-content core-phonics-content">
            <button class="close-btn" aria-label="Close">✕</button>
            <h2>Core Phonics Practice</h2>
            <p class="assessment-subtitle">Progressive decoding practice for small groups or independent work.</p>
            <div class="core-phonics-controls">
                <label for="core-phonics-level">Level</label>
                <select id="core-phonics-level"></select>
                <button type="button" id="core-phonics-shuffle" class="secondary-btn">Shuffle</button>
            </div>
            <div class="core-phonics-hud">
                <div>Word <span id="core-phonics-index">1</span> / <span id="core-phonics-total">1</span></div>
                <div>Quest Coins: <span id="core-phonics-coins">0</span></div>
            </div>
            <div class="core-phonics-card">
                <div id="core-phonics-word" class="core-phonics-word">cat</div>
            </div>
            <div class="core-phonics-actions">
                <button type="button" id="core-phonics-play" class="secondary-btn">Play word</button>
                <button type="button" id="core-phonics-next" class="primary-btn">I read it!</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    modal.querySelector('.close-btn')?.addEventListener('click', closeModal);
    modal.querySelector('#core-phonics-play')?.addEventListener('click', playCorePhonicsWord);
    modal.querySelector('#core-phonics-next')?.addEventListener('click', advanceCorePhonics);
    modal.querySelector('#core-phonics-shuffle')?.addEventListener('click', shuffleCorePhonics);

    const select = modal.querySelector('#core-phonics-level');
    select.innerHTML = '';
    CORE_PHONICS_LEVELS.forEach(level => {
        const option = document.createElement('option');
        option.value = level.id;
        option.textContent = level.label;
        select.appendChild(option);
    });
    select.addEventListener('change', () => {
        startCorePhonics(select.value);
    });
    return modal;
}

function openCorePhonicsModal() {
    const modal = ensureCorePhonicsModal();
    if (!modalOverlay) return;
    modalOverlay.classList.remove('hidden');
    modal.classList.remove('hidden');
    const select = modal.querySelector('#core-phonics-level');
    startCorePhonics(select?.value || CORE_PHONICS_LEVELS[0].id);
}

let corePhonicsState = null;

function startCorePhonics(levelId) {
    const level = CORE_PHONICS_LEVELS.find(item => item.id === levelId) || CORE_PHONICS_LEVELS[0];
    corePhonicsState = {
        levelId: level.id,
        words: [...level.words],
        index: 0,
        coins: 0
    };
    updateCorePhonicsUI();
}

function updateCorePhonicsUI() {
    if (!corePhonicsState) return;
    const modal = ensureCorePhonicsModal();
    const word = corePhonicsState.words[corePhonicsState.index] || '';
    modal.querySelector('#core-phonics-word').textContent = word.toUpperCase();
    modal.querySelector('#core-phonics-index').textContent = `${corePhonicsState.index + 1}`;
    modal.querySelector('#core-phonics-total').textContent = `${corePhonicsState.words.length}`;
    modal.querySelector('#core-phonics-coins').textContent = `${corePhonicsState.coins}`;
}

function playCorePhonicsWord() {
    if (!corePhonicsState) return;
    const word = corePhonicsState.words[corePhonicsState.index];
    if (word) speakText(word, 'word');
}

function advanceCorePhonics() {
    if (!corePhonicsState) return;
    corePhonicsState.coins += 1;
    corePhonicsState.index = (corePhonicsState.index + 1) % corePhonicsState.words.length;
    updateCorePhonicsUI();
}

function shuffleCorePhonics() {
    if (!corePhonicsState) return;
    corePhonicsState.words = shuffleList(corePhonicsState.words);
    corePhonicsState.index = 0;
    updateCorePhonicsUI();
}

function startAssessment() {
    const modal = ensureAssessmentModal();
    const student = modal.querySelector('#assessment-student')?.value.trim() || 'Student';
    const classGroup = modal.querySelector('#assessment-class')?.value.trim() || '';
    const inventoryId = modal.querySelector('#assessment-inventory')?.value || 'psi';
    const mode = modal.querySelector('#assessment-mode')?.value || 'assessment';
    const practiceCount = parseInt(modal.querySelector('#assessment-count')?.value || '10', 10);

    const inventory = WTW_INVENTORIES[inventoryId];
    const baseList = mode === 'practice'
        ? (WTW_PRACTICE_SETS[inventoryId] || inventory.words)
        : inventory.words;

    const list = mode === 'practice'
        ? shuffleList([...baseList]).slice(0, Math.max(5, Math.min(30, practiceCount || 10)))
        : [...baseList];

    assessmentState = {
        id: `wtw_${Date.now()}`,
        student,
        classGroup,
        inventoryId,
        inventoryLabel: inventory.label,
        mode,
        list,
        index: 0,
        responses: [],
        correct: 0,
        streak: 0,
        coins: 0,
        startedAt: new Date().toISOString(),
        endedAt: null
    };

    modal.querySelector('#assessment-setup')?.classList.add('hidden');
    modal.querySelector('#assessment-summary')?.classList.add('hidden');
    modal.querySelector('#assessment-play')?.classList.remove('hidden');
    updateAssessmentUI();
}

function restartAssessment() {
    const modal = ensureAssessmentModal();
    modal.querySelector('#assessment-summary')?.classList.add('hidden');
    modal.querySelector('#assessment-setup')?.classList.remove('hidden');
    modal.querySelector('#assessment-play')?.classList.add('hidden');
}

function updateAssessmentUI() {
    if (!assessmentState) return;
    const modal = ensureAssessmentModal();
    const total = assessmentState.list.length;
    const current = assessmentState.list[assessmentState.index];
    modal.querySelector('#assessment-index').textContent = `${assessmentState.index + 1}`;
    modal.querySelector('#assessment-total').textContent = `${total}`;
    modal.querySelector('#assessment-coins').textContent = `${assessmentState.coins}`;
    modal.querySelector('#assessment-streak').textContent = `${assessmentState.streak}`;
    modal.querySelector('#assessment-feedback').textContent = current ? `Target pattern: ${current.pattern}` : '';
    modal.querySelector('#assessment-response').value = '';
}

function playAssessmentPrompt() {
    const word = getAssessmentWord();
    if (!word) return;
    const sentence = buildAssessmentSentence(word);
    cancelPendingSpeech(true);
    speakText(word, 'word');
    const delay1 = estimateSpeechDuration(word, getSpeechRate('word')) + 200;
    setTimeout(() => speakText(sentence, 'sentence'), delay1);
    const delay2 = delay1 + estimateSpeechDuration(sentence, getSpeechRate('sentence')) + 200;
    setTimeout(() => speakText(word, 'word'), delay2);
}

function playAssessmentWord() {
    const word = getAssessmentWord();
    if (word) speakText(word, 'word');
}

function playAssessmentSentence() {
    const word = getAssessmentWord();
    if (!word) return;
    speakText(buildAssessmentSentence(word), 'sentence');
}

function buildAssessmentSentence(word) {
    return `The word is ${word}.`;
}

function getAssessmentWord() {
    if (!assessmentState) return '';
    return assessmentState.list[assessmentState.index]?.word || '';
}

function submitAssessmentWord(isSkip = false) {
    if (!assessmentState) return;
    const modal = ensureAssessmentModal();
    const current = assessmentState.list[assessmentState.index];
    if (!current) return;
    const responseInput = modal.querySelector('#assessment-response');
    const response = isSkip ? '' : (responseInput?.value.trim() || '');
    const correct = !isSkip && response.toLowerCase() === current.word.toLowerCase();

    assessmentState.responses.push({
        word: current.word,
        pattern: current.pattern,
        response,
        correct,
        index: assessmentState.index + 1
    });

    if (correct) {
        assessmentState.correct += 1;
        assessmentState.streak += 1;
        assessmentState.coins += 2;
    } else {
        assessmentState.streak = 0;
    }

    assessmentState.index += 1;
    if (assessmentState.index >= assessmentState.list.length) {
        finishAssessment();
    } else {
        updateAssessmentUI();
    }
}

function finishAssessment() {
    if (!assessmentState) return;
    assessmentState.endedAt = new Date().toISOString();

    const modal = ensureAssessmentModal();
    modal.querySelector('#assessment-play')?.classList.add('hidden');
    modal.querySelector('#assessment-summary')?.classList.remove('hidden');

    const total = assessmentState.list.length;
    const accuracy = total ? Math.round((assessmentState.correct / total) * 100) : 0;
    modal.querySelector('#assessment-accuracy').textContent = `${accuracy}%`;
    modal.querySelector('#assessment-correct').textContent = `${assessmentState.correct}`;
    modal.querySelector('#assessment-total-summary').textContent = `${total}`;

    const breakdown = getFeatureBreakdown(assessmentState.responses);
    renderFeatureBreakdown(breakdown);
    renderFocusNote(breakdown, accuracy, assessmentState.inventoryId);

    saveAssessmentRecord(assessmentState);
}

function saveAssessmentRecord(record) {
    const key = 'wtw_assessment_records';
    const existing = JSON.parse(localStorage.getItem(key) || '[]');
    existing.push(record);
    localStorage.setItem(key, JSON.stringify(existing));
}

function exportCurrentAssessment() {
    if (!assessmentState) return;
    const csv = buildAssessmentCSV(assessmentState);
    downloadCSV(csv, `wtw_${assessmentState.student}_${assessmentState.inventoryId}.csv`);
}

function exportAllAssessments() {
    const key = 'wtw_assessment_records';
    const records = JSON.parse(localStorage.getItem(key) || '[]');
    if (!records.length) return showToast('No saved assessments yet.');
    const csv = records.map(buildAssessmentCSV).join('\n\n');
    downloadCSV(csv, `wtw_all_assessments.csv`);
}

function buildAssessmentCSV(record) {
    const header = [
        'Student',
        'Class',
        'Inventory',
        'Mode',
        'Word',
        'Pattern',
        'Response',
        'Correct',
        'Index',
        'Started At',
        'Ended At'
    ];
    const rows = record.responses.map(item => [
        record.student,
        record.classGroup || '',
        record.inventoryLabel,
        record.mode,
        item.word,
        item.pattern,
        item.response,
        item.correct ? 'Yes' : 'No',
        item.index,
        record.startedAt,
        record.endedAt || ''
    ]);
    const total = record.list.length;
    const accuracy = total ? Math.round((record.correct / total) * 100) : 0;
    const breakdown = getFeatureBreakdown(record.responses);
    const suggestion = getStageSuggestion(record.inventoryId, accuracy);
    rows.push([
        record.student,
        record.classGroup || '',
        record.inventoryLabel,
        record.mode,
        'Summary',
        '',
        '',
        '',
        `Accuracy ${accuracy}%`,
        '',
        ''
    ]);
    rows.push([
        record.student,
        record.classGroup || '',
        record.inventoryLabel,
        record.mode,
        'Placement Suggestion',
        suggestion,
        '',
        '',
        '',
        '',
        ''
    ]);
    Object.entries(breakdown).forEach(([feature, stats]) => {
        rows.push([
            record.student,
            record.classGroup || '',
            record.inventoryLabel,
            record.mode,
            'Feature Summary',
            feature,
            '',
            `${stats.correct}/${stats.total}`,
            '',
            '',
            ''
        ]);
    });
    return [header, ...rows].map(row => row.map(escapeCsv).join(',')).join('\n');
}

function escapeCsv(value) {
    const str = String(value ?? '');
    if (/[",\n]/.test(str)) {
        return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
}

function downloadCSV(csv, filename) {
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
}

function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
}

const CRC_TABLE = (() => {
    const table = new Uint32Array(256);
    for (let i = 0; i < 256; i += 1) {
        let c = i;
        for (let k = 0; k < 8; k += 1) {
            c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
        }
        table[i] = c >>> 0;
    }
    return table;
})();

function crc32(data) {
    let c = 0xffffffff;
    for (let i = 0; i < data.length; i += 1) {
        c = CRC_TABLE[(c ^ data[i]) & 0xff] ^ (c >>> 8);
    }
    return (c ^ 0xffffffff) >>> 0;
}

function getDosDateTime(date = new Date()) {
    const year = Math.max(1980, date.getFullYear());
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const seconds = Math.floor(date.getSeconds() / 2);
    const dosTime = (hours << 11) | (minutes << 5) | seconds;
    const dosDate = ((year - 1980) << 9) | (month << 5) | day;
    return { dosTime, dosDate };
}

function createZipArchive(files = []) {
    const encoder = new TextEncoder();
    const fileRecords = [];
    const chunks = [];
    let offset = 0;

    files.forEach(file => {
        const nameBytes = encoder.encode(file.name);
        const data = file.data || new Uint8Array();
        const { dosTime, dosDate } = getDosDateTime();
        const crc = crc32(data);

        const localHeader = new Uint8Array(30 + nameBytes.length);
        const view = new DataView(localHeader.buffer);
        view.setUint32(0, 0x04034b50, true);
        view.setUint16(4, 20, true);
        view.setUint16(6, 0, true);
        view.setUint16(8, 0, true);
        view.setUint16(10, dosTime, true);
        view.setUint16(12, dosDate, true);
        view.setUint32(14, crc, true);
        view.setUint32(18, data.length, true);
        view.setUint32(22, data.length, true);
        view.setUint16(26, nameBytes.length, true);
        view.setUint16(28, 0, true);
        localHeader.set(nameBytes, 30);

        chunks.push(localHeader, data);
        fileRecords.push({
            nameBytes,
            crc,
            size: data.length,
            offset,
            dosTime,
            dosDate
        });
        offset += localHeader.length + data.length;
    });

    const centralChunks = [];
    let centralSize = 0;
    fileRecords.forEach(record => {
        const centralHeader = new Uint8Array(46 + record.nameBytes.length);
        const view = new DataView(centralHeader.buffer);
        view.setUint32(0, 0x02014b50, true);
        view.setUint16(4, 20, true);
        view.setUint16(6, 20, true);
        view.setUint16(8, 0, true);
        view.setUint16(10, 0, true);
        view.setUint16(12, record.dosTime, true);
        view.setUint16(14, record.dosDate, true);
        view.setUint32(16, record.crc, true);
        view.setUint32(20, record.size, true);
        view.setUint32(24, record.size, true);
        view.setUint16(28, record.nameBytes.length, true);
        view.setUint16(30, 0, true);
        view.setUint16(32, 0, true);
        view.setUint16(34, 0, true);
        view.setUint16(36, 0, true);
        view.setUint32(38, 0, true);
        view.setUint32(42, record.offset, true);
        centralHeader.set(record.nameBytes, 46);
        centralChunks.push(centralHeader);
        centralSize += centralHeader.length;
    });

    const endRecord = new Uint8Array(22);
    const endView = new DataView(endRecord.buffer);
    endView.setUint32(0, 0x06054b50, true);
    endView.setUint16(4, 0, true);
    endView.setUint16(6, 0, true);
    endView.setUint16(8, fileRecords.length, true);
    endView.setUint16(10, fileRecords.length, true);
    endView.setUint32(12, centralSize, true);
    endView.setUint32(16, offset, true);
    endView.setUint16(20, 0, true);

    return new Blob([...chunks, ...centralChunks, endRecord], { type: 'application/zip' });
}

function shuffleList(list) {
    const copy = [...list];
    for (let i = copy.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
}

function getShuffleBagKey(scope = '') {
    return `${SHUFFLE_MEMORY_KEY_PREFIX}${String(scope || '').trim()}`;
}

function readShuffleBagState(scope = '') {
    const key = getShuffleBagKey(scope);
    try {
        const parsed = JSON.parse(localStorage.getItem(key) || '{}');
        if (!parsed || typeof parsed !== 'object') return { key, queue: [], signature: '', last: '' };
        return {
            key,
            queue: Array.isArray(parsed.queue) ? parsed.queue : [],
            signature: typeof parsed.signature === 'string' ? parsed.signature : '',
            last: typeof parsed.last === 'string' ? parsed.last : ''
        };
    } catch {
        return { key, queue: [], signature: '', last: '' };
    }
}

function writeShuffleBagState(state = {}) {
    const key = state.key || getShuffleBagKey(state.scope || '');
    const payload = {
        queue: Array.isArray(state.queue) ? state.queue : [],
        signature: typeof state.signature === 'string' ? state.signature : '',
        last: typeof state.last === 'string' ? state.last : ''
    };
    try {
        localStorage.setItem(key, JSON.stringify(payload));
    } catch (e) {}
}

function getNonRepeatingShuffleChoice(items = [], scope = 'default') {
    const pool = Array.from(new Set((Array.isArray(items) ? items : []).filter(Boolean)));
    if (!pool.length) return '';
    if (pool.length === 1) return pool[0];

    const signature = `${pool.length}::${pool.slice().sort().join('|')}`;
    const state = readShuffleBagState(scope);
    let queue = state.queue.filter((item) => pool.includes(item));
    if (state.signature !== signature || !queue.length) {
        queue = shuffleList(pool);
        if (queue.length > 1 && state.last && queue[queue.length - 1] === state.last) {
            [queue[0], queue[queue.length - 1]] = [queue[queue.length - 1], queue[0]];
        }
    }
    const next = queue.pop() || pool[Math.floor(Math.random() * pool.length)];
    writeShuffleBagState({
        key: state.key,
        queue,
        signature,
        last: next
    });
    return next;
}

function getFeatureBreakdown(responses = []) {
    return responses.reduce((acc, item) => {
        const key = item.pattern || 'Unknown';
        if (!acc[key]) acc[key] = { total: 0, correct: 0 };
        acc[key].total += 1;
        if (item.correct) acc[key].correct += 1;
        return acc;
    }, {});
}

function renderFeatureBreakdown(breakdown) {
    const container = document.getElementById('assessment-feature-breakdown');
    if (!container) return;
    container.innerHTML = '';
    const entries = Object.entries(breakdown);
    if (!entries.length) return;
    const list = document.createElement('div');
    list.className = 'assessment-feature-list';
    entries.forEach(([feature, stats]) => {
        const chip = document.createElement('div');
        chip.className = 'assessment-feature-chip';
        chip.textContent = `${feature}: ${stats.correct}/${stats.total}`;
        list.appendChild(chip);
    });
    container.appendChild(list);
}

function renderFocusNote(breakdown, accuracy = 0, inventoryId = '') {
    const container = document.getElementById('assessment-focus');
    if (!container) return;
    const entries = Object.entries(breakdown);
    if (!entries.length) {
        container.textContent = '';
        return;
    }
    const sorted = entries.sort((a, b) => (a[1].correct / a[1].total) - (b[1].correct / b[1].total));
    const focus = sorted.slice(0, 3).map(([feature]) => feature);
    const suggestion = getStageSuggestion(inventoryId, accuracy);
    container.textContent = `Suggested focus patterns: ${focus.join(', ')}. ${suggestion}`;
}

function getStageSuggestion(inventoryId, accuracy) {
    if (inventoryId === 'psi') {
        return accuracy >= 85
            ? 'Placement suggestion: ready to try the Elementary Spelling Inventory.'
            : 'Placement suggestion: continue with Primary Spelling Inventory.';
    }
    if (inventoryId === 'esi') {
        return accuracy >= 85
            ? 'Placement suggestion: ready to try the Upper-Level Spelling Inventory.'
            : 'Placement suggestion: continue with Elementary Spelling Inventory.';
    }
    if (inventoryId === 'usi') {
        return accuracy >= 85
            ? 'Placement suggestion: strong derivational patterns; continue advanced instruction.'
            : 'Placement suggestion: continue with Upper-Level Spelling Inventory.';
    }
    return '';
}

function getDismissableModal() {
    const modals = getAllModalElements();
    const visible = modals.filter(modal => {
        const isVisible = !modal.classList.contains('hidden');
        const canClose = modal.dataset.overlayClose === 'true';
        return isVisible && canClose;
    });
    const infoModal = visible.find(modal => modal.id === 'info-modal');
    return infoModal || visible[0];
}

function initModalDismissals() {
    if (!modalOverlay) return;

    modalOverlay.addEventListener('click', (e) => {
        if (e.target !== modalOverlay) return;
        const active = getDismissableModal();
        if (active) {
            if (active.id === 'welcome-modal') {
                return closeModal();
            }
            if (active.id === 'info-modal') return closeInfoModal();
            closeModal();
        }
    });

    document.addEventListener('keydown', (e) => {
        if (e.key !== 'Enter') return;
        const activeEl = document.activeElement;
        if (activeEl && ['INPUT', 'TEXTAREA', 'SELECT'].includes(activeEl.tagName)) return;
        const active = getDismissableModal();
        if (!active) return;
        if (active.id === 'welcome-modal') {
            return closeModal();
        }
        if (active.id === 'info-modal') return closeInfoModal();
        closeModal();
    });
}

// Initialize on page load handled above.

// Click outside to close tools dropdown
document.addEventListener('click', (e) => {
    const toolsMenu = document.getElementById('wq-tools-menu');
    if (toolsMenu && toolsMenu.classList.contains('is-open') && !toolsMenu.contains(e.target)) {
        toolsMenu.classList.remove('is-open');
    }
});
