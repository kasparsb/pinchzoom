var clone  = require('./cloneObject');

/**
 * Merge sourceObj properties to targetObj
 * New object is created
 */
function mergeObjectTo(sourceObj, targetObj) {
    var r = clone(targetObj);
    
    for (var i in sourceObj) {
        if (sourceObj.hasOwnProperty(i)) {
            r[i] = sourceObj[i]
        }
    }

    return r;
}

module.exports = mergeObjectTo