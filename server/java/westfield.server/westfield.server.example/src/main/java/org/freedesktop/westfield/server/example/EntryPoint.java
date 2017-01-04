package org.freedesktop.westfield.server.example;


import org.freedesktop.westfield.server.WConnection;
import org.freedesktop.westfield.server.WRegistry;
import org.glassfish.grizzly.PortRange;
import org.glassfish.grizzly.http.server.CLStaticHttpHandler;
import org.glassfish.grizzly.http.server.HttpServer;
import org.glassfish.grizzly.http.server.NetworkListener;
import org.glassfish.grizzly.http.server.ServerConfiguration;
import org.glassfish.grizzly.strategies.SameThreadIOStrategy;
import org.glassfish.grizzly.websockets.WebSocketAddOn;
import org.glassfish.grizzly.websockets.WebSocketEngine;

import java.io.IOException;
import java.util.Scanner;

public class EntryPoint {
    public static void main(final String[] args) throws InterruptedException, IOException {

        final HttpServer server = new HttpServer();

        final ServerConfiguration config = server.getServerConfiguration();
        config.addHttpHandler(new CLStaticHttpHandler(EntryPoint.class.getClassLoader(),
                                                      "/"));

        final NetworkListener listener = new NetworkListener("westfield",
                                                             "0.0.0.0",
                                                             new PortRange(8080));
        listener.setSecure(false);
        server.addListener(listener);

        final WebSocketAddOn addon = new WebSocketAddOn();
        listener.registerAddOn(addon);

        listener.getTransport()
                .setIOStrategy(SameThreadIOStrategy.getInstance());

        final WConnection    wConnection          = new WConnection();
        ExampleWSApplication exampleWSApplication = new ExampleWSApplication(wConnection);
        WebSocketEngine.getEngine()
                       .register("",
                                 "/westfield",
                                 exampleWSApplication);
        server.start();

        final WRegistry registry = wConnection.getRegistry();
        registry.register(new ExampleGlobal());

        //exit when user presses enter
        try (Scanner scan = new Scanner(System.in)) {
            scan.next();
        }
    }
}
