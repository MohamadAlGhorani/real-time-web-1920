# Real-Time Web @cmda-minor-web · 2019-2020
<img width="1280" alt="Screenshot 2020-05-04 at 13 17 29" src="https://user-images.githubusercontent.com/45425087/80960728-b756f280-8e09-11ea-9b5a-98d2cbfc07db.png">

## Concept Party 2020
Due to the current pandemic (COVID -19), throwing parties is no longer an option. People have to keep their distance to prevent the virus from spreading. That's why the idea of virtual parties could help people reduce the effect of social distancing and bring people together once again. Therefore I developt Party 2020 using the Spotify API. 
Party 2020 is an online web application that brings music lovers together. It is a virtual place where people can chat and listen to the same music just like in real life. Any Spotify Primum user can create or join a party. To create a party, users will have to log in using a Spotify premium account, that will enable them to choose a playlist that already exists in their Spotify app. This playlist will include all the tracks for the party and users will be able to listen to the tracks through their Spotify application on their own device. 
When someone creates a party, he/ she will be marked as the party host. From there the host can copy and share the party ID with other people. 
People who join a party using the party ID will be able to chat with other guests at that party, Listen to the same music, and even get the chance to be the DJ when getting permission from the host.

## Data life cycle
<img width="701" alt="Screenshot 2020-04-17 at 11 32 42" src="https://user-images.githubusercontent.com/45425087/79802132-bd57c880-835f-11ea-9893-94e36ea9f9e4.png">

## Real-time events
socket.emit("server message", msg){}) 
<hr/>

socket.on("join party", function (room, name) {})
- socket.to(room).broadcast.emit("server message", msg);
- socket.to(hostId).emit("getPosition"){})
- - socket.on("setPosition", function (room, token) {})
- socket.emit("get users");
- - socket.on("users list", function (room){}) 
- - - io.to(room).emit("online users", guestsInRoom, NumberOfguestsInRoom);
- - socket.on("rights", function (room, token){})
- - - - if(host)
- - - - - socket.broadcast.to(socket.id).emit("host", socket.id);
- - - - - socket.to(room).broadcast.emit("set host icon", socket.id);
- - - - if(guest)
- - - - - socket.emit("who host", hostId);
- - - - - socket.emit("who dj", djId);
- - - - - socket.emit("current playing", tracksData);
<hr/>

socket.on("chat message", function (msg, ranColor, room){}) 
- socket.to(room).broadcast.emit("chat message", msg, ranColor);
<hr/>

socket.on("dj", function (userId, room, userName){}) 
- socket.to(room).broadcast.emit("update dj", userId);
- socket.emit("update dj", userId);
- socket.to(room).broadcast.emit("delete dj");
- socket.broadcast.to(userId).emit("set dj");
- socket.to(room).emit("server message", msg);
- socket.emit("server message", msg);
- socket.broadcast.to(userId).emit("server message", msg);
<hr/>

socket.on("getSong", function (trackId, room) {})
- socket.emit("getTokens", trackId);
- socket.to(room).emit("getTokens", trackId);
- - socket.on("playSong", function (room, accessToken, trackId){})
- - -  if (response.status == 403)
- - - - socket.emit("server message", msg);
- - -  if (response.status == 404) 
- - - - socket.emit( "server message",msg);
- - socket.emit("current playing", trackData);
- - socket.to(room).broadcast.emit("current playing", tracksData);
<hr/>

socket.on("set volume", function (volume, token){}) 
<hr/>

socket.on("disconnected" function(){}) 
- socket.to(hostId).emit("getPosition"){})
- - socket.on("setPosition", function (room, token) {})
- socket.to(room).broadcast.emit("server message", msg);
- socket.to(room).emit("online users", leftUsers, leftUsersNumber);
<hr/>

## Installation
- Download [Node.js](https://nodejs.org/en/) if you don't have it. 
- Clone this repository.
- Navigate to the folder of the repository using your terminal.
- Write in your terminal ```npm install``` to download the node modules.
- Run ``` npm run dev ``` in your terminal to open the porject in your brwoser using localhost:3000/

## APi
I used [spotify](https://www.npmjs.com/package/spotify-web-api-node) api to get all the data about the users, their playlists and their tracks in the playlists.
If you want to use this API you have to ask for a accessToken that you can use to access the data.
This application uses a OAuth. Users most sign up with their spotify premium account to use this app with all features. 

## License
License is [MIT](https://github.com/MohamadAlGhorani/real-time-web-1920/blob/master/LICENSE) 
