/**
*  StandardTicker implements video deep-tagging for a ucengine client
*  Inspired by the chat wigdet, and depending on the video player widget
*  depends :
*  * a player ucengine widget
*  * jquery.scrollto plugin
*  * underscore.js
*  * ucewidget.js
*  * jqueryUI
*
*  Copyright (C) 2011 CommOnEcoute,
*  maintained by Elias Showk <elias.showk@gmail.com>
*  source code at https://github.com/CommOnEcoute/ucengine-widgets
*   
*   StandardTicker widget is free software: you can redistribute it and/or modify
*   it under the terms of the GNU Affero General Public License as published by
*   the Free Software Foundation, either version 3 of the License, or
*   (at your option) any later version.
*
*   StandardTicker is distributed in the hope that it will be useful,
*   but WITHOUT ANY WARRANTY; without even the implied warranty of
*   MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
*   GNU Affero General Public License for more details.
*
*   You should have received a copy of the GNU Affero General Public License
*   along with the source code.  If not, see <http://www.gnu.org/licenses/>.
*/

(function($) {

if (typeof $.uce === 'undefined') { $.uce = {}; }
$.uce.StandardTicker = function(){};
$.uce.StandardTicker.prototype = {
    options: {
        ucemeeting: null,
        uceclient: null,
        player: null,
        updateInterval: 2000,
        icon: $("#videotickerplayicon"),
        manualScrollSettings: {
            duration: 1000
        },
        autoScrollSettings: { 
            duration : 500,
            easing: 'swing'
        }
    },
    /*
     * UCEngine events listening
     */
    meetingsEvents: {
		"internal.videotag.tickerpause": "pauseTicker",
		"internal.videotag.tickerplay": "playTicker"
    },
    /*
     * UI initialize
     */
    _create: function() {
        this.element.scrollTo("100%", 0);
        this.options.mouseover = false;
        this._updateLoop = null;
		this.playTicker();
        var that = this;
        this.element.parent().mouseenter(function() {
		    that.pauseTicker();
            that.options.mouseover = true; 
        });
        this.element.parent().mouseleave(function() {
            that.playTicker();
            that.options.mouseover = false;
        });
    },
    /* 
     * Public method to control manual scrolling
     */
    scrollToCurrentTime: function(currenttime) {
        this._scrollToCurrentTime(currenttime, this.options.manualScrollSettings);                     
    },
    /* 
     * Scrolls to the corresponding group of messages given a currenttime
     * Else finds the greatest message-currenttime that is lower than requested currenttime
     * Else does nothing, waits for next iteration
     */
    _scrollToCurrentTime: function(currenttime, settings) {
        if (typeof currenttime !== "number") {
            return;
        }
        currentmessages = this.element.find(".ui-videotag-message[currenttime="+currenttime.toString()+"]");
        this._currentMessageAnc = currentmessages.first();
        if(this._currentMessageAnc !== undefined && this._currentMessageAnc.length == 1) {
            this.element.scrollTo(this._currentMessageAnc,
                this._getScrollParams(settings, this._currentMessageAnc, currentmessages)); 
        } else {
            var messages = this.element.find(".ui-videotag-message");
            var maximum = messages.last();
            if (maximum.length===0) {
               return;
            }
            var previousMessages = $(messages.filter(function(){
                    return ($(this).data("currenttime") <= currenttime);
                }).get().reverse() ).each(function(){
                    maximum = ($(this).data("currenttime") > maximum.attr("currenttime")) ? $(this) : maximum;
                });
            if(maximum.data("currenttime") != this._currentMessageAnc.data("currenttime")) {
                this.element.scrollTo(maximum,
                    this._getScrollParams(settings, maximum, maximum)); 
            }
        }
    },
    /* 
     * Scroll params and functions
     */
    _getScrollParams: function(baseSettings, element, messages){
        var that = this;
        /*var offset = {};
        if (element.length==1){
            offset = { offset : {
                top: -this.element.height() +
                element.height() +
                parseInt(element.css("marginTop"), 10) +
                parseInt(element.css("borderTopWidth"), 10) +
                parseInt(this.element.css("paddingBottom"), 10) +
                parseInt(element.css("paddingBottom"), 10)
            }};
        }*/
        var step = {};
        if (messages.length > 0){
            step = { step: function(now, fx) {
                that.element.find(".ui-videotag-message").removeClass("ui-videotag-message-current");
                messages.addClass("ui-videotag-message-current");
            }};
        }
        return $.extend({}, baseSettings, step);
    },
    /* 
     * Event Handler and public method
     */
	playTicker: function(event) {
        this.options.icon.removeClass("ui-icon-pause");
        this.options.icon.addClass("ui-icon-play");
        if(this._updateLoop===null) {
            var that = this;
            this._updateLoop = window.setInterval(function(){
                that._updatePosition();
            }, that.options.updateInterval);
            return;
        }
	},
    /* 
     * Event Handler
     */
	pauseTicker: function(event) {
		this.options.icon.removeClass("ui-icon-play");
		this.options.icon.addClass("ui-icon-pause");
		window.clearInterval(this._updateLoop);
        this._updateLoop = null;
        if(event!==undefined && event.metadata.time !== undefined) {
            this.scrollToCurrentTime(event.metadata.time);
        }
	},
    /*
     * Scrolls messages on player's currentTime
    */
    _updatePosition: function() {
        if(this.options.mouseover === true ) {
            this.options.icon.removeClass("ui-icon-play");
            this.options.icon.addClass("ui-icon-pause");
            return;
        }
        var currentTime = this.options.player.uceplayer('getCurrentTime');
		if(currentTime == this.lastCurrentTime) {
			this.options.icon.removeClass("ui-icon-play");
			this.options.icon.addClass("ui-icon-pause");
            return;
		}
        this.options.icon.removeClass("ui-icon-pause");
        this.options.icon.addClass("ui-icon-play");
        this.lastCurrentTime=currentTime;
        this._scrollToCurrentTime(currentTime, this.options.autoScrollSettings);
    },
	_setOption: function(key, value) {
		$.Widget.prototype._setOption.apply(this, arguments);
	},
    clear: function() {
        this.element.empty();
    },

    destroy: function() {
        this.element.find('*').remove();
        $.Widget.prototype.destroy.apply(this, arguments); // default destroy
    }

};

if($.uce.widget!==undefined) {
    $.uce.widget("standardticker", new $.uce.StandardTicker());
}

})($);
