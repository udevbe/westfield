package org.freedesktop.westfield.server;


import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;

class WArgString implements WArg {

    private final String arg;

    WArgString(final String arg) {
        this.arg = arg;
    }

    @Override
    public void write(final ByteBuffer byteBuffer) {
        byteBuffer.putInt(this.arg.length());
        byteBuffer.put(this.arg.getBytes(StandardCharsets.US_ASCII));
        //align to the next integer
        byteBuffer.position((byteBuffer.position() + 3) & ~3);
    }

    @Override
    public int size() {
        //returns integer aligned size
        return Integer.BYTES + ((this.arg.length() + 3) & ~3);
    }
}
