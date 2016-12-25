package org.freedesktop.westfield.server;


import javax.websocket.Session;
import java.io.IOException;
import java.lang.reflect.InvocationTargetException;
import java.nio.ByteBuffer;
import java.nio.ByteOrder;
import java.util.Collection;
import java.util.HashMap;
import java.util.Map;

public class WClient {

    private final Map<Integer, WResource<?>> objects = new HashMap<>();

    private final Session session;


    WClient(final Session session) {
        this.session = session;
    }

    public void marshall(final WArgs messsage) {
        this.session.getAsyncRemote()
                    .sendBinary(messsage.toWireMessage());
    }

    private void unmarshall(final ByteBuffer message) throws NoSuchMethodException, IllegalAccessException, InvocationTargetException {
        final int          objectId  = message.getInt();
        final WResource<?> wResource = this.objects.get(objectId);
        final short        size      = message.getShort();//not used
        final short        opcode    = message.getShort();
        wResource.dispatch(opcode,
                           message,
                           this.objects);
    }

    void on(final ByteBuffer message) {
        message.order(ByteOrder.LITTLE_ENDIAN);
        try {
            unmarshall(message);
        }
        catch (NoSuchMethodException |
                IllegalAccessException |
                InvocationTargetException e) {
            e.printStackTrace();
        }
    }

    void on(final String message) {

    }

    void on(final Throwable t) {

    }

    void onClose() {

    }

    public Collection<WResource<?>> getResources() {
        return this.objects.values();
    }

    void registerResource(final WResource<?> resource) {
        this.objects.put(resource.getId(),
                         resource);
    }

    void unregisterResource(final WResource<?> resource) {
        this.objects.remove(resource.getId());
    }

    public void flush() throws IOException {
        this.session.getAsyncRemote()
                    .flushBatch();
    }
}
