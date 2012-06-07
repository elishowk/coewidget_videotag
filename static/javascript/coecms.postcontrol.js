/**
*  postcontrol give style and life to videotag messages
*  depends :
*  * underscore.js
*  * ucewidget.js
*  * jqueryUI
*
*  Copyright (C) 2011 CommOnEcoute,
*  maintained by Elias Showk <elias.showk@gmail.com>
*  source code at https://github.com/CommOnEcoute/ucengine-widgets
*   
*   postcontrol widget is free software: you can redistribute it and/or modify
*   it under the terms of the GNU Affero General Public License as published by
*   the Free Software Foundation, either version 3 of the License, or
*   (at your option) any later version.
*
*   postcontrol is distributed in the hope that it will be useful,
*   but WITHOUT ANY WARRANTY; without even the implied warranty of
*   MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
*   GNU Affero General Public License for more details.
*
*   You should have received a copy of the GNU Affero General Public License
*   along with the source code.  If not, see <http://www.gnu.org/licenses/>.
*/

$.uce.PostControl = function(){};
$.uce.PostControl.prototype = {
    options: {
        ucemeeting: null,
        uceclient: null,
        avatar_media_url: null,
        display_interval: 2000,
        speakers : [],
        postform: $('#form-comment').data('postform'),
        roster: $('#roster').data('roster'),
        filters: $('#filters')
    },

    /*
     * UCEngine events listening
     */
    meetingsEvents: {
        "internal.roster.update"    :   "_updateRoster",
        "videotag.message.dispatch" :   "_handleDispatchMessage",
        "internal.user.disconnected":   "_handleReconnectUser"
    },

    /*
     * UI initialize
     */
    _create: function() {
        return;
    },

    /*
     * Message element decorator
     */
    _handleDispatchMessage: function(event) {
        var that = this;
        var title = $(".ui-postform-title").text();
        $("#ui-videotag-message-share-facebook-"+event.id).click(function(evt){
            $('#form-comment').data('postform').toFacebook(event.metadata.text, event.metadata.currentTime, location.href, title);
        });
        var twpublish = {
            url: location.href + "?starttime=" + (Math.round(event.metadata.currentTime)).toString(),
            via: "commonecoute",
            text: ((event.metadata.text.length > 72) ? event.metadata.text.slice(0,72) + "..." : event.metadata.text)+" from "+((title.length > 30) ? title.slice(0,30) + "..." : title),
            related: "commonecoute"
        };
        $("#ui-videotag-message-share-twitter-"+event.id).attr("href",  "https://twitter.com/intent/tweet?"+$.param(twpublish));
        this._linkTextData(event);
        // force user info displaying
        this._updateMessage(event);
        this._postDispatchTrigger(event);
        this.options.filters.data('filters').filterMessages();
    },
    /*
     * User Data displaying 
	 * fired every time the User roster changes
	 * updates every message posted by userid
     */
    _updateRoster: function(event) {
        var users = this.options.roster.getUsersState();
        if (_.isObject(users)!==true){
            return;
        }
        var user = users[event.from];
        if(_.isBoolean(user)===true || user === undefined) {
			return;
        }
        this._updateUser(user);
        this._updateGroup(user);
        this._updateUserAvatar(user);
    },

    /*
     * Text to links
     * TODO use twitter text js
     */
    _linkTextData: function(event) {
        var spantext = event.metadata.element.find(".ui-videotag-message-text");        
        // Change http URIs into links
        var httpLinks = /(https?:\/\/[^ \)\"]+)/g;
        spantext.html(spantext.html().replace(httpLinks, '<a href="$1" target="_BLANK">$1</a>'));
        // TODO extract href
        event.metadata.href = [];
    },

    /*
     * internal event to notify message decoration is done
     */
    _postDispatchTrigger: function(event) {
        event.type = "videotag.message.postdispatch";
        this.options.ucemeeting.trigger(event);
    },

    /*
     * Message's User Data displaying handler
     */
    _updateMessage: function(event) {
        var users = this.options.roster.getUsersState();
        if (_.isObject(users)!==true){
            return;
        }
        var user = users[event.from];
        if(_.isBoolean(user)===true || user === undefined) {
			return;
        }
        event.metadata.user = user;
        this._updateMessageUser(event, user);
        this._updateMessageGroup(event, user);
        this._updateMessageUserAvatar(event, user);
    },
    /*
     * injects User's name in every message
     */
    _updateMessageUser: function(event, user) {
        var afrom = event.metadata.element.find(".ui-videotag-message-from[uid="+user.uid+"]");
        if(afrom.length===0 || afrom.text()!=="") {
            return;
        }
        this._appendUsername(afrom, user);
    },
    /*
     * append username into a specific target afrom
     * TODO link user profile
     */
     _appendUsername: function(afrom, user) {
        /*afrom.attr(
            {'href':'/accounts/'+user.name, 'target': '_BLANK'});*/
        afrom.text(this.options.roster.getScreenName(user.uid));
    },
    /*
     * inject Group's info in every Message
     */
    _updateMessageGroup: function(event, user) {
        this._appendMessageGroup(event.metadata.element, user);
    },
    _appendMessageGroup: function(element, user) {
        if(user.metadata===undefined || user.metadata.groups===undefined) {
            return;
        }
        var groups = user.metadata.groups.split(",");
        // user is me
        if (user.uid == this.options.uceclient.uid){
            element.addClass("ui-videotag-message-myself");
            return;
        }
        // producteur OR personality
        if (_.include(this.options.speakers, user.uid)){
            element.addClass("ui-videotag-message-personality");
            return;
        }
    },
    /*
     * Injects User's avatar in every message
     */
    _updateMessageUserAvatar: function(event, user) {
        var msgav = event.metadata.element.find('.ui-videotag-message-avatar[uid='+user.uid+']');
        this._appendAvatar(msgav, user);
    },
    /*
     * FIXME Only gets default avatar now
     */
    _appendAvatar: function(msg, user) {
        msg.attr("src", "http://www.gravatar.com/avatar/"+user.metadata.md5+"?d=retro");
    },
    /*
     * injects User's name in every message
     */
    _updateUser: function(user) {
        var afrom = this.element.find(".ui-videotag-message-from[uid="+user.uid+"]");
        if(afrom.length===0 || afrom.text()!=="") {
            return;
        }
        this._appendUsername(afrom, user);
    },
    /*
     * inject Group's info in every Message
     */
    _updateGroup: function(user) {
        var afrom = this.element.find(".ui-videotag-message-from[uid="+user.uid+"]").parents(".ui-videotag-message");
        if(afrom.length===0) {
            return;
        }
        this._appendMessageGroup(afrom, user);
    },
    /*
     * Injects User's avatar in every message
     */
    _updateUserAvatar: function(user) {
        var that = this;
        this.element.find('.ui-videotag-message-avatar[uid='+user.uid+']').each(function() {
            if($(this).attr('src')==="" || $(this).attr('src')===undefined) {
                that._appendAvatar($(this), user);
            }
        });
    },
    destroy: function() {
        $.Widget.prototype.destroy.apply(this, arguments); // default destroy
    },
    /*
     * Sign-in popup opened when the internal disconnection event is fired
     */
    _handleReconnectUser: function(event) {
        var _height = (Math.ceil($('#pre-footer').offset().top) - 150);
        $('#signin-popup-overlay').css({
            'height': _height,
            'display': 'block'
        }); 
        $('#signin-popup').show();
    }

};
$.uce.widget("postcontrol", new $.uce.PostControl());
