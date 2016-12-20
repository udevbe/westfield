package org.freedesktop.westfield.server;


public abstract class WResource<T> {
    private final WClient client;
    private final int     id;
    private final T       implementation;

    public WResource(final WClient client,
                     final int id,
                     final T implementation) {
        this.client = client;
        this.id = id;
        this.implementation = implementation;

        client.registerResource(this.id,
                                this);
    }

    public void destroy() {
        this.client.unregisterResource(this.id);
    }

    public T getImplementation() {
        return this.implementation;
    }

    public WClient getClient() {
        return this.client;
    }

    @Override
    public boolean equals(final Object o) {
        if (this == o) { return true; }
        if (o == null || getClass() != o.getClass()) { return false; }

        final WResource<?> wResource = (WResource<?>) o;

        if (this.id != wResource.id) { return false; }
        return this.client != null ? this.client.equals(wResource.client) : wResource.client == null;
    }

    @Override
    public int hashCode() {
        int result = this.client != null ? this.client.hashCode() : 0;
        result = 31 * result + this.id;
        return result;
    }

    int getId() {
        return id;
    }
}
