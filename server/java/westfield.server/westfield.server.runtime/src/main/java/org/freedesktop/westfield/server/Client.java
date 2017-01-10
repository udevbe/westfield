package org.freedesktop.westfield.server;

import java.nio.ByteBuffer;
import java.nio.ByteOrder;
import java.util.Collection;
import java.util.HashMap;
import java.util.Map;

public class Client {

    private final Map<Integer, Resource<?>> objects = new HashMap<>(1024);
    private final Server wServer;
    private final Sender sender;

    Client(final Server wServer,
           Sender sender) {
        this.wServer = wServer;
        this.sender = sender;
    }

    void marshall(final ByteBuffer byteBuffer) {
        this.sender.send(byteBuffer);
    }

    private void unmarshall(final ByteBuffer message) {
        final int         objectId  = message.getInt();
        final Resource<?> wResource = this.objects.get(objectId);
        final short       size      = message.getShort();//not used
        final short       opcode    = message.getShort();
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

    public Collection<Resource<?>> getResources() {
        return this.objects.values();
    }

    void registerResource(final Resource<?> resource) {
        this.objects.put(resource.getId(),
                         resource);
    }

    void unregisterResource(final Resource<?> resource) {
        this.objects.remove(resource.getId());
    }

    public void onConnect() {
        final Registry         registry         = this.wServer.getRegistry();
        final RegistryResource registryResource = registry.createResource(this);
        registry.publishGlobals(registryResource);
    }
}
