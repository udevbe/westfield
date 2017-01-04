package org.freedesktop.westfield.server.example;

import org.freedesktop.westfield.server.WClient;
import org.freedesktop.westfield.server.WConnection;
import org.glassfish.grizzly.http.HttpRequestPacket;
import org.glassfish.grizzly.websockets.DataFrame;
import org.glassfish.grizzly.websockets.DefaultWebSocket;
import org.glassfish.grizzly.websockets.ProtocolHandler;
import org.glassfish.grizzly.websockets.WebSocketListener;

import java.nio.ByteBuffer;


public class ExampleWS extends DefaultWebSocket {
    private       WClient     wClient;
    private final WConnection wConnection;

    public ExampleWS(final WConnection wConnection,
                     final ProtocolHandler protocolHandler,
                     final HttpRequestPacket request,
                     final WebSocketListener... listeners) {
        super(protocolHandler,
              request,
              listeners);
        this.wConnection = wConnection;
    }

    @Override
    public void onConnect() {
        super.onConnect();
        this.wClient = wConnection.create(message -> {
            final int limit = message.limit();
            byte[]    data  = new byte[limit];
            message.rewind();
            message.get(data);
            send(data);
        });
    }

    @Override
    public void onMessage(final byte[] data) {
        this.wClient.on(ByteBuffer.wrap(data));
        super.onMessage(data);
    }

    @Override
    public void onMessage(final String text) {
        this.wClient.on(text);
        super.onMessage(text);
    }

    @Override
    public void onClose(final DataFrame frame) {
        if (state.get() == State.CLOSED) {
            setClosed();
            System.out.println(String.format("Client connection %s closed.",
                                             getUpgradeRequest().getRemoteAddr()));
            this.wClient.onClose();
        }
        super.onClose(frame);
    }

    public WClient getClient() {
        return wClient;
    }
}
