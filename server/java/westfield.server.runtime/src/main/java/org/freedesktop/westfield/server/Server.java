package org.freedesktop.westfield.server;

import java.util.Collection;
import java.util.HashSet;
import java.util.Set;

public class Server {

    public static final String SUBPROTOCOL = "westfield";

    private final Registry    registry = new Registry();
    private final Set<Client> wClients = new HashSet<>();

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
    public Client create(final Sender sender) {
        final Client client = new Client(this,
                                         sender);
        this.wClients.add(client);
        return client;
    }

    public Collection<Client> getClients() {
        return this.wClients;
    }

    public Registry getRegistry() {
        return this.registry;
    }
}
