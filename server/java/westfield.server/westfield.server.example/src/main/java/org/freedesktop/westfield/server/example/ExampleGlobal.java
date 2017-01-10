package org.freedesktop.westfield.server.example;


import org.freedesktop.westfield.server.Client;
import org.freedesktop.westfield.server.Global;

public class ExampleGlobal extends Global implements ExampleGlobalRequests {

    private final ExampleClock exampleClock = new ExampleClock();

    public ExampleGlobal() {
        super("example_global",
              1);
    }

    @Override
    public void bindClient(final Client client,
                           final int id,
                           final int version) {
        new ExampleGlobalResource(client,
                                  version,
                                  id,
                                  this);
    }

    @Override
    public void createExampleClock(final ExampleGlobalResource resource,
                                   final int id) {
        this.exampleClock.createResource(resource.getClient(),
                                         resource.getVersion(),
                                         id);
    }
}
