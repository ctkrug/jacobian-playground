import { describe, expect, it, vi } from 'vitest';
import { createSliderPanel } from './controls';

describe('createSliderPanel', () => {
  it('renders one range input per spec, initialized to its value', () => {
    const panel = createSliderPanel([
      { label: 'x0', min: -1, max: 1, step: 0.01, value: 0.5 },
      { label: 'x1', min: -1, max: 1, step: 0.01, value: -0.2 },
    ]);

    const inputs = panel.element.querySelectorAll('input[type="range"]');
    expect(inputs).toHaveLength(2);
    expect((inputs[0] as HTMLInputElement).value).toBe('0.5');
    expect((inputs[1] as HTMLInputElement).value).toBe('-0.2');
  });

  it('calls onChange handlers with the slider index and parsed value on input', () => {
    const panel = createSliderPanel([{ label: 'x0', min: -1, max: 1, step: 0.01, value: 0 }]);
    const handler = vi.fn();
    panel.onChange(handler);

    const input = panel.element.querySelector('input[type="range"]') as HTMLInputElement;
    input.value = '0.75';
    input.dispatchEvent(new Event('input'));

    expect(handler).toHaveBeenCalledWith(0, 0.75);
  });

  it('updates the live value readout as the slider changes', () => {
    const panel = createSliderPanel([{ label: 'x0', min: -1, max: 1, step: 0.01, value: 0 }]);
    const input = panel.element.querySelector('input[type="range"]') as HTMLInputElement;
    const readout = panel.element.querySelector('.slider-row__value') as HTMLElement;

    input.value = '0.33';
    input.dispatchEvent(new Event('input'));

    expect(readout.textContent).toBe('0.33');
  });
});
