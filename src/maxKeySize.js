
const getKeysDimensions = (elem, n, aspect=0.5) => {
    /**** translation of maxKeySize.m, original provided courtesy of Prof Denis Pelli ****/
    let keyHeightPx;

    // key = aspect*keyHeightPx × keyHeightPx
    const widthPx = elem.clientWidth;
    const heightPx = elem.clientHeight;
    let screenArea=widthPx*heightPx

    keyHeightPx= (-1+Math.sqrt(1+4*n*heightPx/widthPx))/(2*n/widthPx);
    keyHeightPx = (-1+Math.sqrt(1+4*n*heightPx*aspect/widthPx))/(2*aspect*n/widthPx);

    console.log(`n=${n}, aspect=${aspect}, widthPx=${widthPx}, heightPx=${heightPx}`);
    console.log(`100% efficiency would require keyHightPx ${keyHeightPx.toFixed(1)}`);
    while (n > (Math.floor(heightPx/keyHeightPx - 1)*Math.floor(widthPx/(aspect*keyHeightPx)))){
        // Round size down so that screen is a multiple.
        const ss=[heightPx/Math.ceil(heightPx/keyHeightPx), widthPx/Math.ceil(widthPx/(aspect*keyHeightPx))];
        for (let i=0; i<=ss.length; i++) {
            // We’ve already rejected the current size, so only consider smaller sizes.
            // This guarantees that sizePx will decrease on every loop iteration.
            if (ss[i]>=keyHeightPx) ss[i]=0;
        }
        // We want the largest possible size so try the largest of the current options.
        keyHeightPx=Math.max(...ss);
    }

    // Compute efficiency as area covered by keys divided by screen area. 
    // First term for n keys. Second term is for Space and Return, which fully
    // occupy their row.
    const areaOfKeys=aspect*keyHeightPx*keyHeightPx*n + widthPx*keyHeightPx;
    screenArea=heightPx*widthPx;
    const numKeysHorizontally = Math.floor(widthPx/(aspect*keyHeightPx));
    const numKeysVertically = Math.floor(heightPx/keyHeightPx-1);
    const efficiency = 100*areaOfKeys/screenArea;
    console.log(`Best keyheightPx ${keyHeightPx} px. ${numKeysHorizontally} horizontally x ${numKeysVertically} vertically. Efficiency ${efficiency}`)

    return {keyHeightPx: keyHeightPx, cols: numKeysHorizontally, rows:numKeysVertically, widthPx: widthPx, heightPx: heightPx}
};

export const applyMaxKeySize = (numberOfKeys) => {
    const aspect = 1;
    const keysElem =  document.getElementById("keypad");
    const {keyHeightPx, cols, rows, widthPx, heightPx} = getKeysDimensions(keysElem, numberOfKeys, aspect);
    const keyElems = [...keysElem.getElementsByClassName("response-button")];
    const controlKeyElemsMask = keyElems.map(e => e.parentNode.id === "keypad-control-keys");
    const gridCoords = keyElems.filter((k,i) => !controlKeyElemsMask[i]).map((k,i) => [Math.floor(i/cols), i%cols]);
    const widthUsed = cols*(keyHeightPx*aspect);
    const heightUsed = rows*keyHeightPx + keyHeightPx;
    console.log("gridCords", gridCoords);
    const freeHeight = heightPx - heightUsed;
    const freeWidth = widthPx - widthUsed;
    const verticalMarginOffset = Math.floor(freeHeight/2);
    const horizontalMarginOffset = Math.floor(freeWidth/2);

    let j=0;
    keyElems.forEach((k,i) => {
        k.style.position = "fixed";
        const controlKey = controlKeyElemsMask[i];
        const height = `${keyHeightPx}px`;
        let top, left, width;
        if (controlKey) {
            top = (heightPx-keyHeightPx) - verticalMarginOffset + "px";
            left = (k.innerText.toLowerCase() === "space" ? 0 : widthPx/2 - horizontalMarginOffset) + horizontalMarginOffset + "px";
            width = `${(widthPx - horizontalMarginOffset*2)/2}px`;
        } else {
            width = keyHeightPx*aspect;
            const [y,x] = gridCoords[j];
            j += 1;
            console.log(`[x,y]: [${x},${y}]`);
            top = y*keyHeightPx + verticalMarginOffset + "px";
            left = `${x*width+horizontalMarginOffset}px`;
            width += "px";
        }
        console.log(`${k.id}, h: ${height}, w: ${width}, top: ${top}, left: ${left}`);
        k.style.width = width;
        k.style.height = height;
        k.style.top = top;
        k.style.left = left;
    });
    console.log("\n");
};