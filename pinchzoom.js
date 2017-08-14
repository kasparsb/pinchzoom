var $ = require('jquery');
var Swipe = require('swipe');
var Stepper = require('stepper');
var checkImageLoaded = require('./checkImageLoaded');
var clone = require('./cloneObject');
var mergeTo = require('./mergeObjectTo');
var getFitDimensions = require('./getFitDimensions');

var defaultZoominScale = 5;

var stepper = new Stepper();

var zoomBezier = [0.445, 0.05, 0.55, 0.95], zoomAnimationDuration = 400;

/**
 * Ja el ir string, tad uzskatām, ka tas ir image
 */
function createPinchElement(el, doneCb) {
    //if (isImage(el)) {
        checkImageLoaded($('<img />').attr('src', el), function($el, width, height){
            
            doneCb($el.get(0), width, height)
        })    
    //}
}

function createElements(pinchElement) {

    var $scale = $('<div />').css({
        transformOrigin: '0 0'
    }).append(pinchElement);
    
    var $translateXY = $('<div />').append($scale);

    // wrap - ieņem visu container elementu
    var $wrap = $('<div />').css({
        position: 'absolute',
        left: 0,
        top: 0,
        right: 0,
        bottom: 0,
        overflow: 'hidden'
    }).append($translateXY);

    return {
        el: pinchElement,
        scale: $scale.get(0),
        translateXY: $translateXY.get(0),
        wrap: $wrap.get(0)
    }
}

function setPinchElementBaseDimensions(elements, current) {
    $(elements.el).css({
        width: current.pinchElement.width,
        height: current.pinchElement.height,
    })

    setTransformXY(elements.translateXY, current.baseX, current.baseY);
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
                x: (start.x + (start.x * progressToDelta(p, start.scale, newScale))) - (sourceX * progressToDelta(p, start.scale, newScale)),
                y: (start.y + (start.y * progressToDelta(p, start.scale, newScale))) - (sourceY * progressToDelta(p, start.scale, newScale))
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
    // Ja nav izmaiņu neko nedarām
    if (start.x == x && start.y == y) {
        return;
    }

    stepper.run(150, zoomBezier, function(p){
        stateChangeCb({
            x: progressToValue(p, start.x, x),
            y: progressToValue(p, start.y, y)
        })
    }, function(){

    });
}

function handleMove(current, offset, stateChangeCb) {
    stateChangeCb({
        x: fitinvalue(current.x, offset.x, current.getWidth(), 0, current.container.width, current.baseX, 0.84),
        y: fitinvalue(current.y, offset.y, current.getHeight(), 0, current.container.height, current.baseY, 0.84)
    })
}

function handleMoveEnd(current, stateChangeCb) {
    // Nostiprinām current xy koordinātes ar move koordinātēm
    current.x = current.move.x;
    current.y = current.move.y;
        
    animateXYTo(
        current, 
        constrain(current.x, current.getWidth(), 0, current.container.width, current.baseX),
        constrain(current.y, current.getHeight(), 0, current.container.height, current.baseY),
        stateChangeCb
    );
}

function setTransformScale(el, scale) {
    $(el).css('transform', 'scale('+scale+')')
}

function setTransformXY(el, x, y) {
    $(el).css('transform', 'translate('+x+'px,'+y+'px)')
}

/**
 * @todo Pārsaukt
 */
function constrain(value, width, min, max, minBase) {

    // Scenārijs, kad vērtība ietilpst ietilpst rāmjos
    if (width <= max) {
        
        if (value != minBase) {
            return minBase;
        }
        
    }
    else {
        if (value > min) {
            return min;
        }

        if (value + width < max) {
            return max - width;
        }
    }

    return value;
}

/**
 * @todo Pārsaukt
 * minBase tiek izmantots gadījumos, ja elements tiem centrēs 
 * container elementā un tas nepārsniedz container robežas
 */
