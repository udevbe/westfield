package org.freedesktop.westfield.server;


import java.nio.ByteBuffer;
import java.nio.ByteOrder;
import java.util.LinkedList;
import java.util.List;

public class Args {

    private final Resource<?> wResource;
    private final short       opcode;

    private final List<Arg> wArgs = new LinkedList<>();

    public Args(final Resource<?> wResource,
                final int opcode) {
        this.wResource = wResource;
        this.opcode = (short) opcode;
    }

    public Args arg(final int arg) {
        this.wArgs.add(new ArgInt(arg));
        return this;
    }

    public Args arg(final String arg) {
        this.wArgs.add(new ArgString(arg));
        return this;
    }

    public Args arg(final Resource<?> arg) {
        this.wArgs.add(new ArgObject(arg));
        return this;
    }

    public Args arg(final ByteBuffer arg) {
        this.wArgs.add(new ArgArray(arg));
        return this;
    }

    public Args arg(final Fixed arg) {
        this.wArgs.add(new ArgFixed(arg));
        return this;
    }

    private ByteBuffer wireMessage() {
        short size = 8;//objectid+size+opcode
        for (final Arg wArg : this.wArgs) {
            size += wArg.size();
        }

        final ByteBuffer wireMessage = ByteBuffer.allocateDirect(size);
        wireMessage.order(ByteOrder.nativeOrder());
        wireMessage.putInt(this.wResource.getId());
        wireMessage.putShort(size);
        wireMessage.putShort(this.opcode);
        this.wArgs.forEach(wArg -> wArg.write(wireMessage));
        wireMessage.rewind();
        return wireMessage;
    }

    public void send() {
        this.wResource.getClient()
                      .marshall(wireMessage());
    }
}
