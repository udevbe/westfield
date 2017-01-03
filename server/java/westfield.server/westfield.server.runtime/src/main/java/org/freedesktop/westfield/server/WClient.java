package org.freedesktop.westfield.server;

import javax.websocket.Session;
import java.io.IOException;
import java.nio.ByteBuffer;
import java.nio.ByteOrder;
import java.util.Collection;
import java.util.HashMap;
import java.util.Map;

public class WClient {

    private final Map<Integer, WResource<?>> objects = new HashMap<>(1024);
    private final Session session;

    WClient(final Session session) throws IOException {
        this.session = session;
        //non jumbo MTU is 1500, minus headers and such that would be ~1450 for a tcp packet, so 1024 should definitely fit in a single ethernet frame using a websocket.
        this.session.setMaxBinaryMessageBufferSize(1024);
        this.session.getAsyncRemote()
                    .setBatchingAllowed(true);
    }

    void marshall(final ByteBuffer byteBuffer) {
        this.session.getAsyncRemote()
                    .sendBinary(byteBuffer);
    }

    private void unmarshall(final ByteBuffer message) {
        final int          objectId  = message.getInt();
        final WResource<?> wResource = this.objects.get(objectId);
        final short        size      = message.getShort();//not used
        final short        opcode    = message.getShort();
        wResource.requests[opcode].request(message,
                                           this.objects);
    }

    public void on(final ByteBuffer message) {
        message.order(ByteOrder.nativeOrder());
        unmarshall(message);
    }

    public void on(final String message) {

    }

    public void on(final Throwable t) {

    }

    public void onClose() {

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
