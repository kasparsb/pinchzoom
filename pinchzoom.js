var $ = require('jquery');
var Swipe = require('swipe');
var Stepper = require('stepper');
var checkImageLoaded = require('./checkImageLoaded');
var clone = require('./cloneObject');
var mergeTo = require('./mergeObjectTo');

var defaultZoominScale = 5;

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
 * Ja el ir string, tad uzskatām, ka tas ir image
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

function animateZoomTo(start, newScale, sourceX, sourceY, stateChangeCb) {
    stepper.run(zoomAnimationDuration, zoomBezier, function(p){

        if (newScale > 1) {
            stateChangeCb({
                scale: start.scale + progressToDelta(p, start.scale, newScale),
                x: -sourceX * progressToDelta(p, start.scale, newScale),
                y: -sourceY * progressToDelta(p, start.scale, newScale)
            })
        }
        else {
            stateChangeCb({
                scale: progressToValue(p, start.scale, newScale),
                x: progressToValue(p, start.x, start.baseX),
                y: progressToValue(p, start.y, start.baseY)
            })
        }

    }, function(){

    })
}

function animateXYTo(start, x, y, stateChangeCb) {
    stepper.run(150, zoomBezier, function(p){
        stateChangeCb({
            x: progressToValue(p, start.x, x),
            y: progressToValue(p, start.y, y)
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

/**
 * 
 */
function fitinvalue(value, valueOffset, width, min, max, log) {

    var brake = 0;

    // Scenārijs, kad vērtība ietilpst ietilpst rāmjos
    if (width <= max) {
        // Ejam uz pozitīvo pusi un uzsākot bijām negatīvajā. Ļaujam iziet no negatīvā nebremzējot
        if (value <= min && (value + valueOffset) > min) {
            brake = ((value + valueOffset) - min) * 0.84;
        }

        // Ejam uz pozitīvo pusi un uzsākot arī bijām pozitīvajā
        if (value >= min && (value + valueOffset) > min) {
            brake = ((value + valueOffset) - min) * 0.84;
        }


        // Ejam uz negatīvo pusi un uzsākot bijām pozitīvajā, ļaujam iziet no pozitīvā nebmrezējot
        if (value >= min && (value + valueOffset) < min) {
            brake = ((value + valueOffset) - min) * 0.84;
        }

        // Ja esam negatīvajā un turpinām iet negatīvajā dziļāk, tad arī bremzējam
        if (value <= min && (value + valueOffset) < value) {
            brake = ((value + valueOffset) - value) * 0.84;
        }

        // Ja esam pozitīvajā un turpinām iet pozitīvajā dziļāk, tad arī bremzējam
        if (value >= min && (value + valueOffset) > value) {
            brake = ((value + valueOffset) - value) * 0.84;
        }
        
    }
    else {
        if (value < min && (value + valueOffset) > min) {
            brake = ((value + valueOffset) - min) * 0.84;
        }

        // Sākām kā virs min un turpinām iet augstāk, tad bremzējam
        if (value > min && (value + valueOffset) > value) {
            brake = ((value + valueOffset) - value) * 0.84;
        }

        if ((value + width) >= max && ((value + valueOffset) + width) < max) {
            brake = ((value + valueOffset + width) - max) * 0.84;
        }

        // Sākām kā zem max un turpinām iet zemāk, tad bremzējam
        if ((value + width) < max && (value + valueOffset + width) < (value + width)) {
            brake = ((value + valueOffset + width) - (value + width)) * 0.84;
        }
    }

    return (value + valueOffset) - brake;
}

function toggleScale(scale) {
    return scale > 1 ? 1 : defaultZoominScale
}

function formatOffset(data) {
    return {
        x: data.left,
        y: data.top
    }
}

function getElementOffset(el) {
    return $(el).offset()
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

        pinchEl: {
            width: 0,
            height: 0
        },

        getWidth: function(){
            return this.pinchEl.width * this.scale
        },
        getHeight: function(){
            return this.pinchEl.height * this.scale
        },

        container: {
            /**
             * @todo Vajag čekot offset izmaiņas. Ja container ir position:fixed, tad scroll top ietekmē offset.y
             */
            offset: formatOffset(getElementOffset(pinchContainer)),
            width: $(pinchContainer).width(),
            height: $(pinchContainer).height()
        }
    };

    function applyNewState(newState) {
        newState = mergeTo(newState, current);

        if (newState.scale != current.scale) {
            setTransformScale(elements.scale, newState.scale);
        }

        if (newState.x != current.x || newState.y != current.y) {
            setTransformXY(elements.translateXY, newState.x, newState.y);
        }

        current = newState;
    }

    createPinchElement(pinchEl, function($pinchEl){
        elements = createElements($pinchEl);

        elements.wrap.appendTo(pinchContainer);


        current.pinchEl.width = $pinchEl.width();
        current.pinchEl.height = $pinchEl.height();
    });

    var swipe = new Swipe(pinchContainer, {
        disablePinch: true, 
        alwaysPreventTouchStart: true, 
        direction: 'vertical horizontal'
    })
    
    swipe.on('doubletap', function(t){
        animateZoomTo(current, toggleScale(current.scale), t.x - current.container.offset.x, t.y - current.container.offset.y, applyNewState)
    })

    swipe.on('move', function(t){
        //console.log('move', t.offset.y, current.y, t.offset.y+current.y, fitinvalue(current.y + t.offset.y, current.getHeight(), 0, current.container.height, true));

        console.log('move', current.x, current.y)

        setTransformXY(
            elements.translateXY, 
            fitinvalue(current.x, t.offset.x, current.getWidth(), 0, current.container.width),
            fitinvalue(current.y, t.offset.y, current.getHeight(), 0, current.container.height, true)
        )

    })

    swipe.on('end', function(t){
        
        current.x = fitinvalue(current.x, t.offset.x, current.getWidth(), 0, current.container.width);
        current.y = fitinvalue(current.y, t.offset.y, current.getHeight(), 0, current.container.height);

        
        // if (current.scale == 1) {
        //     animateXYTo(current, current.baseX, current.baseY, applyNewState);
        // }
        // else {


        //     var newX = current.x, newY = current.y;


        //     if (current.x > 0) {
        //         newX = 0;
        //     }
            
        //     if (current.y > 0) {
        //         newY = 0;
        //     }
            
        //     if (current.x + current.getWidth() < current.container.width) {
        //         newX = current.container.width - current.getWidth(); 
        //     }

        //     if (current.y + current.getHeight() < current.container.height) {
        //         newY = current.container.height - current.getHeight()
        //     }

        //     animateXYTo(current, newX, newY, applyNewState);
        // }
        
    })

    
    // return public API
    return {
        
    }
}


module.exports = createPinchzoom;