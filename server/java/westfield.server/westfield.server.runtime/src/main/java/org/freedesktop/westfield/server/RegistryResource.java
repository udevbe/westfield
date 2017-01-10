package org.freedesktop.westfield.server;


import java.nio.ByteBuffer;
import java.util.Map;

public class RegistryResource extends Resource<Registry> {

    public RegistryResource(final Client client,
                             final int id,
                             final Registry implementation) {
        super(client,
              1,
              id,
              implementation);
        this.requests = new Request[]{
                null,//reserved - opcode 0
                this::$1//bind - opcode 1
        };
    }

    public void global(final int name,
                       final String interface_,
                       final int version) {
        new Args(this,
                 1).arg(name)
                    .arg(interface_)
                    .arg(version)
                    .send();
    }

    public void globalRemove(final int name) {
        new Args(this,
                 2).arg(name)
                    .send();
    }

    private void $1(final ByteBuffer message,
                    final Map<Integer, Resource<?>> objects) {
        final ArgsReader wArgsReader = new ArgsReader(message,
                                                      objects);
        getImplementation().bind(this,
                                 wArgsReader.readInt(),
                                 wArgsReader.readInt(),
                                 wArgsReader.readInt());
    }
}
