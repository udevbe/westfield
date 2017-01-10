package org.freedesktop.westfield.server;


import java.util.HashMap;
import java.util.HashSet;
import java.util.Map;
import java.util.Set;

public class Registry {

    private final Set<RegistryResource> registryResources = new HashSet<>();
    private final Map<Integer, Global>  globals           = new HashMap<>();

    Registry() {}

    void bind(final RegistryResource resource,
              final int name,
              final int id,
              final int version) {
        this.globals.get(name)
                    .bindClient(resource.getClient(),
                                id,
                                version);
    }

    public void register(final Global global) {
        if (this.globals.put(global.hashCode(),
                             global) == null) {
            this.registryResources.forEach(registryResource -> registryResource.global(global.hashCode(),
                                                                                          global.getInterfaceName(),
                                                                                          global.getVersion()));
        }
    }

    public void unregister(final Global global) {
        if (this.globals.remove(global.hashCode()) != null) {
            this.registryResources.forEach(registryResource -> registryResource.global(global.hashCode(),
                                                                                          global.getInterfaceName(),
                                                                                          global.getVersion()));
        }
    }

    void publishGlobals(final RegistryResource registryResource) {
        this.globals.entrySet()
                    .forEach(entry -> {
                        final int    name   = entry.getKey();
                        final Global global = entry.getValue();
                        registryResource.global(name,
                                                 global.getInterfaceName(),
                                                 global.getVersion());
                    });
    }

    RegistryResource createResource(final Client client) {
        final RegistryResource registryResource = new RegistryResource(client,
                                                                          1,
                                                                          this);
        this.registryResources.add(registryResource);
        return registryResource;
    }
}
