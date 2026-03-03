/**** translation of maxKeySize.m, original provided courtesy of Prof Denis Pelli ****/
/**
 * Find dimensions for keypad keys that maximize space usage.
 *
 * @param {HTMLElement} elem - The keypad container element
 * @param {number} n - Number of alphabet keys
 * @param {number} aspect - Key aspect ratio (default: 0.5)
 * @returns {Object} Key dimensions including sizes and layout
 */
export const getKeysDimensions = (elem, n, aspect = 0.5) => {
  let keyHeightPx;

  // key = aspect*keyHeightPx × keyHeightPx
  const widthPx = elem.clientWidth;
  const heightPx = elem.clientHeight;
  let screenArea = widthPx * heightPx;

  keyHeightPx =
    (-1 + Math.sqrt(1 + (4 * n * heightPx) / widthPx)) / ((2 * n) / widthPx);
  keyHeightPx =
    (-1 + Math.sqrt(1 + (4 * n * heightPx * aspect) / widthPx)) /
    ((2 * aspect * n) / widthPx);

  while (
    n >
    Math.floor(heightPx / keyHeightPx - 1) *
      Math.floor(widthPx / (aspect * keyHeightPx))
  ) {
    // Round size down so that screen is a multiple.
    const ss = [
      heightPx / Math.ceil(heightPx / keyHeightPx),
      widthPx / Math.ceil(widthPx / (aspect * keyHeightPx)),
    ];
    for (let i = 0; i <= ss.length; i++) {
      // We've already rejected current size, so only consider smaller sizes.
      // This guarantees that sizePx will decrease on every loop iteration.
      if (ss[i] >= keyHeightPx) ss[i] = 0;
    }
    // We want largest possible size so try to use largest of current options.
    keyHeightPx = Math.max(...ss);
  }

  // Compute efficiency as area covered by keys divided by screen area.
  // First term for n keys. Second term is for Space and Return, which fully
  // occupy their row.
  const areaOfKeys =
    aspect * keyHeightPx * keyHeightPx * n + widthPx * keyHeightPx;
  screenArea = heightPx * widthPx;
  const numKeysHorizontally = Math.floor(widthPx / (aspect * keyHeightPx));
  const numKeysVertically = Math.floor(heightPx / keyHeightPx - 1);
  const efficiency = (100 * areaOfKeys) / screenArea;

  return {
    keyHeightPx: keyHeightPx,
    cols: numKeysHorizontally,
    rows: numKeysVertically,
    widthPx: widthPx,
    heightPx: heightPx,
  };
};

/**
 * Calculate font size for a button element.
 *
 * @param {HTMLElement} k - Button element
 * @param {number} width - Target width in pixels
 * @param {number} height - Target height in pixels
 * @param {boolean} enableWrap - Whether to enable text wrapping (default: true)
 * @returns {number} Font size in pixels
 */
