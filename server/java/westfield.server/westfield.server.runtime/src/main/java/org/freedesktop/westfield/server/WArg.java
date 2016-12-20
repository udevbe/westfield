package org.freedesktop.westfield.server;


import java.nio.ByteBuffer;
import java.nio.ByteOrder;
import java.nio.charset.StandardCharsets;

public class WArg {
    private ByteBuffer byteBuffer;

    public WArg(int nroArgs) {
        //memory is cheap in Java. Allocate twice the minimum to avoid reallocating memory in case of dynamic sized args.
        this(ByteBuffer.allocate(nroArgs * Integer.BYTES * 2));
    }

    private WArg(ByteBuffer byteBuffer) {
        this.byteBuffer = byteBuffer.order(ByteOrder.LITTLE_ENDIAN);
    }

    private void ensureCapacity(int needed) {
        if (this.byteBuffer.remaining() < needed) {
            ByteBuffer newByteBuffer = ByteBuffer.allocate(this.byteBuffer.capacity() * 2 + needed);
            newByteBuffer.put(this.byteBuffer);
            this.byteBuffer = newByteBuffer;
        }
    }

    WArg iu(int arg) {
        ensureCapacity(4);
        this.byteBuffer.putInt(arg);
        return this;
    }

    WArg on(WResource arg) {
        ensureCapacity(4);
        this.byteBuffer.putInt(arg.getId());
        return this;
    }

    WArg s(String arg) {
        ensureCapacity(4 + arg.length());
        this.byteBuffer.putInt(arg.length());
        this.byteBuffer.put(arg.getBytes(StandardCharsets.US_ASCII));
        return this;
    }

    WArg a(ByteBuffer arg) {
        //FIXME padding
        ensureCapacity(arg.remaining());
        byteBuffer.put(arg);
        return this;
    }

    public ByteBuffer done() {
        this.byteBuffer.limit(this.byteBuffer.position());
        this.byteBuffer.position(0);
        return byteBuffer;
    }
}
