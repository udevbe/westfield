package org.freedesktop.westfield.server.example;

import org.freedesktop.westfield.server.WServer;
import org.glassfish.grizzly.http.HttpRequestPacket;
import org.glassfish.grizzly.websockets.ProtocolHandler;
import org.glassfish.grizzly.websockets.WebSocket;
import org.glassfish.grizzly.websockets.WebSocketApplication;
import org.glassfish.grizzly.websockets.WebSocketListener;


public class ExampleWSApplication extends WebSocketApplication {

    private final WServer wServer;

    public ExampleWSApplication(WServer wServer) {
        this.wServer = wServer;
    }

    @Override
    public WebSocket createSocket(final ProtocolHandler handler,
                                  final HttpRequestPacket requestPacket,
                                  final WebSocketListener... listeners) {

        System.out.println(String.format("New client connection from %s",
                                         requestPacket.getRemoteAddress()));

        return new ExampleWS(this.wServer,
                             handler,
                             requestPacket,
                             listeners);
    }
}
