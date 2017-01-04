package org.freedesktop.westfield.server;

import java.nio.ByteBuffer;
import java.nio.ByteOrder;
import java.util.Collection;
import java.util.HashMap;
import java.util.Map;

public class WClient {

    private final Map<Integer, WResource<?>> objects = new HashMap<>(1024);
    private final WServer wServer;
    private final WSender sender;

    WClient(final WServer wServer,
            WSender sender) {
        this.wServer = wServer;
        this.sender = sender;
    }

    void marshall(final ByteBuffer byteBuffer) {
        this.sender.send(byteBuffer);
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
        this.wServer.getClients()
                    .remove(this);
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
}
