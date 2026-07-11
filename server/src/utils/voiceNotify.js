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
 *
 * API Reference: POST https://backend.omnidim.io/api/v1/calls/dispatch
 */

const https = require('https');

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

  // --- LIVE MODE — Omnidim Dispatch API ---
  // call_context key-value pairs are passed to the agent during the call.
  // Reference them inside your Omnidim agent's conversational flow.
  const payload = JSON.stringify({
    agent_id: agentId,
    to_number: phoneNumber,
    call_context: {
      citizen_name: citizenName,
      case_number:  caseNumber,
      officer_name: officerName,
      department:   department || 'Law Enforcement',
      duration:     String(duration)
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
            console.log(`[TriLock VoiceAI] ✓ Call dispatched to ${phoneNumber} | Call ID: ${parsed.call_id || parsed.id || 'N/A'}`);
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

module.exports = { notifyCitizenVoiceCall };
