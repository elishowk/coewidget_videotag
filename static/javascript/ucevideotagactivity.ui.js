/**
*  ActivityBoard implements total activity display of a meeting
*  depends :
*  * underscore.js
*  * ucewidget.js
*  * jqueryUI
*
*  Copyright (C) 2011 CommOnEcoute,
*  maintained by Elias Showk <elias.showk@gmail.com>
*/

(function($) {

if (typeof $.uce === 'undefined') { $.uce = {}; }
$.uce.ActivityBoard = function(){};
$.uce.ActivityBoard.prototype = {
    options: {
        ucemeeting: null,
        uceclient: null,
        updateInterval: 2000,
        userSpan: $("#coecms-activity-board-users"),
        tagSpan: $("#coecms-activity-board-videotags")
    },

    /*
     * UCEngine events listening
     */
    meetingsEvents: {
        "videotag.message.new"      : "_handleMessage",
        "videotag.message.vote"     : "_handleVoteMessage",
        "videotag.message.delete"   : "_handleDeleteMessage",
        "videotag.message.owndelete": "_handleDeleteOwnMessage"
    },
    /*
     * UI initialize
     */
    _create: function() {
        this._updateLoop = null;
        /*this.element.data("totaluser", {});*/
        this.element.data("totalvideotag", {});
		var that = this;
        this._updateLoop = window.setInterval(function(){
            that._updateDisplay();
        }, that.options.updateInterval);
    },
    /*
     * Refresh data's display
     * Set on an interval
     */
    _updateDisplay: function() {
        /*var totaluser = _.keys(this.element.data("totaluser")).length;
        this.options.userSpan.html(totaluser.toString());*/
        var totalvideotag = _.keys(this.element.data("totalvideotag")).length;
        this.options.tagSpan.html(totalvideotag.toString());
    },
    /**
     * UCEngine Event callback
    */
    _handleMessage: function(event) {
        /*var totaluser = this.element.data("totaluser");
        if(totaluser[event.from]===undefined){
            totaluser[event.from]=1; 
        } else {
            totaluser[event.from]++; 
        }
        this.element.data("totaluser", totaluser);
	*/
        var totalvideotag = this.element.data("totalvideotag");
        if(totalvideotag[event.id]!==false){
            totalvideotag[event.id]=event.from; 
            this.element.data("totalvideotag", totalvideotag);
        }
    },

    /**
     * UCEngine Event callback
    */
    _handleVoteMessage: function(event) {
    },
    
    /**
     * UCEngine Event callback
    */
    _handleDeleteMessage: function(event) {
        var totalvideotag = this.element.data("totalvideotag");
        if(totalvideotag[event.metadata.parent]===undefined){
            totalvideotag[event.id]=false; 
            this.element.data("totalvideotag", totalvideotag);
        } else {
            var from = totalvideotag[event.metadata.parent];
            delete totalvideotag[event.metadata.parent];
            this.element.data("totalvideotag", totalvideotag);
            /*var totaluser = this.element.data("totaluser");
            if(totaluser[from]===undefined){
                totaluser[from]=-1; 
            } else {
                totaluser[from]--; 
            }
            if (totaluser[from] === 0) {
                delete totaluser[from];
            }
            this.element.data("totaluser", totaluser);*/
        }
    },

    /**
     * UCEngine Event callback
    */
    _handleDeleteOwnMessage: function(event) {
        this._handleDeleteMessage(event);
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
    $.uce.widget("activityboard", new $.uce.ActivityBoard());
}

})($);
