/**
*  Videotag implements video deep-tagging for a ucengine client
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
*   Videotag widget is free software: you can redistribute it and/or modify
*   it under the terms of the GNU Affero General Public License as published by
*   the Free Software Foundation, either version 3 of the License, or
*   (at your option) any later version.
*
*   Videotag is distributed in the hope that it will be useful,
*   but WITHOUT ANY WARRANTY; without even the implied warranty of
*   MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
*   GNU Affero General Public License for more details.
*
*   You should have received a copy of the GNU Affero General Public License
*   along with the source code.  If not, see <http://www.gnu.org/licenses/>.
*/

(function($) {

if (typeof $.uce === 'undefined') { $.uce = {}; }
$.uce.Videotag = function() {};
$.uce.Videotag.prototype = {
    options: {
        ucemeeting: null,
        uceclient: null,
        lang: 'any',
        player: null,
        userCanDelete: false,
        updateInterval: 2000
    },
    /*
     * UCEngine events listening
     */
    meetingsEvents: {
        'videotag.message.new'      : '_handleMessage',
        'videotag.message.vote'     : '_handleVoteMessage',
        'videotag.message.delete'   : '_handleDeleteMessage',
        'videotag.message.owndelete': '_handleDeleteOwnMessage'
    },
    /*
     * UI initialize
     */
    _create: function() {
        this._updateLoop = null;
        this._injectQueue = [];
        this._deferred = $.Deferred();
        if (this._updateLoop===null) {
            var that = this;
            this._updateLoop = window.setInterval(function() {
                that._resolveDeferred();
            }, that.options.updateInterval);
            return;
        }
    },
    _resolveDeferred: function() {
        if(this._deferred.state() === 'pending') {
            this._deferred.resolve();
            $('#video-comments').resize();
            return;
        }
        if(this._deferred.state()==='resolved' || this._deferred.state()==='rejected') {
            this._deferred = $.Deferred();
            return;
        }
    },
    /**
     * UCEngine Event callback
    */
    _handleMessage: function(event) {
        if (event.metadata === undefined || event.metadata.text === undefined ||
            event.metadata.currentTime === undefined) {
            return;
        }
        if (event.metadata.hashtag===undefined) {
            event.metadata.hashtag = [];
        }
        if (_.isArray(event.metadata.votes)===false) {
            event.metadata.votes = [];
        }
        var data = this.element.data(event.id);
        if (data) {
            if(data.deleted===true) {
                return;
            }
            if(data.metadata.votes.length > 0) {
                $.merge( event.metadata.votes, data.metadata.votes);
            }
        }
        event.metadata.currentTime = parseInt(event.metadata.currentTime, 10);
        // data cache
        this.element.data(event.id, event);
        // inject to html
        this._injectVideotag(event);
    },

    /**
     * UCEngine Event callback
    */
    _handleVoteMessage: function(event) {
        var data = this.element.data(event.metadata.parent);
        if (!data) {
            this.element.data(event.metadata.parent, {
                metadata: {
                    votes: [event.from]
                }
            });
            return;
        }
        if (_.isArray(data.metadata.votes) === false) {
            data.metadata.votes = [];
        }
        data.metadata.votes.push(event.from);
        var buttonVote = this.element.find('.ui-videotag-message[evtid="'+event.metadata.parent+'"] .ui-videotag-message-vote');
        var newText = data.metadata.votes.length.toString();
        var that = this;
        buttonVote.each(function() {
            $(this).text(newText);
            if (event.from === that.options.uceclient.uid) {
                $(this).unbind('click');
                $(this).parent().addClass('active');
            }
        });
    },

    /**
     * UCEngine Event callback
    */
    _handleDeleteMessage: function(event) {
        var data = this.element.data(event.metadata.parent);
        if (!data) {
            this.element.data(event.metadata.parent, {
                id: event.metadata.parent,
                deleted: true,
                metadata: {}
            });
            return;
        }
        this.element.children('.videoticker-comment-share[data-event="'+event.metadata.parent+'"]').remove();
        this.element.children('.ui-videotag-message[evtid="'+event.metadata.parent+'"]').remove();
        this.element.removeData(event.metadata.parent);
    },

    /**
     * UCEngine Event callback
    */
    _handleDeleteOwnMessage: function(event) {
        this._handleDeleteMessage(event);
    },
    /*
     * Event sender
     * Public method posting a new message
     * send 100 deep-tags with the current session
     * for(var i=0; i<100; i++){
     *      $('#videoticker').data('videotag').postNewMessage({
     *          text: 'benchmark',
     *          currentTime: Math.round(Math.random() * 120)},
     *          function(){});
     *  }
     */
    postNewMessage: function(metadata, successcallback) {
        var it = this;
        this.options.ucemeeting.push(
            'videotag.message.new',
            metadata,
            function(err, data, xhr) {
                if (err) {
                    if (err == 401) {
                        it.options.ucemeeting.trigger({
                            'type': 'internal.user.disconnected',
                            'id': Date.now().toString(),
                            'metadata': { error: err }
                        });
                    } else {
                        metadata.error = err;
                        metadata.user = {
                            connected: it.options.uceclient.connected,
                            uid: it.options.uceclient.uid,
                            name: it.options.uceclient.name
                        };
                        it.options.ucemeeting.trigger({
                            type: 'notify.videotag.message.new.error',
                            metadata: metadata
                        });
                    }
                } else {
                    it._pushHashtagAdd({'metadata': metadata});
                    if (successcallback !== undefined) {
                        successcallback(metadata);
                    }
                }
            }
        );
    },
    /*
     * Event sender
     * Creates videotag's hashtags
     */
    _pushHashtagAdd: function(event) {
        var that = this;
        _.each(event.metadata.hashtag, function(ht) {
            var md = {
                hashtag: ht,
                lang: event.metadata.lang
            };
            that.options.ucemeeting.push(
                {
                    type: 'message.hashtag.add'
                },
                md,
                function(err, data, xhr) {
                    if (err) {
                        if (err == 401) {
                            that.options.ucemeeting.trigger({
                                'type': 'internal.user.disconnected',
                                'id': Date.now().toString(),
                                'metadata': { error: err }
                            });
                        } else {
                            md.error = err;
                            md.user = {
                                connected: that.options.uceclient.connected,
                                uid: that.options.uceclient.uid,
                                name: that.options.uceclient.name
                            };
                            that.options.ucemeeting.trigger({
                                type: 'notify.message.hashtag.add.error',
                                metadata: md
                            });
                        }
                    }
                });
        });
    },
    /*
     * Event sender
     * Delete videotag's hashtags
     */
    _pushHashtagDelete: function(event) {
        var that = this;
        _.each(event.metadata.hashtag, function(ht) {
            var md = {
                hashtag: ht,
                lang: event.metadata.lang
            };
            that.options.ucemeeting.push(
                {
                    type: 'message.hashtag.delete'
                },
                md,
                function(err, data, xhr) {
                    if (err) {
                        if (err == 401) {
                            that.options.ucemeeting.trigger({
                                'type': 'internal.user.disconnected',
                                'id': Date.now().toString(),
                                'metadata': { error: err }
                            });
                        } else {
                            md.error = err;
                            md.user = {
                                connected: that.options.uceclient.connected,
                                uid: that.options.uceclient.uid,
                                name: that.options.uceclient.name
                            };
                            that.options.ucemeeting.trigger({
                                'type': 'notify.message.hashtag.delete.error',
                                'metadata': md
                            });
                        }
                    }
                });
        });
    },
    /*
     * Wraps inner html into message div
     */
    _getVideotagDiv: function(event, html) {
        return $('<div>').attr({
            'evtid': event.id,
            'class': 'ui-videotag-message overflow-hidden ui-videotag-selected',
            'currenttime': event.metadata.currentTime}).html(html);
    },
    /*
     * Creates the message's html
     */
    _injectVideotag: function(event) {
        var html = '',
            msgheader = '',
            msgtext = '';
        var votes = (event.metadata.votes.length).toString();
        msgheader += "<div class='ui-videotag-message-header videoticker-comment-user'>";
        msgheader += "<img uid='"+event.from+"' class='ui-videotag-message-avatar avatar' src=''></img>";
        msgheader += "<div class='videoticker-comment-like-wrapper'>"+
            "<a href='javascript:void(0);' class='ui-videotag-message-vote videoticker-comment-like'>"+votes+"</a>"+
            '</div>';
        msgheader += "</div>";
        msgtext += "<div class='videoticker-comment-text'>";
        msgtext += "<h3><time class='ui-videotag-message-date' title='click to play video at " +
            event.metadata.currentTime.timetoHours() +
            "' data-videoseconds='" +
            event.metadata.currentTime.toString()+"'>" +
            event.metadata.currentTime.timetoHours() +
            "</time>";
        msgtext += "<span class='ui-videotag-message-from' uid='"+event.from+"'></span></h3>";
        msgtext += "<p class='ui-videotag-message-text'>"+event.metadata.text+"</p>";
        msgtext += '</div>';

        html += msgheader + msgtext;
        var can = true;
        if (event.from != this.options.uceclient.uid) {
            can = this.options.userCanDelete;
        }
        if (can) {
            html += '<div class="videoticker-comment-action-trigger">'+
                '<div class="videoticker-comment-action">'+
                    '<div class="videoticker-comment-action-arrow"></div>'+
                    '<div class="videoticker-comment-action-inner">'+
                        '<a href="javascript:void(0);" class="ui-videotag-message-trash">Supprimer</a>'+
                        //'<a href="javascript:void(0);">Modifier</a>'+
                    '</div>'+
                '</div>'+
            '</div>';
        }
        var message = this._getVideotagDiv(event, html);
        this._enpowerMessage(event, message);
        if(this._deferred.state()==='resolved' || this._deferred.state()==='rejected') {
            this._deferred = $.Deferred();
        }
        this._injectQueue.push([$.extend(true, {}, event), message]);
        this._deferred.done(this._positionMessage());

    },
    _appendShareDiv: function(event) {
        var shareelt = document.createElement('div');
        shareelt.setAttribute('class', 'videoticker-comment-share');
        shareelt.setAttribute('data-event', event.id);
        shareelt.innerHTML = '<div>'+
                '<p>Partager sur '+
                '<a id="ui-videotag-message-share-twitter-'+event.id+'" href="javascript:void(0)" class="videoticker-comment-share-twitter">twitter</a> '+
                '<a id="ui-videotag-message-share-facebook-'+event.id+'" href="javascript:void(0)" class="videoticker-comment-share-facebook">facebook</a>'+
                '</p>'+
                '<span class="videoticker-comment-share-close">close</span>'+
            '</div>';
        return shareelt;
    },
    /*
     * Inject the message in the chronological order
     * TODO add support for multiple injection at one time
     */
    _positionMessage: function() {
        var data = this._injectQueue.pop();
        if (data === undefined || data.length != 2) {
            return;
        }
        var event = data[0];
        var message = data[1];
        if (!message.length || !event) {
            return;
        }
        var messages = this.element.children('.ui-videotag-message');
        var childCount = messages.length;
        var shareelt = this._appendShareDiv(event);
        if (childCount === 0) {
            this.element.get(0).appendChild(message.get(0));
            this.element.get(0).appendChild(shareelt);
            this._dispatchMessage(event, message);
            return;
        }
        var currenttime = message.data('currenttime');
        var that = this;
        messages.each(function(i) {
            if (!this.hasAttribute('currenttime')) { return true; }
            if (parseInt(this.getAttribute('currenttime'), 10) <= currenttime) {
                that.element.get(0).insertBefore(message.get(0), this);
                that.element.get(0).insertBefore(shareelt, this);
                return false;
            }
            if (i == childCount - 1 && i > 1) {
                that.element.get(0).appendChild(message.get(0));
                that.element.get(0).appendChild(shareelt);
                return false;
            }
        });
        this._dispatchMessage(event, message);
        delete messages;
    },
    /*
     * Attach click events on the message
     */
    _enpowerMessage: function(event, message) {
        var evid = event.id;
        var can = true;
        var evtype = 'videotag.message.delete';
        if (event.from == this.options.uceclient.uid) {
            evtype = 'videotag.message.owndelete';
        } else {
            can = this.options.userCanDelete;
        }
        if (can) {
            this._attachRemove(evtype, evid, message);
        }
        // can't vote for myself nor vote twice
        var data = this.element.data(event.id);
        if (event.from != this.options.uceclient.uid && _.include(data.metadata.votes, this.options.uceclient.uid) === false) {
            this._attachVote(evid, message);
        }
        message.data('currenttime', event.metadata.currentTime);
        this._attachPlay(message);
    },

    /*
     * internal event to notify message injection is done
     */
    _dispatchMessage: function(event, message) {
        event.type = 'videotag.message.dispatch';
        event.metadata.element = message;
        this.options.ucemeeting.trigger(event);
    },

    /*
     * Remove message click handler
     */
    _attachRemove: function(evtype, evid, message) {
        var that = this;
        var originalevent = this.element.data(evid);
        message.find('.ui-videotag-message-trash').on('click', function() {
                var md = {
                    parent: evid,
                    parentfrom: originalevent.from
                };
                that.options.ucemeeting.push(
                {
                    type: evtype
                },
                md,
                function (err, data, xhr) {
                    if (err) {
                        if (err == 401) {
                            that.options.ucemeeting.trigger({
                                'type': 'internal.user.disconnected',
                                'id': Date.now().toString(),
                                'metadata': { error: err }
                            });
                        } else {
                            md.error = err;
                            md.user = {
                                connected: that.options.uceclient.connected,
                                uid: that.options.uceclient.uid,
                                name: that.options.uceclient.name
                            };
                            that.options.ucemeeting.trigger({
                                'type': 'notify.'+evtype+'.error',
                                'metadata': md
                            });
                        }
                    } else {
                        // decrement hashtag selectors
                        that._pushHashtagDelete(originalevent);
                        that.options.ucemeeting.trigger({
                            'type': 'notify.'+evtype,
                            'metadata': md
                        });
                    }
                });
            });
    },

    /*
     * Vote for a message click handler
     */
    _attachVote: function(evid, message) {
        var that = this;
        message.find('.ui-videotag-message-vote').on('click', function() {
            var button = $(this);
            button.unbind('click');
            button.parent().addClass('active');
            var md = {
                parent: evid
            };
            that.options.ucemeeting.push(
                {
                    type: 'videotag.message.vote'
                },
                md,
                function(err, data, xhr){
                    if (err) {
                        if (err==401) {
                            that.options.ucemeeting.trigger({
                                'type': 'internal.user.disconnected',
                                'id': Date.now().toString(),
                                'metadata': { error: err }
                            });
                        } else {
                            md.error = err;
                            md.user = {
                                connected: that.options.uceclient.connected,
                                uid: that.options.uceclient.uid,
                                name: that.options.uceclient.name
                            };
                            that.options.ucemeeting.trigger({
                                'type': 'notify.videotag.message.vote.error',
                                'metadata': md
                            });
                        }
                    } else {
                        // TODO give a chance to cancel a vote, later
                        that.options.ucemeeting.trigger({
                            'type': 'notify.videotag.message.vote',
                            'metadata': md
                        });
                    }
            });
        });
    },
    _attachPlay: function(message) {
        var that = this;
        message.find('.ui-videotag-message-date').on('click', function(event) {
            var seconds = $(this).attr('data-videoseconds');
            if (seconds && seconds !== '') {
                that.options.player.data('uceplayer').seek(parseInt(seconds, 10));
            }
            event.preventDefault();
            return false;
        });
    },
    _setOption: function(key, value) {
        $.Widget.prototype._setOption.apply(this, arguments);
    },
    clear: function() {
        this.element.empty();
    },

    destroy: function() {
        this.element.children('*').remove();
        $.Widget.prototype.destroy.apply(this, arguments); // default destroy
    }

};

if ($.uce.widget !== undefined) {
    $.uce.widget('videotag', new $.uce.Videotag());
}

})($);
