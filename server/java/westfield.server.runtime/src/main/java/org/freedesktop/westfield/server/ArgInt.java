package org.freedesktop.westfield.server;


import java.nio.ByteBuffer;

class ArgInt implements Arg {

    private final int arg;

    ArgInt(final int arg) {
        this.arg = arg;
    }

    @Override
    public void write(final ByteBuffer byteBuffer) {
        byteBuffer.putInt(this.arg);
    }

    @Override
    public int size() {
        return Integer.BYTES;
    }
}
