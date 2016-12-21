package org.freedesktop.westfield.server;


import java.nio.ByteBuffer;
import java.util.Map;

public class WRegistryResource extends WResource<WRegistryRequests> {

    public WRegistryResource(final WClient client,
                             final int id,
                             final WRegistryRequests implementation) {
        super(client,
              id,
              implementation);
    }

    public void global(final int name,
                       final String interface_,
                       final int version) {
        getClient().marshall(new WArgs(this,
                                       1).arg(name)
                                         .arg(interface_)
                                         .arg(version));
    }

    public void globalRemove(final int name) {
        getClient().marshall(new WArgs(this,
                                       2).arg(name));
    }

    private void $1(ByteBuffer message,
                    Map<Integer, WResource> objects) {
        WArgsReader wArgsReader = new WArgsReader(message,
                                                  objects);
        getImplementation().bind(this,
                                 wArgsReader.readInt(),
                                 wArgsReader.readInt(),
                                 wArgsReader.readInt());
    }
}
