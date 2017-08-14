var dimensionsConstraint = require('./dimensionsConstraint');

function getFitDimensions(width, height, maxWidth, maxHeight) {
    return appendXOffset(
        appendYOffset(
            dimensionsConstraint(
                width, 
                height, 
                maxWidth, 
                maxHeight
            ),
            maxHeight
        ),
        maxWidth
    );
}

function appendXOffset(dimensions, maxWidth) {
    dimensions.xOffset = (maxWidth - dimensions.width)/2;

    return dimensions;
}

function appendYOffset(dimensions, maxHeight) {
    dimensions.yOffset = (maxHeight - dimensions.height)/2;

    return dimensions;
}

module.exports = getFitDimensions;