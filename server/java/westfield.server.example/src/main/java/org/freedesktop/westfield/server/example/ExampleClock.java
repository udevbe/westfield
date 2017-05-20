package org.freedesktop.westfield.server.example;


import org.freedesktop.westfield.server.Client;

import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;

public class ExampleClock implements ExampleClockRequests {

    private ScheduledExecutorService scheduledExecutorService = Executors.newSingleThreadScheduledExecutor();

    private final CopyOnWriteArrayList<ExampleClockResource> exampleClockResources = new CopyOnWriteArrayList<>();

    public ExampleClock() {
        scheduledExecutorService.scheduleAtFixedRate(() -> exampleClockResources.forEach(exampleClockResource -> exampleClockResource.timeUpdate((int) System.currentTimeMillis())),
                                                     0,
                                                     1,
                                                     TimeUnit.MILLISECONDS);
    }

    public ExampleClockResource createResource(Client client,
                                               int version,
                                               int id) {
        final ExampleClockResource exampleClockResource = new ExampleClockResource(client,
                                                                                   version,
                                                                                   id,
                                                                                   this);
        exampleClockResources.add(exampleClockResource);
        return exampleClockResource;
    }
}
