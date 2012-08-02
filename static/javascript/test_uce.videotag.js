module("uce.videotag", {});

if (Factories===undefined) {
    var Factories = {};
}

Factories.getMockUser = function(username, uid, firstname, lastname) {
    return {
        auth: "password",
        domain: "localhost",
        metadata: {
            first_name: firstname,
            groups: "participant",
            language: "fr",
            last_name: lastname,
            md5: "c1b1a75b5512ba49f6ec6228db754784",
            ucengine_uid: uid,
            username: username
        },
        name: username,
        uid: uid
    };
}

Factories.addVideotagEvent = function(from, hashtagref, time) {
    return {
        datetime: Date.now(),
        domain: "localhost",
        from: from,
        id: (Date.now()+Math.random()*2000).toFixed(0).toString(),
        location: "demo5",
        metadata : {
            currentTime: time,
            hashtag : ["#testqunit","#"+hashtagref],
            href: location.href,
            lang: "any",
            text: "Test qunit par #"+hashtagref+". #testqunit",
            title: $('.ui-postform-title').text()
        },
        type: "videotag.message.new"
    };
}

Factories.voteforVideotagEvent = function(from, messid) {
    return {
        datetime: messid,
        domain: "localhost",
        from: from,
        id: messid,
        location: "demo5",
        metadata: { parent: messid },
        type: "videotag.message.vote",
    };
}

Factories.deleteVideotagEvent = function(parentid) {
    return {
        type: "videotag.message.delete",
        metadata: { parent: parentid }
    };
}

Factories.deleteOwnVideotagEvent =  function(parentid) {
    return {
        type: "videotag.message.delete",
        metadata: { parent: parentid }
    };
}

test("Add, Check and Delete Message", function() {
    expect(14);

    // Initialize roster & videotag
    var MockUser = Factories.getMockUser("QunitUser", "18888444472920958972084000340434", "User", "Name");
        $('#roster').data("roster")._state.users[MockUser.uid] = MockUser;
    if ($('#roster').data("roster")._state.roster === null){
        $('#roster').data("roster")._state.roster = [];
    }
    $('#roster').data("roster")._state.roster.push(MockUser);
    var hashtagtest = "MockUser";
    var MockEventVideotag = Factories.addVideotagEvent(MockUser.uid, hashtagtest, "3800");
    // Add comment
    $('#videoticker').data('videotag')._handleMessage(MockEventVideotag);

    // Test on comment
    equal($('[evtid="'+MockEventVideotag.id+'"]').length === 1, true, "Message have been added and is unique");
        //text
    equal($('[evtid="'+MockEventVideotag.id+'"] .ui-videotag-message-text').text() === MockEventVideotag.metadata.text , true, "Message has the right text");
        //time
    equal($('[evtid="'+MockEventVideotag.id+'"] time').attr("data-videoseconds") === "3800", true, "Time is good");
    equal($('[evtid="'+MockEventVideotag.id+'"]').data('currenttime') === 3800, true, "Data currentime is good");
    equal($('[evtid="'+MockEventVideotag.id+'"] time').text() === "1:03:20", true, "Time has good format");
        // pseudo
    equal($('[evtid="'+MockEventVideotag.id+'"] .ui-videotag-message-from').text() === MockUser.name , true, "Message has the right pseudo");
        // avatar
    equal($('[evtid="'+MockEventVideotag.id+'"] .ui-videotag-message-avatar').attr("src") !== "" , true, "Message has an avatar");
        //vote
    equal($('[evtid="'+MockEventVideotag.id+'"] .ui-videotag-message-vote').text() === "0" , true, "Message has no vote");

    // Click tests on comment
        //vote
        var MockVote = Factories.voteforVideotagEvent("39255051546791297315043819510064", MockEventVideotag.id);
    $('#videoticker').data('videotag')._handleVoteMessage(MockVote);
    equal($('[evtid="'+MockEventVideotag.id+'"] .ui-videotag-message-vote').text() === "1" , true, "Message has one vote");
        // sharing
    equal($('[data-event="'+MockEventVideotag.id+'"]').is(':visible'), false, "Sharing slide not shown");   
    $('[evtid="'+MockEventVideotag.id+'"]').click();
    equal($('[data-event="'+MockEventVideotag.id+'"]').is(':visible'), true, "Sharing slide shown");    
    equal($('[data-event="'+MockEventVideotag.id+'"] #ui-videotag-message-share-twitter-'+MockEventVideotag.id).attr("href") !== "javascript:void(0)", true, "Twitter sharing active");
    equal($('[data-event="'+MockEventVideotag.id+'"] #ui-videotag-message-share-facebook-'+MockEventVideotag.id).length !== 0, true, "Facebook sharing active");  
        // time
    /*$('[evtid="'+MockEventVideotag.id+'"] .ui-videotag-message-date').click();
    equal($('.ui-postform-time').text() !== "00:00:00", true, "Video started");
    equal($('#form-comment').data('postform').options.player.uceplayer('getCurrentTime').toString() === MockEventVideotag.metadata.currentime, true, "Video started in time");
    */

    // Deletion
    var delevent = Factories.deleteVideotagEvent(MockEventVideotag.id);
    $('#videoticker').data('videotag')._handleDeleteMessage(delevent);
    equal($('[evtid="'+MockEventVideotag.id+'"]').length === 0, true, "Comment has been deleted");
});

test("Position Test", function() {
    expect(2);

    // Initialize roster & videotag
    var MockUser = Factories.getMockUser("QunitUser", "18888444472920958972084000340434", "User", "Name");
    $('#roster').data("roster")._state.users[MockUser.uid] = MockUser;
    if ($('#roster').data("roster")._state.roster === null){
        $('#roster').data("roster")._state.roster = [];
    }
    $('#roster').data("roster")._state.roster.push(MockUser);
    // Initialize videotag
    var MockEventVideotag1 = Factories.addVideotagEvent(MockUser.uid, "comment1", "3799");
    var MockEventVideotag2 = Factories.addVideotagEvent(MockUser.uid, "comment2", "3800");
    var MockEventVideotag3 = Factories.addVideotagEvent(MockUser.uid, "comment3", "3801");
    // Add comments
    $('#videoticker').data('videotag')._handleMessage(MockEventVideotag1);
    $('#videoticker').data('videotag')._handleMessage(MockEventVideotag2);
    $('#videoticker').data('videotag')._handleMessage(MockEventVideotag3);

    // Test on comment
    equal($('[evtid="'+MockEventVideotag2.id+'"]').next().next().attr("evtid") === MockEventVideotag1.id, true, "Comment is before");
    equal($('[evtid="'+MockEventVideotag2.id+'"]').prev().prev().attr("evtid") === MockEventVideotag3.id, true, "Comment is after");
 
    // Deletion
    var delevent1 = Factories.deleteVideotagEvent(MockEventVideotag1.id);
    var delevent2 = Factories.deleteVideotagEvent(MockEventVideotag2.id);
    var delevent3 = Factories.deleteVideotagEvent(MockEventVideotag3.id);
    $('#videoticker').data('videotag')._handleDeleteMessage(delevent1);
    $('#videoticker').data('videotag')._handleDeleteMessage(delevent2);
    $('#videoticker').data('videotag')._handleDeleteMessage(delevent3);
});