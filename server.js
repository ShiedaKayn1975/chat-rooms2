var http = require("http"); //Built-in http module provides HTTP server and client functionality

var fs = require("fs"); //Built-in fs module provides filesystem-related functionality 

var path = require("path"); //Built-in path module provides filesystem path-related functionality

var mime = require("mime"); //Add-on mime module provides ability to derive a MIME type based on filename extension

var cache = {}; //Cache object is where the contents of cached files are stored


//error response
//handle the sending of 404 errors when a file is requested that doesn't exist
function send404(response) {
    response.writeHead(404, {
        'Content-Type': 'text/plain'
    });
    response.write('Error 404,resource not found.');
    response.end();
}

//sending file data
//sends the contents of the file
function sendFile(response, filePath, fileContents) {
    response.writeHead(200, {
        "Content-Type": mime.lookup(path.basename(filePath))
    });
    response.end(fileContents);
}


function serverStatic(response, cache, absPath) {
    if (cache[absPath]) { // Check if file is cached in memory
        sendFile(response, absPath, cache[absPath]); //Serve file from memory
    } else {
        fs.exists(absPath, function (exists) { //check if file exists
            if (exists) {
                fs.readFile(absPath, function (err, data) { //read file from disk
                    if (err) {
                        send404(response);
                    } else {
                        cache[absPath] = data;
                        sendFile(response, absPath, data); //servr file read from disk
                    }
                });
            } else {
                send404(response); //send HTTP 404 response
            }
        });
    }
}

var server = http.createServer(function (req, res) { ///create HTTp server,using anonymous function to define per-request behavior 
    var filePath = false;
    if (req.url == '/') {
        filePath = "piblic/index.html"; //Determine HTML file to be server by default
    } else {
        filePath = 'public' + req.url;
    }

    var absPath = './' + filePath; //Translate URL path to relative file path

    serverStatic(res, cache, absPath); //serve static file

});


var chatServer = require('./lib/chat_server');
chatServer.listen(server)

server.listen(3000,function(){
    console.log("Server listening on port 3000.");
});

