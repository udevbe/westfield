package org.freedesktop.westfield.server;


import java.nio.ByteBuffer;

public class WArgArray implements WArg {

    private ByteBuffer arg;

    WArgArray(final ByteBuffer arg) {
        this.arg = arg;
    }

    public void write(ByteBuffer byteBuffer) {
        this.arg.rewind();
        byteBuffer.put(this.arg);
        //align to the next integer
        byteBuffer.position((byteBuffer.position() + 3) & ~3);
    }

    public int size() {
        //returns integer aligned size
        return ((arg.capacity() + 3) & ~3);
    }
}
