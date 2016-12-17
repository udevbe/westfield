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
        //TODO marshall
        //getClient().getSession().getAsyncRemote().sendBinary()
    }

    public void globalRemove(final int name) {
        //TODO marshall
        //getClient().getSession().getAsyncRemote().sendBinary()
    }
}
