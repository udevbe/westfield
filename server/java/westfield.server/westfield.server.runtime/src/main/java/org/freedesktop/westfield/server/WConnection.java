package org.freedesktop.westfield.server;

import javax.websocket.CloseReason;
import javax.websocket.OnClose;
import javax.websocket.OnError;
import javax.websocket.OnOpen;
import javax.websocket.Session;
import javax.websocket.server.ServerEndpoint;
import java.io.IOException;
import java.nio.ByteBuffer;
import java.util.Collection;
import java.util.HashMap;
import java.util.Map;

@ServerEndpoint("/westfield")
public class WConnection {

    private static final String SUBPROTOCOL = "westfield";

    private final WRegistry             registry = new WRegistry();
    private final Map<Session, WClient> wClients = new HashMap<>();

    /*
     * IDs allocated by the client are in the range [1, 0xfeffffff] while IDs allocated by the server are
     * in the range [0xff000000, 0xffffffff]. The 0 ID is reserved to represent a null or non-existant object
     */
    private int nextId = 0xff000000;

    int nextId() {
        return ++this.nextId;
    }

    @OnOpen
    public void onOpen(final Session session) throws IOException {
        if (!session.getNegotiatedSubprotocol()
                    .equals(SUBPROTOCOL)) {
            session.close(new CloseReason(CloseReason.CloseCodes.PROTOCOL_ERROR,
                                          String.format("Expected SUBPROTOCOL '%s'",
                                                        SUBPROTOCOL)));
            return;
        }

        //non jumbo MTU is 1500, minus headers and such that would be ~1450 for a tcp packet, so 1024 should definitely fit in a single ethernet frame using a websocket.
        session.setMaxBinaryMessageBufferSize(1024);

        final WClient client = new WClient(session);
        session.addMessageHandler(String.class,
                                  client::on);
        session.addMessageHandler(ByteBuffer.class,
                                  client::on);
        this.wClients.put(session,
                          client);

        this.registry.publishGlobals(this.registry.createResource(client));
    }

    @OnError
    public void onError(final Throwable t,
                        final Session session) {
        this.wClients.get(session)
                     .on(t);
    }

    @OnClose
    public void onClose(final Session session) {
        this.wClients.remove(session)
                     .onClose();
    }

    public Collection<WClient> getClients() {
        return this.wClients.values();
    }

    public WRegistry getRegistry() {
        return this.registry;
    }
}
