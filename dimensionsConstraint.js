/**
 * Constraint passed width and height. Remain dimensions ratio
 * @param number Width
 * @param number Height
 * @param number Max Width
 * @param number Max Height
 */
function dimensionsConstraint(w, h, maxWidth, maxHeight) {
    var ratio = w / h;

    if (w > maxWidth) {
        w = maxWidth;
        h = Math.round(w / ratio);
    }

    if (h > maxHeight) {
        h = maxHeight;
        w = Math.round(h * ratio);
    }

    return {
        width: w,
        height: h
    };
}

module.exports = dimensionsConstraint;