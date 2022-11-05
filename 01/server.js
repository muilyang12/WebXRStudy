const express = require("express");
const livereload = require("livereload");
const connectLiveReload = require("connect-livereload");

const liveServer = livereload.createServer({
    // 변경시 다시 로드할 파일 확장자들 설정
    exts: ['html', 'css', 'js'],
    debug: true
});
liveServer.watch(__dirname);

const server = express();
server.use(connectLiveReload());
server.use(express.static(__dirname + "/dist"));

server.get("/", (req, res) => {
    res.sendFile(__dirname + "/dist/index.html");
});

server.listen(5555, (err) => {
    console.log("The server is listening on port 5555");
});