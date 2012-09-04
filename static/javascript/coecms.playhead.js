/**
*  PlayHead implements video message positionning, transforming, and sync scrolling
*  depends :
*  * ucewidgets.js
*  * uceplayer coengine widget
*  * underscore.js
*  * jqueryUI
*
*  Copyright (C) 2011 CommOnEcoute,
*  maintained by Elias Showk <elias.showk@gmail.com>
*/

$.uce.PlayHead = function(){};
$.uce.PlayHead.prototype = {
    options: {
        ucemeeting: null,
        uceclient: null,
        player: null,
        baseWidth: 200,
        default_interval: 1000
    },

    /*
     * ucengine events listening
     */
    meetingsEvents: {
    },
    /*
     * UI initialize
     * Positionning the playhead or ruler
     * Sets the containers height
     */
    _create: function() {
        var that = this;
        this._tickerLoop = window.setInterval(function(){that._ticker();}, this.options.default_interval);
    },
    /*
     * Scrolls the Play Head to the current video playback position
     */
    _ticker: function(){
        var currentTime = this.options.player.uceplayer('getCurrentTime');
        var duration = this.options.player.uceplayer('getDuration');
        var percent = 0;
        if (currentTime > 0 && duration > 0) {
            percent = (currentTime/duration)*100;
        }
        this.element.css({
            "left": this.options.baseWidth*(percent/100)
        }).text(this._formatTime(currentTime*1000));
    },

    destroy: function() {
        window.clearInterval(this._tickerLoop);
        this.element.find('*').remove();
        $.Widget.prototype.destroy.apply(this, arguments); // default destroy
    },
    resize: function() {
        this.options.baseWidth = $('#videoticker-timeline').width();
    },
    _formatTime: function(timestamp) {
        if(typeof timestamp !== "number") {
            return "00:00";
        }
        var neg = false;
        if (timestamp < 0) {
            timestamp *= -1;
            neg = true;
        }

        var date = new Date(timestamp);
        var hours = date.getHours() - 1;
        if (hours < 10) {
            hours = "0" + hours;
        }
        var minutes = date.getMinutes();
        if (minutes < 10) {
            minutes = "0" + minutes;
        }
        var seconds = date.getSeconds();
        if (seconds < 10) {
            seconds = "0" + seconds;
        }

        var valueText = minutes + ":" + seconds;
        if(hours !== "00") {
            valueText = hours + ":" + minutes + ":" + seconds;
        }
        if (neg) {
            valueText = "-" + valueText;
        }
        if(valueText.match(/NaN/i)) {
            return "00:00";
        }
        return (valueText);
    },

};
$.uce.widget("playhead", new $.uce.PlayHead());
