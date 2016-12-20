package org.freedesktop.westfield.server;


public abstract class WGlobal {
    private final String interfaceName;
    private final int    version;

    public WGlobal(final String interfaceName,
                   final int version) {
        this.interfaceName = interfaceName;
        this.version = version;
    }

    public abstract void bindClient(final WClient client,
                                    final int id,
                                    final int version);

    String getInterfaceName() {
        return this.interfaceName;
    }

    int getVersion() {
        return this.version;
    }
}
