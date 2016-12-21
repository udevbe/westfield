package org.freedesktop.westfield.server;


import java.nio.ByteBuffer;
import java.nio.ByteOrder;
import java.util.LinkedList;
import java.util.List;

public class WArgs {

    private final WResource<?> wResource;
    private final short        opcode;

    private final List<WArg> wArgs = new LinkedList<>();

    public WArgs(WResource<?> wResource,
                 int opcode) {
        this.wResource = wResource;
        this.opcode = (short) opcode;
    }

    public WArgs arg(int arg) {
        wArgs.add(new WArgInt(arg));
        return this;
    }

    public WArgs arg(String arg) {
        wArgs.add(new WArgString(arg));
        return this;
    }

    public WArgs arg(WResource<?> arg) {
        wArgs.add(new WArgObject(arg));
        return this;
    }

    public WArgs arg(ByteBuffer arg) {
        wArgs.add(new WArgArray(arg));
        return this;
    }

    public WArgs arg(WFixed arg) {
        wArgs.add(new WArgFixed(arg));
        return this;
    }

    ByteBuffer toWireMessage() {
        short size = 8;//objectid+size+opcode
        for (WArg wArg : wArgs) {
            size += wArg.size();
        }

        final ByteBuffer wireMessage = ByteBuffer.allocate(size);
        wireMessage.order(ByteOrder.LITTLE_ENDIAN);
        wireMessage.putInt(this.wResource.getId());
        wireMessage.putShort(size);
        wireMessage.putShort(this.opcode);
        wArgs.forEach(wArg -> wArg.write(wireMessage));

        return wireMessage;
    }
}
