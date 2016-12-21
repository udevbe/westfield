package org.freedesktop.westfield.server;


import java.nio.ByteBuffer;

class WArgObject implements WArg {
    private final WResource<?> wResource;

    WArgObject(final WResource<?> wResource) {
        this.wResource = wResource;
    }

    @Override
    public void write(ByteBuffer byteBuffer) {
        byteBuffer.putInt(wResource.getId());
    }

    @Override
    public int size() {
        return Integer.BYTES;
    }
}
