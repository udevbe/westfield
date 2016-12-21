package org.freedesktop.westfield.server;


import java.nio.ByteBuffer;

public interface WArg {
    void write(ByteBuffer byteBuffer);

    int size();
}
