package org.freedesktop.westfield.server;


import java.nio.ByteBuffer;

class WArgObject implements WArg{
    private final WResource<?> wResource;

    WArgObject(final WResource<?> wResource) {
        this.wResource = wResource;
    }

    public void write(ByteBuffer byteBuffer) {
        byteBuffer.putInt(wResource.getId());
    }

    public int size() {
        return Integer.BYTES;
    }
}
