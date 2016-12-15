package org.freedesktop.westfield.server;


import javax.websocket.Session;
import java.nio.ByteBuffer;
import java.util.HashMap;
import java.util.Map;

public class WSession {

    private final Map<Integer, WObject> clientWObjects = new HashMap<>();

    private final Session session;


    public WSession(final Session session) {
        this.session = session;
    }

    public void unmarshall(final ByteBuffer message) {

    }

    public void on(final String message) {

    }

    public void on(final ByteBuffer message) {
        //TODO unmarshall
    }

    public void on(final Throwable t) {

    }

    public Session getSession() {
        return session;
    }

    public void onClose() {

    }
}
