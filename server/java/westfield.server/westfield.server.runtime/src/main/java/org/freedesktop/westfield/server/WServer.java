package org.freedesktop.westfield.server;

import java.util.Collection;
import java.util.HashSet;
import java.util.Set;

public class WServer {

    public static final String SUBPROTOCOL = "westfield";

    private final WRegistry    registry = new WRegistry();
    private final Set<WClient> wClients = new HashSet<>();

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
     * @param sender
     *
     * @return
     */
    public WClient create(final WSender sender) {
        final WClient client = new WClient(this,
                                           sender);
        this.wClients.add(client);
        return client;
    }

    public Collection<WClient> getClients() {
        return this.wClients;
    }

    public WRegistry getRegistry() {
        return this.registry;
    }
}
