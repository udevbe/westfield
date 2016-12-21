package org.freedesktop.westfield.server;


import java.nio.ByteBuffer;

public class WArgFixed implements WArg {
    private final WFixed arg;

    public WArgFixed(final WFixed arg) {
        this.arg = arg;
    }

    @Override
    public void write(final ByteBuffer byteBuffer) {
        byteBuffer.putInt(this.arg.rawValue());
    }

    @Override
    public int size() {
        return Integer.BYTES;
    }
}
