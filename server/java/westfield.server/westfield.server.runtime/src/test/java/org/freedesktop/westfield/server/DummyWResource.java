package org.freedesktop.westfield.server;


import java.nio.ByteBuffer;
import java.util.Map;

public class DummyWResource extends WResource<DummyImplementation> {

    public DummyWResource(final WClient client,
                          final int id,
                          final DummyImplementation implementation) {
        super(client,
              id,
              implementation);
        this.requestables = new Requestable[]{
                null,
                this::$1,
                this::$2,
                };
    }

    private void $1(final ByteBuffer message,
                    final Map<Integer, WResource<?>> objects) {
        getImplementation().foo();
    }

    private void $2(final ByteBuffer message,
                    final Map<Integer, WResource<?>> objects) {
        getImplementation().bar();
    }
}
