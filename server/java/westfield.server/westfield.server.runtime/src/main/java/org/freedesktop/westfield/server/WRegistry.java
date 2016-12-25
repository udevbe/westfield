package org.freedesktop.westfield.server;


import java.util.HashMap;
import java.util.HashSet;
import java.util.Map;
import java.util.Set;

public class WRegistry {

    private final Set<WRegistryResource> wRegistryResources = new HashSet<>();
    private final Map<Integer, WGlobal>  globals            = new HashMap<>();

    WRegistry() {}

    public void bind(final WRegistryResource resource,
                     final int name,
                     final int id,
                     final int version) {
        this.globals.get(name)
                    .bindClient(resource.getClient(),
                                id,
                                version);
    }

    public void register(final WGlobal global) {
        if (this.globals.put(global.hashCode(),
                             global) == null) {
            this.wRegistryResources.forEach(wRegistryResource -> wRegistryResource.global(global.hashCode(),
                                                                                          global.getInterfaceName(),
                                                                                          global.getVersion()));
        }
    }

    public void unregister(final WGlobal global) {
        if (this.globals.remove(global.hashCode()) != null) {
            this.wRegistryResources.forEach(wRegistryResource -> wRegistryResource.global(global.hashCode(),
                                                                                          global.getInterfaceName(),
                                                                                          global.getVersion()));
        }
    }

    void publishGlobals(final WRegistryResource wRegistryResource) {
        this.globals.entrySet()
                    .forEach(entry -> {
                        final int     name   = entry.getKey();
                        final WGlobal global = entry.getValue();
                        wRegistryResource.global(name,
                                                 global.getInterfaceName(),
                                                 global.getVersion());
                    });
    }

    WRegistryResource createResource(final WClient client) {
        final WRegistryResource wRegistryResource = new WRegistryResource(client,
                                                                          1,
                                                                          this);
        this.wRegistryResources.add(wRegistryResource);
        return wRegistryResource;
    }
}
