import { Value } from '../autodiff/value';

export type Activation = 'tanh' | 'relu' | 'linear';

function applyActivation(v: Value, activation: Activation): Value {
  if (activation === 'tanh') return v.tanh();
  if (activation === 'relu') return v.relu();
  return v;
}

export class Neuron {
  readonly weights: Value[];
  readonly bias: Value;
  readonly activation: Activation;

  constructor(numInputs: number, activation: Activation, rand: () => number = Math.random) {
    this.weights = Array.from({ length: numInputs }, () => new Value(rand() * 2 - 1));
    this.bias = new Value(0);
    this.activation = activation;
  }

  /** Returns the neuron's pre-activation sum and its post-activation output. */
  forward(inputs: Value[]): { pre: Value; post: Value } {
    let pre: Value = this.bias;
    inputs.forEach((x, i) => {
      pre = pre.add(x.mul(this.weights[i]));
    });
    return { pre, post: applyActivation(pre, this.activation) };
  }

  parameters(): Value[] {
    return [...this.weights, this.bias];
  }

  /** Reinitializes this neuron's weights in place, matching the constructor's draw order. */
  randomize(rand: () => number): void {
    this.weights.forEach((w) => {
      w.data = rand() * 2 - 1;
      w.grad = 0;
    });
    this.bias.data = 0;
    this.bias.grad = 0;
  }
}

export class Layer {
  readonly neurons: Neuron[];

  constructor(numInputs: number, numOutputs: number, activation: Activation, rand?: () => number) {
    this.neurons = Array.from({ length: numOutputs }, () => new Neuron(numInputs, activation, rand));
  }

  forward(inputs: Value[]): { pre: Value[]; post: Value[] } {
    const pre: Value[] = [];
    const post: Value[] = [];
    for (const neuron of this.neurons) {
      const result = neuron.forward(inputs);
      pre.push(result.pre);
      post.push(result.post);
    }
    return { pre, post };
  }

  parameters(): Value[] {
    return this.neurons.flatMap((n) => n.parameters());
  }

  randomize(rand: () => number): void {
    this.neurons.forEach((n) => n.randomize(rand));
  }
}

/** One forward pass through the network, keeping every intermediate Value alive for inspection. */
export interface ForwardTrace {
  inputs: Value[];
  /** Post-activation outputs of every hidden/output layer, in order. */
  layerActivations: Value[][];
  outputs: Value[];
}

export class MLP {
  readonly layers: Layer[];
  readonly numInputs: number;
  readonly layerSizes: number[];

  constructor(numInputs: number, layerSizes: number[], rand?: () => number) {
    this.numInputs = numInputs;
    this.layerSizes = layerSizes;
    const sizes = [numInputs, ...layerSizes];
    this.layers = layerSizes.map((numOutputs, i) => {
      const isOutputLayer = i === layerSizes.length - 1;
      return new Layer(sizes[i], numOutputs, isOutputLayer ? 'linear' : 'tanh', rand);
    });
  }

  forward(inputValues: number[]): ForwardTrace {
    if (inputValues.length !== this.numInputs) {
      throw new Error(`expected ${this.numInputs} inputs, got ${inputValues.length}`);
    }
    const inputs = inputValues.map((x) => new Value(x));
    let current = inputs;
    const layerActivations: Value[][] = [];
    for (const layer of this.layers) {
      const { post } = layer.forward(current);
      layerActivations.push(post);
      current = post;
    }
    return { inputs, layerActivations, outputs: current };
  }

  parameters(): Value[] {
    return this.layers.flatMap((l) => l.parameters());
  }

  /**
   * Reinitializes every weight in place, in the same layer/neuron/weight order the
   * constructor draws in — calling this with the same `rand` sequence used at
   * construction time reproduces the original weights exactly (used for "reset").
   */
  randomize(rand: () => number): void {
    this.layers.forEach((l) => l.randomize(rand));
  }
}
