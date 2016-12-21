package org.freedesktop.westfield.server;


import java.nio.ByteBuffer;

public class WArgInt implements WArg {

    private final int arg;

    WArgInt(final int arg) {
        this.arg = arg;
    }

    public void write(ByteBuffer byteBuffer) {
        byteBuffer.putInt(this.arg);
    }

    public int size() {
        return Integer.BYTES;
    }
}
