package org.freedesktop.westfield.server.example;


import org.eclipse.jetty.server.Server;
import org.eclipse.jetty.servlet.DefaultServlet;
import org.eclipse.jetty.servlet.ServletContextHandler;
import org.eclipse.jetty.servlet.ServletHolder;
import org.eclipse.jetty.websocket.jsr356.server.deploy.WebSocketServerContainerInitializer;
import org.freedesktop.westfield.server.WConnection;

import javax.servlet.ServletException;
import javax.websocket.DeploymentException;
import javax.websocket.server.ServerContainer;
import java.net.URL;
import java.util.Objects;

public class EntryPoint {
    public static void main(final String[] args) throws ServletException, DeploymentException {
        final Server server = new Server(8080);

        final ServletContextHandler context = new ServletContextHandler(ServletContextHandler.SESSIONS);
        context.setContextPath("/");
        server.setHandler(context);

        // Add javax.websocket support
        final ServerContainer container = WebSocketServerContainerInitializer.configureContext(context);

        // Add endpoint to server container
        //TODO use a configuration that reuses the same wconnection class for each incoming connection.
        //container.addEndpoint(WConnection.class);

        // Add default servlet (to serve the html/css/js)
        // Figure out where the static files are stored.
        final URL urlStatics = Thread.currentThread()
                                     .getContextClassLoader()
                                     .getResource("index.html");
        Objects.requireNonNull(urlStatics,
                               "Unable to find index.html in classpath");
        final String urlBase = urlStatics.toExternalForm()
                                         .replaceFirst("/[^/]*$",
                                                       "/");
        final ServletHolder defHolder = new ServletHolder("default",
                                                          new DefaultServlet());
        defHolder.setInitParameter("resourceBase",
                                   urlBase);
        defHolder.setInitParameter("dirAllowed",
                                   "true");
        context.addServlet(defHolder,
                           "/");

        try {
            server.start();
            server.join();
        }
        catch (final Exception e) {
            e.printStackTrace();
        }

    }
}
