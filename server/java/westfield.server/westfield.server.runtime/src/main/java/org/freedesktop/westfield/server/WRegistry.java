package org.freedesktop.westfield.server;


import java.util.HashMap;
import java.util.HashSet;
import java.util.Map;
import java.util.Set;

public class WRegistry implements WRegistryRequests {

    private final Set<WRegistryResource> wRegistryResources = new HashSet<>();

    private final Map<Integer, WGlobal> globals = new HashMap<>();

    WRegistry() {}

    @Override
    public void bind(final WRegistryResource wRegistryResource,
                     final int id,
                     final int version) {
        this.globals.get(id)
                    .bindClient(wRegistryResource.getClient(),
                                id,
                                version);
    }

    public void register(final WGlobal global) {
        if (this.globals.put(global.getId(),
                             global) == null) {
            this.wRegistryResources.forEach(wRegistryResource -> wRegistryResource.global(global.getId(),
                                                                                          global.getInterfaceName(),
                                                                                          global.getVersion()));
        }
    }

    public void unregister(final WGlobal global) {
        if (this.globals.remove(global.getId()) != null) {
            this.wRegistryResources.forEach(wRegistryResource -> wRegistryResource.global(global.getId(),
                                                                                          global.getInterfaceName(),
                                                                                          global.getVersion()));
        }
    }

    void publishGlobals(final WRegistryResource wRegistryResource) {
        this.globals.values()
                    .forEach(global -> wRegistryResource.global(global.getId(),
                                                                global.getInterfaceName(),
                                                                global.getVersion()));
    }

    WRegistryResource createResource(final WClient client) {
        final WRegistryResource wRegistryResource = new WRegistryResource(client,
                                                                          1,
                                                                          this);
        this.wRegistryResources.add(wRegistryResource);
        return wRegistryResource;
    }
}
