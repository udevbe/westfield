package org.freedesktop.westfield.server;


import java.nio.ByteBuffer;
import java.nio.ByteOrder;
import java.util.LinkedList;
import java.util.List;

public class WArgs {

    private final WResource<?> wResource;
    private final short        opcode;

    private final List<WArg> wArgs = new LinkedList<>();

    public WArgs(final WResource<?> wResource,
                 final int opcode) {
        this.wResource = wResource;
        this.opcode = (short) opcode;
    }

    public WArgs arg(final int arg) {
        this.wArgs.add(new WArgInt(arg));
        return this;
    }

    public WArgs arg(final String arg) {
        this.wArgs.add(new WArgString(arg));
        return this;
    }

    public WArgs arg(final WResource<?> arg) {
        this.wArgs.add(new WArgObject(arg));
        return this;
    }

    public WArgs arg(final ByteBuffer arg) {
        this.wArgs.add(new WArgArray(arg));
        return this;
    }

    public WArgs arg(final WFixed arg) {
        this.wArgs.add(new WArgFixed(arg));
        return this;
    }

    ByteBuffer toWireMessage() {
        short size = 8;//objectid+size+opcode
        for (final WArg wArg : this.wArgs) {
            size += wArg.size();
        }

        final ByteBuffer wireMessage = ByteBuffer.allocate(size);
        wireMessage.order(ByteOrder.LITTLE_ENDIAN);
        wireMessage.putInt(this.wResource.getId());
        wireMessage.putShort(size);
        wireMessage.putShort(this.opcode);
        this.wArgs.forEach(wArg -> wArg.write(wireMessage));

        return wireMessage;
    }
}
