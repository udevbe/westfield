package org.freedesktop.westfield.server;


public abstract class WGlobal {
    private final int    id;
    private final String interfaceName;
    private final int    version;

    public WGlobal(final WConnection connection,
                   final String interfaceName,
                   final int version) {
        this.id = connection.nextId();
        this.interfaceName = interfaceName;
        this.version = version;
    }

    public abstract void bindClient(final WClient client,
                                    final int id,
                                    final int version);

    int getId() {
        return this.id;
    }

    String getInterfaceName() {
        return this.interfaceName;
    }

    int getVersion() {
        return this.version;
    }
}
