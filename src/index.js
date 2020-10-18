const express = require('express');
const http = require('http');
const path = require('path');
const socketio = require('socket.io');
const Filter = require('bad-words');
const { generateMessage, generateLocationMessage } = require('./utils/messages');
const { addUser, removeUser, getUser, getUsersInRoom } = require('./utils/users');

const app = express();
const server = http.createServer(app);
const io = socketio(server);

const publicDirectoryPath = path.join(__dirname, '../public');

const port = process.env.PORT || 3000;

app.use(express.static(publicDirectoryPath));


io.on('connection', (socket) => {
    console.log('New websocket connection');

    socket.on('sendMessage', (text, callback) => {
        const filter = new Filter();

        if(filter.isProfane(text)) {
            return callback('Profanity alert!')
        }

        const user = getUser(socket.id);
        io.to(user.room).emit('message', generateMessage(user.username, text));
        callback();
    });

    socket.on('sendLocation', (location, callback) => {
        const user = getUser(socket.id);
        console.log(user);
        io.to(user.room).emit('locationMessage', generateLocationMessage( user.username, `https://google.com/maps?q=${location.latitude},${location.longitude}`));
        callback();
    });

    // socket.emit, io.emit, socket.broadcast.emit
    // io.to(room).emit, socket.broadcast.to(room).emit

    socket.on('join', ( {username, room}, callback) => {
        const {error, user} = addUser( { id: socket.id, username, room } );

        if (error) {
            return callback(error);
        }

        socket.join(user.room)
        socket.emit('message', generateMessage('Admin', `Welcome ${user.username}!`));
        socket.broadcast.to(user.room).emit('message', generateMessage('Admin', `${user.username} arrived`));
        io.to(user.room).emit('roomData', {
            room: user.room,
            users: getUsersInRoom(user.room)
        });

        callback();
    });

    socket.on('disconnect', () => {
        const user = removeUser(socket.id);
        if (user) {
            io.to(user.room).emit('message', generateMessage('Admin', `${user.username} has left ${user.room} room`));
            io.to(user.room).emit('roomData', {
                room: user.room,
                users: getUsersInRoom(user.room)
            });
        };
    });

});

server.listen(port, ()=> {
    console.log(`Starting app in port port ${port}`);
});
