package org.freedesktop.westfield.server;

import javax.websocket.OnClose;
import javax.websocket.OnError;
import javax.websocket.OnOpen;
import javax.websocket.Session;
import javax.websocket.server.ServerEndpoint;
import java.io.IOException;
import java.nio.ByteBuffer;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

@ServerEndpoint("/westfield")
public class WConnection {

    private final AtomicInteger nextId = new AtomicInteger(0);

    private final Map<Session, WSession> wSessions = new ConcurrentHashMap<>();

    private final WRegistry wRegistry;

    public WConnection() {
        this.wRegistry = new WRegistry();
    }

    @OnOpen
    public void onOpen(Session session) throws IOException {
        //TODO notify the other end of available globals.
        //this.wRegistry.

        final WSession wSession = new WSession(session);
        session.addMessageHandler(String.class,
                                  wSession::on);
        session.addMessageHandler(ByteBuffer.class,
                                  wSession::on);
        wSessions.put(session,
                      wSession);
    }


    @OnError
    public void onError(Throwable t,
                        Session session) {
        wSessions.get(session)
                 .on(t);
    }

    @OnClose
    public void onClose(Session session) {
        wSessions.get(session)
                 .onClose();
    }

    public WRegistry getwRegistry() {
        return wRegistry;
    }
}
