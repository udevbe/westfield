package org.freedesktop.westfield.server;


import java.nio.ByteBuffer;

class ArgArray implements Arg {

    private final ByteBuffer arg;

    ArgArray(final ByteBuffer arg) {
        this.arg = arg;
    }

    @Override
    public void write(final ByteBuffer byteBuffer) {
        this.arg.rewind();
        byteBuffer.putInt(this.arg.limit());
        byteBuffer.put(this.arg);
        //align to the next integer
        byteBuffer.position((byteBuffer.position() + 3) & ~3);
    }

    @Override
    public int size() {
        //returns integer aligned size
        return Integer.BYTES + ((this.arg.capacity() + 3) & ~3);
    }
}
