const getKeysDimensions = (elem, n, aspect = 0.5) => {
  /**** translation of maxKeySize.m, original provided courtesy of Prof Denis Pelli ****/
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
      // We’ve already rejected the current size, so only consider smaller sizes.
      // This guarantees that sizePx will decrease on every loop iteration.
      if (ss[i] >= keyHeightPx) ss[i] = 0;
    }
    // We want the largest possible size so try the largest of the current options.
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

export const applyMaxKeySize = (numberOfKeys) => {
  const aspect = 1;
  let margin = 5;
  const keysElem = document.getElementById("keypad");
  const { keyHeightPx, cols, rows, widthPx, heightPx } = getKeysDimensions(
    keysElem,
    numberOfKeys,
    aspect,
  );

  const keyElems = [...keysElem.getElementsByClassName("response-button")];
  const controlKeyElemsMask = keyElems.map(
    (e) => e.parentNode.id === "keypad-control-keys",
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
  let controlKeyFontSize = Infinity;
  let keyFontSize;
  let j = 0;
  
  const numControlKeys = controlKeyElemsMask.filter(x => x).length;

  keyElems.forEach((k, i) => {
    k.style.position = "fixed";
    const controlKey = controlKeyElemsMask[i];
    let top, left, width;
    if (controlKey) {
      top = heightPx - keyHeightPx;
      width = (widthPx / numControlKeys) - margin;
      const m = margin * 0.5;
      const controlKeyIndex = controlKeys.length;
      left = m + controlKeyIndex * (width + margin);

      const f = getLargeFontSize(k, width, keyHeightPx - margin);
      controlKeyFontSize = Math.min(f, controlKeyFontSize);
      controlKeys.push(k);
      k.style.borderRadius = "25px";
      k.style.height = keyHeightPx - margin + "px";
    } else {
      const height = keyHeightPx - margin;
      width = height * aspect;
      const [y, x] = gridCoords[j];
      j += 1;
      top = y * height + (y + 1) * margin + verticalMarginOffset - margin / 2;
      left = x * width + (x + 1) * margin + horizontalMarginOffset - margin / 2;
      if (!keyFontSize) {
        keyFontSize = getLargeFontSize(k, width, height);
      }
      k.style.height = height + "px";
      k.style.fontSize = height / 2 + "px";
    }
    k.style.width = width + "px";
    k.style.top = top + "px";
    k.style.left = left + "px";
    k.style.visibility = "visible";
  });
  // Set the control keys to the same size, the smaller of the two
  controlKeys.forEach((k) => (k.style.fontSize = controlKeyFontSize + "px"));
};

const getLargeFontSize = (k, width, height) => {
  k.style.height = "auto";
  k.style.width = "auto";
  k.style.whiteSpace = "nowrap";

  // Set to a nominal font size, s
  const s = 20;
  k.style.fontSize = s + "px";
  // Measure width of elem, w
  const w = k.getBoundingClientRect().width;
  const h = k.getBoundingClientRect().height;
  const rW = 1 / (w / width);
  const rH = 1 / (h / height);
  const r = Math.min(rW, rH);
  // Set font size to s*r
  const f = Math.floor(s * r);
  return f;
};
