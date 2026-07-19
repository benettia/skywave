// logbook: honesty rule threshold, zulu clock, entry shape, table rows,
// DX-log text, seed-in-hash. exact strings pinned — a log is a document.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { NAMES, claimId, zulu, zdate, esc, makeEntry, tableHtml, exportText, parseSeed }
  from '../src/logbook.js';

const D1 = new Date('2026-07-19T04:07:00Z'), D2 = new Date('2026-07-19T05:02:30Z');

test('honesty rule: id only above the pinned threshold, else unid', () => {
  const st = { ty: 'n', jam: false };
  assert.equal(claimId(st, .181), 'numbers stn');
  assert.equal(claimId(st, .18), 'unid');   // at threshold is not honest enough
  assert.equal(claimId(st, 0), 'unid');
  assert.equal(claimId(null, 1), 'unid');   // dead air claims nothing
});

test('a jammed numbers station is claimed with its jammer', () => {
  assert.equal(claimId({ ty: 'n', jam: true }, .5), 'numbers stn + jammer');
  assert.equal(claimId({ ty: 'n', jam: true }, .1), 'unid');
});

test('every station type has a log name', () => {
  assert.deepEqual(Object.keys(NAMES).sort(), ['c', 'm', 'n', 'r']);
  for (const ty of 'nmrc') assert.equal(claimId({ ty }, .5), NAMES[ty]);
});

test('zulu: zero-padded HHMMz in UTC, clean across midnight', () => {
  assert.equal(zulu(D1), '0407z');
  assert.equal(zulu(new Date('2026-07-19T23:59:59Z')), '2359z');
  assert.equal(zulu(new Date('2026-07-20T00:00:00Z')), '0000z');
});

test('zdate: UTC date, flips exactly at 0000z', () => {
  assert.equal(zdate(new Date('2026-07-19T23:59:59Z')), '2026-07-19');
  assert.equal(zdate(new Date('2026-07-20T00:00:01Z')), '2026-07-20');
});

test('entry: MHz fixed at 4 decimals, note trimmed', () => {
  assert.deepEqual(makeEntry(7100, D1, 'unid', '  faint carrier '),
    { d: '2026-07-19', z: '0407z', f: '7.1000', id: 'unid', note: 'faint carrier' });
  assert.equal(makeEntry(29850.1, D1, 'unid', '').f, '29.8501');
  assert.equal(makeEntry(3050, D1, 'unid', '').f, '3.0500');
});

test('esc: the three html metacharacters, nothing else touched', () => {
  assert.equal(esc('<b>&"\'x'), '&lt;b&gt;&amp;"\'x');
  assert.equal(esc('plain 73'), 'plain 73');
});

test('table rows: newest first, notes escaped, markup pinned', () => {
  const logs = [makeEntry(7100, D1, 'unid', 'first'),
    makeEntry(9200, D2, 'broadcast', '<script>')];
  assert.equal(tableHtml(logs),
    '<tr><td>0502z</td><td>9.2000 MHz</td><td>broadcast</td><td>&lt;script&gt;</td></tr>'
    + '<tr><td>0407z</td><td>7.1000 MHz</td><td>unid</td><td>first</td></tr>');
  assert.equal(tableHtml([]), '');
});

test('DX-log text pinned byte-exact: net header, oldest first, empty note dropped', () => {
  const logs = [makeEntry(7100, D1, 'morse beacon', 'VVV DE K4XQ'),
    makeEntry(9200, D2, 'unid', '')];
  assert.equal(exportText(logs, 123456),
    'SKYWAVE SW-1 DX LOG — NET 123456\n\n'
    + '2026-07-19 0407z 7.1000 MHz — morse beacon, VVV DE K4XQ\n'
    + '2026-07-19 0502z 9.2000 MHz — unid\n');
});

test('seed in hash: #s=digits round-trips, anything else is null', () => {
  assert.equal(parseSeed('#s=123456'), 123456);
  assert.equal(parseSeed('#s=007'), 7);
  assert.equal(parseSeed('#x=9&s=42'), 42);
  assert.equal(parseSeed(''), null);
  assert.equal(parseSeed('#salad'), null);
  assert.equal(parseSeed('#s=abc'), null);
  const seed = 987654321;
  assert.equal(parseSeed('#s=' + seed), seed);
});
