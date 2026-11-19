// Standalone regression test for the order-level fulfillment rollup.
//
// This repo has no bundler for the web screens (they're loaded as plain
// global scripts via in-browser Babel — see Clorivo.html), so
// computeOrderFulfillmentStatus() can't be `import`ed directly here.
// The implementation below is a deliberate, exact copy of the function
// in supabase-client.jsx — if you change one, change both, and re-run
// this file. It is also cross-checked against the equivalent SQL CASE
// expression in supabase/phase5_shipping_migration.sql
// (order_fulfillment_summary) via a parallel query; see that file's
// "FULFILLMENT STATUS" comment for the documented business rule this
// encodes.
//
// Run: node tests/unit/rollup-status.test.mjs

function computeOrderFulfillmentStatus(shipments) {
  if (!shipments || shipments.length === 0) return 'awaiting_shipment';
  const all = shipments.length;
  const cancelled = shipments.filter(s => s.status === 'cancelled').length;
  const delivered = shipments.filter(s => s.status === 'delivered').length;
  const nonCancelled = all - cancelled;
  if (cancelled === all) return 'cancelled';
  if (shipments.some(s => s.status === 'failed' || s.status === 'returned')) return 'delivery_exception';
  if (delivered > 0 && delivered === nonCancelled) return 'delivered';
  if (shipments.some(s => s.status === 'shipped' || s.status === 'in_transit')) return 'partially_shipped';
  if (shipments.some(s => s.status === 'processing')) return 'processing';
  return 'pending';
}

const cases = [
  { name: 'no_shipments',         statuses: [],                       expect: 'awaiting_shipment' },
  { name: 'cancelled_only',       statuses: ['cancelled', 'cancelled'], expect: 'cancelled' },
  { name: 'returned_only',        statuses: ['returned'],              expect: 'delivery_exception' },
  { name: 'failed_only',          statuses: ['failed'],                expect: 'delivery_exception' },
  { name: 'failed_delivered',     statuses: ['failed', 'delivered'],   expect: 'delivery_exception' },
  { name: 'cancelled_delivered',  statuses: ['cancelled', 'delivered'], expect: 'delivered' },
  { name: 'delivered_pending',    statuses: ['delivered', 'pending'],  expect: 'pending' },
  { name: 'all_delivered',        statuses: ['delivered', 'delivered'], expect: 'delivered' },
  { name: 'cancelled_returned',   statuses: ['cancelled', 'returned'], expect: 'delivery_exception' },
  { name: 'cancelled_pending',    statuses: ['cancelled', 'pending'],  expect: 'pending' },
  { name: 'delivered_returned',   statuses: ['delivered', 'returned'], expect: 'delivery_exception' },
  { name: 'all_pending',          statuses: ['pending', 'pending'],    expect: 'pending' },
  { name: 'shipped_pending',      statuses: ['shipped', 'pending'],    expect: 'partially_shipped' },
  { name: 'in_transit_pending',   statuses: ['in_transit', 'pending'], expect: 'partially_shipped' },
  { name: 'processing_pending',   statuses: ['processing', 'pending'], expect: 'processing' },
  { name: 'single_delivered',     statuses: ['delivered'],             expect: 'delivered' },
  { name: 'single_cancelled',     statuses: ['cancelled'],             expect: 'cancelled' },
];

let failures = 0;
for (const { name, statuses, expect } of cases) {
  const got = computeOrderFulfillmentStatus(statuses.map(s => ({ status: s })));
  const pass = got === expect;
  if (!pass) failures++;
  console.log(`${pass ? 'PASS' : 'FAIL'}: ${name} -> got '${got}', expected '${expect}'`);
}

console.log(failures === 0 ? `\nALL ${cases.length} PASS` : `\n${failures}/${cases.length} FAILURES`);
process.exit(failures === 0 ? 0 : 1);
