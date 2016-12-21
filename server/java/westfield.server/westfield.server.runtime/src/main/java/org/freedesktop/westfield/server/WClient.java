package org.freedesktop.westfield.server;


import javax.websocket.Session;
import java.io.IOException;
import java.nio.ByteBuffer;
import java.util.Collection;
import java.util.HashMap;
import java.util.Map;

public class WClient {

    private final Map<Integer, WResource> objects = new HashMap<>();

    private final Session session;


    WClient(final Session session) {
        this.session = session;
    }

    public void marshall(WArgs messsage) {
        session.getAsyncRemote()
               .sendBinary(messsage.toWireMessage());
    }

    private void unmarshall(final ByteBuffer message) {

    }

    void on(final String message) {

    }

    void on(final ByteBuffer message) {
        unmarshall(message);
    }

    void on(final Throwable t) {

    }

    void onClose() {

    }

    public Session getSession() {
        return this.session;
    }

    public Collection<WResource> getResources() {
        return this.objects.values();
    }

    void registerResource(final int id,
                          final WResource<?> resource) {
        this.objects.put(id,
                         resource);
    }

    void unregisterResource(final int id) {
        this.objects.remove(id);
    }

    void flush() throws IOException {
        session.getAsyncRemote()
               .flushBatch();
    }
}
