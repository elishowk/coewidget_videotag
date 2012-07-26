module("uce.roster", {});

var MockEventAdd = {
    datetime: 1338893773158,
    domain: "localhost",
    from: "18888444472920958972084000340434",
    id: "36386467112457370042912441088531",
    location: "demo5",
    type: "internal.roster.add"
};

var MockSpeaker = {
    auth: "password",
    domain: "localhost",
    metadata: {
        first_name: "Super",
        groups: "participant",
        id: "100",
        is_active: "true",
        is_staff: "false",
        is_superuser: "false",
        language: "fr",
        last_name: "Patient",
        md5: "c1b1a75b5512ba49f6ec6228db754784",
        ucengine_uid: "18888504972920958972084000340434",
        user_id: "100",
        username: "QunitSpeaker"
    },
    name: "QunitSpeaker",
    uid: "18888504972920958972084000340434",
    visible: true
};

// we go on the roster tab
$('#player-aside-nav [data-nav="videoticker-users"]').click();

var MockUser = {
    auth: "password",
    domain: "localhost",
    metadata: {
        first_name: "Ultra",
        groups: "participant",
        id: "101",
        is_active: "true",
        is_staff: "false",
        is_superuser: "false",
        language: "fr",
        last_name: "Cool",
        md5: "c1b1d75b5f12ba49f6ec6228db754984",
        ucengine_uid: "18888444472920958972084000340434",
        user_id: "101",
        username: "QunitUser"
    },
    name: "QunitUser",
    uid: "18888444472920958972084000340434",
    visible: true
};

if (Factories===undefined) {
    var Factories = {};
}

Factories.addVideotagEvent = function(from) {
    return {
        type: "videotag.message.new",
        from: from
    };
}

Factories.voteforVideotagEvent = function(from) {
    return {
        type: "videotag.message.delete",
        from: from
    };
}

Factories.deleteVideotagEvent = function(from) {
    return {
        type: "internal.roster.delete",
        from: from
    };
}

Factories.deleteOwnVideotagEvent = function(from) {
    return {
        type: "videotag.message.owndelete",
        from: from
    };
}












