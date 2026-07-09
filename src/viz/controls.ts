export interface SliderSpec {
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
}

export interface SliderPanel {
  element: HTMLElement;
  onChange(handler: (index: number, value: number) => void): void;
}

/** Builds a themed slider rail — one labeled range input per input neuron. */
export function createSliderPanel(specs: SliderSpec[]): SliderPanel {
  const container = document.createElement('div');
  const heading = document.createElement('h2');
  heading.textContent = 'Inputs';
  container.appendChild(heading);

  const listeners: Array<(index: number, value: number) => void> = [];

  specs.forEach((spec, index) => {
    const row = document.createElement('div');
    row.className = 'slider-row';

    const labelRow = document.createElement('div');
    labelRow.className = 'slider-row__label';
    const name = document.createElement('span');
    name.textContent = spec.label;
    const valueEl = document.createElement('span');
    valueEl.className = 'slider-row__value';
    valueEl.textContent = spec.value.toFixed(2);
    labelRow.append(name, valueEl);

    const input = document.createElement('input');
    input.type = 'range';
    input.min = String(spec.min);
    input.max = String(spec.max);
    input.step = String(spec.step);
    input.value = String(spec.value);
    input.setAttribute('aria-label', spec.label);

    input.addEventListener('input', () => {
      const value = Number(input.value);
      valueEl.textContent = value.toFixed(2);
      listeners.forEach((fn) => fn(index, value));
    });

    row.append(labelRow, input);
    container.appendChild(row);
  });

  return {
    element: container,
    onChange(handler) {
      listeners.push(handler);
    },
  };
}
