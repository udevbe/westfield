package org.freedesktop.westfield.server;


import java.nio.ByteBuffer;

class WArgObject implements WArg {
    private final WResource<?> wResource;

    WArgObject(final WResource<?> wResource) {
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