function fitinvalue(value, valueOffset, width, min, max, minBase, elasticity, log) {

    var brake = 0;

    // Scenārijs, kad vērtība ietilpst ietilpst rāmjos
    if (width <= max) {
        min = Math.max(min, minBase);

        // Ejam uz pozitīvo pusi un uzsākot bijām negatīvajā. Ļaujam iziet no negatīvā nebremzējot
        if (value <= min && (value + valueOffset) > min) {
            brake = ((value + valueOffset) - min) * elasticity;
        }

        // Ejam uz negatīvo pusi un uzsākot bijām pozitīvajā, ļaujam iziet no pozitīvā nebmrezējot
        if (value >= min && (value + valueOffset) < min) {
            brake = ((value + valueOffset) - min) * elasticity;
        }

        // Ja esam negatīvajā un turpinām iet negatīvajā dziļāk, tad arī bremzējam
        if (value <= min && (value + valueOffset) < value) {
            brake = ((value + valueOffset) - value) * elasticity;
        }

        // Ja esam pozitīvajā un turpinām iet pozitīvajā dziļāk, tad arī bremzējam
        if (value >= min && (value + valueOffset) > value) {
            brake = ((value + valueOffset) - value) * elasticity;
        }
    }
    else {
        if (value <= min && (value + valueOffset) > min) {
            brake = ((value + valueOffset) - min) * elasticity;
        }

        // Sākām kā virs min un turpinām iet augstāk, tad bremzējam
        if (value > min && (value + valueOffset) > value) {
            brake = ((value + valueOffset) - value) * elasticity;
        }

        if ((value + width) >= max && ((value + valueOffset) + width) < max) {
            brake = ((value + valueOffset + width) - max) * elasticity;
        }

        // Sākām kā zem max un turpinām iet zemāk, tad bremzējam
        if ((value + width) < max && (value + valueOffset + width) < (value + width)) {
            brake = ((value + valueOffset + width) - (value + width)) * elasticity;
        }
    }

    return (value + valueOffset) - brake;
}

function toggleScale(scale) {
    return scale > 1 ? 1 : defaultZoominScale
}

function formatOffset(data) {
    return {
        x: data ? data.left : 0,
        y: data ? data.top : 0
    }
}

function getElementOffset(el) {
    return $(el).offset()
}

function getWidth(el) {
    return $(el).width()
}

function getHeight(el) {
    return $(el).height()
}

function createPinchzoom(pinchElement, pinchContainer) {

    var elements, current = {
        scale: 1, 
        // Tekošās x un y koordinātes
        x: 0, 
        y: 0, 
        // Move event vērtības. Move vērtības ir vēl neapstiprinātās
        move: {
            x: 0,
            y: 0
        },
        // Bāzes x un y koordinātes, kuras tiek uzstādīta sākuma pazīcijai
        baseX: 0, 
        baseY: 0,

        pinchElement: {
            width: 0,
            height: 0
        },

        getWidth: function(){
            return this.pinchElement.width * this.scale
        },
        getHeight: function(){
            return this.pinchElement.height * this.scale
        },

        container: {
            offset: formatOffset(undefined),
            width: 0,
            height: 0
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

    function applyNewMoveState(newState) {
        current.move = mergeTo(newState, current.move);

        setTransformXY(
            elements.translateXY, 
            current.move.x,
            current.move.y
        )
    }

    createPinchElement(pinchElement, function(pinchElement, width, height){
        
        elements = createElements(pinchElement);
        $(elements.wrap).appendTo(pinchContainer);

        current.container = {
            /**
             * @todo Vajag čekot offset izmaiņas. Ja container ir position:fixed, tad scroll.top ietekmē offset.y
             */
            offset: formatOffset(getElementOffset(pinchContainer)),
            width: getWidth(pinchContainer),
            height: getHeight(pinchContainer)
        }

        var d = getFitDimensions(
            width, 
            height, 
            current.container.width, 
            current.container.height
        )

        current.pinchElement.width = d.width;
        current.pinchElement.height = d.height;

        current.baseX = d.xOffset;
        current.baseY = d.yOffset;

        current.x = current.baseX;
        current.y = current.baseY;

        
        setPinchElementBaseDimensions(elements, current);
        
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
        handleMove(current, t.offset, applyNewMoveState);
    })

    swipe.on('end', function(t){
        
        if (0 && t.Swipe) {
            // Taisām kinetic movement tādā pašā virzienā kā notika kustība
            
            // Aprēķinām hipotenūzu
            var hipotenuza = Math.sqrt(Math.abs(t.offset.x*t.offset.x) + Math.abs(t.offset.y*t.offset.y));
            // Aprēķinām leņķi
            var angle = Math.abs(t.offset.y) / hipotenuza;

            var newh, newy, newx;
            stepper.run(150, [0.455, 0.03, 0.515, 0.955], function(p){
                
                // Jaunā hipotenūza
                newh = hipotenuza + (hipotenuza*2)*p;
                // Jaunais y
                newy = newh * angle;
                // Jaunais x
                newx = Math.sqrt(newh*newh - newy*newy);


                handleMove(current, {
                    x: t.offset.x < 0 ? -1*newx : newx,
                    y: t.offset.y < 0 ? -1*newy : newy
                }, applyNewMoveState);


            }, function(){
                handleMoveEnd(current, applyNewState);
            });

        }
        else {
            handleMoveEnd(current, applyNewState);
        }
    })

    
    // return public API
    return {
        
    }
}


module.exports = createPinchzoom;



/**
 * @todo
 * Image src set. Ielādēt scale atbilstošo attēla izmēru. Tas uzlabos move perfomanci
 * Pārsaukt fitinvalue funkciju
 * Pārsaukt constrain funkciju
 * Optimālas pozīcijas uzlikšana uz animateZoom
 * Kinetic move
 */