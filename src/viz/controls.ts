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

export interface OutputSelector {
  element: HTMLElement;
  onChange(handler: (index: number) => void): void;
}

/** Builds a themed dropdown listing every output neuron to backprop from. */
export function createOutputSelector(labels: string[], selectedIndex: number): OutputSelector {
  const container = document.createElement('div');
  container.className = 'output-selector';

  const heading = document.createElement('h2');
  heading.textContent = 'Backprop target';
  container.appendChild(heading);

  const select = document.createElement('select');
  select.className = 'output-selector__select';
  select.setAttribute('aria-label', 'Output neuron to backpropagate from');

  labels.forEach((label, index) => {
    const option = document.createElement('option');
    option.value = String(index);
    option.textContent = label;
    option.selected = index === selectedIndex;
    select.appendChild(option);
  });

  const listeners: Array<(index: number) => void> = [];
  select.addEventListener('change', () => {
    listeners.forEach((fn) => fn(Number(select.value)));
  });

  container.appendChild(select);

  return {
    element: container,
    onChange(handler) {
      listeners.push(handler);
    },
  };
}

export interface ActionButtonSpec {
  id: string;
  label: string;
}

export interface ActionButtons {
  element: HTMLElement;
  onClick(handler: (id: string) => void): void;
}

/** Builds a themed row of action buttons (e.g. randomize/reset weights). */
export function createActionButtons(specs: ActionButtonSpec[]): ActionButtons {
  const container = document.createElement('div');
  container.className = 'action-buttons';

  const listeners: Array<(id: string) => void> = [];

  specs.forEach((spec) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'action-buttons__button';
    button.textContent = spec.label;
    button.addEventListener('click', () => {
      listeners.forEach((fn) => fn(spec.id));
    });
    container.appendChild(button);
  });

  return {
    element: container,
    onClick(handler) {
      listeners.push(handler);
    },
  };
}
