package org.freedesktop.westfield.server;

import java.nio.ByteBuffer;

@FunctionalInterface
public interface Sender {
    void send(ByteBuffer message);
}
