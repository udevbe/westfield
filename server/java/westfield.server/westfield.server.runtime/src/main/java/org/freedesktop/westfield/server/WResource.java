package org.freedesktop.westfield.server;

public abstract class WResource<T> {
    private final WClient client;
    private final int     version;
    private final int     id;
    private final T       implementation;

    protected Request[] requests;

    protected WResource(final WClient client,
                        final int version,
                        final int id,
                        final T implementation) {
        this.client = client;
        this.version = version;
        this.id = id;
        this.implementation = implementation;

        getClient().registerResource(this);
    }

    /**
     * Remove this resource for the client's pool of objects. Making it eligible for garbage collection.
     */
    public void destroy() {
        getClient().unregisterResource(this);
    }

    public <U extends T> U getImplementation() {
        return (U) this.implementation;
    }

    public WClient getClient() {
        return this.client;
    }

    @Override
    public boolean equals(final Object o) {
        if (this == o) { return true; }
        if (o == null || getClass() != o.getClass()) { return false; }

        final WResource<?> wResource = (WResource<?>) o;

        return getId() == wResource.getId() && (getClient() != null ? getClient().equals(wResource.getClient()) : wResource.getClient() == null);
    }

    @Override
    public int hashCode() {
        int result = getClient() != null ? getClient().hashCode() : 0;
        result = 31 * result + getId();
        return result;
    }

    int getId() {
        return this.id;
    }

    public int getVersion() {
        return this.version;
    }
}
