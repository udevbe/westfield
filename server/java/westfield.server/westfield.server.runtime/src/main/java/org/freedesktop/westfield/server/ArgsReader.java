package org.freedesktop.westfield.server;


import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.util.Map;

public class ArgsReader {
    private final ByteBuffer                byteBuffer;
    private final Map<Integer, Resource<?>> objects;

    public ArgsReader(final ByteBuffer byteBuffer,
                      final Map<Integer, Resource<?>> objects) {
        this.byteBuffer = byteBuffer;
        this.objects = objects;
    }

    public int readInt() {
        return this.byteBuffer.getInt();
    }

    public Fixed readFixed() {
        return new Fixed(readInt());
    }

    public <T extends Resource<?>> T readObject() {
        final int objectId = readInt();
        return (T) this.objects.get(objectId);
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
