/**
 * cost-tracker.js — Real-time Azure API cost monitoring
 *
 * Tracks token usage across all Azure OpenAI API calls.
 * Stores monthly usage in localStorage with cost calculations.
 * Provides alerts when approaching budget thresholds.
 */

(function initCostTracker() {
  "use strict";

  /* ── Configuration ────────────────────────────────────────── */
  var CONFIG = {
    inputCostPer1k: 0.005,      // $0.005 per 1,000 input tokens
    outputCostPer1k: 0.015,     // $0.015 per 1,000 output tokens
    monthlyBudgetUSD: 5.00,     // Alert threshold: $5/month
    storageKeyPrefix: "cs_cost_"
  };

  /* ── Monthly Usage Tracking ──────────────────────────────── */
  function getMonthKey() {
    var now = new Date();
    return "y" + now.getFullYear() + "m" + String(now.getMonth() + 1).padStart(2, "0");
  }

  function getMonthlyUsage() {
    var key = CONFIG.storageKeyPrefix + getMonthKey();
    try {
      var data = JSON.parse(localStorage.getItem(key) || "{}");
      return {
        inputTokens: Number(data.inputTokens || 0),
        outputTokens: Number(data.outputTokens || 0),
        callCount: Number(data.callCount || 0),
        lastUpdated: data.lastUpdated || null
      };
    } catch (_e) {
      return { inputTokens: 0, outputTokens: 0, callCount: 0, lastUpdated: null };
    }
  }

  function saveMonthlyUsage(usage) {
    var key = CONFIG.storageKeyPrefix + getMonthKey();
    usage.lastUpdated = new Date().toISOString();
    try {
      localStorage.setItem(key, JSON.stringify(usage));
    } catch (_e) {
      console.warn("Cost tracker: localStorage unavailable");
    }
  }

  /* ── Cost Calculations ───────────────────────────────────── */
  function calculateCost(inputTokens, outputTokens) {
    var inputCost = (inputTokens / 1000) * CONFIG.inputCostPer1k;
    var outputCost = (outputTokens / 1000) * CONFIG.outputCostPer1k;
    return {
      inputCost: inputCost,
      outputCost: outputCost,
      totalCost: inputCost + outputCost
    };
  }

  function getMonthlySpend() {
    var usage = getMonthlyUsage();
    return calculateCost(usage.inputTokens, usage.outputTokens).totalCost;
  }

  /* ── Public API ──────────────────────────────────────────── */
  window.CSCostTracker = {
    /**
     * Track a single API call
     * @param {string} type - Type of call: "subplan", "brief", "coaching", etc.
     * @param {number} inputTokens - Tokens sent to API
     * @param {number} outputTokens - Tokens received from API
     */
    trackCall: function (type, inputTokens, outputTokens) {
      var usage = getMonthlyUsage();
      var costs = calculateCost(inputTokens, outputTokens);

      usage.inputTokens += inputTokens;
      usage.outputTokens += outputTokens;
      usage.callCount += 1;

      saveMonthlyUsage(usage);

      var monthlySpend = getMonthlySpend();
      var percentOfBudget = (monthlySpend / CONFIG.monthlyBudgetUSD) * 100;

      // Dispatch custom event for UI updates
      window.dispatchEvent(new CustomEvent("cs-cost-tracked", {
        detail: {
          type: type,
          callCost: costs.totalCost,
          monthlySpend: monthlySpend,
          percentOfBudget: percentOfBudget,
          monthKey: getMonthKey(),
          usage: usage
        }
      }));

      // Log to console (dev/debug)
      console.log(
        "[CostTracker] " + type + " | " +
        "Input: " + inputTokens + " | Output: " + outputTokens + " | " +
        "Cost: $" + costs.totalCost.toFixed(4) + " | " +
        "Month: $" + monthlySpend.toFixed(2) + " (" + percentOfBudget.toFixed(1) + "%)"
      );

      // Warn if exceeding budget
      if (monthlySpend > CONFIG.monthlyBudgetUSD) {
        console.warn(
          "⚠️ Monthly budget exceeded! Current: $" + monthlySpend.toFixed(2) +
          " / Budget: $" + CONFIG.monthlyBudgetUSD.toFixed(2)
        );
      }

      return {
        callCost: costs.totalCost,
        monthlySpend: monthlySpend,
        percentOfBudget: percentOfBudget
      };
    },

    /**
     * Get current monthly usage stats
     */
    getMonthlyStats: function () {
      var usage = getMonthlyUsage();
      var costs = calculateCost(usage.inputTokens, usage.outputTokens);
      return {
        month: getMonthKey(),
        inputTokens: usage.inputTokens,
        outputTokens: usage.outputTokens,
        totalTokens: usage.inputTokens + usage.outputTokens,
        callCount: usage.callCount,
        inputCost: costs.inputCost,
        outputCost: costs.outputCost,
        totalCost: costs.totalCost,
        budgetRemaining: Math.max(0, CONFIG.monthlyBudgetUSD - costs.totalCost),
        percentOfBudget: (costs.totalCost / CONFIG.monthlyBudgetUSD) * 100,
        lastUpdated: usage.lastUpdated
      };
    },

    /**
     * Get all monthly usage (history)
     */
    getAllMonthlyStats: function () {
      var stats = {};
      try {
        for (var key in localStorage) {
          if (key.indexOf(CONFIG.storageKeyPrefix) === 0) {
            var monthKey = key.replace(CONFIG.storageKeyPrefix, "");
            var data = JSON.parse(localStorage.getItem(key));
            var costs = calculateCost(data.inputTokens, data.outputTokens);
            stats[monthKey] = {
              inputTokens: data.inputTokens,
              outputTokens: data.outputTokens,
              totalCost: costs.totalCost,
              callCount: data.callCount,
              lastUpdated: data.lastUpdated
            };
          }
        }
      } catch (_e) {}
      return stats;
    },

    /**
     * Reset monthly budget (admin only)
     */
    resetMonth: function () {
      var key = CONFIG.storageKeyPrefix + getMonthKey();
      try {
        localStorage.removeItem(key);
      } catch (_e) {}
      console.log("[CostTracker] Monthly usage reset for " + getMonthKey());
    },

    /**
     * Set monthly budget threshold (in USD)
     */
    setBudgetThreshold: function (usd) {
      CONFIG.monthlyBudgetUSD = Number(usd) || 5.00;
      console.log("[CostTracker] Budget threshold set to $" + CONFIG.monthlyBudgetUSD.toFixed(2));
    }
  };

  // Auto-bind to window for easy access
  window.CSCostTracker.init = function () {
    console.log("[CostTracker] Initialized. Budget: $" + CONFIG.monthlyBudgetUSD.toFixed(2) + "/month");
    return window.CSCostTracker;
  };

})();
