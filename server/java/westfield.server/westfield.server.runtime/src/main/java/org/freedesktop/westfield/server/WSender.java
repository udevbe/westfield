package org.freedesktop.westfield.server;

import java.nio.ByteBuffer;

@FunctionalInterface
public interface WSender {
    void send(ByteBuffer message);
}
