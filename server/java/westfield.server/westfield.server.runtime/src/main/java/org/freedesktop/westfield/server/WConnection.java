package org.freedesktop.westfield.server;

import javax.websocket.Session;
import java.io.IOException;
import java.util.Collection;
import java.util.HashMap;
import java.util.Map;

public class WConnection {

    public static final String SUBPROTOCOL = "westfield";

    private final WRegistry             registry = new WRegistry();
    private final Map<Session, WClient> wClients = new HashMap<>();

    /*
     * IDs allocated by the client are in the range [1, 0xfeffffff] while IDs allocated by the server are
     * in the range [0xff000000, 0xffffffff]. The 0 ID is reserved to represent a null or non-existant object
     */
    private int nextId = 0xff000000;

    public int nextId() {
        return ++this.nextId;
    }

    /**
     * Create a new client and publish globals.
     *
     * @param session
     *
     * @return
     *
     * @throws IOException
     */
    public WClient create(final Session session) throws IOException {
        final WClient client = new WClient(session);

        this.wClients.put(session,
                          client);
        this.registry.publishGlobals(this.registry.createResource(client));

        return client;
    }

    public Collection<WClient> getClients() {
        return this.wClients.values();
    }

    public WRegistry getRegistry() {
        return this.registry;
    }
}
