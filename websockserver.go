package main

import (
	"fmt"
	"net/http"
	"code.google.com/p/go.net/websocket"
	"strings"
)

// ===================
// C O N N E C T I O N
// ===================

type connection struct {
	// The websocket connection.
	ws *websocket.Conn

	id string

	peer *connection

	// Buffered channel of outbound messages.
	send chan string
}

var connections map[string]*connection = make(map[string]*connection)

func (c *connection) reader() {
	for {
		var message string
		err := websocket.Message.Receive(c.ws, &message)
		if err != nil {
			break
		}

		fmt.Println(c.id + ".reader(): " + message)

		if (c.peer != nil) {

			c.peer.send <- message

		} else {

			if len(message) > 7 {
				if message[0:8] == "connect:" {
					connectParts := strings.Split(message, ":")
					if len(connectParts) == 3 {
						c.id = connectParts[1]
						connections[c.id] = c

						c.peer = connections[connectParts[2]]
					}
				}
			}

		}

	}
	c.ws.Close()
}

func (c *connection) writer() {
	for {
		message := <- c.send
		fmt.Println(c.id + ".writer(): " + message)
		err := websocket.Message.Send(c.ws, message)
		if err != nil {
			break
		}
	}
	c.ws.Close()
}

// =======
// M A I N
// =======

func wsHandler(ws *websocket.Conn) {
	fmt.Println("NEW WEBSOCKET!");
	c := &connection{send: make(chan string, 256), ws: ws}
	go c.writer()
	c.reader()
}

func main() {
	http.Handle("/", websocket.Handler(wsHandler));
	http.ListenAndServe(":8000", nil)
}
