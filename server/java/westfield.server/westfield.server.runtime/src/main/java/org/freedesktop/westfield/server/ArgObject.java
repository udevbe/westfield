package org.freedesktop.westfield.server;


import java.nio.ByteBuffer;

class ArgObject implements Arg {
    private final Resource<?> wResource;

    ArgObject(final Resource<?> wResource) {
        this.wResource = wResource;
    }

    @Override
    public void write(final ByteBuffer byteBuffer) {
        byteBuffer.putInt(this.wResource.getId());
    }

    @Override
    public int size() {
        return Integer.BYTES;
    }
}
