/*  
  warning ugly code, still needs some cleaning ...

*/
var box = document.getElementById('lights');
box.setAttribute('style', 'box-shadow: 0px 0px 0px 50px #6C6E47, 105px  0px 0px 50px #686B42, 210px  0px 0px 50px #6E7146, 315px  0px 0px 50px #6F7244, 420px  0px 0px 50px #67683A');

var timer = setInterval(function () {
    chChange()
}, 80);

function chChange() {
    box.setAttribute('style', 'box-shadow: 0px 0px ' + getBlur() + 'px 50px ' + get_color() + ', 105px  0px ' + getBlur() + 'px 50px ' + get_color() + ', 210px  0px ' + getBlur() + 'px 50px ' + get_color() + ', 315px  0px ' + getBlur() + 'px 50px ' + get_color() + ', 420px  0px ' + getBlur() + 'px 50px ' + get_color());
};

function get_color() {
    pc = wheel(getBlur());
    var rgbColor = 'rgba(' + pc[0] + ',' + pc[1] + ',' + pc[2] + ',1)';
    return rgbColor;
};
var blur = 71,
    countUp = true;

function getBlur() {
    if (70 >= blur || blur >= 250) {
        countUp = !countUp;
    }
    blur += (countUp) ? 1 : -1;
    return blur;
};

function wheel(WheelPos) {
    if (WheelPos < 85) {
        return [Math.round(WheelPos * 3), Math.round(255 - WheelPos * 3), 0];
    } else if (WheelPos < 170) {
        WheelPos -= 85;
        return [Math.round(255 - WheelPos * 3), 0, Math.round(WheelPos * 3)];
    } else {
        WheelPos -= 170;
        return [0, Math.round(WheelPos * 3), Math.round(255 - WheelPos * 3)];
    }
}
/*  
  warning end of ugly code

*/