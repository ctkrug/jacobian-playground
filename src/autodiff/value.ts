/**
 * A scalar node in a reverse-mode automatic differentiation graph.
 *
 * Every arithmetic operation on a Value returns a new Value that remembers
 * its parents and how to distribute an incoming gradient to them. Calling
 * `.backward()` on any node walks the graph in reverse topological order and
 * accumulates `.grad` on every ancestor — that accumulated `.grad` is exactly
 * the partial derivative of the node you called `.backward()` on with
 * respect to that ancestor. Rendering `.grad` across every neuron in a
 * network is what makes the Jacobian heatmap possible.
 */
export class Value {
  data: number;
  grad: number;
  readonly label: string;
  private readonly prev: Value[];
  private backwardStep: () => void;

  constructor(data: number, prev: Value[] = [], label = '') {
    this.data = data;
    this.grad = 0;
    this.prev = prev;
    this.label = label;
    this.backwardStep = () => {};
  }

  static of(x: Value | number): Value {
    return x instanceof Value ? x : new Value(x);
  }

  add(other: Value | number): Value {
    const b = Value.of(other);
    const out = new Value(this.data + b.data, [this, b], '+');
    out.backwardStep = () => {
      this.grad += out.grad;
      b.grad += out.grad;
    };
    return out;
  }

  mul(other: Value | number): Value {
    const b = Value.of(other);
    const out = new Value(this.data * b.data, [this, b], '*');
    out.backwardStep = () => {
      this.grad += b.data * out.grad;
      b.grad += this.data * out.grad;
    };
    return out;
  }

  pow(n: number): Value {
    const out = new Value(this.data ** n, [this], `**${n}`);
    out.backwardStep = () => {
      this.grad += n * this.data ** (n - 1) * out.grad;
    };
    return out;
  }

  neg(): Value {
    return this.mul(-1);
  }

  sub(other: Value | number): Value {
    return this.add(Value.of(other).neg());
  }

  div(other: Value | number): Value {
    return this.mul(Value.of(other).pow(-1));
  }

  tanh(): Value {
    const t = Math.tanh(this.data);
    const out = new Value(t, [this], 'tanh');
    out.backwardStep = () => {
      this.grad += (1 - t * t) * out.grad;
    };
    return out;
  }

  relu(): Value {
    const out = new Value(Math.max(0, this.data), [this], 'relu');
    out.backwardStep = () => {
      this.grad += (out.data > 0 ? 1 : 0) * out.grad;
    };
    return out;
  }

  /** Reset this node's gradient (and, transitively, its ancestors') to zero. */
  zeroGrad(): void {
    const visited = new Set<Value>();
    const walk = (v: Value): void => {
      if (visited.has(v)) return;
      visited.add(v);
      v.grad = 0;
      for (const p of v.prev) walk(p);
    };
    walk(this);
  }

  /** Backpropagate from this node: sets this.grad = 1 and fans gradients out to every ancestor. */
  backward(): void {
    const topo: Value[] = [];
    const visited = new Set<Value>();
    const buildTopo = (v: Value): void => {
      if (visited.has(v)) return;
      visited.add(v);
      for (const p of v.prev) buildTopo(p);
      topo.push(v);
    };
    buildTopo(this);

    this.grad = 1;
    for (let i = topo.length - 1; i >= 0; i -= 1) {
      topo[i].backwardStep();
    }
  }
}
