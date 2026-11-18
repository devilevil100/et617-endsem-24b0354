// Run: node test/checks.js — the fact check that guards agent replies.
const assert = require('assert');
const { soilClaim } = require('../api/agents.js');
assert.equal(soilClaim('Most of the mass comes from the soil.'), true);
assert.equal(soilClaim('You mentioned that most of the mass comes from the soil.'), false);
assert.equal(soilClaim('Most mass does not come from soil.'), false);
assert.equal(soilClaim('The main source is CO2, not soil.'), false);
console.log('checks pass');
