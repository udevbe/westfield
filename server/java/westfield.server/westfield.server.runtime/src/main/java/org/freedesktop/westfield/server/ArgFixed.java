package org.freedesktop.westfield.server;


import java.nio.ByteBuffer;

class ArgFixed implements Arg {
    private final Fixed arg;

    ArgFixed(final Fixed arg) {
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
