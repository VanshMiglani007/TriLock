/**
 * TriLock AI Voice Notification Service
 * Powered by OmniDimension (https://omnidim.io)
 *
 * Fires an outbound AI voice call to a citizen when their data
 * is accessed via an emergency token.
 *
 * Setup:
 *   1. Create agent at https://app.omnidim.io
 *   2. Copy the numeric Agent ID from the agent URL or settings
 *   3. Set OMNIDIM_API_KEY and OMNIDIM_AGENT_ID in server/.env
 *
 * Without credentials → runs in SIMULATION MODE (logs to console).
 * Set OMNIDIM_ENABLED=false → forces SIMULATION MODE even with credentials.
 *
 * Budget Protection:
 *   The service tracks estimated call minutes per server lifetime.
 *   Once the budget ceiling (OMNIDIM_BUDGET_MINUTES, default 5) is reached,
 *   no further live calls are dispatched until the server restarts.
 *
 * API Reference: POST https://backend.omnidim.io/api/v1/calls/dispatch
 */

const https = require('https');

// ── Budget Tracker (in-memory, resets on server restart) ────────────────
const budgetState = {
  callCount: 0,
  estimatedSecondsUsed: 0,   // conservative estimate per call
  SECONDS_PER_CALL: 45       // assume ~45s per notification call for budget math
};

/**
 * Returns true if we still have budget left for another call.
 */
function hasBudget() {
  const budgetMinutes = parseFloat(process.env.OMNIDIM_BUDGET_MINUTES) || 5;
  const budgetSeconds = budgetMinutes * 60;
  return budgetState.estimatedSecondsUsed < budgetSeconds;
}

/**
 * Record that a call was dispatched (for budget tracking).
 */
function recordCall() {
  budgetState.callCount += 1;
  budgetState.estimatedSecondsUsed += budgetState.SECONDS_PER_CALL;
}

/**
 * Get current budget status.
 */
function getBudgetStatus() {
  const budgetMinutes = parseFloat(process.env.OMNIDIM_BUDGET_MINUTES) || 5;
  return {
    callCount: budgetState.callCount,
    estimatedSecondsUsed: budgetState.estimatedSecondsUsed,
    budgetSecondsTotal: budgetMinutes * 60,
    remaining: Math.max(0, (budgetMinutes * 60) - budgetState.estimatedSecondsUsed)
  };
}


/**
 * Place an outbound AI voice call to notify a citizen.
 *
 * @param {object} params
 * @param {string} params.phoneNumber  - E.164 e.g. +919470857177
 * @param {string} params.citizenName
 * @param {string} params.caseNumber
 * @param {string} params.officerName
 * @param {string} params.department
 * @param {number} params.duration     - access window in hours
 */
async function notifyCitizenVoiceCall({
  phoneNumber,
  citizenName,
  caseNumber,
  officerName,
  department,
  duration
}) {
  const apiKey   = process.env.OMNIDIM_API_KEY;
  const agentId  = parseInt(process.env.OMNIDIM_AGENT_ID, 10); // must be integer
  const enabled  = (process.env.OMNIDIM_ENABLED || 'true').toLowerCase() !== 'false';

  // --- KILL-SWITCH: OMNIDIM_ENABLED=false forces simulation mode ---
  if (!enabled) {
    console.log('\n[TriLock VoiceAI] ════════════════════════════════════════');
    console.log('[TriLock VoiceAI] DISABLED — OMNIDIM_ENABLED is set to false');
    console.log(`[TriLock VoiceAI] → Would have called: ${phoneNumber}`);
    console.log('[TriLock VoiceAI] ════════════════════════════════════════\n');
    return { simulated: true, reason: 'disabled' };
  }

  // --- DEMO / SIMULATION MODE ---
  if (!apiKey || !agentId) {
    console.log('\n[TriLock VoiceAI] ════════════════════════════════════════');
    console.log('[TriLock VoiceAI] SIMULATED CALL — set OMNIDIM_API_KEY + OMNIDIM_AGENT_ID to go live');
    console.log(`[TriLock VoiceAI] → To      : ${phoneNumber}`);
    console.log(`[TriLock VoiceAI] → Citizen : ${citizenName}`);
    console.log(`[TriLock VoiceAI] → Case    : ${caseNumber}  |  Duration: ${duration}h`);
    console.log('[TriLock VoiceAI] ════════════════════════════════════════\n');
    return { simulated: true };
  }

  // --- BUDGET CHECK ---
  if (!hasBudget()) {
    const status = getBudgetStatus();
    console.warn('\n[TriLock VoiceAI] ════════════════════════════════════════');
    console.warn(`[TriLock VoiceAI] BUDGET EXHAUSTED — ${status.callCount} calls dispatched, ~${Math.round(status.estimatedSecondsUsed / 60)} min used of ${Math.round(status.budgetSecondsTotal / 60)} min budget`);
    console.warn('[TriLock VoiceAI] Skipping live call to protect free plan.');
    console.warn('[TriLock VoiceAI] Restart server or increase OMNIDIM_BUDGET_MINUTES to reset.');
    console.warn('[TriLock VoiceAI] ════════════════════════════════════════\n');
    return { skipped: true, reason: 'budget_exhausted', ...status };
  }

  // --- LIVE MODE — Omnidim Dispatch API ---
  // call_context key-value pairs are passed to the agent during the call.
  // Reference them inside your Omnidim agent's conversational flow.
  //
  // The "action_after_message" instruction tells the AI agent to hang up
  // immediately after delivering the notification — no waiting, no follow-up.
  const payload = JSON.stringify({
    agent_id: agentId,
    to_number: phoneNumber,
    call_context: {
      citizen_name: citizenName,
      case_number:  caseNumber,
      officer_name: officerName,
      department:   department || 'Law Enforcement',
      duration:     String(duration),
      // Instruct the AI agent to end the call after the message is spoken
      action_after_message: 'hangup',
      instruction: 'After delivering the notification message to the citizen, immediately end the call. Do not wait for a response or continue the conversation.'
    }
  });

  return new Promise((resolve) => {
    const options = {
      hostname: 'backend.omnidim.io',
      path:     '/api/v1/calls/dispatch',
      method:   'POST',
      headers: {
        'Content-Type':   'application/json',
        'Authorization':  `Bearer ${apiKey}`,
        'Content-Length': Buffer.byteLength(payload)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (res.statusCode >= 200 && res.statusCode < 300) {
            // Track budget on successful dispatch
            recordCall();
            const status = getBudgetStatus();
            console.log(`[TriLock VoiceAI] ✓ Call dispatched to ${phoneNumber} | Call ID: ${parsed.call_id || parsed.id || 'N/A'}`);
            console.log(`[TriLock VoiceAI]   Budget: ${status.callCount} calls, ~${Math.round(status.estimatedSecondsUsed / 60)}/${Math.round(status.budgetSecondsTotal / 60)} min used`);
            resolve(parsed);
          } else {
            console.error(`[TriLock VoiceAI] Omnidim error ${res.statusCode}:`, data);
            resolve({ error: data, statusCode: res.statusCode });
          }
        } catch {
          resolve({ raw: data });
        }
      });
    });

    // Never crash the emergency access route on call failure
    req.on('error', (err) => {
      console.error('[TriLock VoiceAI] Network error:', err.message);
      resolve({ error: err.message });
    });

    req.setTimeout(10000, () => {
      req.destroy();
      console.warn('[TriLock VoiceAI] Call timed out after 10s');
      resolve({ error: 'timeout' });
    });

    req.write(payload);
    req.end();
  });
}

module.exports = { notifyCitizenVoiceCall, getBudgetStatus };
