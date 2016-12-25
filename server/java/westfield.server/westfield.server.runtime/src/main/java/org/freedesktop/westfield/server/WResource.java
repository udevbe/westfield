package org.freedesktop.westfield.server;


import java.lang.reflect.InvocationTargetException;
import java.lang.reflect.Method;
import java.nio.ByteBuffer;
import java.util.HashMap;
import java.util.Map;

public abstract class WResource<T> {
    private final WClient client;
    private final int     id;
    private final T       implementation;

    private final Map<Integer, Method> requests = new HashMap<>();

    public WResource(final WClient client,
                     final int id,
                     final T implementation) {
        this.client = client;
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

        if (getId() != wResource.getId()) { return false; }
        return getClient() != null ? getClient().equals(wResource.getClient()) : wResource.getClient() == null;
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

    void dispatch(final int opcode,
                  final ByteBuffer message,
                  final Map<Integer, WResource<?>> objects) throws NoSuchMethodException,
                                                                   InvocationTargetException,
                                                                   IllegalAccessException {
        Method method = this.requests.get(opcode);
        if (method == null) {
            method = getClass().getDeclaredMethod("$" + opcode,
                                                  ByteBuffer.class,
                                                  Map.class);
            method.setAccessible(true);
            this.requests.put(opcode,
                              method);
        }
        method.invoke(this,
                      message,
                      objects);
    }
}
