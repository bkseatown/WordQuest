(function initDataRegistry(root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(root);
  } else {
    root.CSDataRegistry = factory(root);
  }
}(typeof globalThis !== 'undefined' ? globalThis : window, function factory(root) {
  'use strict';

  var DATA_ASSETS = {
    skillTaxonomy: { url: 'data/skill-taxonomy.v1.json', versionKey: 'cs.skillTaxonomy.v1' },
    skillMapping: { url: 'data/skill-mapping.v1.json', versionKey: 'cs.skillMapping.v1' }
  };

  var buildIdPromise = null;

  function normalizeUrl(url) {
    if (url.indexOf('./') === 0 || url.indexOf('/') === 0) return url;
    return './' + url;
  }

  function getBuildId() {
    if (buildIdPromise) return buildIdPromise;

    buildIdPromise = Promise.resolve().then(function () {
      if (root && root.BUILD_ID) return String(root.BUILD_ID);
      if (typeof fetch !== 'function') return '';
      return fetch('./build.json', { cache: 'no-store' })
        .then(function (resp) { return resp && resp.ok ? resp.json() : null; })
        .then(function (json) {
          if (!json) return '';
          return String(json.buildId || json.id || json.version || '');
        })
        .catch(function () { return ''; });
    });

    return buildIdPromise;
  }

  function withBuildParam(url, buildId) {
    if (!buildId) return url;
    var sep = url.indexOf('?') === -1 ? '?' : '&';
    return url + sep + 'v=' + encodeURIComponent(buildId);
  }

  function loadJsonAsset(asset, options) {
    var opts = options || {};
    var cacheMode = opts.cache || 'default';
    if (!asset || !asset.url || !asset.versionKey) {
      return Promise.reject(new Error('Invalid asset descriptor'));
    }
    if (typeof fetch !== 'function') {
      return Promise.reject(new Error('fetch unavailable in this environment'));
    }

    return getBuildId().then(function (buildId) {
      var url = withBuildParam(normalizeUrl(asset.url), buildId);
      return fetch(url, { cache: cacheMode });
    }).then(function (resp) {
      if (!resp || !resp.ok) {
        throw new Error('Failed to load asset: ' + asset.url);
      }
      return resp.json();
    }).then(function (json) {
      var version = json && json.version ? String(json.version) : '';
      if (version !== String(asset.versionKey)) {
        throw new Error('Version mismatch for ' + asset.url + ': expected ' + asset.versionKey + ', got ' + version);
      }
      return json;
    });
  }

  return {
    DATA_ASSETS: DATA_ASSETS,
    loadJsonAsset: loadJsonAsset,
    _getBuildId: getBuildId
  };
}));
