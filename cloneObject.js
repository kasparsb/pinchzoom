function cloneObject(obj) {
    var r = {};
    for (var name in obj) {
        if (obj.hasOwnProperty(name)) {
            r[name] = obj[name];
        }
    }
    return r;
}

module.exports = cloneObject