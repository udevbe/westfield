package org.freedesktop.westfield.server;


import java.nio.ByteBuffer;

public interface Arg {
    void write(ByteBuffer byteBuffer);

    int size();
}
