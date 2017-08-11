function getWidth($img) {
    return $img.get(0).width
}

function getHeight($img) {
    return $img.get(0).height
}

function checkIsLoaded($img, isLoadedCb) {
    if (getWidth($img) > 0 || getHeight($img) > 0) {
        isLoadedCb($img, getWidth($img), getHeight($img))
    }
    else {
        $img.on('load', (function($img, isLoadedCb){
            return function(){
                checkIsLoaded($img, isLoadedCb)
            }
        })($img, isLoadedCb))
    }
}

module.exports = checkIsLoaded;