const appInsights = require("applicationinsights");
appInsights.setup("a7fdc860-79a3-4596-8acd-de92a55e21d2");
appInsights.start();

const http = require('https');
const fs = require('fs');
const port = process.env.PORT || 443;
const SSLOption = {  
    key: fs.readFileSync('./key.pem'),  
    cert: fs.readFileSync('./server.crt')
};  
function onListen(req, res) {res.end('Hello there!')};
const server = http.createServer(SSLOption, onListen);

const io = require('socket.io')(server, {path: '/'});
let socketNumber = 0;
let voting = false;
let agree = 0, disagree = 0;
let lineList = [];
io.on('connection', function(socket){
	++socketNumber;
	let voted = false;
	io.emit('welcum', socketNumber);
	for (const line of lineList) {
		socket.emit('draw', line);
	}
	if (voting) {
		socket.emit('vote clear');
		socket.emit('someone voted', {agree, disagree});
	}
	console.log('People: ', socketNumber);
	socket.on('draw', function(line) {
		if (line.size < 2 || line.size > 24) return;
		lineList.push(line);
		socket.broadcast.emit('draw', line);
	});
	socket.on('clear', function() {
		if (voting) return;
		if (socketNumber < 2) io.emit('clear');
		else {
			voting = true;
			++agree;
			voted = true;
			socket.broadcast.emit('vote clear');
		};
	});
	socket.on('vote clear', function(isAgree) {
		if (voted) return;
		voted = true;
		if (isAgree) ++agree;
		else ++disagree;
		io.emit('someone voted', {agree, disagree});
		if (endVote(socketNumber, agree, disagree)) {
			onCleared();
		}
	});
	socket.on('cleared', onCleared);
	socket.on('disconnecting', function() {
		console.log('People: ', --socketNumber);
		if (voting && endVote(socketNumber, agree, disagree)) {
			onCleared();
		}
	});
	function onCleared() {
		agree = 0;
		disagree = 0;
		voting = false;
		voted = false;
	}
});
function endVote(socketNumber, agree, disagree) {
	console.log(socketNumber, agree, disagree);
	if (agree * 2 > socketNumber) {
		agree = 1; disagree = 0;
		io.emit('clear');
		lineList.length = 0;
		return true;
	}
	else if (disagree * 2 >= socketNumber) {
		agree = 1; disagree = 0;
		io.emit('not clear');
		return true;
	} 
	return false;
}
server.listen(port, function(err) {
  if (err) {
    return console.log('something bad happened', err);
  }
  console.log(`Server is listening on ${port}`);
});