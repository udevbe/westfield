package org.freedesktop.westfield.server;


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
}
