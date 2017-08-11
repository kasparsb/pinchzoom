var $ = require('jquery');
var Swipe = require('swipe');
var Stepper = require('stepper');
var checkImageLoaded = require('./checkImageLoaded');
var clone = require('./cloneObject');

var wrapCss = {
    position: 'absolute',
    left: 0,
    top: 0,
    right: 0,
    bottom: 0,
    overflow: 'hidden'
}

var scaleElCss = {
    transformOrigin: '0 0'
}

var stepper = new Stepper();

var zoomBezier = [0.445, 0.05, 0.55, 0.95], zoomAnimationDuration = 400;

/**
 * Ja el ir string, tad uzskatam, ka tas ir image
 */
function createPinchElement(el, doneCb) {
    
    checkImageLoaded($('<img />').attr('src', el), function($el, width, height){
        $el.css({
            maxWidth: '100%',
            height: 'auto',
            display: 'block'
        })

        doneCb($el)
    })

}

function createElements($pinchEl) {

    // wrap - ieņem visu container elementu

    var $scale = $('<div />').css(scaleElCss).append($pinchEl);
    var $translateXY = $('<div />').append($scale);
    var $wrap = $('<div />').css(wrapCss).append($translateXY);

    return {
        scale: $scale,
        translateXY: $translateXY,
        wrap: $wrap
    }
}

/**
 * Aprēķinām skaitlisko delta no vienas vērtības līdz otrai
 * @param number progress 0..1
 * @param number Skaitliskā vērtība no kuras sākam
 * @param number Skaitliskā vērtība līdz kurai jāiet
 */
function progressToDelta(progress, from, to) {
    return (to - from) * progress;
}

function progressToValue(progress, from, to) {
    return from + progressToDelta(progress, from, to)
}

function animateZoomTo(current, newScale, sourceX, sourceY, stateChangeCb) {
    stepper.run(zoomAnimationDuration, zoomBezier, function(p){
        if (newScale > 1) {
            stateChangeCb({
                scale: current.scale + progressToDelta(p, current.scale, newScale),
                x: -sourceX * progressToDelta(p, current.scale, newScale),
                y: -sourceY * progressToDelta(p, current.scale, newScale)
            })
        }
        else {
            stateChangeCb({
                scale: progressToValue(p, current.scale, newScale),
                x: progressToValue(p, current.x, current.baseX),
                y: progressToValue(p, current.y, current.baseY)
            })
        }

    }, function(){

    })
}

function animateXYTo(current, x, y, stateChangeCb) {
    stepper.run(150, zoomBezier, function(p){
        stateChangeCb({
            x: progressToValue(p, current.x, x),
            y: progressToValue(p, current.y, y)
        })
    }, function(){

    });
}

function setTransformScale($el, scale) {
    $el.css('transform', 'scale('+scale+')')
}

function setTransformXY($el, x, y) {
    $el.css('transform', 'translate('+x+'px,'+y+'px)')
}

function calcMoveOffsetValue(current, offset, width, containerWidth) {
    var brakeX = 0;
    if (current + offset > 0) {
        brakeX = (current + offset) / 1.9;
    }

    if (width + (current + offset) < containerWidth) {
        brakeX = -(containerWidth - (width + (current + offset))) / 1.9;
    }

    

    return (current + offset) - brakeX;
}

function createPinchzoom(pinchEl, pinchContainer) {

    var elements, current = {
        scale: 1, 
        // Tekošās x un y koordinātes
        x: 0, 
        y: 0, 
        // Bāzes x un y koordinātes, kuras tiek uzstādīta sākuma pazīcijai
        baseX: 0, 
        baseY: 0,

        getWidth: function(){
            return this.container.width * this.scale
        },
        getHeight: function(){
            return this.container.height * this.scale
        },

        container: {
            width: $(pinchContainer).width(),
            height: $(pinchContainer).height()
        }
    };

    createPinchElement(pinchEl, function($pinchEl){
        elements = createElements($pinchEl);

        elements.wrap.appendTo(pinchContainer)
    });

    var swipe = new Swipe(pinchContainer, {
        disablePinch: true, 
        alwaysPreventTouchStart: true, 
        direction: 'vertical horizontal'
    })
    
    swipe.on('doubletap', function(t){
        /**
         * @todo Vēl vajadzētu čekot Viewport scroll top
         */
        animateZoomTo(clone(current), current.scale > 1 ? 1 : 2, t.x, t.y, function(newState){
            current.scale = newState.scale;
            current.x = newState.x;
            current.y = newState.y;

            setTransformScale(elements.scale, current.scale);
            setTransformXY(elements.translateXY, current.x, current.y);
        })
    })

    swipe.on('move', function(t){

        setTransformXY(
            elements.translateXY, 
            calcMoveOffsetValue(current.x, t.offset.x, current.getWidth(), current.container.width), 
            calcMoveOffsetValue(current.y, t.offset.y, current.getHeight(), current.container.height)
        )

    })

    swipe.on('end', function(t){
        current.x = calcMoveOffsetValue(current.x, t.offset.x, current.getWidth(), current.container.width);
        current.y = calcMoveOffsetValue(current.y, t.offset.y, current.getHeight(), current.container.height);

        
        if (current.scale == 1) {
            animateXYTo(clone(current), current.baseX, current.baseY, function(newState){
                current.x = newState.x;
                current.y = newState.y;

                setTransformXY(elements.translateXY, current.x, current.y)
            });
        }
        else {
            animateXYTo(clone(current), current.x > 0 ? 0 : current.x, current.baseY > 0 ? 0 : current.baseY, function(newState){
                current.x = newState.x;
                current.y = newState.y;

                setTransformXY(elements.translateXY, current.x, current.y)
            });
        }
        
    })

    
    // return public API
    return {
        
    }
}


module.exports = createPinchzoom;