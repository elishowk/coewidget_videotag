/**
*  PostForm jQuery UI widget  
*  depends :
*  * underscore.js
*  * ucewidgets.js
*  * jqueryUI
*
*  Copyright (C) 2011 CommOnEcoute,
*  maintained by Elias Showk <elias.showk@gmail.com>
*/

$.uce.PostForm = function(){};
$.uce.PostForm.prototype = {
    options: {
        ucemeeting: null,
        uceclient: null,
        lang: "any",
        player: null,
        videotag: null,
        hashtagPattern: /\B(\#\w+)+/gi,
        isLive: null,
        clockContainer: $('.ui-postform-time')
    },

	_clockLoop: null,
    /*
     * UI initialize
     */
    _create: function() {
        this._initPostForm();
        this._startClock();
    },
    /*
    * Post form event initialization
    */
    _initPostForm: function() {
        var that = this;
        var text = $('#timeline-user-comment');
        var _outside = function(_e) {
            var _clicked = $(_e.target);
	    var textinput = $('#timeline-user-comment');
            if(_clicked.attr("id") !== 'timeline-user-comment' && !_clicked.hasClass('.ui-postform-submit') && textinput.val()==="") {
		_closeForm();
	    }
	};
        var _closeForm = function(event) {
	    $(document).unbind('click', _outside);
            text.blur();
            that._startClock(); 
            text.val("");
            $(".ui-postform-input-numChar").text("300");
	    $(".close-comment-box").hide();
        };
        var _openForm = function(event) {
		if (getUsername()=="anonymous"){
			$("#signin-popup").show();
			$("#signin-popup-overlay").show();
			$("#identification").trigger("click");
			$("#non-signin-alert").show();
			$('#non-signin-alert').fadeOut(4000, function() {
		});
		    return;
		}
            that._stopClock();
            var ct = that.options.player.uceplayer('getCurrentTime').toString();
            $('input.ui-postform-currenttime').val(ct);
			$(".close-comment-box").show();
			$(document).bind('click', _outside);
        };
        text.focus(function(evtObj){
            _openForm();
        });
        $(".ui-postform-submit").click(function(){
            textinput = $('#timeline-user-comment').val().replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
            if(textinput==="") {
                _closeForm();
                return false;
            }
            if(textinput.length > 300) {
                _closeForm();
                alert("post too long, please be more concise");
                return false;
            }
            var metadata = {
                title: $('head > title').text(),
                isLive: that.options.isLive.toString(),
                href: location.href,
                text: textinput, 
                lang: that.options.lang, 
                currentTime: $('input.ui-postform-currenttime').val()
            };
            // TODO extract with twitter.text.js
            var hashtagMatch =  metadata.text.match( that.options.hashtagPattern );
            if ( _.isArray(hashtagMatch) ) {
                metadata.hashtag = _.map( _.uniq( hashtagMatch ),
                    function(tag) { return tag.trim().toUpperCase(); });
            }
            that.options.videotag.data("videotag").postNewMessage(metadata);
            that.sharePost(metadata);
            _closeForm();
            return false;
        });
        $(".close-comment-box").click(function() {
            _closeForm();
        });
        /*
        * Message Input callbacks
        */
        text.keyup(function(event) {
            var numCharField = $(".ui-postform-input-numChar");
            
            if ($("#timeline-user-comment").val().length < 300){
                numCharField.css({"color":"#3B3B3B"});
            }
            else{
                numCharField.css({"color":"#9c100c"});
            }
            numCharField.text((300 - text.val().length).toString());
            // Manage ESC key press : toogle slide back to hidden & empty form
            if ( event.keyCode == 27 ) {
                _closeForm();
            }
        });
        text.keypress(function(event) {
            if ( event.which == 13 ) {
                event.preventDefault();
                $(".ui-postform-submit").click();
            }
        });
    },
    /*
     * Twitter intents
     */
    _initTwitterIntents: function(ancid) {
        if ($("#"+ancid).length===0) {
            $('body').append(
                $('<a id="'+ancid+'" href="https://twitter.com/intent/tweet?"></a>'));
        } else if ($("#"+ancid).attr("href")!="https://twitter.com/intent/tweet?") {
        $("#"+ancid).attr("href", "https://twitter.com/intent/tweet?");
        }
    },
    /*
     * Main function sending post to other planets
     * Used as a callback to successfully posted Videotags
     *
     */
    sharePost: function(metadata) {
        var toFacebook = ($('.timeline_service_icons > #facebook').hasClass('dim') === false);
        var toTwitter = ($('.timeline_service_icons > #twitter').hasClass('dim') === false);
        if(toFacebook===true) {
			this.toFacebook(metadata.text, metadata.currentTime, metadata.href, metadata.title);
        }
        if(toTwitter===true) {
			var title = $(".block-header-left h1").text();
            var twpublish = this.toTwitter("twitter-intents-a", metadata.text, metadata.currentTime, metadata.href, title);
            window.open( $("#twitter-intents-a").attr("href"),
				"intents",
				"scrollbars=yes,resizable=yes,toolbar=no,location=yes,width=450,height=500,top=300,left=400");
			this.options.ucemeeting.trigger({
                type: "notify.videotag.message.new.share.twitter",
                'id': Date.now().toString(),
                metadata: twpublish
            });
        }
        this.options.ucemeeting.trigger({
            type: "notify.videotag.message.new",
            'id': Date.now().toString()
        });
    },
	toFacebook: function(text, currentTime, href, title){
		if(FB !== undefined) {
            var publish = {
                method: 'feed',
                message: text,
                caption: 'Un concert sur CommOnEcoute',
                name: title,
                description: text,
                link: href + "?starttime=" + (Math.round(currentTime)).toString(),
                picture: 'http://cdn.commonecoute.fr/images/layout/header-logo.png',
                actions: [
                    { name: 'commonecoute', link: 'http://commonecoute.fr/' }
                ],
                user_message_prompt: 'Share your Post on CommOnEcoute'
            };
            var that = this;
            FB.ui(publish, function(){
                publish.user = that.options.uceclient;
                that.options.ucemeeting.trigger({
                    type: "notify.videotag.message.new.share.facebook",
                    'id': Date.now().toString(), 
                    metadata: publish
                });
            });
        }
	},
	toTwitter: function(ancid, text, currentTime, href, title){
		if(window.twttr !== undefined) {
            this._initTwitterIntents(ancid);
            var twpublish = {
                url: href + "?starttime=" + (Math.round(currentTime)).toString(),
                via: "commonecoute",
                text: ((title.length > 10) ? title.slice(0,10) + "..." : title) + " #LIVE " + ((text.length > 82) ? text.slice(0,82) + "..." : text ),
                related: "commonecoute"
            };
            $("#"+ancid).attr("href",  $("#"+ancid).attr("href") +
                $.param(twpublish)
            );
		}
		return twpublish;
	},
    /*
     * Start the clock synchronised on player time
     */
    _startClock: function() {
        this.options.clockContainer.removeClass("ui-postform-time-highlight");
		var that=this;
		this._clockLoop = window.setInterval(function(){
            that._displayClock();
		}, 1000);
    },
    /*
     * Stop the clock
     */
    _stopClock: function() {
        if(this._clockLoop!==null) {
            window.clearInterval(this._clockLoop);
        }
        this._displayClock();
        this.options.clockContainer.addClass("ui-postform-time-highlight");
    },

    _displayClock: function() {
        var ct = this.options.player.uceplayer('getCurrentTime');
        if(typeof ct !== "number") {
            this.options.clockContainer.text(this._format(0));
            return;
        }
        this.options.clockContainer.text(this._format(ct*1000));
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

        var valueText = hours + ":" + minutes + ":" + seconds;
        if (neg) {
            valueText = "-" + valueText;
        }

        return (valueText);
    },

    destroy: function() {
		if(this._clockLoop!==null) {
			window.clearInterval(this._clockLoop);
		}
        this.element.find('*').remove();
        $.Widget.prototype.destroy.apply(this, arguments); // default destroy
    },
	
	setSize: function(w,ratio) {
		this.element.width(w-27);
		this.element.find('.ui-videotag-input').width(485*ratio);
		this.element.find('.ui-postform-submit').width(80*ratio);
		this.element.find('.service_icon').width(32*ratio);
		
		if (getPageboxWidth() <= 930){
			this.element.find('.space-for-icons').css('font-size',14*ratio*0.1+'px');
			this.element.find('.ui-postform-time').css('font-size',30*ratio*1.1+'px');
		}
		else {
			this.element.find('.space-for-icons').css('font-size',14*ratio*0.9+'px');
			this.element.find('.ui-postform-time').css('font-size',30*ratio+'px');
		}
		var closetextwidth = this.element.find('.ui-postform-time').width() + this.element.find('.ui-videotag-input').width() + 36;
		this.element.find('.close-comment-box').css('left',closetextwidth+'px');
    }

};
$.uce.widget("postform", new $.uce.PostForm());
