package org.freedesktop.westfield.server.example;


import org.freedesktop.westfield.server.WClient;
import org.freedesktop.westfield.server.WGlobal;

public class ExampleGlobal extends WGlobal implements ExampleGlobalRequests {

    public ExampleGlobal() {
        super(ExampleGlobal.class.getSimpleName(),
              1);
    }

    @Override
    public void bindClient(final WClient client,
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
        new ExampleClockResource(resource.getClient(),
                                 resource.getVersion(),
                                 id,
                                 new ExampleClockRequests() {});
    }
}
