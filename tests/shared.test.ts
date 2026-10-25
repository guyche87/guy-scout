// Unit tests for the shared FM logic. Run: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PLAYER_ATTRS, POSITIONS, positionSummary, type PlayerAttrKey, type PositionKey } from '../shared/attributes.ts';
import { ROLES, ROLE_BY_ID } from '../shared/roles.ts';
import { computeRatings, roleRating, projectAttributes } from '../shared/ratings.ts';
import { personalityLabel } from '../shared/personality.ts';
import { coachingStars, staffRatings } from '../shared/staffRoles.ts';
import { STAFF_ATTRS, type StaffAttrKey } from '../shared/attributes.ts';
import { dayOfYearToIso, ageOn } from '../server/fm/dates.ts';

const attrs = (v: number) => Object.fromEntries(PLAYER_ATTRS.map(k => [k, v])) as Record<PlayerAttrKey, number>;
const positions = (on: Partial<Record<PositionKey, number>>) =>
  Object.fromEntries(POSITIONS.map(p => [p, on[p] ?? 1])) as Record<PositionKey, number>;

test('every role uses known attributes and positions, with unique ids', () => {
  const ids = new Set<string>();
  for (const r of ROLES) {
    assert.ok(!ids.has(r.id), `duplicate role ${r.id}`);
    ids.add(r.id);
    for (const a of [...r.key, ...r.preferred]) assert.ok(PLAYER_ATTRS.includes(a), `${r.id}: ${a}`);
    for (const p of r.positions) assert.ok(POSITIONS.includes(p), `${r.id}: ${p}`);
    assert.equal(new Set([...r.key, ...r.preferred]).size, r.key.length + r.preferred.length, `${r.id} repeats an attribute`);
  }
});

test('role rating is 100 for all-20 and 50 for all-10', () => {
  assert.equal(roleRating(attrs(20), ROLE_BY_ID['AF-A']), 100);
  assert.equal(roleRating(attrs(10), ROLE_BY_ID['AF-A']), 50);
});

test('best role respects position familiarity', () => {
  const a = attrs(10);
  a.finishing = a.composure = a.offTheBall = a.anticipation = 18;
  const r = computeRatings(a, positions({ ST: 20 }));
  assert.equal(ROLE_BY_ID[r.bestRole.id].positions.includes('ST'), true);
  assert.equal(r.bestPosition, 'ST');
  assert.equal(r.positionText, 'ST');
});

test('position summary groups sides like FM', () => {
  assert.equal(positionSummary(positions({ DR: 18, DC: 16, DM: 15 })), 'D (RC), DM');
  assert.equal(positionSummary(positions({ AML: 20, AMR: 15, ST: 15 })), 'AM (RL), ST');
});

test('projection never lowers attributes or exceeds 20', () => {
  const base = attrs(12);
  const proj = projectAttributes({ attrs: base, ca: 100, pa: 170, age: 18 });
  for (const k of PLAYER_ATTRS) {
    assert.ok(proj[k] >= base[k], k);
    assert.ok(proj[k] <= 20, k);
  }
});

test('personality labels', () => {
  const p = { adaptability: 10, ambition: 10, loyalty: 10, pressure: 10, professionalism: 20, sportsmanship: 10, temperament: 12, controversy: 5 };
  assert.equal(personalityLabel(p, 12), 'Model Professional');
  assert.equal(personalityLabel({ ...p, professionalism: 10 }, 10), 'Balanced');
  assert.equal(personalityLabel({ ...p, professionalism: 10 }, 20), 'Driven');
});

test('staff ratings and coaching stars stay in range', () => {
  const a = Object.fromEntries(STAFF_ATTRS.map(k => [k, 20])) as Record<StaffAttrKey, number>;
  const { ratings } = staffRatings(a);
  for (const v of Object.values(ratings)) assert.equal(v, 100);
  for (const v of Object.values(coachingStars(a))) assert.equal(v, 5);
});

test('FM dates are 1-based day of year', () => {
  assert.equal(dayOfYearToIso(1990, 4), '1990-01-04'); // Toni Kroos
  assert.equal(dayOfYearToIso(2027, 181), '2027-06-30');
  assert.equal(dayOfYearToIso(1900, 0), null);
  assert.equal(ageOn('1990-01-04', '2027-01-03'), 36);
  assert.equal(ageOn('1990-01-04', '2027-01-04'), 37);
});

// --- FM .slf shortlist format ---
import { parseSlf, writeSlf, DEFAULT_FM_BUILD } from '../server/fm/slf.ts';

test('.slf round-trips name, build and uids byte-for-byte', () => {
  const slf = { name: 'My Targets', buildId: DEFAULT_FM_BUILD, uids: [2002081477, 156772, 1120] };
  const buf = writeSlf(slf);
  const back = parseSlf(buf);
  assert.deepEqual(back, slf);
  // re-serialising the parsed form is identical
  assert.ok(buf.equals(writeSlf(back)));
});

test('.slf rejects non-slf data', () => {
  assert.throws(() => parseSlf(Buffer.from([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17])));
});

test('.slf header matches the Genie Scout layout', () => {
  const buf = writeSlf({ name: 'x', buildId: 0x2bb3c8, uids: [1] });
  assert.equal(buf[0], 0x03);
  assert.equal(buf[1], 0x01);
  assert.equal(buf.toString('latin1', 2, 6), 'fls.');
  assert.deepEqual([...buf.subarray(6, 9)], [0x02, 0x00, 0x01]);
  assert.equal(buf.readUInt32LE(9), 0x2bb3c8);
});
