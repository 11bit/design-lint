# Harness

What the tests need that a rule may not provide for itself. The contracts themselves live in
[`test/contracts/`](../contracts/README.md).

| File | Job |
| --- | --- |
| `options.js` | the stand-in for the load step: resolved design systems, token sets and per-rule options |
| `locations.test.js` | multi-line fixtures pinning where each rule points |

## Where the design system comes from

`test/fixtures/theme.css` is a probe surface, not a palette — it exists so prefix derivation
can ask Tailwind what it generates. `options.js` resolves a design system and token set from
it once, the most expensive thing the suite does, and hands them to rules under
`designSystem` and `tokens`, the same two keys the plugin binds at load. A rule whose
contract is written in token names the fixture does not have resolves **its own** design
system in `options.js` rather than widening the shared one, because widening moves every
other rule's verdicts: `danger-muted` is `no-undefined-token`'s example of an undefined token
and `no-spectral-color`'s example of a defined one.

## Locations

Every `caught` contract case asserts its message id and full span, but almost every case is
one line. `locations.test.js` holds a fixture per rule that a lazy rule could not satisfy:
full spans, nothing on line 1, violations on more than one line, several in one string. Every
rule must have one, and a test says so.
