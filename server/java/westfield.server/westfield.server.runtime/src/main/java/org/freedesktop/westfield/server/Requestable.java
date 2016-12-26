package org.freedesktop.westfield.server;

import java.nio.ByteBuffer;
import java.util.Map;

@FunctionalInterface
public interface Requestable {
    void request(ByteBuffer message,
                 Map<Integer, WResource<?>> objects);
}
