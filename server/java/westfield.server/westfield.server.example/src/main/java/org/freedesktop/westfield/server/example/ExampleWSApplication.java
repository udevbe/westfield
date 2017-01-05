package org.freedesktop.westfield.server.example;

import org.freedesktop.westfield.server.WClient;
import org.freedesktop.westfield.server.WServer;
import org.glassfish.grizzly.http.HttpRequestPacket;
import org.glassfish.grizzly.websockets.DataFrame;
import org.glassfish.grizzly.websockets.DefaultWebSocket;
import org.glassfish.grizzly.websockets.ProtocolHandler;
import org.glassfish.grizzly.websockets.WebSocket;
import org.glassfish.grizzly.websockets.WebSocketAdapter;
import org.glassfish.grizzly.websockets.WebSocketApplication;
import org.glassfish.grizzly.websockets.WebSocketListener;

import java.nio.ByteBuffer;


public class ExampleWSApplication extends WebSocketApplication {

    private final WServer wServer;

    public ExampleWSApplication(final WServer wServer) {
        this.wServer = wServer;
    }

    @Override
    public WebSocket createSocket(final ProtocolHandler handler,
                                  final HttpRequestPacket requestPacket,
                                  final WebSocketListener... listeners) {

        final DefaultWebSocket webSocket = new DefaultWebSocket(handler,
                                                                requestPacket,
                                                                listeners);

        final WClient wClient = this.wServer.create(message -> {
            final int    limit = message.limit();
            final byte[] data  = new byte[limit];
            message.rewind();
            message.get(data);
            webSocket.send(data);
        });

        webSocket.add(new WebSocketAdapter() {
            @Override
            public void onConnect(final WebSocket socket) {
                System.out.println(String.format("New client connection from %s",
                                                 webSocket.getUpgradeRequest()
                                                          .getRemoteAddr()));
                wClient.onConnect();
            }

            @Override
            public void onMessage(final WebSocket socket,
                                  final byte[] bytes) {
                wClient.on(ByteBuffer.wrap(bytes));
            }

            @Override
            public void onMessage(final WebSocket socket,
                                  final String text) {
                wClient.on(text);
            }

            @Override
            public void onClose(final WebSocket socket,
                                final DataFrame frame) {
                System.out.println(String.format("Client connection %s closed.",
                                                 webSocket.getUpgradeRequest()
                                                          .getRemoteAddr()));
                wClient.onClose();
            }
        });

        return webSocket;
    }
}