const getLargeFontSize = (k, width, height, enableWrap = true) => {
  k.style.height = "auto";
  k.style.width = "auto";

  if (enableWrap) {
    // Enable line and word breaking
    k.style.whiteSpace = "pre-wrap";
    k.style.wordWrap = "break-word";
    k.style.wordBreak = "normal";
    k.style.overflow = "hidden";
  } else {
    k.style.whiteSpace = "nowrap";
    k.style.wordWrap = "normal";
    k.style.wordBreak = "normal";
  }

  // Binary search for largest font size
  let low = 1;
  let high = 200; // Maximum reasonable font size
  let bestFit = low;

  while (low <= high) {
    const mid = Math.round(Math.exp((Math.log(low) + Math.log(high)) / 2));
    k.style.fontSize = `${mid}px`;

    // Measure actual rendered size
    const rect = k.getBoundingClientRect();
    const fitsWidth = rect.width <= width;
    const fitsHeight = rect.height <= height;
    const isValid = rect.width > 0 && rect.height > 0;

    if (fitsWidth && fitsHeight && isValid) {
      bestFit = mid;
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }

  return bestFit;
};

/**
 * Binary-search for the largest font size (px) at which `text` fits within
 * the given pixel dimensions, allowing word-wrap.
 *
 * @param {string} text - The text to measure
 * @param {number} widthPx - Available width in pixels
 * @param {number} heightPx - Available height in pixels
 * @param {string} fontFamily - CSS font-family string
 * @param {number} lineHeight - CSS line-height (unitless multiplier, default 1.2)
 * @returns {number} Largest font size in whole pixels that fits
 */
export const getMaxPossibleFontSize = (text, widthPx, heightPx, fontFamily, lineHeight = 1.2, fontWeight = 'normal') => {
  const testDiv = document.createElement('div');
  testDiv.style.position = 'absolute';
  testDiv.style.visibility = 'hidden';
  testDiv.style.width = `${widthPx}px`;
  testDiv.style.fontFamily = fontFamily;
  testDiv.style.lineHeight = String(lineHeight);
  testDiv.style.fontWeight = fontWeight;
  testDiv.style.whiteSpace = 'pre-wrap';
  testDiv.style.wordWrap = 'break-word';
  testDiv.style.wordBreak = 'normal';
  testDiv.style.overflow = 'hidden';
  testDiv.style.padding = '0';
  testDiv.style.margin = '0';
  testDiv.textContent = text;
  document.body.appendChild(testDiv);

  let low = 1;
  let high = 200;
  let bestFit = low;

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    testDiv.style.fontSize = `${mid}px`;

    if (testDiv.scrollHeight <= heightPx && testDiv.scrollWidth <= Math.ceil(widthPx)) {
      bestFit = mid;
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }

  document.body.removeChild(testDiv);
  return bestFit;
};

/**
 * Find the largest shared font size for a set of buttons by trying n=1..4
 * virtual line-counts (effective width = clientWidth/n). Picks the n where
 * the minimum font size across all buttons is maximised, then applies that
 * font size and—when n>1—constrains the .response-button-label span width
 * so the browser's own text engine (including CJK) performs the line breaks.
 *
 * @param {HTMLElement[]} buttons - Buttons that must share one font size
 * @param {number} lineHeight - CSS line-height multiplier (default 1.15)
 */
export const getOptimalSharedFontSize = (buttons, lineHeight = 1.15) => {
  if (buttons.length === 0) return;

  let bestFontSize = 0;
  let bestN = 1;

  for (let n = 1; n <= 4; n++) {
    const sizes = buttons.map(b => {
      const label = b.querySelector('.response-button-label');
      const text = (label?.textContent ?? b.textContent) ?? '';
      const style = getComputedStyle(b);
      const labelStyle = label ? getComputedStyle(label) : null;
      const hPad = parseFloat(style.paddingLeft) + parseFloat(style.paddingRight)
        + (labelStyle ? parseFloat(labelStyle.paddingLeft) + parseFloat(labelStyle.paddingRight) : 0);
      const vPad = parseFloat(style.paddingTop) + parseFloat(style.paddingBottom)
        + (labelStyle ? parseFloat(labelStyle.paddingTop) + parseFloat(labelStyle.paddingBottom) : 0);
      return getMaxPossibleFontSize(
        text,
        (b.clientWidth - hPad) / n,
        b.clientHeight - vPad, // buttons have explicit height set by applyMaxKeySize
        style.fontFamily,
        lineHeight,
        style.fontWeight,
      );
    });
    const minSize = Math.min(...sizes);
    if (minSize > bestFontSize) {
      bestFontSize = minSize;
      bestN = n;
    }
  }

  // Capture widths before applying font (larger font would otherwise expand buttons)
  const preWidths = buttons.map(b => b.clientWidth);

  const applyFontSize = (size) => {
    buttons.forEach((b, i) => {
      b.style.width = `${preWidths[i]}px`;
      b.style.fontSize = `${size}px`;
      b.style.lineHeight = String(lineHeight);
      const label = b.querySelector('.response-button-label');
      if (label) {
        label.style.fontSize = `${size}px`;
        if (bestN > 1) {
          label.style.maxWidth = `${Math.floor(preWidths[i] / bestN)}px`;
          label.style.setProperty('text-wrap', 'balance');
        }
      }
    });
  };

  applyFontSize(bestFontSize);

  // Post-hoc: verify no label overflows in the actual DOM (handles sub-pixel/browser differences)
  while (bestFontSize > 1) {
    const overflows = buttons.some(b => {
      const label = b.querySelector('.response-button-label');
      return label && (label.scrollWidth > label.clientWidth || label.scrollHeight > label.clientHeight);
    });
    if (!overflows) break;
    bestFontSize -= 1;
    applyFontSize(bestFontSize);
  }
};

/**
 * Apply maximum key size to keypad.
 *
 * @param {number} numberOfKeys - Number of alphabet keys to display
 * @param {string} fontFamily - Font family to use (passed from keypad)
 */
export const applyMaxKeySize = (numberOfKeys, fontFamily = 'sans-serif') => {
  const aspect = 1;
  const margin = 5;
  const keysElem = document.getElementById("keypad");
  if (!keysElem) return;

  const { keyHeightPx, cols, rows, widthPx, heightPx } = getKeysDimensions(
    keysElem,
    numberOfKeys,
    aspect,
  );

  if (widthPx <= 0 || heightPx <= 0 || keyHeightPx <= margin) return;

  const keyElems = [...keysElem.getElementsByClassName("response-button")];
  const controlKeyElemsMask = keyElems.map(
    (e) => e.parentElement?.id === "keypad-control-keys",
  );
  const gridCoords = keyElems
    .filter((k, i) => !controlKeyElemsMask[i])
    .map((k, i) => [Math.floor(i / cols), i % cols]);
  const widthUsed = cols * (keyHeightPx * aspect);
  const heightUsed = rows * keyHeightPx + keyHeightPx;
  const freeHeight = heightPx - heightUsed;
  const freeWidth = widthPx - widthUsed;
  const verticalMarginOffset = Math.floor(freeHeight / 2);
  const horizontalMarginOffset = Math.floor(freeWidth / 2);

  const controlKeys = [];
  let keyFontSize;
  let j = 0;

  const numControlKeys = controlKeyElemsMask.filter((x) => x).length;

  keyElems.forEach((k, i) => {
    k.style.position = "fixed";
    const controlKey = controlKeyElemsMask[i];
    let top, left;

    if (controlKey) {
      const widthNum = (widthPx / numControlKeys) - margin;
      top = `${heightPx - keyHeightPx}px`;
      const m = margin * 0.5;
      left = `${m + controlKeys.length * (widthNum + margin)}px`;

      controlKeys.push(k);
      k.style.borderRadius = "25px";
      k.style.height = `${keyHeightPx - margin}px`;
      k.style.width = `${widthNum}px`;
    } else {
      const height = keyHeightPx - margin;
      const widthNum = height * aspect;
      const [y, x] = gridCoords[j];
      j += 1;
      top = `${y * height + (y + 1) * margin + verticalMarginOffset - margin / 2}px`;
      left = `${x * widthNum + (x + 1) * margin + horizontalMarginOffset - margin / 2}px`;

      if (keyFontSize === undefined) {
        keyFontSize = getLargeFontSize(k, widthNum, height);
      }
      k.style.height = `${height}px`;
      k.style.fontSize = `${height / 2}px`;
      k.style.width = `${widthNum}px`;
    }
    k.style.top = top;
    k.style.left = left;
    k.style.visibility = "visible";
  });

  // Calculate and apply optimal shared font size for control buttons
  if (controlKeys.length > 0) {
    getOptimalSharedFontSize(controlKeys);
  }
};
