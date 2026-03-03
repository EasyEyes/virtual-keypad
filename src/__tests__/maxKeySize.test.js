import { applyMaxKeySize } from '../maxKeySize';

describe('maxKeySize', () => {
  beforeEach(() => {
    // Setup DOM structure
    document.body.innerHTML = `
      <div id="keypad">
        <div id="keypad-keys">
          <div id="keypad-control-keys"></div>
        </div>
      </div>
    `;
  });

  test('applies same font size to control buttons with long labels', () => {
    // Add control buttons
    const controlKeys = ['SKIP BLOCK', 'VERY LONG LABEL THAT WRAPS', 'RETURN'];
    controlKeys.forEach((label) => {
      const btn = document.createElement('button');
      btn.className = 'response-button';
      btn.innerHTML = `<span class="response-button-label">${label}</span>`;
      document.getElementById('keypad-control-keys').appendChild(btn);
    });

    // Add regular keys
    for (let i = 0; i < 8; i++) {
      const btn = document.createElement('button');
      btn.className = 'response-button';
      btn.innerHTML = `<span class="response-button-label">${String.fromCharCode(65 + i)}</span>`;
      document.getElementById('keypad-keys').appendChild(btn);
    }

    // Apply font sizing
    applyMaxKeySize(8 + 3, 'sans-serif');

    // Check that control buttons have same font size
    const controlButtons = document.querySelectorAll('#keypad-control-keys .response-button');
    const firstFontSize = parseFloat(controlButtons[0].style.fontSize);

    controlButtons.forEach((btn) => {
      expect(parseFloat(btn.style.fontSize)).toBe(firstFontSize);
    });

    // Check that font size is reasonable
    expect(firstFontSize).toBeGreaterThan(8);
    expect(firstFontSize).toBeLessThan(50);
  });

  test('handles CJK characters in control button labels', () => {
    // Add control buttons
    const controlKeys = ['確認', '確認', '確認']; // Japanese/Chinese
    controlKeys.forEach((label) => {
      const btn = document.createElement('button');
      btn.className = 'response-button';
      btn.innerHTML = `<span class="response-button-label">${label}</span>`;
      document.getElementById('keypad-control-keys').appendChild(btn);
    });

    // Add regular keys
    for (let i = 0; i < 8; i++) {
      const btn = document.createElement('button');
      btn.className = 'response-button';
      btn.innerHTML = `<span class="response-button-label">${String.fromCharCode(65 + i)}</span>`;
      document.getElementById('keypad-keys').appendChild(btn);
    }

    // Apply font sizing
    applyMaxKeySize(8 + 3, 'sans-serif');

    const controlButtons = document.querySelectorAll('#keypad-control-keys .response-button');
    controlButtons.forEach((btn) => {
      const fontSize = parseFloat(btn.style.fontSize);
      expect(fontSize).toBeGreaterThan(10);
    });
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });
});
