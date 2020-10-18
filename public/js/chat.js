const socket = io();

const $messageForm = document.querySelector('#form');
const $messageFormInput = $messageForm.querySelector('input');
const $messageFormButton = $messageForm.querySelector('button');
const $messageFormLocationButton = document.querySelector('#send-location');
const $messages = document.querySelector('#messages');
const $sidebar = document.querySelector('#sidebar');

const messageTemplate = document.querySelector('#message-template').innerHTML;
const locationTemplate = document.querySelector('#location-template').innerHTML;
const sidebarTemplate = document.querySelector('#sidebar-template').innerHTML;

const { username, room } = Qs.parse(location.search, { ignoreQueryPrefix: true });

const autoscroll = () => {
    const $newMessage = $messages.lastElementChild;
    const newMessageStyles = getComputedStyle($newMessage);
    const newMessageMargin = parseInt(newMessageStyles.marginBottom);
    const newMessageHeight = $newMessage.offsetHeight + newMessageMargin;

    const visibleHeight = $messages.offsetHeight;

    const contentHeight = $messages.scrollHeight;
    const scrollOffset = $messages.scrollTop + visibleHeight;

    if (contentHeight - newMessageHeight <= scrollOffset) {
        $messages.scrollTop = $messages.scrollHeight;
    }
}

socket.on('message', (message) => {
    console.log(message);
    const html = Mustache.render(messageTemplate, {
        username: message.username,
        message: message.text,
        createdAt: moment(message.createdAt).format('HH:mm:ss a')
    });
    $messages.insertAdjacentHTML('beforeend', html);
    autoscroll();
});

socket.on('locationMessage', (message) => {
    console.log(message);
    const html = Mustache.render(locationTemplate, {
        username: message.username,
        location: message.url,
        createdAt: moment(message.createdAt).format('HH:mm:ss a')
    });
    $messages.insertAdjacentHTML('beforeend', html);
    autoscroll();
});

socket.on('roomData', ({room, users}) => {
    const html = Mustache.render(sidebarTemplate, {
        room,
        users
    });
    $sidebar.innerHTML = html;
});

$messageForm.addEventListener('submit', (e) => {
    e.preventDefault();

    $messageFormButton.setAttribute('disabled', 'disabled');

    socket.emit('sendMessage', $messageFormInput.value, (error) => {
        $messageFormButton.removeAttribute('disabled');
        if (error) {
            return console.log('Error: ', error);
        }
        $messageFormInput.value = '';
        $messageFormInput.focus();

        console.log('Message delivered!');
    });
    
});

$messageFormLocationButton.addEventListener('click', () => {
    if (!navigator.geolocation) {
        return alert('Geolocation is not supported by your browser');
    }
    $messageFormLocationButton.setAttribute('disabled', 'disabled');

    navigator.geolocation.getCurrentPosition( (position) => {
        socket.emit('sendLocation', {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
        }, () => {
            $messageFormLocationButton.removeAttribute('disabled');
            console.log('Location shared!');
        })
    })
});

socket.emit('join', { username, room }, (error) => {
    if (error) {
        alert(error);
        location.href = '/';
    }
});
