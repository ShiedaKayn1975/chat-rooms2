var socketio = require('socket.io');
var io;
var guestNumer = 1;
var nickNames = {};
var namesUsed = [];
var currentRoom = {};

exports.listen = function (server) {
    io = socketio.listen(server);
    io.set('log level', 1);

    io.sockets.on('connection', function (socket) {
        guestNumer = assignGuestName(socket, guestNumer, nickNames, namesUsed);

        joinRoom(socket, 'Lobby');

        handleMessageBroadcasting(socket, nickNames);
        handleNameChangeAttempts(socket, nickNames, namesUsed);
        handleRoomJoining(socket);

        socket.on('rooms', function () {
            socket.emit('rooms', io.sockets.manager.rooms);
        });

        handleClientDisconnection(socket, nickNames, namesUsed);

    });
};

function assignGuestName(socket, guestNumer, nickNames, namesUsed) {
    var name = 'Guest' + guestNumer; //generate new guest name
    nickNames[socket.id] = name; //associate guest name with client connection ID
    socket.emit('nameResult', { //let user know their guest name
        success: true,
        name: name
    });
    namesUsed.push(name); //note that guest name is now used
    return guestNumer + 1; // increment counter used to generate guest names
}

function joinRoom(socket, room) {
    socket.join(room); //make user join room
    currentRoom[socket.id] = room; // note that user is now in this room
    socket.emit('joinResult', {
        room: room
    }); //let user know they're now in new room
    socket.boardcast.to(room).emit('message', { //let other users iin room know that user has joined
        text: nickNames[socket.id] + 'has joined' + room + '.'
    });

    var usersInRoom = io.sockets.clients(room); //determind what other user in same room as user
    if (usersInRoom.length > 1) { //if other user exists,summarize who they are
        var userInRoomSummary = 'Users currently in' + room + ':';
        for (var index in usersInRoom) {
            var userSocketId = usersInRoom[index].id;
            if (userSocketId != socket.id) {
                if (index > 0) {
                    userInRoomSummary += ', ';
                }
                userInRoomSummary += nickNames[userSocketId];
            }
        }
        userInRoomSummary += '.';
        socket.emit('message', {
            text: userInRoomSummary
        }); //send summary of pther users in the room to the user
    }
}

function handleNameChangeAttempts(socket, nickNames, namesUsed) {
    socket.on('nameAttempt', function (name) { //add listener to nameAttempt events
        if (name.indexOf('Guest') == 0) { //don't allow nickname to begin with Guest
            socket.emit('nameResult', {
                success: false,
                message: 'Name cannot begin with "Guest".'
            });
        } else {
            if (namesUsed.indexOf(name) == -1) { //If name isn't already registered,register it
                var previousName = nickNames[socket.id];
                var previousNameIndex = namesUsed.indexOf(previousName);
                namesUsed.push(name);
                nickNames[socket.id] = name;
                delete namesUsed[previousNameIndex]; //remove previous name to make available to other clients
                socket.emit('nameResult', {
                    success: true,
                    name: name
                });
                socket.boardcast.to(currentRoom[socket.id]).emit('message', {
                    text: previousName + ' is now know as ' + name + '.'
                });
            } else {
                socket.emit('nameResult', { //send errors to client if name is already registered
                    success: false,
                    message: 'That name is already in use.'
                });
            }
        }
    });
}

function handleMessageBroadcasting(socket){
    socket.on('message',function(message){
        socket.boardcast.to(message.room).emit('message',{
            text:nickNames[socket.id] + ': ' + message.text
        });
    });
}

function handleRoomJoining(socket){
    socket.on('join',function(room){
        socket.leave(currentRoom [socket.id]);
        joinRoom(socket,room.newRoom);
    });
}

function handleClientDisconnection(socket){
    socket.on('disconnect',function(){
        var nameIndex = namesUsed.indexOf(nickNames[socket.id]);
        delete namesUsed[nameIndex];
        delete nickNames[socket.id];
    });
}