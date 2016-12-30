package org.freedesktop.westfield.server;

import java.nio.ByteBuffer;
import java.util.Map;

@FunctionalInterface
public interface Request {
    void request(ByteBuffer message,
                 Map<Integer, WResource<?>> objects);
}
