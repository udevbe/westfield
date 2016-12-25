package org.freedesktop.westfield.server;


import java.nio.ByteBuffer;

class WArgArray implements WArg {

    private final ByteBuffer arg;

    WArgArray(final ByteBuffer arg) {
        this.arg = arg;
    }

    @Override
    public void write(final ByteBuffer byteBuffer) {
        this.arg.rewind();
        byteBuffer.put(this.arg);
        //align to the next integer
        byteBuffer.position((byteBuffer.position() + 3) & ~3);
    }

    @Override
    public int size() {
        //returns integer aligned size
        return ((arg.capacity() + 3) & ~3);
    }
}
