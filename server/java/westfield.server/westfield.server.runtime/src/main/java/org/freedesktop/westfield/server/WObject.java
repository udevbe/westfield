package org.freedesktop.westfield.server;


public class WObject {
    private final int id;
    private final Object resource;

    public WObject(final int id,
                   final Object resource) {
        this.id = id;
        this.resource = resource;
    }

    public int getId() {
        return id;
    }

    public Object getResource() {
        return resource;
    }
}
