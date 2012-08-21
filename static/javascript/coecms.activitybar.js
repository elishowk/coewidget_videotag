/**
*  ActivityBar implements videotag activity timeline visualization
*  depends on :
*  * one UCE player widget
*  * ucewidget.js
*  * underscore.js
*  * jquery UI
*
*  Copyright (C) 2011 CommOnEcoute,
*/

$.uce.ActivityBar = function(){};
$.uce.ActivityBar.prototype = {
    options: {
        ucemeeting: null,
        uceclient: null,
        player: null,
        bins: 20,
        speakers : [],
        class_default: "comment",
        class_personality: "personality-comment",
        class_self: "user-comment",
        mouseoutdelay: 1000,
        mouseindelay: 1000,
        eventTimeIndex: {},
        eventUserIndex: {},
        duration: null
    },

    /*
     * coengine events listening
     */
    meetingsEvents: {
        "videotag.message.new"          :   "_handleNewComment",
        "videotag.message.vote"         :   "_handleVote",
        "videotag.message.delete"       :   "_handleDeleteComment",
        "videotag.message.owndelete"    :   "_handleDeleteOwnComment"
/*        "pseudolivemanager.live.open"    : "_handleOpen",
        "pseudolivemanager.live.close"   : "_handleClose",
        "livemanager.live.open"          : "_handleOpen",
        "livemanager.live.close"         : "_handleClose"
*/
    },
    /*
     * UI initialize
     */
    _create: function() {
        window.mouseOverHistogramBar = 0;
        window.lastMouseOverHistogram = null;
        window.lastMouseOutHistogram = null;
        this.options.eventTimeIndex = {};
        this.options.eventUserIndex = {};
        this._injectQueue = [];
        this._removeQueue = [];
        this._deferred = $.Deferred();
        var that = this;
        this._updateLoop = window.setInterval(function(){
            that._resolveDeferred();
        }, 2000);
        this._setTimers();
        this._setHovers();
        $(window).resize(function(){ that._setHovers(); });
    },
    _setTimers: function() {
        var duration = this.options.player.data('uceplayer').getDuration();
        var that = this;
        if(typeof duration !== "number" || duration <= 0) {
            window.setTimeout(function(){ that._setTimers(); }, 500);
            return;
        }
        this.options.duration = duration;
        var binsDuration = Math.ceil(duration / this.options.bins);
        this.element.find('span').each(function(i){
            if(typeof binsDuration !== "number") {
                return;
            }
            $(this).attr('data-timer', that._format(Math.round(binsDuration * i * 1000)));
            $(this).attr('data-currenttime', Math.round(binsDuration * i));
            $(this).attr('title', "click to play video at "+
                Math.round(binsDuration * i).timetoHours().toString());
            $(this).on("mouseover", function() {
                    window.mouseOverHistogramBar = 1;
                    if (window.lastMouseOverHistogram!==null) {
                        window.clearTimeout(window.lastMouseOverHistogram);
                        window.lastMouseOverHistogram=null;
                    }
                    var jumpToBarTimer = _.throttle( function(ucemeeting, bar){
                        if(window.mouseOverHistogramBar === 0) {
                            return;
                        }
                        ucemeeting.trigger({
                            type:"internal.videotag.tickerpause",
                            id: Date.now().toString(),
                            metadata: { time: parseInt($(bar).attr('data-currenttime'), 10) }
                        });
                    }, 1000);
                    var bar = this;
                    window.lastMouseOverHistogram = window.setTimeout(jumpToBarTimer, that.options.mouseindelay, that.options.ucemeeting, bar);
                })
                .on("mouseout", function() {
                    window.mouseOverHistogramBar = 0;
                    if (window.lastMouseOutHistogram!==null) {
                        window.clearTimeout(window.lastMouseOutHistogram);
                        window.lastMouseOutHistogram=null;
                    }
                    window.lastMouseOutHistogram = window.setTimeout(function(){
                        if(window.mouseOverHistogramBar == 1) {
                            return;
                        }
                        if (window.lastMouseOverHistogram!==null) {
                            window.clearTimeout(window.lastMouseOverHistogram);
                            window.lastMouseOverHistogram=null;
                        }
                        that.options.ucemeeting.trigger({
                            type:"internal.videotag.tickerplay",
                            id: Date.now().toString()
                        });
                    }, that.options.mouseoutdelay);
                })
                .on("click", function(event){
                    var seconds = $(this).attr("data-currenttime");
                    if(seconds && seconds !== "") {
                        that.options.player.data('uceplayer').seek(parseInt(seconds, 10));
                    }
                });
        });
    },
    _resolveDeferred: function() {
        if(this.options.duration===null){
            if(this.options.player.data('uceplayer').getDuration() !== undefined && this.options.player.data('uceplayer').getDuration() > 0) {
                this.options.duration = this.options.player.data('uceplayer').getDuration();
            } else {
                return;
            }
        }
        if( this._deferred.state()==="pending") {
            var pipe = this._deferred.pipe(function(){ });
            this._deferred.resolveWith(this);
            pipe.done($.proxy(this._updateAllGroups, this));
            this._deferred = $.Deferred();
            return;
        }
        if(this._deferred.state()==="resolved" || this._deferred.state()==="rejected") {
            this._deferred = $.Deferred();
            return;
        }
    },
    _format: function(timestamp) {
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

        return (valueText);
    },
    _setHovers: function(){
        var $videotickerFrame    = $('#videoticker-frame-comment'),
            $videotickerTimeline = this.element,
            videotickerTimelineP = $videotickerTimeline.offset(),
            $videotickerFrameTotal = $videotickerFrame.find('.videoticker-frame-comment-total'),
            $videotickerFrameTotalSpan = $videotickerFrame.find('.videoticker-frame-comment-total span'),
            $videotickerFrameTimer = $videotickerFrame.find('.videoticker-frame-comment-timer');

        this.element.find('span').hover(
            function()
            {
                var $this = $(this),
                    position = $this.offset(),
                    comments = $this.attr('data-comment'),
                    timer = $this.attr('data-timer');
                    
                if(parseInt(comments, 10) === 0)
                {
                    $videotickerFrameTotal.hide();    
                }
                    
                $videotickerFrameTotalSpan.text(comments);
                $videotickerFrameTimer.text(timer);
                
                $videotickerFrame.addClass('active').css('left', ((position.left - videotickerTimelineP.left) - 10));
            },
            function()
            {
                $videotickerFrameTotal.show();    
                $videotickerFrame.removeClass('active');
            }
        ); 
    },
    /*
     * Data structure
     */
    _addData: function(event) {
        if(this.options.eventTimeIndex[event.id]===false) {
            this._removeData(event.id);
            return false;
        }
        this.options.eventTimeIndex[event.id] = Math.round( event.metadata.currentTime );
        this.options.eventUserIndex[event.id] = event.from;
    },
    _removeData: function(eventid) {
        if(this.options.eventTimeIndex[eventid]===undefined) {
            this.options.eventTimeIndex[eventid]=false;
            this.options.eventUserIndex[eventid]=false;
            return false;
        }
        delete this.options.eventTimeIndex[eventid];
        delete this.options.eventUserIndex[eventid];
    },
    _getCommentBar: function(event) {
        var id = null;
        if(event.metadata.parent !== undefined) {
            id = event.metadata.parent;
        } else {
            id = event.id;
        }
        var time = this.options.eventTimeIndex[id];
        if(time<=0){
            return this.element.find('span').first();
        }
        var duration = this.options.duration,
            binsDuration = Math.ceil(duration / this.options.bins);
        var foundbar = this.element.find("span:eq("+(Math.ceil(time/binsDuration) - 1)+")");
        return foundbar;
    },
    _incrementComment: function() {
        var event = this._injectQueue.pop();
        if(event===undefined) {
            return;
        }
        if(this._addData(event)===false) {
            return;
        }
        if(this.options.eventTimeIndex[event.id]===undefined) {
            return;
        }
        var $span = this._getCommentBar(event);
        $span.attr("data-comment", parseInt($span.attr("data-comment"), 10)+1);
        $span.data(event.id, event.metadata.currentTime);
        var users = $span.data("users")!==undefined ? $span.data("users") : [];
        users.push(event.from);
        $span.data("users", users);
        this._colorize(event, $span);
    },
    _decrementComment: function() {
        var event = this._removeQueue.pop();
        if(event===undefined) {
            return;
        }
        if(this.options.eventTimeIndex[event.metadata.parent]===undefined) {
            return;
        }
        var $span = this._getCommentBar(event);
        $span.attr("data-comment", parseInt($span.attr("data-comment"), 10)-1);
        var users = $span.data("users")!==undefined ? $span.data("users") : [];
        var that = this;
        $span.data("users", _.filter(users, function(uid){
            return (uid !== that.options.eventUserIndex[event.metadata.parent]);
        }));
        this._colorize(event, $span);
        this._removeData(event.metadata.parent);
    },
    /*
     * sets the class and color of a single comment
     */
    _colorize: function(event, span) {
        if(span===undefined) {
            span = this._getCommentBar(event);
        }
        if(span.attr("data-comment")==="0") {
            span.attr("class", "");
        } else {
            span.addClass(this.options.class_default);
        }
    },
    /*
     * sets the class of every span
     * priority to the user's comment
     */
    _updateAllGroups: function(event) {
        var that = this;
        this.element.children("span").each(function(i) {
            var span = $(this);
            if(span.attr("data-comment")==="0") {
                return;
            }
            var users = that.options.roster.getUsersState();
            if (_.isObject(users)!==true){
                return;
            }
            var usersuid = span.data("users");
            if(usersuid===undefined){
                return;
            }
            if(_.include(usersuid, that.options.uceclient.uid)===true) {
                span.attr("class", "");
                span.addClass(that.options.class_self);
                return;
            }
            // producteur OR personality
            if ((_.intersection(that.options.speakers, usersuid)).length > 0){
                span.attr("class", "");
                span.addClass(that.options.class_personality);
                return;
            }
        });
    },
    /*
     * UCE Event Callback
     * injects a message along the waveform
     */
    _handleNewComment: function(event) {
        this._injectQueue.push($.extend(true, {}, event));
        if(this._deferred.state()==="resolved" || this._deferred.state()==="rejected") {
            this._deferred = $.Deferred();
        }
        this._deferred.done($.proxy(this._incrementComment, this));
    },
    /*
     * Update Votes Viz
     * TODO
     */
    _handleVote: function(event) {
    },
    /*
    * Delete a comment
    */
    _handleDeleteComment: function(event) {
        this._removeQueue.push($.extend(true, {}, event));
        if(this._deferred.state()==="resolved" || this._deferred.state()==="rejected") {
            this._deferred = $.Deferred();
        }
        this._deferred.done($.proxy(this._decrementComment, this));
    },
    /**
     * Delete the user's comment
    */
    _handleDeleteOwnComment: function(event) {
        this._handleDeleteComment(event);
    },
    /*
     * records unixtimes for starting and ending of a live
     */
    _handleOpen: function(event) {
        this.options.endLive = null;
        if(event.metadata.unixtime) {
            this.options.startLive = event.metadata.unixtime;
        }
    },
    _handleClose: function(event) {
        if(event.metadata.unixtime && typeof this.options.startLive==="number") {
            this.options.duration = Math.round((event.metadata.unixtime - this.options.startLive)/1000);
        }
    },
    destroy: function() {
        this.element.find('*').remove();
        $.Widget.prototype.destroy.apply(this, arguments); // default destroy
    }
};
$.uce.widget("activitybar", new $.uce.ActivityBar());
