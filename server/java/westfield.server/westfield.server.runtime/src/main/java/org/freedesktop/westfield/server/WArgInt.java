package org.freedesktop.westfield.server;


import java.nio.ByteBuffer;

class WArgInt implements WArg {

    private final int arg;

    WArgInt(final int arg) {
        this.arg = arg;
    }

    @Override
    public void write(ByteBuffer byteBuffer) {
        byteBuffer.putInt(this.arg);
    }

    @Override
    public int size() {
        return Integer.BYTES;
    }
}
