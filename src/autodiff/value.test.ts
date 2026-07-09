import { describe, expect, it } from 'vitest';
import { Value } from './value';

describe('Value autodiff engine', () => {
  it('computes d/dx and d/dy for x*y + x', () => {
    const x = new Value(3);
    const y = new Value(-4);
    const out = x.mul(y).add(x);
    out.backward();

    // d(xy + x)/dx = y + 1, d(xy + x)/dy = x
    expect(x.grad).toBeCloseTo(-4 + 1);
    expect(y.grad).toBeCloseTo(3);
    expect(out.data).toBeCloseTo(3 * -4 + 3);
  });

  it('matches the analytic derivative of pow', () => {
    const x = new Value(5);
    const out = x.pow(3);
    out.backward();

    // d(x^3)/dx = 3x^2
    expect(x.grad).toBeCloseTo(3 * 5 ** 2);
  });

  it('matches the analytic derivative of tanh', () => {
    const x = new Value(0.5);
    const out = x.tanh();
    out.backward();

    const t = Math.tanh(0.5);
    expect(x.grad).toBeCloseTo(1 - t * t);
  });

  it('matches the analytic derivative of relu on both sides of zero', () => {
    const positive = new Value(2);
    positive.relu().backward();
    expect(positive.grad).toBeCloseTo(1);

    const negative = new Value(-2);
    negative.relu().backward();
    expect(negative.grad).toBeCloseTo(0);
  });

  it('accumulates gradient when a value is reused multiple times', () => {
    const x = new Value(2);
    const out = x.add(x); // 2x
    out.backward();

    // d(2x)/dx = 2 — accumulation across both edges into x, not overwritten
    expect(x.grad).toBeCloseTo(2);
  });

  it('propagates gradient through a small chain (children resolved before parents)', () => {
    const a = new Value(2);
    const b = new Value(3);
    const c = a.mul(b); // 6
    const d = c.add(a); // 8
    const e = d.tanh();
    e.backward();

    const dTanh = 1 - Math.tanh(d.data) ** 2;
    // d(e)/dc = dTanh, d(e)/da = dTanh * (b + 1), d(e)/db = dTanh * a
    expect(c.grad).toBeCloseTo(dTanh);
    expect(a.grad).toBeCloseTo(dTanh * (3 + 1));
    expect(b.grad).toBeCloseTo(dTanh * 2);
  });

  it('matches the analytic derivative of sub and neg', () => {
    const x = new Value(5);
    const y = new Value(2);
    const out = x.sub(y); // x - y
    out.backward();

    // d(x - y)/dx = 1, d(x - y)/dy = -1
    expect(out.data).toBeCloseTo(3);
    expect(x.grad).toBeCloseTo(1);
    expect(y.grad).toBeCloseTo(-1);
  });

  it('matches the analytic derivative of div', () => {
    const x = new Value(6);
    const y = new Value(3);
    const out = x.div(y); // x / y
    out.backward();

    // d(x/y)/dx = 1/y, d(x/y)/dy = -x/y^2
    expect(out.data).toBeCloseTo(2);
    expect(x.grad).toBeCloseTo(1 / 3);
    expect(y.grad).toBeCloseTo(-6 / 9);
  });

  it('accepts a raw number as the other operand for every binary op', () => {
    const x = new Value(4);
    expect(x.add(1).data).toBeCloseTo(5);
    expect(x.mul(2).data).toBeCloseTo(8);
    expect(x.sub(1).data).toBeCloseTo(3);
    expect(x.div(2).data).toBeCloseTo(2);
  });

  it('zeroGrad resets this node and all of its ancestors', () => {
    const x = new Value(1);
    const out = x.mul(2);
    out.backward();
    expect(x.grad).not.toBe(0);

    out.zeroGrad();
    expect(x.grad).toBe(0);
    expect(out.grad).toBe(0);
  });

  it('zeroGrad visits a diamond-shaped graph node only once', () => {
    const x = new Value(2);
    const out = x.add(x); // x reachable via both operand slots of the same node
    out.backward();
    expect(x.grad).not.toBe(0);

    expect(() => out.zeroGrad()).not.toThrow();
    expect(x.grad).toBe(0);
  });
});
