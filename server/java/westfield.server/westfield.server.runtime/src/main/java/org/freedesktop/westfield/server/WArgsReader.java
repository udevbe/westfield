package org.freedesktop.westfield.server;


import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.util.Map;

public class WArgsReader {
    private final ByteBuffer              byteBuffer;
    private final Map<Integer, WResource> objects;

    public WArgsReader(final ByteBuffer byteBuffer,
                       final Map<Integer, WResource> objects) {
        this.byteBuffer = byteBuffer;
        this.objects = objects;
    }

    public int readInt() {
        return this.byteBuffer.getInt();
    }

    public WFixed readFixed() {
        return new WFixed(readInt());
    }

    public WResource<?> readObject() {
        final int objectId = readInt();
        return this.objects.get(objectId);
    }

    public int readNewObject() {
        return readInt();
    }

    public String readString() {
        final int    size        = readInt();
        final byte[] stringBytes = new byte[size];
        this.byteBuffer.get(stringBytes);
        //align to the next integer
        this.byteBuffer.position((this.byteBuffer.position() + 3) & ~3);
        return new String(stringBytes,
                          StandardCharsets.US_ASCII);
    }

    public ByteBuffer readArray() {
        final int    size  = readInt();
        final byte[] bytes = new byte[size];
        this.byteBuffer.get(bytes);
        //align to the next integer
        this.byteBuffer.position((this.byteBuffer.position() + 3) & ~3);
        return ByteBuffer.wrap(bytes);
    }
}
