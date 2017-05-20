package org.freedesktop.westfield.server;


import java.nio.ByteBuffer;
import java.util.Map;

public class DummyWResource extends Resource<DummyImplementation> {

    public DummyWResource(final Client client,
                          final int version,
                          final int id,
                          final DummyImplementation implementation) {
        super(client,
              version,
              id,
              implementation);
        this.requests = new Request[]{
                null,
                this::$1,
                this::$2,
                };
    }

    private void $1(final ByteBuffer message,
                    final Map<Integer, Resource<?>> objects) {
        getImplementation().foo();
    }

    private void $2(final ByteBuffer message,
                    final Map<Integer, Resource<?>> objects) {
        getImplementation().bar();
    }
}
